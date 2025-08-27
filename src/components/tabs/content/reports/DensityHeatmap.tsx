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
  // Try to extract coordinates from location string first (e.g., "Garden Grove, United States (33.7739, -117.9414)")
  const coordMatch = location.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);

    // Validate coordinates are reasonable
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      console.log(`📍 Extracted coordinates from location: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  // Enhanced international cities with more US cities
  const internationalCities: Record<string, { lat: number; lng: number }> = {
    // Major US Cities
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'New York': { lat: 40.7128, lng: -74.006 },
    Chicago: { lat: 41.8781, lng: -87.6298 },
    Houston: { lat: 29.7604, lng: -95.3698 },
    Phoenix: { lat: 33.4484, lng: -112.074 },
    Philadelphia: { lat: 39.9526, lng: -75.1652 },
    'San Antonio': { lat: 29.4241, lng: -98.4936 },
    'San Diego': { lat: 32.7157, lng: -117.1611 },
    Dallas: { lat: 32.7767, lng: -96.797 },
    'San Jose': { lat: 37.3382, lng: -121.8863 },

    // Orange County Cities (where Garden Grove is)
    'Garden Grove': { lat: 33.7739, lng: -117.9414 },
    Anaheim: { lat: 33.8366, lng: -117.9143 },
    'Santa Ana': { lat: 33.7455, lng: -117.8677 },
    Irvine: { lat: 33.6846, lng: -117.8265 },
    'Huntington Beach': { lat: 33.6603, lng: -118.0098 },
    Fullerton: { lat: 33.8704, lng: -117.9242 },
    'Costa Mesa': { lat: 33.6411, lng: -117.9186 },
    Westminster: { lat: 33.7592, lng: -118.0067 },
    Orange: { lat: 33.7879, lng: -117.8531 },
    'Fountain Valley': { lat: 33.7092, lng: -117.9537 },
    'Newport Beach': { lat: 33.6189, lng: -117.9289 },
    'Seal Beach': { lat: 33.7414, lng: -118.1048 },

    // International Cities
    London: { lat: 51.5074, lng: -0.1278 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Sydney: { lat: -33.8688, lng: 151.2093 },
    Singapore: { lat: 1.3521, lng: 103.8198 },
    Bangkok: { lat: 13.7563, lng: 100.5018 },
    Manila: { lat: 14.5995, lng: 120.9842 },
    Jakarta: { lat: -6.2088, lng: 106.8456 },
    'Kuala Lumpur': { lat: 3.139, lng: 101.6869 },
  };

  // Extract city name from location string (before the comma)
  const cityMatch = location.match(/^([^,]+)/);
  if (cityMatch) {
    const cityName = cityMatch[1].trim();
    console.log(`🏙️ Extracted city name: "${cityName}" from location: "${location}"`);

    // Check for exact match first
    if (internationalCities[cityName]) {
      console.log(`✅ Found exact city match: ${cityName}`);
      return internationalCities[cityName];
    }

    // Check for partial matches
    for (const [knownCity, coords] of Object.entries(internationalCities)) {
      if (
        cityName.toLowerCase().includes(knownCity.toLowerCase()) ||
        knownCity.toLowerCase().includes(cityName.toLowerCase())
      ) {
        console.log(`✅ Found partial city match: ${cityName} -> ${knownCity}`);
        return coords;
      }
    }
  }

  console.log(`❌ No coordinates found for location: "${location}"`);
  return null;
};

// Function to fetch city boundary from Nominatim API
const fetchCityBoundary = async (
  cityName: string,
  coordinates: { lat: number; lng: number }
): Promise<CityBoundary | null> => {
  try {
    console.log(
      `🗺️ Fetching boundary for: ${cityName} at coordinates: ${coordinates.lat}, ${coordinates.lng}`
    );

    // First try to get the boundary using coordinates (more accurate)
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.lat}&lon=${coordinates.lng}&format=json&polygon_geojson=1&addressdetails=1&zoom=10`;

    const reverseResponse = await fetch(reverseUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SutygonCRM/1.0',
      },
    });

    if (reverseResponse.ok) {
      const reverseData = await reverseResponse.json();
      console.log(`📍 Reverse geocoding result:`, reverseData);

      if (reverseData.geojson) {
        // Get the actual city name from the reverse geocoding result
        const actualCityName =
          reverseData.address?.city ||
          reverseData.address?.town ||
          reverseData.address?.county ||
          cityName;

        console.log(`✅ Found boundary using coordinates for: ${actualCityName}`);
        return {
          name: actualCityName,
          geojson: reverseData.geojson,
          coordinates: coordinates,
        };
      }
    }

    // Fallback: try to get the boundary using the city name
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
        console.log(`✅ Found boundary for ${cityName} using city name search`);
        return {
          name: cityName,
          geojson: place.geojson,
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

          // Use city name as key for density calculation
          const densityKey = cityName;

          if (locationDensity[densityKey]) {
            locationDensity[densityKey].count++;
            console.log(
              `📊 Updated density for ${densityKey}: ${locationDensity[densityKey].count} users`
            );
          } else {
            locationDensity[densityKey] = {
              count: 1,
              coordinates,
            };
            console.log(`📊 New density entry for ${densityKey}: 1 user`);
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
