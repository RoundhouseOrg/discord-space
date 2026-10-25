# Zozo trail

The verbatim record of Zozo working this repository. Nothing here is staged:
pull requests were merged as the agent wrote them, and the captures were taken
as the run happened. Screenshots are cropped to this Project only.

## Night one, 2026-08-30

Six seeded issues, dispatched 22:37 UTC, last merge 23:33 UTC: seven PRs and
about 9,100 lines in 56 minutes. The README's
[Zozo built this in an evening](../README.md#zozo-built-this-in-an-evening)
section tells the story; these are the raw materials.

- [log.md](log.md): the timestamped capture log, written as it happened,
  including the two things that went sideways.
- [prs.md](prs.md): the PR roll with sizes and merge times.
- [journal-first-attempt.md](journal-first-attempt.md): the opening minutes of
  the first Run's journal, copied from the Dashboard's Run view.
- [00-issues-before.jpg](00-issues-before.jpg): the GitHub issue list before
  play, one issue ready-for-agent and five blocked behind it.
- [01-frontier.jpg](01-frontier.jpg): the Dashboard's discord-space board just
  before play.
- [02-in-progress.jpg](02-in-progress.jpg): the first Run in progress, about a
  minute after dispatch.
- [needs-info-punt.jpg](needs-info-punt.jpg): the dispatcher race on issue #2,
  needs-info and RUNNING side by side. It recovered on its own.
- [03-mobile-home.jpg](03-mobile-home.jpg) and
  [zozo-mobile-home-tour.gif](zozo-mobile-home-tour.gif): the phone-width Home
  view after the run, scrolling the seven completed Threads.

## Run two, 2026-10-25

Two more issues, run on the hosted Stack with the Dashboard recorded, as
evidence for a directory review. Same rules: PRs merged as the agent wrote
them, nothing edited afterwards.

- Issue [#15](https://github.com/RoundhouseOrg/discord-space/issues/15),
  `/status`: dispatched 14:47 UTC, PR
  [#16](https://github.com/RoundhouseOrg/discord-space/pull/16) opened at
  14:48 (+194/-4, seven files). The agent's local build and 235 tests passed,
  but CI's lint step rejected four `any` types in the new test file. The
  Project's check command had been `npm test` with no lint. Once auto-merge was
  turned on, Zozo's Landing started a checks-repair Run on the same branch,
  which replaced the `any` types, re-ran lint, build and tests, and committed
  [10f8486](https://github.com/RoundhouseOrg/discord-space/pull/16/commits/10f8486).
  CI went green and the PR merged at 14:57 UTC. The Project's test command is
  now `npm run lint && npm test`.
- Issue [#17](https://github.com/RoundhouseOrg/discord-space/issues/17),
  `/market`: dispatched 15:05 UTC, PR
  [#18](https://github.com/RoundhouseOrg/discord-space/pull/18) opened at 15:06
  (+289/-11, eleven files) with CI green on the first commit
  ([run 40205403766](https://github.com/RoundhouseOrg/discord-space/actions/runs/40205403766):
  21 test files, 246 tests). Landing merged it at 15:13 UTC.

Two findings for Zozo came out of this run: the PR body's "Observed checks"
section reported a Verification Gap for both check commands even though the
Run's completion declaration listed them as passed, and the Dashboard's
In-progress panel has no way to tell a queued Landing from a stalled one.
