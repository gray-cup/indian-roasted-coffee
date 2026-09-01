import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { orders } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateOrderStatusInGraycupD1, nowUnixSeconds } from '../../../lib/graycupOrdersD1';

export const prerender = false;

function cashfreeBase() {
  return process.env.CASHFREE_ENV === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';
}

export const GET: APIRoute = async ({ url, locals }) => {
  const orderId = url.searchParams.get('order_id');
  if (!orderId) {
    return Response.json({ error: 'Missing order_id' }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
  if (!order) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  // Sync with Cashfree if still pending
  if (order.status === 'PENDING') {
    try {
      const res = await fetch(`${cashfreeBase()}/orders/${orderId}`, {
        headers: {
          'x-api-version': '2025-01-01',
          'x-client-id': process.env.CASHFREE_APP_ID!,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        },
      });
      if (res.ok) {
        const data = await res.json() as { order_status: string };
        if (data.order_status === 'PAID') {
          await db.update(orders).set({ status: 'PAID', updatedAt: new Date() }).where(eq(orders.orderId, orderId));
          order.status = 'PAID';
          await updateOrderStatusInGraycupD1(orderId, 'PAID', null, nowUnixSeconds());
        }
      }
    } catch (err) {
      console.error('Cashfree verify error:', err);
    }
  }

  return Response.json({
    status:      order.status,
    orderId:     order.orderId,
    productName: order.productName,
    weightLabel: order.weightLabel,
    amountInr:   order.amountInr,
    customerName: order.customerName,
  });
};
