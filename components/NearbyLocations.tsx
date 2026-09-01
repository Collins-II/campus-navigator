'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navigation, MapPin, Clock, AlertCircle } from 'lucide-react';
import { calculateDistance, findNearestLocations, UserLocation } from '@/lib/useGeolocation';
import type { CampusLocation } from '@/lib/mockData';

type NearbyLocationsProps = {
  userLocation: UserLocation | null;
  locations: CampusLocation[];
  isLoading?: boolean;
  error?: string | null;
  maxResults?: number;
  onSelectLocation?: (location: CampusLocation) => void;
};

type NearbyLocation = CampusLocation & {
  distance: number;
  bearing: number;
  distanceText: string;
};

function getDirectionName(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

export function NearbyLocations({
  userLocation,
  locations,
  isLoading = false,
  error = null,
  maxResults = 5,
  onSelectLocation,
}: NearbyLocationsProps) {
  const [nearbyList, setNearbyList] = useState<NearbyLocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(locations.map((loc) => loc.category)));
  }, [locations]);

  useEffect(() => {
    if (!userLocation) return;

    const filtered = selectedCategory
      ? locations.filter((loc) => loc.category === selectedCategory)
      : locations;

    const nearby = findNearestLocations(userLocation.lat, userLocation.lng, filtered, maxResults).map(
      (loc) => ({
        ...loc,
        distanceText: formatDistance(loc.distance),
      })
    );

    setNearbyList(nearby);
  }, [userLocation, locations, selectedCategory, maxResults]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Location Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !userLocation) {
    return (
      <div className="rounded-2xl border border-gray-300 bg-gray-50 p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
          <p className="text-sm text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">Filter by category</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedCategory === null
                ? 'bg-emerald-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === category
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Locations List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
          Nearby Locations ({nearbyList.length})
        </p>

        {nearbyList.length === 0 ? (
          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">No locations found in this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyList.map((location) => (
              <button
                key={location.id}
                onClick={() => onSelectLocation?.(location)}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white p-3.5 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{location.name}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">{location.tag}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-semibold text-emerald-600 text-sm">{location.distanceText}</div>
                    <div className="text-xs text-gray-500">{getDirectionName(location.bearing)}</div>
                  </div>
                </div>

                {/* Status & Info */}
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
                      location.availability === 'Open'
                        ? 'bg-emerald-100 text-emerald-700'
                        : location.availability === 'Busy'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {location.availability}
                  </span>
                  {location.openingHours && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-3 w-3" />
                      {location.openingHours}
                    </span>
                  )}
                </div>

                {/* Description */}
                {location.description && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-2">{location.description}</p>
                )}

                {/* Capacity */}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="h-3 w-3" />
                  Capacity: {location.capacity}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Help */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-start gap-2">
          <Navigation className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-700">
            <p className="font-semibold">Navigation Tip</p>
            <p className="mt-1">
              Select a location to start navigation. Your live location will update as you move across campus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
