# PR Review Report: PR #408 — feat(task.110): session-handoff skill — the handoff re-measures itself on read

**Reviewed:** 2026-09-15
**PR:** [#408](https://github.com/Gamaroff/agent-skills/pull/408) — `feature/task.110.session-handoff-skill` → `develop` (OPEN)
**Work item:** [`task.110.session-handoff-skill.md`](./task.110.session-handoff-skill.md) — resolved via `branch-stem`
**Tracker:** [#407](https://github.com/Gamaroff/agent-skills/issues/407) — OPEN
**Verdict:** ⚠️ CONCERNS

Re-review (the first, [`pr-review.1`](./task.110.pr-review.1.session-handoff-skill.md), was REQUEST CHANGES; its CR-1..3 and PC-1..4 were fixed in `e7eca2b4` and QA cycles 14–19 followed). Scope of the diff reviewed: `origin/develop...origin/feature/task.110.session-handoff-skill` at `0479093c`, less `*/references/*` (bundled copies); the code lens additionally excluded the task's own `docs/tasks/task.110.*` artefacts (8,467 of 12,871 added lines). Effort: medium. Two read-only Explore lenses, dispatched in parallel: code (11m37s — past the 10-minute budget, not killed; block in hand) and conformance (1m43s).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.110.implementation.1.session-handoff-skill-initial-run.md` (header Status / Completion block were stale at cycle 13 — PC-1, corrected in this review's commit) |
| Review report | ✅ | `task.110.review.1.session-handoff-skill.md` — READY TO IMPLEMENT 8/10 |
| QA reports | 19 | `task.110.qa.1..19.session-handoff-skill.md` |
| Gate | PASS | `task.110.gate.19.session-handoff-skill.yml` (100) — cycle-19 entry reads `Proceeding to 5c`; `top_issues: []` |
| DoD | ❌ | not yet written — correct for `status: ready-for-review` |
| Sprint review | ❌ | not yet written — correct before `/finalise` |
| Open bugs | 0 | bugs 1–23 all `Closed` |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
|---|---|---|
| 1. One verdict per figure; the annotated 2026-09-10 fixture reads `stale` on the frontier line and the change-log.js claim | `handoff-verify.mjs` `verify()`/`compareFigure()`; test "regression: the 2026-09-10 handoff reads stale…"; fixture `tests/fixtures/handoff-2026-09-10.txt` | ✅ met |
| 2. `--json` follows the repo's `reason` / exit-code contract | `run()`; tests "cli: --json emits one object…", "cli: missing file → reason=missing…" | ✅ met |
| 3. Write mode emits the fixed section order; traps section is a pointer | `assets/handoff.template.md`; test "template: fixed section order…" | ✅ met |
| 4. Tests run under `npm test` and in CI | `package.json` glob `'skills/session-handoff/tests/*.test.js'` (33 tests) | ✅ met |
| 5. `quick_validate.py` passes; catalog and deps regenerate to no diff | verified in every QA cycle's gates | ✅ met |
| 6. AGENTS.md names the read mode | `AGENTS.md` pointer names `handoff-verify.mjs` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — task.110.implementation.1.session-handoff-skill-initial-run.md:6, :38, :408, :411
  Prior PC-1 only partially resolved: the header Status line and the Completion block still described the run at cycle 13, and row 5–6 opened "16 cycles so far" while listing 19 gates — contradicting the report's own `### QA Cycle 19` entry (`Proceeding to 5c`).
  → Fixed in this review's commit: Status, the row prefix, Final Status and QA Iterations now read cycle 19; Step 8 fills Finished.

[PC-2] consistency · low · confidence: high — task.110.session-handoff-skill.md §QA Testing Results › NFR Status
  The line still carried "Security: FAIL … Reliability: CONCERNS" from cycle 15 while gate.19 records every axis PASS.
  → Fixed in this review's commit.

[PC-3] consistency · low · confidence: medium — CHANGELOG.md [Unreleased]
  The entry said "sixteen QA cycles" against a 19-gate trail.
  → Fixed in this review's commit ("nineteen").
```

## Code Review Findings

```
[CR-1] bug · low · confidence: high — skills/session-handoff/scripts/handoff-verify.mjs:1411
  SHELL_EXPANSION refuses `~` anywhere in a token, so `git log HEAD~1 --oneline` and `git rev-list --count HEAD~3..HEAD` read `shell expansion not supported` although a shell tilde-expands only at word start (confirmed in-process).
  → Refuse `~` only at the start of a token (and after `=`/`:`), keeping `*` and `$` global; allowed-list `git log HEAD~1`, refused-list `~/x`.

[CR-2] bug · low · confidence: high — .agents/handoff.md:106
  `git remote get-url origin; expect: github.com` is confirmed only on an SSH clone — the whole-token rule tokenises an https remote as `//github.com/o/r.git`, so the line flips to `stale` with the reader's clone transport (confirmed: compareFigure("github.com", https…) → holds:false).
  → Fixed in this review's commit as a doc change: `expect: /github\.com/`; the SKILL.md note that URL-shaped output never yields host tokens is a follow-up.

[CR-3] bug · low · confidence: medium — skills/session-handoff/scripts/handoff-verify.mjs:1591
  A table row carrying a trailing `<!-- cmd: … -->` no longer matches TABLE_ROW, ends the table, and the following rows of that table are dropped without a verdict.
  → Strip a trailing HTML comment before the TABLE_ROW test, or emit `unverifiable: malformed row` so no row is lost silently.

[CR-4] cleanup · low · confidence: high — skills/session-handoff/scripts/handoff-verify.mjs:818
  makeFlagOk re-derives `flags`/`withValue` with the same two lines checkArgs uses.
  → Extract `splitFlagList(list)` used by both.

[CR-5] cleanup · low · confidence: high — skills/session-handoff/scripts/handoff-verify.mjs:127
  The `..`-segment test appears three times (isSafePositional twice, valueOk once).
  → Hoist into one `hasDotDotSegment(tok)` helper.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.110.session-handoff-skill/task.110.implementation.1.session-handoff-skill-initial-run.md:6"
    finding: "The implementation report's header Status, row 5–6 prefix and Completion block still described cycle 13 while its QA Cycle 19 entry reads Proceeding to 5c."
    suggested_action: "Bring the Status line, the row prefix and the Completion block to cycle 19 (fixed in the review commit)."
    status: fixed
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md"
    finding: "The task document's NFR Status line carried Security FAIL / Reliability CONCERNS while gate.19 records every axis PASS."
    suggested_action: "Refresh the line to match gate.19 (fixed in the review commit)."
    status: fixed
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "CHANGELOG.md"
    finding: "The [Unreleased] entry said sixteen QA cycles against a 19-gate trail."
    suggested_action: "Correct the figure (fixed in the review commit)."
    status: fixed
  - id: CR-1
    category: bug
    severity: low
    confidence: high
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1411"
    finding: "SHELL_EXPANSION refuses a mid-token `~`, so HEAD~1 revision spellings are unverifiable although no shell expands them."
    suggested_action: "Refuse `~` only at token start; allowed-list `git log HEAD~1`."
    status: open
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: ".agents/handoff.md:106"
    finding: "The handoff's `expect: github.com` is confirmed only on an SSH clone under the whole-token rule."
    suggested_action: "Record the figure as a regex (fixed in the review commit); document the URL-token behaviour in SKILL.md."
    status: fixed
  - id: CR-3
    category: bug
    severity: low
    confidence: medium
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:1591"
    finding: "A table row with a trailing HTML comment ends the table and drops the following rows without a verdict."
    suggested_action: "Strip the trailing comment before the row test, or emit an unverifiable line for the malformed row."
    status: open
  - id: CR-4
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:818"
    finding: "makeFlagOk duplicates checkArgs' flag-list split."
    suggested_action: "Extract splitFlagList."
    status: open
  - id: CR-5
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/session-handoff/scripts/handoff-verify.mjs:127"
    finding: "The `..`-segment test is written three times."
    suggested_action: "Hoist into hasDotDotSegment."
    status: open
truncated_count: 0
```

## Recommended Actions

1. PC-1, PC-2, PC-3 and CR-2 — trail and document corrections, applied in this review's commit (no code changed; gate 19 still speaks for `15e9cfe4`'s code).
2. CR-1, CR-3 — two LOW correctness refinements of read mode (mid-token `~`; a table row that carries a comment), and CR-4/CR-5 cleanups — recorded for a follow-up; none is a reachable write or egress, and none blocks merge under the verdict table.

**Verdict rationale.** No finding is `severity: high`; PC-1 is medium/high → CONCERNS, non-blocking. The pipeline proceeds to Step 7.
