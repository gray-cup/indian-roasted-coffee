import { Resend } from 'resend';
import type { Order, OrderItem } from '../db/schema';

function client(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — skipping order email');
    return null;
  }
  return new Resend(apiKey);
}

function itemsHtml(items: OrderItem[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${i.productName}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${i.weightLabel} · ${i.grind}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">₹${i.lineTotalInr.toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 0;border-bottom:2px solid #2e6e37">Product</th>
          <th style="text-align:left;padding:8px 0;border-bottom:2px solid #2e6e37">Size / Grind</th>
          <th style="text-align:center;padding:8px 0;border-bottom:2px solid #2e6e37">Qty</th>
          <th style="text-align:right;padding:8px 0;border-bottom:2px solid #2e6e37">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function wrapper(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px">
      <div style="font-size:14px;font-weight:700;color:#2e6e37;margin-bottom:20px">Indian Roasted Coffee</div>
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
    </div>`;
}

export async function sendOrderEmails(order: Order, items: OrderItem[]): Promise<void> {
  const resend = client();
  if (!resend) return;

  const from = process.env.RESEND_FROM_EMAIL;
  const adminEmail = process.env.ORDER_NOTIFY_EMAIL;
  if (!from) {
    console.error('RESEND_FROM_EMAIL not configured — skipping order email');
    return;
  }

  const table = itemsHtml(items);

  const customerHtml = wrapper(
    'Order confirmed!',
    `
      <p style="color:#555;font-size:14px;line-height:1.6">
        Thank you, ${order.customerName}. We'll start roasting your order shortly and ship within 48 hours.
      </p>
      <p style="font-size:13px;color:#777;margin:16px 0 0"><strong>Order ID:</strong> ${order.orderId}</p>
      ${table}
      <p style="font-size:15px;font-weight:700;text-align:right">Total paid: ₹${order.amountInr.toLocaleString('en-IN')}</p>
      <p style="font-size:13px;color:#777;margin-top:20px"><strong>Delivery address</strong><br>${order.customerAddress}</p>
    `
  );

  const adminHtml = wrapper(
    'New order received',
    `
      <p style="font-size:13px;color:#777"><strong>Order ID:</strong> ${order.orderId}</p>
      <p style="font-size:13px;color:#777">
        <strong>Customer:</strong> ${order.customerName} · ${order.customerEmail} · ${order.customerPhone}
      </p>
      ${table}
      <p style="font-size:15px;font-weight:700;text-align:right">Total: ₹${order.amountInr.toLocaleString('en-IN')}</p>
      <p style="font-size:13px;color:#777;margin-top:20px"><strong>Ship to</strong><br>${order.customerAddress}</p>
    `
  );

  const sends: Promise<unknown>[] = [
    resend.emails.send(
      {
        from,
        to: [order.customerEmail],
        subject: `Order confirmed — ${order.orderId}`,
        html: customerHtml,
      },
      { idempotencyKey: `order-customer/${order.orderId}` }
    ),
  ];

  if (adminEmail) {
    sends.push(
      resend.emails.send(
        {
          from,
          to: [adminEmail],
          subject: `New order — ${order.orderId} (₹${order.amountInr.toLocaleString('en-IN')})`,
          html: adminHtml,
        },
        { idempotencyKey: `order-admin/${order.orderId}` }
      )
    );
  }

  const results = await Promise.allSettled(sends);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Order email failed to send:', result.reason);
    }
  }
}
