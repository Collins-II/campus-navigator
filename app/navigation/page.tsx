'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
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
import { PageHeader } from '@/components/ui/PageHeader';

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
  startsAt?: string;
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
    <main className="min-h-screen bg-slate-50 pb-28 text-slate-900 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="px-4 pt-4 md:px-0 md:pt-0">
          <PageHeader title="Live navigation" />
        </div>

        <div className="grid gap-5 px-3 sm:gap-6 md:px-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4 sm:mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Guided route
                </p>
                <h2 className="mt-1 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
                  {destination || (stopsState === 'loading' ? 'Loading…' : 'Choose a destination')}
                </h2>
              </div>

              <div className="inline-flex w-fit items-center rounded-xl bg-slate-100 p-1">
                {(['walking', 'cycling'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setMode(option)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition ${
                      mode === option ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
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

            <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 sm:rounded-2xl sm:p-2">
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
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:rounded-2xl sm:p-4">
              <button
                onClick={enableTracking ? stopTracking : startTracking}
                className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-95 ${
                  enableTracking
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
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

            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Route progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2.5">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <TimerReset className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Live route
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">Recommended path</h3>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {arrived && (
                  <p className="rounded-xl bg-emerald-700 p-3 text-sm font-semibold text-white">
                    You have arrived at {destination}
                  </p>
                )}
                {approximate && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
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
                    className={`flex w-full gap-3 rounded-xl border p-3 text-left transition ${
                      activeIndex === index ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        activeIndex === index ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
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

          <aside className="min-w-0 space-y-4 sm:space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                    Stops
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">Campus places</h3>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20">
                  Live
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
                {visibleStops.map((stop) => (
                  <Link
                    key={stop.id}
                    href={`/navigation?id=${encodeURIComponent(stop.id)}`}
                    className="group inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md"
                  >
                    <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform group-hover:scale-110">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0">
                      <div className="truncate text-xs font-semibold leading-tight text-slate-900">
                        {stop.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {stop.eta} • {stop.distance}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <MapPin className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                    Arrival
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {destination || '—'}
                  </h3>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm text-slate-600 sm:mb-5 sm:space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">Occupancy: {route.crowd}</span>
                </div>
</div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mb-5 sm:p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Booking sync</span>
                </div>

                {bookingMatch ? (
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700">
                    <div className="font-medium text-gray-900 truncate">{bookingMatch.purpose || 'Campus booking'}</div>
                    <div className="truncate">{bookingRoomLabel}</div>
                    <div className="text-gray-600 text-[11px] sm:text-xs">
                      {bookingMatch.startsAt
                        ? new Date(bookingMatch.startsAt).toLocaleString([], {
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
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 active:scale-95"
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
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-3 sm:px-3">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-xs font-semibold leading-none tabular-nums text-slate-900 sm:text-base">{value}</div>
    </div>
  );
}
