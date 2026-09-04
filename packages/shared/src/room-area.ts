import { Schema } from "effect";

/**
 * Room areas: the polygons a user draws over a floor plan to say where each room is.
 *
 * The geometry rules live here, next to the floor plan image checks, so the browser
 * and the api agree on what may be saved and word the refusal the same way.
 *
 * A boundary point is a fraction of the floor plan image (0..1 on each axis) rather
 * than a pixel, so an area keeps its place over the plan at any zoom or panel width.
 */

/** The room types an area may be. Every area has exactly one. */
export const RoomType = Schema.Literals([
  "living-room",
  "kitchen",
  "bedroom",
  "bathroom",
  "hallway",
  "balcony",
  "office",
  "storage",
]).annotate({
  message: "Pick a room type",
});
export type RoomType = typeof RoomType.Type;

export const roomTypes = RoomType.literals;

export const roomTypeLabels: Record<RoomType, string> = {
  "living-room": "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  hallway: "Hallway",
  balcony: "Balcony",
  office: "Office",
  storage: "Storage",
};

export type BoundaryPoint = { readonly x: number; readonly y: number };

/** Fewer than three points is a line, not a room. */
export const MIN_BOUNDARY_POINTS = 3;

/** A room covering less of the plan than this is a stray click, not a room. */
export const MIN_AREA_FRACTION = 0.0004;

// Boundary points are fractions, so distances are small — compare against a small epsilon.
const EPSILON = 1e-9;

const sign = (value: number) => (Math.abs(value) < EPSILON ? 0 : value > 0 ? 1 : -1);

/** Twice the signed area of the triangle o-a-b; zero when the three are in line. */
const cross = (o: BoundaryPoint, a: BoundaryPoint, b: BoundaryPoint) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

const inBounds = (a: BoundaryPoint, b: BoundaryPoint, p: BoundaryPoint) =>
  Math.min(a.x, b.x) - EPSILON <= p.x &&
  p.x <= Math.max(a.x, b.x) + EPSILON &&
  Math.min(a.y, b.y) - EPSILON <= p.y &&
  p.y <= Math.max(a.y, b.y) + EPSILON;

const segmentsMeet = (a: BoundaryPoint, b: BoundaryPoint, c: BoundaryPoint, d: BoundaryPoint) => {
  const d1 = sign(cross(a, b, c));
  const d2 = sign(cross(a, b, d));
  const d3 = sign(cross(c, d, a));
  const d4 = sign(cross(c, d, b));
  if (d1 !== d2 && d3 !== d4) return true;
  // Collinear and overlapping counts too: an edge lying along another is still a crossing.
  return (
    (d1 === 0 && inBounds(a, b, c)) ||
    (d2 === 0 && inBounds(a, b, d)) ||
    (d3 === 0 && inBounds(c, d, a)) ||
    (d4 === 0 && inBounds(c, d, b))
  );
};

const at = (points: readonly BoundaryPoint[], index: number) => points[index % points.length]!;

/** The area the boundary encloses, as a fraction of the whole floor plan. */
export const boundaryArea = (points: readonly BoundaryPoint[]) => {
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const current = at(points, i);
    const next = at(points, i + 1);
    doubled += current.x * next.y - next.x * current.y;
  }
  return Math.abs(doubled) / 2;
};

/** True when two boundary points sit on the same spot. */
export const hasRepeatedPoint = (points: readonly BoundaryPoint[]) =>
  points.some((point, index) =>
    points.some(
      (other, otherIndex) =>
        otherIndex > index &&
        Math.abs(point.x - other.x) < EPSILON &&
        Math.abs(point.y - other.y) < EPSILON,
    ),
  );

/** True when the boundary crosses itself, including an edge folding back over its neighbour. */
export const crossesItself = (points: readonly BoundaryPoint[]) => {
  const count = points.length;
  for (let i = 0; i < count; i++) {
    // A vertex whose two edges leave in the same direction is a fold, not a corner.
    const previous = at(points, i);
    const vertex = at(points, i + 1);
    const next = at(points, i + 2);
    const foldsBack =
      sign(cross(previous, vertex, next)) === 0 &&
      (previous.x - vertex.x) * (next.x - vertex.x) +
        (previous.y - vertex.y) * (next.y - vertex.y) >
        EPSILON;
    if (foldsBack) return true;

    for (let j = i + 1; j < count; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === count - 1);
      if (adjacent) continue;
      if (segmentsMeet(at(points, i), at(points, i + 1), at(points, j), at(points, j + 1))) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Why this boundary cannot be saved, or `undefined` when it can.
 * The returned wording is shown to the user as-is.
 */
export const roomBoundaryIssue = (points: readonly BoundaryPoint[]): string | undefined => {
  if (points.length < MIN_BOUNDARY_POINTS) return "A room needs at least three points";
  if (hasRepeatedPoint(points)) return "Two points sit on the same spot";
  if (crossesItself(points)) return "The boundary crosses itself";
  if (boundaryArea(points) < MIN_AREA_FRACTION) return "This shape is too small to be a room";
  return undefined;
};

export const isValidRoomBoundary = (points: readonly BoundaryPoint[]) =>
  roomBoundaryIssue(points) === undefined;

// Standard Schema versions of the room area inputs, used verbatim as tRPC
// procedure inputs in the api and as the client's mutation contract.

const BoundaryPointSchema = Schema.Struct({
  x: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  y: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
});

/** A boundary that passes every rule above; the refusal is the wording shown to the user. */
export const Boundary = Schema.Array(BoundaryPointSchema).check(
  Schema.makeFilter((points) => {
    const issue = roomBoundaryIssue(points);
    return issue === undefined ? undefined : { path: [], issue };
  }),
);

const RoomAreaFields = {
  roomType: RoomType,
  /** Empty when the user did not give the room a name of its own. */
  name: Schema.String.check(Schema.isMaxLength(120, { message: "Room name is too long" })),
  boundary: Boundary,
};

export const CreateRoomAreaInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    apartmentProjectId: Schema.NonEmptyString,
    ...RoomAreaFields,
  }),
);
export type CreateRoomAreaInput = typeof CreateRoomAreaInput.Type;

export const UpdateRoomAreaInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    id: Schema.NonEmptyString,
    ...RoomAreaFields,
  }),
);
export type UpdateRoomAreaInput = typeof UpdateRoomAreaInput.Type;

export const RoomAreaIdInput = Schema.toStandardSchemaV1(
  Schema.Struct({ id: Schema.NonEmptyString }),
);
export type RoomAreaIdInput = typeof RoomAreaIdInput.Type;

export const ApartmentProjectRoomsInput = Schema.toStandardSchemaV1(
  Schema.Struct({ apartmentProjectId: Schema.NonEmptyString }),
);
export type ApartmentProjectRoomsInput = typeof ApartmentProjectRoomsInput.Type;
