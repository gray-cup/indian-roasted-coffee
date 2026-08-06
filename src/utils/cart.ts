export const GRIND_OPTIONS = ['Whole Bean', 'Coarse', 'Medium', 'Fine', 'Espresso-Fine'] as const;
export type Grind = (typeof GRIND_OPTIONS)[number];

export interface CartItem {
  productSlug: string;
  productName: string;
  weightGrams: number;
  weightLabel: string;
  grind: Grind;
  unitPriceInr: number;
  quantity: number;
}

const CART_KEY = 'irc_cart';
const CART_EVENT = 'cart:updated';

function sameLine(a: CartItem, b: Pick<CartItem, 'productSlug' | 'weightGrams' | 'grind'>): boolean {
  return a.productSlug === b.productSlug && a.weightGrams === b.weightGrams && a.grind === b.grind;
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function dispatch(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart }));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
  const cart = getCart();
  const existing = cart.find((i) => sameLine(i, item));
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  dispatch(cart);
}

export function updateQuantity(
  line: Pick<CartItem, 'productSlug' | 'weightGrams' | 'grind'>,
  quantity: number
): void {
  const cart = getCart()
    .map((i) => (sameLine(i, line) ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  dispatch(cart);
}

export function removeFromCart(line: Pick<CartItem, 'productSlug' | 'weightGrams' | 'grind'>): void {
  const cart = getCart().filter((i) => !sameLine(i, line));
  dispatch(cart);
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: [] }));
}
