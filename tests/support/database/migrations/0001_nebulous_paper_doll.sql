CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product_id` integer
);
--> statement-breakpoint
CREATE TABLE `product_properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`field` text NOT NULL,
	`value` text,
	`product_id` integer
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
