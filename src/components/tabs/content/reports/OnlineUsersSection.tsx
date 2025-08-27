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
import UserDensityMap from './UserDensityMap';

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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

  const getDeviceIcon = (deviceType: string) => {
    const deviceLower = deviceType.toLowerCase();

    // Mobile devices
    if (
      deviceLower.includes('iphone') ||
      deviceLower.includes('android') ||
      deviceLower.includes('mobile')
    ) {
      return <Smartphone className="w-4 h-4" />;
    }

    // Tablet devices
    if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) {
      return <Tablet className="w-4 h-4" />;
    }

    // Laptop devices
    if (
      deviceLower.includes('macbook') ||
      deviceLower.includes('laptop') ||
      deviceLower.includes('surface')
    ) {
      return <Laptop className="w-4 h-4" />;
    }

    // Desktop devices
    if (
      deviceLower.includes('mac') ||
      deviceLower.includes('pc') ||
      deviceLower.includes('desktop')
    ) {
      return <Monitor className="w-4 h-4" />;
    }

    // Default fallback
    return <Monitor className="w-4 h-4" />;
  };

  const getDayNightIcon = () => {
    // Simulate different time zones based on location
    // In a real app, you'd get the actual timezone for each user's location
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    return isDay ? (
      <Sun className="w-3 h-3 text-yellow-400" />
    ) : (
      <Moon className="w-3 h-3 text-blue-400" />
    );
  };

  const getLocalTime = (location: string): string => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    let timezoneOffset = 0;

    // Enhanced timezone detection for more locations
    if (
      location.includes('Vietnam') ||
      location.includes('Ho Chi Minh') ||
      location.includes('Hanoi') ||
      location.includes('Da Nang')
    ) {
      timezoneOffset = 7;
    } else if (location.includes('Japan') || location.includes('Tokyo')) {
      timezoneOffset = 9;
    } else if (location.includes('Singapore') || location.includes('Malaysia')) {
      timezoneOffset = 8;
    } else if (location.includes('Thailand') || location.includes('Bangkok')) {
      timezoneOffset = 7;
    } else if (
      location.includes('Los Angeles') ||
      location.includes('California') ||
      location.includes('Huntington Beach') ||
      location.includes('Orange County')
    ) {
      timezoneOffset = -7; // UTC-7 (PDT) - Pacific Daylight Time
    } else if (location.includes('New York') || location.includes('USA')) {
      timezoneOffset = -5;
    } else if (location.includes('UK') || location.includes('London')) {
      timezoneOffset = 0;
    } else if (location.includes('Australia') || location.includes('Sydney')) {
      timezoneOffset = 10;
    } else {
      timezoneOffset = 7; // Default to Vietnam timezone
    }

    const userTime = new Date(utcTime + timezoneOffset * 60 * 60 * 1000);
    return userTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Weather cache to prevent excessive API calls
  const weatherCache = useRef<
    Map<string, { data: WeatherData | null; timestamp: number; attempts: number; failed: boolean }>
  >(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
  const lastFetchTime = useRef<Map<string, number>>(new Map());
  const MIN_FETCH_INTERVAL = process.env.NODE_ENV === 'development' ? 30000 : 5000; // 30 seconds in dev, 5 seconds in prod
  const MAX_RETRY_ATTEMPTS = 3;
  const CACHE_KEY = 'weather_cache_v1';

  // Initialize cache from localStorage on component mount
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(CACHE_KEY);
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        const map = new Map();

        // Convert back to Map and filter out expired entries
        Object.entries(parsedCache).forEach(([location, cacheData]: [string, unknown]) => {
          const typedCacheData = cacheData as { timestamp: number };
          if (Date.now() - typedCacheData.timestamp < CACHE_DURATION) {
            map.set(location, cacheData);
          }
        });

        weatherCache.current = map;
        console.log('🌤️ Loaded weather cache from localStorage:', map.size, 'entries');
      }
    } catch (error) {
      console.error('❌ Error loading weather cache from localStorage:', error);
    }
  }, []);

  // Save cache to localStorage whenever it changes
  const saveCacheToStorage = useCallback(() => {
    try {
      const cacheObject = Object.fromEntries(weatherCache.current);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('❌ Error saving weather cache to localStorage:', error);
    }
  }, []);

  const getWeatherData = async (location: string): Promise<WeatherData | null> => {
    try {
      // Check cache first
      const cached = weatherCache.current.get(location);

      // If we have cached data and it's not expired, use it
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !cached.failed) {
        console.log('🌤️ Using cached weather data for:', location);
        return cached.data;
      }

      // If we've already failed MAX_RETRY_ATTEMPTS times, don't try again
      if (cached && cached.failed && cached.attempts >= MAX_RETRY_ATTEMPTS) {
        console.log('🌤️ Skipping weather fetch for:', location, '- max retries reached');
        return cached.data;
      }

      // Rate limiting - prevent too frequent requests for same location
      const lastFetch = lastFetchTime.current.get(location) || 0;
      if (Date.now() - lastFetch < MIN_FETCH_INTERVAL) {
        console.log('🌤️ Rate limiting: skipping fetch for:', location);
        return cached?.data || null;
      }

      // Update last fetch time
      lastFetchTime.current.set(location, Date.now());

      // Update attempt count
      const currentAttempts = cached ? cached.attempts + 1 : 1;
      console.log(
        `🌤️ Fetching weather for city: ${location} (attempt ${currentAttempts}/${MAX_RETRY_ATTEMPTS})`
      );

      // Check for coordinates in location string (e.g., "Los Angeles, CA (34.0522, -118.2437)")
      const coordMatch = location.match(/\(([-\d.]+),\s*([-\d.]+)\)/);

      let weather: WeatherData | null = null;

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);

        console.log('🌤️ Fetching weather for coordinates:', { lat, lon });
        weather = await weatherService.getWeatherData(lat, lon);
      } else {
        // Try to get weather by city name
        console.log('🌤️ Fetching weather for city:', location);
        weather = await weatherService.getWeatherByCity(location);
      }

      // Cache the result with attempt count and failure status
      const success = weather !== null;
      weatherCache.current.set(location, {
        data: weather,
        timestamp: Date.now(),
        attempts: currentAttempts,
        failed: !success,
      });

      // Save to localStorage
      saveCacheToStorage();

      if (success) {
        console.log('✅ Weather data cached successfully for:', location);
      } else {
        console.log(
          `❌ Weather fetch failed for: ${location} (attempt ${currentAttempts}/${MAX_RETRY_ATTEMPTS})`
        );
      }

      return weather;
    } catch (error) {
      console.error('❌ Error fetching weather data:', error);

      // Cache the failure
      const cached = weatherCache.current.get(location);
      const currentAttempts = cached ? cached.attempts + 1 : 1;
      weatherCache.current.set(location, {
        data: cached?.data || null,
        timestamp: Date.now(),
        attempts: currentAttempts,
        failed: true,
      });

      // Save to localStorage
      saveCacheToStorage();

      return null;
    }
  };

  const getLatencyColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-400';
      case 'good':
        return 'text-blue-400';
      case 'fair':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLatencyIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <Wifi className="w-3 h-3 text-green-400" />;
      case 'good':
        return <Wifi className="w-3 h-3 text-blue-400" />;
      case 'fair':
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <Wifi className="w-3 h-3 text-red-400" />;
      default:
        return <Wifi className="w-3 h-3 text-gray-400" />;
    }
  };

  const getNetworkIcon = (networkInfo: NetworkInfo) => {
    switch (networkInfo.type) {
      case 'WiFi':
        return <Wifi className="w-4 h-4 text-blue-400" />;
      case 'Cellular':
        return <Smartphone className="w-4 h-4 text-green-400" />;
      case 'Ethernet':
        return <Monitor className="w-4 h-4 text-purple-400" />;
      default:
        return <Globe className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNetworkDetails = (networkInfo: NetworkInfo): string => {
    if (networkInfo.bandwidth > 0) {
      if (networkInfo.bandwidth >= 100) {
        return `Tốc độ: ${(networkInfo.bandwidth / 1000).toFixed(1)} Gbps`;
      } else if (networkInfo.bandwidth >= 1) {
        return `Tốc độ: ${networkInfo.bandwidth.toFixed(1)} Mbps`;
      } else {
        return `Tốc độ: ${(networkInfo.bandwidth * 1000).toFixed(0)} Kbps`;
      }
    }
    return '';
  };

  const getNetworkTypeWithDetails = (networkInfo: NetworkInfo): string => {
    return webrtcNetworkDetector.getNetworkTypeString(networkInfo);
  };

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
          if (cached && cached.failed && cached.attempts >= MAX_RETRY_ATTEMPTS) {
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

          const weather = await getWeatherData(user.location);

          if (isMounted) {
            setWeatherData(weather);
            setIsLoading(false);
            weatherInitialized.current = true;
          }
        } catch (error) {
          console.error('❌ Error fetching weather:', error);
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

    const getLocalTime = (userLocation: string): string => {
      try {
        // Extract timezone from location or use a default
        let timezone = 'Asia/Ho_Chi_Minh'; // Default to Vietnam

        // Try to determine timezone from location
        if (
          userLocation.includes('Los Angeles') ||
          userLocation.includes('Huntington Beach') ||
          userLocation.includes('Orange County')
        ) {
          timezone = 'America/Los_Angeles';
        } else if (userLocation.includes('New York')) {
          timezone = 'America/New_York';
        } else if (userLocation.includes('London')) {
          timezone = 'Europe/London';
        } else if (userLocation.includes('Tokyo')) {
          timezone = 'Asia/Tokyo';
        } else if (userLocation.includes('Sydney')) {
          timezone = 'Australia/Sydney';
        }

        const now = new Date();
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

        return userTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } catch (error) {
        console.error('Error getting local time:', error);
        return new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    };

    const getDayNightStatus = (userLocation: string): 'day' | 'night' => {
      try {
        let timezone = 'Asia/Ho_Chi_Minh';

        if (
          userLocation.includes('Los Angeles') ||
          userLocation.includes('Huntington Beach') ||
          userLocation.includes('Orange County')
        ) {
          timezone = 'America/Los_Angeles';
        } else if (userLocation.includes('New York')) {
          timezone = 'America/New_York';
        } else if (userLocation.includes('London')) {
          timezone = 'Europe/London';
        } else if (userLocation.includes('Tokyo')) {
          timezone = 'Asia/Tokyo';
        } else if (userLocation.includes('Sydney')) {
          timezone = 'Australia/Sydney';
        }

        const now = new Date();
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const hour = userTime.getHours();

        return hour >= 6 && hour < 18 ? 'day' : 'night';
      } catch (error) {
        console.error('Error getting day/night status:', error);
        return 'day';
      }
    };

    const getWeatherIcon = () => {
      if (!weatherData) return <Cloud className="w-4 h-4 text-gray-400" />;

      const icon = weatherService.getWeatherIcon(weatherData.icon);
      return <span className="text-2xl">{icon}</span>;
    };

    const userLatencyData = latencyData.get(user.id);

    return (
      <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500">
        {/* Header - User Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h4 className="text-white text-sm font-medium truncate">{user.name}</h4>
                {user.role === 'admin' && (
                  <Shield className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                {getDeviceIcon(user.deviceType)}
                <span className="truncate">{user.deviceType}</span>
              </div>
            </div>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
        </div>

        {/* Time and Weather - Side by Side */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Time Section */}
          <div className="bg-gray-600 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">Thời gian</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-white text-xs font-mono">{getLocalTime(user.location)}</span>
              </div>
              <div className="flex items-center gap-1">
                {getDayNightIcon()}
                <span className="text-gray-400 text-xs">
                  {getDayNightStatus(user.location) === 'day' ? 'Ngày' : 'Đêm'}
                </span>
              </div>
            </div>
          </div>

          {/* Weather Section */}
          <div className="bg-gray-600 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">Thời tiết</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {getWeatherIcon()}
                <div>
                  {isLoading ? (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Cloud className="w-3 h-3" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  ) : weatherData ? (
                    <>
                      <div className="text-white text-xs font-medium">
                        {weatherData.temperature}°C
                      </div>
                      <div className="text-gray-400 text-xs">
                        {weatherService.getWeatherDescription(weatherData.condition)}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Cloud className="w-3 h-3" />
                      <span className="text-xs">Không có dữ liệu</span>
                    </div>
                  )}
                </div>
              </div>
              {weatherData && (
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-2 h-2 text-blue-400" />
                    <span className="text-gray-300 text-xs">{weatherData.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="w-2 h-2 text-gray-400" />
                    <span className="text-gray-300 text-xs">{weatherData.windSpeed} km/h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection and Network - Side by Side */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Connection Quality */}
          <div className="bg-gray-600 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">Kết nối</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-gray-400" />
                <span className="text-white text-xs font-mono">
                  {userLatencyData ? `${userLatencyData.ping}ms` : '--ms'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {userLatencyData ? (
                  <>
                    {getLatencyIcon(userLatencyData.connectionQuality)}
                    <span
                      className={`text-xs ${getLatencyColor(userLatencyData.connectionQuality)}`}
                    >
                      {userLatencyData.connectionQuality === 'excellent'
                        ? 'Tuyệt vời'
                        : userLatencyData.connectionQuality === 'good'
                          ? 'Tốt'
                          : userLatencyData.connectionQuality === 'fair'
                            ? 'Khá'
                            : 'Kém'}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">Đang đo...</span>
                )}
              </div>
            </div>
          </div>

          {/* Network Type */}
          <div className="bg-gray-600 rounded p-2">
            <div className="text-gray-400 text-xs mb-1">Mạng</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {networkInfo ? (
                  getNetworkIcon(networkInfo)
                ) : (
                  <Globe className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-white text-xs truncate">
                  {networkInfo ? getNetworkTypeWithDetails(networkInfo) : 'Unknown'}
                </span>
              </div>
              {networkInfo && getNetworkDetails(networkInfo) && (
                <div className="text-gray-300 text-xs truncate">
                  {getNetworkDetails(networkInfo)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location and Browser - Bottom Row */}
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{user.location.replace(/\s*\([-\d.,\s]+\)\s*$/, '')}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{user.browser}</span>
          </div>
        </div>
      </div>
    );
  });

  UserCard.displayName = 'UserCard';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-blue-400" />
          <h3 className="text-white text-xs font-medium">Người dùng online</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'map' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Bản đồ
            </button>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${stableIsConnected ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className="text-xs text-gray-400">
              {stableIsConnected ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          </div>
        </div>
      </div>

      {stableOnlineUsers.length === 0 ? (
        <div className="text-center py-12">
          <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Không có người dùng online</p>
        </div>
      ) : viewMode === 'map' ? (
        // Map View
        <div className="p-4">
          <UserDensityMap onlineUsers={stableOnlineUsers} isConnected={stableIsConnected} />
        </div>
      ) : (
        // List View
        <div className="p-4 space-y-4">
          {/* Admins */}
          {memoizedAdmins.length > 0 && (
            <div>
              <h4 className="text-gray-300 text-sm font-medium mb-3">Quản trị viên</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memoizedAdmins.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Users */}
          {memoizedRegularUsers.length > 0 && (
            <div>
              <h4 className="text-gray-300 text-sm font-medium mb-3">Người dùng</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memoizedRegularUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-4 border-t border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Tổng số người online:</span>
              <span className="text-white font-medium">{stableOnlineUsers.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-400">Quản trị viên:</span>
              <span className="text-white font-medium">{memoizedAdmins.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-400">Người dùng:</span>
              <span className="text-white font-medium">{memoizedRegularUsers.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

OnlineUsersSection.displayName = 'OnlineUsersSection';

export default OnlineUsersSection;
