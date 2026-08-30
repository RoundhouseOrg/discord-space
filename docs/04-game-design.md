# Game design

Everything here is a first draft. Numbers are placeholders.

## Core loop

```
/launch                         pick a starter hull + role
/mine /patrol /salvage /explore timed jobs (2–60 min); resolve on return
/market                         NPC station prices; buy/sell cargo
/jump <system>                  travel time; chance of an encounter
/fit                            spend credits on modules
/ship [@friend] /log /leaderboard   the stats layer
```

Session shape: open Discord → check completed jobs → sell cargo → refit →
start next job → close Discord. 2–5 minutes, several times a day.

## Roles & starter hulls

| Role | Hull | Strength | Starting bias |
|---|---|---|---|
| Miner | Prospector | Cargo + mining laser | Mining yield |
| Trader | Freighter | Big cargo hold | Buy/sell margins, hauling |
| Fighter | Interceptor | Weapons + shields | Patrol bounties, combat |
| Scout | Courier | Speed + scanner | Exploration, discovery bonuses |

Roles are a starting bias, not a lock. Any hull can do any job; the hull and
fittings decide how well. Later: mid-tier hulls per role, and a few hybrids.

## Jobs (timed actions)

All jobs: pick a job → bot replies with an embed showing ETA → player leaves →
on return (`/status` or any command) the job resolves and the reward is
credited. Rewards are computed from the DB timestamp, idempotently.

- **Mine** — needs an asteroid field in the current system. Yield scales with
  mining module, cargo cap. Small chance of a rare mineral. 10–30 min.
- **Patrol** — hunt NPC pirates for bounties. May trigger a combat encounter
  on return (button fight). 15–45 min.
- **Salvage** — scan wrecks; random loot table (modules, scrap, data cores).
  Higher variance than mining. 10–30 min.
- **Explore** — scan the system for hidden sites; discover new systems on the
  map edge. Grants "discovered" credit on the ship card. 30–60 min.
- **Haul** (implicit) — buy cargo, `/jump`, sell. Travel time is the cooldown.

Only one active job per ship. Jumping cancels nothing — you can't jump while
a job is running.

## Galaxy

**Superseded by `08-geography.md`:** the map is Discord itself. Servers are
sectors, categories are bodies, channels are zones, all derived
deterministically from snowflake IDs. The hand-authored 20–40 system graph
idea is replaced by the bot's hub server plus every server the bot is in.

Retained from the earlier design: each sector has a security level (pirate
encounter rate) and a market profile; `/jump` time scales with a stable
pseudo-distance; jumps through low-sec roll for encounters.

## Combat

See `10-combat.md`. Summary: three range bands, five actions (Fire /
Evade / Close in / Pull back / Jump out), simultaneous resolution, weapons
with per-band damage, NPC archetypes, consensual duels in v1.

## Economy

Start **NPC-only**. Players trade with stations, not each other.

- Each commodity has a base price; each station has a produce/consume profile.
- Price = base × station modifier × scarcity, where scarcity drifts toward
  equilibrium and is nudged by player buys/sells (bounded so a whale can't
  crash a market).
- Global nudge events: "pirate blockade at X" (prices spike), "mining boom"
  (ore drops).
- **Sinks** (mandatory, from day one): fuel per jump, repairs after combat,
  module purchases, station docking fees, insurance.
- Player-to-player trading, contracts, and a market are **post-v1** and only
  once sinks are proven to hold inflation.

## Ambient events (the Pokétwo trick)

When a server is active (N messages in a channel within T minutes), the bot
may post an event: a derelict, a distress beacon, a pirate raid, a comet.
First to press the button claims it. Events are per-server and small; they
reward servers for keeping the bot around.

Needs: a way to observe message activity without the Message Content intent
(message-create events without content should be enough — verify).

## Progression

- XP from every job and fight. Levels unlock hulls, module tiers, and job
  variants (deep-core mining, long-range patrol).
- Skills (light): a small tree per role that biases yields. Keep it shallow in
  v1; the stat card is the real progression display.

## Stats layer (the retention hook)

Every ship tracks: credits earned/spent, tonnes mined, cargo hauled, jumps,
distance, systems discovered, kills (NPC / PvP), losses, salvage finds,
richest single sale, longest job. Exposed via:

- `/ship [@user]` — rendered ship card (PNG) with headline stats.
- `/log` — recent history.
- `/leaderboard <stat> [server|global]`.
- `/compare @a @b` — side-by-side.

## Monetization (if ever)

Cosmetics only: hull paint, card themes, ship name flair. Never stats,
never cargo, never credits. Vote rewards, if used, must be idempotent with a
`/claim` fallback.

## Flavor

The one thing every bot got praised for was personality. Own factions,
station names, and a consistent tone (dry, slightly absurd — the space
equivalent of Epic RPG's Raging Burrito). Write the flavor text early.
