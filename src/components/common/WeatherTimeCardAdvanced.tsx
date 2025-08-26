'use client';
import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Clock,
  Calendar,
  MapPin,
  RefreshCw,
  Droplets,
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  visibility: number;
  uvIndex: number;
  icon: string;
  description: string;
  location: string;
  lastUpdated: string;
}

interface WeatherTimeCardAdvancedProps {
  className?: string;
  apiKey?: string;
  location?: string;
  autoRefresh?: boolean;
  showAdvancedInfo?: boolean;
}

const WeatherTimeCardAdvanced: React.FC<WeatherTimeCardAdvancedProps> = ({
  className = '',
  apiKey,
  location = 'Ho Chi Minh City',
  autoRefresh = true,
  showAdvancedInfo = false,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto refresh weather data every 30 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const refreshTimer = setInterval(
      () => {
        fetchWeatherData();
      },
      30 * 60 * 1000
    ); // 30 minutes

    return () => clearInterval(refreshTimer);
  }, [autoRefresh, location]);

  const fetchWeatherData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      if (apiKey) {
        // Real API call - replace with your preferred weather API
        // Example with OpenWeatherMap API
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=vi`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        const weatherData: WeatherData = {
          temperature: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          condition: data.weather[0].main.toLowerCase(),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          windDirection: getWindDirection(data.wind.deg),
          pressure: data.main.pressure,
          visibility: data.visibility / 1000, // Convert to km
          uvIndex: 0, // Would need separate API call
          icon: data.weather[0].icon,
          description: data.weather[0].description,
          location: data.name,
          lastUpdated: new Date().toLocaleTimeString('vi-VN'),
        };

        setWeatherData(weatherData);
      } else {
        // Mock data for demo
        const mockWeatherData: WeatherData = {
          temperature: 24,
          feelsLike: 26,
          condition: 'partly-cloudy',
          humidity: 65,
          windSpeed: 12,
          windDirection: 'Đông Nam',
          pressure: 1013,
          visibility: 10,
          uvIndex: 5,
          icon: 'cloud',
          description: 'Nhiều mây',
          location: location,
          lastUpdated: new Date().toLocaleTimeString('vi-VN'),
        };

        setWeatherData(mockWeatherData);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setError('Không thể tải dữ liệu thời tiết');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDayTime = () => {
    const hour = currentTime.getHours();
    return hour >= 6 && hour < 18;
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'clear':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'clouds':
      case 'partly-cloudy':
        return <Cloud className="w-8 h-8 text-blue-400" />;
      case 'rain':
      case 'rainy':
        return <CloudRain className="w-8 h-8 text-blue-600" />;
      case 'snow':
      case 'snowy':
        return <CloudSnow className="w-8 h-8 text-blue-300" />;
      case 'wind':
      case 'windy':
        return <Wind className="w-8 h-8 text-gray-400" />;
      default:
        return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getDayNightIcon = () => {
    return isDayTime() ? (
      <Sun className="w-6 h-6 text-yellow-500" />
    ) : (
      <Moon className="w-6 h-6 text-blue-400" />
    );
  };

  const getGradientClass = () => {
    return isDayTime()
      ? 'bg-gradient-to-br from-blue-400 via-blue-300 to-yellow-200'
      : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900';
  };

  const getTextColor = () => {
    return isDayTime() ? 'text-gray-800' : 'text-white';
  };

  const getUVIndexColor = (uvIndex: number) => {
    if (uvIndex <= 2) return 'text-green-500';
    if (uvIndex <= 5) return 'text-yellow-500';
    if (uvIndex <= 7) return 'text-orange-500';
    if (uvIndex <= 10) return 'text-red-500';
    return 'text-purple-500';
  };

  if (isLoading) {
    return (
      <div
        className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm bg-white/10 border border-white/20 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm border border-white/20 overflow-hidden relative ${getGradientClass()} ${className}`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      <div className="relative z-10">
        {/* Header with Location and Refresh */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MapPin className={`w-4 h-4 ${getTextColor()}`} />
            <span className={`text-sm font-medium ${getTextColor()}`}>
              {weatherData?.location || location}
            </span>
          </div>
          <button
            onClick={fetchWeatherData}
            disabled={isRefreshing}
            className={`p-2 rounded-full hover:bg-white/20 transition-colors ${getTextColor()} ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Day/Night and Date */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {getDayNightIcon()}
            <span className={`text-sm font-medium ${getTextColor()}`}>
              {isDayTime() ? 'Ban ngày' : 'Ban đêm'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className={`w-4 h-4 ${getTextColor()}`} />
            <span className={`text-sm ${getTextColor()}`}>{formatDate(currentTime)}</span>
          </div>
        </div>

        {/* Time Display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Clock className={`w-5 h-5 ${getTextColor()}`} />
            <span className={`text-lg font-medium ${getTextColor()}`}>Thời gian hiện tại</span>
          </div>
          <div className={`text-4xl font-bold font-mono ${getTextColor()} tracking-wider`}>
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Weather Information */}
        {weatherData && (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                {getWeatherIcon(weatherData.condition)}
                <div>
                  <div className={`text-3xl font-bold ${getTextColor()}`}>
                    {weatherData.temperature}°C
                  </div>
                  <div className={`text-sm ${getTextColor()} opacity-80`}>
                    Cảm giác như {weatherData.feelsLike}°C
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm ${getTextColor()} opacity-80 mb-1`}>
                  {weatherData.description}
                </div>
                <div className={`text-xs ${getTextColor()} opacity-60`}>
                  Cập nhật: {weatherData.lastUpdated}
                </div>
              </div>
            </div>

            {/* Basic Weather Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Droplets className={`w-4 h-4 ${getTextColor()}`} />
                <span className={`text-sm ${getTextColor()}`}>Độ ẩm: {weatherData.humidity}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className={`w-4 h-4 ${getTextColor()}`} />
                <span className={`text-sm ${getTextColor()}`}>
                  Gió: {weatherData.windSpeed} km/h {weatherData.windDirection}
                </span>
              </div>
            </div>

            {/* Advanced Weather Details */}
            {showAdvancedInfo && (
              <div className="border-t border-white/20 pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <Thermometer className={`w-3 h-3 ${getTextColor()}`} />
                    <span className={getTextColor()}>Áp suất: {weatherData.pressure} hPa</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-3 h-3 rounded-full ${getUVIndexColor(weatherData.uvIndex)}`}
                    >
                      ●
                    </span>
                    <span className={getTextColor()}>UV: {weatherData.uvIndex}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 ${getTextColor()}`}>👁️</span>
                    <span className={getTextColor()}>Tầm nhìn: {weatherData.visibility} km</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex justify-between items-center">
          <div className={`text-xs ${getTextColor()} opacity-70`}>
            {weatherData?.lastUpdated ? `Cập nhật: ${weatherData.lastUpdated}` : 'Đang tải...'}
          </div>
          <div className={`text-xs ${getTextColor()} opacity-70`}>Việt Nam</div>
        </div>
      </div>
    </div>
  );
};

export default WeatherTimeCardAdvanced;
