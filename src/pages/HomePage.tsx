import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  Tag,
  Database,
  CheckCircle,
  Sliders
} from 'lucide-react';
import { BannerCarousel } from '../components/home/BannerCarousel';
import { CategoryRibbon } from '../components/home/CategoryRibbon';
import { ProductCard } from '../components/common/ProductCard';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

interface HomePageProps {
  onNavigate: (route: string, params?: Record<string, any>) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { products, categories, banners, seedInitialDataToFirestore, trendingConfig, isFirebaseSyncing } = useStore();
  const { isAdmin } = useAuth();
  const [seeded, setSeeded] = useState(false);

  // OWNER-CONTROLLED TRENDING PRODUCTS:
  // Only products explicitly selected by the store owner appear here.
  // Maintains owner display priority and gracefully handles missing/unpublished products.
  const trendingProducts: Product[] = useMemo(() => {
    if (trendingConfig && Array.isArray(trendingConfig.productIds) && trendingConfig.productIds.length > 0) {
      const result: Product[] = [];
      for (const id of trendingConfig.productIds) {
        const prod = products.find((p) => p.id === id && p.isActive);
        if (prod) {
          result.push(prod);
        }
      }
      if (result.length > 0) return result;
    }
    // Fallback: only products with explicit isTrending flag set by owner, or top active products
    const trending = products.filter((p) => p.isTrending && p.isActive);
    if (trending.length > 0) return trending.slice(0, 8);
    return products.filter((p) => p.isActive).slice(0, 8);
  }, [products, trendingConfig]);

  // Multiple category support for homepage section listings
  const techDeals = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.isActive) return false;
        const cats = p.categoryIds || p.categories || [p.category];
        return cats.includes('electronics') || cats.includes('gadgets') || p.category === 'electronics';
      })
      .slice(0, 4);
  }, [products]);

  const fashionDeals = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.isActive) return false;
        const cats = p.categoryIds || p.categories || [p.category];
        return (
          cats.includes('fashion') ||
          cats.includes('clothing') ||
          cats.includes('footwear') ||
          p.category === 'fashion'
        );
      })
      .slice(0, 4);
  }, [products]);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Banner Carousel */}
      <BannerCarousel banners={banners} onNavigate={onNavigate} />

      {/* Categories Navigation Ribbon */}
      <CategoryRibbon
        categories={categories}
        onSelectCategory={(slug) => onNavigate('products', { category: slug })}
      />

      {/* Admin Quick Catalog Seeder Notice */}
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-700/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Owner Setup Console</p>
                <p className="text-sm font-semibold">Cloud Firestore Catalog & Trending Products Synced</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('admin', { tab: 'trending' })}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Configure Trending Deals</span>
              </button>
              <button
                onClick={async () => {
                  await seedInitialDataToFirestore();
                  setSeeded(true);
                  setTimeout(() => setSeeded(false), 4000);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {seeded ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>Catalog Synced!</span>
                  </>
                ) : (
                  <span>Sync Sample Catalog</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner-Controlled Trending Deals of the Day Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              Curated Highlights
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Trending Top Sellers
            </h2>
          </div>
          <button
            onClick={() => onNavigate('products', { filter: 'trending' })}
            className="group flex items-center gap-1 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        ) : isFirebaseSyncing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="aspect-square bg-slate-200 rounded-xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-6 bg-slate-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-2">
            <Flame className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No trending products configured</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The store owner curates which products are highlighted in the trending section.
            </p>
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin', { tab: 'trending' })}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Select Trending Products in Owner Panel →
              </button>
            )}
          </div>
        )}
      </section>

      {/* Promotional Value Proposition Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-800 text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
              <Tag className="w-3.5 h-3.5" /> TrendPro Plus Membership
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Enjoy Free Next-Day Delivery & Extra 5% SuperCoins on Every Purchase
            </h3>
            <p className="text-indigo-100 text-xs sm:text-sm">
              Upgrade your shopping experience with priority customer support, early festive access, and exclusive coupons.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('products')}
                className="bg-white text-indigo-900 hover:bg-slate-100 text-xs sm:text-sm font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Start Shopping Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Electronics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              High Performance Tech
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Top Electronics & Gadgets
            </h2>
          </div>
          <button
            onClick={() => onNavigate('products', { category: 'electronics' })}
            className="group flex items-center gap-1 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>Explore Electronics</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {techDeals.map((product) => (
            <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* Fashion & Footwear */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Curated Wardrobe
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Trending Fashion & Footwear
            </h2>
          </div>
          <button
            onClick={() => onNavigate('products', { category: 'fashion' })}
            className="group flex items-center gap-1 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>Explore Fashion</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {fashionDeals.map((product) => (
            <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
          ))}
        </div>
      </section>
    </div>
  );
};
