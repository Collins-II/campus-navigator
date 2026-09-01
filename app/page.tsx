'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Route } from 'lucide-react';

import { HeaderBar } from '@/components/home/HeaderBar';
import { OverviewPanel } from '@/components/home/OverviewPanel';
import { QuickAccessPanel } from '@/components/home/QuickAccessPanel';
import { SearchSidebar } from '@/components/home/SearchSidebar';
import { SelectedLocationCard } from '@/components/home/SelectedLocationCard';
import { campusLocations } from '@/lib/mockData';

type CampusLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
};

type RoomRecord = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
  description?: string;
};

type DashboardBooking = {
  id: string;
  purpose: string;
  room: string;
  roomCode: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  date: string;
  startTime: string;
  endTime: string;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedDestination, setSelectedDestination] = useState<CampusLocation>(campusLocations[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);

  const isAuthenticated = status === 'authenticated';
  const userName = session?.user?.name || 'Student';

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    const controller = new AbortController();

    const loadHomeData = async () => {
      try {
        const todayKey = getLocalDateKey(new Date());
        const roomsResponse = await fetch(`/api/rooms?date=${todayKey}&start=09:00&end=17:00`, {
          signal: controller.signal,
        });

        if (!roomsResponse.ok) {
          throw new Error('Unable to load campus room data');
        }

        const roomsData = await roomsResponse.json();
        const nextRooms = Array.isArray(roomsData.rooms) ? roomsData.rooms : [];
        setRooms(nextRooms);

        if (!isAuthenticated) {
          setBookings([]);
          return;
        }

        const overviewResponse = await fetch('/api/dashboard/overview', { signal: controller.signal });
        if (!overviewResponse.ok) {
          throw new Error('Unable to load dashboard overview');
        }

        const overviewData = await overviewResponse.json();
        setBookings(Array.isArray(overviewData.bookings) ? overviewData.bookings : []);
      } catch {
        setRooms([]);
        setBookings([]);
      }
    };

    void loadHomeData();

    return () => controller.abort();
  }, [isAuthenticated, status]);

  const availableRoomsCount = useMemo(
    () => rooms.filter((room) => room.isAvailable !== false).length,
    [rooms]
  );

  const todayBookings = useMemo(
    () => bookings.filter((booking) => booking.date === getLocalDateKey(new Date())).slice(0, 3),
    [bookings]
  );

  const quickStats = useMemo(
    () => [
      {
        label: 'Rooms free',
        value: String(availableRoomsCount || 0),
        icon: Building2,
        tone: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
      },
      {
        label: 'Classes today',
        value: String(todayBookings.length),
        icon: CalendarDays,
        tone: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20',
      },
      {
        label: 'Walk time',
        value: `${Math.max(5, Math.min(18, 5 + Math.max(0, 8 - availableRoomsCount)))} min`,
        icon: Route,
        tone: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20',
      },
    ],
    [availableRoomsCount, todayBookings.length]
  );

  const upcoming = useMemo(
    () =>
      todayBookings.length
        ? todayBookings.map((booking) => ({
            title: booking.purpose,
            time: booking.startTime,
            room: `${booking.room} · ${booking.roomCode}`,
          }))
        : [{ title: 'No bookings today', time: 'Open schedule', room: 'Free to reserve a room' }],
    [todayBookings]
  );

  const filteredLocations = useMemo(
    () =>
      campusLocations.filter((loc) =>
        `${loc.name} ${loc.tag}`.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  return (
    <main className="portal-shell min-h-screen text-[#152238]">
      <div className="mx-auto max-w-[1600px] pt-4 px-4 pb-30 md:p-6">
        <HeaderBar
          userName={userName}
          isAuthenticated={isAuthenticated}
          onLogout={() => signOut({ callbackUrl: '/' })}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <SearchSidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            locations={filteredLocations}
            selectedLocationId={selectedDestination.id}
            onSelectLocation={setSelectedDestination}
          />

          <OverviewPanel selectedDestination={selectedDestination} quickStats={quickStats} />

          <aside className="space-y-6">
            <QuickAccessPanel upcoming={upcoming} />
            <SelectedLocationCard
              selectedDestination={{
                name: selectedDestination.name,
                tag: selectedDestination.tag,
              }}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
