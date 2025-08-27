'use client';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { OnlineUser } from '@/hooks/useOnlineUsers';

interface DensityHeatmapProps {
  users: OnlineUser[];
}

interface CityBoundary {
  name: string;
  geojson: GeoJSON.Geometry;
  coordinates: { lat: number; lng: number };
}

// Cache for city boundaries to avoid repeated API calls
const cityBoundaryCache = new Map<string, CityBoundary>();

// Helper function to get coordinates from location string
const getCoordinatesFromLocation = (location: string): { lat: number; lng: number } | null => {
  // Try to extract coordinates from location string first (e.g., "Los Angeles, United States (34.0522, -118.2437)")
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

  // Extract city name from location string
  const cityMatch = location.match(/^([^,]+)/);
  if (cityMatch) {
    const cityName = cityMatch[1].trim();
    // Try to find coordinates for this city
    for (const [knownCity, coords] of Object.entries(internationalCities)) {
      if (
        cityName.toLowerCase().includes(knownCity.toLowerCase()) ||
        knownCity.toLowerCase().includes(cityName.toLowerCase())
      ) {
        return coords;
      }
    }
  }

  return null;
};

// Function to fetch city boundary from Nominatim API
const fetchCityBoundary = async (
  cityName: string,
  coordinates: { lat: number; lng: number }
): Promise<CityBoundary | null> => {
  try {
    console.log(`🗺️ Fetching boundary for: ${cityName}`);

    // First try to get the boundary using the city name
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&polygon_geojson=1&addressdetails=1&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SutygonCRM/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const place = data[0];

      if (place.geojson) {
        console.log(`✅ Found boundary for ${cityName}`);
        return {
          name: cityName,
          geojson: place.geojson,
          coordinates: coordinates,
        };
      }
    }

    // If no boundary found, try with coordinates
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.lat}&lon=${coordinates.lng}&format=json&polygon_geojson=1&addressdetails=1&zoom=10`;

    const reverseResponse = await fetch(reverseUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SutygonCRM/1.0',
      },
    });

    if (reverseResponse.ok) {
      const reverseData = await reverseResponse.json();

      if (reverseData.geojson) {
        console.log(`✅ Found boundary for ${cityName} using coordinates`);
        return {
          name: cityName,
          geojson: reverseData.geojson,
          coordinates: coordinates,
        };
      }
    }

    console.log(`❌ No boundary found for ${cityName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching boundary for ${cityName}:`, error);
    return null;
  }
};

const DensityHeatmap: React.FC<DensityHeatmapProps> = ({ users }) => {
  const map = useMap();
  const heatmapLayerRef = useRef<L.GeoJSON[]>([]);

  useEffect(() => {
    console.log('🔄 DensityHeatmap: Starting heatmap update');
    console.log('📍 Users:', users.length);

    // Remove existing heatmap layers
    heatmapLayerRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    heatmapLayerRef.current = [];

    const processUsers = async () => {
      // Calculate user density by location
      const locationDensity: Record<
        string,
        { count: number; coordinates: { lat: number; lng: number } }
      > = {};

      users.forEach((user) => {
        console.log('👤 Processing user:', user.name, 'Location:', user.location);
        const coordinates = getCoordinatesFromLocation(user.location);
        if (coordinates) {
          console.log('📍 User coordinates:', coordinates);

          // Extract city name from location
          const cityMatch = user.location.match(/^([^,]+)/);
          const cityName = cityMatch ? cityMatch[1].trim() : 'Unknown City';

          if (locationDensity[cityName]) {
            locationDensity[cityName].count++;
          } else {
            locationDensity[cityName] = {
              count: 1,
              coordinates,
            };
          }
        } else {
          console.log('❌ Could not get coordinates for user');
        }
      });

      console.log('📊 Location density:', locationDensity);

      // Process each city
      for (const [cityName, { count, coordinates }] of Object.entries(locationDensity)) {
        let cityBoundary = cityBoundaryCache.get(cityName);

        if (!cityBoundary) {
          console.log(`🗺️ Fetching boundary for ${cityName}...`);
          const fetchedBoundary = await fetchCityBoundary(cityName, coordinates);

          if (fetchedBoundary) {
            cityBoundaryCache.set(cityName, fetchedBoundary);
            cityBoundary = fetchedBoundary;
          }
        }

        if (cityBoundary) {
          console.log(`🎨 Creating polygon for city: ${cityName} with ${count} users`);

          // Calculate color based on density
          let fillColor, color, densityLevel;

          if (count >= 5) {
            fillColor = '#ec4899'; // Pink-500
            color = '#be185d'; // Pink-700
            densityLevel = 'Cao';
          } else if (count >= 3) {
            fillColor = '#f472b6'; // Pink-400
            color = '#ec4899'; // Pink-500
            densityLevel = 'Trung bình';
          } else {
            fillColor = '#fce7f3'; // Pink-100
            color = '#f472b6'; // Pink-400
            densityLevel = 'Thấp';
          }

          // Create GeoJSON layer
          const geoJsonLayer = L.geoJSON(cityBoundary.geojson, {
            style: {
              fillColor: fillColor,
              color: color,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6,
            },
          }).addTo(map);

          // Add popup
          geoJsonLayer.bindPopup(`
            <div class="p-2">
              <div class="font-medium text-gray-900">${cityName}</div>
              <div class="font-medium text-gray-900">${count} người dùng</div>
              <div class="text-sm text-gray-600">Mật độ: ${densityLevel}</div>
            </div>
          `);

          heatmapLayerRef.current.push(geoJsonLayer);
          console.log(`✅ Polygon created for ${cityName} with color: ${fillColor}`);
        } else {
          console.log(`❌ Could not create polygon for ${cityName} - no boundary data`);
        }
      }

      console.log('🎯 Total polygons created:', heatmapLayerRef.current.length);
    };

    processUsers();

    // Cleanup function
    return () => {
      heatmapLayerRef.current.forEach((layer) => {
        map.removeLayer(layer);
      });
      heatmapLayerRef.current = [];
    };
  }, [users, map]);

  return null;
};

export default DensityHeatmap;
