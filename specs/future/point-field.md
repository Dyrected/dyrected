# Point Field (Geolocation)

A field for storing geographical coordinates (longitude and latitude).

## Overview

The `point` field is used for location-aware content, such as physical store locations, event venues, or map markers.

## Configuration

```ts
{
  name: 'location',
  type: 'point',
  label: 'Coordinates',
  admin: {
    display: 'map', // 'map' | 'inputs'
  }
}
```

## Technical Implementation

### 1. Database Storage
Stored as an array of numbers: `[longitude, latitude]`. 
- **Note**: Most databases (PostgreSQL/MySQL) have native "Point" types that can be used for spatial queries in the future.

### 2. Admin UI Component
An `LocationPicker` component will be added to `packages/admin`.

- **Map View**: Integrates with a map provider (e.g., Leaflet, MapLibre, or Google Maps) to allow users to drop a pin.
- **Direct Input**: Provides manual input fields for Latitude and Longitude for precision.
- **Search**: Integration with a Geocoding API to find coordinates via an address.

### 3. API Response
The SDK returns the coordinates as an array.

```json
{
  "location": [-0.1276, 51.5072]
}
```

## Benefits
- Standardized format for geospatial data.
- Visual, user-friendly way to select locations.
- Foundation for "Find near me" search features.
