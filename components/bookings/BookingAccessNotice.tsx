import type { BookingAccess } from "@/lib/booking-policy";

export function BookingAccessNotice({ access }: { access: BookingAccess | null }) {
  if (!access || access.allowed) return null;
  return (
    <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p>{access.message}</p>
      {access.adminUrl && (
        <a href={access.adminUrl} className="mt-3 inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
          Open Central Admin
        </a>
      )}
    </div>
  );
}
