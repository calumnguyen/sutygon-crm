# User Density Map Component

## Overview

The UserDensityMap component provides a real-time 2D map visualization of online users with density heatmap functionality. It integrates seamlessly with the existing Pusher real-time system and uses the same data source as the OnlineUsersSection.

## Features

### 🗺️ Interactive Map

- **White base map** with clean, minimal design
- **Pink gradient heatmap** showing user density by location
- **Custom markers** for individual users (blue for regular users, yellow for admins)
- **Real-time updates** as users join/leave the system

### 📱 Mobile Optimized

- Touch-friendly controls
- Responsive design
- Optimized for mobile devices
- Fast loading with efficient data handling

### 🎯 Smart Location Detection

- Comprehensive Vietnamese cities database
- Automatic coordinate mapping
- Fallback to Ho Chi Minh City for unknown locations
- Support for coordinate strings in location data

## Components

### UserDensityMap.tsx

Main map component that:

- Receives `onlineUsers` and `isConnected` props
- Renders the Leaflet map with custom styling
- Handles user markers and heatmap visualization
- Provides mobile-optimized interactions

### DensityHeatmap.tsx

Heatmap component that:

- Calculates user density by location
- Creates pink gradient circles based on user count
- Updates in real-time as users change
- Provides density information in popups

### UserDensityMap.css

Styling for:

- Custom marker icons
- Mobile responsiveness
- Map controls and popups
- Dark mode support

## Integration

### Data Flow

```
Pusher Real-time Data → useOnlineUsers Hook → OnlineUsersSection → UserDensityMap
```

### Usage in OnlineUsersSection

The map is integrated as a toggle view in the OnlineUsersSection:

```tsx
// Toggle between list and map view
const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

// Conditional rendering
{viewMode === 'map' ? (
  <UserDensityMap
    onlineUsers={stableOnlineUsers}
    isConnected={stableIsConnected}
  />
) : (
  // List view
)}
```

## Location Data

### Vietnamese Cities Database

The component includes coordinates for major Vietnamese cities:

- Ho Chi Minh City, Hanoi, Da Nang
- Hai Phong, Can Tho, Bien Hoa
- Hue, Nha Trang, Vung Tau
- And many more...

### Location Matching

The component matches user locations using:

1. **Exact city name matching** (case-insensitive)
2. **Coordinate extraction** from location strings
3. **Fallback to Ho Chi Minh City** for unknown locations

## Performance Optimizations

### Efficient Rendering

- React.memo for component optimization
- useMemo for expensive calculations
- Debounced map updates
- Efficient marker management

### Mobile Performance

- Responsive map heights
- Touch-optimized controls
- Reduced animations on mobile
- Efficient data caching

## Dependencies

### Required Libraries

- `leaflet` (1.9.4) - Map rendering
- `react-leaflet` (5.0.0) - React integration
- `lucide-react` - Icons

### CSS Requirements

- `leaflet/dist/leaflet.css` - Leaflet base styles
- `UserDensityMap.css` - Custom component styles

## Future Enhancements

### Planned Features

- [ ] Advanced heatmap with interpolation
- [ ] User clustering for high-density areas
- [ ] Custom map themes
- [ ] Export map data
- [ ] Historical density tracking

### Potential Improvements

- [ ] WebGL heatmap for better performance
- [ ] Real-time coordinate updates
- [ ] Custom marker animations
- [ ] Integration with weather data
- [ ] Advanced filtering options

## Troubleshooting

### Common Issues

1. **Map not loading**: Check if Leaflet CSS is imported
2. **Markers not showing**: Verify location data format
3. **Mobile issues**: Ensure touch events are enabled
4. **Performance**: Check for excessive re-renders

### Debug Tips

- Check browser console for Leaflet errors
- Verify coordinate data in location strings
- Test with different user counts
- Monitor memory usage on mobile devices
