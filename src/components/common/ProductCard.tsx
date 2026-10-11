import React, { useState } from 'react';
import { Heart, ShoppingBag, Scale, Check, Share2, CheckCheck } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { StarRating } from './StarRating';

interface ProductCardProps {
  product: Product;
  onNavigate: (route: string, params?: Record<string, any>) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate }) => {
  const {
    addToCart,
    cart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
  } = useCart();

  const [shareCopied, setShareCopied] = useState(false);

  const isFavorited = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const cartItem = cart.find((i) => i.productId === product.id);
  const isOutOfStock = product.stock <= 0;

  const handleCardClick = () => {
    const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onNavigate('product-detail', {
      id: `${slug}--${product.id}`,
      slug: product.slug,
      rawId: product.id,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(product.id);
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const productSlug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const canonicalUrl = `${window.location.origin}/product/${productSlug}--${product.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on TrendPro at ₹${product.sellingPrice.toLocaleString()}!`,
          url: canonicalUrl,
        });
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // Fallback prompt
      window.prompt('Copy product link:', canonicalUrl);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-4">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={(e) => {
            // Graceful fallback for broken image URLs
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
          }}
        />

        {/* Discount Badge */}
        {product.discountPercent > 0 && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs tracking-wider">
            {product.discountPercent}% OFF
          </span>
        )}

        {/* Out of stock overlay badge */}
        {isOutOfStock && (
          <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase backdrop-blur-xs">
            Out of Stock
          </span>
        )}

        {/* Floating Actions: Wishlist, Compare, Share */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleWishlistClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isFavorited
                ? 'bg-rose-50 text-rose-600'
                : 'bg-white/90 text-slate-600 hover:text-rose-600 hover:bg-white'
            }`}
            title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>

          <button
            onClick={handleCompareClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isCompared
                ? 'bg-indigo-600 text-white'
                : 'bg-white/90 text-slate-600 hover:text-indigo-600 hover:bg-white'
            }`}
            title={isCompared ? 'In Compare List' : 'Compare Product'}
          >
            <Scale className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareClick}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-white/90 text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors"
            title="Share Product Link"
          >
            {shareCopied ? (
              <CheckCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Share Copied Floating Notification */}
        {shareCopied && (
          <div className="absolute inset-x-3 bottom-3 bg-slate-900/95 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl text-center shadow-lg animate-in fade-in zoom-in-95 duration-150">
            Link Copied to Clipboard!
          </div>
        )}

        {/* Stock Warning Badge */}
        {!isOutOfStock && product.stock > 0 && product.stock <= 5 && (
          <span className="absolute bottom-2 left-2 bg-amber-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
            Only {product.stock} left!
          </span>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Category (Unboxed clean typography) */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1 tracking-wider">
            <span className="font-semibold text-slate-500 uppercase">{product.brand}</span>
            <span className="capitalize">{product.category}</span>
          </div>

          {/* Product Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2">
            {product.name}
          </h3>

          {/* Real Proportional Star Ratings */}
          <div className="mb-2.5">
            <StarRating
              rating={product.rating || 0}
              ratingCount={product.ratingCount || 0}
              size="xs"
              showRatingNumber={Boolean(product.rating && product.rating > 0)}
            />
          </div>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-slate-900">
                ₹{product.sellingPrice.toLocaleString()}
              </span>
              {product.originalPrice > product.sellingPrice && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">Free Delivery</p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : cartItem
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
          >
            {cartItem ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Added ({cartItem.quantity})</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
