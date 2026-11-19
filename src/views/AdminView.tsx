import React, { useEffect, useState } from 'react';
import { Lock, LogOut, Plus, Trash2, Upload } from 'lucide-react';
import type { Coupon, Gender, Occasion, Order, OrderStatus, Product, ScentFamily } from '../types';
import { formatINR } from '../utils/format';
import { SafeImage } from '../components/SafeImage';

interface AdminViewProps {
  onCatalogUpdated: () => void;
}

interface DashboardKPIs {
  totalRevenue: number;
  advanceCollected: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockCount: number;
}

export const AdminView: React.FC<AdminViewProps> = ({ onCatalogUpdated }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pkz_admin_token'));
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'coupons'>('orders');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(false);

  // New Product Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pTagline, setPTagline] = useState('');
  const [pType, setPType] = useState<'Attar' | 'Perfume'>('Attar');
  const [pFamily, setPFamily] = useState<ScentFamily>('Oud');
  const [pOccasion, setPOccasion] = useState<Occasion>('Party');
  const [pGender, setPGender] = useState<Gender>('Unisex');
  const [pImageUrl, setPImageUrl] = useState('/src/assets/images/product_royal_oud_1795085479966.jpg');
  const [pUploading, setPUploading] = useState(false);
  const [pPriceSmall, setPPriceSmall] = useState('399');
  const [pPriceMed, setPPriceMed] = useState('749');
  const [pPriceLarge, setPPriceLarge] = useState('1299');
  const [pNotesTop, setPNotesTop] = useState('Saffron, Cardamom');
  const [pNotesHeart, setPNotesHeart] = useState('Aged Oud, Rose');
  const [pNotesBase, setPNotesBase] = useState('Amber, Sandalwood');
  const [pLongevity, setPLongevity] = useState('14');

  // New Coupon Form State
  const [cCode, setCCode] = useState('');
  const [cType, setCType] = useState<'percent' | 'flat'>('percent');
  const [cValue, setCValue] = useState('15');
  const [cMinOrder, setCMinOrder] = useState('799');
  const [cDesc, setCDesc] = useState('');

  // Order edits cache
  const [orderDrafts, setOrderDrafts] = useState<
    Record<string, { orderStatus: OrderStatus; courierName: string; trackingNumber: string }>
  >({});

  const fetchDashboard = async (authToken: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('pkz_admin_token');
        setToken(null);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setCoupons(data.coupons || []);
      setKpis(data.kpis || null);

      const drafts: Record<string, { orderStatus: OrderStatus; courierName: string; trackingNumber: string }> = {};
      for (const o of data.orders || []) {
        drafts[o.id] = {
          orderStatus: o.orderStatus,
          courierName: o.courierName || '',
          trackingNumber: o.trackingNumber || '',
        };
      }
      setOrderDrafts(drafts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Incorrect password');
      return;
    }
    localStorage.setItem('pkz_admin_token', data.token);
    setToken(data.token);
    setPassword('');
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    localStorage.removeItem('pkz_admin_token');
    setToken(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setPUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dataUrl: reader.result,
            filename: file.name.split('.')[0],
          }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setPImageUrl(data.url);
        }
      } finally {
        setPUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !pName.trim()) return;
    const labels = pType === 'Attar' ? ['3ml', '6ml', '12ml'] : ['12ml', '30ml', '50ml'];
    const prices = [Number(pPriceSmall) || 399, Number(pPriceMed) || 749, Number(pPriceLarge) || 1299];

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: pName,
        tagline: pTagline || `${pFamily} ${pType} crafted in small batches`,
        type: pType,
        scentFamily: pFamily,
        occasion: pOccasion,
        gender: pGender,
        images: [pImageUrl],
        variants: labels.map((label, idx) => ({
          label,
          price: prices[idx],
          stock: 20,
        })),
        notes: {
          top: pNotesTop.split(',').map((s) => s.trim()).filter(Boolean),
          heart: pNotesHeart.split(',').map((s) => s.trim()).filter(Boolean),
          base: pNotesBase.split(',').map((s) => s.trim()).filter(Boolean),
        },
        longevityHours: Number(pLongevity) || 14,
        projectionScore: 8,
        isBestseller: true,
      }),
    });

    if (res.ok) {
      setShowProductForm(false);
      setPName('');
      setPTagline('');
      await fetchDashboard(token);
      onCatalogUpdated();
    }
  };

  const handleToggleOutOfStock = async (product: Product) => {
    if (!token) return;
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isOutOfStock: !product.isOutOfStock }),
    });
    await fetchDashboard(token);
    onCatalogUpdated();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!token) return;
    await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchDashboard(token);
    onCatalogUpdated();
  };

  const handleSaveOrder = async (orderId: string) => {
    if (!token) return;
    const draft = orderDrafts[orderId];
    if (!draft) return;
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(draft),
    });
    await fetchDashboard(token);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cCode.trim()) return;
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: cCode,
        discountType: cType,
        value: Number(cValue),
        minOrder: Number(cMinOrder),
        description: cDesc || `${cCode.toUpperCase()} discount`,
      }),
    });
    setCCode('');
    setCDesc('');
    await fetchDashboard(token);
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    if (!token) return;
    await fetch(`/api/admin/coupons/${coupon.code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    await fetchDashboard(token);
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!token) return;
    await fetch(`/api/admin/coupons/${code}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchDashboard(token);
  };

  if (!token) {
    return (
      <section className="mx-auto max-w-md px-4 py-16">
        <div className="border border-white/[0.08] bg-[#121214] p-8">
          <div className="flex items-center gap-2.5 text-[#D4AF37]">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-medium tracking-[0.18em] uppercase">Seller Console</span>
          </div>
          <h1 className="mt-3 font-serif text-2xl font-semibold text-[#F5F2EB]">
            Pakeeza Perfumez Admin Login
          </h1>
          <p className="mt-2 text-xs text-[#A19D94]">
            Manage inventory, upload perfume photos, dispatch orders, and configure promo codes.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs text-[#A19D94]">Admin Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter seller password"
                className="mt-1.5 w-full border border-white/15 bg-[#0D0D0D] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
              <p className="mt-2 text-[11px] text-[#A19D94]/80">
                Demo seller password: <code className="font-mono text-[#D4AF37]">paakeezah2026</code>
              </p>
            </div>
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-[#D4AF37] py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase hover:bg-[#E2C258] cursor-pointer"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
            Seller Dashboard
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[#F5F2EB]">
            Pakeeza Perfumez Store Operations
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-xs font-medium text-[#A19D94] hover:border-[#D4AF37] hover:text-[#F5F2EB] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* KPI Strip */}
      {kpis && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-xs text-[#A19D94]">Gross Revenue</p>
            <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-[#F5F2EB]">
              {formatINR(kpis.totalRevenue)}
            </p>
          </div>
          <div className="border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-xs text-[#A19D94]">Online Advance Collected</p>
            <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-[#D4AF37]">
              {formatINR(kpis.advanceCollected)}
            </p>
          </div>
          <div className="border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-xs text-[#A19D94]">Total Orders</p>
            <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-[#F5F2EB]">
              {kpis.totalOrders} ({kpis.pendingOrders} active)
            </p>
          </div>
          <div className="border border-white/[0.08] bg-[#121214] p-5">
            <p className="text-xs text-[#A19D94]">Low / Out of Stock</p>
            <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-[#F5F2EB]">
              {kpis.lowStockCount} products
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mt-8 flex items-center gap-2 border-b border-white/[0.08]">
        {(['orders', 'products', 'coupons'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-[#A19D94] hover:text-[#F5F2EB]'
            }`}
          >
            {tab === 'orders'
              ? `Orders (${orders.length})`
              : tab === 'products'
              ? `Products (${products.length})`
              : `Coupons (${coupons.length})`}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-[#A19D94]">Refreshing store records...</p>}

      {/* Orders Manager */}
      {activeTab === 'orders' && (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const draft = orderDrafts[order.id] || {
              orderStatus: order.orderStatus,
              courierName: order.courierName || '',
              trackingNumber: order.trackingNumber || '',
            };
            return (
              <div
                key={order.id}
                className="border border-white/[0.08] bg-[#121214] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#D4AF37]">{order.id}</p>
                    <p className="mt-1 text-sm font-medium text-[#F5F2EB]">
                      {order.customerName} · {order.phone}
                    </p>
                    <p className="text-xs text-[#A19D94]">
                      {order.address}, {order.city} — {order.pincode}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-base font-semibold text-[#F5F2EB]">{formatINR(order.total)}</p>
                    <p className="text-xs text-[#D4AF37]">
                      {order.paymentStatus} (Paid: {formatINR(order.advancePaid)})
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#A19D94]">
                  {order.items.map((i, idx) => (
                    <span key={idx}>
                      {i.name} ({i.subtitle}) ×{i.quantity}
                      {idx < order.items.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <select
                    value={draft.orderStatus}
                    onChange={(e) =>
                      setOrderDrafts((prev) => ({
                        ...prev,
                        [order.id]: { ...draft, orderStatus: e.target.value as OrderStatus },
                      }))
                    }
                    className="border border-white/15 bg-[#0D0D0D] px-3 py-2 text-xs text-[#F5F2EB]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <input
                    type="text"
                    value={draft.courierName}
                    onChange={(e) =>
                      setOrderDrafts((prev) => ({
                        ...prev,
                        [order.id]: { ...draft, courierName: e.target.value },
                      }))
                    }
                    placeholder="Courier (e.g. Shiprocket)"
                    className="border border-white/15 bg-[#0D0D0D] px-3 py-2 text-xs text-[#F5F2EB]"
                  />

                  <input
                    type="text"
                    value={draft.trackingNumber}
                    onChange={(e) =>
                      setOrderDrafts((prev) => ({
                        ...prev,
                        [order.id]: { ...draft, trackingNumber: e.target.value },
                      }))
                    }
                    placeholder="AWB Tracking Number"
                    className="border border-white/15 bg-[#0D0D0D] px-3 py-2 text-xs font-mono text-[#F5F2EB]"
                  />

                  <button
                    type="button"
                    onClick={() => handleSaveOrder(order.id)}
                    className="bg-[#D4AF37] py-2 text-xs font-semibold text-[#0D0D0D] uppercase hover:bg-[#E2C258] cursor-pointer"
                  >
                    Update Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Manager */}
      {activeTab === 'products' && (
        <div className="mt-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowProductForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-[#D4AF37] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase hover:bg-[#E2C258] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{showProductForm ? 'Close Form' : 'Add New Fragrance'}</span>
            </button>
          </div>

          {showProductForm && (
            <form
              onSubmit={handleCreateProduct}
              className="mt-5 border border-[#D4AF37]/35 bg-[#121214] p-6"
            >
              <h2 className="font-serif text-xl font-semibold text-[#F5F2EB]">
                Add Perfume or Attar (No-Code)
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-[#A19D94]">Fragrance Name</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Sultan Amber Oud"
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">Tagline</label>
                  <input
                    type="text"
                    value={pTagline}
                    onChange={(e) => setPTagline(e.target.value)}
                    placeholder="Warm smoky resin & saffron"
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">Format</label>
                  <select
                    value={pType}
                    onChange={(e) => setPType(e.target.value as 'Attar' | 'Perfume')}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  >
                    <option value="Attar">Attar (3ml / 6ml / 12ml)</option>
                    <option value="Perfume">Perfume (12ml / 30ml / 50ml)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#A19D94]">Scent Family</label>
                  <select
                    value={pFamily}
                    onChange={(e) => setPFamily(e.target.value as ScentFamily)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  >
                    <option value="Oud">Oud</option>
                    <option value="Floral">Floral</option>
                    <option value="Woody">Woody</option>
                    <option value="Musk">Musk</option>
                    <option value="Fresh">Fresh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#A19D94]">Occasion</label>
                  <select
                    value={pOccasion}
                    onChange={(e) => setPOccasion(e.target.value as Occasion)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  >
                    <option value="Party">Party</option>
                    <option value="Festive">Festive</option>
                    <option value="Office">Office</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#A19D94]">Gender Profile</label>
                  <select
                    value={pGender}
                    onChange={(e) => setPGender(e.target.value as Gender)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#A19D94]">
                    {pType === 'Attar' ? '3ml Price (₹)' : '12ml Price (₹)'}
                  </label>
                  <input
                    type="number"
                    value={pPriceSmall}
                    onChange={(e) => setPPriceSmall(e.target.value)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm tabular-nums text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">
                    {pType === 'Attar' ? '6ml Price (₹)' : '30ml Price (₹)'}
                  </label>
                  <input
                    type="number"
                    value={pPriceMed}
                    onChange={(e) => setPPriceMed(e.target.value)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm tabular-nums text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">
                    {pType === 'Attar' ? '12ml Price (₹)' : '50ml Price (₹)'}
                  </label>
                  <input
                    type="number"
                    value={pPriceLarge}
                    onChange={(e) => setPPriceLarge(e.target.value)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm tabular-nums text-[#F5F2EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#A19D94]">Top Notes (comma-separated)</label>
                  <input
                    type="text"
                    value={pNotesTop}
                    onChange={(e) => setPNotesTop(e.target.value)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">Heart Notes</label>
                  <input
                    type="text"
                    value={pNotesHeart}
                    onChange={(e) => setPNotesHeart(e.target.value)}
                    className="mt-1 w-full border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A19D94]">Base Notes &amp; Longevity (hrs)</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={pNotesBase}
                      onChange={(e) => setPNotesBase(e.target.value)}
                      className="flex-1 border border-white/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F2EB]"
                    />
                    <input
                      type="number"
                      value={pLongevity}
                      onChange={(e) => setPLongevity(e.target.value)}
                      className="w-20 border border-white/15 bg-[#0D0D0D] px-2 py-2 text-sm tabular-nums text-[#F5F2EB]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs text-[#A19D94]">Product Photo (Upload from Device)</label>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 border border-white/20 bg-[#0D0D0D] px-4 py-2 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37] cursor-pointer">
                      <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>{pUploading ? 'Uploading...' : 'Select Photo File'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-[#A19D94] truncate max-w-xs">{pImageUrl}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="mt-6 bg-[#D4AF37] px-6 py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase hover:bg-[#E2C258] cursor-pointer"
              >
                Publish Fragrance Live
              </button>
            </form>
          )}

          <div className="mt-6 divide-y divide-white/[0.08] border border-white/[0.08] bg-[#121214]">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-white/10">
                    <SafeImage
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-base font-semibold text-[#F5F2EB]">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#A19D94]">
                      {product.scentFamily} · {product.variants.map((v) => `${v.label}: ${formatINR(v.price)} (${v.stock})`).join(' / ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleOutOfStock(product)}
                    className={`border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      product.isOutOfStock
                        ? 'border-red-400/40 bg-red-500/10 text-red-300'
                        : 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]'
                    }`}
                  >
                    {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 text-[#A19D94] hover:text-red-400 cursor-pointer"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupon Manager */}
      {activeTab === 'coupons' && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleCreateCoupon}
            className="border border-white/[0.08] bg-[#121214] p-6 lg:col-span-5"
          >
            <h2 className="font-serif text-lg font-semibold text-[#F5F2EB]">Create Promo Code</h2>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={cCode}
                onChange={(e) => setCCode(e.target.value.toUpperCase())}
                placeholder="Code (e.g. RAMZAN20)"
                className="w-full border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB]"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value as 'percent' | 'flat')}
                  className="border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB]"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat INR (₹)</option>
                </select>
                <input
                  type="number"
                  required
                  value={cValue}
                  onChange={(e) => setCValue(e.target.value)}
                  placeholder="Value"
                  className="border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm tabular-nums text-[#F5F2EB]"
                />
              </div>
              <input
                type="number"
                required
                value={cMinOrder}
                onChange={(e) => setCMinOrder(e.target.value)}
                placeholder="Min Order (₹)"
                className="w-full border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm tabular-nums text-[#F5F2EB]"
              />
              <input
                type="text"
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                placeholder="Short description"
                className="w-full border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB]"
              />
              <button
                type="submit"
                className="w-full bg-[#D4AF37] py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase hover:bg-[#E2C258] cursor-pointer"
              >
                Save Coupon
              </button>
            </div>
          </form>

          <div className="divide-y divide-white/[0.08] border border-white/[0.08] bg-[#121214] lg:col-span-7">
            {coupons.map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-mono text-sm font-semibold text-[#D4AF37]">
                    {coupon.code} ·{' '}
                    {coupon.discountType === 'percent' ? `${coupon.value}% Off` : `${formatINR(coupon.value)} Off`}
                  </p>
                  <p className="mt-1 text-xs text-[#A19D94]">
                    {coupon.description} · Min order {formatINR(coupon.minOrder)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(coupon)}
                    className={`border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      coupon.isActive
                        ? 'border-[#D4AF37]/40 text-[#D4AF37]'
                        : 'border-white/15 text-[#A19D94]'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(coupon.code)}
                    className="p-2 text-[#A19D94] hover:text-red-400 cursor-pointer"
                    aria-label={`Delete coupon ${coupon.code}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
