# PR Review Report: PR #434 — feat(bundle-check): UNREACHED class, scoped invocation discovery, and twelve dead copies removed

**Reviewed:** 2026-09-18
**PR:** [#434](https://github.com/Gamaroff/agent-skills/pull/434) — `feature/task.122.bundle-check-unreached-copies` → `develop` (OPEN, not draft; 33 files, +2189/−3552; head `3c276b33`)
**Work item:** [`task.122.bundle-check-unreached-copies.md`](./task.122.bundle-check-unreached-copies.md) — resolved via `branch-stem`
**Tracker:** [#422](https://github.com/Gamaroff/agent-skills/issues/422) — OPEN (labels `task`, `priority:medium`; milestone "Technical Tasks (standalone)")
**Verdict:** ✅ APPROVE

**Scope note.** Effort `medium`, both lenses. The diff excluded `*/references/*` (15 paths: 12 deletions, 3 refreshed `develop-pipeline-step-8-commit.md` copies); because all 15 are named in the work item's §7 Files Summary, their `--name-status` list was passed to the conformance lens and verified against §7 rather than dropped. Code lens re-ran the suite (43/43) and cross-checked against `develop`.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.122.implementation.1.bundle-check-unreached-copies.md` (Steps 1–4 ✅, QA cycles 1–3 recorded; cycle 3 `Action: Proceeding to 5c`) |
| Review report | ✅ | `task.122.review.1.bundle-check-unreached-copies.md` (7/10 → 9/10 after fixes) |
| QA reports | 3 | `task.122.qa.{1,2,3}.bundle-check-unreached-copies.md` |
| Gate | PASS | `task.122.gate.3.bundle-check-unreached-copies.yml` (100); gate 1 CONCERNS 90, gate 2 CONCERNS 90 — 3 gates / 3 reports |
| DoD | ❌ (expected) | none — task is `ready-for-review`; `/finalise` writes it at Step 7 |
| Sprint review | ❌ (expected) | none — written by `/finalise` |
| Open bugs | 0 | `task.122.bug.1.within-lexical-symlinked-parent-escape.md` — Closed (QA cycle 2) |
| Handover | ❌ (none) | no `*.handover.*` file; no outstanding actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `--check` reports UNREACHED for every source-backed undiscovered copy; nothing else changes class | `bundle_skill.py` `REMEDIES['UNREACHED']`, `check_skill` reconcilable loop; `tests/bundle-check-mode.test.js` "UNREACHED: a fresh source-backed copy…", non-regenerable measurement case | ✅ met |
| `verify-push-state.sh` in `needed` for develop-story/-task/-bug and no other new skill | `INVOKE_REF_RE` + scoped branch in `discover_needed`; `shared/resources/develop-pipeline-step-8-commit.md:108` respell; 3 refreshed copies in `.refs`; five INVOKE_REF_RE fixtures | ✅ met |
| Zero UNREACHED on the merged tree | 12 `D` entries in `.refs` (matches §7 items 7–18); QA 1–3 record `--check` → 128 skills, 0 problems | ✅ met |
| `--check --all` wall time within noise | QA reports: ≈6s live-repo test before/after | ✅ met |
| Every new test mutation-proved; fixtures use the existing helper | implementation report M1–M8 + QA mutants each cycle; `makeFixture`/`addSkill` | ✅ met |
| No second definition of the discovery rules in `package_skill.py` | `package_skill.py` untouched (walks the bundled tree) | ✅ met |
| Twelve copies gone; obs #118 `actioned` with the PR number | copies gone; #118 tick deferred to `/finalise` (gate 3 `recommendations.future`) | ⚠️ partial (by design — finalise action) |

## Conformance Findings

None.

## Code Review Findings

None.

## Machine-Readable Findings

```yaml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`: write the DoD, add `pr_number: 434` to frontmatter, tick observation #118 `actioned` with #434.
2. Follow-up outside this PR: observation #125 (the `develop` skill cites a `change-log.js` one-liner it does not bundle — the bare-`{placeholder}` class this task documents).
