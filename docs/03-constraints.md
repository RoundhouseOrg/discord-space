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
- **Bot verification required at 100 guilds** (Discord identity check).
  Unchanged as of 2026.
- **Privileged intents** (MESSAGE_CONTENT, GUILD_MEMBERS, GUILD_PRESENCES):
  self-enable in the Developer Portal below **10,000 users**; above that,
  Discord requires a review (policy changed June 2026 from the old 100-server
  rule; you get 90 days to apply and are not blocked from joining servers
  while under review).
- **Chat-activity detection does NOT need MESSAGE_CONTENT — verified
  2026-08-29 against docs.discord.com.** The non-privileged `GUILD_MESSAGES`
  intent delivers `MESSAGE_CREATE` / `MESSAGE_UPDATE` / `MESSAGE_DELETE`
  events. Without MESSAGE_CONTENT, only user-inputted fields are blanked:
  `content`, `embeds`, `attachments`, `components`, poll data. We still get
  `id`, `channel_id`, `guild_id`, `author`, `timestamp` — exactly what
  ambient events and presence need. (Exceptions where content is still
  visible: the bot's own messages, DMs with the bot, messages that mention
  the bot, context-menu targets.)
  Consequence: the bot needs zero privileged intents. Never request
  MESSAGE_CONTENT; it would only add review burden.

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
