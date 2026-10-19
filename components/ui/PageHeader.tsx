import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';
import { CampusNavbar } from './CampusNavbar';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow = 'Campus Navigator', title, subtitle, backHref = '/', actions }: PageHeaderProps) {
  return (
    <header className="relative z-10 mb-6 min-w-0 pt-[env(safe-area-inset-top)]">
      <CampusNavbar />
      <div className="mt-6 flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg shadow-black/10 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[10px] font-semibold uppercase leading-5 tracking-[0.16em] text-emerald-700 sm:text-[11px]">
              {eyebrow}
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}

export function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (['confirmed', 'paid', 'available', 'open', 'completed'].includes(s)) return 'ui-badge ui-badge-success';
  if (['pending', 'busy', 'processing'].includes(s)) return 'ui-badge ui-badge-warning';
  if (['failed', 'cancelled', 'rejected'].includes(s)) return 'ui-badge ui-badge-danger';
  return 'ui-badge ui-badge-neutral';
}
