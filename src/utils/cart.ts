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

/** Grind options offered across the buy widget, cart builder, and share links — index into this array is what gets encoded in a share link. */
export const GRINDS = [
  'Whole Bean',
  'Coarse (French Press)',
  'Medium (Filter/Pour-over)',
  'Fine (Espresso)',
] as const;

/**
 * Self-describing "productId:grams:grindIndex:qty" encoding for the /o/[slug]
 * share link built by the cart builder (see /cart-builder). The slug IS the
 * cart — no database or storage involved. Price and title are deliberately
 * left out and re-resolved from the product catalog when the link is opened,
 * so a shared link can't be edited to claim a different price.
 */
export interface ShareItem {
  productId: string;
  grams: number;
  grindIndex: number;
  quantity: number;
}

export function encodeShareItem(it: ShareItem): string {
  const parts = [String(it.productId), String(it.grams), String(it.grindIndex), it.quantity > 1 ? String(it.quantity) : ''];
  while (parts.length > 3 && parts[parts.length - 1] === '') parts.pop();
  return parts.join(':');
}

export function encodeShareItems(items: readonly ShareItem[]): string {
  return items.map(encodeShareItem).join(',');
}

export function decodeShareItems(param: string): ShareItem[] {
  if (!param) return [];
  return param.split(',').flatMap((entry) => {
    const [productId, gramsStr, grindStr, qtyStr] = entry.split(':');
    const grams = Number(gramsStr);
    const grindIndex = Number(grindStr);
    if (!productId || !Number.isFinite(grams) || !Number.isFinite(grindIndex)) return [];
    const quantity = qtyStr ? Math.max(1, Math.floor(Number(qtyStr)) || 1) : 1;
    return [{ productId, grams, grindIndex, quantity }];
  });
}
