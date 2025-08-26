'use client';
import React, { useEffect, useState, useRef } from 'react';
import { pusherClient } from '@/lib/pusher';
import { useUser } from '@/context/UserContext';
import { detectDeviceType, getLocationFromIP, getBrowserInfo } from '@/lib/utils/deviceDetection';

interface PusherProviderProps {
  children: React.ReactNode;
}

const PusherProvider: React.FC<PusherProviderProps> = ({ children }) => {
  const { currentUser } = useUser();
  const [deviceInfo, setDeviceInfo] = useState({
    deviceType: 'Desktop',
    location: 'Loading...',
    browser: 'Unknown',
  });
  const [deviceInfoReady, setDeviceInfoReady] = useState(false);
  const hasAnnouncedJoin = useRef(false);
  const channelRef = useRef<ReturnType<typeof pusherClient.subscribe> | null>(null);
  const wasHidden = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get real device type and browser immediately
      const realDeviceType = detectDeviceType();
      const realBrowser = getBrowserInfo();

      setDeviceInfo((prev) => ({
        ...prev,
        deviceType: realDeviceType,
        browser: realBrowser,
      }));

      // Get real location
      getLocationFromIP()
        .then((location) => {
          setDeviceInfo((prev) => ({
            ...prev,
            location,
          }));
          setDeviceInfoReady(true);
        })
        .catch(() => {
          setDeviceInfoReady(true);
        });
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !deviceInfoReady) {
      console.log('Waiting for user or device info...', {
        currentUser: !!currentUser,
        deviceInfoReady,
      });
      return;
    }

    console.log('Setting up Pusher for user:', currentUser.name);
    console.log('Device info ready:', deviceInfo);

    // Set up Pusher authentication
    pusherClient.connection.bind('connected', () => {
      console.log('Connected to Pusher');
    });

    pusherClient.connection.bind('error', (err: Error) => {
      console.error('Pusher connection error:', err);
    });

    // Subscribe to regular channel (no authentication required)
    const channel = pusherClient.subscribe('online-users');
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', async () => {
      console.log('Successfully subscribed to online-users channel');

      // Announce that this user has joined (only once, unless rejoining)
      if (!hasAnnouncedJoin.current || wasHidden.current) {
        try {
          console.log('Announcing user join:', currentUser.name);
          console.log('Making API call to /api/pusher/user-presence...');

          const response = await fetch('/api/pusher/user-presence', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'join',
              user: {
                id: currentUser.id.toString(),
                name: currentUser.name,
                email: '', // Empty email
                role: currentUser.role,
                deviceType: deviceInfo.deviceType,
                location: deviceInfo.location,
                browser: deviceInfo.browser,
              },
            }),
          });

          console.log('API response status:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('API response:', result);
            console.log('Successfully announced user presence');
            hasAnnouncedJoin.current = true;
            wasHidden.current = false;
          } else {
            const errorText = await response.text();
            console.error('Failed to announce user presence:', response.status, errorText);
          }
        } catch (error) {
          console.error('Failed to announce user presence:', error);
        }
      }
    });

    channel.bind('pusher:subscription_error', (status: number) => {
      console.error('Pusher subscription error:', status);
    });

    // Cleanup function
    return () => {
      console.log('PusherProvider cleanup for user:', currentUser.name);

      // Announce that this user is leaving
      if (currentUser && hasAnnouncedJoin.current) {
        console.log('Announcing user leave:', currentUser.name);
        fetch('/api/pusher/user-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'leave',
            user: {
              id: currentUser.id.toString(),
            },
          }),
        })
          .then(() => {
            console.log('Successfully announced user leave');
          })
          .catch((error) => {
            console.error('Failed to announce user leave:', error);
          });
      }

      // Unsubscribe from channel
      if (channelRef.current) {
        pusherClient.unsubscribe('online-users');
        channelRef.current = null;
      }

      hasAnnouncedJoin.current = false;
    };
  }, [currentUser?.id, currentUser?.name, deviceInfoReady, deviceInfo]);

  // Handle page unload/visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser && hasAnnouncedJoin.current) {
        console.log('Page unloading, announcing user leave:', currentUser.name);
        // Use sendBeacon for more reliable delivery during page unload
        if (navigator.sendBeacon) {
          const data = JSON.stringify({
            action: 'leave',
            user: {
              id: currentUser.id.toString(),
            },
          });
          navigator.sendBeacon('/api/pusher/user-presence', data);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && currentUser && hasAnnouncedJoin.current) {
        console.log('Page hidden, announcing user leave:', currentUser.name, 'ID:', currentUser.id);
        wasHidden.current = true;
        fetch('/api/pusher/user-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'leave',
            user: {
              id: currentUser.id.toString(),
            },
          }),
        })
          .then((response) => {
            if (response.ok) {
              console.log('Successfully sent leave announcement for:', currentUser.name);
            } else {
              console.error('Failed to send leave announcement:', response.status);
            }
          })
          .catch((error) => {
            console.error('Error sending leave announcement:', error);
          });
      } else if (document.visibilityState === 'visible' && currentUser && wasHidden.current) {
        console.log('Page visible again, rejoining user:', currentUser.name);

        // Force a rejoin by sending the join request directly
        fetch('/api/pusher/user-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'join',
            user: {
              id: currentUser.id.toString(),
              name: currentUser.name,
              email: '',
              role: currentUser.role,
              deviceType: deviceInfo?.deviceType || 'Unknown',
              location: deviceInfo?.location || 'Unknown',
              browser: deviceInfo?.browser || 'Unknown',
            },
          }),
        })
          .then((response) => {
            if (response.ok) {
              console.log('Successfully rejoined user presence');
              wasHidden.current = false;
              hasAnnouncedJoin.current = true;
            } else {
              console.error('Failed to rejoin user presence:', response.status);
              // Try to get more details about the error
              return response.text().then((text) => {
                console.error('Error details:', text);
              });
            }
          })
          .catch((error) => {
            console.error('Failed to rejoin user presence:', error);
          });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id, currentUser?.name, deviceInfo]);

  return <>{children}</>;
};

export default PusherProvider;
