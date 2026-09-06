CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `stock_take_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`unit` varchar(24) NOT NULL,
	`systemQuantity` decimal(12,3) NOT NULL,
	`countedQuantity` decimal(12,3) NOT NULL,
	`variance` decimal(12,3) NOT NULL,
	`purchasePrice` decimal(12,2) NOT NULL,
	CONSTRAINT `stock_take_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_take_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notes` text,
	`productCount` int NOT NULL DEFAULT 0,
	`varianceUnits` decimal(12,3) NOT NULL DEFAULT '0',
	`varianceValue` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_take_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `stock_take_items_report_idx` ON `stock_take_items` (`reportId`);