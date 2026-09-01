"use client";

import { FormEvent, useState } from "react";
import { CreditCard, ShieldCheck, X } from "lucide-react";

type PaymentInfo = {
  paymentMethod: "card" | "mobile-money" | "bank-transfer";
  provider: string;
  billingEmail: string;
  cardholderName: string;
  last4: string;
  status: "verified" | "pending" | "inactive";
};

type PaymentModalProps = {
  open: boolean;
  payment: PaymentInfo | null;
  onClose: () => void;
  onSaved: () => void;
};

export function PaymentModal({ open, payment, onClose, onSaved }: PaymentModalProps) {
  const [form, setForm] = useState<PaymentInfo>(() => ({
    paymentMethod: payment?.paymentMethod || "card",
    provider: payment?.provider || "Visa",
    billingEmail: payment?.billingEmail || "",
    cardholderName: payment?.cardholderName || "",
    last4: payment?.last4 || "",
    status: payment?.status || "verified",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: form.paymentMethod,
          provider: form.provider,
          billingEmail: form.billingEmail,
          cardholderName: form.cardholderName,
          last4: form.last4,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save payment details.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save payment details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80">Payment</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Billing details</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <CreditCard className="h-3.5 w-3.5" />
                Payment method
              </span>
              <select
                value={form.paymentMethod}
                onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as PaymentInfo["paymentMethod"] }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="card" className="bg-slate-900 text-white">Card</option>
                <option value="mobile-money" className="bg-slate-900 text-white">Mobile money</option>
                <option value="bank-transfer" className="bg-slate-900 text-white">Bank transfer</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Provider
              </span>
              <input
                value={form.provider}
                onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Visa / Airtel Money / Standard Bank"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <CreditCard className="h-3.5 w-3.5" />
              Billing email
            </span>
            <input
              type="email"
              value={form.billingEmail}
              onChange={(event) => setForm((current) => ({ ...current, billingEmail: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="billing@campus.example"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cardholder name
            </span>
            <input
              value={form.cardholderName}
              onChange={(event) => setForm((current) => ({ ...current, cardholderName: event.target.value }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="Student name"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <CreditCard className="h-3.5 w-3.5" />
              Last 4 digits
            </span>
            <input
              value={form.last4}
              maxLength={4}
              onChange={(event) => setForm((current) => ({ ...current, last4: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="1234"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Save payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
