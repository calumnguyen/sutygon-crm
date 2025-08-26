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
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface WeatherTimeCardProps {
  className?: string;
}

const WeatherTimeCard: React.FC<WeatherTimeCardProps> = ({ className = '' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulate weather data (replace with actual API call)
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        // Simulate API call - replace with actual weather API
        const mockWeatherData: WeatherData = {
          temperature: 24,
          condition: 'partly-cloudy',
          humidity: 65,
          windSpeed: 12,
          icon: 'cloud',
        };

        setWeatherData(mockWeatherData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        setIsLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

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

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'partly-cloudy':
        return <Cloud className="w-8 h-8 text-blue-400" />;
      case 'rainy':
        return <CloudRain className="w-8 h-8 text-blue-600" />;
      case 'snowy':
        return <CloudSnow className="w-8 h-8 text-blue-300" />;
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
        {/* Header with Day/Night indicator */}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getWeatherIcon(weatherData.condition)}
                <div>
                  <div className={`text-2xl font-bold ${getTextColor()}`}>
                    {weatherData.temperature}°C
                  </div>
                  <div className={`text-sm ${getTextColor()} opacity-80`}>
                    {weatherData.condition === 'partly-cloudy'
                      ? 'Nhiều mây'
                      : weatherData.condition === 'sunny'
                        ? 'Nắng'
                        : weatherData.condition === 'cloudy'
                          ? 'U ám'
                          : weatherData.condition === 'rainy'
                            ? 'Mưa'
                            : weatherData.condition === 'snowy'
                              ? 'Tuyết'
                              : weatherData.condition === 'windy'
                                ? 'Gió mạnh'
                                : 'Nắng'}
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="flex items-center space-x-1">
                  <Thermometer className={`w-4 h-4 ${getTextColor()}`} />
                  <span className={`text-sm ${getTextColor()}`}>{weatherData.humidity}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wind className={`w-4 h-4 ${getTextColor()}`} />
                  <span className={`text-sm ${getTextColor()}`}>{weatherData.windSpeed} km/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with additional info */}
        <div className="mt-4 flex justify-between items-center">
          <div className={`text-xs ${getTextColor()} opacity-70`}>
            Cập nhật lần cuối:{' '}
            {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`text-xs ${getTextColor()} opacity-70`}>Việt Nam</div>
        </div>
      </div>
    </div>
  );
};

export default WeatherTimeCard;
