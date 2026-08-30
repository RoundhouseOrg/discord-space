# Combat simulation: does docs/10 collapse to "always-Fire"?

GitHub issue #4, answering docs/10-combat.md's own open question ("Does 3
bands × 5 actions collapse to 'always Fire' for the Interceptor? Simulate:
if Fire wins > 70% of decision points, add a cost to it") and docs/07's
"Combat depth... still needs a simulation to check it doesn't collapse to
'always Fire'."

**Short answer: no, not in the way the open question worried about — but
always-Fire is a strong opportunist, not a strictly dominant strategy.**
Pressing Fire every round loses badly to a positioning strategy playing the
*same* archetype (mirror matches), and does badly or catastrophically
against archetypes whose optimal range differs from where the fight starts.
Where always-Fire looks strong is specifically when it faces an opponent who
spends rounds moving toward *them* — see "The free-ride mechanic" below,
which is the most actionable finding here and is a resolution-order
property, not a Fire-specific one. This doc does not change docs/10; it
reports what the doc, implemented literally, produces.

## What was built

`src/engine/combat/` implements docs/10 exactly as written: the three range
bands, all five actions, contested movement, the escape formula, per-weapon
`p_hit`/damage resolution with shields-then-hull, shield regen, and the
5-step round order. It's pure and Discord-free (`src/engine/layering.test.ts`
enforces that), seeded with a local deterministic PRNG
(`src/engine/combat/rng.ts`), and unit-tested directly against the doc's
formulas and edge cases (`engine.test.ts`, `strategies.test.ts`,
`simulate.test.ts`).

- `engine.ts` — `createEncounter` / `applyRound`, the two functions named in
  docs/10's "Engine contract". (`render()` is Discord-bot UI wiring, out of
  scope for this issue.)
- `ships.ts` — docs/10's starter hulls, starter weapons, and NPC archetypes
  as `ShipTemplate`s.
- `strategies.ts` — the three "simple strategies" the issue asks for:
  `alwaysFire`, `bandControl`, `mixed`.
- `simulate.ts` — runs one encounter to a terminal outcome, and aggregates
  many trials into win-rate summaries.
- `report.ts` — the script that produced every number in this doc. Reproduce
  with `npx tsx src/engine/combat/report.ts` (deterministic: fixed seeds
  per matchup, same output every run).

### Placeholder numbers this simulation needed that docs/10 doesn't specify

Not a design change — just what running the doc's math requires that the
doc leaves as prose:

- **Accuracy.** docs/10 lists Accuracy as a ship stat ("from sensors/
  fittings; vs target evasion") but neither the starter-hull nor the NPC
  table gives per-ship values. Every ship in the simulation uses the same
  flat accuracy (8), so no archetype is quietly favoured by an invented
  accuracy spread.
- **NPC archetype stats.** The starter-hull table has real numbers; the NPC
  archetype table only has loadout + one line of flavour text ("Raider: 2x
  Autocannon, low shields... always closes"). `ships.ts` builds each
  archetype's hull/shield/agility/drive from that flavour text, documented
  inline per archetype. Swarm is excluded — docs/10 itself flags it "(v2)...
  Multi-target rules needed," which this 1-v-1 engine doesn't have.
- **ECM's accuracy penalty.** docs/10's escape formula explicitly includes
  `enemy_ecm`; the accuracy formula doesn't, even though the ship-stats table
  says ECM "reduces enemy accuracy." Implemented as subtracting the
  defender's ECM from the attacker's effective accuracy before the doc's
  `p_hit` formula.
- **Strategies vs. archetype flavour text.** The issue asks for three
  *generic* strategies "between the NPC archetypes," not a re-implementation
  of each archetype's individual scripted behaviour (Raider "always closes",
  Sniper "holds Long"...). So `bandControl`/`mixed` compute a loadout's own
  best-damage band generically (highest total weapon damage, ties broken
  LONG → MEDIUM → CLOSE) rather than hand-coding each archetype's flavour
  text. This is why the Interdictor's simulated behaviour ("prefers LONG",
  a tie with MEDIUM broken toward LONG) doesn't exactly match its docs/10
  description ("holds Medium") — a known, documented simplification, not a
  bug.

All trials below: 4000 per matchup, deterministic seeds (see `report.ts`),
`npm test` also runs `simulate.test.ts` which checks the harness itself
(determinism, outcome-count invariants, bounded win rates) on a small
scale — the full 4000-trial-per-matchup run is a data-generation script, not
part of CI.

## Finding 1: the free-ride mechanic (the real reason Fire can look dominant)

docs/10's round order is **movement, then escape, then fire** — in the
*same* round. That means when only one side moves (the common case: an
opponent who presses Fire never contests movement), the band changes
*before* fire resolves, so **both** sides shoot at the new, post-move band
that round. The mover pays the doc's 75% Close-in/Pull-back damage penalty
for making that happen; the stationary Fire side gets the benefit of the new
band for free, at 100% damage.

Concretely: Raider (2× Autocannon: 5 / 15 / 30 by band) starts at Long.
`Raider(alwaysFire) vs Raider(bandControl)` — the bandControl side spends
the early rounds closing to its preferred Close band. Because Fire never
resists that movement, the band reaches Close almost immediately, and from
then on **alwaysFire is also firing at Close for full damage**, without ever
having paid a movement penalty:

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Raider (alwaysFire) vs Raider (bandControl) | 43.0% | 10.0% | 47.1% | 0.0% | 3.40 |
| Raider (alwaysFire) vs Raider (mixed) | 53.8% | 9.0% | 35.6% | 1.6% | 3.41 |
| Brute (alwaysFire) vs Brute (bandControl) | 54.9% | 9.1% | 33.9% | 2.0% | 6.56 |
| Brute (alwaysFire) vs Brute (mixed) | 77.6% | 0.0% | 0.0% | 22.3% | 6.93 |

This is the closest this simulation gets to confirming the open question's
fear — but it isn't that Fire is intrinsically the best button; it's that
*standing still while the other side closes the gap for you* is good, and
Fire is simply the action that lets a ship stand still while still dealing
full damage. Any non-moving action would get the same free ride. **If this
dynamic is worth addressing, the lever is the round order (e.g. resolve fire
at the pre-move band, or apply the movement penalty to fire the round
*after* a move lands, not the round it happens), not a Fire-specific tax.**
The doc's own proposed fix (a Fire cost/heat mechanic) would blunt this too,
just less directly — see Recommendations.

## Finding 2: alwaysFire vs. alwaysFire is usually a stalemate, not a win

If Fire genuinely dominated, mirroring it against itself should produce
decisive, fast fights. It doesn't — two ships that only ever press Fire from
the docs/10 default Long start usually run out the 8-round clock instead of
resolving:

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Raider (alwaysFire) vs Raider (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (alwaysFire) vs Interdictor (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Brute (alwaysFire) vs Brute (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Sniper (alwaysFire) vs Sniper (alwaysFire) | 36.3% | 36.1% | 8.2% | 19.4% | 6.77 |
| Interceptor (alwaysFire) vs Interceptor (alwaysFire) | 15.4% | 15.2% | 2.9% | 66.5% | 7.97 |

Raider, Interdictor, and Brute all fire from Long the entire fight (their
best weapons are Medium/Close), so damage output stays low and shield regen
keeps pace — total stalemate, every single trial. Sniper and Interceptor
resolve much more often, because Long is already at or near their best band
(Sniper's railgun peaks at Long; Interceptor's autocannon+railgun combo is
close to flat across bands — see Finding 3). **Whether alwaysFire "works" is
mostly a function of whether Long happens to be a good band for that
loadout, not a property of the Fire action itself.**

## Finding 3: the Interceptor specifically (docs/10's literal question)

docs/10's own open question names the Interceptor. Same mirror-matchup
design as Finding 1/2, isolated to that hull:

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Interceptor (alwaysFire) vs Interceptor (alwaysFire) | 15.4% | 15.2% | 2.9% | 66.5% | 7.97 |
| Interceptor (alwaysFire) vs Interceptor (bandControl) | 38.6% | 10.1% | 4.4% | 46.9% | 7.78 |
| Interceptor (alwaysFire) vs Interceptor (mixed) | 22.8% | 0.4% | 0.0% | 76.8% | 7.89 |
| Interceptor (bandControl) vs Interceptor (bandControl) | 20.7% | 20.2% | 5.8% | 53.3% | 7.81 |
| Interceptor (bandControl) vs Interceptor (mixed) | 15.9% | 1.3% | 0.0% | 82.7% | 7.94 |
| Interceptor (mixed) vs Interceptor (mixed) | 3.0% | 2.6% | 0.0% | 94.4% | 7.98 |

Same story as the archetypes: **alwaysFire beats a repositioning opponent
of the same hull** (38.6% vs 10.1% against bandControl; 22.8% vs 0.4%
against mixed) via the free-ride mechanic, but alwaysFire-vs-alwaysFire is
mostly a 66.5%-of-the-time disengage, not a decisive always-win. The
Interceptor's weapon totals across bands (Autocannon+Railgun: 30 / 27 / 34)
are the flattest of any loadout in the doc, which is exactly why it's the
least band-sensitive hull and the closest to "position barely matters" —
that's probably *why* docs/10 worried about it specifically, and the
simulation confirms the instinct was reasonable, just not as severe as
"always wins."

## Finding 4: does the Sniper ever kill anything? (docs/10's other open question)

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Sniper (alwaysFire) vs Raider (mixed) | 0.0% | 99.3% | 0.0% | 0.7% | 4.62 |
| Sniper (bandControl) vs Raider (mixed) | 2.3% | 8.3% | 0.0% | 89.5% | 7.89 |
| Sniper (mixed) vs Raider (mixed) | 0.5% | 46.9% | 0.0% | 52.6% | 7.14 |
| Sniper (alwaysFire) vs Interdictor (mixed) | 1.7% | 0.0% | 0.0% | 98.3% | 7.99 |
| Sniper (bandControl) vs Interdictor (mixed) | 0.8% | 0.0% | 0.0% | 99.2% | 8.00 |
| Sniper (mixed) vs Interdictor (mixed) | 0.4% | 0.0% | 0.0% | 99.6% | 8.00 |
| Sniper (alwaysFire) vs Brute (mixed) | 0.0% | 97.7% | 0.0% | 2.3% | 4.63 |
| Sniper (bandControl) vs Brute (mixed) | 0.0% | 6.9% | 0.0% | 93.2% | 7.87 |
| Sniper (mixed) vs Brute (mixed) | 0.0% | 38.5% | 0.0% | 61.5% | 7.26 |

Yes, but rarely, and almost never against a brawler (Raider, Brute) — the
Sniper's railgun does 4 damage at Close, so once a mixed-strategy opponent
closes the distance the fight is essentially over for it. **alwaysFire is
actively dangerous for the Sniper** specifically (97-99% loss rate vs.
Raider/Brute) because it never disengages from an approaching brawler.
Positioning strategies (bandControl/mixed) mostly convert those losses into
long, drawn-out escapes/disengages instead of deaths (Sniper's high agility
wins the contested pull-back almost every time), which matches shield-regen
math: the Sniper *can* out-kite a slower ship, it just rarely finishes it
off inside the 8-round cap. Against the Interdictor, nobody dies almost
ever, in either direction (see Finding 5).

## Finding 5: Interdictor fights routinely never resolve

Across every matchup involving the Interdictor (mirror or cross-archetype,
any strategy), the dominant outcome is escape/disengage, frequently at
100%. The likely cause: Missiles are ammo-limited to 4 volleys, and once
ammo runs out at ~round 4 the Interdictor (and anything it's mirrored
against) simply can't deal more damage — shield regen absorbs the rest, and
the fight coasts to the round-8 cap. This is sensitive to this doc's
placeholder Interdictor stats (see "Placeholder numbers" above) — it's a
real property of *this simulation's* numbers, not necessarily of whatever
final stats the Interdictor ships with, but it's a strong enough and
consistent enough signal to flag: **an ammo-limited weapon with no
secondary damage source risks becoming a "the fight just times out"
archetype**, independent of which strategy either side uses.

## Full data

<details>
<summary>Archetype balance (cross-matchups, both sides using "mixed")</summary>

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Raider (mixed) vs Sniper (mixed) | 46.6% | 1.0% | 0.0% | 52.4% | 7.16 |
| Raider (mixed) vs Interdictor (mixed) | 54.3% | 0.0% | 0.0% | 45.8% | 6.99 |
| Raider (mixed) vs Brute (mixed) | 0.5% | 93.4% | 0.0% | 6.2% | 3.91 |
| Sniper (mixed) vs Interdictor (mixed) | 0.2% | 0.0% | 0.0% | 99.8% | 8.00 |
| Sniper (mixed) vs Brute (mixed) | 0.0% | 40.9% | 0.0% | 59.1% | 7.20 |
| Interdictor (mixed) vs Brute (mixed) | 0.0% | 15.4% | 0.0% | 84.6% | 7.77 |

Brute (tanky, Close-preferring) beats everything it catches; Raider beats
Sniper and Interdictor by closing distance fast off a low agility/low
shield glass-cannon profile; nothing beats the Brute except... nothing,
in this data — its 220 hull and slow-closer profile mean it rarely dies
before the round cap even when it loses the exchange. That's a genuine
signal that Brute (marked "v1.1" in docs/10, not yet in the starter
rotation) may need either a faster time-to-kill against it or an
intentionally-low win-condition role (e.g. a "avoid, don't fight" NPC),
worth a second look whenever it's actually scheduled for implementation.

</details>

<details>
<summary>Strategy dominance — full mirror-matchup table (all four NPC archetypes × all six strategy pairings)</summary>

| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |
|---|---|---|---|---|---|
| Raider (alwaysFire) vs Raider (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Raider (alwaysFire) vs Raider (bandControl) | 43.0% | 10.0% | 47.1% | 0.0% | 3.40 |
| Raider (alwaysFire) vs Raider (mixed) | 53.8% | 9.0% | 35.6% | 1.6% | 3.41 |
| Raider (bandControl) vs Raider (bandControl) | 18.6% | 19.5% | 62.0% | 0.0% | 3.16 |
| Raider (bandControl) vs Raider (mixed) | 26.6% | 17.5% | 54.9% | 1.0% | 3.15 |
| Raider (mixed) vs Raider (mixed) | 21.7% | 22.2% | 51.9% | 4.2% | 3.26 |
| Sniper (alwaysFire) vs Sniper (alwaysFire) | 36.3% | 36.1% | 8.2% | 19.4% | 6.77 |
| Sniper (alwaysFire) vs Sniper (bandControl) | 36.1% | 29.5% | 6.2% | 28.1% | 7.01 |
| Sniper (alwaysFire) vs Sniper (mixed) | 19.2% | 11.6% | 0.2% | 69.0% | 7.41 |
| Sniper (bandControl) vs Sniper (bandControl) | 29.3% | 27.7% | 4.8% | 38.1% | 7.23 |
| Sniper (bandControl) vs Sniper (mixed) | 14.5% | 9.8% | 0.2% | 75.6% | 7.58 |
| Sniper (mixed) vs Sniper (mixed) | 4.9% | 5.3% | 0.0% | 89.8% | 7.74 |
| Interdictor (alwaysFire) vs Interdictor (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (alwaysFire) vs Interdictor (bandControl) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (alwaysFire) vs Interdictor (mixed) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (bandControl) vs Interdictor (bandControl) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (bandControl) vs Interdictor (mixed) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Interdictor (mixed) vs Interdictor (mixed) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Brute (alwaysFire) vs Brute (alwaysFire) | 0.0% | 0.0% | 0.0% | 100.0% | 8.00 |
| Brute (alwaysFire) vs Brute (bandControl) | 54.9% | 9.1% | 33.9% | 2.0% | 6.56 |
| Brute (alwaysFire) vs Brute (mixed) | 77.6% | 0.0% | 0.0% | 22.3% | 6.93 |
| Brute (bandControl) vs Brute (bandControl) | 24.6% | 25.3% | 48.9% | 1.3% | 6.43 |
| Brute (bandControl) vs Brute (mixed) | 87.4% | 0.1% | 0.1% | 12.4% | 6.84 |
| Brute (mixed) vs Brute (mixed) | 2.3% | 2.1% | 0.0% | 95.6% | 7.99 |

</details>

## Recommendations (reporting only — none of this is applied to docs/10)

- The free-ride mechanic (Finding 1) is the one concrete, mechanical lever
  worth a design decision: either it's fine (repositioning is inherently a
  "set up next round" investment, and the game is fine rewarding patience),
  or it should be closed by changing *when* a moved-to band takes effect for
  fire purposes. This is a resolution-order question, not a "nerf Fire"
  question — a Fire-cost/heat mechanic (docs/10's own suggestion) would
  help but doesn't address the root cause.
- Interdictor-involved fights essentially never resolving (Finding 5) is
  worth a look whenever the Interdictor is implemented for real, independent
  of the always-Fire question — an NPC that reliably ends every encounter in
  a disengage isn't much of an encounter.
- The Sniper "does it ever kill anything" question (Finding 4, docs/10's
  other open item) reads as: it's a strong *survivor* (kites brawlers
  indefinitely with the right strategy) but a weak *closer* — which may be
  fine for a support/skirmisher role, but is worth confirming that's the
  intended niche before the Sniper becomes an early NPC target players are
  meant to be able to farm.
- No change is recommended to Evade (docs/10's third open question,
  "should Evade also grant a small shield boost") based on this data — Evade
  wasn't a strong lever in any strategy tested here (`mixed` only reaches
  for it below 20% shields), so there isn't yet simulation evidence either
  way. A dedicated Evade-value pass would need a strategy that uses it more
  deliberately than `mixed` does.
