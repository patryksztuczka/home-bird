CREATE TABLE "room_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"room_area_id" uuid NOT NULL,
	"component" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"source_url" text,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "room_references_room_component_idx" ON "room_references" ("room_area_id","component");--> statement-breakpoint
ALTER TABLE "room_references" ADD CONSTRAINT "room_references_room_area_id_room_areas_id_fkey" FOREIGN KEY ("room_area_id") REFERENCES "room_areas"("id") ON DELETE CASCADE;