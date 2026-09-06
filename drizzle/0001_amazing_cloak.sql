CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`barcode` varchar(80),
	`category` varchar(100) NOT NULL DEFAULT 'General',
	`unit` varchar(24) NOT NULL DEFAULT 'pcs',
	`quantity` decimal(12,3) NOT NULL DEFAULT '0',
	`minStock` decimal(12,3) NOT NULL DEFAULT '0',
	`purchasePrice` decimal(12,2) NOT NULL DEFAULT '0',
	`sellingPrice` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`barcode`);