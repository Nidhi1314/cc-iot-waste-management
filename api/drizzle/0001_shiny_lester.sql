CREATE TYPE "public"."vehicle_role" AS ENUM('ADMIN', 'DRIVER');--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_code" varchar(64) NOT NULL,
	"password" text NOT NULL,
	"role" "vehicle_role" DEFAULT 'DRIVER' NOT NULL,
	"max_capacity_kg" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_user_code_unique" UNIQUE("user_code")
);
