CREATE TYPE "public"."bin_status" AS ENUM('ACTIVE', 'DAMAGED', 'OUT_OF_SERVICE');--> statement-breakpoint
CREATE TABLE "smart_bins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"total_depth_cm" real NOT NULL,
	"max_capacity_kg" real NOT NULL,
	"status" "bin_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_fill_level" integer DEFAULT 0 NOT NULL,
	"needs_collection" boolean DEFAULT false NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
