export interface CartItem {
  id: string;
  title: string;
  size: string;
  grind: string;
  quantity: number;
  pricePerUnit: number;
}

const CART_KEY = 'irc_cart';
const CART_EVENT = 'cart:updated';

export const SIZE_PRICES: Record<string, number> = {
  '250 g': 349,
  '500 g': 649,
  '1 kg': 1199,
};

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function dispatch(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart }));
}

export function addToCart(item: Omit<CartItem, 'quantity'>): void {
  const cart = getCart();
  const existing = cart.find(
    (i) => i.id === item.id && i.size === item.size && i.grind === item.grind
  );
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  dispatch(cart);
}

export function updateQuantity(id: string, size: string, grind: string, quantity: number): void {
  const cart = getCart()
    .map((i) => (i.id === id && i.size === size && i.grind === grind ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  dispatch(cart);
}

export function removeFromCart(id: string, size: string, grind: string): void {
  const cart = getCart().filter(
    (i) => !(i.id === id && i.size === size && i.grind === grind)
  );
  dispatch(cart);
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: [] }));
}
