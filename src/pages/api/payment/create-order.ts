import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { orders, orderItems } from '../../../db/schema';
import { getPrice, formatWeight, WEIGHT_GRAMS } from '../../../utils/pricing';
import { GRIND_OPTIONS } from '../../../utils/cart';

export const prerender = false;

interface CheckoutItem {
  productSlug?: string;
  productName?: string;
  weightGrams?: number;
  grind?: string;
  quantity?: number;
}

interface CheckoutBody {
  customer?: { name?: string; email?: string; phone?: string; address?: string };
  items?: CheckoutItem[];
}

function cashfreeBase() {
  return process.env.CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IRC-${ts}-${rand}`;
}

export const POST: APIRoute = async ({ request, url }) => {
  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const name = body.customer?.name?.toString().trim();
  const email = body.customer?.email?.toString().trim().toLowerCase();
  const phone = body.customer?.phone?.toString().trim();
  const address = body.customer?.address?.toString().trim();

  if (!name || !email || !phone || !address) {
    return new Response('Missing customer details', { status: 400 });
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return new Response('Cart is empty', { status: 400 });
  }

  const lineItems: Array<{
    productSlug: string;
    productName: string;
    weightGrams: number;
    weightLabel: string;
    grind: string;
    unitPriceInr: number;
    quantity: number;
    lineTotalInr: number;
  }> = [];

  for (const item of rawItems) {
    const productSlug = item.productSlug?.toString();
    const productName = item.productName?.toString();
    const weightGrams = Number(item.weightGrams);
    const grind = item.grind?.toString();
    const quantity = Number(item.quantity);

    if (
      !productSlug || !productName || !grind ||
      !WEIGHT_GRAMS.includes(weightGrams as (typeof WEIGHT_GRAMS)[number]) ||
      !GRIND_OPTIONS.includes(grind as (typeof GRIND_OPTIONS)[number]) ||
      !Number.isInteger(quantity) || quantity < 1
    ) {
      return new Response(`Invalid cart item for "${productName ?? productSlug ?? 'unknown'}"`, { status: 400 });
    }

    let unitPriceInr: number;
    try {
      unitPriceInr = getPrice(productSlug, weightGrams);
    } catch {
      return new Response(`Unknown product "${productSlug}"`, { status: 400 });
    }

    lineItems.push({
      productSlug,
      productName,
      weightGrams,
      weightLabel: formatWeight(weightGrams),
      grind,
      unitPriceInr,
      quantity,
      lineTotalInr: unitPriceInr * quantity,
    });
  }

  const amountInr = lineItems.reduce((sum, i) => sum + i.lineTotalInr, 0);
  const orderId = generateOrderId();
  const siteUrl = process.env.SITE ?? url.origin;
  const orderNote = lineItems.map((i) => `${i.productName} (${i.weightLabel} × ${i.quantity})`).join(', ');

  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    console.error('Cashfree credentials not configured');
    return new Response('Payment not configured', { status: 503 });
  }

  // ── Create order in Cashfree ──────────────────────────────────────────────
  let paymentSessionId: string;
  try {
    const res = await fetch(`${cashfreeBase()}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': appId,
        'x-client-secret': secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amountInr,
        order_currency: 'INR',
        customer_details: {
          customer_id: `cust_${Date.now()}`,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `${siteUrl}/payment-result?order_id=${orderId}`,
          notify_url: `${siteUrl}/api/payment/webhook`,
        },
        order_note: orderNote.slice(0, 255),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Cashfree order creation failed:', res.status, err);
      return new Response('Payment setup failed', { status: 502 });
    }

    const data = await res.json() as { payment_session_id: string };
    paymentSessionId = data.payment_session_id;
  } catch (err) {
    console.error('Cashfree fetch error:', err);
    return new Response('Payment setup failed', { status: 502 });
  }

  // ── Persist order + line items in DB ──────────────────────────────────────
  await db.insert(orders).values({
    orderId,
    cashfreeOrderId: orderId,
    paymentSessionId,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    customerAddress: address,
    amountInr,
  });

  await db.insert(orderItems).values(
    lineItems.map((i) => ({ orderId, ...i }))
  );

  return Response.json({ sid: paymentSessionId, oid: orderId });
};
