'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock3, MapPin, Users, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { bookingItems } from '@/lib/mockData';
import { notFound } from 'next/navigation';

export default function BookingDetailsPage({ params }: { params: { id: string } }) {
  const booking = bookingItems.find((item) => item.id === params.id);

  if (!booking) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/bookings"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-[28px] border border-gray-200 bg-gray-50 p-6 shadow-xl shadow-gray-200/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-600/80">Booking details</p>
                <h1 className="mt-2 text-3xl font-semibold text-gray-900">{booking.title}</h1>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                  booking.status === 'Confirmed'
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                    : booking.status === 'Pending'
                      ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                      : 'bg-slate-700 text-slate-200 ring-1 ring-slate-600'
                }`}
              >
                {booking.status}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={<MapPin className="h-4 w-4 text-emerald-600" />} label="Location" value={booking.room} />
              <InfoRow icon={<CalendarDays className="h-4 w-4 text-emerald-500" />} label="Date" value={booking.date} />
              <InfoRow icon={<Clock3 className="h-4 w-4 text-emerald-500" />} label="Time" value={booking.time} />
              <InfoRow icon={<Users className="h-4 w-4 text-emerald-600" />} label="Attendees" value={`${booking.attendees} people`} />
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">Purpose</p>
              <p className="text-base text-gray-700">{booking.purpose}</p>
            </div>
          </section>

          <aside className="rounded-[28px] border border-gray-200 bg-gray-50 p-6 shadow-xl shadow-gray-200/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-600">Status</p>
                <h2 className="text-lg font-semibold text-gray-900">Everything is ready</h2>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">Reservation reference: {booking.id}</div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">Room access: Confirmed</div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">Reminder: Sent 15 minutes before</div>
            </div>

            <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
              <BadgeCheck className="h-4 w-4" />
              Confirm attendance
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-600">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="text-base font-medium text-gray-900">{value}</div>
    </div>
  );
}
