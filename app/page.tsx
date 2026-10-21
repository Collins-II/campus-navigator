'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Clock,
  Footprints,
  Locate,
  MapPin,
  Navigation,
  RotateCw,
  Search,
  X,
} from 'lucide-react';

import { CampusNavbar } from '@/components/ui/CampusNavbar';
import { calculateDistance } from '@/lib/useGeolocation';
import { useUserLocation } from '@/lib/LocationContext';
import type { CampusRouteInfo } from '@/components/Map';
import { BookingAccessNotice } from '@/components/bookings/BookingAccessNotice';
import type { BookingAccess } from '@/lib/booking-policy';

const CampusMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

type CampusLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
};

type RoomRecord = { id: string; isAvailable?: boolean };

type DashboardBooking = {
  id: string;
  purpose: string;
  room: string;
  roomCode: string;
  date: string;
  startTime: string;
};

type ApiLocation = {
  _id?: string;
  id?: string;
  name: string;
  building?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  location?: { coordinates?: [number, number] };
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;

const walkMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export default function Home() {
  const { data: session, status } = useSession();
  const { location: userLocation, tracking, loading: locating, error: locationError, startTracking } = useUserLocation();

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [locationsState, setLocationsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [roomsUnavailable, setRoomsUnavailable] = useState(false);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [homeDataError, setHomeDataError] = useState('');
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);
  const [snap, setSnap] = useState<'peek' | 'half' | 'full'>('half');
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetTouchY = useRef<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<CampusRouteInfo | null>(null);

  const isAuthenticated = status === 'authenticated';
  const firstName = (session?.user?.name || 'Student').split(' ')[0];

  useEffect(() => {
    const controller = new AbortController();

    const fetchLocations = async () => {
      setLocationsState('loading');
      try {
        const res = await fetch('/api/locations', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load locations');

        const json = await res.json();
        const raw: ApiLocation[] = json.data || json.locations || [];

        const mapped: CampusLocation[] = (Array.isArray(raw) ? raw : []).flatMap((item, index) => {
          const lat = item.latitude ?? item.location?.coordinates?.[1];
          const lng = item.longitude ?? item.location?.coordinates?.[0];
          if (typeof lat !== 'number' || typeof lng !== 'number') return [];
          return [{
            id: item._id || item.id || `loc-${index}`,
            name: item.name,
            lat,
            lng,
            tag: item.category || item.building || 'Campus',
          }];
        });
        setLocations(mapped);
        setSelectedId((cur) => (cur && mapped.some((m) => m.id === cur) ? cur : null));
        setLocationsState('ready');
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setLocationsState('error');
        }
      }
    };
    void fetchLocations();
    return () => controller.abort();
  }, [reloadKey]);

  const loadHomeData = useCallback(
    async (signal?: AbortSignal) => {
      const todayKey = getLocalDateKey(new Date());
      const roomsTask = async () => {
        try {
          const response = await fetch(`/api/rooms?date=${todayKey}&start=09:00&end=17:00`, { signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Room availability could not be loaded.');
          setRooms(Array.isArray(data.rooms) ? data.rooms : []);
          setRoomsUnavailable(false);
          return '';
        } catch {
          if (signal?.aborted) return '';
          setRooms([]);
          setRoomsUnavailable(true);
          return 'Room availability is temporarily unavailable.';
        }
      };

      const bookingsTask = async () => {
        if (!isAuthenticated) {
          setBookings([]);
          setBookingAccess(null);
          return '';
        }
        try {
          const response = await fetch('/api/dashboard/overview', { signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Your bookings could not be loaded.');
          setBookingAccess(data.bookingAccess ?? null);
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
          return '';
        } catch (error) {
          if (signal?.aborted) return '';
          setBookings([]);
          setBookingAccess(null);
          return error instanceof Error ? error.message : 'Your booking summary is temporarily unavailable.';
        }
      };

      const errors = await Promise.all([roomsTask(), bookingsTask()]);
      if (!signal?.aborted) setHomeDataError(errors.filter(Boolean).join(' '));
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (status === 'loading') return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHomeData(controller.signal);

    const onVisible = () => {
      if (!document.hidden) void loadHomeData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, loadHomeData]);
  const selected = locations.find((l) => l.id === selectedId) ?? locations[0] ?? null;

  const withDistance = useMemo(
    () =>
      locations.map((loc) => ({
        ...loc,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
          : null,
      })),
    [locations, userLocation]
  );

  const deferredQuery = useDeferredValue(searchQuery);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(locations.map((l) => l.tag)))],
    [locations]
  );

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return withDistance
      .filter((l) => category === 'All' || l.tag === category)
      .filter((l) => !q || `${l.name} ${l.tag}`.toLowerCase().includes(q))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name));
  }, [withDistance, deferredQuery, category]);

  const freeRooms = rooms.filter((r) => r.isAvailable !== false).length;
  const todayKey = getLocalDateKey(new Date());
  const nextBooking = bookings
    .filter((b) => b.date >= todayKey)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];

  const select = (id: string) => {
    setSelectedId(id);
    setSnap((s) => (s === 'full' ? 'half' : s));
  };

  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-loc-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, snap]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-gray-100 text-gray-900">
      <CampusMap
        className="absolute inset-0 h-full"
        destination={selected ?? undefined}
        markers={locations.map((l) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng, tag: l.tag }))}
        onSelect={select}
        onRoute={setRouteInfo}
        userLocation={userLocation ?? undefined}
      />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-4 md:p-6">
        <CampusNavbar />
      </header>

      {/* Bottom sheet (mobile) / side panel (desktop) */}
      <section
        aria-label="Campus places"
        className={`absolute inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[999] flex flex-col overflow-hidden rounded-t-2xl border-t-4 border-[#008236] bg-white shadow-[0_-12px_40px_rgba(5,46,22,0.25)] transition-[height] duration-300 ease-out xl:inset-x-auto xl:bottom-6 xl:left-6 xl:top-24 xl:h-auto xl:w-[420px] xl:rounded-md xl:shadow-2xl ${
          snap === 'peek'
            ? 'h-auto'
            : snap === 'half'
              ? 'h-[min(52dvh,calc(100dvh-170px-env(safe-area-inset-bottom)))]'
              : 'h-[calc(100dvh-156px-env(safe-area-inset-bottom))]'
        }`}
      >
        <div
          className="shrink-0 xl:hidden"
          onTouchStart={(e) => {
            sheetTouchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (sheetTouchY.current === null) return;
            const dy = e.changedTouches[0].clientY - sheetTouchY.current;
            sheetTouchY.current = null;
            if (dy < -40) setSnap((s) => (s === 'peek' ? 'half' : 'full'));
            else if (dy > 40) setSnap((s) => (s === 'full' ? 'half' : 'peek'));
          }}
        >
          <button
            type="button"
            aria-label={snap === 'full' ? 'Collapse panel' : 'Expand panel'}
            aria-expanded={snap !== 'peek'}
            onClick={() => setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))}
            className="flex h-8 w-full touch-none items-center justify-center"
          >
            <span className="h-1.5 w-12 rounded-full bg-gray-300" />
          </button>
        </div>

        <div className="shrink-0 px-4 pb-2 pt-0 xl:px-5 xl:pt-5">
          <div className={snap === 'peek' ? 'hidden xl:block' : ''}>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#008236]">
              {locationsState === 'ready' ? `${results.length} places` : 'Campus'} · {roomsUnavailable ? 'Room availability unavailable' : `${freeRooms} rooms free`}
            </p>
            <h1 className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
              {isAuthenticated ? `Hi ${firstName}, where to?` : 'Where to on campus?'}
            </h1>
          </div>

          <div className="mt-2 flex items-center gap-3 rounded border-2 border-black bg-white px-3 focus-within:ring-2 focus-within:ring-[#008236]">
            <Search className="h-5 w-5 shrink-0 text-gray-500" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Search campus places"
              value={searchQuery}
              onFocus={() => setSnap((s) => (s === 'peek' ? 'half' : s))}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buildings, labs, halls"
              className="h-11 w-full bg-transparent text-base font-medium outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="flex h-8 w-8 shrink-0 items-center justify-center"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          {bookingAccess?.allowed === false && (
            <div className="mt-2"><BookingAccessNotice access={bookingAccess} /></div>
          )}
          {homeDataError ? (
            <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-amber-900">{homeDataError}</p>
              <button
                type="button"
                onClick={() => void loadHomeData()}
                className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          ) : null}

          {categories.length > 1 && (
            <div className={`-mx-4 mt-2 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] xl:-mx-5 xl:px-5 ${snap === 'peek' ? 'hidden xl:flex' : 'flex'}`}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`h-9 shrink-0 rounded-full border-[1.5px] border-black px-4 text-xs font-extrabold uppercase tracking-wide transition ${
                    category === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          ref={listRef}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-gray-100 px-2 [-webkit-overflow-scrolling:touch] ${snap === 'peek' ? 'hidden xl:block' : ''}`}
        >
          {locationsState === 'loading' ? (
            <ul aria-busy="true" className="space-y-1 p-2">
              {[0, 1, 2, 3].map((n) => (
                <li key={n} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </ul>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              <p>
                {locationsState === 'error'
                  ? 'Campus places could not be loaded. Check your connection and try again.'
                  : locations.length === 0
                    ? 'No campus places have been published yet.'
                    : 'No places match your search.'}
              </p>
              {locationsState === 'error' ? (
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded border-2 border-black px-4 text-xs font-black uppercase tracking-widest"
                >
                  <RotateCw className="h-4 w-4" /> Retry
                </button>
              ) : searchQuery || category !== 'All' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategory('All');
                  }}
                  className="mt-3 inline-flex h-11 items-center rounded border-2 border-black px-4 text-xs font-black uppercase tracking-widest"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <ul>
              {results.map((loc, i) => (
                <li key={loc.id} data-loc-id={loc.id} className="border-b border-gray-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => select(loc.id)}
                    aria-current={loc.id === selected?.id}
                    className={`flex min-h-[60px] w-full items-center gap-3 px-2 py-2.5 text-left transition active:bg-gray-100 ${
                      loc.id === selected?.id ? 'bg-green-50 shadow-[inset_4px_0_0_0_#008236]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-7 shrink-0 text-center text-xl font-black tabular-nums text-gray-300">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold uppercase tracking-tight">{loc.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs font-semibold text-gray-500">
                        <MapPin className="h-3 w-3 shrink-0" /> {loc.tag}
                      </span>
                    </span>
                    {loc.distance !== null && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                        {formatDistance(loc.distance)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected destination action bar */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 pb-3 pt-3 xl:px-5">
          <div className="mb-2 min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-tight">{selected?.name ?? 'Choose a destination'}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" />
                {!selected
                  ? 'Tap a place on the map or list'
                  : routeInfo
                    ? `${routeInfo.source === 'straight' ? '≈ ' : ''}${formatDistance(routeInfo.distance)} · ~${walkMinutes(routeInfo.duration)} min walk${routeInfo.source === 'straight' ? ' (approx.)' : ''}`
                    : userLocation
                      ? 'Calculating route…'
                      : 'Turn on location for distance'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {freeRooms} rooms free
              </span>
            </p>
          </div>
          {!userLocation ? (
            <>
              <button
                type="button"
                onClick={startTracking}
                disabled={locating}
                className="flex h-12 w-full items-center justify-center gap-2 rounded bg-[#008236] text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                <Locate className="h-5 w-5" /> {locating ? 'Finding you…' : tracking ? 'Retry location' : 'Use my location'}
              </button>
              {(locationError || snap !== 'peek') && (
                <p className="mt-1.5 text-center text-[11px] font-semibold text-gray-600">
                  {locationError || 'Navigation uses your real position. Allow location to get directions.'}
                </p>
              )}
            </>
          ) : selected ? (
            <Link
              href={`/navigation?id=${encodeURIComponent(selected.id)}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded bg-[#008236] text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98]"
            >
              <Navigation className="h-5 w-5" /> Start navigation
            </Link>
          ) : (
            <div className="flex h-12 w-full items-center justify-center rounded bg-gray-100 text-xs font-black uppercase tracking-widest text-gray-500">
              Pick a destination
            </div>
          )}
          {nextBooking && snap !== 'peek' && (
            <Link
              href="/bookings"
              className="mt-2 flex items-center gap-3 rounded bg-black px-3 py-2.5 text-sm text-white"
            >
              <CalendarDays className="h-5 w-5 shrink-0 text-[#4ade80]" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{nextBooking.purpose}</span> · {nextBooking.room}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-bold text-[#4ade80]">
                <Clock className="h-4 w-4" /> {nextBooking.startTime}
              </span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
