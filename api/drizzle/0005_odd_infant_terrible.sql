CREATE TYPE "public"."destination_type" AS ENUM('BIOGAS', 'LIVESTOCK_FEED');--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "destination_type" NOT NULL,
	"address" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"accepted_categories" text[] NOT NULL,
	"daily_capacity_kg" real NOT NULL,
	"open_from" text NOT NULL,
	"open_to" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
