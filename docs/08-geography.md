# Geography: servers as sectors, channels as zones

The galaxy map *is* Discord's structure. Locations are static and derived
from immutable IDs, so a place is always the same place — familiarity comes
for free.

## Mapping

```
Discord server     → Sector   (star system / region)
Channel category   → Body     (planet, moon, asteroid belt, star, deep space)
Text channel       → Zone     (station, surface colony, orbit, belt, refinery,
                                wreck field, ruins, nebula pocket …)
```

- **Where you are** = the channel you last issued a command from.
- **Intra-sector travel** (channel → channel, same server): seconds to
  minutes. No encounters.
- **Inter-sector travel** (server → server): a jump. Minutes to hours; rolls
  for encounters in low-security space.

## Determinism: hash the IDs, never the names

Guild, category, and channel snowflake IDs never change. Seed a generator:

```
sector = gen(hash(guild_id))
  → name, star class, security level, resource signature
    (iron-rich / gas-rich / ice / pirate-infested / trade hub …)
body   = gen(hash(category_id), sector)
  → body type + name
zone   = gen(hash(channel_id), body)
  → zone type (station, belt, refinery, wreck field …) + name
```

Properties this buys:
- Same result for every player, every restart, forever, with nothing stored.
- Renaming a channel doesn't move anything.
- Deleting a channel destroys the zone (optionally recorded in sector history
  as "lost").
- Adding a channel discovers a new zone.
- Channels without a category → zones in the sector's "deep space" body.

### Flavor heuristics
Bias the generator with channel-name keywords so defaults feel intentional:
`mining`/`ore` → belt; `market`/`trade`/`shop` → station market; `lounge`/`bar`
→ station cantina; `dev`/`build` → shipyard; `mod`/`admin`/`staff` → naval
base. Name changes the *initial* roll only; once a zone exists it's pinned
(store the first-seen assignment so renames can't re-roll it).

### Admin overrides (DB, optional)
- `/sector name <name>` — rename the sector.
- `/sector setup` — assign zone types to channels, set the sector's "capital"
  station.
- `/sector void #channel` — that channel is empty space: no events, no
  commands. Default set = channels where the bot can send messages.

Rule: deterministic defaults, admin overrides, never re-roll silently.

## Why this matters beyond flavor

- **Trade routes are server hops.** Each sector has a resource signature, so
  a friend's server is where the cheap ore is. Cross-server trade means
  physically going to their server. Servers become places.
- **Ambient events spawn in a zone.** The derelict appears in `#lounge`; only
  players present in that channel see it. Presence matters.
- **Private channels are restricted zones.** A mod-only channel is a naval
  base or corporate vault; access falls out of Discord permissions.
- **Small servers are small sectors.** A 3-channel server is a lonely
  outpost; a 200-channel server is a capital. Honest and charming.
- **Guaranteed minimums.** Every sector has at least one station (the
  capital) and one resource zone, so every server is playable alone.

## Inter-sector graph

- Two sectors are **adjacent for a player** if they are in both servers (with
  the bot present).
- Jump time between sectors = f(hash(guild_a, guild_b)) — stable, symmetric,
  bounded (e.g. 5 min – 6 h). Low-sec jumps roll for pirate encounters.
- **Hub sector**: the bot's own support server. Always reachable, NPC
  capital, starter station, baseline market. Solves "new player with no
  connected sectors."
- Optional explicit gates: `/sector gate <server>` lets admins declare a
  permanent lane to a partner server (both sides must agree).

## Edge cases

| Situation | Handling |
|---|---|
| Huge server (200+ channels) | Categories become bodies; cap zones per body (e.g. 8); extras are "uncharted" until an admin promotes them. |
| Bot lacks send permission in a channel | Zone exists on the map but is "no-signal": visible, not enterable. |
| Player's last channel was deleted | Snap to the sector's capital station. |
| Player leaves a server | Ship remains where it is; can only act once they're in a sector they can reach. Auto-tow to hub after N days. |
| Bot removed from a server | Sector goes dark: appears on maps as "lost contact"; ships inside tow to hub. |
| Lucky/unlucky sector rolls | Accept as flavor; minimums guarantee playability. |
| Threads / voice / forum channels | Ignored in v1 (not zones). Forum channels could become "research stations" later. |

## Commands

- `/map` — render the current sector: bodies, zones, what's at each, who's
  docked (players seen recently).
- `/where` — current sector/body/zone, neighbors, jump options.
- `/goto #channel` — intra-sector move (or just issue a command from that
  channel).
- `/jump <sector>` — autocomplete from reachable sectors.
- `/sector …` — admin configuration (see above).

## Player mental model (the goal)

"My home server is the Vega sector. `#general` is Kessler Station,
`#mining-talk` is the belt, the mod channel is the naval yard I can't enter.
My buddy's server is Tau Ceti, two jumps out and gas-rich — I haul ore there
and bring back fuel. The bot's server is the hub where I bought my first
ship."

## Open questions
- Does "where you are" require issuing a command in that channel, or does
  chatting there count? Technically possible without privileged intents
  (verified; see 03) — remaining question is design: chatting = presence is
  nicer, but moving a docked ship because someone said "lol" in another
  channel may surprise people. Leaning: chat updates *presence* (who's
  around, event eligibility) but not *ship location*; ship moves only on
  command.
- Presence display on `/map` — privacy concern? Probably opt-out.
- How much should sector resource signatures differ? Too much and a player
  with one server is starved; too little and travel is pointless. Start with
  every sector having all basics + one specialty.
