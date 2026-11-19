import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, Tag, Trash2, X } from 'lucide-react';
import type { CartItem, Coupon } from '../types';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, formatINR } from '../utils/format';
import { SafeImage } from './SafeImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  appliedCoupon: { coupon: Coupon; discount: number } | null;
  onApplyCoupon: (code: string) => Promise<string | null>;
  onRemoveCoupon: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const afterDiscount = Math.max(0, subtotal - couponDiscount);
  const shippingFee = afterDiscount === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount);
  const shippingProgress = Math.min(100, Math.round((afterDiscount / FREE_SHIPPING_THRESHOLD) * 100));
  const total = afterDiscount + shippingFee;

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setValidating(true);
    setCouponError(null);
    const err = await onApplyCoupon(couponInput.trim());
    if (err) {
      setCouponError(err);
    } else {
      setCouponInput('');
    }
    setValidating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#111113] shadow-2xl"
        aria-label="Shopping Bag"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#F5F2EB]">Your Bag</h2>
            <p className="text-xs text-[#A19D94] tabular-nums">
              {items.reduce((acc, i) => acc + i.quantity, 0)} item(s) selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        {items.length > 0 && (
          <div className="border-b border-white/[0.08] bg-[#161619] px-6 py-3">
            <p className="text-xs text-[#F5F2EB]">
              {remainingForFreeShipping === 0 ? (
                <span className="text-[#D4AF37] font-medium">
                  Complimentary express shipping unlocked
                </span>
              ) : (
                <>
                  Add <strong className="tabular-nums text-[#D4AF37]">{formatINR(remainingForFreeShipping)}</strong> more for free express shipping
                </>
              )}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/10">
              <div
                className="h-full bg-[#D4AF37] transition-all duration-300"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <p className="font-serif text-lg text-[#F5F2EB]">Your bag is empty</p>
              <p className="mt-2 max-w-xs text-sm text-[#A19D94]">
                Explore aged Assam oud attars or curate your own 5-piece discovery sample kit.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 border border-[#D4AF37] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#D4AF37] uppercase transition-colors hover:bg-[#D4AF37] hover:text-[#0D0D0D] cursor-pointer"
              >
                Explore Fragrances
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.08]">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden border border-white/10 bg-[#18181B]">
                    <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-serif text-sm font-semibold text-[#F5F2EB]">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#A19D94]">{item.subtitle}</p>
                        {item.kitItems && (
                          <p className="mt-1 text-[11px] text-[#A19D94]/80 line-clamp-2">
                            {item.kitItems.map((k) => k.name).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        className="p-1 text-[#A19D94] hover:text-red-400 cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-white/15 bg-[#18181B]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, -1)}
                          className="flex h-8 w-8 items-center justify-center text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium tabular-nums text-[#F5F2EB]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, 1)}
                          className="flex h-8 w-8 items-center justify-center text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[#F5F2EB]">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Coupon & Summary Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/[0.08] bg-[#141416] p-6">
            {appliedCoupon ? (
              <div className="mb-4 flex items-center justify-between border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Tag className="h-3.5 w-3.5" />
                  <span>
                    <strong>{appliedCoupon.coupon.code}</strong> applied (−{formatINR(couponDiscount)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  className="text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <form onSubmit={handleCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Promo code (e.g. EID15)"
                    className="flex-1 border border-white/15 bg-[#0D0D0D] px-3 py-2 text-xs text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:border-[#D4AF37] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={validating}
                    className="border border-white/20 px-4 py-2 text-xs font-medium text-[#F5F2EB] transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50 cursor-pointer"
                  >
                    {validating ? 'Checking...' : 'Apply'}
                  </button>
                </form>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-[#A19D94]">
                  <span>Try:</span>
                  <button
                    type="button"
                    onClick={() => setCouponInput('WELCOME10')}
                    className="underline decoration-dotted hover:text-[#D4AF37] cursor-pointer"
                  >
                    WELCOME10
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponInput('EID15')}
                    className="underline decoration-dotted hover:text-[#D4AF37] cursor-pointer"
                  >
                    EID15
                  </button>
                </div>
                {couponError && <p className="mt-1.5 text-xs text-red-400">{couponError}</p>}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#A19D94]">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#F5F2EB]">{formatINR(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#D4AF37]">
                  <span>Promo Discount</span>
                  <span className="tabular-nums">−{formatINR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#A19D94]">
                <span>Shipping</span>
                <span className="tabular-nums text-[#F5F2EB]">
                  {shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/[0.08] pt-3 text-base font-semibold text-[#F5F2EB]">
                <span>Total</span>
                <span className="tabular-nums">{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="mt-5 flex w-full items-center justify-center gap-2 bg-[#D4AF37] py-3.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
