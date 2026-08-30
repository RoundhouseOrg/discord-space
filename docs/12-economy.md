# Economy & trading

## Goals
1. A single-server player can earn a living at their home station.
2. A player who travels earns more.
3. Prices are NPC-driven and stock-based, so arbitrage emerges from geography
   (sector signatures, 08), not hand-authored routes.
4. Bounded: one player cannot crash or corner a market.
5. Faucet/sink balance is measured from day one. Economy bots die of
   inflation before bugs.

## Currency
Credits (cr). Starter balance 500. No fractional credits.

## Commodities (v1: 10)

| Tier | Commodity | Base cr/t | Source | Demand |
|---|---|---|---|---|
| Raw | Ore | 10 | Belt zones | Refineries, industrial |
| Raw | Ice | 8 | Ice zones | Refineries (→ Water) |
| Raw | Gas | 12 | Gas zones | Refineries (→ Fuel) |
| Refined | Metal | 30 | Refinery stations | Industrial, shipyards |
| Refined | Fuel | 25 | Refinery stations | Everyone (jump cost) |
| Refined | Water | 15 | Refinery stations | Colonies |
| Manufactured | Components | 80 | Industrial stations | Shipyards, colonies |
| Manufactured | Electronics | 120 | Industrial stations | Shipyards, research |
| Special | Data cores | 200 | Exploration | Research, hub |
| Special | Salvage | 40 | Wreck fields | Industrial, hub |

Numbers are placeholders; tune in simulation.

## Sector signatures
From `hash(guild_id)` (08): each sector has
- **1 specialty produce** (cheap, high stock) — e.g. Ore
- **1–2 consumes** (premium, low stock) — e.g. Fuel, Components
- baseline production/consumption of basics at flat margins

Station types by signature: Mining outpost, Refinery, Industrial, Colony,
Research, Shipyard. The **hub** is all types at 10× stock: stable, boring,
safe. Small sectors are volatile and lucrative.

Guarantee: every sector's capital station buys Ore and sells Fuel, so a
one-server player always has a loop.

## Pricing model

Per station, per commodity: `stock`, `equilibrium`, `production`,
`consumption`, `last_updated`.

```
price      = base × (equilibrium / stock) ^ elasticity
             clamped to [0.4 × base, 2.5 × base]
buy_price  = price × 1.08          (player pays)
sell_price = price × 0.92          (player receives)   ← spread is a sink
elasticity = 0.6 (raw) · 0.8 (refined) · 1.0 (manufactured/special)
```

**Tick (lazy, on read):**
```
hours   = (now − last_updated) / 1h
stock  += (production − consumption) × hours
stock  += (equilibrium − stock) × (1 − 0.9^hours)     // relax 10%/h toward eq
stock   = clamp(stock, 0, 4 × equilibrium)
```
No cron needed for correctness. A background sweep may pre-tick hot stations.

**Player impact:** buying removes from stock (price rises), selling adds
(price falls). A 60t freighter dump moves price noticeably; five in a row
tank it. That is the whale bound. Hub stations at 10× stock barely move.

## Faucets and sinks

| Faucets (credits in) | Sinks (credits out) |
|---|---|
| Selling commodities to stations | Fuel per jump (30 cr base; scales with distance and hull) |
| NPC bounties (patrol, encounters) | Repairs after combat (% of hull cost) |
| Exploration finds, data cores | Station spread (8% each way) |
| Contract rewards (v1.1) | Modules & hulls (main big-ticket sink) |
| | Missile ammo |
| | Docking fee at non-home stations (small) |
| | Tow fee when disabled |

Mining produces *commodities*, not credits — they must be sold into a
station that wants them, so mining is subject to elasticity too.

**Metrics from day one:** total credits in circulation, daily faucet total,
daily sink total, ratio. Target ratio ≈ 1.1 (mild growth). Alert > 1.3.
Levers: spread %, fuel cost, repair %, clamp ceiling.

## Mining
Belt/ice/gas zones have `richness ∈ [0.2, 1.0]`.
```
yield     = base_yield × richness × mining_module × min(1, cargo_free / base_yield)
after run: richness −= 0.1 (floor 0.2); recovers +0.1 / 4h toward 1.0
```
Heavy use of one belt degrades it for everyone in that server → nudges
travel; "the belt's picked over" becomes a shared-server topic. Sector
signature scales base_yield (Ore-rich sector belt = 2× ore).

## Trade loop
1. `/market` at a station: prices, stock indicator (▰▰▱▱ low / ▰▰▰▰ glut),
   and **remembered prices** at stations you've visited, with staleness
   ("as of 3h ago"). Memory is per player: familiarity pays.
2. `/market buy <commodity> <qty>` — checks cargo (tonnes) and credits;
   single transaction with `FOR UPDATE` on ship + station rows.
3. `/jump` to where memory says it's high.
4. `/market sell <commodity> <qty>` — paid at *current* price, which may have
   moved. Profit ≈ (price_b − price_a) × qty − fuel.

Starter: 500 cr, Freighter 60t, Ore ~10 cr/t, fuel 30 cr/jump. A good early
route nets ~300–500 cr per round trip; a module costs 800–5,000.

## Contracts (v1.1)
NPC hauling missions generated from **real** price differentials between
reachable stations: "Deliver 20t Water to Tau Ceti — 800 cr, expires 6h."
Serves as the trading tutorial and always points at a route that exists.
Reward slightly above raw arbitrage; capped per player per day.

## Events
24-hour sector modifiers, announced in the capital channel:
- Blockade — imports scarce, prices up 50–100%
- Mining boom — raw stock floods, prices down
- Shortage — one consume commodity's consumption ×3
- Salvage field — temporary wreck zone appears
Charter sectors (11) get them ~1.5× as often. Frequency bounded.

## Module & hull shop
Fixed prices (no elasticity). Availability by station type and tier:
- Mining outposts: mining gear, cargo expanders
- Industrial / shipyard: weapons, shields, armor, hulls
- Research: sensors, ECM, drives
- Hub: everything, basic tiers only
Buying and selling back (at 50%) is a large sink.

## Player-to-player (v2 — gated on a month of sink data)
- **Escrow trades** in the same zone only: both confirm, atomic swap of
  cargo/modules/credits. Cancel any time before both confirm.
- **No direct credit gifting.** RMT and scams live there (see 02, Pokétwo).
- Later: station order books, player-posted contracts, a 5% tax as a sink.

## Anti-abuse
- Rate-limit market actions per ship (e.g. 10/min).
- Alt detection is out of scope; the whale bound and no-gifting rule limit
  what alts can do.
- All money moves go through one `ledger` table (from, to, amount, reason,
  ref). Nothing edits balances directly. This is also the faucet/sink
  dashboard's source.

## Engine contract
```
engine/economy/
  price(station, commodity, now) → { price, buy, sell, stock, eq }
  tick(stationState, now) → stationState
  trade(ship, station, commodity, qty, side, now) → { ship, station, ledgerEntry } | error
  mineYield(zone, ship, now) → { yield, zone }
```
Pure functions; simulate with synthetic players before shipping numbers.

## Open
- Elasticity and clamp values need a simulation with 50–500 bots hauling
  greedily. Does the hub become the only sane market?
- Should Fuel be a commodity you carry, or an abstract per-jump fee? Carrying
  it is more interesting (and a real sink); starting with the fee is simpler.
  Leaning: fee in v1, commodity in v1.1.
- Do sector signatures need to be player-visible up front, or discovered?
