# Sprint Review Summary - Resume trusts what it finds on disk

**Story/Task ID:** task.124
**Epic:** _(none — standalone task)_
**Completed Date:** 2026-09-20
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#436](https://github.com/Gamaroff/agent-skills/pull/436)

---

## Summary

Seven resume/halt lifecycle defects in the develop pipelines (observations #85, #86, #88, #89, #111, #115, #123) are closed by four mechanisms: a working-tree probe that classifies a dirty tree before anything is trusted, an evidence-conditioned summary-gap rule, same-document snapshot cleanup, a `waiting_on` lock field the Stop hook honours, a glob-safe HALT, a report linter at every commit boundary, and `advance-pipeline-lock.sh --restore` for the in-session continuation after a pause.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A dirty tree on resume is classified and recorded; an overlay never reaches `git add` (probe, path-scoped `checkout HEAD` discard, full porcelain re-read, HALT on remainder; base bound from `gh pr view` / report row)
- [x] A healthy resume with no step-3 summary is not blocked (summary-gap rule keyed on the report's `Subagent summary ref` column)
- [x] No `last-halt.json` survives a completed run for the same work item (Step 8 same-document deletion; detector deletes only on a MERGED PR)
- [x] The Stop hook does not re-prompt a step with `waiting_on` set (`set-waiting-on.sh`; budget from `subagents.wallClockMinutes`; 14+ dispatch sites marked, population derived by test)
- [x] A HALT removes the lock in bash and zsh with an empty glob (two-command `rm` + `find -delete`)
- [x] A structurally invalid report cannot be committed by the pipeline (`report-lint.js` at four call sites)
- [x] An in-session continuation restores the lock with one command; advancing with no lock is an error (`--restore`; `<n>` with no lock → exit 1)
- [x] Probe cost as stated; `report-lint.js` pure with a thin CLI; every mechanism mutation-proven
- [ ] Observations #85/#86/#88/#89/#111/#115/#123 close naming the PR — **post-merge action** (parked until PR #436 lands)

### Key Features Implemented

- **Working-tree probe**: classifies every porcelain entry (overlay / bundle drift / anything else) against the real base before acting; never `checkout -- .`
- **`waiting_on`**: one writer (`set-waiting-on.sh`), one reader (`on-stop.sh` jq predicate with a wall-clock budget)
- **`report-lint.js` + `implementation-report-template.md`**: one template, one reader, lint after every Edit and before every commit
- **`advance-pipeline-lock.sh --restore`**: rebuilds the lock from the newest same-document snapshot or orphaned claim; `grant-qa-cycles.sh` delegates to it after its never-lower guard

---

## Technical Details

### Files Modified/Created

- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`, 67 assertions) — `--restore` mode; per-mode no-lock behaviour
- `shared/resources/set-waiting-on.sh` (+ `.test.sh`, 19 assertions) — new; `read-config.sh` guarded key `subagents|wallClockMinutes`
- `shared/resources/report-lint.js` (+ `tests/report-lint.test.mjs`, 12 tests) and `implementation-report-template.md` — new
- `shared/resources/develop-pipeline-on-stop.sh`, `develop-pipeline-on-precompact.sh` — `waiting_on` predicate; lint before commit; `--restore` hint
- `shared/resources/develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-0/3/5-6/8-*.md`, `develop-pipeline-hooks.md`, `develop-pipeline-pause.md` — contracts
- `skills/develop-{task,story,bug}/SKILL.md`, `finalise`, `qa-task`, `qa-story`, `review-pr` — call sites; 131 bundled `references/` copies regenerated
- `evals/develop-task/step-isolation/13–16` — replay fixtures; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, `shared/resources/tests/halt-snippet-glob-safe.test.mjs`
- `CHANGELOG.md`, `docs/reference/anti-patterns.md`, `docs/contributing/traps.md`, skill READMEs, `package.json`

### Architecture/Design Decisions

- One definition per rule (template, lint, restore, waiting_on writer) with tests that derive their populations from the tree rather than restating them.
- The QA loop ran to its budget and one granted cycle: the residue across cycles 3–5 was one rule (who restores the lock) restated at five sites — observation #132 proposes collapsing them to a citation.
- Security probe: `lintReport` classed a boundary with no fitting corpus sink; classification accepted by the operator, follow-up filed.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** `advance-pipeline-lock.sh <n>` with no lock now exits 1 (was a silent exit 0); `--skill` / `--complete` keep exit 0

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 3512 tests in the fast gate (0 fail; +81 assertions across 7 shell/JS suites, +12 `report-lint`, +8 `halt-snippet-glob-safe`, +19 `set-waiting-on`)
- **Integration Tests:** 16 replay fixtures (`eval:develop-task`), run per PR in `test.yml`'s L4 step
- **Test Coverage:** every mechanism mutation-proven (QA reports 1–6); CI SUCCESS over 5 checks on `a727d7306e55`

### Code Review

- **Reviewers:** `/review-pr` Step 5c (code + conformance lenses); 6 QA cycles of diff code review with `code_review_blocking=true`
- **Approval Status:** ⚠️ CONCERNS (advisory) — 3 medium findings carried as follow-ups
- **Review Comments Addressed:** 14 bug reports closed across 6 cycles; 3 medium PR-review findings and 3 low conformance items (the latter fixed in the task document)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** (PASS by operator decision — see the DoD summary)

- [x] No hardcoded secrets; all shell engines `set -uo pipefail`
- [x] No `eval`/`exec`/`child_process`; lock mutations via jq → temp → `mv`; every `rm -f` a single quoted variable
- [x] No new dependencies
- [ ] Probe mode: `lintReport` is a boundary with no fitting corpus sink (`probes_executed: 0`, `evidence: reasoned`) — follow-up: add a `markdown-structure` sink

### Compliance Review

⚠️ **NOT_APPLICABLE** — developer tooling; no personal data, payments, UI or health data

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` `[Unreleased]` entry (task 124)
- [x] `shared/resources/develop-pipeline-hooks.md` (`waiting_on`, `--restore`), `develop-pipeline-pause.md` (lock schema)
- [x] `docs/reference/anti-patterns.md` (must-succeed path + glob in one `rm` argv), `docs/contributing/traps.md` (zsh `nomatch`)
- [x] `skills/develop-task/README.md`, `skills/develop-story/README.md`

### Documentation Links

- `shared/resources/develop-pipeline-resume-contract.md` — the resume contract (probe, restore, re-entry)
- `shared/resources/observation-log-contract.md` — observations #132, #133 written this run

---

## Demo Notes

### How to Verify

1. Start a `/develop-task` run, let the PreCompact hook pause it, continue in-session: `bash .agents/skills/develop-task/references/advance-pipeline-lock.sh --restore <task-dir>` rebuilds the lock at the halted step and consumes the snapshot (exercised live on this run).
2. Resume with a dirty tree of bundled copies byte-identical to the base: the probe discards them path by path and logs each; a real edit HALTs.
3. Mark a wait with `set-waiting-on.sh "x"` and end the turn: the Stop hook allows it within the budget; `--clear` and it re-prompts.
4. Corrupt an implementation report (duplicate a header block) and run any commit site: the lint refuses the commit and names the problem.

### Screenshots/Visuals

_None — CLI/agent tooling._

---

## Impact & Value

### User Impact

Pipeline resumes stop destroying or mis-trusting work: overlays are discarded rather than committed, healthy resumes are not blocked by a phantom summary gap, stale snapshots cannot shadow a new run, legitimate waits are not re-prompted as stalls, and a corrupt report cannot ship.

### Technical Impact

Four new single-definition mechanisms with derived-population tests; the `advance-pipeline-lock.sh` no-lock error closes the silent-no-op class; two live exercises of the restore path on this very run.

---

## Known Limitations & Future Work

### Current Limitations

- The who-restores rule is stated at five sites (now consistent) — obs #132 proposes one citation with a test
- Probe base fallback does not parse the bug-variant report's `**Branch model:** (base: X` line (PR review CR-1)
- develop-bug Step 3 root-cause dispatch is unmarked (PR review CR-2); the detector's stale-snapshot delete is self-reported (CR-3)

### Suggested Follow-Up Stories

- Close observations #85/#86/#88/#89/#111/#115/#123 naming PR #436 after merge
- PR review CR-1..CR-5; gate 6 `recommendations.future` (fallback stderr label; cycle-1 CR-5/CR-7)
- Add a `markdown-structure` sink (or an explicit non-boundary class for validators of internal artefacts) to the security probe corpus
- obs #133: code review asks "who binds this?" for every `${VAR:-default}` in executed prose

---

## Metrics _(if applicable)_

- **Story Points:** — (estimated 9h)
- **Time to Complete:** 2026-09-19 → 2026-09-20 (1 pipeline run, 6 QA cycles incl. 1 granted, 1 PreCompact pause, 1 loop-limit escalation)
- **Lines of Code Changed:** +18 401 / −1 929 across 234 files (103 authored; 131 bundled copies)
- **Test Coverage Delta:** +120 assertions/tests, +4 replay fixtures

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
