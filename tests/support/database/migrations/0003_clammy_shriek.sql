CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment` text NOT NULL,
	`commentable_id` integer NOT NULL,
	`commentable_type` text NOT NULL
);
