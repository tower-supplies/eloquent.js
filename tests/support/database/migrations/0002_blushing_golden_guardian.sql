CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`placed_by_id` integer NOT NULL,
	`placed_for_id` integer NOT NULL
);
