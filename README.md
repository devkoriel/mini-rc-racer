# Mini RC Racer

`Mini RC Racer` is a clean-room browser toy-car racer built for modern browsers. It targets the same late-90s RC arcade feeling people remember, but it does so with original code, original art direction, and a legal public-repo path instead of shipping `Re-Volt` content.

## What is in this repo

- Responsive browser game shell with desktop and mobile layouts
- Real WebGL 3D chase-camera renderer using `Three.js`
- One playable `Maple Block` suburban circuit with boost pickups and a rival car
- Rival AI that follows the racing line
- Race countdown, HUD telemetry, and persistent best laps
- Keyboard, touch, tilt, and gamepad support in the same build
- In-page control options for touch steering mode and motion access
- A clean-room analysis brief in `docs/clean-room-analysis.md`
- Vite + TypeScript setup for local development
- GitHub Actions CI for typecheck, test, and production build
- Cloudflare Pages-ready output via `wrangler.toml`

## Planning Docs

- Design vision: `docs/design-vision.md`
- Clean-room guardrails: `docs/clean-room-analysis.md`
- Vertical slice plan: `plans/mini-rc-racer-vertical-slice.md`
- Maple Block brief: `docs/maple-block-brief.md`
- HUD and shell brief: `docs/hud-shell-brief.md`
- Prioritized backlog: `docs/implementation-backlog.md`

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://localhost:4173`.

Controls:

- `WASD` or arrows to steer and drive
- `Space` to start or replay
- `R` to reset from the grid or finish state
- Touch buttons on mobile
- Tilt steering on supported mobile browsers after sensor permission
- Standard gamepad support with stick or D-pad plus triggers

## Verification

```bash
npm run typecheck
npm test
npm run build
npm audit
```

## Cloudflare Pages

Use these settings in Cloudflare Pages:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22`

The repo already includes `wrangler.toml` with `pages_build_output_dir = "./dist"`, so you can either configure Pages in the dashboard or deploy with Wrangler.

You can also deploy with Wrangler after authenticating:

```bash
npx wrangler pages deploy dist --project-name mini-rc-racer
```

## Next milestones

1. Add a title screen, pause menu, and options flow that feel like a shipping game.
2. Add more tracks, stronger collision dressing, and better rival behavior.
3. Layer in audio, better materials, and device QA for a real public alpha.
