import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!currentUser || setupComplete.current) return;

    console.log('useOnlineUsers: Setting up for user:', currentUser.name);
    setupComplete.current = true;

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

    // Get the existing channel subscription
    const channel = pusherClient.channel('online-users');

    if (channel) {
      console.log('useOnlineUsers: Found existing channel, binding events');

      // Handle user joining
      channel.bind('user-joined', (data: OnlineUser) => {
        console.log('useOnlineUsers: User joined:', data.name);
        setOnlineUsers((prev) => {
          const exists = prev.find((user) => user.id === data.id);
          if (exists) return prev;
          return [...prev, data];
        });
      });

      // Handle user leaving
      channel.bind('user-left', (data: { id: string }) => {
        console.log('useOnlineUsers: User left:', data.id);
        setOnlineUsers((prev) => prev.filter((user) => user.id !== data.id));
      });

      // Handle initial users list
      channel.bind('users-list', (users: OnlineUser[]) => {
        console.log('useOnlineUsers: Received users list:', users.length, 'users');
        setOnlineUsers(users);
      });
    } else {
      console.log('useOnlineUsers: No existing channel found');
    }

    // Listen for connection events
    pusherClient.connection.bind('connected', () => {
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
    });

    pusherClient.connection.bind('disconnected', () => {
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      setupComplete.current = false;
      if (channel) {
        channel.unbind('user-joined');
        channel.unbind('user-left');
        channel.unbind('users-list');
      }
    };
  }, [currentUser?.id]); // Only depend on user ID, not the entire user object

  return { onlineUsers, isConnected };
};
