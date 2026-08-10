import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { db } from '../../../db/index';
import { orders } from '../../../db/schema';
import { getPrice, formatWeight } from '../../../utils/pricing';
import { idToSlug } from '../../../utils/content';

export const prerender = false;

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

export const POST: APIRoute = async ({ request, redirect, url }) => {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const name       = body.get('name')?.toString().trim();
  const email      = body.get('email')?.toString().trim().toLowerCase();
  const phone      = body.get('phone')?.toString().trim();
  const address    = body.get('address')?.toString().trim();
  const productSlug = body.get('product_slug')?.toString();
  const grind      = body.get('grind')?.toString();
  const weightGrams = parseInt(body.get('weight_grams')?.toString() ?? '0', 10);
  const quantity   = Math.max(1, Math.min(20, Math.round(parseInt(body.get('quantity')?.toString() ?? '1', 10) || 1)));

  if (!name || !email || !phone || !address || !productSlug || !weightGrams) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Look up the product server-side — never trust a client-supplied price or multiplier.
  const services = await getCollection('services', ({ data }) => !data.draft);
  const product = services.find((s) => idToSlug(s.id) === productSlug);
  if (!product) {
    return new Response('Unknown product', { status: 400 });
  }

  const productName = product.data.title;
  const amountInr   = getPrice(weightGrams, product.data.priceMultiplier) * quantity;
  const weightLabel = quantity > 1 ? `${quantity} × ${formatWeight(weightGrams)}` : formatWeight(weightGrams);
  const orderId     = generateOrderId();
  const siteUrl     = process.env.SITE ?? url.origin;

  const appId  = process.env.CASHFREE_APP_ID;
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
        order_note: `${productName} – ${weightLabel}${grind ? ` – ${grind}` : ''}`.slice(0, 500),
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

  // ── Persist order in DB ───────────────────────────────────────────────────
  await db.insert(orders).values({
    orderId,
    cashfreeOrderId: orderId,
    paymentSessionId,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    customerAddress: address,
    productSlug,
    productName,
    weightGrams,
    weightLabel,
    quantity,
    grind: grind || null,
    amountInr,
  });

  return redirect(`/checkout?sid=${paymentSessionId}&oid=${orderId}`, 302);
};
