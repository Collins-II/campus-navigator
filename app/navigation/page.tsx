'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  MapPin,
  Navigation,
  Route,
  TimerReset,
  Users,
  Locate,
  Zap,
} from 'lucide-react';
import { useGeolocation, calculateDistance } from '@/lib/useGeolocation';
import { campusLocations, type CampusLocation } from '@/lib/mockData';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-[26px] border border-gray-300 bg-white text-gray-600">
      Loading campus map…
    </div>
  ),
});

/**
 * Navigation stop with all required information for route guidance
 */
type NavigationStop = {
  id: string;
  name: string;
  type: string;
  eta: string;
  distance: string;
  crowd: string;
  steps: string[];
  lat: number;
  lng: number;
  availability?: string;
  capacity?: number;
};

type NavigationBooking = {
  room?: string | { name?: string };
  purpose?: string;
  startTime?: string | Date;
};

/**
 * Convert campus locations to navigation stops
 * Uses mockData as the source of truth for campus locations
 */
const convertLocationsToStops = (locations: CampusLocation[]): NavigationStop[] => {
  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    type: location.tag,
    eta: '5 min', // Will be calculated dynamically
    distance: '0.5 km', // Will be calculated dynamically
    crowd: location.availability === 'Busy' ? 'Busy' : 'Light traffic',
    steps: [
      `Head to ${location.name}`,
      `Check the route on campus map`,
      'Use the nearest accessible corridor',
    ],
    lat: location.lat,
    lng: location.lng,
    availability: location.availability,
    capacity: location.capacity,
  }));
};

/**
 * Mock stops generated from campusLocations when API fails
 */
const mockStopsFromData = convertLocationsToStops(campusLocations);

const routeModeOffsets: Record<'walking' | 'cycling' | 'transit', number> = {
  walking: 1,
  cycling: 0.72,
  transit: 1.18,
};

export default function NavigationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-4 text-gray-900 md:p-8">Loading route planner…</div>
      }
    >
      <NavigationContent />
    </Suspense>
  );
}

function NavigationContent() {
  const searchParams = useSearchParams();
  const destination = searchParams.get('destination') || 'Main Library (Nkoloso)';

  const [mode, setMode] = useState<'walking' | 'cycling' | 'transit'>('walking');
  const [activeStep, setActiveStep] = useState(0);
  const [bookings, setBookings] = useState<NavigationBooking[]>([]);
  const [now, setNow] = useState(new Date());
  const [enableTracking, setEnableTracking] = useState(false);

  // Live location tracking
  const { location: userLocation, error: locationError, loading: locationLoading } = useGeolocation(enableTracking);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await fetch('/api/bookings', { cache: 'no-store' });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch {
        setBookings([]);
      }
    };

    void loadBookings();
  }, []);

  /**
   * Generate live stops from mockData with dynamic calculations
   * Uses campusLocations as the source of truth for campus locations
   */
  const liveStops = useMemo<NavigationStop[]>(() => {
    // Always use mockData as source of truth for locations
    const generated = campusLocations.slice(0, 7).map((location, index) => {
      // Calculate distance based on actual coordinates
      let distanceMeters = 500; // default
      let travelMinutes = 5; // default

      if (userLocation) {
        distanceMeters = calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng);
        const walkingSeconds = distanceMeters / 1.4; // 1.4 m/s average walking speed
        travelMinutes = Math.max(3, Math.round(walkingSeconds / 60));
      } else {
        // Estimate based on index if no user location
        distanceMeters = 300 + (index * 200);
        travelMinutes = Math.max(3, Math.round(distanceMeters / 70)); // ~70m per minute walking
      }

      // Determine crowd based on location availability
      const crowd = location.availability === 'Busy' ? 'Busy' : index % 2 === 0 ? 'Light traffic' : 'Moderate';

      const distanceKm = distanceMeters / 1000;
      const distanceText = distanceKm > 1 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceMeters)}m`;

      return {
        id: location.id,
        name: location.name,
        type: location.tag,
        eta: `${Math.max(3, Math.round(travelMinutes * routeModeOffsets[mode]))} min`,
        distance: distanceText,
        crowd,
        steps: [
          `Navigate to ${location.name}`,
          `Follow the campus route (${location.category} area)`,
          'Use the nearest accessible corridor',
        ],
        lat: location.lat,
        lng: location.lng,
        availability: location.availability,
        capacity: location.capacity,
      };
    });

    return generated.length > 0 ? generated : mockStopsFromData;
  }, [mode, userLocation]);

  /**
   * Calculate the selected route with real coordinates from mockData
   * Provides accurate distance and time calculations
   */
  const route = useMemo(() => {
    // Find the destination in liveStops first
    let selected = liveStops.find((stop) => stop.name === destination) ?? liveStops[0];

    // If still not found, search in mockData
    if (!selected) {
      const mockMatch = campusLocations.find(
        (loc) => loc.name.toLowerCase() === destination.toLowerCase()
      );
      if (mockMatch) {
        selected = {
          id: mockMatch.id,
          name: mockMatch.name,
          type: mockMatch.tag,
          eta: '5 min',
          distance: '0.5 km',
          crowd: mockMatch.availability === 'Busy' ? 'Busy' : 'Light traffic',
          steps: ['Navigate to destination', 'Follow the campus route', 'Use accessible corridor'],
          lat: mockMatch.lat,
          lng: mockMatch.lng,
          availability: mockMatch.availability,
          capacity: mockMatch.capacity,
        };
      }
    }

    // Fallback if still no match
    if (!selected) {
      selected = liveStops[0] || mockStopsFromData[0] || {
        id: 'default',
        name: destination,
        type: 'Campus Location',
        eta: '5 min',
        distance: '0.5 km',
        crowd: 'Light traffic',
        steps: ['Navigate to destination'],
        lat: -15.3925,
        lng: 28.3285,
      };
    }

    // Calculate actual distance from user location if available
    let distanceMeters = Number.parseFloat(selected.distance) * 1000;
    let travelMinutes = Number.parseInt(selected.eta, 10) || 8;

    if (userLocation) {
      distanceMeters = calculateDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng);
      // Estimate walking time: ~1.4 m/s average walking speed
      const walkingSeconds = distanceMeters / 1.4;
      travelMinutes = Math.max(3, Math.round(walkingSeconds / 60));
    }

    const offsetMinutes = Math.max(3, travelMinutes - Math.floor((now.getMinutes() % 12) / 2));
    const timeText = `${Math.max(3, Math.round(offsetMinutes * routeModeOffsets[mode]))} min`;
    const distanceKm = distanceMeters / 1000;
    const distanceText = distanceKm > 1 ? `${distanceKm.toFixed(2)} km` : `${Math.round(distanceMeters)}m`;

    return {
      ...selected,
      time: timeText,
      distance: distanceText,
      crowd: selected.crowd,
      steps:
        selected.steps.length > 0
          ? selected.steps
          : ['Follow the main campus route', 'Use the nearest corridor', 'Arrive at destination'],
      destination,
    };
  }, [destination, liveStops, mode, now, userLocation]);

  const visibleStops = useMemo(
    () => liveStops.filter((stop) => stop.name !== destination),
    [destination, liveStops]
  );

  const bookingMatch = useMemo(() => {
    const normalizedDestination = destination.toLowerCase();
    return bookings.find((booking) => {
      const roomValue = typeof booking.room === 'string' ? booking.room : booking.room?.name ?? '';
      const roomName = roomValue.toLowerCase();
      const purpose = String(booking.purpose || '').toLowerCase();
      return roomName.includes(normalizedDestination) || purpose.includes(normalizedDestination);
    });
  }, [bookings, destination]);

  const bookingRoomLabel = bookingMatch
    ? (typeof bookingMatch.room === 'string' ? bookingMatch.room : bookingMatch.room?.name) || destination
    : destination;

  const safeActiveStep = Math.min(activeStep, Math.max(route.steps.length - 1, 0));
  const progressPercent = Math.max(
    12,
    ((safeActiveStep + 1) / Math.max(route.steps.length, 1)) * 100
  );

  const mapMarkers = useMemo(
    () =>
      liveStops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        available: stop.crowd !== 'Busy',
        tag: stop.type,
      })),
    [liveStops]
  );

  return (
    <main className="min-h-screen bg-white p-3 sm:p-4 md:p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-emerald-600/80">
              Campus navigator
            </p>
            <h1 className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">Live navigation</h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Back home</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg sm:rounded-2xl lg:rounded-[28px] border border-gray-200 bg-white p-4 sm:p-5 shadow-2xl shadow-gray-200/20 backdrop-blur-md">
            <div className="mb-4 sm:mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-cyan-600/80">
                  Guided route
                </p>
                <h2 className="mt-1.5 sm:mt-1 text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                  {destination}
                </h2>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-gray-300 bg-gray-100 p-1">
                {(['walking', 'cycling', 'transit'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setMode(option)}
                    className={`rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium capitalize transition ${
                      mode === option ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
              <MetricCard
                icon={<Route className="h-3.5 w-3.5 sm:h-4 w-4 text-emerald-600" />}
                label="Travel time"
                value={route.time}
              />
              <MetricCard
                icon={<Compass className="h-3.5 w-3.5 sm:h-4 w-4 text-cyan-600" />}
                label="Distance"
                value={route.distance}
              />
              <MetricCard
                icon={<Navigation className="h-3.5 w-3.5 sm:h-4 w-4 text-emerald-300" />}
                label="Crowd"
                value={route.crowd}
              />
            </div>

            <div className="mb-6 overflow-hidden rounded-lg sm:rounded-2xl lg:rounded-[26px] border border-gray-200 bg-white p-2">
              <Map
                destination={{
                  id: route.id ?? destination,
                  name: destination,
                  lat: route.lat,
                  lng: route.lng,
                  tag: route.type,
                }}
                markers={mapMarkers}
                userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy } : undefined}
                showUserLocation={enableTracking && !!userLocation}
              />
            </div>

            {/* Location tracking control */}
            <div className="mb-6 rounded-lg sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
              <button
                onClick={() => setEnableTracking(!enableTracking)}
                className={`w-full flex items-center justify-center gap-2 rounded-lg sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  enableTracking
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300'
                    : 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                }`}
              >
                <Locate className="h-4 w-4 flex-shrink-0" />
                <span>
                  {locationLoading ? 'Getting location...' : enableTracking ? 'Stop tracking' : 'Start live tracking'}
                </span>
              </button>
              {locationError && (
                <p className="mt-2 text-xs text-red-600">{locationError}</p>
              )}
            </div>

            <div className="mb-5 rounded-lg sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-600">
                <span>Route progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-gray-300">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg sm:rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300 flex-shrink-0">
                  <TimerReset className="h-4 w-4 sm:h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                    Live route
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900">Recommended path</h3>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {route.steps.map((step, index) => (
                  <button
                    key={`${step}-${index}`}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`flex w-full gap-3 rounded-lg sm:rounded-2xl border p-2.5 sm:p-3 text-left transition ${
                      safeActiveStep === index
                        ? 'border-emerald-300 bg-emerald-50 shadow-lg shadow-emerald-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 sm:h-7 w-7 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ${
                        safeActiveStep === index
                          ? 'bg-emerald-600 text-white ring-1 ring-emerald-300/50'
                          : 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">{step}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 sm:space-y-6">
            <div className="rounded-lg sm:rounded-2xl lg:rounded-[28px] border border-gray-200 bg-white p-4 sm:p-5 shadow-2xl shadow-gray-200/20 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-emerald-600/80">
                    Stops
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">Along the way</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/20 flex-shrink-0">
                  Live
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
                {visibleStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50 transition-all cursor-default"
                  >
                    <div className="flex-shrink-0 inline-flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                      <MapPin className="h-3 w-3 sm:h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0">
                      <div className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate">
                        {stop.name}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-600 truncate">
                        {stop.eta} • {stop.distance}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg sm:rounded-2xl lg:rounded-[28px] border border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 sm:p-5 shadow-2xl shadow-emerald-200/10 backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 sm:h-11 w-9 sm:w-11 items-center justify-center rounded-lg sm:rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300 flex-shrink-0">
                  <MapPin className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
                    Arrival
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {destination}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5">
                <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-2xl border border-emerald-300 bg-emerald-50 p-2.5 sm:p-3">
                  <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">Occupancy: {route.crowd}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-2xl border border-cyan-300 bg-cyan-50 p-2.5 sm:p-3">
                  <Compass className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                  <span>Direction lock: Active</span>
                </div>
              </div>

              <div className="rounded-lg sm:rounded-2xl border border-gray-300 bg-gray-50 p-3 sm:p-4 mb-4 sm:mb-5">
                <div className="mb-2 flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Booking sync</span>
                </div>

                {bookingMatch ? (
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700">
                    <div className="font-medium text-gray-900 truncate">{bookingMatch.purpose || 'Campus booking'}</div>
                    <div className="truncate">{bookingRoomLabel}</div>
                    <div className="text-gray-600 text-[11px] sm:text-xs">
                      {bookingMatch.startTime
                        ? new Date(bookingMatch.startTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Today, 09:00 AM'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-600">No matching booking found for this destination yet.</div>
                )}
              </div>

              <Link
                href="/bookings"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-2xl bg-emerald-600 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
              >
                <Zap className="h-4 w-4" />
                Book this destination
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex items-center gap-2 sm:gap-2.5 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-white transition-all cursor-default">
      <div className="flex-shrink-0 inline-flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{value}</div>
        <div className="text-[10px] sm:text-[11px] text-gray-600 truncate">{label}</div>
      </div>
    </div>
  );
}
