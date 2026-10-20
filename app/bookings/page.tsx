"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, Clock3, GraduationCap, MapPin, PartyPopper, Users } from "lucide-react";
import { PageHeader, statusBadgeClass } from "@/components/ui/PageHeader";
import { BookingForm } from "@/components/bookings/BookingForm";

type BookingRecord = {
  id: string;
  room: string;
  purpose: string;
  title?: string;
  startsAt: string;
  endsAt?: string;
  attendees: number;
  status: string;
  cancellationReason?: string;
  conversationId?: string | null;
};

function BookingsContent() {
  const { status } = useSession();
  const params = useSearchParams();
  const circleId = params.get("circle") ?? "";
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [now, setNow] = useState(() => Date.now());

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load your bookings.");
      setBookings(data.bookings);
      setNow(Date.now());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBookings();
  }, [status, loadBookings]);

  const upcoming = bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.startsAt).getTime() >= now);
  const visible = filter === "upcoming" ? upcoming : bookings;
  return (
    <main className="ui-page bg-slate-50">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Campus spaces" title="Room bookings" subtitle="A place to learn. A space to bring people together." actions={<Link href="/dashboard" className="ui-btn ui-btn-secondary">Dashboard <ArrowUpRight className="h-4 w-4" /></Link>} />

        <section className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100"><MapPin className="h-3.5 w-3.5" /> Lecture rooms only</span>
              <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Great things start with a shared space.</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-emerald-100">Plan a tutorial or host an event. Choose your lecture room, send a request, and track campus approval in one place.</p>
            </div>
            <div className="hidden sm:grid gap-3 sm:grid-cols-2">
              {[{ icon: GraduationCap, title: "Tutorial Group", timing: "48+ hours ahead", text: "Give your group time to prepare." }, { icon: PartyPopper, title: "Campus event", timing: "7-14 days ahead", text: "Plan within the event booking window." }].map(({ icon: Icon, title, timing, text }) => <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <Icon className="mb-4 h-6 w-6 text-emerald-200" />
                <p className="text-sm font-semibold">{title}</p><p className="mt-1 text-lg font-semibold tracking-tight">{timing}</p><p className="mt-2 text-xs leading-relaxed text-emerald-100">{text}</p>
              </div>)}
            </div>
          </div>
        </section>

        {status === "loading" ? <div aria-busy="true" className="h-80 animate-pulse rounded-3xl bg-white" /> : status !== "authenticated" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Your next gathering starts here.</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in with your student account to request a lecture room and manage your bookings.</p>
            <Link href="/login" className="ui-btn ui-btn-primary mt-5">Log in to book</Link>
          </div>
        ) : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-slate-100 pb-5"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Plan ahead</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Request a lecture room</h2><p className="mt-2 text-sm text-slate-500">Choose a purpose to see the right booking window.</p></div>
            <BookingForm key={circleId} defaultCircleId={circleId} onSaved={() => void loadBookings()} />
          </section>
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Your schedule</p><h2 className="mt-2 text-xl font-semibold text-slate-900">Booking requests</h2></div>
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">{(["upcoming", "all"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${filter === value ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}>{value === "upcoming" ? `Upcoming (${upcoming.length})` : "All requests"}</button>)}</div>
            </div>
            {loading ? <div aria-busy="true" className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" /> : error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p>{error}</p><button type="button" onClick={() => void loadBookings()} className="mt-3 min-h-10 font-semibold underline">Try again</button></div> : visible.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CalendarDays className="h-6 w-6" /></span><h3 className="mt-4 font-semibold text-slate-900">Room for your next plan.</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{filter === "upcoming" ? "No upcoming requests. Use the form to plan your next tutorial or event." : "Your booking history will appear here."}</p></div> : <ul className="space-y-3">
              {visible.map((booking) => {
                const start = new Date(booking.startsAt);
                return <li key={booking.id}><Link href={`/booking/${booking.id}`} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                  <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{start.toLocaleDateString([], { month: "short" })}</span><span className="text-2xl font-semibold tracking-tight text-slate-900">{start.getDate()}</span></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-semibold text-slate-900">{booking.title || booking.purpose}</span>
                      <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
                    </span>
                    <span className="mt-1 block text-xs text-emerald-700">{booking.purpose}{booking.conversationId ? " / Study Circle" : ""}</span>
                    {booking.cancellationReason === "timetable_conflict" && <span className="mt-2 block text-xs text-rose-700">Cancelled: a published class takes priority.</span>}
                    <span className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{booking.room}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{booking.attendees}</span>
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-700" />
                </Link></li>;
              })}
            </ul>}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5"><Users className="mt-1 h-5 w-5 shrink-0 text-emerald-700" /><div><h3 className="text-sm font-semibold text-slate-900">Bringing your Study Circle?</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Circles with 50+ members can request a lecture room for a Tutorial Group, at least 48 hours ahead.</p><Link href="/chat" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-emerald-700">Open Study Circles <ArrowUpRight className="h-4 w-4" /></Link></div></div>
          </section>
        </div>}
      </div>
    </main>
  );
}

export default function BookingsPage() {
  return <Suspense fallback={<main className="ui-page bg-slate-50"><div aria-busy="true" className="mx-auto h-80 max-w-7xl animate-pulse rounded-3xl bg-white" /></main>}><BookingsContent /></Suspense>;
}
