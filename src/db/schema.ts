import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').notNull().unique(),
  cashfreeOrderId: text('cashfree_order_id').unique(),
  paymentSessionId: text('payment_session_id'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  customerState: text('customer_state'),
  customerPincode: text('customer_pincode'),
  customerType: text('customer_type', { enum: ['individual', 'business'] })
    .notNull()
    .default('individual'),
  gstNumber: text('gst_number'),
  productSlug: text('product_slug').notNull(),
  productName: text('product_name').notNull(),
  weightGrams: integer('weight_grams').notNull(),
  weightLabel: text('weight_label').notNull(),
  quantity: integer('quantity').notNull().default(1),
  grind: text('grind'),
  /** JSON-serialized CartItem[] when the order came from the cart (multiple lines). */
  cartItemsJson: text('cart_items_json'),
  /** Delivery fee component of amountInr — see getDeliveryFee() in utils/pricing.ts. */
  deliveryFeeInr: real('delivery_fee_inr').notNull().default(0),
  amountInr: real('amount_inr').notNull(),
  status: text('status', { enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED'] })
    .notNull()
    .default('PENDING'),
  webhookData: text('webhook_data'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
