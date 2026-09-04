CREATE TABLE "apartment_visualizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"apartment_project_id" uuid NOT NULL,
	"status" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"image_storage_key" text,
	"image_content_type" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "apartment_visualizations_project_created_idx" ON "apartment_visualizations" ("apartment_project_id","created_at");--> statement-breakpoint
ALTER TABLE "apartment_visualizations" ADD CONSTRAINT "apartment_visualizations_msHsDoLjOhsP_fkey" FOREIGN KEY ("apartment_project_id") REFERENCES "apartment_projects"("id") ON DELETE CASCADE;