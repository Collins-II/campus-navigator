"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, GraduationCap, Loader2, MapPin, PartyPopper, ShieldCheck, Users } from "lucide-react";
import { RoomAvailabilityStatus } from "@/components/dashboard/RoomAvailabilityStatus";
import {
  BOOKING_PURPOSES, bookingWindow, DAY_MS, isBookingPurpose, localDateKey, parseTutorialGroup,
  validateBookingSchedule, type BookingCircleOption, type BookingPurpose, type BookingRoomOption, type TutorialGroupDetails,
} from "@/lib/booking-policy";

export type EditableBooking = {
  id: string;
  purpose: string;
  title?: string;
  tutorialGroup?: TutorialGroupDetails;
  attendees?: number;
  conversationId?: string | null;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
};

type Props = {
  booking?: EditableBooking | null;
  defaultRoomName?: string;
  defaultCircleId?: string;
  onSaved: () => void;
  onCancel?: () => void;
};

const fieldClass = "min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";
const initialDate = (purpose: BookingPurpose) => localDateKey(new Date(Date.now() + (purpose === "Event" ? 8 : 3) * DAY_MS));

async function loadOptions<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Booking options could not be loaded.");
  return data;
}

export function BookingForm({ booking, defaultRoomName = "", defaultCircleId = "", onSaved, onCancel }: Props) {
  const [purpose, setPurpose] = useState(booking?.purpose ?? "Tutorial Group");
  const [title, setTitle] = useState(booking?.title ?? "");
  const [tutorialGroup, setTutorialGroup] = useState<TutorialGroupDetails>(booking?.tutorialGroup ?? {
    groupName: "", courseCode: "", topic: "", leaderName: "",
  });
  const [roomName, setRoomName] = useState(booking?.room ?? defaultRoomName);
  const [date, setDate] = useState(booking?.date ?? initialDate("Tutorial Group"));
  const [startTime, setStartTime] = useState(booking?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(booking?.endTime ?? "10:30");
  const [attendees, setAttendees] = useState(String(booking?.attendees ?? 1));
  const [circleId, setCircleId] = useState(booking?.conversationId ?? defaultCircleId);
  const [rooms, setRooms] = useState<BookingRoomOption[]>([]);
  const [circles, setCircles] = useState<BookingCircleOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [circlesError, setCirclesError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions<{ rooms: BookingRoomOption[] }>("/api/rooms", controller.signal)
      .then(({ rooms }) => {
        if (controller.signal.aborted) return;
        setRooms(rooms);
        setRoomsError("");
        setRoomName((current) => current || rooms[0]?.name || "");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setRoomsError(error instanceof Error ? error.message : "Unable to load lecture rooms.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingRooms(false); });
    void loadOptions<{ circles: BookingCircleOption[] }>("/api/bookings/circles", controller.signal)
      .then(({ circles }) => {
        if (controller.signal.aborted) return;
        setCircles(circles);
        setCirclesError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCirclesError(error instanceof Error ? error.message : "Unable to verify Study Circles.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingCircles(false); });
    return () => controller.abort();
  }, [reload]);

  const room = rooms.find((room) => room.name === roomName);
  const circle = circles.find((circle) => circle.id === circleId);
  const validPurpose = isBookingPurpose(purpose);
  const window = bookingWindow(validPurpose ? purpose : "Tutorial Group");
  const circleError = circleId && !loadingCircles && !circlesError && !circle?.eligible
    ? "This Study Circle is not eligible. You must be a member of a circle with at least 50 members."
    : "";
  const scheduleError = validPurpose
    ? validateBookingSchedule(purpose, new Date(`${date}T${startTime}:00`), new Date(`${date}T${endTime}:00`))
    : "Select one of the two booking purposes to update this booking.";
  const attendeeCount = circleId ? circle?.memberCount : Number(attendees);
  const capacityError = room && room.capacity > 0 && attendeeCount && attendeeCount > room.capacity
    ? `Choose a larger lecture room. This room has ${room.capacity} seats.`
    : "";

  const choosePurpose = (next: BookingPurpose) => {
    setPurpose(next);
    if (next !== purpose) setDate(initialDate(next));
    setSuccess("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!validPurpose || scheduleError || circleError || capacityError || !room) {
      setError(scheduleError || circleError || capacityError || "Choose a published lecture room.");
      return;
    }
    if (purpose === "Tutorial Group" && !parseTutorialGroup(tutorialGroup)) {
      setError("Provide a group name, course code, topic, and tutor or group-leader name.");
      return;
    }
    if (purpose === "Event" && !title.trim()) {
      setError("Provide the event name.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(booking ? `/api/bookings/${booking.id}` : "/api/bookings", {
        method: booking ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose, title, room: roomName, attendees: attendeeCount,
          ...(purpose === "Tutorial Group" ? { tutorialGroup } : {}),
          conversationId: circleId || null,
          startTime: new Date(`${date}T${startTime}:00`).toISOString(),
          endTime: new Date(`${date}T${endTime}:00`).toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your booking.");
      setSuccess(booking ? "Changes submitted for staff approval." : "Request submitted. Your room is reserved pending staff approval.");
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save your booking.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-900">01 / What are you planning?</legend>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {BOOKING_PURPOSES.map((option) => {
              const Icon = option === "Tutorial Group" ? GraduationCap : PartyPopper;
              const selected = purpose === option;
              return (
                <label key={option} className={`relative flex min-h-20 min-w-0 cursor-pointer items-start gap-2 rounded-xl border p-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-emerald-100 sm:gap-3 sm:rounded-2xl sm:p-4 ${selected ? "border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600" : "border-slate-200 bg-white hover:border-slate-300"} ${circleId && option === "Event" ? "cursor-not-allowed opacity-50" : ""}`}>
                  <input type="radio" name="booking-purpose" className="sr-only" value={option} checked={selected} disabled={Boolean(circleId) && option === "Event"} onChange={() => choosePurpose(option)} required />
                  <Icon className={`mt-0.5 hidden h-5 w-5 shrink-0 sm:block ${selected ? "text-emerald-700" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-5 text-slate-900 sm:text-sm">{option}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-relaxed">
                      <span className="sm:hidden">{option === "Event" ? "7-14 days ahead" : "48+ hours ahead"}</span>
                      <span className="hidden sm:inline">{option === "Event" ? "Book 7-14 days in advance" : "At least 48 hours in advance"}</span>
                    </span>
                  </span>
                  {selected && <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-emerald-700 sm:block" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>{purpose === "Event" ? "Event name" : "Booking title (optional)"}</span>
            <input required={purpose === "Event"} className={fieldClass} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={purpose === "Event" ? "e.g. Engineering society talk" : "e.g. Calculus revision"} />
          </label>
          <label className="block">
            <span className={labelClass}>Book on behalf of</span>
            <select className={fieldClass} value={circleId} disabled={loadingCircles || Boolean(booking?.conversationId)} onChange={(event) => {
              setCircleId(event.target.value);
              if (event.target.value) choosePurpose("Tutorial Group");
            }}>
              <option value="">My tutorial group or event</option>
              {circleId && !circle && <option value={circleId}>Requested Study Circle</option>}
              {circles.map((circle) => <option key={circle.id} value={circle.id} disabled={!circle.eligible}>{circle.name} / {circle.memberCount} members{circle.eligible ? "" : " (50 required)"}</option>)}
            </select>
          </label>
        </div>
        {purpose === "Tutorial Group" && (
          <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Tutorial Group details for staff approval</h3>
            {([
              ["groupName", "Group name", 120], ["courseCode", "Course code", 30],
              ["leaderName", "Tutor or group-leader name", 120], ["topic", "Topic / description", 1000],
            ] as const).map(([key, label, limit]) => (
              <label key={key} className="block"><span className={labelClass}>{label}</span>
                {key === "topic" ? <textarea required maxLength={limit} className={fieldClass} value={tutorialGroup[key]} onChange={(event) => setTutorialGroup({ ...tutorialGroup, [key]: event.target.value })} />
                  : <input required maxLength={limit} className={fieldClass} value={tutorialGroup[key]} onChange={(event) => setTutorialGroup({ ...tutorialGroup, [key]: event.target.value })} />}
              </label>
            ))}
          </section>
        )}
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-600">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <p>{circle ? `${circle.name}: ${circle.memberCount} members, including you. Circle bookings are Tutorial Groups and reserve seats for the full circle.` : "Study Circles need at least 50 members, including the requester. Smaller circles can still plan meetups in chat, but cannot reserve a lecture room."}</p>
        </div>
        {(roomsError || circlesError || circleError) && <div role="alert" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {roomsError && <p>{roomsError}</p>}
          {circlesError && <p>{circlesError} Personal bookings are still available.</p>}
          {circleError && <p>{circleError}</p>}
          <button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => setReload((value) => value + 1)}>Refresh booking options</button>
        </div>}

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">02 / Choose your lecture room</h3>
          <label className="block">
            <span className={labelClass}>Lecture room</span>
            <select required className={fieldClass} value={roomName} disabled={loadingRooms} onChange={(event) => setRoomName(event.target.value)}>
              <option value="">{loadingRooms ? "Loading lecture rooms..." : "Select a lecture room"}</option>
              {roomName && !room && <option value={roomName}>{roomName} (not available for booking)</option>}
              {rooms.map((room) => <option key={room.id} value={room.name}>{room.name} ({room.code}){room.capacity > 0 ? ` / ${room.capacity} seats` : ""}</option>)}
            </select>
          </label>
          {!loadingRooms && !roomsError && rooms.length === 0 && <p className="text-sm text-slate-500">No lecture rooms are published yet. Please check back later.</p>}
          {room && <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5"><MapPin className="h-3.5 w-3.5" />{room.code}</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{room.floor}</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{room.capacity > 0 ? `${room.capacity} seats` : "Capacity not listed"}</span>
          </div>}
          <label className="block">
            <span className={labelClass}>Expected attendees</span>
            <input required type="number" min={1} max={room?.capacity || undefined} readOnly={Boolean(circleId)} value={circleId ? circle?.memberCount ?? "" : attendees} onChange={(event) => setAttendees(event.target.value)} className={fieldClass} />
          </label>
          {capacityError && <p role="alert" className="text-sm text-rose-700">{capacityError}</p>}
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">03 / Set the date &amp; time</h3>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />{purpose === "Event" ? "The event must start 7-14 days from the time you submit." : "Your tutorial must start at least 48 hours after you submit."} Times are in your local timezone.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
            <label className="col-span-2 block sm:col-span-1"><span className={labelClass}>Date</span><input required type="date" min={localDateKey(window.earliest)} max={window.latest ? localDateKey(window.latest) : undefined} value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} /></label>
            <label className="block"><span className={labelClass}>Start time</span><input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={fieldClass} /></label>
            <label className="block"><span className={labelClass}>End time</span><input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={fieldClass} /></label>
          </div>
          {scheduleError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{scheduleError}</p>}
          {!scheduleError && room && !booking && <RoomAvailabilityStatus roomName={roomName} date={date} startTime={startTime} endTime={endTime} />}
          {booking && <p className="text-xs text-slate-500">Availability is checked again when you save, excluding this booking.</p>}
        </section>
      </fieldset>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <p className="text-sm leading-relaxed text-emerald-950"><span className="font-semibold">A request, not a confirmation.</span> Campus staff review all bookings. Changes to an existing booking require approval again. Published classes take priority and may cancel conflicting bookings.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>}
        <button type="submit" disabled={busy || loadingRooms || !room || Boolean(circleId && (loadingCircles || circlesError || circleError)) || Boolean(capacityError)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          {busy ? "Submitting request..." : booking ? "Submit changes for approval" : "Request lecture room"}
        </button>
      </div>
    </form>
  );
}
