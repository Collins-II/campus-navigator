"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { BookingForm, type EditableBooking } from "@/components/bookings/BookingForm";

type Props = {
  open: boolean;
  onClose: () => void;
  booking?: EditableBooking | null;
  defaultRoomName?: string;
  onSaved: () => void;
};

export function BookingModal({ open, onClose, booking, defaultRoomName, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      aria-labelledby="booking-modal-title"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {open && <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Lecture room reservations</p>
            <h2 id="booking-modal-title" className="mt-2 text-2xl font-semibold tracking-tight">{booking ? "Update your booking" : "Make room for your next idea."}</h2>
            <p className="mt-2 text-sm text-slate-500">Tutorial Groups and campus events, thoughtfully planned.</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close booking form" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>
        <BookingForm key={`${booking?.id ?? "new"}-${defaultRoomName ?? ""}`} booking={booking} defaultRoomName={defaultRoomName} onCancel={onClose} onSaved={() => { onSaved(); onClose(); }} />
      </div>}
    </dialog>
  );
}
