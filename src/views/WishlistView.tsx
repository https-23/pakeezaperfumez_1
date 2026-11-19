import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product, ProductVariant } from '../types';
import { ProductCard } from '../components/ProductCard';

interface WishlistViewProps {
  products: Product[];
  wishlistIds: string[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
  onToggleWishlist: (product: Product) => void;
  onClearWishlist: () => void;
  onBrowseShop: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  products,
  wishlistIds,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
  onClearWishlist,
  onBrowseShop,
}) => {
  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleAddAllToBag = () => {
    for (const product of savedProducts) {
      const availableVariant =
        product.variants.find((v) => v.stock > 0) || product.variants[0];
      if (!product.isOutOfStock && availableVariant && availableVariant.stock > 0) {
        onQuickAdd(product, availableVariant);
      }
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
            Saved Collection
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[#F5F2EB]">
            Your Wishlist
          </h1>
          <p className="mt-1 text-sm text-[#A19D94] tabular-nums">
            {savedProducts.length}{' '}
            {savedProducts.length === 1 ? 'fragrance saved' : 'fragrances saved'} for later
          </p>
        </div>

        {savedProducts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddAllToBag}
              className="inline-flex min-h-[40px] items-center gap-2 bg-[#D4AF37] px-4 py-2 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Add All to Bag</span>
            </button>
            <button
              type="button"
              onClick={onClearWishlist}
              className="inline-flex min-h-[40px] items-center border border-white/15 px-4 py-2 text-xs font-medium text-[#A19D94] transition-colors hover:border-[#D4AF37] hover:text-[#F5F2EB] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {savedProducts.length === 0 ? (
        <div className="mt-8 border border-white/[0.08] bg-[#121214] px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#D4AF37]/30 bg-[#18181B] text-[#D4AF37]">
            <Heart className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-[#F5F2EB]">
            No Saved Fragrances Yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#A19D94]">
            Tap the heart icon on any attar or extrait de parfum to keep a personal shortlist ready when you return.
          </p>
          <button
            type="button"
            onClick={onBrowseShop}
            className="mt-6 bg-[#D4AF37] px-6 py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] cursor-pointer"
          >
            Explore Fragrances
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {savedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={true}
              onSelect={onSelectProduct}
              onQuickAdd={onQuickAdd}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </section>
  );
};
