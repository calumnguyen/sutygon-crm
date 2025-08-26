import { useState, useEffect, useRef, useMemo } from 'react';
import { pusherClient } from '@/lib/pusher';

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  deviceType: string;
  location: string;
  browser: string;
}

export const useOnlineUsers = (currentUser: OnlineUser | null) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const setupComplete = useRef(false);
  const channelRef = useRef<ReturnType<typeof pusherClient.subscribe> | null>(null);

  useEffect(() => {
    if (!currentUser) {
      console.log('useOnlineUsers: No current user, clearing state');
      setOnlineUsers([]);
      setIsConnected(false);
      setupComplete.current = false;
      return;
    }

    console.log('useOnlineUsers: Setting up for user:', currentUser.name);

    // Check if already connected
    const checkConnection = () => {
      const connected = pusherClient.connection.state === 'connected';
      setIsConnected(connected);
      console.log('useOnlineUsers: Connection state:', pusherClient.connection.state);

      if (connected) {
        // If already connected, fetch users immediately
        fetch('/api/pusher/user-presence')
          .then((res) => res.json())
          .then((users) => {
            console.log('useOnlineUsers: Fetched online users:', users.length, 'users');
            setOnlineUsers(users);
          })
          .catch((error) => {
            console.error('useOnlineUsers: Failed to fetch online users:', error);
          });
      }
    };

    checkConnection();

    // Subscribe to the channel
    const channel = pusherClient.subscribe('online-users');
    channelRef.current = channel;

    console.log('useOnlineUsers: Subscribing to online-users channel');

    // Handle user joining
    const handleUserJoined = (data: OnlineUser) => {
      console.log('useOnlineUsers: User joined:', data.name, 'ID:', data.id);
      setOnlineUsers((prev) => {
        const exists = prev.find((user) => user.id === data.id);
        if (exists) {
          console.log('useOnlineUsers: User already exists, updating:', data.name);
          return prev.map((user) => (user.id === data.id ? data : user));
        }
        console.log('useOnlineUsers: Adding new user:', data.name);
        return [...prev, data];
      });
    };

    // Handle user leaving
    const handleUserLeft = (data: { id: string }) => {
      console.log('useOnlineUsers: User left event received:', data.id);
      setOnlineUsers((prev) => {
        const user = prev.find((u) => u.id === data.id);
        if (user) {
          console.log('useOnlineUsers: Removing user from list:', user.name, 'ID:', user.id);
          const newList = prev.filter((user) => user.id !== data.id);
          console.log('useOnlineUsers: Updated list has', newList.length, 'users');
          return newList;
        } else {
          console.log('useOnlineUsers: User not found in list for removal:', data.id);
          return prev;
        }
      });
    };

    // Handle initial users list
    const handleUsersList = (users: OnlineUser[]) => {
      console.log('useOnlineUsers: Received users list:', users.length, 'users');
      setOnlineUsers(users);
    };

    // Bind events
    channel.bind('user-joined', handleUserJoined);
    channel.bind('user-left', handleUserLeft);
    channel.bind('users-list', handleUsersList);

    // Test event to verify Pusher is working
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('useOnlineUsers: Successfully subscribed to online-users channel');
    });

    // Listen for connection events
    const handleConnected = () => {
      setIsConnected(true);
      console.log('useOnlineUsers: Connected to Pusher');

      // Fetch initial list of online users
      fetch('/api/pusher/user-presence')
        .then((res) => res.json())
        .then((users) => {
          console.log('useOnlineUsers: Fetched online users:', users.length, 'users');
          setOnlineUsers(users);
        })
        .catch((error) => {
          console.error('useOnlineUsers: Failed to fetch online users:', error);
        });
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      console.log('useOnlineUsers: Disconnected from Pusher');
    };

    // Also listen for subscription succeeded to ensure we're properly connected
    const handleSubscriptionSucceeded = () => {
      console.log('useOnlineUsers: Successfully subscribed to online-users channel');
      // Only fetch users list once when subscription succeeds, not on every connection
      if (!setupComplete.current) {
        fetch('/api/pusher/user-presence')
          .then((res) => res.json())
          .then((users) => {
            console.log(
              'useOnlineUsers: Fetched online users after subscription:',
              users.length,
              'users'
            );
            setOnlineUsers(users);
            setupComplete.current = true;
          })
          .catch((error) => {
            console.error(
              'useOnlineUsers: Failed to fetch online users after subscription:',
              error
            );
          });
      }
    };

    pusherClient.connection.bind('connected', handleConnected);
    pusherClient.connection.bind('disconnected', handleDisconnected);
    channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);

    // Cleanup function
    return () => {
      console.log('useOnlineUsers: Cleaning up for user:', currentUser.name);

      if (channelRef.current) {
        channelRef.current.unbind('user-joined', handleUserJoined);
        channelRef.current.unbind('user-left', handleUserLeft);
        channelRef.current.unbind('users-list', handleUsersList);
        channelRef.current.unbind('pusher:subscription_succeeded');
        pusherClient.unsubscribe('online-users');
        channelRef.current = null;
      }

      pusherClient.connection.unbind('connected', handleConnected);
      pusherClient.connection.unbind('disconnected', handleDisconnected);
      channel.unbind('pusher:subscription_succeeded', handleSubscriptionSucceeded);

      setupComplete.current = false;
    };
  }, [currentUser?.id]); // Only depend on ID, not name to prevent unnecessary re-runs

  // Memoize the return values to prevent unnecessary re-renders
  const memoizedResult = useMemo(
    () => ({
      onlineUsers,
      isConnected,
    }),
    [onlineUsers, isConnected]
  );

  return memoizedResult;
};
