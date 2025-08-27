'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Users } from 'lucide-react';
import { OnlineUser } from '@/hooks/useOnlineUsers';
import DensityHeatmap from './DensityHeatmap';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import './UserDensityMap.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserDensityMapClientProps {
  onlineUsers: OnlineUser[];
  isConnected: boolean;
}

// Vietnamese cities with coordinates - Comprehensive coverage
const VIETNAM_CITIES: Record<string, { lat: number; lng: number }> = {
  // Major Cities
  'Ho Chi Minh City': { lat: 10.8231, lng: 106.6297 },
  Hanoi: { lat: 21.0285, lng: 105.8542 },
  'Da Nang': { lat: 16.0544, lng: 108.2022 },
  'Hai Phong': { lat: 20.8449, lng: 106.6881 },
  'Can Tho': { lat: 10.0452, lng: 105.7469 },
  'Bien Hoa': { lat: 10.9574, lng: 106.8426 },
  Hue: { lat: 16.4637, lng: 107.5909 },
  'Nha Trang': { lat: 12.2388, lng: 109.1967 },
  'Buon Ma Thuot': { lat: 12.6662, lng: 108.0382 },
  'Vung Tau': { lat: 10.3459, lng: 107.0843 },
  'Qui Nhon': { lat: 13.7765, lng: 109.2233 },
  'Rach Gia': { lat: 10.0124, lng: 105.0915 },
  'Long Xuyen': { lat: 10.3866, lng: 105.4362 },
  'Thu Dau Mot': { lat: 10.9804, lng: 106.6519 },
  'My Tho': { lat: 10.3623, lng: 106.3622 },
  'Bac Lieu': { lat: 9.2943, lng: 105.7278 },
  'Ca Mau': { lat: 9.1527, lng: 105.1967 },
  'Tay Ninh': { lat: 11.3131, lng: 106.0973 },
  'Thai Nguyen': { lat: 21.5942, lng: 105.8482 },
  'Nam Dinh': { lat: 20.4339, lng: 106.1621 },
  Vinh: { lat: 18.6734, lng: 105.6923 },
  'Quang Ngai': { lat: 15.1213, lng: 108.8044 },
  'Phan Thiet': { lat: 10.9333, lng: 108.1 },
  'Dong Hoi': { lat: 17.4684, lng: 106.6222 },
  'Tam Ky': { lat: 15.5736, lng: 108.474 },
  'Kon Tum': { lat: 14.3545, lng: 108.0076 },
  Pleiku: { lat: 13.9716, lng: 108.0147 },
  'Dong Xoai': { lat: 11.5349, lng: 106.8822 },
  'Ba Ria': { lat: 10.4941, lng: 107.1684 },
  'Long Khanh': { lat: 10.9304, lng: 107.2406 },
  'Xuan Loc': { lat: 10.9304, lng: 107.2406 },
  'Tan An': { lat: 10.5333, lng: 106.4167 },
  'Ben Tre': { lat: 10.2333, lng: 106.3833 },
  'Tra Vinh': { lat: 9.9513, lng: 106.3345 },
  'Soc Trang': { lat: 9.6033, lng: 105.98 },
  'Bac Ninh': { lat: 21.1861, lng: 106.0763 },
  'Hung Yen': { lat: 20.8525, lng: 106.0169 },
  'Hai Duong': { lat: 20.9373, lng: 106.3344 },
  'Quang Ninh': { lat: 21.0064, lng: 107.2925 },
  'Lang Son': { lat: 21.8478, lng: 106.7577 },
  'Cao Bang': { lat: 22.6667, lng: 106.25 },
  'Lao Cai': { lat: 22.4833, lng: 103.95 },
  'Yen Bai': { lat: 21.7167, lng: 104.9 },
  'Tuyen Quang': { lat: 21.8233, lng: 105.2142 },
  'Phu Tho': { lat: 21.4, lng: 105.4333 },
  'Vinh Phuc': { lat: 21.3083, lng: 105.6042 },
  'Ha Giang': { lat: 22.8333, lng: 104.9833 },
  'Bac Kan': { lat: 22.15, lng: 105.8333 },
  'Dien Bien': { lat: 21.3833, lng: 103.0167 },
  'Son La': { lat: 21.1023, lng: 103.7289 },
  'Hoa Binh': { lat: 20.8133, lng: 105.3383 },
  'Thanh Hoa': { lat: 19.8066, lng: 105.7852 },
  'Nghe An': { lat: 18.3333, lng: 105.9 },
  'Ha Tinh': { lat: 18.3333, lng: 105.9 },
  'Quang Binh': { lat: 17.4684, lng: 106.6222 },
  'Quang Tri': { lat: 16.7942, lng: 107.0022 },
  'Thua Thien Hue': { lat: 16.4637, lng: 107.5909 },
  'Quang Nam': { lat: 15.5736, lng: 108.474 },
  'Binh Dinh': { lat: 14.1667, lng: 108.9 },
  'Phu Yen': { lat: 13.1667, lng: 109.1667 },
  'Khanh Hoa': { lat: 12.2388, lng: 109.1967 },
  'Ninh Thuan': { lat: 11.75, lng: 108.8333 },
  'Binh Thuan': { lat: 10.9333, lng: 108.1 },
  'Gia Lai': { lat: 13.9716, lng: 108.0147 },
  'Dak Lak': { lat: 12.6662, lng: 108.0382 },
  'Dak Nong': { lat: 12.0, lng: 107.7 },
  'Lam Dong': { lat: 11.95, lng: 108.4333 },
  'Binh Phuoc': { lat: 11.5349, lng: 106.8822 },
  'Binh Duong': { lat: 10.9804, lng: 106.6519 },
  'Dong Nai': { lat: 10.9574, lng: 106.8426 },
  'Ba Ria - Vung Tau': { lat: 10.3459, lng: 107.0843 },
  'Long An': { lat: 10.5333, lng: 106.4167 },
  'Tien Giang': { lat: 10.3623, lng: 106.3622 },
  'Vinh Long': { lat: 10.2537, lng: 105.9722 },
  'Dong Thap': { lat: 10.4933, lng: 105.6882 },
  'An Giang': { lat: 10.5215, lng: 105.1258 },
  'Kien Giang': { lat: 10.0124, lng: 105.0915 },
  'Hau Giang': { lat: 9.7579, lng: 105.6413 },

  // Ho Chi Minh City Districts
  'District 1': { lat: 10.7769, lng: 106.7009 },
  'District 2': { lat: 10.7872, lng: 106.7498 },
  'District 3': { lat: 10.7826, lng: 106.6881 },
  'District 4': { lat: 10.7663, lng: 106.7049 },
  'District 5': { lat: 10.754, lng: 106.6634 },
  'District 6': { lat: 10.7465, lng: 106.6352 },
  'District 7': { lat: 10.7323, lng: 106.7267 },
  'District 8': { lat: 10.7403, lng: 106.6654 },
  'District 9': { lat: 10.8428, lng: 106.8287 },
  'District 10': { lat: 10.7679, lng: 106.6669 },
  'District 11': { lat: 10.7626, lng: 106.6439 },
  'District 12': { lat: 10.8633, lng: 106.6547 },
  'Binh Thanh': { lat: 10.8106, lng: 106.7091 },
  'Tan Binh': { lat: 10.8014, lng: 106.6526 },
  'Phu Nhuan': { lat: 10.7944, lng: 106.6789 },
  'Go Vap': { lat: 10.8387, lng: 106.6654 },
  'Thu Duc': { lat: 10.8494, lng: 106.7537 },
  'Cu Chi': { lat: 11.0374, lng: 106.5663 },
  'Hoc Mon': { lat: 10.8805, lng: 106.5953 },
  'Binh Chanh': { lat: 10.6871, lng: 106.5946 },
  'Nha Be': { lat: 10.6954, lng: 106.7471 },
  'Can Gio': { lat: 10.4111, lng: 106.9547 },

  // Hanoi Districts
  'Ba Dinh': { lat: 21.0333, lng: 105.85 },
  'Hoan Kiem': { lat: 21.0285, lng: 105.8542 },
  'Tay Ho': { lat: 21.0667, lng: 105.8167 },
  'Long Bien': { lat: 21.05, lng: 105.8833 },
  'Cau Giay': { lat: 21.0333, lng: 105.8 },
  'Dong Da': { lat: 21.0167, lng: 105.8333 },
  'Hai Ba Trung': { lat: 21.0167, lng: 105.85 },
  'Hoang Mai': { lat: 20.9833, lng: 105.85 },
  'Thanh Xuan': { lat: 20.9833, lng: 105.8 },
  'Soc Son': { lat: 21.25, lng: 105.85 },
  'Dong Anh': { lat: 21.1667, lng: 105.85 },
  'Gia Lam': { lat: 21.0167, lng: 105.9333 },
  'Me Linh': { lat: 21.1833, lng: 105.7167 },
  'Thanh Tri': { lat: 20.95, lng: 105.85 },
  'Tu Liem': { lat: 21.0333, lng: 105.7667 },
  'Phu Xuyen': { lat: 20.7333, lng: 105.9 },
  'Thuong Tin': { lat: 20.8167, lng: 105.85 },
  'Phuc Tho': { lat: 21.1, lng: 105.55 },
  'Dan Phuong': { lat: 21.0833, lng: 105.6667 },
  'Hoai Duc': { lat: 21.0667, lng: 105.7 },
  'Quoc Oai': { lat: 21.0, lng: 105.6167 },
  'Thach That': { lat: 21.0167, lng: 105.55 },
  'Chuong My': { lat: 20.9167, lng: 105.7167 },
  'Thanh Oai': { lat: 20.85, lng: 105.7667 },
  'Ung Hoa': { lat: 20.85, lng: 105.85 },
  'My Duc': { lat: 20.7333, lng: 105.7167 },
  'Ba Vi': { lat: 21.2, lng: 105.4333 },
  'Son Tay': { lat: 21.1333, lng: 105.5 },

  // Popular Tourist Destinations
  Sapa: { lat: 22.3364, lng: 103.844 },
  'Ha Long': { lat: 20.9101, lng: 107.1839 },
  'Cat Ba': { lat: 20.7278, lng: 107.0481 },
  'Mai Chau': { lat: 20.6569, lng: 104.9819 },
  'Tam Coc': { lat: 20.2167, lng: 105.9167 },
  'Hoi An': { lat: 15.8801, lng: 108.3383 },
  'My Son': { lat: 15.7633, lng: 108.1242 },
  'Phong Nha': { lat: 17.4684, lng: 106.6222 },
  Dalat: { lat: 11.9404, lng: 108.4583 },
  'Mui Ne': { lat: 10.9333, lng: 108.1 },
  'Phu Quoc': { lat: 10.2277, lng: 103.9602 },
  'Con Dao': { lat: 8.6833, lng: 106.6167 },
  'Cat Tien': { lat: 11.4333, lng: 107.3667 },
  'Yok Don': { lat: 12.6667, lng: 107.75 },

  // Major Industrial Areas
  VSIP: { lat: 10.9804, lng: 106.6519 }, // Binh Duong
  'Tan Thuan': { lat: 10.7323, lng: 106.7267 }, // District 7
  'Cat Lai': { lat: 10.7872, lng: 106.7498 }, // District 2
  'Linh Trung': { lat: 10.8428, lng: 106.8287 }, // District 9
  'Tan Tao': { lat: 10.7403, lng: 106.6654 }, // District 8
  'Hiep Phuoc': { lat: 10.6954, lng: 106.7471 }, // Nha Be

  // Universities and Educational Centers
  'VNU-HCM': { lat: 10.7626, lng: 106.6439 }, // District 11
  'VNU-HN': { lat: 21.0333, lng: 105.8 }, // Cau Giay
  'FPT University': { lat: 10.8428, lng: 106.8287 }, // District 9
  RMIT: { lat: 10.7323, lng: 106.7267 }, // District 7
  'British University': { lat: 10.7872, lng: 106.7498 }, // District 2

  // Airports
  'Tan Son Nhat': { lat: 10.8188, lng: 106.6519 },
  'Noi Bai': { lat: 21.2214, lng: 105.8074 },
  'Da Nang Airport': { lat: 16.0439, lng: 108.1994 },
  'Cam Ranh': { lat: 11.9982, lng: 109.2194 },
  'Phu Quoc Airport': { lat: 10.2277, lng: 103.9602 },

  // Ports
  'Cat Lai Port': { lat: 10.7872, lng: 106.7498 },
  'Hai Phong Port': { lat: 20.8449, lng: 106.6881 },
  'Da Nang Port': { lat: 16.0544, lng: 108.2022 },
  'Vung Tau Port': { lat: 10.3459, lng: 107.0843 },
};

// Helper function to extract coordinates from location string
const getCoordinatesFromLocation = (location: string): { lat: number; lng: number } | null => {
  // Try to extract coordinates from location string first (e.g., "Los Angeles, United States (34.0522, -118.2437)")
  // This gives us the most precise location
  const coordMatch = location.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);

    // Validate coordinates are reasonable
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Check for international cities (fallback to city centers)
  const internationalCities: Record<string, { lat: number; lng: number }> = {
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'New York': { lat: 40.7128, lng: -74.006 },
    London: { lat: 51.5074, lng: -0.1278 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Sydney: { lat: -33.8688, lng: 151.2093 },
    Singapore: { lat: 1.3521, lng: 103.8198 },
    Bangkok: { lat: 13.7563, lng: 100.5018 },
    Manila: { lat: 14.5995, lng: 120.9842 },
    Jakarta: { lat: -6.2088, lng: 106.8456 },
    'Kuala Lumpur': { lat: 3.139, lng: 101.6869 },
  };

  // Check international cities first
  for (const [cityName, coords] of Object.entries(internationalCities)) {
    if (location.toLowerCase().includes(cityName.toLowerCase())) {
      return coords;
    }
  }

  // Then check Vietnamese cities (fallback to city centers)
  for (const [cityName, coords] of Object.entries(VIETNAM_CITIES)) {
    if (location.toLowerCase().includes(cityName.toLowerCase())) {
      return coords;
    }
  }

  // Default to Da Nang if no match found
  return VIETNAM_CITIES['Da Nang'] || null;
};

// Custom marker icon with user initials
const createCustomIcon = (isAdmin: boolean, userInitial: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <div class="marker-icon ${isAdmin ? 'admin' : 'user'}">
          <div class="marker-initial">${userInitial}</div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Helper function to get clean location display (without coordinates)
const getCleanLocation = (location: string): string => {
  // Remove coordinates from location string
  const cleanLocation = location.replace(/\s*\([-\d.,\s]+\)\s*$/, '');
  return cleanLocation;
};

// User Marker Component
const UserMarker: React.FC<{ user: OnlineUser }> = ({ user }) => {
  const coordinates = getCoordinatesFromLocation(user.location);

  if (!coordinates) {
    return null;
  }

  const userInitial = user.name.charAt(0).toUpperCase();
  const icon = createCustomIcon(user.role === 'admin', userInitial);
  const cleanLocation = getCleanLocation(user.location);

  return (
    <Marker position={[coordinates.lat, coordinates.lng]} icon={icon}>
      <Popup>
        <div className="p-3 min-w-[220px] max-w-[280px]">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-3 h-3 rounded-full ${user.role === 'admin' ? 'bg-yellow-400' : 'bg-blue-400'}`}
            />
            <h3 className="font-medium text-gray-900 text-base">{user.name}</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Vai trò:</span>
              <span>{user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Thiết bị:</span>
              <span className="truncate ml-2">{user.deviceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Trình duyệt:</span>
              <span className="truncate ml-2">{user.browser}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Vị trí:</span>
              <span className="truncate ml-2 text-right">{cleanLocation}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Map Auto-center Component
const MapAutoCenter: React.FC<{ users: OnlineUser[] }> = ({ users }) => {
  const map = useMap();

  useEffect(() => {
    if (users.length === 0) return;

    const coordinates = users
      .map((user) => getCoordinatesFromLocation(user.location))
      .filter(Boolean) as { lat: number; lng: number }[];

    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [users, map]);

  return null;
};

// Main Map Component
const UserDensityMapClient: React.FC<UserDensityMapClientProps> = ({
  onlineUsers,
  isConnected,
}) => {
  const [mapKey, setMapKey] = useState(0);

  // Force map re-render when users change significantly
  useEffect(() => {
    setMapKey((prev) => prev + 1);
  }, [onlineUsers.length]);

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400">Đang kết nối đến hệ thống...</p>
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400">Không có người dùng online</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-pink-400" />
          <h3 className="text-white text-sm font-medium">Bản đồ người dùng online</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="text-gray-400 text-xs">Người dùng</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-400 text-xs">Quản trị viên</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <MapContainer
          key={mapKey}
          center={[33.7739, -117.9414]} // Garden Grove, Orange County
          zoom={11}
          className="h-[400px] w-full"
          zoomControl={true}
          attributionControl={false}
          doubleClickZoom={false}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
        >
          {/* White base map */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Density Heatmap */}
          <DensityHeatmap users={onlineUsers} />

          {/* User Markers */}
          {onlineUsers.map((user) => (
            <UserMarker key={user.id} user={user} />
          ))}

          {/* Auto-center map */}
          <MapAutoCenter users={onlineUsers} />
        </MapContainer>

        {/* Density Legend */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg z-[1000]">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Mật độ người dùng theo thành phố
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-100 rounded border border-pink-300"></div>
            <span className="text-xs text-gray-600">1-2 người</span>
            <div className="w-4 h-4 bg-pink-400 rounded border border-pink-500"></div>
            <span className="text-xs text-gray-600">3-4 người</span>
            <div className="w-4 h-4 bg-pink-500 rounded border border-pink-700"></div>
            <span className="text-xs text-gray-600">5+ người</span>
          </div>
        </div>

        {/* User Count */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-2 shadow-lg z-[1000]">
          <div className="text-xs font-medium text-gray-700">{onlineUsers.length} người online</div>
        </div>
      </div>
    </div>
  );
};

export default UserDensityMapClient;
