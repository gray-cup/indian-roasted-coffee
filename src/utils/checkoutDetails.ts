/**
 * Remembers the customer's delivery details in the browser (localStorage) so
 * returning visitors don't have to retype name/phone/email/address/state/pincode
 * on their next order. Never touches GST or business/individual type — those
 * are left for the customer to re-confirm each time.
 */

export interface SavedCheckoutDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  pincode: string;
}

interface StoredCheckoutDetails extends SavedCheckoutDetails {
  /** Epoch ms — entries older than MAX_AGE_MS are treated as expired. */
  savedAt: number;
}

const STORAGE_KEY = 'irc_checkout_details';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export function loadSavedCheckoutDetails(): Partial<SavedCheckoutDetails> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as StoredCheckoutDetails;
    if (!data.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const { name, phone, email, address, state, pincode } = data;
    return { name, phone, email, address, state, pincode };
  } catch {
    return null;
  }
}

export function saveCheckoutDetails(details: SavedCheckoutDetails): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...details, savedAt: Date.now() }));
  } catch {
    // Private browsing / storage disabled / quota exceeded — just skip persistence.
  }
}
