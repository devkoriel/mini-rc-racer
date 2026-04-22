import { z } from "zod";

const SplinePoint = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  halfWidth: z.number().positive(),
});

const SurfaceBand = z.object({
  innerOffset: z.number(),
  outerOffset: z.number(),
});

const Prop = z.object({
  propId: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.number(),
  scaleBucket: z.enum(["small", "medium", "large"]),
  meshAsset: z.string().regex(/\.glb$/).optional()
});

const PickupSpawn = z.object({
  progress: z.number().min(0).max(1),
  sideOffset: z.number(),
});

const Lighting = z.object({
  sunDirection: z.tuple([z.number(), z.number(), z.number()]),
  hemisphereSky: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hemisphereGround: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogDensity: z.number().min(0).max(1),
});

export const TrackSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  fantasy: z.string().min(1),
  recommendedClass: z.enum(["rookie", "stock", "muscle", "pro"]),
  spline: z.array(SplinePoint).min(4),
  surfaces: z.object({
    road: SurfaceBand,
    curb: SurfaceBand,
    sidewalk: SurfaceBand,
    verge: SurfaceBand,
  }),
  props: z.array(Prop),
  pickups: z.array(PickupSpawn),
  checkpoints: z.array(z.number().min(0).max(1)).min(2),
  lightmapAtlas: z.string().regex(/\.(ktx2|png)$/),
  lighting: Lighting,
});

export type Track = z.infer<typeof TrackSchema>;

const TorquePoint = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1.5),
]);

const CarTuning = z.object({
  mass: z.number().finite().positive(),
  wheelbase: z.number().finite().positive(),
  trackWidth: z.number().finite().positive(),
  cgHeight: z.number().finite().positive(),
  gripCeiling: z.number().finite().positive(),
  torqueCurve: z.array(TorquePoint).min(2),
  downforce: z.number().finite().nonnegative(),
  brakeStrength: z.number().finite().positive(),
  steerAssist: z.number().min(0).max(1),
});

const CarCosmetic = z.object({
  paintSlots: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1),
  wheelSlot: z.enum(["slick", "knobby", "chrome"]),
  antenna: z.enum(["none", "flag", "ball", "whip"]),
});

export const CarSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  class: z.enum(["rookie", "stock", "muscle", "pro"]),
  silhouette: z.enum([
    "buggy",
    "hatch",
    "wedge-coupe",
    "monster",
    "muscle",
    "van",
    "carbon",
    "formula",
  ]),
  tuning: CarTuning,
  cosmetic: CarCosmetic,
  meshAsset: z.string().regex(/\.glb$/).optional(),
  textures: z.object({
    paintMap: z.string().regex(/\.ktx2$/).optional(),
    roughnessMap: z.string().regex(/\.ktx2$/).optional(),
    normalMap: z.string().regex(/\.ktx2$/).optional()
  }).optional()
});

export type Car = z.infer<typeof CarSchema>;

const PickupEffect = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("boost"),
    duration: z.number().positive(),
    throttleMultiplier: z.number().min(1).max(3),
    gripMultiplier: z.number().min(1).max(2),
  }),
  z.object({
    kind: z.literal("pulse"),
    radius: z.number().positive(),
    knockbackImpulse: z.number().positive(),
  }),
  z.object({
    kind: z.literal("slick"),
    duration: z.number().positive(),
    gripMultiplier: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("projectile"),
    speed: z.number().positive(),
    lifetime: z.number().positive(),
    spinOnHit: z.number().positive(),
  }),
  z.object({
    kind: z.literal("trap"),
    dragMultiplier: z.number().min(0).max(1),
    duration: z.number().positive(),
  }),
  z.object({
    kind: z.literal("shield"),
    duration: z.number().positive(),
  }),
]);

const PickupDefinition = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  rarity: z.number().min(0).max(1),
  classTier: z.enum(["rookie", "stock", "muscle", "pro"]),
  effect: PickupEffect,
});

export const PickupRosterSchema = z.object({
  pickups: z.array(PickupDefinition).min(1),
});

export type PickupDefinitionData = z.infer<typeof PickupDefinition>;
export type PickupRoster = z.infer<typeof PickupRosterSchema>;
