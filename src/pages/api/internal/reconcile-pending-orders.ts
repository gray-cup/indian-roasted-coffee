import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { orders } from '../../../db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { updateOrderStatusInGraycupD1, nowUnixSeconds } from '../../../lib/graycupOrdersD1';

export const prerender = false;

// Orders created less than this long ago are still likely mid-checkout —
// skip them so we don't hammer Cashfree for sessions that are still live.
const MIN_AGE_MS = 20 * 60 * 1000;

// Cashfree order links/sessions are dead well before this — anything still
// PENDING and this old with no successful payment is treated as abandoned.
const ABANDONED_AGE_MS = 48 * 60 * 60 * 1000;

function cashfreeBase() {
  return process.env.CASHFREE_ENV === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';
}

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.INTERNAL_RECONCILE_SECRET ?? ''}`;
  if (!process.env.INTERNAL_RECONCILE_SECRET || auth !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    return Response.json({ error: 'Cashfree not configured' }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - MIN_AGE_MS);
  const stale = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, 'PENDING'), lt(orders.createdAt, cutoff)));

  let checked = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const order of stale) {
    checked++;
    try {
      const res = await fetch(`${cashfreeBase()}/orders/${order.orderId}`, {
        headers: {
          'x-api-version': '2025-01-01',
          'x-client-id': appId,
          'x-client-secret': secret,
        },
      });

      if (!res.ok) {
        // Cashfree has no record, or a transient error — leave as-is and retry next run.
        continue;
      }

      const data = (await res.json()) as { order_status?: string };
      let newStatus: 'PAID' | 'FAILED' | 'EXPIRED' | null = null;

      if (data.order_status === 'PAID') {
        newStatus = 'PAID';
      } else if (data.order_status === 'EXPIRED' || data.order_status === 'TERMINATED') {
        newStatus = 'FAILED';
      } else if (Date.now() - order.createdAt.getTime() > ABANDONED_AGE_MS) {
        // Cashfree still calls it ACTIVE, but it's been two days with no
        // payment — treat as abandoned rather than checking it forever.
        newStatus = 'EXPIRED';
      }

      if (newStatus) {
        const now = new Date();
        await db.update(orders).set({ status: newStatus, updatedAt: now }).where(eq(orders.orderId, order.orderId));
        await updateOrderStatusInGraycupD1(order.orderId, newStatus, null, nowUnixSeconds());
        updated++;
      }
    } catch (err) {
      errors.push(`${order.orderId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return Response.json({ checked, updated, errors });
};
