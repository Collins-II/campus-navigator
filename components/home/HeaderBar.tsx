'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogIn, LogOut, LayoutDashboard, CalendarDays } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { useNotifications } from '@/lib/useNotifications';

type HeaderBarProps = {
  userName: string;
  isAuthenticated: boolean;
  onLogout: () => void;
};

export function HeaderBar({ userName, isAuthenticated, onLogout }: HeaderBarProps) {
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-4 z-40 mb-6 w-full rounded-2xl border border-gray-200 bg-white/95 p-3.5 shadow-md backdrop-blur-md transition-all">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        {/* Left Section: Brand & User Context */}
        <div className="flex items-center gap-3.5">
          {/* Logo Container */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gradient-to-br from-emerald-50 to-white p-1 shadow-sm ring-1 ring-emerald-100">
            <Image
              src="/images/unza_logo.jpg"
              width={36}
              height={36}
              alt="UNZA Logo"
              className="rounded-lg object-cover"
            />
          </div>

          {/* Title & Greeting */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase">
                Campus Navigator
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            <h1 className="text-base font-semibold text-gray-900 md:text-lg">
              Welcome back, <span className="text-emerald-700 font-bold">{userName || 'Student'}</span>
            </h1>
          </div>
        </div>

        {/* Right Section: Actions & Navigation */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Bookings Link */}
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CalendarDays className="h-4 w-4 text-gray-600" />
            <span>Bookings</span>
          </Link>

          {isAuthenticated ? (
            <>
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <LayoutDashboard className="h-4 w-4 text-gray-600" />
                <span>Dashboard</span>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-100 hover:text-red-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            /* Login Link */
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          )}

          {/* Divider */}
          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Notification Bell */}
          {isAuthenticated && <NotificationBell unreadCount={unreadCount} />}
        </div>

      </div>
    </header>
  );
}