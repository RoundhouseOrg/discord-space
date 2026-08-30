# discord-space

A Discord bot that simulates a small galaxy. Each player owns a ship, picks a
role (miner, trader, fighter, scout), and runs timed jobs — mining, patrolling,
salvaging, exploring, trading — that earn credits and experience. The bot keeps
deep stats per ship that players can compare with friends.

Inspiration: Wing Commander Privateer, Freelancer, EVE Online — but built for
the "do a thing, wait, come back" rhythm that Discord bots are actually good at.

## Status

v0.1 exists: the engine (jobs, combat, economy, galaxy), the first slash commands, and the notification sweep. Built by Zozo in one evening; see "Zozo built this in an evening" below.

This repo is the public demo for [Zozo](https://zozohq.com), a harness that
runs coding agents on the subscription you already pay for. The design docs
below are written by a human; the code that follows is built by Zozo working
through this repo's issues overnight. Every pull request opened by Zozo is
merged as the agent wrote it, with nothing edited after the fact, so the
history here is the verbatim trail of what happened. MIT licensed, so copy
whatever is useful.

## Zozo built this in an evening

On 2026-08-30 six issues were filed against the design docs and Zozo was
pointed at the repo at 22:37 UTC. By 23:33 UTC all six were closed by merged
PRs, plus one human-filed correction. Nothing here is staged: PRs are merged
exactly as the agent wrote them, and the one wrong call it made is corrected
in public, not edited away.

- Issues: [#1 scaffold](https://github.com/RoundhouseOrg/discord-space/issues/1), [#2 galaxy](https://github.com/RoundhouseOrg/discord-space/issues/2), [#3 jobs](https://github.com/RoundhouseOrg/discord-space/issues/3), [#4 combat simulation](https://github.com/RoundhouseOrg/discord-space/issues/4), [#5 market](https://github.com/RoundhouseOrg/discord-space/issues/5), [#6 notifications](https://github.com/RoundhouseOrg/discord-space/issues/6), and the correction [#13](https://github.com/RoundhouseOrg/discord-space/issues/13)
- PRs, in merge order: [#7](https://github.com/RoundhouseOrg/discord-space/pull/7), [#8](https://github.com/RoundhouseOrg/discord-space/pull/8), [#9](https://github.com/RoundhouseOrg/discord-space/pull/9), [#10](https://github.com/RoundhouseOrg/discord-space/pull/10), [#11](https://github.com/RoundhouseOrg/discord-space/pull/11), [#12](https://github.com/RoundhouseOrg/discord-space/pull/12), [#14](https://github.com/RoundhouseOrg/discord-space/pull/14): about 9,100 lines added in 56 minutes
- The interesting bits: [docs/13-combat-simulation.md](docs/13-combat-simulation.md) answers a design question the docs left open (no always-Fire collapse, but a real finding about the resolution order); issue #6's agent chose DM-only notifications and wrote its decision into [docs/07](docs/07-open-questions.md), and [#14](https://github.com/RoundhouseOrg/discord-space/pull/14) corrected it to the design owner's intent
- The journal of the first run's opening minutes, verbatim: [zozo-trail/journal-first-attempt.md](zozo-trail/journal-first-attempt.md)

Two things went sideways and stayed in: a dispatcher race briefly flagged
issue #2 for a human while its own run was still going (it recovered on its
own and the PR merged), and issue #6's agent decided instead of asking.
That is what running unattended agents is actually like.

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
