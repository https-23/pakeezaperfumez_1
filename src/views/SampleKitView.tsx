import React, { useMemo, useState } from 'react';
import { Check, Plus, ShoppingBag, X } from 'lucide-react';
import type { Product, ScentFamily } from '../types';
import { SAMPLE_KIT_PRICE, formatINR } from '../utils/format';
import { SafeImage } from '../components/SafeImage';

interface SampleKitViewProps {
  products: Product[];
  onAddKitToBag: (selected: Product[]) => void;
}

const FAMILIES: ('All' | ScentFamily)[] = ['All', 'Oud', 'Floral', 'Woody', 'Musk', 'Fresh'];

export const SampleKitView: React.FC<SampleKitViewProps> = ({ products, onAddKitToBag }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [familyFilter, setFamilyFilter] = useState<'All' | ScentFamily>('All');

  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isOutOfStock) return false;
      if (familyFilter !== 'All' && p.scentFamily !== familyFilter) return false;
      return true;
    });
  }, [products, familyFilter]);

  const selectedProducts = useMemo(() => {
    return selectedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [selectedIds, products]);

  const estimatedIndividualValue = selectedProducts.reduce((sum, p) => {
    const firstPrice = p.variants[0]?.price || 299;
    return sum + Math.min(firstPrice, 349);
  }, 0);

  const handleAddSlot = (productId: string) => {
    if (selectedIds.length >= 5) return;
    setSelectedIds((prev) => [...prev, productId]);
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedIds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleComplete = () => {
    if (selectedProducts.length !== 5) return;
    onAddKitToBag(selectedProducts);
    setSelectedIds([]);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-medium tracking-[0.18em] text-[#D4AF37] uppercase">
          Discovery Box · 5 × 3ml Vials
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#F5F2EB] sm:text-4xl">
          Custom 5-Attar Sample Kit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A19D94]">
          Choose any 5 fragrances from our collection for a flat bundle price of{' '}
          <strong className="text-[#F5F2EB] tabular-nums">{formatINR(SAMPLE_KIT_PRICE)}</strong>. Experience pure skin projection before investing in a full flacon.
        </p>
      </div>

      {/* 5-Slot Interactive Tray */}
      <div className="mt-8 border border-[#D4AF37]/30 bg-[#121214] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#F5F2EB]">
              Your Box ({selectedProducts.length} / 5 Selected)
            </h2>
            {selectedProducts.length === 5 && estimatedIndividualValue > SAMPLE_KIT_PRICE && (
              <p className="mt-0.5 text-xs text-[#D4AF37] tabular-nums">
                You save {formatINR(estimatedIndividualValue - SAMPLE_KIT_PRICE)} with this combo
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={selectedProducts.length !== 5}
            onClick={handleComplete}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-[#D4AF37] px-6 py-2.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#A19D94] whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>
              {selectedProducts.length === 5
                ? `Add Kit to Bag · ${formatINR(SAMPLE_KIT_PRICE)}`
                : `Select ${5 - selectedProducts.length} More`}
            </span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => {
            const item = selectedProducts[idx];
            return (
              <div
                key={idx}
                className={`relative flex min-h-[96px] flex-col justify-between border p-3 ${
                  item
                    ? 'border-[#D4AF37]/50 bg-[#18181B]'
                    : 'border-dashed border-white/15 bg-[#0D0D0D]'
                }`}
              >
                {item ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#D4AF37] tabular-nums">
                        0{idx + 1} · 3ml
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        className="text-[#A19D94] hover:text-red-400 cursor-pointer"
                        aria-label={`Remove ${item.name} from slot ${idx + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 font-serif text-xs font-semibold text-[#F5F2EB] line-clamp-2">
                      {item.name}
                    </p>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="text-xs text-[#A19D94]/60 tabular-nums">Vial 0{idx + 1}</span>
                    <span className="mt-1 text-[11px] text-[#A19D94]/40">Tap below</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {FAMILIES.map((fam) => (
          <button
            key={fam}
            type="button"
            onClick={() => setFamilyFilter(fam)}
            className={`border px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
              familyFilter === fam
                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0D0D0D]'
                : 'border-white/15 bg-[#141416] text-[#A19D94] hover:text-[#F5F2EB]'
            }`}
          >
            {fam}
          </button>
        ))}
      </div>

      {/* Selectable Attar Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {availableProducts.map((product) => {
          const countInBox = selectedIds.filter((id) => id === product.id).length;
          const isFull = selectedIds.length >= 5;
          return (
            <div
              key={product.id}
              className="flex items-center gap-4 border border-white/[0.08] bg-[#141416] p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden border border-white/10">
                <SafeImage
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#A19D94]">
                  {product.scentFamily} · {product.longevityHours}h
                </p>
                <h3 className="mt-0.5 truncate font-serif text-base font-semibold text-[#F5F2EB]">
                  {product.name}
                </h3>
                <p className="mt-0.5 truncate text-xs text-[#A19D94]">
                  {product.notes.heart.join(', ')}
                </p>

                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => handleAddSlot(product.id)}
                  className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0D0D0D] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#A19D94]/40 cursor-pointer"
                >
                  {countInBox > 0 ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Added ({countInBox}) · Add Another</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add 3ml Vial</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
