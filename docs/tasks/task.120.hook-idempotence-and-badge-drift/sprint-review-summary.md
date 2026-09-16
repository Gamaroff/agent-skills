# Sprint Review Summary - The pause hook, the hook installer and the README badge each rely on a human remembering

**Story/Task ID:** task.120
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-16
**Completed By:** develop-task pipeline (autonomous run)
**Pull Request:** [#410](https://github.com/Gamaroff/agent-skills/pull/410)

---

## Summary

Three mechanisms that only worked if something outside them behaved — the PreCompact pause hook (assumed it fires once), the hook installer (assumed a hook has one spelling) and the README skills badge (assumed a human bumps it) — now hold on their own: an atomic lock claim and a marked, edit-in-place PR comment in the hook; identity-based deduplication with a healer in the installer (and its wizard mirror); a badge and prose count the catalog generator writes and CI diffs.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] **SC-F1** Two concurrent PreCompact invocations produce one snapshot, one report block, one PR comment and one issue comment; the loser exits 0 with an empty signal (`mv` claim, stale-claim sweep, marker → PATCH)
- [x] **SC-F2** `install-hooks.sh` on a `settings.json` carrying both path spellings ends with one entry per event and is a byte-identical no-op on rerun (`hook_identity`, `heal_hook`, element-level removal)
- [x] **SC-F3** `generate_catalog.py` rewrites the README badge and the "N skills covering" prose; `validate.yml` diffs `README.md` and triggers on it
- [x] **SC-F4** README badge reads 128 on the branch
- [x] **SC-P1 / SC-P2** Hook and generator wall-clock unchanged within noise (0.12–0.13 s; 0.16 s)
- [x] **SC-Q1** Every mechanism has a red-on-revert test (20 mutation proofs `covered`)
- [x] **SC-Q2 / SC-Q3** shellcheck, `bundle_skill.py --check` and prettier clean; new suites chained in `package.json` `scripts.test`
- [x] **SC-M1 – SC-M3** CHANGELOG cites `(task 120)`; `develop-pipeline-pause.md` describes the claim and the *extended* resume contract; the hand fix to the local `settings.json` is reproduced by the healer against the `.bak` copy

### Key Features Implemented

- **Atomic pause claim**: the hook `mv`s the lock to `develop-pipeline.lock.pausing.<pid>` before anything else — of N concurrent runs exactly one owns it; the winner sweeps stale claims and addresses the claimed name throughout
- **Marked PR comment, edited in place**: `<!-- agent-skills-comment:pipeline-paused-<step> -->` found by marker → `gh api PATCH`, else created; repo derived from the PR URL
- **Identity-based installer dedupe + healer**: an anchored `sed -nE` match requiring `develop-(story|task|bug)/scripts/<hook>.sh` under any interpreter/prefix spelling, namespaced as `develop-pipeline-hook:scripts/<hook>.sh`; `heal_hook` removes identity-equal/command-different entries at element level and prunes only groups it emptied; mirrored in the `setup-consumer.sh` wizard
- **Resume detector fallback**: with no lock, `last-halt.json` and `.pausing.*` are candidates chosen by document then age; `source: orphaned_claim`
- **Generated README badge**: `generate_catalog.py --readme/--no-readme`; anchored `BADGE` and `PROSE_COUNT` regexes; change-based label

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-on-precompact.sh` — atomic claim, stale sweep, marker/PATCH PR comment, `PR_REPO` from URL
- `shared/resources/develop-pipeline-on-precompact.test.sh` — scenarios 12–15 (forced overlap, stale claim, marker→PATCH, kill-in-window)
- `shared/resources/develop-pipeline-install-hooks.sh` — `hook_identity`, `heal_hook`, element-level `unpatch_hook(_exact)`, null-safe jq
- `shared/resources/develop-pipeline-install-hooks.test.sh` — new, 11 scenarios (fixture = the task.110 pre-fix `settings.json` shape)
- `scripts/setup-consumer.sh` — `_hook_identity`, `_patch_hook`, `_heal_hook`, `_unpatch_hook(_exact)` wizard mirror
- `skills/create-skill/scripts/generate_catalog.py` — argparse, `update_readme_badge`, `PROSE_COUNT`
- `tests/generate-catalog-badge.test.js` — new, 8 tests incl. the repo-level no-diff check
- `.github/workflows/validate.yml` — README in both `paths` lists and in the no-diff step
- `shared/resources/pipeline-resume-detector-prompt.md` — Step 1 rewritten; `orphaned_claim`
- `shared/resources/develop-pipeline-pause.md`, `develop-pipeline-hooks.md`, `docs/reference/configuration.md`, `CHANGELOG.md`, `README.md` — documentation
- `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` — `#2e` assertions re-pointed to the new mechanism
- `package.json` — installer suite chained; bundled copies under `skills/develop-*/references/` and `skills/develop-*/scripts/on-precompact.sh` regenerated

### Architecture/Design Decisions

- **Claim by rename, not by test-then-remove** — `mv` on one filesystem is atomic; `test -f` followed by `rm` is the race that produced the duplicate pause on task.110.
- **Identity, not spelling** — the installer compares what a hook *is* (skill family + script), not how it is written, so `.claude/skills/…` and `.agents/skills/…` and `bash "${CLAUDE_PROJECT_DIR}/…"` collapse to one entry; the match is anchored and namespaced so a consumer's own `scripts/on-stop.sh` can never be mistaken for ours (bug.4, bug.6).
- **Detector chooses by document then age** — a fixed snapshot-first order let a stale `last-halt.json` from another task shadow a fresher claim for this one (bug.5).
- **CI owns the badge** — the generator writes it, `validate.yml` diffs it; a hand-bump is exactly what the check proves unnecessary.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none (resume contract extended, not changed; `--readme` defaults to the repo README, `--no-readme` opts out)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 15 hook scenarios (`develop-pipeline-on-precompact.test.sh`), 11 installer scenarios (`develop-pipeline-install-hooks.test.sh`), 8 generator tests (`tests/generate-catalog-badge.test.js`); `npm run ci:fast` 3312 tests green
- **Mutation proving:** 20 proofs `covered` across develop + 5 QA cycles (claim → `[ -f ]`, sweep dropped, PATCH disabled, identity = identity, badge call removed, regex unanchored, …)
- **Boundary probes:** 27 identity probes in QA + 95 in the DoD security pass (94 held)

### Code Review

- **Reviewers:** Step 5c `/review-pr` (code + conformance lenses) — `task.120.pr-review.1.hook-idempotence-and-badge-drift.md`
- **Approval Status:** ⚠️ CONCERNS (advisory) — no formal GitHub review on this solo-maintained repo
- **Review Comments Addressed:** PC-3 (document contradiction) fixed in `cc42a9c2`; CR-1 / PC-1 (orphaned-claim lifecycle) recorded as a follow-up; PC-2 (`pr_number`) written at acceptance

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** (DoD agent, `task.120.dod.1…md` Step 3)

- [x] No secrets in the diff; no new dependencies
- [x] No `eval`/`exec`; every jq filter takes values via `--arg`; `gh api PATCH` argv-safe; `PR_REPO` anchored-sed from the PR URL
- [x] Boundary probed: 95 candidates, 94 held — one reproduced **low-severity** deviation (per-line anchoring on a multi-line command) recorded as a follow-up, not blocking

### Compliance Review

⚠️ **Not applicable** — no user data, payments, UI or health scope.

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` `[Unreleased]` → `### Changed` `(task 120)`
- [x] `shared/resources/develop-pipeline-pause.md` — claim, marker/edit-in-place, same-step re-pause, extended resume contract
- [x] `shared/resources/develop-pipeline-hooks.md` — trigger condition, installer identity step, idempotency, troubleshooting row
- [x] `shared/resources/pipeline-resume-detector-prompt.md` — `orphaned_claim`, document-then-age precedence
- [x] `docs/reference/configuration.md` — installer description
- [x] `README.md` badge + prose generated (128)

### Documentation Links

- [DoD verification log](./task.120.dod.1.hook-idempotence-and-badge-drift.md)
- [QA report, cycle 5](./task.120.qa.5.hook-idempotence-and-badge-drift.md) · [gate 5](./task.120.gate.5.hook-idempotence-and-badge-drift.yml)
- [PR conformance review](./task.120.pr-review.1.hook-idempotence-and-badge-drift.md)
- [Implementation report](./task.120.implementation.1.hook-idempotence-and-badge-drift-initial-run.md)

---

## Demo Notes

### How to Verify

1. `bash shared/resources/develop-pipeline-on-precompact.test.sh` — scenario 12 runs two hooks concurrently against one lock; expect one snapshot, one report block, one PR call, one issue call.
2. `bash shared/resources/develop-pipeline-install-hooks.test.sh` — scenario 1 feeds a `settings.json` with three spellings per event; expect one canonical entry per event and a byte-identical second run.
3. `python3 skills/create-skill/scripts/generate_catalog.py skills docs/reference/skill-catalog.md` then `git diff README.md` — expect no diff (badge already generated); edit the badge to `skills-1-` and rerun to watch it rewritten.
4. Expected outcome: all three suites green; `npm run bundle -- --check` reports 0 problems.

### Screenshots/Visuals

_N/A — CLI/shell change set._

---

## Impact & Value

### User Impact

A pipeline paused by context compaction leaves exactly one pause record and one PR/issue comment, and can be resumed even if the hook was killed mid-flight. Consumers who installed the hooks under two spellings are healed on the next `install-hooks.sh` run instead of seeing every pause side-effect twice.

### Technical Impact

Removes three "works only if a human remembers" assumptions; adds 34 scenarios of regression coverage with mutation proofs; closes obs #101.

---

## Known Limitations & Future Work

### Current Limitations

- `hook_identity` anchors per line: a hand-authored multi-line `settings.json` command containing our script is classified as ours (low severity; DoD security probe)
- An orphaned `.pausing.*` claim is swept only by the next successful pause; the orchestrators' Start-fresh / HALT cleanup does not yet remove it (5c CR-1 / PC-1)
- Two byte-identical canonical entries are not collapsed (pre-existing; gate.5 advisory)

### Suggested Follow-Up Stories

- Reject newline-bearing input in `hook_identity` / `_hook_identity` with a red-on-revert fixture
- Add `.claude/state/develop-pipeline.lock.pausing.*` to the orchestrators' Start-fresh and terminal-HALT/completion cleanup; re-bundle
- Numeric guard on `current_step` before it enters the hook's `jq` comment-lookup filter
- Scenario 14 stub distinguishability; wizard step status after a warning; detector output-field table row (gate.5 `recommendations.future`)

---

## Metrics

- **Story Points:** — (estimated 8 h)
- **Time to Complete:** 1 day (2026-09-16), 12 commits on the branch
- **Lines of Code Changed:** +4705 / −468 across 59 files (≈ 30 are regenerated bundled copies)
- **QA Cycles:** 5 (gates CONCERNS 90/80/80/80 → PASS 100)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
