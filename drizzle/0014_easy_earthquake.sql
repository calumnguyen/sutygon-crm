CREATE TABLE "ai_training_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"image_url" text,
	"tags" text,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "added_by" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "added_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_invoice_exported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "is_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "opened_by" integer;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "closed_by" integer;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_training_data" ADD CONSTRAINT "ai_training_data_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_training_data_is_active_idx" ON "ai_training_data" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ai_training_data_item_id_idx" ON "ai_training_data" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "ai_training_data_category_idx" ON "ai_training_data" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_is_active_idx" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");