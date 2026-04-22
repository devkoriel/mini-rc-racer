# Clean-Room Analysis

This project aims to capture the nostalgic feel of late-90s toy-car racing without copying protected `Re-Volt` expression.

## Screenshot cues worth emulating

- A low chase camera that keeps the asphalt large in frame and makes speed feel exaggerated.
- A toy-scale suburban setting with driveways, garages, parked vehicles, fences, and trees that make the player feel small.
- Bright collectible pickups with an electric or battery-like glow.
- Readable race-state HUD elements that prioritize lap, position, and timing.
- Fast, slightly loose arcade handling rather than simulation-heavy traction.

## Mechanics we can study

- Lap-based circuit racing with instant restarts.
- Easy-to-read boost moments from collectible pickups.
- Rival cars that follow the racing line and apply light braking before sharper turns.
- Visual speed cues from camera placement, roadside scale, and motion streaks.

## Boundaries we are not crossing

- No original `Re-Volt` code, assets, car models, textures, HUD layout, track geometry, branding, or audio.
- No 1:1 recreation of a shipped map, car roster, menu flow, or UI art.
- No distribution of original game data in this repo.

## Clean-room translation for this prototype

- Use original track geometry and prop placement shaped around suburban, backyard, garage, or market-adjacent loops, not existing shipped tracks.
- Use original vehicle silhouettes and colors designed for this project.
- Use a real 3D browser renderer that evokes the genre camera feel without tracing original scenes or track layouts.
- Use fresh HUD copy and presentation tailored for this repo.

See also: `docs/design-vision.md`
