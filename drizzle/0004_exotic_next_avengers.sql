ALTER TABLE "orders" ADD COLUMN "paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "document_type" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "document_other" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "document_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "document_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_type" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_value" numeric(10, 2);