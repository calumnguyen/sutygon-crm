'use client';
import React from 'react';
import WeatherTimeCard from './WeatherTimeCard';

const WeatherTimeCardDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Weather & Time Card Component</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A beautiful, responsive weather and time display card with day/night themes, real-time
            updates, and Vietnamese localization.
          </p>
        </div>

        {/* Single Card Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Single Card Display
          </h2>
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <WeatherTimeCard />
            </div>
          </div>
        </div>

        {/* Multiple Cards Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Multiple Cards Layout
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <WeatherTimeCard />
            <WeatherTimeCard />
            <WeatherTimeCard />
          </div>
        </div>

        {/* Sidebar Layout Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Sidebar Layout</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4">
              <WeatherTimeCard />
            </div>
            <div className="lg:w-3/4 bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Main Content Area</h3>
              <p className="text-gray-600 mb-4">
                This demonstrates how the weather card can be used as a sidebar component alongside
                your main application content.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Feature 1</h4>
                  <p className="text-blue-600 text-sm">Real-time clock updates every second</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Feature 2</h4>
                  <p className="text-green-600 text-sm">Dynamic day/night theme switching</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-2">Feature 3</h4>
                  <p className="text-purple-600 text-sm">Beautiful gradient backgrounds</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Feature 4</h4>
                  <p className="text-orange-600 text-sm">Vietnamese localization support</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Layout Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Compact Layout</h2>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Dashboard Overview</h3>
                <p className="text-gray-600 text-sm">
                  The weather card integrates seamlessly with your dashboard layout.
                </p>
              </div>
              <div className="w-full sm:w-80">
                <WeatherTimeCard className="!p-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Component Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 text-xl">⏰</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Real-time Clock</h3>
              <p className="text-gray-600 text-sm">
                Updates every second with Vietnamese time format
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-yellow-600 text-xl">🌙</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Day/Night Themes</h3>
              <p className="text-gray-600 text-sm">
                Automatically switches between day and night themes
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 text-xl">🌤️</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Weather Display</h3>
              <p className="text-gray-600 text-sm">
                Shows temperature, humidity, wind speed, and conditions
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 text-xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Responsive Design</h3>
              <p className="text-gray-600 text-sm">Works perfectly on all screen sizes</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 text-xl">🇻🇳</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Vietnamese Support</h3>
              <p className="text-gray-600 text-sm">
                Fully localized with Vietnamese text and date formats
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-indigo-600 text-xl">🎨</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Beautiful Design</h3>
              <p className="text-gray-600 text-sm">
                Modern glassmorphism design with smooth animations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherTimeCardDemo;
