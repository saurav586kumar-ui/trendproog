import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TrendPro ErrorBoundary caught runtime exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  handleClearCacheAndRestart = () => {
    try {
      localStorage.removeItem('trendpro_guest_cart');
      localStorage.removeItem('trendpro_guest_wishlist');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache clearing notice:', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 text-center">
            {/* TrendPro Brand Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>TrendPro Online Marketplace</span>
            </div>

            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Application Diagnostic Notice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                TrendPro encountered an unexpected display condition. Your account, orders, and authentication remain completely secure.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-200 active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Store</span>
              </button>
            </div>

            {/* Secondary reset option */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={this.handleClearCacheAndRestart}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Guest Storage & Reload</span>
              </button>
            </div>

            {/* Collapsible Technical Details for Developer / Diagnostics */}
            {this.state.error && (
              <div className="text-left pt-2 border-t border-slate-100">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
                >
                  <span>Technical Diagnostics</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-xl text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 text-left space-y-1">
                    <p className="text-rose-400 font-bold">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.error.stack && (
                      <pre className="text-slate-400 text-[10px] whitespace-pre-wrap">{this.state.error.stack}</pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
