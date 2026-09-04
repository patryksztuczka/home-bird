CREATE TABLE "room_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"apartment_project_id" uuid NOT NULL,
	"room_type" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"boundary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apartment_projects" ADD COLUMN "room_mapping_confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "room_areas_apartment_project_id_idx" ON "room_areas" ("apartment_project_id");--> statement-breakpoint
ALTER TABLE "room_areas" ADD CONSTRAINT "room_areas_apartment_project_id_apartment_projects_id_fkey" FOREIGN KEY ("apartment_project_id") REFERENCES "apartment_projects"("id") ON DELETE CASCADE;