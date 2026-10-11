import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { AnnouncementBar } from './components/common/AnnouncementBar';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { VoiceAssistantModal } from './components/common/VoiceAssistantModal';
import { Mic, Sparkles } from 'lucide-react';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletPage } from './pages/WalletPage';
import { WishlistPage } from './pages/WishlistPage';
import { ComparePage } from './pages/ComparePage';
import { SupportChatPage } from './pages/SupportChatPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import {
  AboutPage,
  ContactPage,
  FAQPage,
  PolicyPage
} from './pages/StaticPages';

// URL Routing Helpers
export function parseUrlToRoute(
  pathname: string,
  search: string
): { route: string; params: Record<string, any> } {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);

  if (cleanPath === '/' || cleanPath === '/home') {
    return { route: 'home', params: {} };
  }
  if (cleanPath.startsWith('/product/')) {
    const slugOrId = decodeURIComponent(cleanPath.replace('/product/', ''));
    return { route: 'product-detail', params: { id: slugOrId } };
  }
  if (cleanPath.startsWith('/category/')) {
    const categorySlug = decodeURIComponent(cleanPath.replace('/category/', ''));
    return { route: 'products', params: { category: categorySlug } };
  }
  if (cleanPath === '/trending') {
    return { route: 'products', params: { category: 'trending' } };
  }
  if (cleanPath === '/cart') {
    return { route: 'cart', params: {} };
  }
  if (cleanPath === '/checkout') {
    return { route: 'checkout', params: {} };
  }
  if (cleanPath.startsWith('/order-confirmation/')) {
    const orderId = decodeURIComponent(cleanPath.replace('/order-confirmation/', ''));
    return { route: 'order-confirmation', params: { orderId } };
  }
  if (cleanPath === '/order-confirmation') {
    const orderId = searchParams.get('orderId') || '';
    return { route: 'order-confirmation', params: { orderId } };
  }
  if (cleanPath === '/orders') {
    return { route: 'orders', params: {} };
  }
  if (cleanPath.startsWith('/order/') || cleanPath.startsWith('/order-detail/')) {
    const parts = cleanPath.split('/');
    const orderId = decodeURIComponent(parts[parts.length - 1] || '');
    return { route: 'order-detail', params: { id: orderId } };
  }
  if (cleanPath === '/profile') {
    return { route: 'profile', params: {} };
  }
  if (cleanPath === '/wallet') {
    return { route: 'wallet', params: {} };
  }
  if (cleanPath === '/vouchers') {
    return { route: 'vouchers', params: {} };
  }
  if (cleanPath === '/wishlist') {
    return { route: 'wishlist', params: {} };
  }
  if (cleanPath === '/compare') {
    return { route: 'compare', params: {} };
  }
  if (cleanPath === '/support') {
    return {
      route: 'support',
      params: {
        orderId: searchParams.get('orderId') || undefined,
        userId: searchParams.get('userId') || undefined,
      },
    };
  }
  if (cleanPath === '/notifications') {
    return { route: 'notifications', params: {} };
  }
  if (cleanPath === '/admin') {
    const tab = searchParams.get('tab') || undefined;
    return { route: 'admin', params: { tab } };
  }
  if (cleanPath === '/about') {
    return { route: 'about', params: {} };
  }
  if (cleanPath === '/contact') {
    return { route: 'contact', params: {} };
  }
  if (cleanPath === '/faq') {
    return { route: 'faq', params: {} };
  }
  if (cleanPath === '/privacy-policy') {
    return { route: 'privacy-policy', params: {} };
  }
  if (cleanPath === '/terms') {
    return { route: 'terms', params: {} };
  }
  if (cleanPath === '/shipping-policy') {
    return { route: 'shipping-policy', params: {} };
  }
  if (cleanPath === '/return-policy') {
    return { route: 'return-policy', params: {} };
  }
  if (cleanPath === '/products') {
    const cat = searchParams.get('category') || undefined;
    const searchVal = searchParams.get('search') || undefined;
    return { route: 'products', params: { category: cat, search: searchVal } };
  }

  return { route: 'home', params: {} };
}

export function routeToPath(route: string, params: Record<string, any> = {}): string {
  switch (route) {
    case 'home':
      return '/';
    case 'product-detail': {
      const slugOrId = params.id || params.slug || '';
      return `/product/${encodeURIComponent(slugOrId)}`;
    }
    case 'products': {
      if (params.category && params.category !== 'all') {
        if (params.category === 'trending') return '/trending';
        return `/category/${encodeURIComponent(params.category)}`;
      }
      if (params.search) {
        return `/products?search=${encodeURIComponent(params.search)}`;
      }
      return '/products';
    }
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'order-confirmation':
      return params.orderId ? `/order-confirmation/${encodeURIComponent(params.orderId)}` : '/order-confirmation';
    case 'orders':
      return '/orders';
    case 'order-detail':
      return `/order/${encodeURIComponent(params.id || params.orderId || '')}`;
    case 'profile':
      return '/profile';
    case 'wallet':
      return '/wallet';
    case 'vouchers':
      return '/vouchers';
    case 'wishlist':
      return '/wishlist';
    case 'compare':
      return '/compare';
    case 'support': {
      const qs = new URLSearchParams();
      if (params.orderId) qs.set('orderId', params.orderId);
      if (params.userId) qs.set('userId', params.userId);
      const str = qs.toString();
      return str ? `/support?${str}` : '/support';
    }
    case 'notifications':
      return '/notifications';
    case 'admin':
      return params.tab ? `/admin?tab=${encodeURIComponent(params.tab)}` : '/admin';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'faq':
      return '/faq';
    case 'privacy-policy':
      return '/privacy-policy';
    case 'terms':
      return '/terms';
    case 'shipping-policy':
      return '/shipping-policy';
    case 'return-policy':
      return '/return-policy';
    default:
      return '/';
  }
}

export function AppContent() {
  const getInitialRoute = () => {
    if (typeof window !== 'undefined') {
      return parseUrlToRoute(window.location.pathname, window.location.search);
    }
    return { route: 'home', params: {} };
  };

  const initial = getInitialRoute();
  const [currentRoute, setCurrentRoute] = useState<string>(initial.route);
  const [routeParams, setRouteParams] = useState<Record<string, any>>(initial.params);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Synchronize browser history and handle Back / Forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure the initial history entry contains the active state
    const currentPath = window.location.pathname + window.location.search;
    const initialPath = routeToPath(initial.route, initial.params);
    if (!window.history.state || !window.history.state.route) {
      window.history.replaceState({ route: initial.route, params: initial.params }, '', currentPath || initialPath);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.route) {
        setCurrentRoute(event.state.route);
        setRouteParams(event.state.params || {});
      } else {
        const parsed = parseUrlToRoute(window.location.pathname, window.location.search);
        setCurrentRoute(parsed.route);
        setRouteParams(parsed.params);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ask for notification permission early so order & refund alerts can be sent
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowNotifBanner(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          new Notification('TrendPro Notifications Enabled', {
            body: 'You will now receive live alerts for orders, dispatch status, cancellations, and return approvals!',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
    setShowNotifBanner(false);
  };

  // Synchronize route navigation with pushState / replaceState
  const navigate = (
    route: string,
    params: Record<string, any> = {},
    options?: { replace?: boolean }
  ) => {
    setCurrentRoute(route);
    setRouteParams(params);

    if (typeof window !== 'undefined') {
      const targetPath = routeToPath(route, params);
      const currentFullPath = window.location.pathname + window.location.search;
      if (currentFullPath !== targetPath) {
        if (options?.replace) {
          window.history.replaceState({ route, params }, '', targetPath);
        } else {
          window.history.pushState({ route, params }, '', targetPath);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Render current active page
  const renderPage = () => {
    switch (currentRoute) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'products':
        return (
          <ProductsPage
            onNavigate={navigate}
            initialCategory={routeParams.category}
            initialSearch={routeParams.search}
          />
        );
      case 'product-detail':
        return <ProductDetailPage productId={routeParams.id} onNavigate={navigate} />;
      case 'cart':
        return <CartPage onNavigate={navigate} />;
      case 'checkout':
        return <CheckoutPage onNavigate={navigate} checkoutParams={routeParams} />;
      case 'order-confirmation':
        return <OrderConfirmationPage orderId={routeParams.orderId} onNavigate={navigate} />;
      case 'orders':
        return <OrdersPage onNavigate={navigate} />;
      case 'order-detail':
        return <OrderDetailPage orderId={routeParams.id} onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      case 'wallet':
      case 'vouchers':
        return <WalletPage onNavigate={navigate} />;
      case 'wishlist':
        return <WishlistPage onNavigate={navigate} />;
      case 'compare':
        return <ComparePage onNavigate={navigate} />;
      case 'support':
        return (
          <SupportChatPage
            onNavigate={navigate}
            orderIdParam={routeParams.orderId || routeParams.id}
            customerUserIdParam={routeParams.userId || routeParams.customerId}
          />
        );
      case 'notifications':
        return <NotificationsPage onNavigate={navigate} />;
      case 'admin':
        return <AdminDashboard onNavigate={navigate} />;
      case 'about':
        return <AboutPage onNavigate={navigate} />;
      case 'contact':
        return <ContactPage onNavigate={navigate} />;
      case 'faq':
        return <FAQPage onNavigate={navigate} />;
      case 'privacy-policy':
        return <PolicyPage onNavigate={navigate} type="privacy" />;
      case 'terms':
        return <PolicyPage onNavigate={navigate} type="terms" />;
      case 'shipping-policy':
        return <PolicyPage onNavigate={navigate} type="shipping" />;
      case 'return-policy':
        return <PolicyPage onNavigate={navigate} type="returns" />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <AnnouncementBar />

      {/* Early Notification Permission Banner */}
      {showNotifBanner && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white px-4 py-2.5 text-xs font-semibold shadow-md border-b border-indigo-700/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-indigo-500/20 text-amber-300 rounded-lg">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <p>
              <strong>Enable Live Order Alerts:</strong> Get instant notifications for dispatch status, returns, and cancellation approvals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnableNotifications}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-1 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              Allow Notifications
            </button>
            <button
              onClick={() => setShowNotifBanner(false)}
              className="p-1 text-indigo-300 hover:text-white rounded-lg cursor-pointer"
              title="Later"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Header
        onNavigate={navigate}
        currentRoute={currentRoute}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
      />
      
      <main className="flex-1">
        {renderPage()}
      </main>

      {/* Floating Futuristic Voice AI Orb Action Button */}
      <aside aria-label="Voice shopping assistant" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
          title="Open TrendPro Voice AI Shopping Assistant"
        >
          {/* Animated Glow Rings */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60 blur-xs group-hover:opacity-100 transition-opacity" />
          
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs">
            <Mic className="w-4 h-4 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>

          <div className="relative flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-tight flex items-center gap-1">
              <span>TrendPro Voice</span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </span>
            <span className="text-[10px] text-indigo-100 font-medium">
              Tap or say &ldquo;Hi TrendPro&rdquo;
            </span>
          </div>
        </button>
      </aside>

      {/* Real-time Conversational Voice AI Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onNavigate={navigate}
      />

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
