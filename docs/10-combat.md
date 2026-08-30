# Combat

Turn-based, one self-editing embed, five buttons. Fights are 3–6 rounds
typical, hard cap 8. Both sides pick an action; the round resolves
simultaneously.

- vs NPC: the round resolves the instant the player presses a button.
- vs player: resolves when both have picked, or after 60 s (absent side
  auto-Evades).

## UI

```
⚔️ Encounter — Round 3 · Range: MEDIUM
You    ▰▰▰▰▰▱▱▱ SH 38/60   ▰▰▰▰▰▰▰▰ HULL 100/100
Raider ▱▱▱▱▱▱▱▱ SH 0/40    ▰▰▰▰▰▱▱▱ HULL 55/90
──────────────────────────────────────
› You fired: autocannon hit (18), railgun missed
› Raider closed in and hit you (22)
[Fire] [Evade] [Close in] [Pull back] [Jump out]
```

One message per encounter, edited every round. Button `custom_id` =
`enc:<encounter_id>:<action>`. Second row (later): abilities/consumables —
Repair nanites, Overload, Decoy.

## Ship stats

| Stat | Role in combat |
|---|---|
| Hull | HP. No regen in combat. 0 = disabled (not destroyed). |
| Shields | Absorb first. Regen `shield_regen` per round. |
| Agility | Evasion; wins contested range changes. |
| Drive | Escape chance. |
| Accuracy | From sensors/fittings; vs target evasion. |
| Weapons | Each has damage per band `[long, medium, close]`. |
| ECM (fitting) | Reduces enemy accuracy and escape chance. |

### Starter hulls (placeholder numbers)

| Hull | Hull | Shield (regen) | Agility | Drive | Weapons | Notes |
|---|---|---|---|---|---|---|
| Interceptor (Fighter) | 100 | 60 (10) | 6 | 5 | Autocannon + Railgun | Wins straight fights |
| Courier (Scout) | 70 | 40 (8) | 9 | 8 | Autocannon | Controls range, escapes at will |
| Freighter (Trader) | 160 | 40 (5) | 3 | 4 (+escape module) | Autocannon | Survives, doesn't win |
| Prospector (Miner) | 110 | 40 (6) | 4 | 5 | Mining laser (weak, close only) | Avoid low-sec |

### Starter weapons

| Weapon | Long | Medium | Close | Notes |
|---|---|---|---|---|
| Railgun | 25 | 12 | 4 | Sniper's tool |
| Autocannon | 5 | 15 | 30 | Brawler's tool |
| Missiles | 20 | 20 | 0 | Ammo-limited (4 volleys) |
| Mining laser | 0 | 0 | 12 | Not a weapon, technically |

Range is the entire tactical question: be where your weapons are strong and
theirs are weak.

## Range bands

`LONG` → `MEDIUM` → `CLOSE`. Normal encounters start at Long. Ambushes
(low-sec, Interdictor archetype) start at Medium.

## Actions

| Action | Effect |
|---|---|
| **Fire** | All weapons at current band, full accuracy. |
| **Evade** | +3 evasion this round; fire at 50% damage. |
| **Close in** | Move one band closer; fire at 75%. Contested (see below). |
| **Pull back** | Move one band farther; fire at 75%. Contested. |
| **Jump out** | Escape attempt. Fail = take fire without firing. |

### Contested movement
- Both close / both pull back → move two bands (clamped).
- One closes, one pulls back → higher agility wins (ties: random). Loser
  still fires at 75%.
- One moves, other doesn't → move succeeds.

### Escape
```
p_escape = clamp(drive/10 × band_mod − enemy_ecm × 0.1, 0.05, 0.95)
band_mod: LONG 0.9 · MEDIUM 0.5 · CLOSE 0.2
```
Escape modules add flat bonus; decoy = one-shot +0.4.

## Round resolution order

1. **Movement** (contested by agility).
2. **Escape checks.** Escaped ship is removed; other side's fire is wasted.
3. **Fire**, simultaneous. Per weapon:
   `p_hit = clamp(0.75 + 0.05 × (att_accuracy − def_evasion), 0.20, 0.95)`
   `dmg = weapon[band] × action_mod × uniform(0.8, 1.2)`
   Shields absorb first; overflow → hull.
4. **Shield regen** for both.
5. **End check**: hull ≤ 0 → disabled; escaped; round 8 → both disengage.

Simultaneous resolution means both sides can be disabled in the same round;
treat as mutual disengage with both taking loss penalties (rare, fine).

## NPC archetypes

Scripted priorities with ~15% random deviation so fights aren't fully
predictable.

| Archetype | Loadout | Behaviour |
|---|---|---|
| Raider | 2× Autocannon, low shields | Always closes; fires at Close; never retreats. |
| Sniper | Railgun, high agility | Holds Long; pulls back if closed on; fires otherwise. |
| Interdictor | Missiles + ECM | Starts at Medium; holds band; ECM cuts your escape. |
| Brute (v1.1) | Big hull, autocannons | Slow closer; tanks. |
| Swarm (v2) | 2–3 weak Raiders | Multi-target rules needed. |

Mix and level scale with sector security and the player's level (never more
than +2 tiers above the player).

## Outcomes

| Result | Effect |
|---|---|
| Win (enemy disabled) | Bounty credits, XP, salvage roll (modules, scrap, data cores). |
| Escape | Keep everything, no reward, whatever damage you took. |
| Disengage (round 8) | As escape. |
| Disabled | Lose 30–50% cargo (pirates loot), hull set to 10%, towed to nearest station, repair bill. No permadeath in v1. |

Repairs and ammo are economy sinks (see 04).

## PvP

- v1: **consensual duels**. `/duel @user` → accept button → shared encounter
  message in the current channel; both must be in the same zone.
- Button handler checks `user_id ∈ {a, b}` and records that player's choice;
  round resolves when both have chosen or after 60 s.
- Three consecutive timeouts → forfeit (counts as escape for the other).
- Duel outcomes: XP and a duel record on the ship card; no cargo loss, no
  credit transfer (avoids scams and RMT — see 02 for why).
- v2: piracy in low-sec via an **interdiction** mechanic (attacker must be in
  the zone, have an interdictor module, and the target is warned). Cargo
  loss applies. Needs bounties/consequences designed first.

## Persistence & timing

- `encounters` table: id, kind (npc/duel), participants, full state JSON,
  version, created_at, updated_at, resolved_at.
- Every button press: load → check version matches the one embedded in the
  message → apply → save (version+1) → re-render. Stale press → "press
  /resume".
- An open encounter **holds the ship** (`held_by`): no travel, no jobs.
- No time pressure vs NPC; a fight can sit for hours. After 24 h it
  auto-resolves as an escape with no reward, so nobody is stuck forever.

## Engine contract

`engine/combat/` exposes pure functions:

```
createEncounter(shipA, shipB | npcTemplate, opts) → EncounterState
applyRound(state, actionA, actionB, rng) → { state, log[] }
render(state, viewerId) → EmbedSpec + buttons
```

No Discord imports. Fully unit-testable with a seeded RNG; the balance
questions in 07 get answered by simulating thousands of fights per matchup.

## Open
- Does 3 bands × 5 actions collapse to "always Fire" for the Interceptor?
  Simulate: if Fire wins > 70% of decision points, add a cost to it
  (heat/overload).
- Shield regen vs alpha damage: does the Sniper ever kill anything?
- Should Evade also grant a small shield boost, to make it a real choice?
