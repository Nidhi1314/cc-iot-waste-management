CREATE TYPE "public"."collection_status" AS ENUM('COLLECTED', 'DELIVERED');--> statement-breakpoint
CREATE TABLE "organic_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bin_id" uuid NOT NULL,
	"route_id" uuid,
	"destination_id" uuid NOT NULL,
	"measured_kg" real NOT NULL,
	"contamination_percent" real DEFAULT 0 NOT NULL,
	"status" "collection_status" DEFAULT 'COLLECTED' NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "destination_id" uuid;--> statement-breakpoint
UPDATE "smart_bins" SET "fill_started_at" = "last_updated" WHERE "current_fill_level" > 0 AND "fill_started_at" IS NULL;--> statement-breakpoint
ALTER TABLE "organic_collections" ADD CONSTRAINT "organic_collections_bin_id_smart_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."smart_bins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_collections" ADD CONSTRAINT "organic_collections_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_collections" ADD CONSTRAINT "organic_collections_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;