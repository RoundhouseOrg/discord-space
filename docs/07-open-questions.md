# Open questions

- **Message activity without Message Content intent** — can we trigger
  ambient events from message-create events with empty content? Need to
  verify against current Discord intent docs before designing around it.
- **Job notification delivery** — DM the player, edit the original message,
  or only resolve on next command? DMs are reliable but noisy; editing needs
  the message to still exist.
- **Combat depth** — is 3 range bands × 4 actions enough to feel tactical, or
  does it collapse to "always Fire"? Needs a prototype with real numbers.
- **Galaxy authoring** — resolved: derived from Discord structure (08).
  Remaining: how strongly sector resource signatures should differ.
- **Per-server vs. global** — ship is global (follows the account). Are
  events, leaderboards, and markets per-server, global, or both?
- **Name** — working title "discord-space". Needs a real name and a faction
  set before writing flavor text.
- **Death / loss** — cargo loss only in v1. Do we ever want ship loss +
  insurance (EVE-style)? Big retention risk; probably opt-in hardcore later.
