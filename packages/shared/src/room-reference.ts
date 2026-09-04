import { Schema } from "effect";
import { referenceComponents, ReferenceSource } from "./apartment-reference.ts";
import type { RoomType } from "./room-area.ts";

export const RoomReferenceComponent = Schema.Literals([
  ...referenceComponents,
  "furniture",
  "cabinets",
  "countertops",
  "appliances",
  "bathroom-fixtures",
  "other",
]);
export type RoomReferenceComponent = typeof RoomReferenceComponent.Type;

export const roomReferenceComponentLabels: Record<RoomReferenceComponent, string> = {
  "overall-style": "Overall style",
  floor: "Floor",
  walls: "Walls",
  ceiling: "Ceiling",
  doors: "Doors",
  windows: "Windows",
  lighting: "Lighting",
  furniture: "Furniture",
  cabinets: "Cabinets",
  countertops: "Countertops",
  appliances: "Appliances",
  "bathroom-fixtures": "Bathroom fixtures",
  other: "Other",
};

const detailComponents: Record<RoomType, ReadonlyArray<RoomReferenceComponent>> = {
  "living-room": ["furniture", "other"],
  kitchen: ["furniture", "cabinets", "countertops", "appliances", "other"],
  bedroom: ["furniture", "other"],
  bathroom: ["furniture", "cabinets", "countertops", "bathroom-fixtures", "other"],
  hallway: ["furniture", "other"],
  balcony: ["furniture", "other"],
  office: ["furniture", "other"],
  storage: ["cabinets", "other"],
};

export const roomReferenceComponents = (roomType: RoomType) => [
  ...referenceComponents,
  ...detailComponents[roomType],
];

export const RoomReferenceRoomInput = Schema.toStandardSchemaV1(
  Schema.Struct({ roomAreaId: Schema.NonEmptyString }),
);
export type RoomReferenceRoomInput = typeof RoomReferenceRoomInput.Type;

export const AttachRoomReferenceInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    roomAreaId: Schema.NonEmptyString,
    component: RoomReferenceComponent,
    source: ReferenceSource,
  }),
);
export type AttachRoomReferenceInput = typeof AttachRoomReferenceInput.Type;

export const RoomReferenceComponentInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    roomAreaId: Schema.NonEmptyString,
    component: RoomReferenceComponent,
  }),
);
export type RoomReferenceComponentInput = typeof RoomReferenceComponentInput.Type;
