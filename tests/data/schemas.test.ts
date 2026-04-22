import { describe, expect, it } from "vitest";
import {
  TrackSchema,
  CarSchema,
  PickupRosterSchema,
} from "../../src/data/schemas";

const VALID_TRACK = {
  id: "sector-18",
  displayName: "Sector 18",
  fantasy: "suburban cul-de-sac",
  recommendedClass: "stock",
  spline: [
    { x: 0, y: 0, z: 0, halfWidth: 4 },
    { x: 10, y: 0, z: 0, halfWidth: 4 },
    { x: 10, y: 0, z: 10, halfWidth: 4 },
    { x: 0, y: 0, z: 10, halfWidth: 4 },
  ],
  surfaces: {
    road: { innerOffset: 0, outerOffset: 0 },
    curb: { innerOffset: 0, outerOffset: 0.4 },
    sidewalk: { innerOffset: 0.4, outerOffset: 2 },
    verge: { innerOffset: 2, outerOffset: 6 },
  },
  props: [],
  pickups: [{ progress: 0.25, sideOffset: 0 }],
  checkpoints: [0.25, 0.5, 0.75],
  lightmapAtlas: "neutral.png",
  lighting: {
    sunDirection: [0.4, 0.8, 0.2],
    hemisphereSky: "#a8c4e0",
    hemisphereGround: "#504030",
    fogDensity: 0.003,
  },
};

describe("TrackSchema", () => {
  it("accepts a valid track", () => {
    const parsed = TrackSchema.parse(VALID_TRACK);
    expect(parsed.id).toBe("sector-18");
    expect(parsed.spline).toHaveLength(4);
  });

  it("rejects a track with fewer than 4 spline points", () => {
    const bad = { ...VALID_TRACK, spline: VALID_TRACK.spline.slice(0, 3) };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects a track with progress values outside [0, 1]", () => {
    const bad = { ...VALID_TRACK, pickups: [{ progress: 1.5, sideOffset: 0 }] };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects a spline point with halfWidth <= 0", () => {
    const bad = {
      ...VALID_TRACK,
      spline: [
        { x: 0, y: 0, z: 0, halfWidth: 0 },
        { x: 10, y: 0, z: 0, halfWidth: 4 },
        { x: 10, y: 0, z: 10, halfWidth: 4 },
        { x: 0, y: 0, z: 10, halfWidth: 4 },
      ],
    };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects invalid hex colors in lighting", () => {
    const bad = {
      ...VALID_TRACK,
      lighting: { ...VALID_TRACK.lighting, hemisphereSky: "not-a-hex" },
    };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects fewer than 2 checkpoints", () => {
    const bad = { ...VALID_TRACK, checkpoints: [0.5] };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects empty id strings", () => {
    const bad = { ...VALID_TRACK, id: "" };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects when required lighting block is missing", () => {
    const { lighting: _lighting, ...rest } = VALID_TRACK;
    expect(() => TrackSchema.parse(rest)).toThrow();
  });
});

const VALID_CAR = {
  id: "boulevard",
  displayName: "Boulevard",
  class: "stock",
  silhouette: "wedge-coupe",
  tuning: {
    mass: 1.2,
    wheelbase: 0.22,
    trackWidth: 0.14,
    cgHeight: 0.05,
    gripCeiling: 1.0,
    torqueCurve: [
      [0, 0.4],
      [0.5, 1.0],
      [1.0, 0.65],
    ],
    downforce: 0.2,
    brakeStrength: 1.0,
    steerAssist: 0.3,
  },
  cosmetic: {
    paintSlots: ["#e0c874", "#20242a"],
    wheelSlot: "slick",
    antenna: "flag",
  },
};

describe("CarSchema", () => {
  it("accepts a valid car", () => {
    const parsed = CarSchema.parse(VALID_CAR);
    expect(parsed.id).toBe("boulevard");
  });

  it("rejects a car with an empty torque curve", () => {
    const bad = {
      ...VALID_CAR,
      tuning: { ...VALID_CAR.tuning, torqueCurve: [] },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects a car with a non-finite mass", () => {
    const bad = {
      ...VALID_CAR,
      tuning: { ...VALID_CAR.tuning, mass: Number.POSITIVE_INFINITY },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects a car with a negative wheelbase", () => {
    const bad = {
      ...VALID_CAR,
      tuning: { ...VALID_CAR.tuning, wheelbase: -0.1 },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects a car with no paint slots", () => {
    const bad = {
      ...VALID_CAR,
      cosmetic: { ...VALID_CAR.cosmetic, paintSlots: [] },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid class enum", () => {
    const bad = { ...VALID_CAR, class: "monster-truck" };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid hex paint color", () => {
    const bad = {
      ...VALID_CAR,
      cosmetic: { ...VALID_CAR.cosmetic, paintSlots: ["not-hex"] },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });

  it("rejects a steerAssist outside [0, 1]", () => {
    const bad = {
      ...VALID_CAR,
      tuning: { ...VALID_CAR.tuning, steerAssist: 1.5 },
    };
    expect(() => CarSchema.parse(bad)).toThrow();
  });
});

const VALID_ROSTER = {
  pickups: [
    {
      id: "spark-burst",
      displayName: "Spark Burst",
      rarity: 0.5,
      classTier: "rookie",
      effect: {
        kind: "boost",
        duration: 2.0,
        throttleMultiplier: 1.6,
        gripMultiplier: 1.2,
      },
    },
    {
      id: "guard",
      displayName: "Guard",
      rarity: 0.1,
      classTier: "stock",
      effect: { kind: "shield", duration: 3.0 },
    },
  ],
};

describe("PickupRosterSchema", () => {
  it("accepts a valid roster", () => {
    const parsed = PickupRosterSchema.parse(VALID_ROSTER);
    expect(parsed.pickups).toHaveLength(2);
  });

  it("rejects unknown effect kinds", () => {
    const bad = {
      pickups: [
        {
          id: "bad",
          displayName: "Bad",
          rarity: 0.5,
          classTier: "stock",
          effect: { kind: "teleport", distance: 10 },
        },
      ],
    };
    expect(() => PickupRosterSchema.parse(bad)).toThrow();
  });

  it("rejects an empty roster", () => {
    expect(() => PickupRosterSchema.parse({ pickups: [] })).toThrow();
  });

  it("rejects rarity outside [0, 1]", () => {
    const bad = { pickups: [{ ...VALID_ROSTER.pickups[0], rarity: 1.5 }] };
    expect(() => PickupRosterSchema.parse(bad)).toThrow();
  });

  it("rejects a boost effect with throttleMultiplier < 1", () => {
    const bad = {
      pickups: [
        {
          ...VALID_ROSTER.pickups[0],
          effect: {
            kind: "boost",
            duration: 1.0,
            throttleMultiplier: 0.5,
            gripMultiplier: 1.0,
          },
        },
      ],
    };
    expect(() => PickupRosterSchema.parse(bad)).toThrow();
  });

  it("rejects a projectile effect missing speed", () => {
    const bad = {
      pickups: [
        {
          id: "rocket",
          displayName: "Rocket",
          rarity: 0.3,
          classTier: "muscle",
          effect: { kind: "projectile", lifetime: 4.0, spinOnHit: 2.0 },
        },
      ],
    };
    expect(() => PickupRosterSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid classTier enum", () => {
    const bad = {
      pickups: [{ ...VALID_ROSTER.pickups[0], classTier: "legendary" }],
    };
    expect(() => PickupRosterSchema.parse(bad)).toThrow();
  });
});
