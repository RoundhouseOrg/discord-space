# Demo trail log

Timestamped as it happened; raw material for the launch posts. Times are local (founder's machine).

- 2026-08-30 17:29 Pre-night-one setup, driven by the agent on the founder's behalf. MIT LICENSE and the "public demo" README status note pushed to discord-space (bac3e52).
- 2026-08-30 17:29 Six seeded issues filed on RoundhouseOrg/discord-space (#1 scaffold, #2 galaxy, #3 jobs + /launch /mine, #4 combat simulation, #5 market pricing, #6 job-completion notifications, the intended Clarification trigger). All labelled ready-for-agent. Captured 00-issues-before.jpg.
- 2026-08-30 17:29 Dashboard checked on the founder's hosted Stack: auto-dispatch on (5 min), discord-space Project exists and is paused, auto-merge, priority 1. Note: the Project's dispatch primary credential is new-codex (Codex), fallback my-claude; the run sheet assumed the Claude Code credential. Founder to confirm or flip before play.
- 2026-08-30 17:30 Frontier check: a paused Project is not swept, so the Dashboard's discord-space board still shows its empty state; the 01-frontier screenshot can only be taken at play time, just after unpausing (see the play sequence below).
- 2026-08-30 17:30 Redaction check: the Needs attention page holds one needs-info card from another Project. It would appear beside the Clarification card in the morning screenshot. Resolve it or crop it out before capturing 03-attention-card.
- (pending) Wall-clock start when the founder presses play.

## Play sequence (founder, when ready)

1. Toggle auto-dispatch off.
2. Unpause the discord-space Project; wait for its board to show the six issues on the Frontier.
3. Capture 01-frontier.png of that board section.
4. Note the wall-clock start above.
5. Confirm the dispatch credential (currently primary new-codex, fallback my-claude; the run sheet assumed my-claude).
6. Toggle auto-dispatch back on; first hour captures per the run sheet.
- 2026-08-30 18:22 Correction (founder's catch): the six issues were filed flat, but #2-#5 need #1's scaffold and #6 needs #3's jobs table. Wired native blocked-by edges (#2-#5 on #1, #6 on #3); the Frontier reconciler will demote and re-promote labels as blockers close, so night one starts with #1 alone and fans out as PRs land.
- 2026-08-30 18:27 Replaced 00-issues-before.jpg: the first take predated the dependency wiring and showed all six as ready-for-agent; the retake shows the true pre-play state (#1 ready, five blocked). Run sheet updated to match.
- 2026-08-30 18:33 Founder's go: credential flipped to my-claude (dispatch primary, new-codex fallback) by the founder; start now rather than tonight; Clarification answer confirmed as drafted.
- 2026-08-30 18:33 Captured 01-frontier.jpg while the Project was still paused: the board showed all six (correcting the earlier assumption that a paused Project's board stays empty), #1 ready-for-agent with a Dispatch issue button, five blocked.
- 2026-08-30 18:33 WALL-CLOCK START: Project toggled active from the Projects page (auto-dispatch on, every 5 min, cap 2). Corpus Map offer dismissed with Not now. The run is billed as while-I-was-away rather than overnight; it started late afternoon.
- 2026-08-30 18:33 Fleet note: host maintenance for v1.15.0 is scheduled 2026-08-31 02:00-04:00 (Dashboard banner says no action required). If runs straddle it, whatever happens goes in the trail.
- 2026-08-30 18:38 #1 dispatched at 18:37 (claude, worktree issue-1). Captured 02-in-progress.jpg (NOTE: shows the zozo project section below the panel; crop to the In progress panel before publishing) and journal-first-attempt.md from the Run view.
- 2026-08-30 18:44 PR#7 (scaffold) MERGED; issue #1 closed. Reconciler re-promoted #2-#5 to ready-for-agent; #6 still blocked on #3. Elapsed from dispatch to merge: ~7 min.
- 2026-08-30 18:45 Founder intervention: the Landing Queue would not land PR#7 because the repo had no CI checks yet, so the founder enabled the allow-landing-without-checks setting (the "dangerously land PRs" toggle) mid-run. Two notes: (1) a fresh repo hits this by construction, its first PR is usually the one that adds CI; (2) UX finding for Zozo: when landing is blocked solely because the repo has no checks, the Dashboard should say so and point at the setting, since it is not obvious. Once the scaffold's CI workflow is live on main, later PRs have real checks and the toggle can be turned back off.
- 2026-08-30 18:46 #2 (galaxy) dispatched.
- 2026-08-30 18:49 HONEST FAILURE: #2 punted to needs-info while its own Run was still alive. The dispatcher's resume raced the live Run, hit the one-non-terminal-Run rule (resume attempt cap 2) and left it for a human; the Dashboard showed the needs-info chip and RUNNING side by side (needs-info-punt.jpg). Remedy per the punt text: wait for the Run to finish, then clear needs-info and relabel ready-for-agent. UX/bug finding for Zozo: the resume path should not race a Run it can see is still running.
- 2026-08-30 18:49 #3 (jobs) dispatched; both admission slots in use (#2's live Run still counts).
- 2026-08-30 18:59 Recovery without intervention: #2's live Run finished normally, the dispatcher pushed and PR#8 merged, #2 closed. The needs-info punt turned out to be label-only noise from the race; the stale label was removed from the closed issue by hand. Net: the punt cost nothing but a wrong chip on the Dashboard for ~15 min. The bug finding stands (resume raced a live Run), the remedy in the earlier log entry was never needed.
- 2026-08-30 19:00 #4 (combat simulation) dispatched; slots full with #3.
- 2026-08-30 19:02 PR#9 (jobs engine) opened; first PR to run under the scaffold's real CI checks.
- 2026-08-30 19:05 PR#9 (jobs engine) MERGED under the scaffold's real CI checks; #3 closed. #5 (economy) dispatched; reconciler re-promoted #6 to ready-for-agent. The Clarification trigger is live: next sweep dispatches #6.
- 2026-08-30 19:17 PR#10 (combat simulation) and PR#11 (economy) opened, awaiting CI.
- 2026-08-30 19:19 PR#10 (combat simulation) MERGED, #4 closed. #6 (notifications, the Clarification trigger) dispatched.
- 2026-08-30 19:19 docs/13-combat-simulation.md landed with a real verdict: no collapse to always-Fire; mirror matches punish it; the actionable finding is a free-ride property of the resolution order. Strong quotable for the launch posts.
- 2026-08-30 19:21 PR#11 (economy) MERGED, #5 closed. Five of six done; only #6 in flight.
- 2026-08-30 19:25 #6 did NOT ask: PR#12 chose DM-only and recorded it in docs/07. Filed issue #13 correcting to the founder's decision (edit-original-first, DM fallback, never channel), blocked on #6. The planned Clarification never parked; the mobile-view Q&A capture is contingent on a future genuine question.
- 2026-08-30 19:27 PR#12 (notifications) MERGED, #6 closed. All six seeded issues done. Correction issue #13 ready; dispatches next sweep.
- 2026-08-30 19:33 PR#14 (delivery correction) opened; #13 asked nothing, the issue was fully specified.
- 2026-08-30 19:36 WALL-CLOCK END: PR#14 merged 23:33 UTC (19:33 EDT). 7 PRs, 7 issues, 56 min from first dispatch to last merge. What went wrong, honestly: the needs-info race on #2 (recovered alone), and #6 deciding instead of asking (corrected via #13). No Clarification ever parked, so the planned Attention-card screenshot, answer GIF, and journal-clarification captures do not exist; the correction loop is the centrepiece instead.
- 2026-08-30 20:17 Mobile captures taken after the run (the planned Clarification never parked, so these replace the Attention-card set): 03-mobile-home.jpg and zozo-mobile-home-tour.gif, the phone-width Home view scrolling the seven completed discord-space threads. Framed to exclude other Projects' content; one earlier take was discarded because a zozo thread title entered frame.
