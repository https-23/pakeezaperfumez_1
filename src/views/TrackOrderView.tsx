import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Package, Search, Truck } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import { formatINR } from '../utils/format';

interface TrackOrderViewProps {
  initialQuery?: string;
}

const STEPS: OrderStatus[] = ['Pending', 'Packed', 'Shipped', 'Delivered'];

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery || 'PKZ-1001');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runLookup = async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setOrders([]);
        setError(data.error || 'No matching order found.');
      } else {
        setOrders(data.orders || []);
      }
    } catch {
      setError('Unable to reach tracking server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runLookup(initialQuery);
    } else {
      runLookup('PKZ-1001');
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runLookup(query);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
          Live Dispatch Status
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#F5F2EB]">
          Track Your Pakeeza Perfumez Order
        </h1>
        <p className="mt-2 text-sm text-[#A19D94]">
          Enter your Order ID (e.g. PKZ-1001) or registered 10-digit mobile number.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#A19D94]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order ID (PKZ-1001) or Phone Number"
              className="w-full border border-white/15 bg-[#121214] py-3 pr-4 pl-10 text-sm text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[46px] bg-[#D4AF37] px-7 py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Checking...' : 'Track Order'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#A19D94]">
          <span>Sample orders:</span>
          <button
            type="button"
            onClick={() => {
              setQuery('PKZ-1001');
              runLookup('PKZ-1001');
            }}
            className="underline decoration-dotted hover:text-[#D4AF37] cursor-pointer"
          >
            PKZ-1001 (Shipped)
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('PKZ-1002');
              runLookup('PKZ-1002');
            }}
            className="underline decoration-dotted hover:text-[#D4AF37] cursor-pointer"
          >
            PKZ-1002 (Partial COD)
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-8 border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-8">
        {orders.map((order) => {
          const currentStepIdx = STEPS.indexOf(order.orderStatus);
          const isCancelled = order.orderStatus === 'Cancelled';

          return (
            <div key={order.id} className="border border-white/[0.08] bg-[#121214] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-semibold text-[#D4AF37]">{order.id}</span>
                    <span className="text-xs text-[#A19D94]">
                      · Placed {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#F5F2EB]">
                    {order.customerName} · {order.city} ({order.pincode})
                  </p>
                </div>

                <div className="text-right tabular-nums">
                  <p className="text-base font-semibold text-[#F5F2EB]">{formatINR(order.total)}</p>
                  <p className="text-xs text-[#A19D94]">
                    {order.paymentStatus}
                    {order.balanceDue > 0 ? ` · ${formatINR(order.balanceDue)} due on delivery` : ''}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              {isCancelled ? (
                <div className="my-6 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  This order was cancelled.
                </div>
              ) : (
                <div className="my-8 grid grid-cols-4 gap-2">
                  {STEPS.map((step, idx) => {
                    const reached = idx <= currentStepIdx;
                    return (
                      <div key={step} className="flex flex-col items-center text-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                            reached
                              ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0D]'
                              : 'border-white/15 bg-[#0D0D0D] text-[#A19D94]'
                          }`}
                        >
                          {reached ? <Check className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span
                          className={`mt-2 text-xs font-medium ${
                            reached ? 'text-[#F5F2EB]' : 'text-[#A19D94]/60'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Courier info */}
              {order.trackingNumber && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#18181B] px-4 py-3 text-xs">
                  <div className="flex items-center gap-2.5 text-[#F5F2EB]">
                    <Truck className="h-4 w-4 text-[#D4AF37]" />
                    <span>
                      {order.courierName || 'Express Courier'} · AWB:{' '}
                      <strong className="font-mono text-[#D4AF37]">{order.trackingNumber}</strong>
                    </span>
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#D4AF37] hover:underline"
                    >
                      <span>Courier Live Link</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 border-t border-white/[0.08] pt-5">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#A19D94] uppercase">
                  <Package className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Shipment Contents</span>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-[#F5F2EB]">
                      {item.name} ({item.subtitle}) × {item.quantity}
                    </span>
                    <span className="tabular-nums text-[#A19D94]">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
