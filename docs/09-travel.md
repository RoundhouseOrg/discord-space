# Travel

## Principle: the ship is game state, your attention is not

Your ship is always in exactly one place, in exactly one state:

- `docked` at a zone (sector / body / zone)
- `in_transit` — destination + departed_at + eta
- `on_job` — job id + ends_at

The ship's state changes **only when you issue a command**. Chatting in
another channel, being pinged into another server, hopping between servers
to read messages — none of it moves the ship. A player bouncing between two
servers is just reading Discord.

## Command scopes

| Scope | Commands | Where you can type it |
|---|---|---|
| Anywhere | `/ship`, `/map`, `/where`, `/log`, `/leaderboard`, `/status`, `/market` (view), `/fit` (view) | Any channel. These are the ship's comms. |
| Local | `/mine`, `/salvage`, `/explore`, `/patrol`, `/market buy` / `sell`, `/fit` (change), `/dock`, claiming an event | Only the channel your ship is in |
| Travel | `/jump <sector>`, `/goto` (= come to the channel I'm typing in), `/return` | Anywhere |

A local command from the wrong channel never errors — it offers the trip:

> Your ship is docked at Kessler Station (Vega). This is Tau Ceti belt.
> **[Jump here — ETA 14m]**

One button. After arrival, the local command works. This is the answer to
"I got pinged into my friend's server and want to do something there."

`/market` view from afar shows the **last prices you saw** at that station
with a staleness stamp ("as of 3h ago"). Familiarity + a reason to revisit.

## Do you need to stay?

No. Travel is fire-and-forget.

- The ship arrives at `eta` whether or not anyone is watching.
- Arrival is resolved lazily: any command from the player first checks
  `now >= eta` and applies the arrival in the same transaction. A background
  sweep may additionally edit the original jump message to "Arrived" as a
  courtesy, never as the source of truth.
- You must be a **member of the destination server** (the bot cannot act in
  a server you're not in), but you don't have to be looking at it.
  `/jump` autocompletes only reachable sectors.

## Times

Sessions are 2–5 min, several times a day. Travel must be shorter than a job
but not free, or geography is meaningless.

| Trip | Time | Rationale |
|---|---|---|
| Zone → zone, same sector (channel → channel) | 30 s – 2 min, by body distance | Near-instant; don't punish moving around your home server |
| Sector → sector, adjacent (server → server) | 10–20 min | Short enough for impulse, long enough that "where do I park" is a decision |
| Far sectors | up to ~2 h | distance = stable hash(guild_a, guild_b), so Vega → Tau Ceti is always the same |
| Anywhere → Hub | ≤ 10 min | Safety valve; nobody is ever stranded |

Placeholder formula (tune in prototype):

```
intra  = 30s + 20s × body_hops                      (cap 2 min)
inter  = 10 min + (hash01(a,b) × 110 min) × sec_mod (cap 2 h)
hub    = min(inter, 10 min)
all × drive_modifier (1.0 starter → 0.5 best drive)
```

Drives/engines are a progression axis that shrinks these.
No cancel in v1: jumps are short; not worth the state machine.

## Encounters mid-transit

Low-security jumps roll for an encounter **at departure**. If it hits:

- ship state becomes `in_transit` with `held_by = encounter_id`
- on the player's next command, the encounter is presented (button combat)
- after it resolves, the remaining travel time continues from where it
  paused (`eta += time_held`)

Nothing requires real-time attention.

## Presence vs. location

- **Presence** = who's been chatting in a zone recently (from non-privileged
  MESSAGE_CREATE metadata; see 03). Used for `/map` "seen here" and for
  *seeing* ambient events.
- **Location** = where the ship is. Only ships physically in a zone can
  *claim* an event there. Otherwise the button says "your ship is 14m out."

This gives ships a reason to be parked where the player hangs out:

- `/home` — set your home port (defaults to the first station you docked at)
- `/return` — one-tap trip home from anywhere

Expected pattern: park at home, hop to friends' sectors to trade or claim
things, return. That is the geography loop.

## Edge cases

| Situation | Handling |
|---|---|
| Player leaves the destination server mid-jump | Tow to hub on arrival time |
| Destination zone channel deleted mid-jump | Arrive at that sector's capital station |
| Commands racing (phone + desktop) | `SELECT … FOR UPDATE` on the ship row; second command sees new state |
| Bot restarts mid-transit | Nothing lost: ETA is a DB timestamp |
| Ship `on_job` and player asks to jump | Refuse: "mining run ends in 6m" with a [Remind me] button (optional) |
| Player has one server + hub | Everything still works; hub is always adjacent |

## Open
- Should arrival ever DM the player? Default no; opt-in `/notify jumps on`.
- Fuel: per-jump cost is an economy sink (see 04). Running out → can always
  reach hub for free (rescue tow, small fee later).
