import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "./NotificationCenter";

interface NotificationBellProps {
  unreadCount: number;
  onClick?: () => void;
}

export function NotificationBell({
  unreadCount,
  onClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    onClick?.();
  };

  return (
    <div className="relative">
      <button
      type="button"
      onClick={handleClick}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      aria-label="Notifications"
      title="View notifications"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls="homepage-notification-panel"
      >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      </button>

      {isOpen && (
      <div
        id="homepage-notification-panel"
        role="dialog"
        aria-label="Notifications"
        className="fixed left-3 right-3 z-[1000] top-[calc(4.5rem+env(safe-area-inset-top))] z-[1200] h-[min(34rem,calc(100dvh-6rem-env(safe-area-inset-top)))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:h-[min(36rem,calc(100dvh-7rem))] sm:w-[min(26rem,calc(100vw-2rem))]"
      >
        <NotificationCenter onClose={() => setIsOpen(false)} />
      </div>
      )}
    </div>
  );
}
