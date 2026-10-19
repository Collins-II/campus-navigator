'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, MapPin, Plus, Users } from 'lucide-react';

import { PageHeader, statusBadgeClass } from '@/components/ui/PageHeader';
import { RoomAvailabilityStatus, RoomStatusBadge } from '@/components/dashboard/RoomAvailabilityStatus';

type RoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
};

type BookingDraft = {
  title: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
};

type BookingRecord = {
  id: string;
  room: string;
  date: string;
  time: string;
  status: string;
  purpose: string;
  attendees: number;
};

type BookingApiRecord = {
  _id?: string;
  id?: string;
  room?: { name?: string; code?: string } | string;
  purpose?: string;
  startTime?: string | Date;
  status?: string;
  attendees?: number;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const defaultDraft = (room = ''): BookingDraft => ({
  title: '',
  room,
  date: getLocalDateKey(new Date()),
  startTime: '09:00',
  endTime: '10:30',
  attendees: 1,
});

export default function BookingsPage() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [draft, setDraft] = useState<BookingDraft>(defaultDraft());
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [roomsError, setRoomsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.name === draft.room) ?? rooms[0],
    [rooms, draft.room]
  );

  const fetchBookings = useCallback(async () => {
    setBookingsError('');
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load bookings right now.');
      const normalized: BookingRecord[] = (data.bookings ?? []).map((booking: BookingApiRecord) => {
        const start = booking.startTime ? new Date(booking.startTime) : new Date();
        return {
          id: booking._id || booking.id || '',
          room:
            typeof booking.room === 'object' && booking.room
              ? booking.room.name || 'Campus room'
              : booking.room || 'Campus room',
          date: getLocalDateKey(start),
          time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: booking.status || 'pending',
          purpose: booking.purpose || 'Campus booking',
          attendees: booking.attendees || 1,
        };
      });
      setBookings(normalized);
    } catch (loadError) {
      setBookings([]);
      setBookingsError(loadError instanceof Error ? loadError.message : 'Unable to load bookings right now.');
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setRoomsError('');
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load rooms right now.');
      const list: RoomOption[] = Array.isArray(data.rooms) ? data.rooms : [];
      setRooms(list);
      if (list.length) setDraft((current) => ({ ...current, room: current.room || list[0].name }));
    } catch (loadError) {
      setRooms([]);
      setRoomsError(loadError instanceof Error ? loadError.message : 'Unable to load rooms right now.');
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRooms(), isAuthenticated ? fetchBookings() : Promise.resolve()]);
    setLoading(false);
  }, [fetchBookings, fetchRooms, isAuthenticated]);

  useEffect(() => {
    if (status === 'loading') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPageData();
  }, [status, loadPageData]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const start = new Date(`${draft.date}T${draft.startTime}:00`);
      const end = new Date(`${draft.date}T${draft.endTime}:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new Error('Choose a valid booking time range.');
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: draft.room,
          purpose: draft.title.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'pending',
          attendees: draft.attendees,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to submit booking');

      setDraft(defaultDraft(draft.room));
      setSuccess('Booking submitted. You will be notified once it is confirmed.');
      await fetchBookings();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="ui-page bg-slate-50">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Reserve"
          title="Bookings"
          subtitle="Reserve a lecture room or study space and track your requests."
          actions={
            isAuthenticated ? (
              <Link href="/dashboard" className="ui-btn ui-btn-secondary">
                Dashboard
              </Link>
            ) : null
          }
        />

        {!isAuthenticated && status !== 'loading' ? (
          <div className="ui-card mx-auto max-w-md !rounded-2xl !border-slate-200 !shadow-sm">
            <h2 className="text-xl font-bold">Log in to book a room</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in with your student account to reserve rooms and view your bookings.</p>
            <Link href="/login" className="ui-btn ui-btn-primary mt-5 w-full">
              Log in
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <form onSubmit={submitBooking} className="ui-card h-fit space-y-4 !rounded-2xl !border-slate-200 !p-4 !shadow-sm sm:!p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Reserve a space</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">New booking</h2>
                </div>
                {roomsError ? (
                  <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p>{roomsError}</p>
                    <button type="button" onClick={() => void fetchRooms()} className="mt-2 min-h-9 font-semibold text-amber-900 underline underline-offset-2">
                      Retry loading rooms
                    </button>
                  </div>
                ) : null}

                {selectedRoom ? (
                  <RoomStatusBadge status={selectedRoom.isAvailable === false ? 'busy' : 'available'} compact />
                ) : null}
              </div>

              <label className="block">
                <span className="ui-label">What is it for?</span>
                <input
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="ui-input"
                  placeholder="Study session, lab practical, seminar..."
                />
              </label>

              <label className="block">
                <span className="ui-label">Room</span>
                <select
                  required
                  value={draft.room}
                  onChange={(event) => setDraft({ ...draft, room: event.target.value })}
                  className="ui-input"
                >
                  {rooms.length === 0 ? <option value="">No rooms available</option> : null}
                  {rooms.map((room) => (
                    <option key={room.id} value={room.name}>
                      {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </label>

              {selectedRoom ? (
                <div className="flex flex-wrap gap-2">
                  <span className="ui-badge ui-badge-neutral">{selectedRoom.floor}</span>
                  <span className="ui-badge ui-badge-neutral">{selectedRoom.capacity} seats</span>
                </div>
              ) : null}

              <label className="block">
                <span className="ui-label">Date</span>
                <input
                  required
                  type="date"
                  min={getLocalDateKey(new Date())}
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="ui-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="ui-label">Start</span>
                  <input
                    required
                    type="time"
                    value={draft.startTime}
                    onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                    className="ui-input"
                  />
                </label>
                <label className="block">
                  <span className="ui-label">End</span>
                  <input
                    required
                    type="time"
                    value={draft.endTime}
                    onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                    className="ui-input"
                  />
                </label>
              </div>

              <RoomAvailabilityStatus
                roomName={draft.room}
                date={draft.date}
                startTime={draft.startTime}
                endTime={draft.endTime}
              />

              <label className="block">
                <span className="ui-label">Attendees</span>
                <input
                  type="number"
                  min={1}
                  max={selectedRoom?.capacity || undefined}
                  value={draft.attendees}
                  onChange={(event) => setDraft({ ...draft, attendees: Number(event.target.value) || 1 })}
                  className="ui-input"
                />
              </label>

              {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              {success ? <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

              <button type="submit" disabled={isSubmitting || !draft.room} className="ui-btn ui-btn-primary h-12 w-full">
                <Plus className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Request booking'}
              </button>
            </form>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Your schedule</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Your bookings</h2>
                </div>
                {bookings.length > 0 ? <span className="text-sm text-slate-500">{bookings.length} total</span> : null}
              </div>
              {loading ? (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />
                  ))}
                </div>
              ) : bookingsError ? (
                <div role="alert" className="ui-card !rounded-2xl !border-amber-200 !bg-amber-50 !text-slate-700 !shadow-sm">
                  <p className="text-sm">{bookingsError}</p>
                  <button type="button" onClick={() => void fetchBookings()} className="mt-3 min-h-10 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                    Try again
                  </button>
                </div>
              ) : bookings.length === 0 ? (
                <div className="ui-card !rounded-2xl !border-slate-200 !text-slate-600 !shadow-sm">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  No bookings yet. Your requests will show up here.
                </div>
              ) : (
                <ul className="space-y-3">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/booking/${booking.id}`}
                        className="ui-card flex min-w-0 items-center gap-3 !rounded-2xl !border-slate-200 !p-4 !shadow-sm transition hover:!border-emerald-300 hover:!shadow-md sm:gap-4"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:h-12 sm:w-12">
                          <CalendarDays className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 break-words font-semibold text-slate-900">{booking.purpose}</span>
                            <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
                          </span>
                          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{booking.room}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{booking.date} · {booking.time}</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{booking.attendees}</span>
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
