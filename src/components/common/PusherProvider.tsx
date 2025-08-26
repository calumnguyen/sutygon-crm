'use client';
import React, { useEffect, useState } from 'react';
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

    console.log('Setting up Pusher for user:', currentUser);
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

    channel.bind('pusher:subscription_succeeded', async () => {
      console.log('Successfully subscribed to online-users channel');

      // Announce that this user has joined
      try {
        console.log('Announcing user join:', currentUser);
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
        } else {
          const errorText = await response.text();
          console.error('Failed to announce user presence:', response.status, errorText);
        }
      } catch (error) {
        console.error('Failed to announce user presence:', error);
      }
    });

    channel.bind('pusher:subscription_error', (status: number) => {
      console.error('Pusher subscription error:', status);
    });

    return () => {
      // Announce that this user is leaving
      if (currentUser) {
        console.log('Announcing user leave:', currentUser);
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
        }).catch(console.error);
      }

      pusherClient.unsubscribe('online-users');
    };
  }, [currentUser, deviceInfoReady, deviceInfo]);

  return <>{children}</>;
};

export default PusherProvider;
