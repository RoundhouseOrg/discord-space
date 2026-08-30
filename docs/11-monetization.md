# Monetization

Goal: at minimum, cover hosting. Never at the expense of the one rule below.

> **The rule:** a free player with the same playtime can always match a
> paying player's ship. Money buys cosmetics and convenience for the *place*
> and the *presentation*, never power.

Evidence: the most damaging Pokétwo review came from a 4-year player —
"players who pay have unmatchable advantage… ruined the fun for me." See 02.

## Costs to cover

| Scale | Monthly | Setup |
|---|---|---|
| < 500 servers | $10–30 | One small VPS (Hetzner / Fly / Railway) + Postgres |
| 500–2,500 servers | $30–80 | Bigger box, managed Postgres, backups, uptime monitor |
| 2,500+ (sharding) | $100+ | Multiple processes, Redis, monitoring |

One-offs: domain, ship-card art commissions.

## Channels

### 1. Discord Premium Apps — primary
Native: user subscriptions, guild subscriptions, one-time purchases (durable
or consumable). Discord handles checkout, tax, refunds; we read entitlements
via the API and never touch payment data. Users buy from the bot's profile
without leaving Discord.

- Fee: **15% up to $1M lifetime team revenue, 30% after.**
- Requirements: verified app, a Discord Team, payout details. Confirm
  current eligibility on the "Enabling Monetization" docs page before
  launch.
- Entitlements are checked in the engine via a `premium` view of the
  player/guild; the engine never reads billing state directly.

### 2. Guild subscriptions — the best fit for this game
Server owners already pay for bots, and their server *is* a sector. Sell the
server a nicer place, not the player more power. Aligns with the familiarity
thesis (08).

### 3. Patreon / Ko-fi — optional, secondary
Lower fees (~8–12%) but off-platform friction and hand-rolled role sync. Only
for people who specifically want to tip.

### 4. Vote rewards (top.gg) — growth, not money
The #1 one-star cause on every bot studied. If used at all: idempotent,
`/claim` fallback, cosmetic rewards only (never credits).

## Products

### Sector Charter — guild subscription, ~$4.99/mo
- Custom sector name + lore blurb
- Rename bodies and zones
- Station emblem shown on `/map` and on cards of ships docked there
- Higher zone cap for large servers
- More frequent ambient events (bounded — still no direct power)
- Sector leaderboard and a pinned auto-updating `/map`
- Sector history log ("first discovered by…")

### Pilot's License — user subscription, ~$2.99/mo
- Ship card themes, hull paint, callsign color/flair
- Extended `/log` history, stat export
- DM notifications for job / jump / encounter completion
- Additional cosmetic ship-name / motto slot

### One-time durables, $1–3
Individual paints, emblems, card frames. Seasonal sets are visible purchases,
not loot boxes.

### Explicitly not for sale
Credits, ore, modules, XP, faster jobs, extra job slots, drop-rate changes,
loot boxes, anything tradeable between players for money. Premium cosmetics
are account-bound.

## The math

Net after Discord's 15%: $2.54 (license) / $4.24 (charter).

| Hosting | Break-even |
|---|---|
| $25/mo | ~6 charters or ~10 licenses |
| $60/mo | ~14 charters or ~24 licenses |

At 1–2% conversion, ~300–600 active servers covers small-scale hosting.
Realistic ceiling for a small bot in this genre: tens to low hundreds per
month. The giants (Dank Memer, Epic RPG) make salaries at hundreds of
thousands of servers via Patreon + Premium.

## Implementation notes
- `entitlements` table mirrored from Discord webhooks + periodic reconcile;
  engine reads `isPremiumUser(id)` / `isPremiumGuild(id)` only.
- Grace period on lapse (7 days) before cosmetics revert; nothing is
  destroyed, just hidden.
- Free trial: none in v1 (avoid abuse). Consider 7-day guild trial later.

## Open
- Confirm current Premium Apps eligibility requirements at launch time.
- Is "more frequent events" for charter sectors too close to power? Bound it
  (e.g. 1.5×) and watch.
- Regional pricing.
