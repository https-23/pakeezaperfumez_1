import React, { useState } from 'react';
import { ArrowLeft, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import type { Product, ProductVariant, Review } from '../types';
import { buildWhatsAppLink, formatINR } from '../utils/format';
import { SafeImage } from '../components/SafeImage';

interface ProductDetailViewProps {
  product: Product;
  reviews: Review[];
  isWishlisted: boolean;
  onBack: () => void;
  onAddToBag: (product: Product, variant: ProductVariant) => void;
  onToggleWishlist: (product: Product) => void;
  onReviewSubmitted: (review: Review) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  reviews,
  isWishlisted,
  onBack,
  onAddToBag,
  onToggleWishlist,
  onReviewSubmitted,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id || '');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Review form state
  const [authorName, setAuthorName] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const avgRating =
    productReviews.length > 0
      ? (productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(1)
      : '5.0';

  const whatsappUrl = buildWhatsAppLink(
    `Assalamu Alaikum / Hello Pakeeza Perfumez! I would like to order:\n• ${product.name} (${selectedVariant?.label || ''})\n• Price: ${formatINR(selectedVariant?.price || 0)}\nPlease share availability & payment details.`
  );

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      setReviewError('Please enter your name and review.');
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          authorName,
          city,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit review');
      onReviewSubmitted(data.review);
      setAuthorName('');
      setCity('');
      setComment('');
      setRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider text-[#A19D94] uppercase transition-colors hover:text-[#D4AF37] cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Collection</span>
      </button>

      {/* Main 2-column Contiguous Purchase Module */}
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-6">
          <div className="sticky top-24 space-y-4">
            <div className="aspect-[4/3] w-full overflow-hidden border border-white/[0.08] bg-[#141416]">
              <SafeImage
                src={product.images[activeImageIdx] || product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-[4/3] overflow-hidden border transition-colors cursor-pointer ${
                      activeImageIdx === idx
                        ? 'border-[#D4AF37]'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={img}
                      alt={`${product.name} angle ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6">
          <div className="border border-white/[0.08] bg-[#121214] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A19D94]">
              <span className="text-[#D4AF37] font-medium">{product.scentFamily}</span>
              <span aria-hidden="true">·</span>
              <span>{product.type}</span>
              <span aria-hidden="true">·</span>
              <span>{product.occasion}</span>
              <span aria-hidden="true">·</span>
              <span>{product.gender}</span>
            </div>

            <h1 className="mt-3 font-serif text-3xl font-semibold text-[#F5F2EB] sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-[#A19D94]">{product.tagline}</p>

            {/* Rating summary */}
            <div className="mt-4 flex items-center gap-2 text-xs text-[#A19D94]">
              <div className="flex items-center gap-0.5 text-[#D4AF37]">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="font-medium tabular-nums text-[#F5F2EB]">{avgRating}</span>
              <span>({productReviews.length} verified reviews)</span>
            </div>

            {/* Dynamic Price */}
            {selectedVariant && (
              <div className="mt-6 flex items-baseline gap-3 border-y border-white/[0.08] py-4 tabular-nums">
                <span className="text-2xl font-semibold text-[#F5F2EB]">
                  {formatINR(selectedVariant.price)}
                </span>
                {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
                  <span className="text-sm text-[#A19D94] line-through">
                    {formatINR(selectedVariant.compareAtPrice)}
                  </span>
                )}
                <span className="ml-auto text-xs text-[#A19D94]">
                  {product.isOutOfStock || selectedVariant.stock <= 0
                    ? 'Currently Sold Out'
                    : `${selectedVariant.stock} units in stock`}
                </span>
              </div>
            )}

            {/* ML Variant Selector */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold tracking-wider text-[#F5F2EB] uppercase">
                  Select Volume
                </span>
                <span className="text-[#A19D94]">SKU: {selectedVariant?.sku}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {product.variants.map((variant) => {
                  const isSelected = variant.id === selectedVariant?.id;
                  const out = product.isOutOfStock || variant.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`flex flex-col items-center justify-center border py-3 px-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F5F2EB]'
                          : 'border-white/15 bg-[#161619] text-[#A19D94] hover:border-white/35'
                      } ${out ? 'opacity-50' : ''}`}
                    >
                      <span className="text-sm font-semibold">{variant.label}</span>
                      <span className="mt-0.5 text-xs tabular-nums text-[#D4AF37]">
                        {formatINR(variant.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={product.isOutOfStock || !selectedVariant || selectedVariant.stock <= 0}
                onClick={() => selectedVariant && onAddToBag(product, selectedVariant)}
                className="flex flex-1 min-h-[48px] items-center justify-center gap-2 bg-[#D4AF37] px-6 py-3.5 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#A19D94] cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {product.isOutOfStock || (selectedVariant && selectedVariant.stock <= 0)
                    ? 'Out of Stock'
                    : `Add to Bag · ${formatINR(selectedVariant?.price || 0)}`}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center justify-center gap-2 border border-white/20 px-5 py-3.5 text-xs font-medium tracking-wider text-[#F5F2EB] uppercase transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37] whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
                <span>Order on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => onToggleWishlist(product)}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-pressed={isWishlisted}
                className={`flex min-h-[48px] min-w-[48px] items-center justify-center border px-3.5 transition-colors cursor-pointer ${
                  isWishlisted
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/20 text-[#F5F2EB] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                }`}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Description */}
            <p className="mt-7 text-sm leading-relaxed text-[#A19D94]">{product.description}</p>

            {/* Fragrance Pyramid */}
            <div className="mt-8 border-t border-white/[0.08] pt-6">
              <h2 className="font-serif text-lg font-semibold text-[#F5F2EB]">
                Olfactory Fragrance Pyramid
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-12 gap-2 border-b border-white/[0.06] pb-3">
                  <span className="col-span-4 text-xs font-medium tracking-wider text-[#D4AF37] uppercase">
                    Top Notes
                  </span>
                  <span className="col-span-8 text-[#F5F2EB]">{product.notes.top.join(' · ')}</span>
                </div>
                <div className="grid grid-cols-12 gap-2 border-b border-white/[0.06] pb-3">
                  <span className="col-span-4 text-xs font-medium tracking-wider text-[#D4AF37] uppercase">
                    Heart Notes
                  </span>
                  <span className="col-span-8 text-[#F5F2EB]">{product.notes.heart.join(' · ')}</span>
                </div>
                <div className="grid grid-cols-12 gap-2 pb-1">
                  <span className="col-span-4 text-xs font-medium tracking-wider text-[#D4AF37] uppercase">
                    Base Notes
                  </span>
                  <span className="col-span-8 text-[#F5F2EB]">{product.notes.base.join(' · ')}</span>
                </div>
              </div>
            </div>

            {/* Longevity & Projection Bars */}
            <div className="mt-6 grid grid-cols-1 gap-5 border-t border-white/[0.08] pt-6 sm:grid-cols-2">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#A19D94]">Skin Longevity</span>
                  <span className="font-medium tabular-nums text-[#F5F2EB]">
                    {product.longevityHours} Hours
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-white/10">
                  <div
                    className="h-full bg-[#D4AF37]"
                    style={{ width: `${Math.min(100, Math.round((product.longevityHours / 24) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#A19D94]">Sillage &amp; Projection</span>
                  <span className="font-medium tabular-nums text-[#F5F2EB]">
                    {product.projectionScore} / 10
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-white/10">
                  <div
                    className="h-full bg-[#D4AF37]"
                    style={{ width: `${Math.min(100, product.projectionScore * 10)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="mt-14 border-t border-white/[0.08] pt-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-serif text-2xl font-semibold text-[#F5F2EB]">
              Patron Impressions ({productReviews.length})
            </h2>
            {productReviews.length === 0 ? (
              <p className="mt-4 text-sm text-[#A19D94]">
                Be the first patron to review {product.name}.
              </p>
            ) : (
              <div className="mt-6 divide-y divide-white/[0.08]">
                {productReviews.map((rev) => (
                  <div key={rev.id} className="py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#D4AF37]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-[#A19D94]">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#F5F2EB]">{rev.comment}</p>
                    <p className="mt-2 text-xs text-[#A19D94]">
                      {rev.authorName} · {rev.city} · Verified Buyer
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <form
              onSubmit={handleReviewSubmit}
              className="border border-white/[0.08] bg-[#121214] p-6"
            >
              <h3 className="font-serif text-lg font-semibold text-[#F5F2EB]">Share Your Experience</h3>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name"
                    className="border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:border-[#D4AF37] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City (e.g. Delhi)"
                    className="border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-[#A19D94]">
                  <span>Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        className="p-1 cursor-pointer"
                        aria-label={`Rate ${num} stars`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            num <= rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#A19D94]/40'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How did the projection and dry-down perform on your skin?"
                  className="w-full border border-white/15 bg-[#0D0D0D] px-3 py-2.5 text-sm text-[#F5F2EB] placeholder:text-[#A19D94]/60 focus:border-[#D4AF37] focus:outline-none"
                />

                {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-[#D4AF37] py-3 text-xs font-semibold tracking-wider text-[#0D0D0D] uppercase transition-colors hover:bg-[#E2C258] disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
