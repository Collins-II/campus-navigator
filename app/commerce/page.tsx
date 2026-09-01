'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, ReceiptText, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

type StoreItem = { id: string; name: string; description: string; amount: number; itemType: string };
type Order = { reference: string; itemName: string; amount: number; currency: string; status: string; createdAt: string };

export default function CommercePage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState('ZMW');
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState('');
  const [message, setMessage] = useState('');

  const loadStore = async () => {
    const [catalogResponse, ordersResponse] = await Promise.all([fetch('/api/commerce/catalog'), fetch('/api/commerce/orders')]);
    const catalog = await catalogResponse.json();
    const orderData = await ordersResponse.json();
    if (!catalogResponse.ok) throw new Error(catalog.error || 'Unable to load campus store.');
    if (!ordersResponse.ok) throw new Error(orderData.error || 'Unable to load transactions.');
    setItems(catalog.items || []);
    setCurrency(catalog.currency || 'ZMW');
    setOrders(orderData.orders || []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStore().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load campus store.')).finally(() => setLoading(false));
  }, []);

  const startCheckout = async (itemId: string) => {
    setCheckoutId(itemId);
    setMessage('');
    try {
      const response = await fetch('/api/commerce/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start payment.');
      window.location.assign(result.paymentUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start payment.');
    } finally {
      setCheckoutId('');
    }
  };

  return (
    <main className="portal-shell min-h-screen p-4 text-slate-50 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300/80">Student services</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Campus store</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">Pay for official campus services securely through DPO.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 md:self-auto"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        </header>

        {message ? <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</div> : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-emerald-300" /><h2 className="text-lg font-semibold">Available services</h2></div>
            {loading ? <p className="text-sm text-slate-400">Loading services...</p> : <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-5"><div className="flex min-h-32 flex-col justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.itemType.replace('-', ' ')}</p><h3 className="mt-2 text-lg font-semibold text-white">{item.name}</h3><p className="mt-2 text-sm text-slate-400">{item.description}</p></div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-lg font-semibold text-emerald-300">{currency} {item.amount.toFixed(2)}</span><button type="button" onClick={() => void startCheckout(item.id)} disabled={checkoutId !== ''} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{checkoutId === item.id ? 'Starting...' : 'Pay with DPO'}<ExternalLink className="h-3.5 w-3.5" /></button></div></div></article>)}</div>}
          </div>

          <aside className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-5"><div className="mb-5 flex items-center gap-3"><ReceiptText className="h-5 w-5 text-indigo-300" /><h2 className="text-lg font-semibold">Recent transactions</h2></div>{orders.length === 0 ? <p className="text-sm text-slate-400">Your completed and pending payments will appear here.</p> : <div className="space-y-3">{orders.map((order) => <div key={order.reference} className="border-b border-slate-800 pb-3 last:border-0"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-white">{order.itemName}</p><span className={`text-[10px] font-semibold uppercase tracking-wide ${order.status === 'paid' ? 'text-emerald-300' : order.status === 'failed' ? 'text-rose-300' : 'text-amber-300'}`}>{order.status}</span></div><p className="mt-1 text-xs text-slate-500">{order.reference} · {order.currency} {order.amount.toFixed(2)}</p></div>)}</div>}</aside>
        </section>
      </div>
    </main>
  );
}