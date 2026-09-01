'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, MapPin, Plus, Users, BadgeCheck } from 'lucide-react';

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
  purpose: string;
  attendees: number;
  status: 'pending' | 'confirmed' | 'cancelled';
};

type BookingRecord = {
  _id?: string;
  id: string;
  title: string;
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
  endTime?: string | Date;
  status?: string;
  attendees?: number;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const defaultDraft = (roomName = 'Main Library'): BookingDraft => ({
  title: 'Team review',
  room: roomName,
  date: getLocalDateKey(new Date()),
  startTime: '09:00',
  endTime: '10:30',
  purpose: 'Strategic planning and project review',
  attendees: 8,
  status: 'pending',
});

export default function BookingsPage() {
  const [draft, setDraft] = useState<BookingDraft>(defaultDraft());
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const roomOptions = useMemo(
    () => rooms.length ? rooms : [{ id: 'main-library', name: 'Main Library', code: 'L1', floor: 'Ground Floor', capacity: 30 }],
    [rooms]
  );

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Unable to load bookings');
      }

      const data = await response.json();
      const normalized = (data.bookings ?? []).map((booking: BookingApiRecord) => {
        const start = booking.startTime ? new Date(booking.startTime) : new Date();
        return {
          id: booking._id || booking.id || 'booking-id',
          title: booking.purpose || 'Campus booking',
          room: typeof booking.room === 'object' && booking.room ? booking.room.name || 'Main Library' : booking.room || 'Main Library',
          date: getLocalDateKey(start),
          time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: booking.status || 'pending',
          purpose: booking.purpose || 'Campus coordination',
          attendees: booking.attendees || 8,
        };
      });

      setBookings(normalized);
    } catch {
      setBookings([]);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
          throw new Error('Unable to load rooms');
        }

        const data = await response.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
        if (data.rooms?.length) {
          setDraft((current) => ({ ...current, room: current.room || data.rooms[0].name }));
        }
      } catch {
        setRooms([]);
      }

      try {
        await fetchBookings();
      } catch {
        setBookings([]);
      }
    })();
  }, []);

  const selectedRoom = roomOptions.find((room) => room.name === draft.room) ?? roomOptions[0];

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const bookingDate = draft.date || getLocalDateKey(new Date());
      const start = new Date(`${bookingDate}T${draft.startTime}:00`);
      const end = new Date(`${bookingDate}T${draft.endTime}:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new Error('Choose a valid booking time range.');
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: draft.room,
          purpose: draft.title || draft.purpose,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: draft.status,
          attendees: draft.attendees,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to submit booking');
      }

      setDraft(defaultDraft(draft.room));
      await fetchBookings();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="portal-shell min-h-screen p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-600/80">Campus navigator</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Booking overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-200">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
            <Link href="/dashboard" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/20">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600/80">Reserve room</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">Create a booking</h2>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
              {selectedRoom?.isAvailable === false ? 'Busy window' : 'Available today'}
            </div>
          </div>

          <form onSubmit={submitBooking} className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                <MapPin className="h-3.5 w-3.5" />
                Title
              </span>
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                placeholder="Study session, lab booking, seminar..."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Room
                </span>
                <select
                  value={draft.room}
                  onChange={(event) => setDraft({ ...draft, room: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                >
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.name} className="bg-white text-gray-900">
                      {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Status
                </span>
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as BookingDraft['status'] })}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                >
                  <option value="pending" className="bg-white text-gray-900">Pending</option>
                  <option value="confirmed" className="bg-white text-gray-900">Confirmed</option>
                  <option value="cancelled" className="bg-white text-gray-900">Cancelled</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date
                </span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  Start
                </span>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  End
                </span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Selected room</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900">{selectedRoom?.name || draft.room}</h3>
                </div>
                <RoomStatusBadge status={selectedRoom?.isAvailable === false ? 'busy' : 'available'} compact />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                <span className="rounded-full bg-gray-200 px-2 py-1">{selectedRoom?.code || 'N/A'}</span>
                <span className="rounded-full bg-gray-200 px-2 py-1">{selectedRoom?.floor || 'Ground Floor'}</span>
                <span className="rounded-full bg-gray-200 px-2 py-1">{selectedRoom?.capacity || 0} seats</span>
              </div>
            </div>

            <RoomAvailabilityStatus
              roomName={draft.room}
              date={draft.date}
              startTime={draft.startTime}
              endTime={draft.endTime}
            />

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                <Users className="h-3.5 w-3.5" />
                Purpose
              </span>
              <textarea
                rows={3}
                value={draft.purpose}
                onChange={(event) => setDraft({ ...draft, purpose: event.target.value })}
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
                <Users className="h-3.5 w-3.5" />
                Attendees
              </span>
              <input
                type="number"
                min={1}
                value={draft.attendees}
                onChange={(event) => setDraft({ ...draft, attendees: Number(event.target.value) || 1 })}
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDraft(defaultDraft(draft.room))}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-100"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit booking'}
              </button>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/20">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-600">Booking</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900">{booking.title}</h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    booking.status === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                      : booking.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                        : 'bg-slate-700 text-slate-200 ring-1 ring-slate-600'
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>{booking.room}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-emerald-500" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-emerald-500" />
                  <span>{booking.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>{booking.attendees} attendees</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-600">
                <p className="mb-2 font-medium text-gray-900">Purpose</p>
                <p>{booking.purpose}</p>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Ref {booking.id}</span>
                <Link href={`/booking/${booking.id}`} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-emerald-500">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  View details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
