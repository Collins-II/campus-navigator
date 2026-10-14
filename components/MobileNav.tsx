"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useChatUnread } from '@/lib/ChatUnreadContext';
import { CalendarDays, House, LayoutDashboard, Navigation, UserCircle2 } from 'lucide-react';

export function MobileNav() {
  const { status } = useSession();
  const { unread } = useChatUnread();
  const pathname = usePathname();
  const isAuthenticated = status === 'authenticated';

  const links = [
    { href: '/', label: 'Home', icon: House },
    { href: '/navigation', label: 'Navigate', icon: Navigation },
    { href: '/bookings', label: 'Bookings', icon: CalendarDays },
    isAuthenticated
      ? { href: '/dashboard', label: 'Account', icon: LayoutDashboard }
      : { href: '/login', label: 'Log in', icon: UserCircle2 },
  ];

  if (pathname === '/login') return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[1100] border-t-[3px] border-[#008236] bg-black pb-[env(safe-area-inset-bottom)] xl:hidden"
    >
      <div className="grid grid-cols-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                active ? 'text-white shadow-[inset_0_3px_0_0_#008236]' : 'text-gray-500 hover:text-gray-200'
              }`}
            >
              <span className="relative">
                <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : ''}`} />
                {href === '/chat' && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008236] px-1 text-[10px] font-black text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}