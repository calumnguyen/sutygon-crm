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
  Droplets,
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  location: string;
  lastUpdated: string;
}

interface WeatherTimeCardCompactProps {
  className?: string;
  location?: string;
}

const WeatherTimeCardCompact: React.FC<WeatherTimeCardCompactProps> = ({
  className = '',
  location = 'Ho Chi Minh City',
}) => {
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
        // Mock data for demo - replace with actual weather API
        const mockWeatherData: WeatherData = {
          temperature: 24,
          feelsLike: 26,
          condition: 'partly-cloudy',
          humidity: 65,
          windSpeed: 12,
          description: 'Nhiều mây',
          location: location,
          lastUpdated: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        setWeatherData(mockWeatherData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        setIsLoading(false);
      }
    };

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
      month: 'short',
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
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'cloudy':
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-400" />;
      case 'partly-cloudy':
        return <Cloud className="w-5 h-5 text-blue-400" />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'snowy':
      case 'snow':
        return <CloudSnow className="w-5 h-5 text-blue-300" />;
      case 'windy':
      case 'wind':
        return <Wind className="w-5 h-5 text-gray-400" />;
      default:
        return <Sun className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getDayNightIcon = () => {
    return isDayTime() ? (
      <Sun className="w-4 h-4 text-yellow-400" />
    ) : (
      <Moon className="w-4 h-4 text-blue-400" />
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
          <div className="h-6 bg-gray-600 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-600 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${className}`}>
      {/* Header with Location and Day/Night */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-white text-sm font-medium">
            {weatherData?.location || location}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getDayNightIcon()}
          <span className="text-gray-400 text-xs">{isDayTime() ? 'Ban ngày' : 'Ban đêm'}</span>
        </div>
      </div>

      {/* Time and Date */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-white font-mono tracking-wider mb-1">
          {formatTime(currentTime)}
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(currentTime)}</span>
        </div>
      </div>

      {/* Weather Information */}
      {weatherData && (
        <div className="bg-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {getWeatherIcon(weatherData.condition)}
              <div>
                <div className="text-xl font-bold text-white">{weatherData.temperature}°C</div>
                <div className="text-gray-400 text-xs">Cảm giác như {weatherData.feelsLike}°C</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white text-sm font-medium">{weatherData.description}</div>
            </div>
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Droplets className="w-3 h-3 text-blue-400" />
              <span className="text-gray-300">Độ ẩm: {weatherData.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-3 h-3 text-gray-400" />
              <span className="text-gray-300">Gió: {weatherData.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Cập nhật: {weatherData?.lastUpdated || '--:--'}</span>
          <span className="text-gray-400">Việt Nam</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherTimeCardCompact;
