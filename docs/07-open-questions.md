# Open questions

- ~~Message activity without Message Content intent~~ — **resolved, yes.**
  `GUILD_MESSAGES` (non-privileged) delivers MESSAGE_CREATE with author,
  channel, guild, timestamp; only content/embeds/attachments are blanked.
  See 03-constraints.
- **Job notification delivery** — DM the player, edit the original message,
  or only resolve on next command? DMs are reliable but noisy; editing needs
  the message to still exist.
- ~~**Combat depth** — designed in 10-combat (3 bands × 5 actions). Still
  needs a simulation to check it doesn't collapse to "always Fire".~~ —
  **simulated, see 13-combat-simulation.** Short answer: no, not outright —
  always-Fire beats a repositioning opponent via a resolution-order "free
  ride" (movement resolves before fire, same round), but loses to mirrored
  positioning play and does badly whenever its archetype's best band isn't
  the Long starting band. Design unchanged; findings only.
- **Galaxy authoring** — resolved: derived from Discord structure (08).
  Remaining: how strongly sector resource signatures should differ.
- **Per-server vs. global** — ship is global (follows the account). Are
  events, leaderboards, and markets per-server, global, or both?
- **Name** — working title "discord-space". Needs a real name and a faction
  set before writing flavor text.
- **Death / loss** — cargo loss only in v1. Do we ever want ship loss +
  insurance (EVE-style)? Big retention risk; probably opt-in hardcore later.
