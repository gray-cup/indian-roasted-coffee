import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { db } from '../../../db/index';
import { orders } from '../../../db/schema';
import { getPrice, formatWeight, getDeliveryFee } from '../../../utils/pricing';
import { idToSlug } from '../../../utils/content';

export const prerender = false;

interface CartLine {
  id: string;
  grams: number;
  grind: string;
  quantity: number;
}

interface RequestBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  gstNumber?: string;
  items?: CartLine[];
}

// Loose check for a 15-character Indian GSTIN (2-digit state code + 10-char
// PAN + entity/check digits). Not a full checksum validation.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

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
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const name    = body.name?.trim();
  const email   = body.email?.trim().toLowerCase();
  const phone   = body.phone?.trim();
  const address = body.address?.trim();
  const items   = Array.isArray(body.items) ? body.items : [];
  const customerType = body.customerType === 'business' ? 'business' : 'individual';
  const gstNumber = body.gstNumber?.trim().toUpperCase();

  if (!name || !email || !phone || !address || items.length === 0) {
    return new Response('Missing required fields', { status: 400 });
  }

  if (customerType === 'business') {
    if (!gstNumber) {
      return new Response('GST number is required for business orders', { status: 400 });
    }
    if (!GSTIN_PATTERN.test(gstNumber)) {
      return new Response('Enter a valid 15-character GSTIN', { status: 400 });
    }
  }

  // Look up every product server-side — never trust client-supplied prices.
  const services = await getCollection('services', ({ data }) => !data.draft);
  const servicesBySlug = new Map(services.map((s) => [idToSlug(s.id), s]));

  const lines: Array<{
    slug: string;
    title: string;
    grams: number;
    grind: string;
    quantity: number;
    unitPrice: number;
  }> = [];

  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !Number.isFinite(item.grams) || !Number.isFinite(item.quantity)) {
      return new Response('Invalid cart item', { status: 400 });
    }
    const product = servicesBySlug.get(item.id);
    if (!product) {
      return new Response(`Unknown product: ${item.id}`, { status: 400 });
    }
    const quantity = Math.max(1, Math.min(100, Math.round(item.quantity)));
    lines.push({
      slug: item.id,
      title: product.data.title,
      grams: item.grams,
      grind: typeof item.grind === 'string' && item.grind ? item.grind : 'Whole Bean',
      quantity,
      unitPrice: getPrice(item.grams, product.data.priceMultiplier),
    });
  }

  const subtotalInr = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const totalGrams  = lines.reduce((sum, l) => sum + l.grams * l.quantity, 0);
  const deliveryFeeInr = getDeliveryFee(totalGrams);
  const amountInr   = subtotalInr + deliveryFeeInr;
  const orderId     = generateOrderId();
  const siteUrl   = process.env.SITE ?? url.origin;

  const appId  = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    console.error('Cashfree credentials not configured');
    return new Response('Payment not configured', { status: 503 });
  }

  const orderNote = lines
    .map((l) => `${l.title} × ${l.quantity} (${formatWeight(l.grams)}, ${l.grind})`)
    .join('; ')
    + ` — Delivery ₹${deliveryFeeInr}`
    + (customerType === 'business' ? `, Business GSTIN ${gstNumber}` : '');

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
        order_note: orderNote.slice(0, 500),
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

  await db.insert(orders).values({
    orderId,
    cashfreeOrderId: orderId,
    paymentSessionId,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    customerAddress: address,
    customerType,
    gstNumber: customerType === 'business' ? gstNumber : null,
    productSlug: 'cart',
    productName: `Cart order (${lines.length} item${lines.length === 1 ? '' : 's'})`,
    weightGrams: totalGrams,
    weightLabel: `${lines.length} item${lines.length === 1 ? '' : 's'}`,
    grind: null,
    cartItemsJson: JSON.stringify(lines),
    deliveryFeeInr,
    amountInr,
  });

  return Response.json({ sid: paymentSessionId, oid: orderId });
};
