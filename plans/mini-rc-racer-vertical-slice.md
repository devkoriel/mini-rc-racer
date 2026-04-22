# Mini RC Racer Vertical Slice Plan

## Objective

Ship a clean-room, browser-native 3D toy-car racing vertical slice that immediately reads as:

- tiny car
- giant everyday world
- low aggressive chase camera
- readable arcade HUD
- fast, playful neighborhood racing

This is a `vertical slice` plan, not a full game plan. The goal is one convincing slice that proves the product direction before expanding content.

## Execution Mode

- Repo mode: direct
- Reason: this folder is not a git repository yet
- Branch/PR workflow: deferred until repo initialization

## Non-Negotiable Invariants

- No original `Re-Volt` assets, tracks, HUD art, car bodies, branding, or audio
- Desktop and mobile support stay in scope
- Keyboard, touch, tilt, and gamepad support stay in scope
- The stage must dominate the first screen on desktop
- Every major visual change must preserve buildability

## Success Criteria

The slice is successful when:

1. A static screenshot immediately reads as “toy car racing through a real suburban block”
2. The car feels good within 10 seconds of play
3. The HUD communicates lap, place, speed, timer, and item state without scanning the page
4. The environment is dense enough that the player feels small at all times
5. The shell reads like a game surface, not a landing page

## Step Graph

- Step 1: Freeze design targets and acceptance criteria
- Step 2: Ship game-first shell and HUD framing
- Step 3: Finish `Maple Block` world composition
- Step 4: Tune chase camera, scale, and vehicle feel
- Step 5: Improve pickup readability and core race feedback
- Step 6: Add title/pause/restart polish and alpha-ready UX

Dependencies:

- Step 1 blocks all other steps
- Step 2 and Step 3 can overlap partially, but Step 2 should land first
- Step 4 depends on Step 3 because camera and feel must be tuned against the final environment density
- Step 5 depends on Step 4
- Step 6 depends on Step 2 and Step 5

## Step 1: Freeze Design Targets

### Goal

Turn the current direction into a locked vertical-slice target so future implementation is judged against explicit criteria instead of taste drift.

### Context Brief

The current project has started moving toward a toy-suburb direction, but the design target has been unstable. This step locks the environment fantasy, shell hierarchy, camera goals, and visual acceptance criteria.

### Write Scope

- `docs/design-vision.md`
- `docs/maple-block-brief.md`
- `docs/hud-shell-brief.md`
- `docs/implementation-backlog.md`

### Tasks

- Finalize the `Maple Block` fantasy and route landmarks
- Define screenshot acceptance criteria
- Define exact shell hierarchy
- Define chase-camera target ranges
- Define the P0/P1 backlog

### Verification

- Docs exist and do not contradict each other
- Every later step can reference these docs directly

### Exit Criteria

- A fresh agent can read the docs and know what to build without prior chat context

### Rollback

- If later implementation reveals a contradiction, update the docs first before changing code

## Step 2: Game-First Shell and HUD

### Goal

Make the first screen feel like a game, not a webpage with a game embedded inside it.

### Context Brief

The viewport must dominate. Telemetry should live in or tightly around the stage. Setup controls should be compact and secondary. The user should not have to scroll or visually parse a “marketing page” before the race surface makes sense.

### Write Scope

- `index.html`
- `src/style.css`

### Tasks

- Move primary telemetry into the stage region
- Reduce title and descriptive copy footprint
- Keep controls accessible but demoted
- Tighten spacing so the stage owns the first screen
- Preserve touch-control ergonomics on mobile

### Verification

- Desktop first screen is stage-dominant
- Mobile controls still fit and remain readable
- No overlap regressions for overlay card or touch controls

### Exit Criteria

- The user’s eye lands on the race surface first, not on page chrome

### Rollback

- If in-stage HUD becomes unreadable, back out only the specific telemetry placement, not the whole shell compression

## Step 3: Finish Maple Block Composition

### Goal

Make `Maple Block` look like a believable oversized suburban play space for RC racing.

### Context Brief

This is the most important art step in the current project. The road must always be framed by curbs, sidewalks, lawns, driveways, fences, parked cars, homes, and street furniture. Dead space is the enemy.

### Write Scope

- `src/game/track.ts`
- `src/game/game3d.ts`

### Tasks

- Ensure the road is consistently visible from the chase camera
- Place dense near-road props around all major bends and straights
- Add repeated suburb markers: mailboxes, bins, hedges, hydrants, porches, garages
- Give each track sector a landmark read
- Improve materials for asphalt, curb, sidewalk, driveway, lawn

### Verification

- One still screenshot from normal play shows the road, curb, one major landmark, and at least two scale props
- No major route segment reads as empty lawn

### Exit Criteria

- The environment looks authored rather than procedurally empty

### Rollback

- If density harms readability, remove mid/far clutter before removing near-road scale props

## Step 4: Tune Camera, Scale, and Feel

### Goal

Lock the chase camera and handling against the real finished environment instead of tuning them in isolation.

### Context Brief

The camera is identity, not polish. It must sell speed, preserve road readability, and reinforce scale. The car should feel light, slightly loose, and fast to recover.

### Write Scope

- `src/game/game3d.ts`

### Tasks

- Tune camera distance, height, FOV, lag, and look-ahead
- Make lateral bias readable but not seasick
- Tune off-road slowdown against curb/lawn composition
- Tune steering bite and drift feel
- Make the rival readable within the same framing rules

### Verification

- 10-second drive test feels playful without explanation
- Road stays readable through corners
- Player car remains small relative to the world

### Exit Criteria

- The car/world/camera relationship feels intentional

### Rollback

- If the camera becomes unstable, revert only lag and lateral offset values before changing FOV

## Step 5: Pickup and Race Feedback

### Goal

Upgrade the race from “driving laps” to “arcade racing with drama.”

### Context Brief

Public `Re-Volt` references show how much of the game’s identity came from pickup drama and readable race-state feedback. We will use original pickups and effects, but the same lesson applies.

### Write Scope

- `src/game/game3d.ts`
- `src/main.ts`
- `index.html`
- `src/style.css`

### Tasks

- Make pickups brighter and easier to read
- Add 2-3 more original pickups beyond the current boost ring
- Add stronger pickup activation feedback
- Improve dust, spark, skid, and curb-hit feedback
- Make HUD state changes clearer during countdown, boost, and finish

### Verification

- Players can identify pickup state at a glance
- Boost and hazard moments change the visual rhythm of a lap

### Exit Criteria

- The slice has at least one strong “arcade moment” every lap

### Rollback

- If item chaos harms readability, reduce count before reducing effect quality

## Step 6: Alpha UX Polish

### Goal

Wrap the slice in enough structure that it can be shown publicly without apology.

### Context Brief

This is not full production UI. It is the minimum alpha shell required to stop the build from feeling like an internal prototype.

### Write Scope

- `index.html`
- `src/style.css`
- `src/main.ts`
- `src/game/game3d.ts`
- `README.md`

### Tasks

- Add a title screen or race intro state
- Add pause/options/restart structure
- Improve race-start and race-end messaging
- Make control onboarding cleaner on both desktop and mobile
- Update README and deployment notes once the slice is stable

### Verification

- A new player can load the build and understand how to start, steer, and restart
- The project can be demoed without explaining the page layout first

### Exit Criteria

- The build feels like a public alpha, not a dev snapshot

### Rollback

- If shell work grows too large, keep only title/start/pause/restart and defer deeper menu systems

## Parallelism Notes

- Documentation work can happen in parallel with light shell refactors
- Environment art density and camera tuning should not be split across independent sessions without a locked brief
- HUD polish and pickup work can overlap once the camera is stable

## Anti-Patterns

- Making the page prettier while the stage still feels secondary
- Adding more world props without improving scale composition
- Tuning handling before the final environment density exists
- Copying `Re-Volt` track layouts, item roster, HUD arrangement, or props directly
- Expanding to more tracks before `Maple Block` is convincing

## Plan Mutation Protocol

- If a step grows beyond a focused session, split it into `a` and `b` steps
- If a step is blocked by visual uncertainty, add a screenshot gate before continuing
- If implementation contradicts the brief, update the brief first, then the code
- If the current slice cannot be made convincing, stop feature work and rebuild the slice target before expanding scope
