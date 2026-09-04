CREATE TABLE "apartment_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"apartment_project_id" uuid NOT NULL,
	"component" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"source_url" text,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "apartment_references_project_component_idx" ON "apartment_references" ("apartment_project_id","component");--> statement-breakpoint
ALTER TABLE "apartment_references" ADD CONSTRAINT "apartment_references_ZvxjakrjqCzm_fkey" FOREIGN KEY ("apartment_project_id") REFERENCES "apartment_projects"("id") ON DELETE CASCADE;