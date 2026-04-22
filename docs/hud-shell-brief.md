# HUD And Shell Brief

## Goal

Make the product read like a playable game first and a browser page second.

## Primary Rule

The race viewport is the hero. Everything else exists to support it.

## First-Screen Hierarchy

Desktop priority order:

1. Stage / race viewport
2. In-stage race HUD
3. Start-state overlay card
4. Compact control/setup area
5. Title and short descriptor

What should not dominate:

- marketing-style copy
- oversized title block
- detached stat ribbons above the stage
- a full-height sidebar that competes with the playfield

## Layout Rules

### Desktop

- The viewport should dominate the first screen visually
- Telemetry should sit in or tightly around the viewport
- Setup controls should be compact and secondary
- The title area should feel like a label, not a landing-page hero

### Mobile

- The stage remains first
- Touch controls stay reachable and obvious
- Setup controls collapse into compact blocks below or around the stage
- Overlay cards must not hide too much of the drive view

## HUD Content Priority

The HUD should prioritize:

- lap
- place
- current pickup or boost state
- race timer
- speed

Secondary information can be hidden, condensed, or deferred.

## HUD Placement

Preferred structure:

- in-stage telemetry cards anchored to the lower edge
- overlay card for grid/countdown/finish in upper-left or upper-center
- optional rival relationship or minimap only if it does not compete with core readability

Avoid:

- detached dashboard bars above the stage
- duplicated information in both stage and page shell
- decorative chrome that reduces the effective viewport

## Visual Style

- in-stage HUD panels should be dark, glassy, and readable
- labels should be short and high-contrast
- highlight colors should come from pickup / boost language
- typography should feel arcade-clean, not corporate product-site

## Overlay States

### Grid

- track/fantasy name
- immediate input hint
- short one-sentence objective

### Countdown

- large number
- minimal extra copy
- no clutter

### Running

- overlay hidden or reduced

### Finish

- result headline
- one-line summary
- restart hint

## Control Surface Rules

- Control setup belongs in a compact dock
- The dock should explain only what is needed to begin playing
- Touch steering and motion access remain available but do not visually dominate
- Keyboard, touch, gamepad, and tilt support should be visible as capability, not the main attraction

## Copy Rules

- Keep copy short
- Prefer “race language” over product language
- Avoid sounding like a portfolio or prototype showcase

## Acceptance Criteria

The shell passes when:

- a user instantly understands where the game is
- the stage is the largest and most visually important element
- telemetry feels attached to play, not to the webpage
- controls are accessible without stealing focus
- the whole page reads as a game presentation, not a marketing mockup
