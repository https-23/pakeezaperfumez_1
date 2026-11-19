import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, Lock, MessageCircle, ShieldCheck, Smartphone, X } from 'lucide-react';
import type { CartItem, Coupon, Order, PaymentMethod } from '../types';
import {
  FREE_SHIPPING_THRESHOLD,
  PARTIAL_COD_ADVANCE,
  STANDARD_SHIPPING_FEE,
  buildWhatsAppLink,
  formatINR,
} from '../utils/format';
import { SafeImage } from '../components/SafeImage';

interface CheckoutViewProps {
  items: CartItem[];
  appliedCoupon: { coupon: Coupon; discount: number } | null;
  onBackToShop: () => void;
  onOrderCompleted: (order: Order) => void;
  onTrackOrder: (orderId: string) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  items,
  appliedCoupon,
  onBackToShop,
  onOrderCompleted,
  onTrackOrder,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('prepaid');

  const [error, setError] = useState<string | null>(null);
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [gatewayChannel, setGatewayChannel] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  const prepaidDiscount = paymentMethod === 'prepaid' ? Math.round(afterCoupon * 0.05) : 0;
  const discountedSubtotal = Math.max(0, afterCoupon - prepaidDiscount);
  const shippingFee =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_FEE;
  const total = discountedSubtotal + shippingFee;
  const payableNow =
    paymentMethod === 'prepaid'
      ? total
      : paymentMethod === 'partial_cod'
      ? Math.min(total, PARTIAL_COD_ADVANCE)
      : 0;
  const balanceOnDelivery = Math.max(0, total - payableNow);

  const handleDirectCodOrder = async () => {
    setProcessingPayment(true);
    setError(null);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          address,
          city,
          pincode,
          items,
          couponCode: appliedCoupon?.coupon.code,
          paymentMethod: 'cod',
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order placement failed');
      setConfirmedOrder(orderData.order);
      onOrderCompleted(orderData.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleProceedToPay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName.trim() || !address.trim() || !city.trim()) {
      setError('Please complete your full name, street address, and city.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('Please enter a valid 6-digit Indian pincode.');
      return;
    }
    if (paymentMethod === 'cod') {
      handleDirectCodOrder();
      return;
    }
    setGatewayModalOpen(true);
  };

  const handleConfirmGatewayPayment = async () => {
    setProcessingPayment(true);
    setError(null);
    try {
      // 1. Create server-signed payment intent
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payableNow }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) throw new Error(intentData.error || 'Payment initialization failed');

      // 2. Submit order with signed verification payload
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          address,
          city,
          pincode,
          items,
          couponCode: appliedCoupon?.coupon.code,
          paymentMethod,
          gatewayOrderId: intentData.gatewayOrderId,
          paymentId: intentData.paymentId,
          signature: intentData.signature,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order placement failed');

      setGatewayModalOpen(false);
      setConfirmedOrder(orderData.order);
      onOrderCompleted(orderData.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setGatewayModalOpen(false);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (confirmedOrder) {
    const waLink = buildWhatsAppLink(
      `Order Confirmed! Order ID: ${confirmedOrder.id}\nName: ${confirmedOrder.customerName}\nTotal: ${formatINR(confirmedOrder.total)}\nPayment: ${confirmedOrder.paymentStatus} (Paid Now: ${formatINR(confirmedOrder.advancePaid)})`
    );

    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="border border-[#D4AF37]/40 bg-[#121214] p-7 sm:p-10">
          <div className="flex items-center gap-3 text-[#D4AF37]">
            <CheckCircle2 className="h-7 w-7 shrink-0" />
            <div>
              <p className="text-xs font-medium tracking-[0.18em] uppercase">Order Confirmed</p>
              <h1 className="font-serif text-2xl font-semibold text-[#F5F2EB] sm:text-3xl">
                Thank you, {confirmedOrder.customerName}
              </h1>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/[0.08] py-5 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#A19D94]">Order ID</p>
              <p className="mt-1 font-mono font-semibold text-[#D4AF37]">{confirmedOrder.id}</p>
            </div>
            <div>
              <p className="text-xs text-[#A19D94]">Payment Status</p>
              <p className="mt-1 font-medium text-[#F5F2EB]">{confirmedOrder.paymentStatus}</p>
            </div>
            <div>
              <p className="text-xs text-[#A19D94]">Paid Online</p>
              <p className="mt-1 font-semibold tabular-nums text-[#F5F2EB]">
                {formatINR(confirmedOrder.advancePaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A19D94]">Due on Delivery</p>
              <p className="mt-1 font-semibold tabular-nums text-[#F5F2EB]">
                {formatINR(confirmedOrder.balanceDue)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-[#A19D94] uppercase">
              Items Reserved
            </h2>
            {confirmedOrder.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-[#F5F2EB]">
                  {item.name} ({item.subtitle}) × {item.quantity}
                </span>
                <span className="tabular-nums text-[#A19D94]">
                  {formatINR(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onTrackOrder(confirmedOrder.id)}
              className="flex-1 bg-[#D4AF37] py-3.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] cursor-pointer"
            >
              Track Order Status
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 border border-white/20 py-3.5 text-xs font-medium tracking-wider text-[#F5F2EB] uppercase hover:border-[#D4AF37] hover:text-[#D4AF37]"
            >
              <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
              <span>Get Receipt on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold text-[#F5F2EB]">Your Bag is Empty</h1>
        <p className="mt-2 text-sm text-[#A19D94]">
          Add an attar, perfume, or custom sample kit before checking out.
        </p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-6 bg-[#D4AF37] px-6 py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase cursor-pointer"
        >
          Browse Collection
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBackToShop}
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider text-[#A19D94] uppercase hover:text-[#D4AF37] cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Continue Shopping</span>
      </button>

      <h1 className="mt-4 font-serif text-3xl font-semibold text-[#F5F2EB]">Express Checkout</h1>

      <form onSubmit={handleProceedToPay} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Address & Payment Method */}
        <div className="space-y-8 lg:col-span-7">
          <div className="border border-white/[0.08] bg-[#121214] p-6 sm:p-8">
            <h2 className="font-serif text-xl font-semibold text-[#F5F2EB]">Delivery Address</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-xs text-[#A19D94]">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs text-[#A19D94]">10-Digit Mobile (WhatsApp Updates)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm tabular-nums text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-[#A19D94]">House No., Street, Landmark</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat 302, Noor Residency, Near Central Mosque"
                  className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A19D94]">City / State</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lucknow, UP"
                  className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A19D94]">Pincode</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="226001"
                  className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm tabular-nums text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Choice */}
          <div className="border border-white/[0.08] bg-[#121214] p-6 sm:p-8">
            <h2 className="font-serif text-xl font-semibold text-[#F5F2EB]">Payment Option</h2>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('prepaid')}
                className={`flex w-full items-start justify-between gap-4 border p-4 text-left transition-colors cursor-pointer ${
                  paymentMethod === 'prepaid'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-[#0D0D0D] hover:border-white/30'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F2EB]">
                    Full Online Payment (UPI / PhonePe / GPay / Cards)
                  </p>
                  <p className="mt-1 text-xs text-[#D4AF37]">
                    Extra 5% Prepaid Discount applied automatically
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#D4AF37]">
                  5% Off
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('partial_cod')}
                className={`flex w-full items-start justify-between gap-4 border p-4 text-left transition-colors cursor-pointer ${
                  paymentMethod === 'partial_cod'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-[#0D0D0D] hover:border-white/30'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F2EB]">
                    Partial Cash on Delivery (₹99 Advance UPI)
                  </p>
                  <p className="mt-1 text-xs text-[#A19D94]">
                    Pay ₹99 via UPI now to confirm dispatch; pay remaining balance on delivery.
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#F5F2EB] shrink-0">
                  ₹99 Now
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`flex w-full items-start justify-between gap-4 border p-4 text-left transition-colors cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/15 bg-[#0D0D0D] hover:border-white/30'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F2EB]">
                    Direct Cash on Delivery (Full COD)
                  </p>
                  <p className="mt-1 text-xs text-[#A19D94]">
                    Zero online payment required now. Pay full amount in cash or UPI at your doorstep.
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#F5F2EB] shrink-0">
                  ₹0 Now
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 border border-white/[0.08] bg-[#121214] p-6 sm:p-8">
            <h2 className="font-serif text-xl font-semibold text-[#F5F2EB]">Order Summary</h2>
            <ul className="mt-5 divide-y divide-white/[0.08]">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden border border-white/10">
                    <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[#F5F2EB]">{item.name}</p>
                    <p className="text-xs text-[#A19D94]">
                      {item.subtitle} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-[#F5F2EB]">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4 text-sm">
              <div className="flex justify-between text-[#A19D94]">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#F5F2EB]">{formatINR(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#D4AF37]">
                  <span>Coupon ({appliedCoupon?.coupon.code})</span>
                  <span className="tabular-nums">−{formatINR(couponDiscount)}</span>
                </div>
              )}
              {prepaidDiscount > 0 && (
                <div className="flex justify-between text-[#D4AF37]">
                  <span>5% Prepaid Discount</span>
                  <span className="tabular-nums">−{formatINR(prepaidDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#A19D94]">
                <span>Shipping</span>
                <span className="tabular-nums text-[#F5F2EB]">
                  {shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/[0.08] pt-3 text-base font-semibold text-[#F5F2EB]">
                <span>Order Total</span>
                <span className="tabular-nums">{formatINR(total)}</span>
              </div>

              {(paymentMethod === 'partial_cod' || paymentMethod === 'cod') && (
                <div className="mt-3 space-y-1 border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-3 text-xs">
                  <div className="flex justify-between font-semibold text-[#D4AF37]">
                    <span>Payable Now Online</span>
                    <span className="tabular-nums">{formatINR(payableNow)}</span>
                  </div>
                  <div className="flex justify-between text-[#A19D94]">
                    <span>Payable on Delivery</span>
                    <span className="tabular-nums">{formatINR(balanceOnDelivery)}</span>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={processingPayment}
              className="mt-6 flex w-full min-h-[48px] items-center justify-center gap-2 bg-[#D4AF37] py-3.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:opacity-60 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>
                {processingPayment
                  ? 'Confirming Order...'
                  : paymentMethod === 'cod'
                  ? `Confirm Direct COD Order (${formatINR(total)})`
                  : `Pay ${formatINR(payableNow)} & Place Order`}
              </span>
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#A19D94]">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
              <span>256-bit Encrypted Razorpay Checkout Flow</span>
            </div>
          </div>
        </div>
      </form>

      {/* Razorpay-Style Payment Verification Modal */}
      {gatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/15 bg-[#141416] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#18181B] px-6 py-4">
              <div>
                <p className="text-[11px] font-medium tracking-wider text-[#D4AF37] uppercase">
                  Pakeeza Perfumez Checkout
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#F5F2EB]">
                  Pay {formatINR(payableNow)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGatewayModalOpen(false)}
                className="p-1 text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
                aria-label="Cancel payment"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGatewayChannel('upi')}
                  className={`flex items-center justify-center gap-2 border py-2.5 text-xs font-medium cursor-pointer ${
                    gatewayChannel === 'upi'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F5F2EB]'
                      : 'border-white/15 text-[#A19D94]'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-[#D4AF37]" />
                  <span>UPI / GPay / PhonePe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayChannel('card')}
                  className={`flex items-center justify-center gap-2 border py-2.5 text-xs font-medium cursor-pointer ${
                    gatewayChannel === 'card'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F5F2EB]'
                      : 'border-white/15 text-[#A19D94]'
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-[#D4AF37]" />
                  <span>Card / NetBanking</span>
                </button>
              </div>

              {gatewayChannel === 'upi' ? (
                <div className="mt-5 space-y-4">
                  <div className="border border-white/10 bg-[#0D0D0D] p-4 text-center">
                    <p className="text-xs text-[#A19D94]">
                      Instant UPI Verification · PhonePe / GPay / Paytm
                    </p>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="Enter UPI ID (optional, e.g. name@oksbi)"
                      className="mt-3 w-full border border-white/15 bg-[#141416] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3 border border-white/10 bg-[#0D0D0D] p-4">
                  <p className="text-xs text-[#A19D94]">
                    Visa / Mastercard / RuPay encrypted verification
                  </p>
                  <input
                    type="text"
                    defaultValue="4242 •••• •••• 4242"
                    aria-label="Card number"
                    className="w-full border border-white/15 bg-[#141416] px-3 py-2 text-xs font-mono text-[#F5F2EB]"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={processingPayment}
                onClick={handleConfirmGatewayPayment}
                className="mt-6 flex w-full items-center justify-center gap-2 bg-[#D4AF37] py-3.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:opacity-60 cursor-pointer"
              >
                {processingPayment ? 'Verifying Signature...' : `Complete Payment (${formatINR(payableNow)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
