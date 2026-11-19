import React, { useMemo, useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import type { Product, ProductVariant, Review, ScentFamily } from '../types';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

interface HomeViewProps {
  products: Product[];
  reviews: Review[];
  wishlistIds: string[];
  onNavigate: (view: 'shop' | 'sample-kit' | 'track') => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
  onToggleWishlist: (product: Product) => void;
}

const CATEGORIES: { label: string; value: ScentFamily | 'All'; image: string }[] = [
  {
    label: 'All Scents',
    value: 'All',
    image: '/src/assets/images/hero_royal_oud_1795085480694.jpg',
  },
  {
    label: 'Oud',
    value: 'Oud',
    image: '/src/assets/images/product_royal_oud_1795085479966.jpg',
  },
  {
    label: 'Floral',
    value: 'Floral',
    image: '/src/assets/images/product_damask_rose_1795085480483.jpg',
  },
  {
    label: 'Woody',
    value: 'Woody',
    image: '/src/assets/images/product_sandalwood_amber_1795085480562.jpg',
  },
  {
    label: 'Musk',
    value: 'Musk',
    image: '/src/assets/images/product_white_musk_1795085480001.jpg',
  },
  {
    label: 'Fresh',
    value: 'Fresh',
    image: '/src/assets/images/craft_distillation_1795085480741.jpg',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  reviews,
  wishlistIds,
  onNavigate,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}) => {
  const [selectedFamily, setSelectedFamily] = useState<ScentFamily | 'All'>('All');

  const showcasedProducts = useMemo(() => {
    const filtered =
      selectedFamily === 'All'
        ? products
        : products.filter((p) => p.scentFamily === selectedFamily);
    return filtered.slice(0, 6);
  }, [products, selectedFamily]);

  return (
    <div>
      {/* 1. Hero Showcase */}
      <section className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-10">
        <div className="grid grid-cols-1 items-stretch border border-white/[0.08] bg-[#121214] lg:grid-cols-12">
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-5 lg:p-12">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-[#D4AF37] uppercase">
                Small-Batch Kannauj &amp; Assam Reserve
              </p>
              <h1 className="mt-4 font-serif text-[clamp(2.15rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#F5F2EB]">
                Pure Artisanal Attars &amp; Extrait Oils
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#A19D94]">
                Alcohol-free oils aged in copper vessels for deep skin projection. Discover pure Assam oud, Pampore saffron, and velvet damask rose.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="inline-flex min-h-[46px] items-center gap-2 bg-[#D4AF37] px-6 py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Collection</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sample-kit')}
                className="inline-flex min-h-[46px] items-center gap-2 border border-white/20 px-5 py-3 text-xs font-medium tracking-wider text-[#F5F2EB] uppercase transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Build 5-Attar Sample Kit
              </button>
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[460px]">
            <SafeImage
              src="/src/assets/images/hero_royal_oud_1795085480694.jpg"
              alt="Pakeeza Perfumez Royal Assam Oud crystal flacon on obsidian stone"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121214]/60 via-transparent to-transparent lg:block hidden" />
          </div>
        </div>

        {/* 4-Column Trust Strip directly below hero */}
        <div className="grid grid-cols-2 border-x border-b border-white/[0.08] bg-[#0D0D0D] sm:grid-cols-4">
          <div className="border-r border-b border-white/[0.08] p-4 sm:border-b-0 sm:p-5">
            <p className="font-serif text-base font-semibold text-[#F5F2EB]">100% Alcohol-Free</p>
            <p className="mt-1 text-xs text-[#A19D94]">Pure concentrated perfume oils</p>
          </div>
          <div className="border-b border-white/[0.08] p-4 sm:border-r sm:border-b-0 sm:p-5">
            <p className="font-serif text-base font-semibold text-[#F5F2EB] tabular-nums">12–24h Longevity</p>
            <p className="mt-1 text-xs text-[#A19D94]">Aged in traditional copper degs</p>
          </div>
          <div className="border-r border-white/[0.08] p-4 sm:p-5">
            <p className="font-serif text-base font-semibold text-[#F5F2EB] tabular-nums">₹99 Partial COD</p>
            <p className="mt-1 text-xs text-[#A19D94]">Pay balance securely on delivery</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="font-serif text-base font-semibold text-[#F5F2EB] tabular-nums">Free Shipping ₹999+</p>
            <p className="mt-1 text-xs text-[#A19D94]">Insured express dispatch pan-India</p>
          </div>
        </div>
      </section>

      {/* 2. Scent Category Circles & Featured Collection */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
              Curated Signatures
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#F5F2EB] sm:text-3xl">
              Explore by Scent Family
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#D4AF37] uppercase hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Full Catalog ({products.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scent Family Circular Selector */}
        <div className="mt-6 flex items-center gap-4 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => {
            const active = selectedFamily === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedFamily(cat.value)}
                className="group flex shrink-0 flex-col items-center gap-2.5 cursor-pointer focus-visible:outline-none"
              >
                <div
                  className={`h-16 w-16 overflow-hidden rounded-full border-2 p-0.5 transition-colors sm:h-20 sm:w-20 ${
                    active ? 'border-[#D4AF37]' : 'border-white/15 group-hover:border-white/40'
                  }`}
                >
                  <SafeImage
                    src={cat.image}
                    alt={cat.label}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap transition-colors ${
                    active ? 'text-[#D4AF37]' : 'text-[#A19D94] group-hover:text-[#F5F2EB]'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3-Column Product Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {showcasedProducts.map((product) => (
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
      </section>

      {/* 3. Craftsmanship & Verified Customer Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch border border-white/[0.08] bg-[#121214] lg:grid-cols-12">
          <div className="aspect-[4/3] w-full overflow-hidden lg:col-span-5 lg:aspect-auto">
            <SafeImage
              src="/src/assets/images/craft_distillation_1795085480741.jpg"
              alt="Traditional copper deg-bhapka attar distillation"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-7 lg:p-12">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
                The Pakeeza Perfumez Atelier
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[#F5F2EB] sm:text-3xl">
                Hydro-Distilled Purity, Tested Before You Commit
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#A19D94]">
                Every batch is matured in smoked glass carboys without harsh synthetic fixatives. Unsure which oud or floral profile matches your skin chemistry? Curate any five 3ml vials in our Discovery Kit for ₹499.
              </p>
            </div>

            {/* Verified Testimonials adjacent to claim */}
            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-2">
              {reviews.slice(0, 2).map((rev) => (
                <div key={rev.id} className="space-y-2">
                  <div className="flex items-center gap-1 text-[#D4AF37]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-[#F5F2EB]/90">"{rev.comment}"</p>
                  <p className="text-xs text-[#A19D94]">
                    {rev.authorName} · {rev.city}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
