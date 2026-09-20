# Sprint Review Summary - Resume residue from task.124: bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Story/Task ID:** task.130
**Epic:** _(standalone task)_
**Completed Date:** 2026-09-20
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#441](https://github.com/Gamaroff/agent-skills/pull/441)

---

## Summary

Closes the residue task.124's Step 5c review carried past merge: the resume probe now binds its base from every report variant or HALTs (never a silent `develop` default), the stale-snapshot delete moved out of a read-only detector into the orchestrator and is verified on disk, the who-restores rule is stated once with a test, develop-bug's root-cause dispatch joined the `waiting_on` population, and `advance-pipeline-lock.sh` gained `--restore --which` and `--accept-legacy` with a Breaking refusal of pre-task.123 snapshots.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Probe base bound on every report variant (`**Branch model:**` arm for bug reports), else HALT naming both shapes; executed test + eval fixture 17
- [x] `gh` failure and no-PR produce different stderr lines
- [x] develop-bug Step 3 root-cause dispatch marked; population regex widened, floor 17
- [x] MERGED snapshot deleted by the orchestrator from one stated loop — exact label, path containment, on-disk directory + MERGED re-read, asserted absent before Phase 0b; detector read-only
- [x] Who-restores rule has one marked statement; five citation sites carry no rule text
- [x] Grant's never-lower guard reads the candidate `--restore --which` names
- [x] Directory-less snapshot refused without `--accept-legacy`; Step 8 deletes a sole legacy snapshot (counted with `find`); an accepted restore stamps the directory so the recovery sticks
- [x] Resume cost unchanged beyond one sed and one `--which` read
- [x] Every branch mutation-proven; ci:fast, eval, bundle:check, shellcheck green
- [x] CHANGELOG names the HALT and the legacy-snapshot refusal
- [x] task.124 CR-1..CR-5 and gate-6 futures referenced as closed (implementation report § Completion)

### Key Features Implemented

- **Probe base binding**: table-row and `Branch model:` sed arms; HALT with both shapes named; stderr label split reads `gh`'s text, not only its status
- **Orchestrator-owned stale-snapshot delete**: bind block persists the detector JSON to `.summaries/step-0a-resume-detector.json`; delete block re-binds from that file (fresh shell per fence), validates every path, re-reads evidence, deletes, asserts absence
- **`--restore --which` / `--accept-legacy`**: provenance-first candidate ranking; legacy refusal; directory stamp on accepted restore
- **One statement of who restores**: `<!-- who-restores: statement -->` marker + `who-restores-single-statement.test.mjs`

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-resume-contract.md` — Phase 1 probe base; § Consume Output bind + delete blocks; § Restore the lock marker
- `shared/resources/pipeline-resume-detector-prompt.md` — read-only; note-object shape stated once
- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`, 91 scenarios) — `--restore --which`, `--accept-legacy`, stamp, provenance ranking
- `shared/resources/grant-qa-cycles.sh` (+ `.test.sh`, 42) — guard reads the `--which` candidate
- `shared/resources/develop-pipeline-step-8-commit.md`, `-step-0-resolve-and-prepare.md`, `-hooks.md`, `-pause.md` — citations, legacy cleanup, lint rc split, troubleshooting rows
- `skills/develop-{task,story,bug}/SKILL.md`; `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`
- Tests: `probe-base-binding`, `stale-snapshot-delete` (36), `who-restores-single-statement`, `report-lint-call-sites`, `halt-snippet-glob-safe` (+6), `qa-loop-lock-fields-parity`; eval fixtures 16 (re-recorded), 17 (new)
- `CHANGELOG.md`; 56 bundled `skills/*/references/` copies

### Architecture/Design Decisions

- A HALT replaces the `develop` default deliberately — a default "said aloud" was what task.124 cycle 5 had, and the review found it still wrong for hotfixes off `main`.
- The detector stays read-only by construction: the delete lives in the orchestrator, keyed on an exact label, with the file — not a shell variable — as the carrier between fences.
- The cycle-3 decision to make the file the carrier still left the delete block reading a variable; cycle 4 finished it. Three of the thirteen bugs were "fresh shell" defects.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** (1) a resume whose base cannot be bound from the report HALTs instead of defaulting to `origin/develop`; (2) a snapshot with no `task_or_story_directory` is refused as `legacy-snapshot` without `--accept-legacy`, and Step 8 deletes such a snapshot when it is the sole candidate

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 3574 node tests (`ci:fast`); shell suites 91 + 42; 13 eval replays
- **Mutation proofs:** every fix across seven QA cycles reverted and shown red on its own case
- **QA cycles:** 7 — gates 85 CONCERNS · 70 FAIL · 80 CONCERNS · 70 FAIL · 85 CONCERNS · 90 CONCERNS (no open entry) · **92 PASS**; loop limit at 5, two cycles granted; 13 bugs filed and closed
- **Step 5c:** `/review-pr` CONCERNS → cycle 7 fix (CR-1 stamp) → APPROVE on re-check
- **CI:** 5/5 SUCCESS on `d4d29bb4`

### Security & Compliance

- Security checks PASS (no secrets, no unsafe patterns, gated single-path deletes). Probe mode **unverified by the engine** — both boundaries are shell; accepted on 74 executed QA inputs across gates 3/5/7 with no hostile input accepted. Follow-up: shell-capable probe sink.
- Compliance: NOT_APPLICABLE

---

## Documentation Updates

- `CHANGELOG.md` [Unreleased] entry with both Breaking markers
- Contract, detector prompt, step-0/step-8, hooks troubleshooting, pause doc, three orchestrator SKILL.md bodies

---

## Demo Notes

Resume a develop-bug hotfix off `main` before Step 4: the probe now binds `origin/main` from the `Branch model:` line. Resume a task whose PR merged with a leftover `last-halt.json`: the detector reports it, the orchestrator deletes it after re-reading the directory and MERGED state from disk, and asserts it is gone.

## Known Limitations / Future Work

One follow-up task (task doc § Notes › Deferred Work): QA-14 falsifiable no-overwrite scenario; `--restore` header-contract mirrors; test D negative regex; gate-5 advisories CR-2/3/5/6/7; detector prompt `:80` zsh glob; `change-log.js` repair path that dropped six rows; shell-capable security probe sink.
