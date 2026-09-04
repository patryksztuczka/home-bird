CREATE TABLE "apartment_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"floor_plan_file_name" text NOT NULL,
	"floor_plan_content_type" text NOT NULL,
	"floor_plan_byte_size" integer NOT NULL,
	"floor_plan_storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
