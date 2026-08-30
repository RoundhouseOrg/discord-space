# Vision

## One-liner

A persistent space-trading RPG that lives inside Discord. Your ship follows
your Discord account across every server; the game is played in short bursts
between conversations.

## The pitch

- **Launch** a starter ship and choose a role.
- **Run jobs** — mine, patrol, salvage, explore, haul cargo. Jobs take real
  time (minutes to hours). Start one, go do something else, come back.
- **Trade** at NPC stations whose prices drift with supply and demand.
- **Fight** pirates (NPC) or other players in short, button-driven encounters.
- **Level up** to unlock hulls, modules, and skills. Spend credits on fittings.
- **Compare** — every ship has a stat card: kills, credits moved, systems
  discovered, tonnes mined, distance traveled. Look at your friends' and argue
  about it.

## Why space rather than fantasy

The original idea was a Final Fantasy-style job/class RPG. Space wins for
these reasons (see `02-market-research.md` for the evidence):

1. **Cooldowns are diegetic.** The core Discord-bot mechanic is a timed
   action. "Hunt once a minute" is arbitrary; "a mining run takes 20 minutes"
   or "the jump to Sirius takes 6 hours" is the fiction itself. IdleRPG's
   most-praised trait — "doesn't require much of your time, you never get
   behind" — is the EVE skill-queue model.
2. **Multiple coherent verbs.** Epic RPG's depth comes from many small
   systems (fish/chop/forage/hunt). Mine/patrol/salvage/explore/trade is the
   same structure but coherent, and each verb maps to a player identity.
3. **The economy generates content for free.** Fantasy needs hand-authored
   dungeons forever (the "no ongoing narrative" critique). A commodity market
   generates its own stories: "ore is 3x at Sirius, who's hauling?"
4. **Ambient events fit.** Pokétwo's best feature is chat-triggered spawns. A
   derelict or distress beacon appearing because the server is active is the
   same loop, with no IP issue.
5. **Ship-as-character suits a stats-heavy game.** Everything is countable.
6. **No IP risk.** Own factions, own ship names. Nothing to DMCA.

## What it is not

- Not a real-time game. No animation, no canvas. One embed that edits itself.
- Not a player-run economy on day one. NPC stations first.
- Not pay-to-win. Money buys cosmetics and convenience, never stats.

## Design principles (derived from the research)

1. The first five minutes must be flawless: `/launch` → one job → credits go
   up. Two of IdleRPG's eight reviews were people who never got past
   character creation.
2. The solo loop must be complete in a 3-person server. Multiplayer is a
   layer on top, not a requirement.
3. Anything that promises a reward (vote, daily, job completion) must be
   idempotent and have a `/claim` fallback. Missed rewards are the #1
   complaint on every bot studied.
4. One message per action, edited in place. Don't flood the channel.
5. Slash commands with autocomplete. No prefix commands, no wall-of-text help.
