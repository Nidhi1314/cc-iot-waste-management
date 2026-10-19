CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assigned_car_id" uuid,
	"waypoints_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_distance_km" real,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bin_id" uuid NOT NULL,
	"measure_distance_cm" real NOT NULL,
	"fill_percentage" real NOT NULL,
	"battery_voltage" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_assigned_car_id_vehicles_id_fk" FOREIGN KEY ("assigned_car_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_data" ADD CONSTRAINT "sensor_data_bin_id_smart_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."smart_bins"("id") ON DELETE cascade ON UPDATE no action;