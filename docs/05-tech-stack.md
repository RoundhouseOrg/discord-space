# Tech stack (proposed)

- **Language:** TypeScript on Node. Stats-heavy game logic benefits from
  types; discord.js is the most mature library for slash commands, buttons,
  and modals.
- **Discord lib:** discord.js.
- **Database:** Postgres (SQLite acceptable for local dev). All game state
  lives here. Nothing important in process memory.
- **Hosting:** a small VPS (Hetzner/Fly/Railway). Single process until
  sharding is required at 2,500 guilds.
- **Image rendering:** ship cards as PNG (e.g. `@napi-rs/canvas` or
  `sharp` + SVG templates).

## Architecture

```
src/
  engine/      pure game logic; zero Discord imports; fully unit-tested
    jobs/      job definitions + resolution
    combat/    encounter state machine
    economy/   pricing, drift, sinks
    galaxy/    systems, jump graph, travel time
    progression/
  db/          schema, migrations, repositories, transactions
  discord/     slash commands, button handlers, embed renderers
  render/      ship card images
  events/      ambient event scheduler
```

Rule: `engine/` never imports from `discord/`. The Discord layer renders
engine state and forwards inputs. This makes the game testable and keeps the
door open for a web dashboard later (a reviewer literally asked Epic RPG for
one).

## Key mechanisms

- **Jobs:** `jobs` table with `started_at`, `ends_at`, `resolved_at`. Any
  command from the player checks for unresolved, finished jobs and resolves
  them inside a transaction. No timers needed for correctness; a background
  sweep can push "job complete" notifications as a convenience.
- **Encounters:** `encounters` table holding full state as JSON + version.
  Button custom_id carries `encounterId:action`; handler loads, validates
  version, applies, saves, re-renders. Stale buttons are rejected with a
  "press /resume" hint.
- **Idempotent rewards:** every reward has a unique key (`vote:<user>:<ts>`,
  `job:<id>`); insert-or-ignore before credit.
