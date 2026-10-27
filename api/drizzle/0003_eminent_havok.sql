CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"fill_threshold" integer DEFAULT 75 NOT NULL,
	"max_waste_age_hours" integer DEFAULT 24 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
