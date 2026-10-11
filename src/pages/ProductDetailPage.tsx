import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  Heart,
  ShoppingBag,
  Scale,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  MapPin,
  Tag,
  ArrowLeft,
  Share2,
  CheckCheck,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Zap,
  Loader2
} from 'lucide-react';
import { ProductCard } from '../components/common/ProductCard';
import { StarRating } from '../components/common/StarRating';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Review, Product } from '../types';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (route: string, params?: Record<string, any>) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
}) => {
  const {
    products,
    loading: storeLoading,
    getProductReviews,
    addReview,
    subscribeRestock,
    unsubscribeRestock,
    isSubscribedToRestock,
  } = useStore();
  const {
    addToCart,
    cart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
  } = useCart();
  const { currentUser, signInWithGoogle } = useAuth();

  // Robust product resolver (supports ID, slug, and slug--id)
  const product: Product | null = useMemo(() => {
    if (!productId || products.length === 0) return null;
    // 1. Direct ID match
    let match = products.find((p) => p.id === productId);
    if (match) return match;
    // 2. Direct slug match
    match = products.find((p) => p.slug === productId);
    if (match) return match;
    // 3. Suffix match from canonical slug--id format
    if (productId.includes('--')) {
      const parts = productId.split('--');
      const suffixId = parts[parts.length - 1];
      match = products.find((p) => p.id === suffixId);
      if (match) return match;
    }
    // 4. Any product whose ID ends with or is included in the parameter
    match = products.find(
      (p) =>
        productId.endsWith(p.id) ||
        p.id.endsWith(productId) ||
        (p.slug && productId.startsWith(p.slug))
    );
    return match || null;
  }, [products, productId]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [giftCardAmount, setGiftCardAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('560001');
  const [shareToast, setShareToast] = useState(false);

  // Restock subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockToast, setRestockToast] = useState('');

  // Mobile Touch Swipe support for gallery
  const touchStartXRef = useRef<number>(0);

  // Standard 8 days delivery date calculation
  const deliveryDate8Days = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const [pincodeStatus, setPincodeStatus] = useState<string>(
    `Standard Delivery: By ${deliveryDate8Days} (8 Days Dispatch) | Free`
  );

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string>('');

  // Gallery deduplication: puts mainImage first, then extra images
  const gallery = useMemo(() => {
    if (!product) return [];
    const imagesList = [product.mainImage, ...(product.images || [])].filter(Boolean);
    return Array.from(new Set(imagesList));
  }, [product]);

  useEffect(() => {
    if (product) {
      if (product.variants && product.variants.length > 0 && product.variants[0].options.length > 0) {
        setSelectedVariant(product.variants[0].options[0]);
      }
      setActiveImageIndex(0);
      setQuantity(1);
      if (product.isGiftVoucher || product.category === 'gift-cards') {
        setGiftCardAmount(1000);
      }

      setReviewsLoading(true);
      getProductReviews(product.id)
        .then((revs) => setReviews(revs))
        .finally(() => setReviewsLoading(false));

      // Check restock subscription if out of stock
      if (currentUser) {
        isSubscribedToRestock(product.id, selectedVariant).then(setIsSubscribed);
      }
    }
  }, [product, selectedVariant, currentUser]);

  // Loading Skeleton State
  if (storeLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading authentic product details...</p>
      </div>
    );
  }

  // Proper Not Found State
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-in fade-in duration-200">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Product Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
          The requested product could not be located in our catalog. It may have been unpublished or the link might be incomplete.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => onNavigate('products')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Browse All Products
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const isGiftVoucher = Boolean(product.isGiftVoucher || product.category === 'gift-cards');
  const currentSellingPrice = isGiftVoucher ? giftCardAmount : product.sellingPrice;
  const currentOriginalPrice = isGiftVoucher ? giftCardAmount : product.originalPrice;

  const isFavorited = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const cartItem = cart.find((i) => i.productId === product.id);
  const isOutOfStock = !isGiftVoucher && product.stock <= 0;

  // Real review rating statistics calculation
  const ratingBreakdown = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const accurateAverageRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      return Number((sum / reviews.length).toFixed(1));
    }
    return product.rating || 0;
  }, [reviews, product.rating]);

  const accurateReviewCount = reviews.length > 0 ? reviews.length : (product.ratingCount || 0);

  const handlePincodeCheck = () => {
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      setPincodeStatus(`Standard Delivery: Expected by ${deliveryDate8Days} (8 Days Dispatch from Samastipur Hub) | Free Delivery`);
    } else {
      setPincodeStatus('Please enter a valid 6-digit Indian PIN code.');
    }
  };

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      const prodToAdd = isGiftVoucher
        ? { ...product, sellingPrice: giftCardAmount, originalPrice: giftCardAmount }
        : product;
      addToCart(prodToAdd, quantity, selectedVariant || (isGiftVoucher ? `₹${giftCardAmount}` : undefined));
    }
  };

  const handleBuyNow = () => {
    if (!isOutOfStock) {
      const price = isGiftVoucher ? giftCardAmount : product.sellingPrice;
      const variant = selectedVariant || (isGiftVoucher ? `₹${giftCardAmount}` : undefined);
      const buyNowItem = {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: gallery[0] || product.mainImage,
        price,
        quantity,
        selectedVariant: variant,
        isGiftVoucher,
      };

      try {
        sessionStorage.setItem('trendpro_checkout_mode', 'buyNow');
        sessionStorage.setItem('trendpro_buy_now_intent', JSON.stringify(buyNowItem));
      } catch {}

      onNavigate('checkout', {
        mode: 'buyNow',
        buyNowItem,
      });
    }
  };

  // Canonical share handler
  const handleShareProduct = async () => {
    const canonicalSlug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const canonicalUrl = `${window.location.origin}/product/${canonicalSlug}--${product.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on TrendPro at ₹${currentSellingPrice.toLocaleString()}!`,
          url: canonicalUrl,
        });
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch {
      window.prompt('Copy product link:', canonicalUrl);
    }
  };

  // Restock Notification Toggle
  const handleToggleRestockSubscription = async () => {
    if (!currentUser) {
      signInWithGoogle();
      return;
    }
    setRestockSubmitting(true);
    try {
      if (isSubscribed) {
        await unsubscribeRestock(product.id, selectedVariant);
        setIsSubscribed(false);
        setRestockToast('Restock notification alert cancelled.');
      } else {
        await subscribeRestock(product.id, selectedVariant);
        setIsSubscribed(true);
        setRestockToast('✓ Subscribed! You will be immediately alerted when stock returns.');
      }
      setTimeout(() => setRestockToast(''), 4000);
    } catch (err: any) {
      setRestockToast(err.message || 'Error updating restock alert');
      setTimeout(() => setRestockToast(''), 4000);
    } finally {
      setRestockSubmitting(false);
    }
  };

  const handleReviewImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setReviewImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      signInWithGoogle();
      return;
    }

    setReviewSubmitting(true);
    try {
      await addReview(
        product.id,
        reviewRating,
        reviewTitle.trim() || undefined,
        reviewComment.trim() || undefined,
        reviewImages.length ? reviewImages : undefined
      );
      const updated = await getProductReviews(product.id);
      setReviews(updated);
      setShowReviewModal(false);
      setReviewTitle('');
      setReviewComment('');
      setReviewImages([]);
      setReviewError('');
    } catch (err: any) {
      setReviewError(err.message || 'Error submitting review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Gallery Navigation
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
  };

  // Related products check
  const relatedProducts = products
    .filter((p) => {
      const pCats = p.categoryIds || p.categories || [p.category];
      const thisCats = product.categoryIds || product.categories || [product.category];
      const sharesCategory = pCats.some((c) => thisCats.includes(c));
      return sharesCategory && p.id !== product.id && p.isActive;
    })
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      {/* Toast Feedback Notifications */}
      {shareToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Product URL copied to clipboard!</span>
        </div>
      )}

      {restockToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>{restockToast}</span>
        </div>
      )}

      {/* Back button & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap pb-1">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              onNavigate('products');
            }
          }}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-indigo-600 mr-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate('products', { category: product.category })}
          className="capitalize hover:text-slate-900 cursor-pointer"
        >
          {product.category}
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div
            className="relative aspect-square w-full bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden flex items-center justify-center p-6 shadow-xs select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={gallery[activeImageIndex] || product.mainImage}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80';
              }}
            />

            {/* Discount Badge */}
            {product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md">
                {product.discountPercent}% OFF
              </span>
            )}

            {/* Out of Stock Ribbon */}
            {isOutOfStock && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                Out of Stock
              </span>
            )}

            {/* Previous / Next Gallery Controls */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer"
                  title="Previous Image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer"
                  title="Next Image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Zoom Hint Icon */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-4 right-4 p-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 shadow-xs backdrop-blur-xs transition-colors"
              title="Expand Image Lightbox"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Floating Action Buttons: Wishlist, Compare, Share */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer ${
                  isFavorited ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-600 hover:text-rose-600'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>

              <button
                onClick={() => toggleCompare(product.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer ${
                  isCompared ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:text-indigo-600'
                }`}
                title="Compare"
              >
                <Scale className="w-4 h-4" />
              </button>

              <button
                onClick={handleShareProduct}
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Share Unique Product URL"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Extra Images Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-slate-50 p-1 shrink-0 transition-all cursor-pointer ${
                    idx === activeImageIndex
                      ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info & Purchase Form (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {product.brand}
              </span>
              {product.sku && (
                <span className="text-[11px] text-slate-400 font-mono">SKU: {product.sku}</span>
              )}
              {/* Product categories listed cleanly */}
              {(product.categoryIds || product.categories) && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 ml-auto">
                  {(product.categoryIds || product.categories || []).map((catId, i) => (
                    <span key={catId} className="capitalize font-medium text-slate-500">
                      {catId.replace(/-/g, ' ')}
                      {i < (product.categoryIds || product.categories || []).length - 1 && ' ·'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {product.name}
            </h1>

            {/* Accurate Fractional Ratings & Reviews Count */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <StarRating
                rating={accurateAverageRating}
                ratingCount={accurateReviewCount}
                size="md"
                showRatingNumber={true}
                countLabel="verified reviews"
              />
              <span className="text-xs text-indigo-600 font-semibold">• 100% Genuine Reviews</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{currentSellingPrice.toLocaleString()}
              </span>
              {!isGiftVoucher && currentOriginalPrice > currentSellingPrice && (
                <>
                  <span className="text-base text-slate-400 line-through">
                    ₹{currentOriginalPrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-emerald-600">
                    {product.discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isGiftVoucher ? 'Digital Value Loaded • Online Payment Only' : 'Inclusive of all taxes'}
            </p>

            {/* Bank / Voucher Offers */}
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Available Offers
              </p>
              <div className="text-xs text-slate-600 space-y-1">
                {isGiftVoucher ? (
                  <p>• <strong>Instant Digital Delivery:</strong> Card number & PIN will be generated and viewable in My Orders immediately after payment.</p>
                ) : (
                  <>
                    <p>• <strong>Instant ₹500 OFF:</strong> Use coupon code <strong className="text-indigo-600 font-mono">WELCOME500</strong> on orders above ₹2,000.</p>
                    <p>• <strong>5% SuperCoins:</strong> Earn bonus reward coins with TrendPro Plus.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gift Card Denomination Picker (when in gift-cards category) */}
          {isGiftVoucher ? (
            <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Choose Gift Card Value: <span className="text-indigo-600 font-black">₹{giftCardAmount.toLocaleString()}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[500, 1000, 2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setGiftCardAmount(amt)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      giftCardAmount === amt
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                💡 Upon purchase, you will receive a 16-digit Gift Card number and 4-digit PIN. You can use it yourself or share it with friends to credit their TrendPro wallet!
              </p>
            </div>
          ) : (
            /* Standard Variants & Size Selector */
            product.variants && product.variants.length > 0 && (
              <div className="space-y-4">
                {product.variants.map((vGroup, vIdx) => (
                  <div key={vIdx} className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Choose {vGroup.name}: <span className="text-indigo-600 font-bold">{selectedVariant}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {vGroup.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedVariant(opt)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedVariant === opt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Quantity Selector & Stock Status */}
          <div className="flex items-center gap-6">
            {!isOutOfStock && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Quantity</label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-700">Stock Availability</p>
              <p className={`text-xs font-bold mt-1 ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {product.stock > 5
                  ? `In Stock (${product.stock} units available)`
                  : product.stock > 0
                  ? `Hurry! Only ${product.stock} left in stock`
                  : 'Currently Out of Stock'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Add to Cart & Buy Now vs Out of Stock Notify Me */}
          {isOutOfStock ? (
            /* OUT OF STOCK NOTIFY ME SECTION */
            <div className="p-5 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800">
                <span className="p-1.5 bg-rose-200/60 rounded-lg">
                  <Bell className="w-5 h-5 text-rose-700" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">This product is currently sold out</h4>
                  <p className="text-[11px] text-rose-600">
                    Subscribe to receive an alert the moment this item or selected variant is restocked!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleToggleRestockSubscription}
                  disabled={restockSubmitting}
                  className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95 ${
                    isSubscribed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {restockSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Subscription...</span>
                    </>
                  ) : isSubscribed ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Subscribed for Restock Alert</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Notify Me When Available</span>
                    </>
                  )}
                </button>

                {isSubscribed && (
                  <button
                    onClick={handleToggleRestockSubscription}
                    disabled={restockSubmitting}
                    className="px-4 py-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-100/60 transition-colors cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* IN STOCK ACTIONS */
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
              <button
                onClick={handleAddToCart}
                className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                  cartItem
                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400'
                    : 'bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-600'
                }`}
              >
                {cartItem ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>In Cart ({cartItem.quantity})</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                className="py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Buy Now</span>
              </button>
            </div>
          )}

          {/* Delivery Pincode Checker */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Check Delivery & COD Availability
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.slice(0, 6))}
                placeholder="Enter 6-digit PIN code"
                maxLength={6}
                className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 w-48 outline-hidden focus:border-indigo-500"
              />
              <button
                onClick={handlePincodeCheck}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Check
              </button>
            </div>
            {pincodeStatus && (
              <p className="text-xs text-indigo-700 font-medium">{pincodeStatus}</p>
            )}
          </div>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs text-slate-600">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="font-bold text-slate-800">{product.warranty || 'Brand Warranty'}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center">
              <RotateCcw className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="font-bold text-slate-800">7 Days Return</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center">
              <Truck className="w-5 h-5 text-amber-600 mb-1" />
              <span className="font-bold text-slate-800">Express Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Highlights Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-8 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Product Overview</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
            {product.description}
          </p>

          {product.highlights && product.highlights.length > 0 && (
            <div className="mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Key Highlights</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Specifications Table */}
        {product.specs && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Specifications</h2>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-w-3xl">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 p-3 text-xs">
                  <span className="font-semibold text-slate-500">{key}</span>
                  <span className="col-span-2 text-slate-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In The Box */}
        {product.inTheBox && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">In The Box</h2>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 inline-block">
              {product.inTheBox}
            </p>
          </div>
        )}
      </div>

      {/* Customer Ratings & Reviews Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Ratings & Customer Reviews</h2>
            <p className="text-xs text-slate-500 mt-0.5">Calculated from actual verified buyer review records</p>
          </div>

          <button
            onClick={() => {
              if (!currentUser) {
                signInWithGoogle();
              } else {
                setShowReviewModal(true);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm self-start sm:self-auto cursor-pointer"
          >
            ★ Rate & Review Product
          </button>
        </div>

        {/* Accurate Real Rating Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 items-center">
          <div className="text-center md:border-r md:border-slate-200 pr-6 space-y-2">
            <div className="text-4xl font-black text-slate-900">
              {accurateAverageRating > 0 ? accurateAverageRating.toFixed(1) : '0.0'}
            </div>
            <div className="flex justify-center">
              <StarRating rating={accurateAverageRating} size="md" showCount={false} />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {reviews.length > 0
                ? `${reviews.length} authentic buyer review${reviews.length > 1 ? 's' : ''}`
                : 'No reviews submitted yet'}
            </p>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown[stars] || 0;
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-8 text-slate-600 font-bold">{stars} ★</span>
                  <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-slate-500 font-mono">
                    {pct}% ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Reviews List */}
        <div className="space-y-4 pt-2">
          {reviewsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading verified reviews...</span>
            </div>
          ) : reviews.length > 0 ? (
            <>
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating rating={rev.rating} size="xs" showCount={false} />
                      <span className="text-xs font-bold text-slate-900">{rev.title || 'Verified Rating'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rev.comment && <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>}

                  {/* Customer Review Photos */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {rev.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img}
                          alt="Customer uploaded review"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{rev.userName}</span>
                    {rev.isVerifiedPurchase && (
                      <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                        <Check className="w-3 h-3" /> Certified Buyer
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {reviews.length > 3 && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    {showAllReviews
                      ? 'Show Fewer Reviews ↑'
                      : `View All (${reviews.length}) Customer Reviews ↓`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              No written reviews yet for this product. Be the first verified customer to share your thoughts!
            </p>
          )}
        </div>
      </div>

      {/* Related Products Recommendation */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Write a Product Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">{product.name}</p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {reviewError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
                  {reviewError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setReviewRating(num)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{reviewRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Review Headline (Optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Superb build quality and fast shipping!"
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Feedback</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with product performance, fit, and packaging..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Add Photos (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReviewImageFile}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {reviewImages.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {reviewImages.map((img, i) => (
                      <img key={i} src={img} alt="Upload preview" className="w-12 h-12 object-cover rounded-lg border" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Posting...' : 'Submit Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for enlarged product image */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={gallery[activeImageIndex] || product.mainImage}
              alt={product.name}
              className="max-h-[75vh] w-auto object-contain rounded-2xl"
            />

            {gallery.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl border-2 overflow-hidden bg-slate-50 p-1 shrink-0 ${
                      idx === activeImageIndex ? 'border-indigo-600' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
