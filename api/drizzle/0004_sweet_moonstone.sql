CREATE TYPE "public"."generator_type" AS ENUM('RESTAURANT', 'HOTEL', 'CANTEEN', 'VEGETABLE_MARKET');--> statement-breakpoint
CREATE TYPE "public"."waste_category" AS ENUM('VEG_SCRAPS', 'COOKED_FOOD', 'MIXED_ORGANIC');--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "generator_name" text;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "generator_type" "generator_type";--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "waste_category" "waste_category";--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "est_daily_kg" real;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "pickup_window_start" text;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "pickup_window_end" text;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "fill_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "last_collected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "smart_bins" ADD COLUMN "contact_phone" text;