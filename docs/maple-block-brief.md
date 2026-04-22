# Maple Block Brief

## One-Line Fantasy

A quiet suburban block turns into an oversized RC race circuit where curbs, driveways, porches, parked cars, and street furniture make the player feel tiny and fast.

## Role In The Project

`Maple Block` is the reference track for the vertical slice. It is the first environment that must fully sell the game’s identity before any second track is started.

## Emotional Target

- playful
- sunlit
- fast
- slightly mischievous
- clearly miniature

The player should feel like they are racing an RC car through a real neighborhood where every curb and parked sedan is huge by comparison.

## What It Must Communicate Instantly

- This is a toy-car racer
- The world is much larger than the car
- The route is readable
- The setting is a neighborhood, not abstract scenery
- The race is arcade-focused, not simulation-focused

## Route Topology

Target route identity:

- one broad opening straight
- one landmark medium-speed bend
- one tighter curb-lined corner
- one wider recovery section
- one finish approach with visible trackside detail

The loop should feel memorable from landmarks, not just from corner count.

## Sector Beats

### Sector A: Front Straight

- Clear launch read
- Visible houses and parked cars
- Pickup line visible ahead
- Streetlights and fences reinforce speed

### Sector B: Long Curb Bend

- Strong curb and sidewalk read
- Player should feel the camera compressing the turn
- Driveways and lawn edges should sit close to the asphalt

### Sector C: Landmark Corner

- Signature object cluster
- Strongest scale read on the lap
- Opportunity for a hazard or pickup decision

### Sector D: Recovery Straight

- Slightly wider breathing room
- Repeating neighborhood props
- Rival should be visible and trackable here

### Sector E: Finish Return

- Start/finish line and banner read clearly
- Nearby houses and curb transitions should frame the return

## Landmark Kit

Every sector needs at least one strong landmark from this family:

- house with porch and garage
- parked sedan or wagon
- driveway with mailbox
- hedge / fence run
- streetlight / hydrant pair
- trash bins or lawn clutter

## Prop Density Rules

### Near Road

These should sit close enough to constantly reinforce scale:

- curb
- sidewalk
- grass verge
- driveway cuts
- mailboxes
- bins
- fence posts

### Mid Distance

These build place identity:

- houses
- garages
- parked cars
- hedges
- porches
- trees

### Far Distance

These should support depth without becoming noise:

- rooflines
- utility silhouettes
- additional homes
- larger tree masses

## Scale Targets

- Track should read as a neighborhood street adapted for RC scale, not a normal full-size road
- Curbs must be clearly visible from the chase camera
- Sidewalks must be readable as separate surfaces from asphalt and lawn
- Parked full-size cars should look several times larger than the player car
- Houses should clearly dominate the frame when they sit near the route

## Surface Material Targets

- asphalt: dark, slightly cool, readable against curb
- curb: pale concrete with painted rhythm where useful
- sidewalk: flatter, lighter concrete
- lawn: saturated but believable green
- driveway: warm gray, slightly different from sidewalk

## Camera Targets For Maple Block

- The front straight should show curb, road, and at least one house cluster
- On the long bend, the camera should keep the apex readable without rising too high
- The player car should remain small, not dominate the screen
- The horizon should never reduce the environment to flat empty grass

## Pickup Placement Rules

- Pickups should sit where the player naturally sees them early
- First pickup should teach line choice, not hide in clutter
- Pickup silhouettes must contrast with suburban materials
- Pickups should not be the only colorful object in the frame

## Things To Avoid

- empty lawn bordering large stretches of road
- house placement too far from the playable lane
- a camera that looks down from above rather than through the street
- oversized player car proportions that break the scale fantasy
- direct replication of `Toys in the Hood`

## Screenshot Gate

`Maple Block` passes the first screenshot gate only when a normal gameplay still includes:

- visible asphalt
- visible curb or sidewalk
- player car
- at least one oversized everyday object
- clear sense of a suburban block rather than an open field

## Implementation Notes

- Use dense roadside composition first, then tune camera
- When choosing between more distant scenery and better close-range props, prefer close-range props
- If a sector still feels empty, add scale markers before adding decorative background detail
