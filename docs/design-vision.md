# Design Vision

This document defines the clean-room target for `Mini RC Racer`: a browser-native 3D toy-car racer that captures the genre feel of `Re-Volt` and related miniature racing games without recreating protected tracks, cars, UI art, or branded content.

## Legal Boundary

- We can study `Re-Volt`, `Hot Wheels Unleashed 2`, `Table Top Racing: World Tour`, and `Smash Cars` for genre patterns.
- We will not recreate shipped `Re-Volt` tracks, car bodies, HUD layouts, pickup roster, menu art, audio, or branding 1:1.
- We will build original environments, original vehicle silhouettes, original HUD styling, and original race content.

## Source-Grounded Genre Cues

### `Re-Volt`

Public references show the core fantasy clearly:

- The official manual describes three camera views, a compact racing HUD, car classes, mirrored and reversed tracks, and a focus on pickups during races.
- The manual also describes everyday-space tracks such as a supermarket, where aisles, crates, carts, and doors become racing obstacles.
- The `Re-Volt I/O` screenshot archive lists environments such as `Super Market`, `Museum`, `Toys in the Hood`, `Toytanic`, `Botanical Garden`, and `Toy World`.
- The `Re-Volt I/O` pickups guide documents a high-drama pickup layer including `Shockwave`, `Firework`, `Electro Pulse`, `Bomb`, `Oil Slick`, and `Turbo Battery`.

Design takeaway:

- The magic is not just “RC cars.” It is tiny cars moving through oversized, readable, everyday spaces with expressive pickups and a low chase camera.

### `Hot Wheels Unleashed 2`

The official site emphasizes:

- drift, boost, jump, and lateral dash
- detailed environments where terrain affects handling
- collectible identity and strong vehicle fantasy
- track-building spectacle and readable arcade exaggeration

Design takeaway:

- Modern toy-racer presentation needs stronger material contrast, clearer stunt language, and more dramatic environment dressing than a bare loop in an empty field.

### `Table Top Racing: World Tour`

The official Nintendo listing emphasizes:

- miniaturized race cars
- table-top circuits in themed locations
- combat-racing power-ups
- local and online multiplayer readability

Design takeaway:

- Small-car racing works best when each environment has a strong thematic identity and the track can be read quickly at a glance.

### `Smash Cars`

The Steam page emphasizes:

- RC car racing in unlikely locations
- real-time physics
- stunt-heavy movement
- playful interaction with the surrounding environment

Design takeaway:

- The world should feel playful and oversized, not neutral or empty. The environment is part of the fantasy, not background wallpaper.

## Design Pillars

### 1. Tiny Car, Giant World

The player car must look small enough that sidewalks, curbs, parked cars, shopping carts, lawn furniture, driveways, and room props feel huge by comparison.

Rules:

- Track width should usually read as `6-8` car widths, not a full-size boulevard.
- Curbs, sidewalks, driveways, lawns, and edges must be visible from the default chase camera.
- Props should sit close enough to the road that scale is constantly reinforced.

### 2. Low, Aggressive Chase Camera

The camera is a primary identity feature.

Rules:

- Default play camera should be low and close, not floating high above the car.
- The look target should sit ahead of the car, so the road horizon compresses and speed reads strongly.
- Camera lag should be soft enough to feel dynamic but stable enough to keep the road readable.

### 3. Everyday Spaces With Strong Identity

Each environment should feel like a place a real toy car should not be racing in.

Target environment families:

- suburban block
- backyard patio
- supermarket service lane
- schoolyard / playground edge
- garage / workshop floor

Rules:

- Every track needs a simple one-sentence fantasy.
- Every track needs 3-5 signature prop types visible from normal racing angles.
- The route should exploit scale changes, choke points, and landmark turns.

### 4. Chunky Arcade Readability

The player should understand the race state instantly.

Rules:

- Boosts and pickups should be oversized and bright.
- The HUD should prioritize lap, place, timer, pickup, and speed.
- Effects should be readable at a glance: dust, sparks, shock rings, boost glow, skid streaks.

### 5. Loose, Playful Handling

The car should feel responsive, slide slightly, and recover quickly. It should not feel like a simulator or a generic kart.

Rules:

- steering should bite early
- slight drift should appear naturally at race pace
- off-road should punish, but not instantly kill momentum
- boosts should feel short, dramatic, and visible

## Visual Direction

### World Styling

- Push clean, chunky forms over noisy realism.
- Use warm sunlight, crisp shadows, and exaggerated object scale.
- Favor readable materials: asphalt, concrete curb, sidewalk slab, lawn, painted wood fence, stucco walls, garage door, toy-plastic pickups.

### Color Script

- World base: sun-warmed suburb tones
- Road: cool dark asphalt for contrast
- Curbs and sidewalks: pale concrete
- Grass: saturated but believable green
- Pickups and boosts: gold, electric blue, orange
- Rivals and player cars: bold, collectible colors with high contrast accents

### Prop Language

Use props that reinforce scale and place:

- parked sedans, vans, and wagons
- mailboxes, bins, fences, hedges
- garage doors, driveways, porches
- streetlights, hydrants, cones
- patio chairs, kiddie toys, garden edges

Avoid:

- wide empty fields
- oversized dead space between road and props
- generic abstract scenery with no household story

## Camera Target

Recommended starting target for the default chase view:

- FOV: `68-74`
- camera distance: `1.8-2.6` car lengths behind player
- camera height: `0.9-1.4` car heights above road
- look-ahead target: `1.8-2.8` car lengths ahead
- lateral camera bias from drift: small, readable, never seasick

Success criteria:

- The player car should occupy roughly `8-14%` of screen height in normal driving.
- The road ahead must stay readable through corners.
- Curbs and roadside props should remain visible in the lower half of the frame.

## Track Design Rules

### Route Shape

- Favor memorable loops with 4-6 anchor turns.
- Alternate fast readable straights with tighter landmark corners.
- Avoid long empty straights unless a landmark or hazard is doing work.

### Trackside Density

- Every major bend should have a landmark.
- Every straight should have repeating scale props.
- Every shortcut or pickup line should be readable before the player reaches it.

### Original Track Concepts

- `Maple Block`
  A neighborhood circuit around lawns, curbs, driveways, and parked cars.

- `Checkout Rush`
  A service corridor and stock area track behind a suburban market.

- `Backyard Rally`
  Patio stone turns, hose obstacles, lawn edging, sandbox shortcuts.

- `Garage Circuit`
  Tool benches, paint cans, extension cords, ramps, and tire stacks.

## Pickup Layer

We can take the lesson from `Re-Volt` without copying its exact item roster.

Target pickup families:

- short speed burst
- proximity discharge
- bouncing projectile
- slick hazard
- delayed explosive transfer

Rules:

- pickups must be visually legible before mechanically complex
- each pickup must have a distinct silhouette and color
- effects must read clearly in split-second arcade play

## Product Surface

The game should not present itself like a portfolio page or web demo landing page.

Rules:

- the race viewport must dominate the first screen
- game UI should read as in-game shell, not marketing chrome
- setup options should be compact and secondary
- title, subtitle, and controls should not push the track below the fold on desktop

## Production Plan

### Phase 1: Core Visual Truth

- lock the chase camera target
- fix road readability and scale
- finish one convincing suburban environment
- make the track viewport dominate the page

Exit criteria:

- one screenshot should immediately read as “toy car racing in a real neighborhood”

### Phase 2: Handling and Feedback

- tighten steering and drift balance
- add skid marks, sparks, curb hits, and better boost feedback
- improve collision response and off-road punishment

Exit criteria:

- the car feels playful within 10 seconds of driving

### Phase 3: Pickup Drama

- expand beyond a single boost object
- add 3-4 original arcade pickups
- add clear HUD and audio feedback for item state

Exit criteria:

- races become situational, not just pure driving laps

### Phase 4: Track Identity

- ship a second and third original track
- each track gets a unique place fantasy and prop kit
- add track intro card and signature landmarks

Exit criteria:

- tracks are memorable by place, not just by corner sequence

### Phase 5: Publishable Shell

- title screen
- pause/options menu
- race restart flow
- cleaner HUD art direction
- mobile-first control onboarding

Exit criteria:

- the project reads like a real web game alpha, not a local prototype

## Immediate Implementation Order

1. Finish `Maple Block` as the reference environment.
2. Lower and stabilize the chase camera until the car/world scale is convincing.
3. Move all nonessential page chrome out of the way of the viewport.
4. Replace placeholder world spacing with dense curbside props.
5. Expand pickup and effect feedback after the scene finally looks right.

## Sources

- `Re-Volt` manual: https://files.re-volt.io/manuals/manual_pc_eng.pdf
- `Re-Volt I/O` tracks archive: https://re-volt.io/articles/screenshots-tracks-from-above
- `Re-Volt I/O` pickups guide: https://re-volt.io/articles/pick-ups
- `Hot Wheels Unleashed 2` official site: https://hotwheelsunleashed.com/
- `Table Top Racing: World Tour - Nitro Edition` official Nintendo listing: https://www.nintendo.com/us/store/products/table-top-racing-world-tour-nitro-edition-switch/
- `Smash Cars` Steam page: https://store.steampowered.com/app/111300/Smash_Cars/
