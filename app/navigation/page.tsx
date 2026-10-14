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
import { calculateDistance } from '@/lib/useGeolocation';
import { useUserLocation } from '@/lib/LocationContext';
import type { CampusRouteInfo } from '@/components/Map';
import { haversine, pathProgress, stepOffsets, formatMeters } from '@/lib/routing';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600">
      Loading campus map…
    </div>
  ),
});

type NavigationStop = {
  id: string;
  name: string;
  type: string;
  crowd: string;
  lat: number;
  lng: number;
};

type ApiLocation = {
  _id?: string;
  id?: string;
  name: string;
  building?: string;
  category?: string;
  isAvailable?: boolean;
  latitude?: number;
  longitude?: number;
  location?: { coordinates?: [number, number] };
};

type NavigationBooking = {
  room?: string | { name?: string };
  purpose?: string;
  startTime?: string | Date;
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
  const destinationId = searchParams.get('id');
  const destinationName = searchParams.get('destination');

  const [mode, setMode] = useState<'walking' | 'cycling'>('walking');
  const [bookings, setBookings] = useState<NavigationBooking[]>([]);
  const [stops, setStops] = useState<NavigationStop[]>([]);
  const [stopsState, setStopsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [routeInfo, setRouteInfo] = useState<CampusRouteInfo | null>(null);

  const {
    location: userLocation,
    error: locationError,
    loading: locationLoading,
    tracking: enableTracking,
    startTracking,
    stopTracking,
  } = useUserLocation();

  useEffect(() => {
    const controller = new AbortController();
    const loadStops = async () => {
      try {
        const res = await fetch('/api/locations', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load locations');
        const json = await res.json();
        const raw: ApiLocation[] = json.data || json.locations || [];
        setStops(
          (Array.isArray(raw) ? raw : []).flatMap((item, index) => {
            const lat = item.latitude ?? item.location?.coordinates?.[1];
            const lng = item.longitude ?? item.location?.coordinates?.[0];
            if (typeof lat !== 'number' || typeof lng !== 'number') return [];
            return [{
              id: item._id || item.id || `loc-${index}`,
              name: item.name,
              type: item.category || item.building || 'Campus',
              crowd: item.isAvailable === false ? 'Busy' : 'Available',
              lat,
              lng,
            }];
          })
        );
        setStopsState('ready');
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setStopsState('error');
      }
    };
    void loadStops();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await fetch('/api/bookings', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch {
        setBookings([]);
      }
    };
    void loadBookings();
  }, []);

  const selected = useMemo(
    () =>
      stops.find((stop) => destinationId && stop.id === destinationId) ??
      stops.find((stop) => destinationName && stop.name === destinationName) ??
      null,
    [stops, destinationId, destinationName]
  );

  const destination = selected?.name ?? '';
  const speed = mode === 'cycling' ? 4.2 : 1.4;

  const liveStops = useMemo(
    () =>
      stops.map((stop) => {
        if (!userLocation) return { ...stop, eta: '—', distance: 'Location off' };
        const meters = calculateDistance(userLocation.lat, userLocation.lng, stop.lat, stop.lng);
        return {
          ...stop,
          eta: `${Math.max(1, Math.round(meters / speed / 60))} min`,
          distance: formatMeters(meters),
        };
      }),
    [stops, userLocation, speed]
  );

  // Position on the route (null until we have a GPS fix and a road route).
  const progress = useMemo(
    () =>
      userLocation && routeInfo && routeInfo.source === 'road'
        ? pathProgress(routeInfo.coordinates, [userLocation.lat, userLocation.lng])
        : null,
    [userLocation, routeInfo]
  );

  const directDistance =
    userLocation && selected ? haversine([userLocation.lat, userLocation.lng], [selected.lat, selected.lng]) : null;
  const arrived = directDistance !== null && directDistance <= 25;
  const approximate = routeInfo?.source === 'straight';

  // Remaining distance follows the user along the path; time is an estimate at a typical pace.
  const remainingMeters = arrived
    ? 0
    : progress
      ? progress.remaining + progress.offPath
      : routeInfo
        ? routeInfo.distance
        : directDistance;

  const steps = routeInfo?.source === 'road' ? routeInfo.steps : [];
  const offsets = useMemo(
    () => (routeInfo && steps.length ? stepOffsets(routeInfo.coordinates, steps) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeInfo]
  );
  let activeIndex = 0;
  if (progress) offsets.forEach((offset, i) => { if (offset <= progress.alongPath + 15) activeIndex = i; });
  if (arrived && steps.length) activeIndex = steps.length - 1;
  const nextManeuverIn =
    progress && activeIndex + 1 < offsets.length ? Math.max(0, offsets[activeIndex + 1] - progress.alongPath) : null;

  const route = {
    time: remainingMeters !== null && userLocation && selected ? `${Math.max(1, Math.round(remainingMeters / speed / 60))} min (est.)` : '—',
    distance:
      remainingMeters !== null && userLocation && selected
        ? `${approximate ? '≈ ' : ''}${formatMeters(remainingMeters)}`
        : userLocation ? '—' : 'Turn on location',
    crowd: selected?.crowd ?? '—',
  };
  const visibleStops = useMemo(
    () => liveStops.filter((stop) => stop.id !== selected?.id),
    [liveStops, selected?.id]
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

  const totalMeters = routeInfo?.distance ?? directDistance ?? 0;
  const progressPercent = arrived
    ? 100
    : totalMeters > 0 && remainingMeters !== null
      ? Math.max(4, Math.min(100, ((totalMeters - remainingMeters) / totalMeters) * 100))
      : 0;
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
    <main className="min-h-screen bg-white pb-28 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-4 border-b-[3px] border-[#008236] bg-black px-4 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] text-white md:rounded-md">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#4ade80]">
              Campus navigator
            </p>
            <h1 className="mt-1 text-3xl font-black uppercase leading-none tracking-tight">Live navigation</h1>
          </div>
          <Link
            href="/"
            aria-label="Back home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white transition hover:bg-white hover:text-black active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid gap-4 px-3 sm:gap-6 md:px-0 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-md border-2 border-black bg-white p-4 sm:p-5">
            <div className="mb-4 sm:mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-cyan-600/80">
                  Guided route
                </p>
                <h2 className="mt-1.5 sm:mt-1 text-lg sm:text-2xl font-semibold text-gray-900 break-words">
                  {destination || (stopsState === 'loading' ? 'Loading…' : 'Choose a destination')}
                </h2>
              </div>

              <div className="flex items-center border-2 border-black">
                {(['walking', 'cycling'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setMode(option)}
                    className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest transition ${
                      mode === option ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
              <MetricCard
                icon={<Route className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />}
                label="Time left"
                value={route.time}
              />
              <MetricCard
                icon={<Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600" />}
                label="Distance"
                value={route.distance}
              />
              <MetricCard
                icon={<Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700" />}
                label="Crowd"
                value={route.crowd}
              />
            </div>

            <div className="mb-6 overflow-hidden rounded-lg sm:rounded-2xl lg:rounded-[26px] border border-gray-200 bg-white p-0 md:p-2">
              <Map
                destination={selected ? { id: selected.id, name: selected.name, lat: selected.lat, lng: selected.lng, tag: selected.type } : undefined}
                markers={mapMarkers}
                userLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy } : undefined}
                showUserLocation={enableTracking && !!userLocation}
                onRoute={setRouteInfo}
                profile={mode === 'cycling' ? 'bike' : 'foot'}
              />
            </div>

            {/* Location tracking control */}
            <div className="mb-6 rounded-lg sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
              <button
                onClick={enableTracking ? stopTracking : startTracking}
                className={`w-full flex min-h-[52px] items-center justify-center gap-2 rounded px-4 text-xs font-black uppercase tracking-widest transition active:scale-95 ${
                  enableTracking
                    ? 'bg-black text-white'
                    : 'bg-[#008236] text-white hover:bg-[#016630]'
                }`}
              >
                <Locate className="h-4 w-4 flex-shrink-0" />
                <span>
                  {locationLoading ? 'Getting location...' : enableTracking ? 'Stop tracking' : 'Use my location'}
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
                  <TimerReset className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                    Live route
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900">Recommended path</h3>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {arrived && (
                  <p className="rounded bg-[#008236] p-3 text-sm font-black uppercase tracking-wide text-white">
                    You have arrived at {destination}
                  </p>
                )}
                {approximate && (
                  <p className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                    Walking directions are unavailable right now. The dotted line is an approximate straight-line
                    path and may cross buildings or fences. Retrying automatically.
                  </p>
                )}
                {steps.length === 0 && !approximate && (
                  <p className="p-3 text-sm text-gray-600">
                    {selected
                      ? userLocation
                        ? 'Finding the best path…'
                        : 'Turn on your location to get a live route to this destination.'
                      : stopsState === 'error'
                        ? 'Campus places could not be loaded. Please try again.'
                        : 'Pick a destination from the home map or the list to start navigating.'}
                  </p>
                )}
                {steps.map((step, index) => (
                  <div
                    key={`${step.instruction}-${index}`}
                    className={`flex w-full gap-3 border-b-2 p-3 text-left transition ${
                      activeIndex === index ? 'border-[#008236] bg-gray-100' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center text-lg font-black flex-shrink-0 ${
                        activeIndex === index ? 'text-[#008236]' : 'text-gray-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">{step.instruction}</p>
                      <p className="text-[11px] text-gray-500">
                        {activeIndex === index && nextManeuverIn !== null
                          ? `Next turn in ${formatMeters(nextManeuverIn)}`
                          : step.distance > 0
                            ? formatMeters(step.distance)
                            : ''}
                      </p>
                    </div>
                  </div>
                ))}              </div>
            </div>
          </section>

          <aside className="space-y-4 sm:space-y-6">
            <div className="rounded-lg sm:rounded-2xl lg:rounded-md border border-gray-200 bg-white p-4 sm:p-5 shadow-2xl shadow-gray-200/20 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-emerald-600/80">
                    Stops
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">Campus places</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 flex-shrink-0">
                  Live
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
                {visibleStops.map((stop) => (
                  <Link
                    key={stop.id}
                    href={`/navigation?id=${encodeURIComponent(stop.id)}`}
                    className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-gray-200 bg-gradient-to-r from-white to-gray-50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  >
                    <div className="flex-shrink-0 inline-flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0">
                      <div className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate">
                        {stop.name}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-600 truncate">
                        {stop.eta} • {stop.distance}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg sm:rounded-2xl lg:rounded-md border border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 sm:p-5 shadow-2xl shadow-emerald-200/10 backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 sm:h-11 w-9 sm:w-11 items-center justify-center rounded-lg sm:rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300 flex-shrink-0">
                  <MapPin className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
                    Arrival
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {destination || '—'}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5">
                <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-2xl border border-emerald-300 bg-emerald-50 p-2.5 sm:p-3">
                  <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">Occupancy: {route.crowd}</span>
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
                        : ''}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-600">No matching booking found for this destination yet.</div>
                )}
              </div>

              <Link
                href="/bookings"
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded bg-black px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#008236] active:scale-95"
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
    <div className="flex min-w-[30%] flex-1 flex-col border-2 border-black bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-600">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-[10px] font-black leading-none tabular-nums text-[#008236]">{value}</div>
    </div>
  );
}
