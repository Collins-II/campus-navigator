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
  title?: string;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  cancellationReason?: string;
  startsAt?: string;
  endsAt?: string;
  roomCode?: string;
  conversationId?: string | null;
};

const fmt = (value?: string, options?: Intl.DateTimeFormatOptions) =>
  value ? new Date(value).toLocaleString([], options) : '-';

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { status } = useSession();
  const [booking, setBooking] = useState<BookingApiRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
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
        if (!response.ok) throw new Error(data.error || 'Unable to load booking details right now.');
        const found = (data.bookings ?? []).find((b: BookingApiRecord) => (b._id || b.id) === params.id);
        setBooking(found ?? null);
        setState(found ? 'ready' : 'missing');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load booking details right now.');
        setState('error');
      }
    })();
  }, [status, params.id, reloadKey]);

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
  const roomCode = booking?.roomCode || (room && 'code' in room ? room.code : undefined);
  const bookingStatus = booking?.status || 'pending';

  return (
    <main className="ui-page bg-slate-50">
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Booking" title="Booking details" backHref="/bookings" />

        {state === 'loading' ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" aria-busy="true" />
        ) : state === 'error' ? (
          <div role="alert" className="ui-card !rounded-2xl !border-amber-200 !bg-amber-50 !shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Booking details unavailable</h2>
            <p className="mt-2 text-sm text-amber-900">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError('');
                setState('loading');
                setReloadKey((key) => key + 1);
              }}
              className="ui-btn ui-btn-secondary mt-5"
            >
              Try again
            </button>
          </div>
        ) : state === 'missing' || !booking ? (
          <div className="ui-card !rounded-2xl !border-slate-200 !shadow-sm">
            <h2 className="text-xl font-bold">Booking not found</h2>
            <p className="mt-2 text-sm text-gray-600">It may have been removed, or you may need to log in.</p>
            <Link href="/bookings" className="ui-btn ui-btn-primary mt-5">Back to bookings</Link>
          </div>
        ) : (
          <div className="ui-card space-y-5 !rounded-2xl !border-slate-200 !p-4 !shadow-sm sm:!p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="min-w-0 break-words text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{booking.title || booking.purpose || 'Campus booking'}</h2><p className="mt-2 text-sm text-emerald-700">{booking.purpose}{booking.conversationId ? ' / Study Circle' : ''}</p></div>
              <span className={statusBadgeClass(bookingStatus)}>{bookingStatus}</span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: MapPin, label: 'Room', value: roomCode ? `${roomName} (${roomCode})` : roomName },
                { icon: CalendarDays, label: 'Date', value: fmt(booking.startsAt, { dateStyle: 'full' }) },
                { icon: Clock3, label: 'Time', value: `${fmt(booking.startsAt, { timeStyle: 'short' })} – ${fmt(booking.endsAt, { timeStyle: 'short' })}` },
                { icon: Users, label: 'Attendees', value: String(booking.attendees || 1) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="ui-card-muted flex min-w-0 items-center gap-3 !rounded-xl !bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="break-words text-sm font-semibold text-slate-900">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            {booking.tutorialGroup && <section className="rounded-xl bg-slate-50 p-4 text-sm">
              <h3 className="font-semibold">Tutorial Group details</h3>
              <p className="mt-2">{booking.tutorialGroup.groupName} / {booking.tutorialGroup.courseCode}</p>
              <p className="mt-1">Tutor / leader: {booking.tutorialGroup.leaderName}</p>
              <p className="mt-2 whitespace-pre-wrap">{booking.tutorialGroup.topic}</p>
            </section>}
            {booking.cancellationReason === 'timetable_conflict' && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This booking was cancelled because a published class takes priority.</p>}

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
