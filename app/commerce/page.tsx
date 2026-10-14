'use client';

import { ExternalLink, ReceiptText, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHeader, statusBadgeClass } from '@/components/ui/PageHeader';

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
    void loadStore()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load campus store.'))
      .finally(() => setLoading(false));
  }, []);

  const startCheckout = async (itemId: string) => {
    setCheckoutId(itemId);
    setMessage('');
    try {
      const response = await fetch('/api/commerce/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start payment.');
      window.location.assign(result.paymentUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start payment.');
      setCheckoutId('');
    }
  };

  return (
    <main className="ui-page">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Student services"
          title="Campus store"
          subtitle="Pay for official campus services securely through DPO."
          backHref="/dashboard"
        />

        {message ? (
          <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Available services
            </h2>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-200/70" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="ui-card text-center text-sm text-gray-600">No services are available right now.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <article key={item.id} className="ui-card flex flex-col justify-between gap-5">
                    <div>
                      <span className="ui-badge ui-badge-neutral">{item.itemType.replace('-', ' ')}</span>
                      <h3 className="mt-3 text-lg font-bold">{item.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl font-extrabold text-emerald-700">
                        {currency} {item.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void startCheckout(item.id)}
                        disabled={checkoutId !== ''}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        {checkoutId === item.id ? 'Starting...' : 'Pay with DPO'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="ui-card h-fit">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ReceiptText className="h-5 w-5 text-emerald-600" /> Recent transactions
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-600">Your completed and pending payments will appear here.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <li key={order.reference} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{order.itemName}</p>
                      <span className={statusBadgeClass(order.status)}>{order.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.reference} · {order.currency} {order.amount.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
