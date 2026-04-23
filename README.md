# Mini RC Racer

A clean-room, browser-native arcade RC racer. Tiny cars, oversized everyday spaces, low chase camera, three-lap races with pickups. Tier 3 package target: 5 tracks, 4 classes / 8 cars, 6 pickups, Race / Time Trial / Battle Tag / Championship, async ghost sharing on Cloudflare.

This is the Phase 1 alpha: **Sector 18 only, Stock-class `Boulevard` only, Spark Burst pickup only, one AI rival**. Phases 2-4 add Aisle Nine, Driftwood Patio, Workshop Floor, Wing C, Rookie / Muscle / Pro cars, and the rest of the pickup roster.

See:
- Design spec: `docs/superpowers/specs/2026-04-23-rc-racer-uplift-design.plan`
- Phase 1 plan: `docs/superpowers/plans/2026-04-23-phase-1-engine-reset.plan`
- Amendment A (Blender + UI uplift): `docs/superpowers/plans/2026-04-23-phase-1-amendment-a-blender-ui.plan`
- Modeling briefs: `docs/superpowers/modeling-briefs/`

## Architecture

```
src/
  app.ts            entry — boots engine + screens + race loop
  engine/           loop, input, audio, events, assets (GLTF / KTX2 / Meshopt)
  sim/              physics, car, AI, pickups, race FSM, track runtime (renderer-agnostic)
  render/           Three.js scene, track mesh, instanced props, car mesh, camera, FX, HUD
  ui/               title / track-select / car-select screens, overlay, mobile controls
  content/          tracks / cars / pickups as JSON (Zod-validated), lightmap atlases
  data/             schemas + settings / best-lap storage
  util/math.ts      Vec3, Catmull-Rom spline, curvature, closest-point
  worker/           Cloudflare Worker scaffold (Phase 3 enables ghost endpoints)
```

Sim never imports Three. Render reads sim snapshots, never mutates them. Every file stays ≤ 600 lines.

## Blender asset pipeline

Props and pickups are authored by headless Blender Python scripts at `tools/blender/`. Hero cars are hand-modeled following the briefs in `docs/superpowers/modeling-briefs/`.

```bash
# One-off: install Blender + dependencies
brew install --cask blender

# Rebuild props + pickups (writes to public/content/meshes/)
npm run assets:build
```

Hand-modeled GLBs go in `public/content/meshes/cars/`. Both locations are `.gitignored` — the pipeline rebuilds procedural assets on demand; hand-modeled assets live outside git.

## Local development

```bash
npm install
npm run dev
```

## Controls

- `WASD` / arrows — drive and steer
- `Space` — advance through menus, then fire pickup during race
- `P` — pause / resume
- `R` — restart from grid
- Touch: on-screen buttons (and optional tilt steering on supported mobile)
- Gamepad: left stick / D-pad steer, triggers drive, Start launches

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run e2e
```

## Cloudflare deploy

- Pages: `npm run build` → `dist/`
- Workers: `npx wrangler deploy`

The repo includes `wrangler.toml` pinning the worker name and pointing static assets at `./dist`.

## Status

Phase 1 ships Sector 18 with one rival and one pickup, meeting the performance budget in §6.5 of the design spec. Phase 2-4 will land on top of this.
