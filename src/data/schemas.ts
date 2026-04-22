import { z } from "zod";

const SplinePoint = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  halfWidth: z.number().positive()
});

const SurfaceBand = z.object({
  innerOffset: z.number(),
  outerOffset: z.number()
});

const Prop = z.object({
  propId: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.number(),
  scaleBucket: z.enum(["small", "medium", "large"])
});

const PickupSpawn = z.object({
  progress: z.number().min(0).max(1),
  sideOffset: z.number()
});

const Lighting = z.object({
  sunDirection: z.tuple([z.number(), z.number(), z.number()]),
  hemisphereSky: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hemisphereGround: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fogDensity: z.number().min(0).max(1)
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
    verge: SurfaceBand
  }),
  props: z.array(Prop),
  pickups: z.array(PickupSpawn),
  checkpoints: z.array(z.number().min(0).max(1)).min(2),
  lightmapAtlas: z.string().min(1),
  lighting: Lighting
});

export type Track = z.infer<typeof TrackSchema>;
