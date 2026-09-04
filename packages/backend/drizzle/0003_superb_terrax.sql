CREATE TABLE `meal_plan_recipes` (
	`meal_plan_id` text NOT NULL,
	`meal_date` text NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_id` integer NOT NULL,
	PRIMARY KEY(`meal_plan_id`, `meal_date`, `meal_type`, `recipe_id`),
	FOREIGN KEY (`meal_plan_id`) REFERENCES `meal_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `meal_plan_recipes_recipe_id_index` ON `meal_plan_recipes` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
