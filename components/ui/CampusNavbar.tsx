'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { useNotifications } from '@/lib/useNotifications';

function NavbarNotifications() {
  const { unreadCount } = useNotifications();
  return (
    <div className="rounded-full bg-white shadow-lg shadow-black/10">
      <NotificationBell unreadCount={unreadCount} />
    </div>
  );
}

export function CampusNavbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === 'authenticated';
  const links = [
    { href: '/navigation', label: 'Navigate' },
    { href: '/bookings', label: 'Bookings' },
    ...(isAuthenticated ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ];

  return (
    <div className="pointer-events-auto flex min-w-0 flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        aria-label="UNZA Nav home"
        className="flex shrink-0 items-center gap-2.5 border-b-[3px] border-[#0d7739] bg-transparent py-1.5 pl-1.5 pr-4 shadow-lg shadow-black/30 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
      >
        <Image src="/images/unza_logo.jpg" width={36} height={36} alt="UNZA" className="rounded-full" />
        <span className="text-sm font-black uppercase tracking-wider text-[#0d7739]">UNZA<span className="text-black">Nav</span></span>
      </Link>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <nav aria-label="Campus navigation" className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-lg shadow-black/10 xl:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-medium text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${pathname === href ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-gray-100'}`}>
              {label}
            </Link>
          ))}
        </nav>
        {isAuthenticated && <NavbarNotifications />}
        {isAuthenticated ? (
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} aria-label="Log out" className="hidden h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 xl:flex">
            <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
          </button>
        ) : status === 'unauthenticated' && pathname !== '/login' ? (
          <Link href="/login" className="flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
            <LogIn aria-hidden="true" className="h-4 w-4" /> Log in
          </Link>
        ) : null}
      </div>
    </div>
  );
}
