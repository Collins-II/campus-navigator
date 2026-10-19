"use client";

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { ArrowLeft, BriefcaseBusiness, CalendarRange, CreditCard, LayoutDashboard, LogOut, Menu, MessageSquare, Pencil, Plus, Settings, ShoppingBag, UserCircle2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useChatUnread } from '@/lib/ChatUnreadContext';

import { AvailableRoomsPanel } from '@/components/dashboard/AvailableRoomsPanel';
import { BookingModal } from '@/components/dashboard/BookingModal';
import { PaymentModal } from '@/components/dashboard/PaymentModal';
import { ProfileModal } from '@/components/dashboard/ProfileModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import Loading from '../loading';

type DashboardSummary = {
  totalBookings: number;
  activeBookings: number;
  upcomingClasses: number;
  roomUsage: number;
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
  createdAt: string;
};

type DashboardProfile = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  phone: string;
  department: string;
  program: string;
  year: string;
  role: string;
};

type RoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
  description?: string;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary>({ totalBookings: 0, activeBookings: 0, upcomingClasses: 0, roomUsage: 0 });
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { unread: unreadMessages } = useChatUnread();
  const [preferredRoom, setPreferredRoom] = useState('');
  const [payment, setPayment] = useState<{
    paymentMethod: 'card' | 'mobile-money' | 'bank-transfer';
    provider: string;
    billingEmail: string;
    cardholderName: string;
    last4: string;
    status: 'verified' | 'pending' | 'inactive';
  } | null>(null);
  const [settings, setSettings] = useState<{
    notifications: { email: boolean; sms: boolean; push: boolean; weeklyDigest: boolean; };
    app: { compactMode: boolean; campusAlerts: boolean; autoConfirmBookings: boolean; darkMode: boolean; };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userName = profile?.name || session?.user?.name || 'Student';
  const userRole = profile?.role || session?.user?.role || 'student';

  const scrollToOverview = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const today = getLocalDateKey(new Date());
      const roomAvailabilityUrl = `/api/rooms?date=${today}&start=09:00&end=17:00`;

      const [overviewResponse, roomsResponse, paymentResponse, settingsResponse] = await Promise.all([
        fetch('/api/dashboard/overview'),
        fetch(roomAvailabilityUrl),
        fetch('/api/dashboard/payments'),
        fetch('/api/dashboard/settings'),
      ]);

      if (!overviewResponse.ok) {
        const overviewError = await overviewResponse.json().catch(() => ({ error: 'Unable to load dashboard data.' }));
        throw new Error(overviewError.error || 'Unable to load dashboard data.');
      }

      if (!roomsResponse.ok) {
        const roomError = await roomsResponse.json().catch(() => ({ error: 'Unable to load rooms.' }));
        throw new Error(roomError.error || 'Unable to load rooms.');
      }

      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.json().catch(() => ({ error: 'Unable to load payment details.' }));
        throw new Error(paymentError.error || 'Unable to load payment details.');
      }

      if (!settingsResponse.ok) {
        const settingsError = await settingsResponse.json().catch(() => ({ error: 'Unable to load settings.' }));
        throw new Error(settingsError.error || 'Unable to load settings.');
      }

      const overviewData = await overviewResponse.json();
      const roomsData = await roomsResponse.json();
      const paymentData = await paymentResponse.json();
      const settingsData = await settingsResponse.json();

      const activeRooms = Array.isArray(roomsData.rooms)
        ? roomsData.rooms.filter((room: RoomOption) => room.isAvailable !== false)
        : [];

      setProfile(overviewData.profile || null);
      setSummary(overviewData.summary || { totalBookings: 0, activeBookings: 0, upcomingClasses: 0, roomUsage: 0 });
      setBookings(Array.isArray(overviewData.bookings) ? overviewData.bookings : []);
      setRooms(activeRooms);
      setPayment(paymentData.payment || null);
      setSettings(settingsData.settings || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchDashboardData();
    }
  }, [status, router]);

  const stats = useMemo(
    () => [
      { label: 'Active bookings', value: String(summary.activeBookings), tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' },
      { label: 'Room usage', value: `${summary.roomUsage}%`, tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' },
      { label: 'Upcoming classes', value: String(summary.upcomingClasses), tone: 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/20' },
    ],
    [summary]
  );

  const todayBookings = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    return bookings.filter((booking) => booking.date === todayKey).slice(0, 3);
  }, [bookings]);


  const openBookingModal = (roomName?: string) => {
    setSelectedBooking(null);
    const nextPreferredRoom = roomName ?? rooms.find((room) => room.isAvailable !== false)?.name ?? '';
    setPreferredRoom(nextPreferredRoom);
    setBookingModalOpen(true);
  };

  if (status === 'loading' || loading) {
    return (
      <main className="ui-page flex min-h-screen items-center justify-center p-4 text-gray-900">
        <Loading />
      </main>
    );
  }

  return (
    <main className="ui-page min-h-screen bg-slate-50 text-slate-900 !p-0 md:!p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-4 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white shadow-lg shadow-emerald-950/10 sm:px-6 md:rounded-2xl md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Campus navigator · Student</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Hi, {String(userName).split(' ')[0]}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              className="ui-btn ui-btn-primary"
            >
              <Plus className="h-4 w-4" />
              New booking
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="dashboard-sidebar"
              className="ui-btn dash-menu-btn border border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
            <Link href="/" className="ui-btn border border-white/30 bg-white/10 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
        <div className="px-4 md:px-0">

        {error ? (
          <div role="alert" className="mb-6 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void fetchDashboardData()}
              className="min-h-9 shrink-0 self-start rounded-lg px-3 font-semibold hover:bg-amber-100 sm:self-auto"
            >
              Try again
            </button>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          {menuOpen && (
            <div className="fixed inset-0 z-[1290] bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          )}
          <aside
            id="dashboard-sidebar"
            className={`fixed inset-y-0 left-0 z-[1300] w-[85%] max-w-xs overflow-y-auto bg-white p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:overflow-visible lg:rounded-2xl lg:border lg:border-slate-200 lg:p-4 lg:shadow-sm ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="mb-2 ml-auto flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{userRole}</p>
                <h2 className="text-base font-semibold text-gray-900">{userName}</h2>
              </div>
            </div>

            <nav className="dash-nav" onClick={() => setMenuOpen(false)}>
              <button
                type="button"
                onClick={scrollToOverview}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </button>

              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                <UserCircle2 className="h-4 w-4" />
                Edit profile
              </button>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                <CreditCard className="h-4 w-4" />
                Payment details
              </button>

              <Link
                href="/chat"
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
                {unreadMessages > 0 && (
                  <span className="ml-auto rounded-full bg-[#008236] px-2 py-0.5 text-[10px] font-black text-white">{unreadMessages}</span>
                )}
              </Link>

              <Link
                href="/timetable"
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                <CalendarRange className="h-4 w-4" />
                Timetable &amp; announcements
              </Link>

              <Link
                href="/commerce"
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
              >
                <ShoppingBag className="h-4 w-4" />
                Campus store
              </Link>

              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </nav>
          </aside>

          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="text-3xl font-bold leading-none tabular-nums text-emerald-800 sm:text-4xl">{stat.value}</div>
                  <div className="mt-2 text-xs font-medium text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">Schedule</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Today</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBookingModal()}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Add booking
                  </button>
                </div>

                <div className="space-y-3">
                  {todayBookings.length ? (
                    todayBookings.map((booking) => (
                      <div key={booking.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-semibold text-slate-900">{booking.purpose}</div>
                          <div className="mt-1 truncate text-xs text-slate-500">{booking.room} · {booking.roomCode}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-slate-200">{booking.startTime}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setBookingModalOpen(true);
                            }}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                      No bookings scheduled today yet.
                    </div>
                  )}
                </div>
              </div>

              <AvailableRoomsPanel rooms={rooms} />
            </div>

            <div className="mb-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-0 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">Bookings</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">Recent activity</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{summary.totalBookings} total</span>
              </div>

              <div className="space-y-3">
                {bookings.length ? (
                  bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-slate-900">{booking.purpose}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{booking.room} · {booking.date}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                          booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' :
                          booking.status === 'cancelled' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/20' :
                          'bg-amber-50 text-amber-800 ring-1 ring-amber-500/20'
                        }`}>
                          {booking.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setPreferredRoom(booking.room);
                            setBookingModalOpen(true);
                          }}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
                        >
                          <Pencil className="h-3 w-3" />
                          Update
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No bookings yet. Create your first campus booking to get started.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>

      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        rooms={rooms}
        booking={selectedBooking}
        defaultRoomName={preferredRoom}
        onSaved={fetchDashboardData}
      />

      {profile ? (
        <ProfileModal
          open={profileModalOpen}
          profile={profile}
          onClose={() => setProfileModalOpen(false)}
          onSaved={fetchDashboardData}
        />
      ) : null}

      <PaymentModal
        open={paymentModalOpen}
        payment={payment}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={fetchDashboardData}
      />

      <SettingsModal
        open={settingsModalOpen}
        settings={settings}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={fetchDashboardData}
      />
    </main>
  );
}
