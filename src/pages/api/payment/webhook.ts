import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import { db } from '../../../db/index';
import { orders, orderItems } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sendOrderEmails } from '../../../utils/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const rawBody  = await request.text();
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';
  const signature = request.headers.get('x-webhook-signature') ?? '';

  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret) return new Response('Server misconfigured', { status: 500 });

  // Verify HMAC-SHA256 signature
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
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

  const [existing] = await db.select().from(orders).where(eq(orders.orderId, orderId));

  await db
    .update(orders)
    .set({ status, webhookData: rawBody, updatedAt: new Date() })
    .where(eq(orders.orderId, orderId));

  if (existing && existing.status !== 'PAID' && status === 'PAID') {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    await sendOrderEmails({ ...existing, status: 'PAID' }, items);
  }

  return new Response('OK', { status: 200 });
};
