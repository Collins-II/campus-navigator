"use client";

import { FormEvent, useState } from "react";
import { Mail, Phone, User, X } from "lucide-react";

type Profile = {
  id?: string;
  name: string;
  email: string;
  studentId: string;
  phone?: string;
  department?: string;
  program?: string;
  year?: string;
};

type ProfileModalProps = {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProfileModal({ open, profile, onClose, onSaved }: ProfileModalProps) {
  const [form, setForm] = useState<Profile>(() => ({
    id: profile?.id,
    name: profile?.name || "",
    email: profile?.email || "",
    studentId: profile?.studentId || "",
    phone: profile?.phone || "",
    department: profile?.department || "",
    program: profile?.program || "",
    year: profile?.year || "",
  }));
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
      const response = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          department: form.department,
          program: form.program,
          year: form.year,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to update profile.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Edit student profile</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Full name
            </span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <input
              value={form.email}
              disabled
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Student ID
            </span>
            <input
              value={form.studentId}
              disabled
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </span>
            <input
              value={form.phone || ""}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="+260971234567"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Department
            </span>
            <input
              value={form.department || ""}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Program
            </span>
            <input
              value={form.program || ""}
              onChange={(event) => setForm((current) => ({ ...current, program: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <User className="h-3.5 w-3.5" />
              Year
            </span>
            <input
              value={form.year || ""}
              onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="2026"
            />
          </label>

          {error ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
