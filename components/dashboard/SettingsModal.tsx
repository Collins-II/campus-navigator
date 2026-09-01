"use client";

import { FormEvent, useState } from "react";
import { Bell, Shield, SlidersHorizontal, X } from "lucide-react";

type NotificationSettings = {
  email: boolean;
  sms: boolean;
  push: boolean;
  weeklyDigest: boolean;
};

type AppSettings = {
  compactMode: boolean;
  campusAlerts: boolean;
  autoConfirmBookings: boolean;
  darkMode: boolean;
};

type SettingsState = {
  notifications: NotificationSettings;
  app: AppSettings;
};

type SettingsModalProps = {
  open: boolean;
  settings: SettingsState | null;
  onClose: () => void;
  onSaved: () => void;
};

export function SettingsModal({ open, settings, onClose, onSaved }: SettingsModalProps) {
  const [form, setForm] = useState<SettingsState>(() => ({
    notifications: settings?.notifications || { email: true, sms: false, push: true, weeklyDigest: true },
    app: settings?.app || { compactMode: false, campusAlerts: true, autoConfirmBookings: false, darkMode: true },
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const toggleNotification = (key: keyof NotificationSettings) => {
    setForm((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: !current.notifications[key] },
    }));
  };

  const toggleAppSetting = (key: keyof AppSettings) => {
    setForm((current) => ({
      ...current,
      app: { ...current.app, [key]: !current.app[key] },
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save settings.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Account preferences</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["email", "Email updates"],
                ["sms", "SMS reminders"],
                ["push", "Push alerts"],
                ["weeklyDigest", "Weekly digest"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNotification(key as keyof NotificationSettings)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                    form.notifications[key as keyof NotificationSettings]
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-100"
                      : "border-slate-800 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`h-5 w-9 rounded-full p-1 ${form.notifications[key as keyof NotificationSettings] ? "bg-indigo-500" : "bg-slate-700"}`}>
                    <span className={`block h-3 w-3 rounded-full bg-white transition ${form.notifications[key as keyof NotificationSettings] ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Interface & campus
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["compactMode", "Compact layout"],
                ["campusAlerts", "Campus alerts"],
                ["autoConfirmBookings", "Auto-confirm bookings"],
                ["darkMode", "Dark mode"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAppSetting(key as keyof AppSettings)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                    form.app[key as keyof AppSettings]
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-100"
                      : "border-slate-800 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`h-5 w-9 rounded-full p-1 ${form.app[key as keyof AppSettings] ? "bg-indigo-500" : "bg-slate-700"}`}>
                    <span className={`block h-3 w-3 rounded-full bg-white transition ${form.app[key as keyof AppSettings] ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              Security
            </div>
            Two-factor authentication is available for your account. The setting remains managed securely from your identity provider and can be reviewed in the admin portal.
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
              {isSubmitting ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
