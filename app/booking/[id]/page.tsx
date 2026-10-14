'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Navigation, Users } from 'lucide-react';

import { PageHeader, statusBadgeClass } from '@/components/ui/PageHeader';

type BookingApiRecord = {
  _id?: string;
  id?: string;
  room?: { name?: string; code?: string; floor?: string } | string;
  purpose?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  attendees?: number;
};

const fmt = (value?: string, options?: Intl.DateTimeFormatOptions) =>
  value ? new Date(value).toLocaleString([], options) : '-';

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { status } = useSession();
  const [booking, setBooking] = useState<BookingApiRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('missing');
      return;
    }
    void (async () => {
      try {
        const response = await fetch('/api/bookings', { cache: 'no-store' });
        const data = await response.json();
        const found = (data.bookings ?? []).find((b: BookingApiRecord) => (b._id || b.id) === params.id);
        setBooking(found ?? null);
        setState(found ? 'ready' : 'missing');
      } catch {
        setState('missing');
      }
    })();
  }, [status, params.id]);

  const cancelBooking = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/bookings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to cancel booking');
      setBooking((current) => (current ? { ...current, status: 'cancelled' } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking');
    } finally {
      setBusy(false);
    }
  };

  const room = typeof booking?.room === 'object' ? booking.room : { name: booking?.room };
  const roomName = room?.name || 'Campus room';
  const roomCode = room && 'code' in room ? room.code : undefined;
  const bookingStatus = booking?.status || 'pending';

  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Booking" title="Booking details" backHref="/bookings" />

        {state === 'loading' ? (
          <div className="h-64 animate-pulse rounded-lg bg-gray-200/70" aria-busy="true" />
        ) : state === 'missing' || !booking ? (
          <div className="ui-card text-center">
            <h2 className="text-xl font-bold">Booking not found</h2>
            <p className="mt-2 text-sm text-gray-600">It may have been removed, or you may need to log in.</p>
            <Link href="/bookings" className="ui-btn ui-btn-primary mt-5">Back to bookings</Link>
          </div>
        ) : (
          <div className="ui-card space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight">{booking.purpose || 'Campus booking'}</h2>
              <span className={statusBadgeClass(bookingStatus)}>{bookingStatus}</span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: MapPin, label: 'Room', value: roomCode ? `${roomName} (${roomCode})` : roomName },
                { icon: CalendarDays, label: 'Date', value: fmt(booking.startTime, { dateStyle: 'full' }) },
                { icon: Clock3, label: 'Time', value: `${fmt(booking.startTime, { timeStyle: 'short' })} – ${fmt(booking.endTime, { timeStyle: 'short' })}` },
                { icon: Users, label: 'Attendees', value: String(booking.attendees || 1) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="ui-card-muted flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-gray-500">{label}</dt>
                    <dd className="truncate text-sm font-semibold">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/navigation?destination=${encodeURIComponent(roomName)}`} className="ui-btn ui-btn-primary h-12 flex-1">
                <Navigation className="h-4 w-4" /> Directions
              </Link>
              {bookingStatus !== 'cancelled' ? (
                <button type="button" onClick={cancelBooking} disabled={busy} className="ui-btn ui-btn-danger h-12 flex-1">
                  {busy ? 'Cancelling...' : 'Cancel booking'}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
