import React, { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Gender, Occasion, Product, ProductVariant, ScentFamily } from '../types';
import { ProductCard } from '../components/ProductCard';
import { formatINR } from '../utils/format';

interface ShopViewProps {
  products: Product[];
  wishlistIds: string[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
  onToggleWishlist: (product: Product) => void;
}

const SCENT_FAMILIES: ('All' | ScentFamily)[] = ['All', 'Oud', 'Floral', 'Woody', 'Musk', 'Fresh'];
const OCCASIONS: ('All' | Occasion)[] = ['All', 'Office', 'Party', 'Daily', 'Festive'];
const GENDERS: ('All' | Gender)[] = ['All', 'Unisex', 'Men', 'Women'];

export const ShopView: React.FC<ShopViewProps> = ({
  products,
  wishlistIds,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}) => {
  const [family, setFamily] = useState<'All' | ScentFamily>('All');
  const [occasion, setOccasion] = useState<'All' | Occasion>('All');
  const [gender, setGender] = useState<'All' | Gender>('All');
  const [maxPrice, setMaxPrice] = useState<number>(2500);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const minVarPrice = Math.min(...p.variants.map((v) => v.price));
      if (family !== 'All' && p.scentFamily !== family) return false;
      if (occasion !== 'All' && p.occasion !== occasion) return false;
      if (gender !== 'All' && p.gender !== gender) return false;
      if (minVarPrice > maxPrice) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      list = [...list].sort(
        (a, b) =>
          Math.min(...a.variants.map((v) => v.price)) - Math.min(...b.variants.map((v) => v.price))
      );
    } else if (sortBy === 'price_desc') {
      list = [...list].sort(
        (a, b) =>
          Math.min(...b.variants.map((v) => v.price)) - Math.min(...a.variants.map((v) => v.price))
      );
    }
    return list;
  }, [products, family, occasion, gender, maxPrice, sortBy]);

  const resetFilters = () => {
    setFamily('All');
    setOccasion('All');
    setGender('All');
    setMaxPrice(2500);
    setSortBy('featured');
  };

  const FilterControls = (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">Scent Family</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCENT_FAMILIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFamily(item)}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                family === item
                  ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0D]'
                  : 'border-white/15 bg-[#141416] text-[#A19D94] hover:border-white/35 hover:text-[#F5F2EB]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">Occasion</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {OCCASIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setOccasion(item)}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                occasion === item
                  ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0D]'
                  : 'border-white/15 bg-[#141416] text-[#A19D94] hover:border-white/35 hover:text-[#F5F2EB]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#F5F2EB] uppercase">Profile</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {GENDERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGender(item)}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                gender === item
                  ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0D]'
                  : 'border-white/15 bg-[#141416] text-[#A19D94] hover:border-white/35 hover:text-[#F5F2EB]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tracking-wider text-[#F5F2EB] uppercase">Starting Under</span>
          <span className="tabular-nums font-medium text-[#D4AF37]">{formatINR(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={250}
          max={2500}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-3 w-full accent-[#D4AF37] cursor-pointer"
        />
      </div>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full border border-white/15 py-2.5 text-xs font-medium text-[#A19D94] transition-colors hover:border-[#D4AF37] hover:text-[#F5F2EB] cursor-pointer"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
            Complete Archive
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[#F5F2EB]">
            Attars &amp; Extrait de Parfum
          </h1>
          <p className="mt-1 text-sm text-[#A19D94] tabular-nums">
            Showing {filteredProducts.length} of {products.length} artisanal fragrances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 border border-white/15 bg-[#141416] px-4 py-2 text-xs font-medium text-[#F5F2EB] lg:hidden cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#D4AF37]" />
            Filters
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')}
            aria-label="Sort products"
            className="min-h-[40px] border border-white/15 bg-[#141416] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none cursor-pointer"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 border border-white/[0.08] bg-[#121214] p-6">
            {FilterControls}
          </div>
        </aside>

        {/* Catalog Grid */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="border border-white/[0.08] bg-[#121214] p-12 text-center">
              <p className="font-serif text-xl text-[#F5F2EB]">No fragrances match these filters</p>
              <p className="mt-2 text-sm text-[#A19D94]">
                Try broadening your scent family or raising the price limit.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 bg-[#D4AF37] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={onSelectProduct}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 h-full w-full max-w-xs overflow-y-auto border-l border-white/10 bg-[#121214] p-6">
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h2 className="font-serif text-lg font-semibold text-[#F5F2EB]">Filter Catalog</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 text-[#A19D94] hover:text-[#F5F2EB]"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {FilterControls}
          </div>
        </div>
      )}
    </section>
  );
};
