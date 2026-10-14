import { useState, useEffect } from "react";
import { X, Loader } from "lucide-react";
import type { NotificationPreferences } from "@/app/api/notifications/preferences/route";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    push: true,
    weeklyDigest: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current preferences
  useEffect(() => {
    if (!isOpen) return;

    const fetchPreferences = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/notifications/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        } else {
          setError("Failed to load preferences");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load preferences"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [isOpen]);

  // Handle toggle
  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError("Failed to save preferences");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal !p-0 max-w-md">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-black bg-white px-5 py-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            Notification Preferences
          </h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black hover:bg-black hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Receive notifications via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email}
                  onChange={() => handleToggle("email")}
                  className="w-6 h-6 accent-[#008236] cursor-pointer"
                />
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Receive notifications via SMS
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sms}
                  onChange={() => handleToggle("sms")}
                  className="w-6 h-6 accent-[#008236] cursor-pointer"
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Receive push notifications in the app
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.push}
                  onChange={() => handleToggle("push")}
                  className="w-6 h-6 accent-[#008236] cursor-pointer"
                />
              </div>

              {/* Weekly Digest */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-900">Weekly Digest</h3>
                  <p className="text-sm text-gray-500">
                    Receive a summary of the week
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={() => handleToggle("weeklyDigest")}
                  className="w-6 h-6 accent-[#008236] cursor-pointer"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Preferences saved successfully
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t-2 border-black bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="ui-btn ui-btn-primary flex-1"
          >
            {saving && <Loader className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
