import { boolean, integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

/**
 * One property the user is visualizing. Its floor plan is mandatory, so the
 * plan's metadata lives on the project row; the image bytes themselves live in
 * image storage under `floorPlanStorageKey`.
 */
export const apartmentProjects = pgTable("apartment_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  floorPlanFileName: text("floor_plan_file_name").notNull(),
  floorPlanContentType: text("floor_plan_content_type").notNull(),
  floorPlanByteSize: integer("floor_plan_byte_size").notNull(),
  floorPlanStorageKey: text("floor_plan_storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApartmentProjectRow = typeof apartmentProjects.$inferSelect;
export type NewApartmentProjectRow = typeof apartmentProjects.$inferInsert;
