CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`product_slug` text NOT NULL,
	`product_name` text NOT NULL,
	`weight_grams` integer NOT NULL,
	`weight_label` text NOT NULL,
	`grind` text NOT NULL,
	`unit_price_inr` real NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_inr` real NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `product_slug`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `product_name`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `weight_grams`;--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `weight_label`;