CREATE TABLE `db_health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
