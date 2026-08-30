# Open questions

- ~~Message activity without Message Content intent~~ — **resolved, yes.**
  `GUILD_MESSAGES` (non-privileged) delivers MESSAGE_CREATE with author,
  channel, guild, timestamp; only content/embeds/attachments are blanked.
  See 03-constraints.
- **Job notification delivery** — DM the player, edit the original message,
  or only resolve on next command? DMs are reliable but noisy; editing needs
  the message to still exist. **Decided (issue #13): edit-first, DM as
  fallback.** The job's starting command reply is recorded (`jobs.message_
  channel_id`/`message_id`) when it's sent; the background sweep edits that
  message in place if it still exists and can be edited, and only DMs when
  it can't — never posting a new message to the channel. Resolution is
  untouched either way: the sweep still never resolves jobs or credits
  rewards, only notifies. See `src/discord/job-notifications.ts` and
  `src/db/job-notification-sweep.ts`. Revisit before shipping the Pilot's
  License "DM notifications" perk (11-monetization) so the paid tier isn't
  already free; an easy path is gating the DM fallback on subscription
  status without touching the edit path or the sweep itself.
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
