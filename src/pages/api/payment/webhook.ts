import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import { db } from '../../../db/index';
import { orders } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateOrderStatusInGraycupD1, nowUnixSeconds } from '../../../lib/graycupOrdersD1';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const rawBody  = await request.text();
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';
  const signature = request.headers.get('x-webhook-signature') ?? '';

  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret) return new Response('Server misconfigured', { status: 500 });

  // Verify HMAC-SHA256 signature — Cashfree signs `timestamp + rawBody`
  // concatenated directly, with no separator between them. (Confirmed
  // against https://www.cashfree.com/docs/api-reference/payments/latest/subscription/webhook-signature —
  // every one of their reference implementations does `ts + body`, not
  // `ts + "." + body`.)
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');

  if (expected !== signature) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const data = payload?.data as Record<string, unknown> | undefined;
  const orderId      = (data?.order as Record<string, unknown>)?.order_id as string | undefined;
  const paymentStatus = (data?.payment as Record<string, unknown>)?.payment_status as string | undefined;

  if (!orderId) return new Response('OK', { status: 200 });

  const status =
    paymentStatus === 'SUCCESS' ? 'PAID' :
    paymentStatus === 'FAILED'  ? 'FAILED' : 'PENDING';

  await db
    .update(orders)
    .set({ status, webhookData: rawBody, updatedAt: new Date() })
    .where(eq(orders.orderId, orderId));

  await updateOrderStatusInGraycupD1((locals as any).runtime?.env, orderId, status, rawBody, nowUnixSeconds());

  return new Response('OK', { status: 200 });
};
