import { persistentJSON } from '@nanostores/persistent';

export interface CartItem {
  /** Product slug — matches the content collection entry id. */
  id: string;
  title: string;
  /** Weight in grams — the source of truth for repricing at checkout. */
  grams: number;
  /** Display label, e.g. "500g" — derived from `grams` at add-to-cart time. */
  size: string;
  grind: string;
  quantity: number;
  pricePerUnit: number;
  /** Product image URL, for cart/checkout thumbnails. */
  image?: string;
}

/**
 * Shared cart state — see https://docs.astro.build/en/recipes/sharing-state-islands/
 * `persistentJSON` mirrors this atom to localStorage under `irc_cart` and
 * keeps it in sync across tabs automatically (via the storage event), so
 * every island (BuyWidget, ServiceCard, CartButton, the cart page) just
 * reads/writes this one store instead of hand-rolling localStorage +
 * CustomEvent plumbing.
 */
export const $cart = persistentJSON<CartItem[]>('irc_cart', []);

export function getCart(): readonly CartItem[] {
  return $cart.get();
}

export function cartTotal(cart: readonly CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
}

export function cartItemCount(cart: readonly CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCart(item: Omit<CartItem, 'quantity'>): void {
  const cart = $cart.get();
  const existing = cart.find(
    (i) => i.id === item.id && i.grams === item.grams && i.grind === item.grind
  );
  if (existing) {
    $cart.set(cart.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i)));
  } else {
    $cart.set([...cart, { ...item, quantity: 1 }]);
  }
}

export function updateQuantity(id: string, grams: number, grind: string, quantity: number): void {
  $cart.set(
    $cart.get()
      .map((i) => (i.id === id && i.grams === grams && i.grind === grind ? { ...i, quantity } : i))
      .filter((i) => i.quantity > 0)
  );
}

export function removeFromCart(id: string, grams: number, grind: string): void {
  $cart.set($cart.get().filter((i) => !(i.id === id && i.grams === grams && i.grind === grind)));
}

export function clearCart(): void {
  $cart.set([]);
}

/**
 * Encode a cart as a URL-safe base64 string, for building shareable
 * "buy this exact cart" links (see the cart builder at /admin/cart-builder).
 */
export function encodeSharedCart(items: readonly CartItem[]): string {
  const json = JSON.stringify(items);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a cart previously produced by `encodeSharedCart`. Returns null if invalid. */
export function decodeSharedCart(encoded: string): CartItem[] | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(base64)));
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return null;
    return data as CartItem[];
  } catch {
    return null;
  }
}
