import type { ReactNode } from 'react';

export function SectionCard({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-md ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>}
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
