/**
 * Loads Cashfree's Checkout.js SDK as a plain <script> tag (not an npm
 * dependency) and hands back a ready-to-use instance. Checkout calls this
 * directly from the checkout form's submit handler — no separate
 * "Opening payment page…" hand-off page in between, so a failure (SDK
 * blocked, session expired, etc.) surfaces immediately on the same page
 * the customer is already looking at, not after a redirect.
 */

export interface CashfreeCheckoutResult {
  error?: { message: string };
  redirect?: boolean;
  paymentDetails?: unknown;
}

interface CashfreeInstance {
  checkout: (options: {
    paymentSessionId: string;
    returnUrl?: string;
    redirectTarget?: '_self' | '_blank' | '_top';
  }) => Promise<CashfreeCheckoutResult>;
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: 'production' | 'sandbox' }) => CashfreeInstance;
  }
}

const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CASHFREE_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

export async function getCashfree(mode: 'production' | 'sandbox'): Promise<CashfreeInstance> {
  await loadScript();
  if (!window.Cashfree) throw new Error('Cashfree SDK failed to initialize');
  return window.Cashfree({ mode });
}
