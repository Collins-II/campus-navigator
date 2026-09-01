"use client";

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { CalendarDays, House, LayoutDashboard, LogOut, UserCircle2 } from 'lucide-react';

export function MobileNav() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const links = isAuthenticated
    ? [
        { href: '/', label: 'Home', icon: House },
        { href: '/bookings', label: 'Bookings', icon: CalendarDays },
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '#logout', label: 'Logout', icon: LogOut, action: 'logout' },
      ]
    : [
        { href: '/', label: 'Home', icon: House },
        { href: '/bookings', label: 'Bookings', icon: CalendarDays },
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/login', label: 'Profile', icon: UserCircle2 },
      ];

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[24px] border border-gray-300 bg-white/95 p-2 shadow-md shadow-gray-900/10 backdrop-blur-md xl:hidden">
      <div className="grid grid-cols-4 gap-2">
        {links.map(({ href, label, icon: Icon, action }) => {
          if (action === 'logout') {
            return (
              <button
                key={label}
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-red-700 transition hover:bg-red-50 hover:text-red-800"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
