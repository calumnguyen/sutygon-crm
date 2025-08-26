'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Users,
  Wifi,
  WifiOff,
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  Activity,
  MapPin,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  Sun,
  Moon,
  Tablet,
  Laptop,
  Shield,
} from 'lucide-react';
import { useOnlineUsers, OnlineUser } from '@/hooks/useOnlineUsers';
import latencyTracker from '@/lib/utils/latencyTracker';
import webrtcNetworkDetector, { NetworkInfo } from '@/lib/utils/webrtcNetworkDetection';
import weatherService, { WeatherData } from '@/lib/utils/weatherService';

interface OnlineUsersSectionProps {
  currentUser: OnlineUser | null;
}

interface UserWeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
}

interface UserLatencyData {
  ping: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdated: string;
}

const OnlineUsersSection: React.FC<OnlineUsersSectionProps> = React.memo(({ currentUser }) => {
  const { onlineUsers, isConnected } = useOnlineUsers(currentUser);
  const [latencyData, setLatencyData] = useState<Map<string, UserLatencyData>>(new Map());
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Memoize onlineUsers to prevent unnecessary re-renders
  const stableOnlineUsers = useMemo(() => onlineUsers, [onlineUsers.map((u) => u.id).join(',')]);
  const stableIsConnected = useMemo(() => isConnected, [isConnected]);

  // Get network information
  useEffect(() => {
    let isMounted = true;
    let detectionInProgress = false;
    let retryCount = 0;
    const maxRetries = 1; // Reduced retries to prevent conflicts

    const getNetworkInfo = async () => {
      // Prevent multiple simultaneous detections
      if (detectionInProgress) {
        console.log('🔄 Network detection already in progress, skipping...');
        return;
      }

      detectionInProgress = true;

      try {
        console.log(
          `🔍 Starting network detection (attempt ${retryCount + 1}/${maxRetries + 1})...`
        );

        // Use WebRTC network detection with timeout
        const networkInfo = await Promise.race([
          webrtcNetworkDetector.detectNetwork(),
          new Promise<NetworkInfo>((_, reject) =>
            setTimeout(() => reject(new Error('Network detection timeout')), 15000)
          ),
        ]);

        if (isMounted) {
          console.log('📊 Network detection result:', networkInfo);
          setNetworkInfo(networkInfo);
        }
      } catch (error) {
        console.error(`❌ Network detection failed (attempt ${retryCount + 1}):`, error);

        // Retry logic
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying network detection (${retryCount}/${maxRetries})...`);

          // Wait a bit before retrying
          setTimeout(() => {
            if (isMounted) {
              detectionInProgress = false;
              getNetworkInfo();
            }
          }, 3000); // 3 second delay

          return;
        }

        if (isMounted) {
          // Final fallback to basic network info
          console.log('🔄 Using fallback network detection');
          setNetworkInfo({
            type: 'Unknown',
            latency: 0,
            bandwidth: 0,
            localIPs: [],
            publicIPs: [],
            connectionQuality: 'fair',
            method: 'fallback',
          });
        }
      } finally {
        if (retryCount >= maxRetries) {
          detectionInProgress = false;
        }
      }
    };

    // Add a small delay before starting detection to prevent immediate conflicts
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        getNetworkInfo();
      }
    }, 1000);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array to run only once

  // Initialize latency tracking - only run once
  useEffect(() => {
    // Set current user for latency tracking
    if (currentUser) {
      latencyTracker.setCurrentUser(currentUser.id);
    }

    // Set up latency update callback
    latencyTracker.onUpdate((userId, data) => {
      setLatencyData((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, {
          ping: data.ping,
          connectionQuality: data.connectionQuality,
          lastUpdated: data.lastUpdated,
        });
        return newMap;
      });
    });

    // Cleanup on unmount
    return () => {
      // Cleanup will be handled by the tracker itself
    };
  }, [currentUser]); // Only depend on currentUser, not onlineUsers

  // Update tracking when users change - separate effect for user management
  useEffect(() => {
    const currentUserIds = new Set(stableOnlineUsers.map((u) => u.id));
    const trackedUserIds = new Set(Array.from(latencyData.keys()));

    // Stop tracking users who are no longer online
    trackedUserIds.forEach((userId) => {
      if (!currentUserIds.has(userId)) {
        latencyTracker.stopTrackingUser(userId);
        setLatencyData((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    });

    // Start tracking new users
    currentUserIds.forEach((userId) => {
      if (!trackedUserIds.has(userId)) {
        latencyTracker.startTrackingUser(userId);
      }
    });
  }, [stableOnlineUsers]); // Only depend on stableOnlineUsers, not latencyData

  // Separate admins and regular users
  const admins = stableOnlineUsers.filter((user) => user.role === 'admin');
  const regularUsers = stableOnlineUsers.filter((user) => user.role === 'user');

  // Memoize user objects to prevent unnecessary re-renders
  const memoizedAdmins = useMemo(() => admins, [admins.map((u) => u.id).join(',')]);
  const memoizedRegularUsers = useMemo(
    () => regularUsers,
    [regularUsers.map((u) => u.id).join(',')]
  );

  // Helper functions
  const getNetworkIcon = (networkInfo: NetworkInfo | null) => {
    if (!networkInfo) return <Wifi className="w-4 h-4 text-gray-400" />;

    switch (networkInfo.type) {
      case 'WiFi':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'Ethernet':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'Cellular':
        return <Smartphone className="w-4 h-4 text-yellow-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNetworkTypeWithDetails = (networkInfo: NetworkInfo | null) => {
    if (!networkInfo) return 'Unknown';
    return webrtcNetworkDetector.getNetworkTypeString(networkInfo);
  };

  const getNetworkDetails = (networkInfo: NetworkInfo | null) => {
    if (!networkInfo) return 'No data';

    const details = [];
    if (networkInfo.latency > 0) {
      details.push(`${networkInfo.latency}ms`);
    }
    if (networkInfo.bandwidth > 0) {
      details.push(`${Math.round(networkInfo.bandwidth / 1000)}Mbps`);
    }

    return details.length > 0 ? details.join(' • ') : 'No data';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'laptop':
        return <Laptop className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getLocalTime = (timezone: string) => {
    try {
      return new Date().toLocaleTimeString('vi-VN', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date().toLocaleTimeString('vi-VN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Weather cache and constants
  const weatherCache = useRef<
    Map<
      string,
      { data: WeatherData | null; timestamp: number; failed?: boolean; attempts?: number }
    >
  >(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const MAX_RETRY_ATTEMPTS = 3;

  // UserCard component with weather integration
  const UserCard: React.FC<{ user: OnlineUser }> = React.memo(({ user }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const weatherInitialized = useRef(false);

    // Get weather data - using the same stable pattern as WebRTC
    useEffect(() => {
      let isMounted = true;
      let fetchInProgress = false;

      const fetchWeather = async () => {
        if (!user.location || user.location === 'Unknown') {
          return;
        }

        // Prevent multiple simultaneous fetches
        if (fetchInProgress) {
          console.log('🔄 Weather fetch already in progress, skipping...');
          return;
        }

        fetchInProgress = true;

        try {
          // Check cache first
          const cached = weatherCache.current.get(user.location);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            if (isMounted) {
              setWeatherData(cached.data);
              weatherInitialized.current = true;
            }
            return;
          }

          // If we've failed max retries, show cached data or nothing
          if (cached && cached.failed && cached.attempts && cached.attempts >= MAX_RETRY_ATTEMPTS) {
            if (isMounted) {
              setWeatherData(cached.data);
              weatherInitialized.current = true;
            }
            return;
          }

          // Only show loading if we haven't initialized yet
          if (isMounted && !weatherInitialized.current) {
            setIsLoading(true);
          }

          const weather = await weatherService.getWeatherByCity(user.location);

          if (isMounted) {
            setWeatherData(weather);
            setIsLoading(false);
            weatherInitialized.current = true;

            // Cache the successful result
            weatherCache.current.set(user.location, {
              data: weather,
              timestamp: Date.now(),
              failed: false,
              attempts: 0,
            });
            console.log('✅ Weather data cached successfully for:', user.location);
          }
        } catch (error) {
          console.error('❌ Error fetching weather:', error);

          // Update cache with failure
          const cached = weatherCache.current.get(user.location);
          const attempts = (cached?.attempts || 0) + 1;
          weatherCache.current.set(user.location, {
            data: cached?.data || null,
            timestamp: Date.now(),
            failed: true,
            attempts,
          });

          if (isMounted) {
            setIsLoading(false);
            weatherInitialized.current = true;
          }
        } finally {
          fetchInProgress = false;
        }
      };

      // Add a small delay before starting fetch to prevent immediate conflicts
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          fetchWeather();
        }
      }, 500);

      // Cleanup function
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }, []); // Empty dependency array to run only once

    const getWeatherIcon = (condition: string) => {
      const conditionLower = condition.toLowerCase();
      if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
        return <CloudRain className="w-4 h-4" />;
      } else if (conditionLower.includes('cloud')) {
        return <Cloud className="w-4 h-4" />;
      } else if (conditionLower.includes('clear')) {
        return <Sun className="w-4 h-4" />;
      } else {
        return <Cloud className="w-4 h-4" />;
      }
    };

    const getWeatherColor = (condition: string) => {
      const conditionLower = condition.toLowerCase();
      if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
        return 'text-blue-400';
      } else if (conditionLower.includes('cloud')) {
        return 'text-gray-400';
      } else if (conditionLower.includes('clear')) {
        return 'text-yellow-400';
      } else {
        return 'text-gray-400';
      }
    };

    return (
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getDeviceIcon(user.deviceType)}
            <div>
              <h4 className="text-white font-medium text-sm">{user.name}</h4>
              <p className="text-gray-400 text-xs">
                {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-300 text-xs">
              {latencyData.get(user.id)?.ping ? `${latencyData.get(user.id)?.ping}ms` : 'N/A'}
            </div>
            <div className="text-gray-400 text-xs">
              {latencyData.get(user.id)?.connectionQuality || 'Unknown'}
            </div>
          </div>
        </div>

        {/* Weather Section */}
        {user.location && user.location !== 'Unknown' && (
          <div className="mb-3 p-2 bg-gray-600 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                ) : weatherData ? (
                  getWeatherIcon(weatherData.condition || 'Unknown')
                ) : (
                  <Cloud className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-white text-sm">
                  {isLoading
                    ? 'Đang tải thời tiết...'
                    : weatherData
                      ? `${weatherData.temperature}°C`
                      : 'Không có dữ liệu'}
                </span>
              </div>
              {weatherData && (
                <div className={`text-xs ${getWeatherColor(weatherData.condition || 'Unknown')}`}>
                  {weatherData.description || 'Unknown'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Information */}
        {networkInfo && (
          <div className="mb-3">
            <div className="flex items-center justify-between p-2 bg-gray-600 rounded mt-2">
              <div className="flex items-center gap-2">
                {getNetworkIcon(networkInfo)}
                <span className="text-white text-sm">{getNetworkTypeWithDetails(networkInfo)}</span>
              </div>
              <div className="text-right">
                <div className="text-gray-300 text-xs">{getNetworkDetails(networkInfo)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{user.location}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Globe className="w-3 h-3" />
            <span className="truncate">{user.browser}</span>
          </div>
        </div>
      </div>
    );
  });

  UserCard.displayName = 'UserCard';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Người dùng đang online</h3>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${stableIsConnected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-sm text-gray-400">
            {stableIsConnected ? 'Đã kết nối' : 'Đang kết nối...'}
          </span>
        </div>
      </div>

      {stableOnlineUsers.length === 0 ? (
        <div className="text-center py-12">
          <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Không có người dùng nào đang online</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admins Section */}
          {memoizedAdmins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-yellow-400" />
                <h4 className="text-white font-medium text-sm">
                  Quản trị viên ({memoizedAdmins.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memoizedAdmins.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Users Section */}
          {memoizedRegularUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <h4 className="text-white font-medium text-sm">
                  Người dùng ({memoizedRegularUsers.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memoizedRegularUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Tổng số người online:</span>
          <span className="text-white font-medium">{stableOnlineUsers.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-400">Quản trị viên:</span>
          <span className="text-yellow-400 font-medium">{admins.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-400">Người dùng:</span>
          <span className="text-blue-400 font-medium">{regularUsers.length}</span>
        </div>
      </div>
    </div>
  );
});

OnlineUsersSection.displayName = 'OnlineUsersSection';

export default OnlineUsersSection;
