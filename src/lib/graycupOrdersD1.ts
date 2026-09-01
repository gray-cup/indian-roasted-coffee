/**
 * Best-effort mirror of this site's orders into orders-graycup's admin
 * dashboard, via the shared "graycup-orders" D1 database (binding
 * GRAYCUP_ORDERS_DB, see wrangler.jsonc). Turso remains the source of
 * truth — every function here swallows its own errors so a D1 outage never
 * breaks checkout, payment verification, or the webhook.
 */

// Astro v6 removed `Astro.locals.runtime.env` — bindings now come from the
// Workers runtime module. `env` is undefined outside a Worker (e.g. tests).
import { env } from 'cloudflare:workers';

interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
  };
}

export interface OrderForD1 {
  orderId: string;
  cashfreeOrderId: string | null;
  paymentSessionId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerState: string | null;
  customerPincode: string | null;
  customerType: string;
  gstNumber: string | null;
  productSlug: string;
  productName: string;
  weightGrams: number;
  weightLabel: string;
  quantity: number;
  grind: string | null;
  cartItemsJson: string | null;
  deliveryFeeInr: number;
  amountInr: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Insert (or update on retry) the full order row — called at order creation. */
export async function upsertOrderInGraycupD1(order: OrderForD1): Promise<void> {
  const d1 = (env as { GRAYCUP_ORDERS_DB?: D1Like } | undefined)?.GRAYCUP_ORDERS_DB;
  if (!d1) return;
  try {
    await d1
      .prepare(
        `INSERT INTO indian_roasted_coffee_orders (
          order_id, cashfree_order_id, payment_session_id,
          customer_name, customer_email, customer_phone, customer_address, customer_state, customer_pincode,
          customer_type, gst_number,
          product_slug, product_name, weight_grams, weight_label, quantity, grind, cart_items_json,
          delivery_fee_inr, amount_inr, status, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(order_id) DO UPDATE SET
          cashfree_order_id = excluded.cashfree_order_id,
          payment_session_id = excluded.payment_session_id,
          status = excluded.status,
          updated_at = excluded.updated_at`
      )
      .bind(
        order.orderId,
        order.cashfreeOrderId,
        order.paymentSessionId,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.customerAddress,
        order.customerState,
        order.customerPincode,
        order.customerType,
        order.gstNumber,
        order.productSlug,
        order.productName,
        order.weightGrams,
        order.weightLabel,
        order.quantity,
        order.grind,
        order.cartItemsJson,
        order.deliveryFeeInr,
        order.amountInr,
        order.status,
        order.createdAt,
        order.updatedAt
      )
      .run();
  } catch (err) {
    console.error('Failed to mirror order into graycup-orders D1:', err);
  }
}

/** Status-only update — called from payment verify and the Cashfree webhook. */
export async function updateOrderStatusInGraycupD1(
  orderId: string,
  status: string,
  webhookData: string | null,
  updatedAt: number
): Promise<void> {
  const d1 = (env as { GRAYCUP_ORDERS_DB?: D1Like } | undefined)?.GRAYCUP_ORDERS_DB;
  if (!d1) return;
  try {
    await d1
      .prepare(
        `UPDATE indian_roasted_coffee_orders
         SET status = ?, webhook_data = COALESCE(?, webhook_data), updated_at = ?
         WHERE order_id = ?`
      )
      .bind(status, webhookData, updatedAt, orderId)
      .run();
  } catch (err) {
    console.error('Failed to update order status in graycup-orders D1:', err);
  }
}
