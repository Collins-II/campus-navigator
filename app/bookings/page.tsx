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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.name === draft.room) ?? rooms[0],
    [rooms, draft.room]
  );

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Unable to load bookings');

      const data = await response.json();
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
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    void (async () => {
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          const list: RoomOption[] = Array.isArray(data.rooms) ? data.rooms : [];
          setRooms(list);
          if (list.length) setDraft((current) => ({ ...current, room: current.room || list[0].name }));
        }
      } catch {
        setRooms([]);
      }
      if (isAuthenticated) await fetchBookings();
      setLoading(false);
    })();
  }, [status, isAuthenticated, fetchBookings]);

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
    <main className="ui-page">
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
          <div className="ui-card mx-auto max-w-md text-center">
            <h2 className="text-xl font-bold">Log in to book a room</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in with your student account to reserve rooms and view your bookings.</p>
            <Link href="/login" className="ui-btn ui-btn-primary mt-5 w-full">
              Log in
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <form onSubmit={submitBooking} className="ui-card h-fit space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">New booking</h2>
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
              <h2 className="mb-3 text-lg font-bold">Your bookings</h2>
              {loading ? (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200/70" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="ui-card text-center text-sm text-gray-600">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  No bookings yet. Your requests will show up here.
                </div>
              ) : (
                <ul className="space-y-3">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/booking/${booking.id}`}
                        className="ui-card flex items-center gap-4 !p-4 transition hover:border-emerald-300"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <CalendarDays className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-bold">{booking.purpose}</span>
                            <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
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
