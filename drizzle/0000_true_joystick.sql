CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`cashfree_order_id` text,
	`payment_session_id` text,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_address` text NOT NULL,
	`product_slug` text NOT NULL,
	`product_name` text NOT NULL,
	`weight_grams` integer NOT NULL,
	`weight_label` text NOT NULL,
	`amount_inr` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`webhook_data` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_id_unique` ON `orders` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_cashfree_order_id_unique` ON `orders` (`cashfree_order_id`);