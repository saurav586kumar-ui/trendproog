import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err: unknown) {
    console.error('Fatal initialization error in main.tsx:', err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-family: system-ui, sans-serif; padding: 24px; text-align: center;">
        <div style="max-width: 480px; background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <div style="width: 48px; height: 48px; background: #fee2e2; color: #dc2626; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">⚠️</div>
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">TrendPro Marketplace</h2>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">An error occurred while launching the application. Click below to reload.</p>
          <button onclick="window.location.reload()" style="background: #4f46e5; color: white; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer;">Reload Store</button>
        </div>
      </div>
    `;
  }
} else {
  console.error('Fatal: #root container element was not found in the DOM.');
}
