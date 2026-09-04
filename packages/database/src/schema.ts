import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
  /**
   * When the user last said the whole interior is mapped. Null until they do,
   * and set back to null by any change to a room area — generation is gated on it.
   */
  roomMappingConfirmedAt: timestamp("room_mapping_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApartmentProjectRow = typeof apartmentProjects.$inferSelect;
export type NewApartmentProjectRow = typeof apartmentProjects.$inferInsert;

/**
 * One room of an apartment, drawn as a polygon over the floor plan. The boundary
 * is stored as fractions of the floor plan image (0..1 on each axis) rather than
 * pixels, so an area stays on its walls whatever size the plan is displayed at.
 */
export const roomAreas = pgTable(
  "room_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apartmentProjectId: uuid("apartment_project_id")
      .notNull()
      .references(() => apartmentProjects.id, { onDelete: "cascade" }),
    roomType: text("room_type").notNull(),
    /** Empty when the user did not give the room a name of its own. */
    name: text("name").notNull().default(""),
    boundary: jsonb("boundary").$type<Array<{ x: number; y: number }>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("room_areas_apartment_project_id_idx").on(table.apartmentProjectId)],
);

export type RoomAreaRow = typeof roomAreas.$inferSelect;
export type NewRoomAreaRow = typeof roomAreas.$inferInsert;
