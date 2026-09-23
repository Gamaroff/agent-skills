# Sprint Review Summary — Task 141

**Task:** `/qa-next <id>` — target a specific registry item
**PR:** [#468](https://github.com/Gamaroff/agent-skills/pull/468) → `develop` · **Issue:** #466
**Accepted:** 2026-09-23 · **Gate:** CONCERNS 90/100 (gate 12), accepted on the evidence by the operator · **QA cycles:** 12

---

## Summary

`/qa-next` had one way to choose what it tested: the first `⬜ untested` row in file order. A `❌` whose
fix had merged could not be re-tested without `--set <id> untested`, which erases its failure history,
and a `✅` could not be regression-tested at all. `/qa-next <id>` now runs the full UAT protocol against a
named row in any state. The parts that must not depend on the agent's discipline have been made
mechanical in `uat-status.mjs`: the run-file path, the accepted-row rule and bug reuse.

## Success Criteria Met

21 / 21. Eighteen trace to code plus a test that runs on every PR. Three process criteria are met by
other evidence: no network call (by inspection of the imports), suite wall-clock (by measurement in QA
cycle 1), and every new test mutation-proved (by the mutation record, 52 mutations across twelve cycles
with none left surviving).

## Key Features

- **`--item <id> [--json]`**: the same payload as `--next`, from one `describeRow`, for a row in any state.
  Exit 4 means the id is not a row, and nothing is written.
- **`--run-path <id> [--env <label>]`**: the next free run file, sequenced `-02`, `-03` for same-day
  re-runs, so a re-run can never overwrite the previous run's Findings. One sort key orders run history.
- **Only a `fail` moves an `✅` row.** A `pass`, `blocked` or `na` against an accepted row keeps `✅`,
  updates `Last run`, and **appends** to `Notes / bug` rather than replacing the owner's sign-off.
  `--clear-note` is refused there.
- **A repeat failure reuses the open bug.** The payload's `bug` is the repo-relative path of the row's bug,
  in the form `--bug` takes, so it round-trips. `--check` validates every bug link on every row against a
  rule stated once (`BUG_LINK_RULE`) and held clause by clause to its behaviour.

## Testing & Quality Assurance

- qa-next suite: 44 tests. `npm test` / `ci:fast`: 3947 tests, 0 failures. CI green (5 checks).
- **Twelve QA cycles.** HIGH by gate was 1, 1, 1, 0, 1, then 0 for the last eight gates. Every MEDIUM
  after cycle 6 was about how a value is represented at a boundary: first the bug link, then the state
  file's `priorRuns`/`bug`. The loop closed those boundaries one pair at a time.
- **Two structural turning points** replaced something that must be maintained with something that holds
  itself: cycle 3's append rule for the note cell, and cycles 8–9's single value and single conversion for
  the bug link.
- **Step 5c `/review-pr`** ran twice. Review 1 (CONCERNS) found four MEDIUM issues across the whole PR,
  including a literal `D.2` in an executed command. They were fixed and gated. Review 2 found 0 HIGH.

## Security & Compliance

- **Security:** grep checks are clean (no secrets, no exec/eval, no network, no dependency changes). The
  DoD security agent's probe mode could not execute against a multi-flag Node CLI, so the result is
  **unverifiable by the probe engine** (LOW), not a reproduced defect. This was accepted by the operator
  and filed as a follow-up.
- **Compliance:** not applicable (no personal, payment, UI or health data).

## Documentation

`skills/qa-next/SKILL.md` (the targeted form in Steps 1, 3, 4 and 6; the state file's `priorRuns`,
`bug` and `filedBug`), `skills/qa-next/README.md`, `assets/run.template.md` (the Run row),
`docs/reference/commands.md`, `docs/reference/activation-phrases.md`, and `CHANGELOG.md` (Added and
Changed, with a migration line, citing task 141).

## Demo Notes

```bash
node .agents/skills/qa-next/scripts/uat-status.mjs --item D.2 --json      # any state
node .agents/skills/qa-next/scripts/uat-status.mjs --run-path D.2 --env lan
# → runs/D.2/2026-09-23-lan.md, then -02 on a same-day re-run
```

Then `/qa-next D.2`, against a row whose bug has just been fixed.

## Known Limitations & Future Work

- **The state file's contract is prose only.** Its fields, writers and readers are spread across Steps
  1–6, and nothing mechanical holds them. That area produced one MEDIUM per QA cycle through cycles
  10–12. The agreed follow-up gives it one schema table, or has `uat-status.mjs` own it (obs #167).
- Deferred with it: a two-digit `--env` label passes the sequence guard; Step 4.4's pass bullet omits
  `--clear-note`; a pre-task.141 state file has no `priorRuns`.
- Routed to future: no `--registry` passed for a non-default `registryPath`; `cmdSet`'s `startsWith`
  guess on `--run`; a directory passes the bug-link check; the run link and `Filed as` get no fragment or
  prose handling; bug.16 (the main guard is a silent no-op under a symlink).
- The DoD probe engine has no entry form for a multi-flag CLI, so this change's boundary could not be
  executed at finalise.
