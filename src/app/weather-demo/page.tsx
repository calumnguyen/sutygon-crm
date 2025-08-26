'use client';
import React, { useState } from 'react';
import WeatherTimeCard from '@/components/common/WeatherTimeCard';
import WeatherTimeCardAdvanced from '@/components/common/WeatherTimeCardAdvanced';
import WeatherTimeCardDemo from '@/components/common/WeatherTimeCardDemo';

const WeatherDemoPage: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<'basic' | 'advanced' | 'full'>('basic');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Weather & Time Cards Demo</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedDemo('basic')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDemo === 'basic'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Basic Card
              </button>
              <button
                onClick={() => setSelectedDemo('advanced')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDemo === 'advanced'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Advanced Card
              </button>
              <button
                onClick={() => setSelectedDemo('full')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDemo === 'full'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Full Demo
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="p-8">
        {selectedDemo === 'basic' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Basic Weather & Time Card</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                A simple, beautiful weather and time display card with day/night themes and
                Vietnamese localization.
              </p>
            </div>

            {/* Single Card */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Single Card Display
              </h3>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <WeatherTimeCard />
                </div>
              </div>
            </div>

            {/* Multiple Cards */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Multiple Cards Layout
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <WeatherTimeCard />
                <WeatherTimeCard />
                <WeatherTimeCard />
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 text-xl">⏰</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Real-time Clock</h4>
                  <p className="text-gray-600 text-sm">
                    Updates every second with Vietnamese time format
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-yellow-600 text-xl">🌙</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Day/Night Themes</h4>
                  <p className="text-gray-600 text-sm">
                    Automatically switches between day and night themes
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 text-xl">🌤️</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Weather Display</h4>
                  <p className="text-gray-600 text-sm">
                    Shows temperature, humidity, wind speed, and conditions
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDemo === 'advanced' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Advanced Weather & Time Card
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Enhanced version with real API integration, advanced weather details, and more
                customization options.
              </p>
            </div>

            {/* Basic Advanced Card */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Basic Advanced Card
              </h3>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <WeatherTimeCardAdvanced />
                </div>
              </div>
            </div>

            {/* Advanced Card with Advanced Info */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Advanced Card with Detailed Info
              </h3>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <WeatherTimeCardAdvanced showAdvancedInfo={true} location="Hanoi" />
                </div>
              </div>
            </div>

            {/* Multiple Advanced Cards */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Multiple Advanced Cards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <WeatherTimeCardAdvanced location="Ho Chi Minh City" />
                <WeatherTimeCardAdvanced location="Hanoi" showAdvancedInfo={true} />
                <WeatherTimeCardAdvanced location="Da Nang" />
              </div>
            </div>

            {/* Advanced Features */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Advanced Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 text-xl">🌐</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Real API Integration</h4>
                  <p className="text-gray-600 text-sm">
                    Connect to real weather APIs like OpenWeatherMap
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-orange-600 text-xl">📍</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Location Support</h4>
                  <p className="text-gray-600 text-sm">
                    Display weather for different cities and locations
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-red-600 text-xl">🔄</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Auto Refresh</h4>
                  <p className="text-gray-600 text-sm">
                    Automatically updates weather data every 30 minutes
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-indigo-600 text-xl">📊</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Advanced Metrics</h4>
                  <p className="text-gray-600 text-sm">
                    UV index, pressure, visibility, and wind direction
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-teal-600 text-xl">⚙️</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Customizable</h4>
                  <p className="text-gray-600 text-sm">
                    Configurable options for different use cases
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-pink-600 text-xl">🎨</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Beautiful Design</h4>
                  <p className="text-gray-600 text-sm">
                    Modern glassmorphism design with smooth animations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDemo === 'full' && <WeatherTimeCardDemo />}
      </div>
    </div>
  );
};

export default WeatherDemoPage;
