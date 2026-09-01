"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, X } from "lucide-react";

import { RoomAvailabilityStatus, RoomStatusBadge } from "@/components/dashboard/RoomAvailabilityStatus";

type RoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
};

type BookingFormState = {
  purpose: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
};

type BookingModalProps = {
  open: boolean;
  onClose: () => void;
  rooms: RoomOption[];
  booking?: {
    id: string;
    purpose: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "pending" | "confirmed" | "cancelled";
  } | null;
  defaultRoomName?: string;
  onSaved: () => void;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const defaultForm = (roomName = "Main Library"): BookingFormState => ({
  purpose: "",
  room: roomName,
  date: getLocalDateKey(new Date()),
  startTime: "09:00",
  endTime: "10:30",
  status: "pending",
});

export function BookingModal({ open, onClose, rooms, booking, defaultRoomName, onSaved }: BookingModalProps) {
  const getInitialForm = () => {
    if (booking) {
      return {
        purpose: booking.purpose,
        room: booking.room,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      } satisfies BookingFormState;
    }

    const initialRoom = defaultRoomName && rooms.some((room) => room.name === defaultRoomName)
      ? defaultRoomName
      : rooms[0]?.name || "Main Library";

    return defaultForm(initialRoom);
  };

  const [form, setForm] = useState<BookingFormState>(getInitialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const roomOptions = useMemo(() => rooms.length ? rooms : [{ id: "main-library", name: "Main Library", code: "L1", floor: "Ground Floor", capacity: 30 }], [rooms]);
  const selectedRoom = useMemo(
    () => roomOptions.find((room) => room.name === form.room) ?? roomOptions[0],
    [form.room, roomOptions]
  );

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const startDate = new Date(`${form.date}T${form.startTime}:00`);
      const endDate = new Date(`${form.date}T${form.endTime}:00`);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        throw new Error("Choose a valid booking time range.");
      }

      const payload = {
        purpose: form.purpose,
        room: form.room,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        status: form.status,
      };

      const response = await fetch(
        booking ? `/api/bookings/${booking.id}` : "/api/bookings",
        {
          method: booking ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.details || "Unable to save booking.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalKey = `${open ? "open" : "closed"}-${booking?.id ?? "new-booking"}-${defaultRoomName ?? "default-room"}-${rooms.map((room) => room.id).join("-")}`;

  return (
    <div key={modalKey} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Booking</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{booking ? "Edit booking" : "Create booking"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Purpose
            </span>
            <input
              value={form.purpose}
              onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="Study session, lab booking, seminar..."
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Room
              </span>
              <select
                value={form.room}
                onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.name} className="bg-slate-900 text-white">
                    {room.name} ({room.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "pending" | "confirmed" | "cancelled" }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="pending" className="bg-slate-900 text-white">Pending</option>
                <option value="confirmed" className="bg-slate-900 text-white">Confirmed</option>
                <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Selected room</p>
                <h3 className="mt-1 text-base font-semibold text-white">{selectedRoom?.name || form.room}</h3>
              </div>
              <RoomStatusBadge status={selectedRoom?.isAvailable === false ? 'busy' : 'available'} compact />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full bg-slate-800 px-2 py-1">{selectedRoom?.code || "N/A"}</span>
              <span className="rounded-full bg-slate-800 px-2 py-1">{selectedRoom?.floor || "Ground Floor"}</span>
              <span className="rounded-full bg-slate-800 px-2 py-1">{selectedRoom?.capacity || 0} seats</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Start
              </span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                End
              </span>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                required
              />
            </label>
          </div>

          <RoomAvailabilityStatus
            roomName={form.room}
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
          />

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? (booking ? "Saving..." : "Creating...") : booking ? "Save changes" : "Create booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
