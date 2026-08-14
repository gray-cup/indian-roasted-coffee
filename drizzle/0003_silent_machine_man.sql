ALTER TABLE `orders` ADD `customer_type` text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `gst_number` text;