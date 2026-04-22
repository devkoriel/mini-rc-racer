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

## Cloudflare Deploy

This repo is ready for both `Cloudflare Pages` and `Cloudflare Workers Builds`.

### Pages

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22`

### Workers Builds

- Worker / project name: `mini-rc-racer`
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Root directory / path: `/`
- Build variables: none required

The repo includes a `wrangler.toml` that pins the Worker name and points static assets at `./dist`, which matches the dashboard settings above.

You can also deploy manually with Wrangler after authenticating:

```bash
npx wrangler deploy
```

## Next milestones

1. Add a title screen, pause menu, and options flow that feel like a shipping game.
2. Add more tracks, stronger collision dressing, and better rival behavior.
3. Layer in audio, better materials, and device QA for a real public alpha.
