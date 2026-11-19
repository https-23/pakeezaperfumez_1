import React, { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  Heart,
  Home,
  MessageCircle,
  PackageSearch,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { CartItem, Coupon, Order, Product, ProductVariant, Review } from './types';
import { SAMPLE_KIT_PRICE, buildWhatsAppLink } from './utils/format';
import { CartDrawer } from './components/CartDrawer';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { SearchModal } from './components/SearchModal';
import { CheckoutView } from './views/CheckoutView';
import { HomeView } from './views/HomeView';
import { ProductDetailView } from './views/ProductDetailView';
import { SampleKitView } from './views/SampleKitView';
import { ShopView } from './views/ShopView';
import { TrackOrderView } from './views/TrackOrderView';
import { WishlistView } from './views/WishlistView';

type RouteView =
  | 'home'
  | 'shop'
  | 'product'
  | 'sample-kit'
  | 'wishlist'
  | 'checkout'
  | 'track';

export default function App() {
  const [view, setView] = useState<RouteView>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [trackOrderQuery, setTrackOrderQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('pkz_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pkz_wishlist');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discount: number } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 2600);
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
      setReviews(data.reviews || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    localStorage.setItem('pkz_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pkz_wishlist', JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(product.id);
        if (exists) {
          showToast(`Removed ${product.name} from wishlist`);
          return prev.filter((id) => id !== product.id);
        }
        showToast(`Saved ${product.name} to wishlist`);
        return [product.id, ...prev];
      });
    },
    [showToast]
  );

  const navigate = (nextView: RouteView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    navigate('product');
  };

  const handleAddToBag = (product: Product, variant: ProductVariant) => {
    const key = `${product.id}:${variant.id}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          kind: 'product',
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          subtitle: `${variant.label} · ${product.type}`,
          image: product.images[0],
          price: variant.price,
          quantity: 1,
        },
      ];
    });
    setCartOpen(true);
    showToast(`Added ${product.name} (${variant.label}) to bag`);
  };

  const handleAddSampleKit = (selected: Product[]) => {
    const hash = selected.map((p) => p.id.slice(-4)).join('-');
    const key = `samplekit:${hash}:${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        key,
        kind: 'sample_kit',
        name: 'Custom 5-Attar Sample Kit',
        subtitle: '5 × 3ml Discovery Box',
        image: '/src/assets/images/craft_distillation_1795085480741.jpg',
        price: SAMPLE_KIT_PRICE,
        quantity: 1,
        kitItems: selected.map((p) => ({
          productId: p.id,
          name: p.name,
          scentFamily: p.scentFamily,
        })),
      },
    ]);
    setCartOpen(true);
    showToast('Custom 5-Attar Sample Kit added to bag');
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleApplyCoupon = async (code: string): Promise<string | null> => {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Invalid coupon';
      setAppliedCoupon({ coupon: data.coupon, discount: data.discount });
      return null;
    } catch {
      return 'Unable to verify promo code right now.';
    }
  };

  const handleOrderCompleted = (_order: Order) => {
    setCart([]);
    setAppliedCoupon(null);
    loadCatalog();
  };

  const bagCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D0D] text-[#F5F2EB] pb-16 md:pb-0">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 h-14 border-b border-white/[0.08] bg-[#0D0D0D]/90 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="font-serif text-xl font-bold tracking-tight text-[#F5F2EB] whitespace-nowrap shrink-0 cursor-pointer sm:text-2xl"
          >
            Pakeeza Perfumez
          </button>

          {/* Zone 2: Concise Single-Line Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#A19D94]"
          >
            {(
              [
                ['home', 'Home'],
                ['shop', 'Shop'],
                ['sample-kit', 'Sample Kit'],
                ['wishlist', wishlistIds.length > 0 ? `Wishlist (${wishlistIds.length})` : 'Wishlist'],
                ['track', 'Track Order'],
              ] as [RouteView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate(key)}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5F2EB] cursor-pointer ${
                  view === key ? 'text-[#D4AF37]' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Action Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search fragrances"
              className="flex h-10 w-10 items-center justify-center text-[#A19D94] transition-colors hover:text-[#D4AF37] cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>

            <PWAInstallButton variant="header" />

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-2 bg-[#D4AF37] px-4 py-2 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="tabular-nums">Bag ({bagCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {loading && products.length === 0 ? (
          <div className="mx-auto max-w-7xl px-4 py-20 text-center">
            <p className="font-serif text-lg text-[#A19D94]">Opening the Pakeeza Perfumez Archive...</p>
          </div>
        ) : (
          <>
            {view === 'home' && (
              <HomeView
                products={products}
                reviews={reviews}
                wishlistIds={wishlistIds}
                onNavigate={(next) => navigate(next)}
                onSelectProduct={handleSelectProduct}
                onQuickAdd={handleAddToBag}
                onToggleWishlist={toggleWishlist}
              />
            )}

            {view === 'shop' && (
              <ShopView
                products={products}
                wishlistIds={wishlistIds}
                onSelectProduct={handleSelectProduct}
                onQuickAdd={handleAddToBag}
                onToggleWishlist={toggleWishlist}
              />
            )}

            {view === 'product' && selectedProduct && (
              <ProductDetailView
                product={
                  products.find((p) => p.id === selectedProduct.id) || selectedProduct
                }
                reviews={reviews}
                isWishlisted={wishlistIds.includes(selectedProduct.id)}
                onBack={() => navigate('shop')}
                onAddToBag={handleAddToBag}
                onToggleWishlist={toggleWishlist}
                onReviewSubmitted={(rev) => {
                  setReviews((prev) => [rev, ...prev]);
                  showToast('Thank you — your review is live');
                }}
              />
            )}

            {view === 'sample-kit' && (
              <SampleKitView products={products} onAddKitToBag={handleAddSampleKit} />
            )}

            {view === 'wishlist' && (
              <WishlistView
                products={products}
                wishlistIds={wishlistIds}
                onSelectProduct={handleSelectProduct}
                onQuickAdd={handleAddToBag}
                onToggleWishlist={toggleWishlist}
                onClearWishlist={() => {
                  setWishlistIds([]);
                  showToast('Wishlist cleared');
                }}
                onBrowseShop={() => navigate('shop')}
              />
            )}

            {view === 'checkout' && (
              <CheckoutView
                items={cart}
                appliedCoupon={appliedCoupon}
                onBackToShop={() => navigate('shop')}
                onOrderCompleted={handleOrderCompleted}
                onTrackOrder={(orderId) => {
                  setTrackOrderQuery(orderId);
                  navigate('track');
                }}
              />
            )}

            {view === 'track' && <TrackOrderView initialQuery={trackOrderQuery} />}
          </>
        )}
      </main>

      {/* Luxury Footer */}
      <footer className="mt-16 border-t border-white/[0.08] bg-[#09090A]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="font-serif text-2xl font-bold text-[#F5F2EB]">Pakeeza Perfumez</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#A19D94]">
                Small-batch Indian attars and concentrated extrait de parfum distilled in Kannauj and aged in Assam.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <PWAInstallButton variant="footer" />
                <a
                  href={buildWhatsAppLink('Assalamu Alaikum / Hello Pakeeza Perfumez! I have a fragrance question.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>WhatsApp Concierge</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 md:col-span-7 sm:grid-cols-3">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">
                  Collection
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[#A19D94]">
                  <li>
                    <button type="button" onClick={() => navigate('shop')} className="hover:text-[#D4AF37] cursor-pointer">
                      All Fragrances
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => navigate('sample-kit')} className="hover:text-[#D4AF37] cursor-pointer">
                      5-Attar Sample Kit
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => navigate('wishlist')} className="hover:text-[#D4AF37] cursor-pointer">
                      Saved Wishlist
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">
                  Orders
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[#A19D94]">
                  <li>
                    <button type="button" onClick={() => navigate('track')} className="hover:text-[#D4AF37] cursor-pointer">
                      Track Shipment
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">
                  Assurance
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-[#A19D94]">
                  Partial COD (₹99 Advance) · 5% Prepaid UPI Bonus · Pan-India Insured Dispatch
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-[#A19D94] sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Pakeeza Perfumez. All rights reserved.</p>
            <p>Pure Artisanal Attars · Extrait de Parfum</p>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom App Bar (Strict <= 15% Viewport Cap) */}
      <nav
        aria-label="Mobile App Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-5 border-t border-white/[0.08] bg-[#0D0D0D]/95 backdrop-blur-md pb-safe md:hidden"
      >
        <button
          type="button"
          onClick={() => navigate('home')}
          className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            view === 'home' ? 'text-[#D4AF37]' : 'text-[#A19D94]'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('shop')}
          className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            view === 'shop' || view === 'product' ? 'text-[#D4AF37]' : 'text-[#A19D94]'
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] font-medium">Shop</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('sample-kit')}
          className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            view === 'sample-kit' ? 'text-[#D4AF37]' : 'text-[#A19D94]'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] font-medium">Kit</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('wishlist')}
          className={`relative flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            view === 'wishlist' ? 'text-[#D4AF37]' : 'text-[#A19D94]'
          }`}
        >
          <Heart className={`h-5 w-5 ${view === 'wishlist' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">Wishlist</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('track')}
          className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            view === 'track' ? 'text-[#D4AF37]' : 'text-[#A19D94]'
          }`}
        >
          <PackageSearch className="h-5 w-5" />
          <span className="text-[10px] font-medium">Track</span>
        </button>
      </nav>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={() => setAppliedCoupon(null)}
        onCheckout={() => {
          setCartOpen(false);
          navigate('checkout');
        }}
      />

      {/* Live Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        onSelectProduct={handleSelectProduct}
      />

      {/* Offline PWA Banner */}
      <OfflineIndicator />

      {/* Subtle Toast Feedback */}
      {toast && (
        <div className="fixed right-4 bottom-20 z-50 border border-[#D4AF37]/40 bg-[#18181B] px-4 py-2.5 text-xs font-medium text-[#F5F2EB] shadow-xl md:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}
