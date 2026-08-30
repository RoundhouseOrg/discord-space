# Constraints

## Discord UI
- Text, embeds (max 10 per message, 6000 chars total), up to 5 action rows ×
  5 buttons (or 1 select menu per row), modals with up to 5 text inputs,
  attached images (we can render a ship card PNG).
- No real-time animation, no canvas. Everything is turn/state based.
- Design target: **one message per action, edited in place.**

## Interaction timing
- Slash commands must be acknowledged within **3 seconds**; defer, then you
  have 15 minutes to follow up.
- Button presses on old messages expire. Long encounters need a "resume" path
  (`/resume` re-renders the current encounter state from the DB).

## Rate limits
- ~50 requests/sec global per bot; ~5 messages / 5 sec per channel.
- Editing one message per turn is fine; a new message per turn is not.
- Timed jobs that complete should be delivered by editing the original job
  message or via a single "job complete" message, batched per channel.

## Hosting & scale
- We host it. 24/7 process + database. Downtime = bot down everywhere.
- **Sharding required at 2,500 guilds.** Keep all state in the DB from day one;
  never rely on in-process memory for game state.
- **Verification required at 100 guilds** (Discord identity check).
- Privileged intents: a slash-command bot needs almost none. Ambient events
  triggered by chat activity would need the **Message Content intent** — or
  we can trigger on message *events without content* (we only need "a message
  happened in channel X"), which does not require the privileged intent.
  Verify this early; it's the difference between an easy and a hard approval.

## ToS / legal
- No real-money trading of in-game items. No paid RNG loot boxes (gambling
  laws in some jurisdictions).
- Cosmetic/premium subscriptions are fine.
- Own IP only. No Freelancer/Privateer/EVE names, ships, factions, or art.

## Game-design constraints
- Balance across roles; anti-cheat (people will script clicks); cooldowns or
  energy so it isn't "who clicks most"; inflation control (economy bots die of
  inflation before bugs).
- Concurrency: trades, races, one user on two devices. DB transactions on
  every state change.

## Reliability rules (from research)
- Every reward path idempotent; `/claim` fallback for anything that can be
  missed.
- Job completion is computed from timestamps in the DB, never from an
  in-memory timer — a restart must not lose or duplicate a completed job.
