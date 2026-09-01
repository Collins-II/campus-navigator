"use client";

import { FormEvent, useState } from "react";
import { Building2, MapPin, Plus, X } from "lucide-react";

type LectureRoomForm = {
  name: string;
  code: string;
  floor: string;
  capacity: number;
  description: string;
  equipment: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
};

type LectureRoomModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const defaultRoom = (): LectureRoomForm => ({
  name: "",
  code: "",
  floor: "Ground Floor",
  capacity: 40,
  description: "",
  equipment: "Projector, Whiteboard",
  lat: -15.3925,
  lng: 28.3285,
  isAvailable: true,
});

export function LectureRoomModal({ open, onClose, onSaved }: LectureRoomModalProps) {
  const [form, setForm] = useState<LectureRoomForm>(() => defaultRoom());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          floor: form.floor,
          capacity: form.capacity,
          description: form.description,
          equipment: form.equipment.split(",").map((value) => value.trim()).filter(Boolean),
          location: { lat: form.lat, lng: form.lng },
          isAvailable: form.isAvailable,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to create lecture room.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create lecture room.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Lecture room</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Add room to campus catalog</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                Room name
              </span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Science Block A"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                Room code
              </span>
              <input
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="S15"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Floor
              </span>
              <input
                value={form.floor}
                onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Ground Floor"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <Plus className="h-3.5 w-3.5" />
                Capacity
              </span>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) || 1 }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Available
              </span>
              <select
                value={form.isAvailable ? "available" : "unavailable"}
                onChange={(event) => setForm((current) => ({ ...current, isAvailable: event.target.value === "available" }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="available" className="bg-slate-900 text-white">Available</option>
                <option value="unavailable" className="bg-slate-900 text-white">Unavailable</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Equipment
            </span>
            <input
              value={form.equipment}
              onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="Projector, Whiteboard, Mic"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-[88px] w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="Large lecture room with projector and tiered seating"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.lat}
                onChange={(event) => setForm((current) => ({ ...current, lat: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.lng}
                onChange={(event) => setForm((current) => ({ ...current, lng: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              />
            </label>
          </div>

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
              {isSubmitting ? "Saving..." : "Create room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
