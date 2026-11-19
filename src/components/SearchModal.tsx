import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Product } from '../types';
import { formatINR } from '../utils/format';
import { SafeImage } from './SafeImage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.scentFamily.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.notes.top.some((n) => n.toLowerCase().includes(q)) ||
        p.notes.heart.some((n) => n.toLowerCase().includes(q)) ||
        p.notes.base.some((n) => n.toLowerCase().includes(q))
    );
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16 backdrop-blur-sm sm:pt-24">
      <div className="w-full max-w-2xl border border-white/15 bg-[#121214] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5">
          <Search className="h-5 w-5 text-[#D4AF37] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by fragrance name, saffron, oud, rose, or sandalwood..."
            className="w-full bg-transparent text-sm text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A19D94] hover:text-[#F5F2EB] cursor-pointer"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.06]">
          {results.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#A19D94]">
              No fragrances found matching "{query}".
            </p>
          ) : (
            results.map((product) => {
              const minPrice = Math.min(...product.variants.map((v) => v.price));
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-white/10">
                    <SafeImage
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base font-medium text-[#F5F2EB] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#A19D94] truncate">
                      {product.scentFamily} · {product.type} · {product.notes.heart.join(', ')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[#D4AF37] shrink-0">
                    From {formatINR(minPrice)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
