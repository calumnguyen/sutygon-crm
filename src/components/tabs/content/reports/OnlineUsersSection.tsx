'use client';
import React, { useState, useEffect } from 'react';
import {
  Users,
  WifiOff,
  Shield,
  Monitor,
  MapPin,
  Smartphone,
  Tablet,
  Globe,
  Laptop,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Clock,
  Wifi,
  Activity,
} from 'lucide-react';
import { useOnlineUsers, OnlineUser } from '@/hooks/useOnlineUsers';
import latencyTracker from '@/lib/utils/latencyTracker';

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

interface NetworkInfo {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

const OnlineUsersSection: React.FC<OnlineUsersSectionProps> = ({ currentUser }) => {
  const { onlineUsers, isConnected } = useOnlineUsers(currentUser);
  const [latencyData, setLatencyData] = useState<Map<string, UserLatencyData>>(new Map());
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Get network information
  useEffect(() => {
    const getNetworkInfo = () => {
      // Enhanced network detection using multiple methods
      const detectNetworkType = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connection = (navigator as any).connection;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        // Get connection details
        const downlink = connection?.downlink || 0;
        const rtt = connection?.rtt || 0;
        const effectiveType = connection?.effectiveType || 'unknown';
        const saveData = connection?.saveData || false;

        // Enhanced hotspot detection
        const isLikelyHotspot = () => {
          // Very slow speed is a strong indicator
          if (downlink < 2) return true;

          // Mobile device with slow WiFi
          if (isMobile && connection?.type === 'wifi' && downlink < 10) return true;

          // High RTT with slow speed
          if (rtt > 100 && downlink < 5) return true;

          return false;
        };

        // Enhanced network type detection
        const getDetailedNetworkType = () => {
          // Personal Hotspot detection
          if (isLikelyHotspot()) {
            if (isIOS) return 'iPhone Hotspot';
            if (isAndroid) return 'Android Hotspot';
            return 'Personal Hotspot';
          }

          // WiFi detection
          if (connection?.type === 'wifi') {
            if (downlink >= 100) return 'WiFi (Fast)';
            if (downlink >= 50) return 'WiFi (Good)';
            if (downlink >= 20) return 'WiFi (Normal)';
            return 'WiFi (Slow)';
          }

          // Cellular detection
          if (connection?.type === 'cellular') {
            switch (effectiveType) {
              case '5g':
                return '5G';
              case '4g':
                return '4G';
              case '3g':
                return '3G';
              case '2g':
              case 'slow-2g':
                return '2G';
              default:
                return 'Cellular';
            }
          }

          // Fallback detection based on speed and device
          if (isMobile) {
            if (downlink < 5) return 'Mobile Data (Slow)';
            if (downlink < 20) return 'Mobile Data (Normal)';
            return 'Mobile Data (Fast)';
          }

          // Desktop/laptop detection
          if (downlink < 10) return 'Internet (Slow)';
          if (downlink < 50) return 'Internet (Normal)';
          return 'Internet (Fast)';
        };

        const networkType = getDetailedNetworkType();

        setNetworkInfo({
          type: connection?.type || 'unknown',
          effectiveType: effectiveType,
          downlink: downlink,
          rtt: rtt,
          saveData: saveData,
        });

        // Store the detailed network type for display
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).detailedNetworkType = networkType;
      };

      getNetworkInfo();
    };

    getNetworkInfo();

    // Listen for network changes
    if ('connection' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', getNetworkInfo);
        return () => connection.removeEventListener('change', getNetworkInfo);
      }
    }
  }, []);

  // Separate admins and regular users
  const admins = onlineUsers.filter((user) => user.role === 'admin');
  const regularUsers = onlineUsers.filter((user) => user.role === 'user');

  // Initialize latency tracking
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

    // Start tracking all online users
    onlineUsers.forEach((user) => {
      latencyTracker.startTrackingUser(user.id);
    });

    // Cleanup on unmount
    return () => {
      onlineUsers.forEach((user) => {
        latencyTracker.stopTrackingUser(user.id);
      });
    };
  }, [onlineUsers, currentUser]);

  // Update tracking when users change
  useEffect(() => {
    const currentUserIds = new Set(onlineUsers.map((u) => u.id));
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
  }, [onlineUsers, latencyData]);

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

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
      case 'clear':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'cloudy':
      case 'clouds':
        return <Cloud className="w-4 h-4 text-gray-400" />;
      case 'partly-cloudy':
        return <Cloud className="w-4 h-4 text-blue-400" />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'windy':
      case 'wind':
        return <Wind className="w-4 h-4 text-gray-400" />;
      default:
        return <Sun className="w-4 h-4 text-yellow-400" />;
    }
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

  const getLocalTime = (userLocation: string) => {
    // Calculate time based on user's location
    // This is a simplified timezone calculation - in production you'd use a proper timezone library
    const now = new Date();

    // Simple timezone offset based on location (this is a demo - in real app use proper timezone data)
    let timezoneOffset = 0;

    // Map locations to approximate timezone offsets (UTC+7 for Vietnam, etc.)
    if (
      userLocation.includes('Vietnam') ||
      userLocation.includes('Ho Chi Minh') ||
      userLocation.includes('Hanoi')
    ) {
      timezoneOffset = 7; // UTC+7
    } else if (userLocation.includes('Japan') || userLocation.includes('Tokyo')) {
      timezoneOffset = 9; // UTC+9
    } else if (userLocation.includes('Singapore') || userLocation.includes('Malaysia')) {
      timezoneOffset = 8; // UTC+8
    } else if (userLocation.includes('Thailand') || userLocation.includes('Bangkok')) {
      timezoneOffset = 7; // UTC+7
    } else if (userLocation.includes('USA') || userLocation.includes('New York')) {
      timezoneOffset = -5; // UTC-5 (EST)
    } else if (userLocation.includes('UK') || userLocation.includes('London')) {
      timezoneOffset = 0; // UTC+0
    } else if (userLocation.includes('Australia') || userLocation.includes('Sydney')) {
      timezoneOffset = 10; // UTC+10
    } else {
      // Default to Vietnam timezone if location is unknown
      timezoneOffset = 7;
    }

    // Calculate the time for the user's timezone
    const userTime = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000);

    const timeString = userTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return timeString;
  };

  const getMockWeatherData = (userLocation: string): UserWeatherData => {
    // Simulate different weather based on location
    // In a real app, you'd fetch actual weather data for each user's location
    const weatherConditions = [
      { condition: 'sunny', description: 'Nắng', temperature: 28, humidity: 60, windSpeed: 8 },
      {
        condition: 'partly-cloudy',
        description: 'Nhiều mây',
        temperature: 24,
        humidity: 65,
        windSpeed: 12,
      },
      { condition: 'cloudy', description: 'U ám', temperature: 22, humidity: 70, windSpeed: 15 },
      { condition: 'rainy', description: 'Mưa', temperature: 20, humidity: 85, windSpeed: 20 },
    ];

    // Use location to determine weather (simple hash for demo)
    const locationHash = userLocation.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const weatherIndex = locationHash % weatherConditions.length;

    return weatherConditions[weatherIndex];
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

  const getNetworkTypeText = (type: string, effectiveType: string): string => {
    switch (type) {
      case 'wifi':
        return 'WiFi';
      case 'cellular':
        switch (effectiveType) {
          case 'slow-2g':
            return '2G';
          case '2g':
            return '2G';
          case '3g':
            return '3G';
          case '4g':
            return '4G';
          case '5g':
            return '5G';
          default:
            return 'Cellular';
        }
      case 'none':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getNetworkIcon = (type: string) => {
    switch (type) {
      case 'wifi':
        return <Wifi className="w-4 h-4 text-blue-400" />;
      case 'cellular':
        return <Smartphone className="w-4 h-4 text-green-400" />;
      default:
        return <Globe className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNetworkDetails = (networkInfo: NetworkInfo): string => {
    if (networkInfo.downlink > 0) {
      if (networkInfo.downlink >= 100) {
        return `Tốc độ: ${(networkInfo.downlink / 1000).toFixed(1)} Gbps`;
      } else if (networkInfo.downlink >= 1) {
        return `Tốc độ: ${networkInfo.downlink.toFixed(1)} Mbps`;
      } else {
        return `Tốc độ: ${(networkInfo.downlink * 1000).toFixed(0)} Kbps`;
      }
    }
    return '';
  };

  const getNetworkTypeWithDetails = (networkInfo: NetworkInfo): string => {
    // Use the detailed network type if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailedType = (window as any).detailedNetworkType;
    if (detailedType) {
      return detailedType;
    }

    // Fallback to basic detection
    const baseType = getNetworkTypeText(networkInfo.type, networkInfo.effectiveType);

    // Detect personal hotspot based on slow WiFi
    if (networkInfo.type === 'wifi' && networkInfo.downlink < 10) {
      return 'Personal Hotspot';
    }

    // Detect slow cellular as likely hotspot
    if (networkInfo.type === 'cellular' && networkInfo.downlink < 5) {
      return 'Mobile Hotspot';
    }

    return baseType;
  };

  const UserCard = ({ user }: { user: OnlineUser }) => {
    const weatherData = getMockWeatherData(user.location);
    const localTime = getLocalTime(user.location);

    // Calculate day/night based on user's local time
    const now = new Date();
    let timezoneOffset = 0;

    // Use the same timezone logic as getLocalTime
    if (
      user.location.includes('Vietnam') ||
      user.location.includes('Ho Chi Minh') ||
      user.location.includes('Hanoi')
    ) {
      timezoneOffset = 7;
    } else if (user.location.includes('Japan') || user.location.includes('Tokyo')) {
      timezoneOffset = 9;
    } else if (user.location.includes('Singapore') || user.location.includes('Malaysia')) {
      timezoneOffset = 8;
    } else if (user.location.includes('Thailand') || user.location.includes('Bangkok')) {
      timezoneOffset = 7;
    } else if (user.location.includes('USA') || user.location.includes('New York')) {
      timezoneOffset = -5;
    } else if (user.location.includes('UK') || user.location.includes('London')) {
      timezoneOffset = 0;
    } else if (user.location.includes('Australia') || user.location.includes('Sydney')) {
      timezoneOffset = 10;
    } else {
      timezoneOffset = 7;
    }

    const userTime = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000);
    const isDayTime = userTime.getHours() >= 6 && userTime.getHours() < 18;

    const userLatencyData = latencyData.get(user.id);

    return (
      <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-medium text-sm">{user.name}</h4>
                {user.role === 'admin' && <Shield className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                {getDeviceIcon(user.deviceType)}
                <span>{user.deviceType}</span>
              </div>
            </div>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
        </div>

        {/* Time and Day/Night Status */}
        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1 font-medium">Thời gian & Trạng thái</div>
          <div className="flex items-center justify-between p-2 bg-gray-600 rounded">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-white text-sm font-mono">{localTime}</span>
            </div>
            <div className="flex items-center gap-1">
              {getDayNightIcon()}
              <span className="text-gray-400 text-xs">{isDayTime ? 'Ban ngày' : 'Ban đêm'}</span>
            </div>
          </div>
        </div>

        {/* Weather Information */}
        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1 font-medium">Thời tiết hiện tại</div>
          <div className="flex items-center justify-between p-2 bg-gray-600 rounded">
            <div className="flex items-center gap-2">
              {getWeatherIcon(weatherData.condition)}
              <div>
                <div className="text-white text-sm font-medium">{weatherData.temperature}°C</div>
                <div className="text-gray-400 text-xs">{weatherData.description}</div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300 text-xs">Độ ẩm: {weatherData.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-gray-400" />
                <span className="text-gray-300 text-xs">Gió: {weatherData.windSpeed} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Latency */}
        <div className="mb-3">
          <div className="text-gray-400 text-xs mb-1 font-medium">Chất lượng kết nối</div>
          <div className="flex items-center justify-between p-2 bg-gray-600 rounded">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-gray-400" />
              <span className="text-white text-sm font-mono">
                {userLatencyData ? `${userLatencyData.ping}ms` : '--ms'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {userLatencyData ? (
                <>
                  {getLatencyIcon(userLatencyData.connectionQuality)}
                  <span className={`text-xs ${getLatencyColor(userLatencyData.connectionQuality)}`}>
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

          {/* Network Type */}
          {networkInfo && (
            <div className="flex items-center justify-between p-2 bg-gray-600 rounded mt-2">
              <div className="flex items-center gap-2">
                {getNetworkIcon(networkInfo.type)}
                <span className="text-white text-sm">{getNetworkTypeWithDetails(networkInfo)}</span>
              </div>
              <div className="text-right">
                <div className="text-gray-300 text-xs">{getNetworkDetails(networkInfo)}</div>
                {networkInfo.saveData && (
                  <div className="text-yellow-400 text-xs">Tiết kiệm dữ liệu</div>
                )}
              </div>
            </div>
          )}
        </div>

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
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Người dùng đang online</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
          </span>
        </div>
      </div>

      {onlineUsers.length === 0 ? (
        <div className="text-center py-12">
          <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Không có người dùng nào đang online</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admins Section */}
          {admins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-yellow-400" />
                <h4 className="text-white font-medium text-sm">Quản trị viên ({admins.length})</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {admins.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Users Section */}
          {regularUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <h4 className="text-white font-medium text-sm">
                  Người dùng ({regularUsers.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {regularUsers.map((user) => (
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
          <span className="text-white font-medium">{onlineUsers.length}</span>
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
};

export default OnlineUsersSection;
