import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product, ProductVariant } from '../types';
import { formatINR } from '../utils/format';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
  onToggleWishlist?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted = false,
  onSelect,
  onQuickAdd,
  onToggleWishlist,
}) => {
  const defaultVariant = product.variants[0];
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const compareAt = defaultVariant?.compareAtPrice;

  return (
    <article className="group flex flex-col border border-white/[0.08] bg-[#141416] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/35">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#101012]">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="h-full w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
        >
          <SafeImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/70 via-transparent to-transparent" />
        </button>

        {(product.isOutOfStock || product.isBestseller) && (
          <span className="pointer-events-none absolute top-3 left-3 bg-[#0D0D0D]/85 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37] backdrop-blur-sm">
            {product.isOutOfStock ? 'Out of Stock' : 'Bestseller'}
          </span>
        )}

        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
            className="absolute top-2.5 right-2.5 flex h-10 w-10 items-center justify-center border border-white/15 bg-[#0D0D0D]/80 backdrop-blur-sm transition-colors hover:border-[#D4AF37] cursor-pointer"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#F5F2EB] hover:text-[#D4AF37]'
              }`}
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A19D94]">
            <span>{product.scentFamily}</span>
            <span aria-hidden="true">·</span>
            <span>{product.type}</span>
            <span aria-hidden="true">·</span>
            <span>{product.longevityHours}h Longevity</span>
          </div>

          <button
            type="button"
            onClick={() => onSelect(product)}
            className="mt-2 block text-left font-serif text-lg font-semibold text-[#F5F2EB] transition-colors group-hover:text-[#D4AF37] cursor-pointer"
          >
            {product.name}
          </button>

          <p className="mt-1 text-sm text-[#A19D94] line-clamp-2">{product.tagline}</p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-semibold text-[#F5F2EB]">
              {product.variants.length > 1 ? `From ${formatINR(minPrice)}` : formatINR(minPrice)}
            </span>
            {compareAt && compareAt > minPrice && (
              <span className="text-xs text-[#A19D94]/70 line-through">{formatINR(compareAt)}</span>
            )}
          </div>

          <button
            type="button"
            disabled={product.isOutOfStock || !defaultVariant || defaultVariant.stock <= 0}
            onClick={() => defaultVariant && onQuickAdd(product, defaultVariant)}
            className="inline-flex min-h-[40px] items-center gap-1.5 border border-[#D4AF37]/40 px-3.5 py-2 text-xs font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0D0D0D] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#A19D94]/50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{product.isOutOfStock ? 'Sold Out' : `Add ${defaultVariant?.label || ''}`}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
