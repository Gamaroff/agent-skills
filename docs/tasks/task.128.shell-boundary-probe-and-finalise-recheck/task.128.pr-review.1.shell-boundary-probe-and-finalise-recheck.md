# PR Review Report: PR #446 — feat(task.128): shell entry form for the probe engine, a filename sink, a language-neutral boundary signal, and finalise fix-and-recheck

**Reviewed:** 2026-09-20
**PR:** [#446](https://github.com/Gamaroff/agent-skills/pull/446) — `feature/task.128.shell-boundary-probe-and-finalise-recheck` → `develop` (OPEN)
**Work item:** [`task.128.shell-boundary-probe-and-finalise-recheck.md`](./task.128.shell-boundary-probe-and-finalise-recheck.md) — resolved via `branch-stem`
**Tracker:** [#431](https://github.com/Gamaroff/agent-skills/issues/431) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `git diff origin/develop...origin/feature/task.128.shell-boundary-probe-and-finalise-recheck` at head `01a0b475`, excluding auto-generated `*/references/*` copies (25 files, 3,886 lines — every one a bundled copy of a `shared/resources/` file also in the diff) and re-including the hand-authored `skills/finalise/references/definition-of-done-checklist.md`. Effort: medium, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.128.implementation.1.shell-boundary-probe-and-finalise-recheck-initial-run.md |
| Review report | ✅ | task.128.review.1.shell-boundary-probe-and-finalise-recheck.md (8/10) |
| QA reports | 5 | task.128.qa.1..5.shell-boundary-probe-and-finalise-recheck.md |
| Gate | CONCERNS | task.128.gate.5.shell-boundary-probe-and-finalise-recheck.yml (95) — `top_issues: []`; cycle 5 entry reads `Proceeding to 5c` |
| DoD | ❌ | not yet — document is `ready-for-review`, Step 7 writes it |
| Sprint review | ❌ | n/a for a task |
| Open bugs | 0 | 13 bug reports, all Closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `--entry shell:` executes every case under bash and zsh and reproduces the newline case on the pre-fix script | `security-probe.mjs` `runShellCase`/`probeShells`; `security-probe.test.mjs` "shell entry: pre-fix qa-cycle.sh …"; `task.128.qa.5.security.run.json` 28 executed | ✅ met |
| `classifyBoundaryText` names a refusing script as a boundary by its header; gate-5 note is the negative fixture | `probe-boundary-signals.mjs`; `probe-boundary-signals.test.mjs:58` | ✅ met |
| `/finalise` proceeds through fix-and-recheck only when all five preconditions hold, halts otherwise | `finalise-fix-and-recheck.mjs` + `.json`; `finalise-fix-and-recheck.test.mjs` falsify table; `skills/finalise/SKILL.md` Step 8a | ✅ met (see CR-1 for a weakness in one precondition) |
| `probes_executed` engine-written for the shell form | `toRecordEntry` adds `shells`; record qa.5 totals 39 | ✅ met |
| Migration: obs #121 closes naming the PR | no observation-log hunk — actioned at `/finalise` | ⚠️ pending (PC-1; checkbox unticked) |

## Conformance Findings

```
[PC-3] consistency · medium · confidence: high — task.128.shell-boundary-probe-and-finalise-recheck.md frontmatter (no pr_number) and :352 ('task.121 (merged, PR #430)')
  The task document named PR #446 nowhere while 107 other task documents carry pr_number:; finalise Step 3a's fallback grep would have resolved task.121's PR #430 as this task's PR.
  → Add pr_number: 446 to the frontmatter. APPLIED in the working tree before Step 7.

[PC-1] coverage · low · confidence: high — task.128.shell-boundary-probe-and-finalise-recheck.md:255 (§9 Migration)
  The Migration criterion "Observation #121 closes naming the PR" was ticked while obs #121 is still parked and the patch touches no observation-log file.
  → Untick until /finalise sets obs #121 actioned naming PR #446. APPLIED.

[PC-4] consistency · low · confidence: high — task.128 §6 Phase 2 vs §9 and probe-boundary-signals.test.mjs:58
  §6 Phase 2 described the task.121 gate-5 note as a positive fixture; §9 and the shipped test pin it as the negative one.
  → Rewrite the Phase 2 checkbox to match. APPLIED.

[PC-2] trail · low · confidence: medium — task.128.implementation.1.* '## Pipeline Paused — 2026-09-20T19:55:17Z'
  The report carried the PreCompact hook's paused block although cycles 4–5 and 5c ran after it.
  → Mark the block as resumed. APPLIED (block kept as the hook's record, headed RESUMED).

[PC-5] scope · low · confidence: medium — evals/shared/tests/probes-executed-population.test.mjs, skills/review-security/tests/review-security.test.js
  Both modified in the patch, neither listed in §7 Files Summary.
  → Add to §7 Files to Modify (Tests). APPLIED.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/finalise-fix-and-recheck.mjs:78
  mutation-proved is tied to the FILE, not the test: mutationProof.test is a file path and node:test prints every failing test's stack trace (file:line) within RED_WINDOW of its ✖, so a log where the named test is ✔ and an unrelated test in the same file is ✖ satisfies the precondition (reviewer reproduced: proceed: true).
  → Require the proof to name the test's title and match it on the ✖ line itself, keeping the file for the `test at <file>` cross-check. NOT applied here — recorded as a known limit of the delivered evaluator; candidate for the next task on this mechanism.

[CR-2] bug · low · confidence: medium — shared/resources/finalise-fix-and-recheck.mjs:118
  severity-low gates the licence on a self-reported value that nothing cross-checks against the run record's escaped/reproduced counts for the same control.
  → Accept an optional record path and refuse severity: low when the control's entry shows escaped > 0. Carried (cycle-3 CR-5 already names this derivation).

[CR-3] bug · low · confidence: medium — shared/resources/security-probe.mjs:786
  listDirStamps stamps sibling directories by size:mtimeMs, so a write into a sibling directory of the probed script during a run (shared/resources/tests/ for qa-cycle.sh) is reported as an escape attributed to the case.
  → Stamp regular files only. Carried to future.

[CR-4] cleanup · low · confidence: high — shared/resources/security-probe.mjs:861
  The inline `!c.expected || typeof c.expected !== "object"` guard duplicates expectedProblem's first check.
  → Drop the inline guard; adjust the one test that matches the wording. Carried to future.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "task.128.shell-boundary-probe-and-finalise-recheck.md frontmatter (no pr_number) and :352"
    finding: "The task document named PR #446 nowhere while finalise's fallback grep would resolve task.121's PR #430."
    suggested_action: "Add pr_number: 446 to the frontmatter (applied)."
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "task.128.shell-boundary-probe-and-finalise-recheck.md:255 (§9 Migration)"
    finding: "The Migration criterion was ticked while obs #121 is still parked."
    suggested_action: "Untick until /finalise actions obs #121 naming PR #446 (applied)."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "task.128.shell-boundary-probe-and-finalise-recheck.md:164 vs :244 and shared/resources/tests/probe-boundary-signals.test.mjs:58"
    finding: "§6 Phase 2 and §9 disagreed on the gate-5 note fixture's polarity."
    suggested_action: "Rewrite the Phase 2 checkbox to match §9 and the test (applied)."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "task.128.implementation.1.shell-boundary-probe-and-finalise-recheck-initial-run.md — '## Pipeline Paused — 2026-09-20T19:55:17Z'"
    finding: "The report carried a stale Pipeline Paused block after the run resumed."
    suggested_action: "Mark the block as resumed (applied)."
  - id: PC-5
    category: scope
    severity: low
    confidence: medium
    ref: "evals/shared/tests/probes-executed-population.test.mjs, skills/review-security/tests/review-security.test.js"
    finding: "Two modified test files were not listed in §7 Files Summary."
    suggested_action: "Add them to §7 Files to Modify (Tests) (applied)."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/finalise-fix-and-recheck.mjs:78"
    finding: "mutation-proved matches a red marker near the proof's file path, so an unrelated red in the same test file satisfies it."
    suggested_action: "Match the named test's title on the ✖ line itself and keep the file for the cross-check."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/finalise-fix-and-recheck.mjs:118"
    finding: "severity-low is self-reported and not cross-checked against the run record's escaped count."
    suggested_action: "Refuse severity: low when the control's record entry shows escaped > 0."
  - id: CR-3
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/security-probe.mjs:786"
    finding: "listDirStamps stamps sibling directories, so a write into one during a run reads as an escape."
    suggested_action: "Stamp regular files only."
  - id: CR-4
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/security-probe.mjs:861"
    finding: "The inline non-object expected guard duplicates expectedProblem's first check."
    suggested_action: "Drop the inline guard and let expectedProblem be the single validator."
truncated_count: 0
```

## Recommended Actions

1. Tie `mutation-proved` to the test's title, not its file (CR-1) — the one finding that weakens a licence the task delivers; file it as the first item of a follow-up task on the fix-and-recheck evaluator together with CR-2.
2. Proceed to `/finalise`: the five conformance findings are applied in the working tree and will land in the Step 8 commit; obs #121 → actioned naming PR #446.
3. Carry CR-3, CR-4, and QA cycle 5's two advisories (case-folded fixture names; `exec sleep` in the CR-3 test fixture) to the same follow-up.
