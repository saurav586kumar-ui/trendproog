import React, { useState, useMemo } from 'react';
import {
  Filter,
  X,
  SlidersHorizontal,
  Star,
  Search
} from 'lucide-react';
import { ProductCard } from '../components/common/ProductCard';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

interface ProductsPageProps {
  onNavigate: (route: string, params?: Record<string, any>) => void;
  initialCategory?: string;
  initialSearch?: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onNavigate,
  initialCategory,
  initialSearch,
}) => {
  const { products, categories } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating' | 'discount'>('featured');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Sync state if navigation props change
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    } else {
      setSelectedCategory('all');
    }
  }, [initialCategory]);

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Available brands in the store
  const allBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).filter(Boolean);
  }, [products]);

  // Filtered & deduplicated products with multiple categories support
  const filteredProducts = useMemo(() => {
    // Deduplicate by ID to guarantee no duplicate product cards
    const uniqueProductsMap = new Map<string, Product>();
    products.forEach((p) => {
      if (!uniqueProductsMap.has(p.id)) {
        uniqueProductsMap.set(p.id, p);
      }
    });
    const uniqueProducts = Array.from(uniqueProductsMap.values());

    return uniqueProducts
      .filter((p) => {
        if (!p.isActive) return false;

        // Multiple categories support: matches if category is in categoryIds, categories, or category
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'trending') {
            if (!p.isTrending) return false;
          } else {
            const productCats = [
              p.category,
              ...(p.categoryIds || []),
              ...(p.categories || []),
            ].filter(Boolean);
            if (!productCats.includes(selectedCategory)) {
              return false;
            }
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const catsStr = (p.categoryIds || p.categories || [p.category]).join(' ').toLowerCase();
          const match =
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            catsStr.includes(q) ||
            p.description.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
        if (p.sellingPrice > maxPrice) return false;
        if (p.rating < minRating) return false;
        if (inStockOnly && p.stock <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price-high') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, selectedCategory, searchQuery, selectedBrands, minRating, maxPrice, inStockOnly, sortBy]);

  // Accurate live product count per category
  const getCategoryCount = (catSlug: string) => {
    if (catSlug === 'all') return products.filter((p) => p.isActive).length;
    if (catSlug === 'trending') return products.filter((p) => p.isActive && p.isTrending).length;
    return products.filter((p) => {
      if (!p.isActive) return false;
      const cats = [p.category, ...(p.categoryIds || []), ...(p.categories || [])].filter(Boolean);
      return cats.includes(catSlug);
    }).length;
  };

  const selectCategoryAndSyncUrl = (catSlug: string) => {
    setSelectedCategory(catSlug);
    onNavigate('products', {
      category: catSlug === 'all' ? undefined : catSlug,
      search: searchQuery || undefined,
    });
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearAllFilters = () => {
    selectCategoryAndSyncUrl('all');
    setSearchQuery('');
    setSelectedBrands([]);
    setMinRating(0);
    setMaxPrice(50000);
    setInStockOnly(false);
    setSortBy('featured');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery !== '' ||
    selectedBrands.length > 0 ||
    minRating > 0 ||
    maxPrice < 50000 ||
    inStockOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedCategory === 'all'
              ? 'All Products'
              : categories.find((c) => c.slug === selectedCategory)?.name || 'Catalog'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing <strong className="text-slate-900">{filteredProducts.length}</strong> items
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            <Filter className="w-4 h-4" />
            <span>Filters {hasActiveFilters ? '• Active' : ''}</span>
          </button>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
              <option value="discount">Highest Discount</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Filter By</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* In-Catalog Search */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Keyword Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Brand, model, specs..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 outline-hidden focus:border-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Category
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <button
                  onClick={() => selectCategoryAndSyncUrl('all')}
                  className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[10px] text-slate-400 font-mono">({getCategoryCount('all')})</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCategoryAndSyncUrl(c.slug)}
                    className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      selectedCategory === c.slug
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({getCategoryCount(c.slug)})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Max Price
                </label>
                <span className="text-xs font-extrabold text-indigo-600">
                  ₹{maxPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>₹1,000</span>
                <span>₹50,000+</span>
              </div>
            </div>

            {/* Customer Rating Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Min Customer Rating
              </label>
              <div className="space-y-1.5">
                {[4, 3, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(minRating === r ? 0 : r)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      minRating === r
                        ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{r}★ & Above</span>
                    </div>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            {allBrands.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Brands
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {allBrands.map((brand) => (
                    <label
                      key={brand}
                      className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* In-Stock Filter */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Exclude Out of Stock</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
              <p className="text-xs text-slate-500 mb-6">
                We couldn&apos;t find any items matching your current filters. Try resetting the filters or searching for something else.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Filters</span>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="py-4 space-y-6 flex-1">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Category
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      selectCategoryAndSyncUrl('all');
                      setShowMobileFilters(false);
                    }}
                    className={`block w-full text-left px-2 py-1.5 rounded-lg text-xs ${
                      selectedCategory === 'all' ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-600'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectCategoryAndSyncUrl(c.slug);
                        setShowMobileFilters(false);
                      }}
                      className={`block w-full text-left px-2 py-1.5 rounded-lg text-xs ${
                        selectedCategory === c.slug ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-600'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Max Price</span>
                  <span className="font-bold text-indigo-600">₹{maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* In-Stock */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span>In-Stock Only</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Clear
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
