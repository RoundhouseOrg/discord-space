# discord-space

A Discord bot that simulates a small galaxy. Each player owns a ship, picks a
role (miner, trader, fighter, scout), and runs timed jobs — mining, patrolling,
salvaging, exploring, trading — that earn credits and experience. The bot keeps
deep stats per ship that players can compare with friends.

Inspiration: Wing Commander Privateer, Freelancer, EVE Online — but built for
the "do a thing, wait, come back" rhythm that Discord bots are actually good at.

## Status

Project scaffolding is in place; no game logic yet.

This repo is the public demo for [Zozo](https://zozohq.com), a harness that
runs coding agents on the subscription you already pay for. The design docs
below are written by a human; the code that follows is built by Zozo working
through this repo's issues overnight. Every pull request opened by Zozo is
merged as the agent wrote it, with nothing edited after the fact, so the
history here is the verbatim trail of what happened. MIT licensed, so copy
whatever is useful.

## Development

Requires Node 22+.

```sh
npm install
cp .env.example .env   # then fill in DISCORD_TOKEN
npm run lint
npm test
npm run build
npm run dev             # runs src/index.ts with tsx
```

See [docs/05-tech-stack.md](docs/05-tech-stack.md) for the architecture:
`src/engine` holds pure game logic and must never import from `src/discord`
(enforced by lint and by `src/engine/layering.test.ts`); `src/db` holds
SQLite-backed repositories that a Postgres implementation can later replace.

## Docs

| Doc | What it covers |
|---|---|
| [docs/01-vision.md](docs/01-vision.md) | What the game is, the pitch, why space instead of fantasy |
| [docs/02-market-research.md](docs/02-market-research.md) | Reviews of Epic RPG, Pokétwo, IdleRPG — what works, what doesn't |
| [docs/03-constraints.md](docs/03-constraints.md) | Discord platform limits, ToS, hosting, scaling |
| [docs/04-game-design.md](docs/04-game-design.md) | Core loop, ships, jobs, combat, economy, events, stats |
| [docs/05-tech-stack.md](docs/05-tech-stack.md) | Proposed stack and architecture |
| [docs/06-roadmap.md](docs/06-roadmap.md) | v1 scope and what comes after |
| [docs/07-open-questions.md](docs/07-open-questions.md) | Things not decided yet |
| [docs/08-geography.md](docs/08-geography.md) | Servers as sectors, channels as zones — deterministic static map |
| [docs/09-travel.md](docs/09-travel.md) | Ship state, command scopes, travel times, presence vs. location |
| [docs/10-combat.md](docs/10-combat.md) | Range bands, five actions, resolution order, NPC archetypes, PvP |
| [docs/11-monetization.md](docs/11-monetization.md) | Cover hosting via Discord Premium Apps; cosmetics and sector charters, never power |
| [docs/12-economy.md](docs/12-economy.md) | Commodities, stock-based pricing, faucets/sinks, mining, trade loop, contracts |
