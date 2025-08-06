-- Add store status management columns to store_settings table
ALTER TABLE "store_settings" ADD COLUMN "is_open" boolean DEFAULT false NOT NULL;
ALTER TABLE "store_settings" ADD COLUMN "opened_by" integer;
ALTER TABLE "store_settings" ADD COLUMN "opened_at" timestamp;
ALTER TABLE "store_settings" ADD COLUMN "closed_by" integer;
ALTER TABLE "store_settings" ADD COLUMN "closed_at" timestamp;

-- Add foreign key constraints
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; 