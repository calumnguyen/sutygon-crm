CREATE TABLE "discount_itemized_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_itemized_names_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_discounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"discount_type" varchar(10) NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"itemized_name_id" integer NOT NULL,
	"description" text,
	"requested_by_user_id" integer NOT NULL,
	"authorized_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"inventory_item_id" integer,
	"warning_type" varchar(50) NOT NULL,
	"warning_message" text NOT NULL,
	"severity" varchar(20) DEFAULT 'high' NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_method" varchar(10) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"processed_by_user_id" integer NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"customerName" text NOT NULL,
	"phoneNumber" text,
	"emailAddress" text,
	"invoiceNumber" text,
	"rating" integer NOT NULL,
	"ratingDescription" text NOT NULL,
	"helperName" text,
	"reviewDetail" text NOT NULL,
	"dateCreated" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"deviceType" text,
	"browserType" text
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_rate" numeric(5, 2) DEFAULT '8.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "created_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "picked_up_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "picked_up_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_itemized_name_id_discount_itemized_names_id_fk" FOREIGN KEY ("itemized_name_id") REFERENCES "public"."discount_itemized_names"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_discounts" ADD CONSTRAINT "order_discounts_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_warnings" ADD CONSTRAINT "order_warnings_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_warnings" ADD CONSTRAINT "order_warnings_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_warnings" ADD CONSTRAINT "order_warnings_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discount_itemized_names_name_idx" ON "discount_itemized_names" USING btree ("name");--> statement-breakpoint
CREATE INDEX "order_discounts_order_id_idx" ON "order_discounts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_discounts_requested_by_idx" ON "order_discounts" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "order_discounts_authorized_by_idx" ON "order_discounts" USING btree ("authorized_by_user_id");--> statement-breakpoint
CREATE INDEX "order_discounts_created_at_idx" ON "order_discounts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_warnings_order_item_id_idx" ON "order_warnings" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_warnings_inventory_item_id_idx" ON "order_warnings" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "order_warnings_is_resolved_idx" ON "order_warnings" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "order_warnings_warning_type_idx" ON "order_warnings" USING btree ("warning_type");--> statement-breakpoint
CREATE INDEX "order_warnings_created_at_idx" ON "order_warnings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_history_order_id_idx" ON "payment_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_history_processed_by_user_id_idx" ON "payment_history" USING btree ("processed_by_user_id");--> statement-breakpoint
CREATE INDEX "payment_history_payment_date_idx" ON "payment_history" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "payment_history_payment_method_idx" ON "payment_history" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "reviews_dateCreated_idx" ON "reviews" USING btree ("dateCreated");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "reviews_customerName_idx" ON "reviews" USING btree ("customerName");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_picked_up_by_user_id_users_id_fk" FOREIGN KEY ("picked_up_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_created_by_user_id_idx" ON "orders" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "orders_picked_up_by_user_id_idx" ON "orders" USING btree ("picked_up_by_user_id");--> statement-breakpoint
CREATE INDEX "orders_picked_up_at_idx" ON "orders" USING btree ("picked_up_at");