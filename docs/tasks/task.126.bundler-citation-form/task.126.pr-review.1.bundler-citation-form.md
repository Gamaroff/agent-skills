# PR Review Report: PR #524 — feat(bundler): citation form, per-skill closure count, pre-commit refusal (task 126)

**Reviewed:** 2026-09-29
**PR:** [#524](https://github.com/Gamaroff/agent-skills/pull/524) — `feature/task.126.bundler-citation-form` → `develop` (OPEN)
**Work item:** [`task.126.bundler-citation-form.md`](./task.126.bundler-citation-form.md) — resolved via `branch-stem`
**Tracker:** [#426](https://github.com/Gamaroff/agent-skills/issues/426) — OPEN
**Verdict:** ✅ APPROVE

---

**Scope.** The default exclusion (`*/references/*`) was **overridden in part**: task.126's Phase 3
deliberately deletes 51 `references/` copies and rewrites the three
`develop-pipeline-autonomous-defaults.md` hub copies, and both are named in the task's Files Summary.
The review therefore received the name-status list of every `references/` change plus the three hub
diffs. The other 9 rewritten copies (links re-relativised to upstream by the task.108 rule) are listed
by name only. Effort: medium.

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.126.implementation.1.bundler-citation-form-initial-run.md` |
| Review report | ✅ | `task.126.review.1.bundler-citation-form.md` |
| QA reports | 3 | `task.126.qa.{1,2,3}.bundler-citation-form.md` |
| Gate | PASS | `task.126.gate.3.bundler-citation-form.yml` (100) — QA Cycle 3 entry reads `Proceeding to 5c` |
| DoD | ❌ (expected) | Step 7 has not run; the task is `ready-for-review` |
| Sprint review | ❌ (expected) | written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none; `access.tracker` is full |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| A fragment reference to an `.md` target, in either spelling, bundles exactly one file | `tests/bundle-citation.test.js` A, D, D2, F | ✅ met |
| Each pointer site contributes exactly the hub (≥ 12-file drop) | 3 `SKILL.md` pointer edits; 51 deletions; closures 37→21, 45→27, 46→29 | ✅ met |
| `bundle:check` reports no `UNREACHED`; `validate:all` passes | the 51 `git rm`s; QA gate 3 evidence | ✅ met |
| A commit leaving an untracked generated copy is refused | `.githooks/pre-commit`; `tests/pre-commit-hook.test.js` (10) | ✅ met |
| No measurable change to bundle time | implementation report timings (4.9 s → 4.6 s) | ✅ met |
| One definition of the edge rules; mutation proofs | `quick_validate.ref_kind` / `parse_shared_refs`; 16 mutations recorded | ✅ met |
| Observations #83, #114 close naming the PR | — | ⚠️ at `/finalise` |

## Conformance Findings

```
[PC-1] coverage · low · confidence: high — task.126.bundler-citation-form.md:219
  Phase 3 "Record git diff --stat in the implementation report" is ticked, but the report records no such stat.
  → Add the Phase 3 git diff --stat to the implementation report, or untick the step.

[PC-2] coverage · low · confidence: low — task.126.bundler-citation-form.md:229
  package_skill.py is listed as modified but is unchanged; it picks up the shared parser through its existing import (test K).
  → Reword the Files Summary entry to say no edit was needed.

[PC-3] trail · low · confidence: medium — task.126.bundler-citation-form.md:269, :364-365
  The Consumer Tests item still says "Left for QA" after qa.1 recorded equivalent evidence, and the Progress Tracking QA/Gate items are unticked despite three QA cycles ending in PASS.
  → Tick them, citing qa.1 and gate.3.

[PC-4] consistency · low · confidence: low — frontmatter
  No pr_number, and PR #524 is not referenced in the document.
  → Add pr_number: 524 now or at /finalise.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — .githooks/pre-commit:72
  Under BUNDLE_PRECOMMIT_WARN=1 each untracked generated copy is listed twice (refusal block, then the pre-existing-drift warning).
  → Remove the UNTRACKED_LEFT paths from LEFT before the drift warning.

[CR-2] cleanup · low · confidence: medium — skills/create-skill/scripts/bundle_skill.py:2102
  Bundler callers pass bundled_names that expected_bytes never reads when reached is set.
  → Make the choice of set at the call site (one shipped set; the packager fills it from disk).
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "task.126.bundler-citation-form.md:219"
    finding: "Phase 3's 'record git diff --stat in the implementation report' is ticked, but the report records no such stat."
    suggested_action: "Add the Phase 3 git diff --stat to the implementation report, or untick the step."
  - id: PC-2
    category: coverage
    severity: low
    confidence: low
    ref: "task.126.bundler-citation-form.md:229"
    finding: "package_skill.py is listed as modified but is unchanged in the diff."
    suggested_action: "Reword the Files Summary entry to say it picks up the parser through its existing import."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "task.126.bundler-citation-form.md:269"
    finding: "The Consumer Tests and Progress Tracking QA/Gate boxes are unticked, although the work they wait on is done."
    suggested_action: "Tick them, citing qa.1's equivalent-evidence verdict and gate.3."
  - id: PC-4
    category: consistency
    severity: low
    confidence: low
    ref: "frontmatter pr_number"
    finding: "The document carries no pr_number and does not reference PR #524."
    suggested_action: "Add pr_number: 524 now or at /finalise."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: ".githooks/pre-commit:72"
    finding: "Under BUNDLE_PRECOMMIT_WARN=1 each untracked generated copy is listed twice."
    suggested_action: "Remove the UNTRACKED_LEFT paths from LEFT before the pre-existing-drift warning."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/create-skill/scripts/bundle_skill.py:2102"
    finding: "Bundler callers pass bundled_names that expected_bytes never reads when reached is set."
    suggested_action: "Choose the set at the call site: one shipped set, which the packager fills from disk."
truncated_count: 0
```

## Recommended Actions

1. Before `/finalise`: tick the settled checkboxes, record the Phase 3 `git diff --stat`, and reword the `package_skill.py` Files Summary line (PC-1 to PC-3). `/finalise` adds `pr_number` (PC-4).
2. Optional cleanups: the duplicate listing under the escape hatch (CR-1) and the `expected_bytes` parameter shape (CR-2).
