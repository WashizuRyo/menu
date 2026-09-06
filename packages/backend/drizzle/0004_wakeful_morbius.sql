DROP TABLE `meal_plan_recipes`;--> statement-breakpoint
DROP TABLE `meal_plans`;--> statement-breakpoint
DROP TABLE `recipes`;--> statement-breakpoint
CREATE TABLE `recipes` (
	`db_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`ingredients` text NOT NULL,
	`instructions` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_id_unique` ON `recipes` (`id`);--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`db_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plans_id_unique` ON `meal_plans` (`id`);--> statement-breakpoint
CREATE TABLE `meal_plan_recipes` (
	`meal_plan_db_id` integer NOT NULL,
	`meal_date` text NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_db_id` integer NOT NULL,
	PRIMARY KEY(`meal_plan_db_id`, `meal_date`, `meal_type`, `recipe_db_id`),
	FOREIGN KEY (`meal_plan_db_id`) REFERENCES `meal_plans`(`db_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_db_id`) REFERENCES `recipes`(`db_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `meal_plan_recipes_recipe_db_id_index` ON `meal_plan_recipes` (`recipe_db_id`);
