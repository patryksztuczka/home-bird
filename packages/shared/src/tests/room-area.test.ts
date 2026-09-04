import { describe, expect, it } from "vitest";
import {
  boundaryArea,
  crossesItself,
  roomBoundaryIssue,
  roomTypeLabels,
  roomTypes,
} from "../room-area.ts";

const square = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.5 },
  { x: 0.1, y: 0.5 },
];

describe("room boundary", () => {
  it("accepts a plain rectangle", () => {
    expect(roomBoundaryIssue(square)).toBeUndefined();
  });

  it("accepts an L-shaped room", () => {
    const shape = [
      { x: 0.1, y: 0.1 },
      { x: 0.6, y: 0.1 },
      { x: 0.6, y: 0.3 },
      { x: 0.35, y: 0.3 },
      { x: 0.35, y: 0.6 },
      { x: 0.1, y: 0.6 },
    ];

    expect(roomBoundaryIssue(shape)).toBeUndefined();
  });

  it("refuses fewer than three points", () => {
    expect(roomBoundaryIssue(square.slice(0, 2))).toBe("A room needs at least three points");
  });

  it("refuses two points left on the same spot", () => {
    const doubled = [...square.slice(0, 3), { x: 0.5, y: 0.5 }];

    expect(roomBoundaryIssue(doubled)).toBe("Two points sit on the same spot");
  });

  it("refuses a bow tie", () => {
    const bowTie = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.1 },
      { x: 0.1, y: 0.5 },
    ];

    expect(roomBoundaryIssue(bowTie)).toBe("The boundary crosses itself");
  });

  it("refuses a boundary that folds back along itself", () => {
    const spike = [
      { x: 0.1, y: 0.1 },
      { x: 0.6, y: 0.1 },
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.5 },
      { x: 0.1, y: 0.5 },
    ];

    expect(roomBoundaryIssue(spike)).toBe("The boundary crosses itself");
  });

  it("refuses three points in a line — the closing edge lies back over the others", () => {
    const line = [
      { x: 0.1, y: 0.1 },
      { x: 0.4, y: 0.1 },
      { x: 0.7, y: 0.1 },
    ];

    expect(roomBoundaryIssue(line)).toBe("The boundary crosses itself");
  });

  it("refuses a shape too small to be a room", () => {
    const speck = [
      { x: 0.5, y: 0.5 },
      { x: 0.51, y: 0.5 },
      { x: 0.51, y: 0.51 },
    ];

    expect(roomBoundaryIssue(speck)).toBe("This shape is too small to be a room");
  });

  it("measures the enclosed fraction of the plan whichever way it was drawn", () => {
    expect(boundaryArea(square)).toBeCloseTo(0.16);
    expect(boundaryArea(square.toReversed())).toBeCloseTo(0.16);
  });

  it("does not mistake a valid corner for a crossing", () => {
    expect(crossesItself(square)).toBe(false);
  });
});

describe("room types", () => {
  it("labels every type", () => {
    for (const type of roomTypes) {
      expect(roomTypeLabels[type]).toBeTruthy();
    }
  });
});
