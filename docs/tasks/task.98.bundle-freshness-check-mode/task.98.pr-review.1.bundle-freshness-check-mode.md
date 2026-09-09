# PR Review Report: PR #367 — feat(bundler): per-file freshness assertion regenerate-and-diff cannot make

**Reviewed:** 2026-09-09
**PR:** [#367](https://github.com/Gamaroff/agent-skills/pull/367) — `feature/task.98.bundle-freshness-check-mode` → `develop` (OPEN)
**Work item:** [`task.98.bundle-freshness-check-mode.md`](./task.98.bundle-freshness-check-mode.md) — resolved via `branch stem`
**Tracker:** [#366](https://github.com/Gamaroff/agent-skills/issues/366) — OPEN, In Progress
**Verdict:** ✅ **APPROVE**

---

## Review Scope and Methodology

**Both lenses ran inline rather than as independent read-only subagents** (session policy bars
unrequested dispatch). This is recorded because it materially weakens the review: the conformance lens
in particular exists to be a reader who was not present for the implementation, and here it was not.
Weight the "no significant findings" result accordingly.

What partially compensates: every finding below was reached by **executing a probe** against a
fixture, not by reading the diff and reasoning about it, and the three QA cycles preceding this gate
included a full refute pass that found a HIGH defect.

**Diff scope**, stated so it is auditable: 14 files, +2893 / −29. The standard generated-file
exclusion `':(exclude)*/references/*'` was **deliberately not applied wholesale** — see PC-2. One
`references/` file in this PR is a substantive change, not bundler noise, and excluding it would have
hidden the PR's headline result from its own review.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.98.implementation.1.bundle-freshness-check-mode-initial-run.md` |
| Review report | ✅ | `task.98.review.1.bundle-freshness-check-mode.md` — READY TO IMPLEMENT, 9/10 |
| QA reports | 3 | `task.98.qa.{1,2,3}.bundle-freshness-check-mode.md` |
| Gate | **PASS** | `task.98.gate.3.bundle-freshness-check-mode.yml` (100/100) — preceded by CONCERNS 90 and FAIL 80 |
| DoD | ⏳ | Not yet written — Step 7 `/finalise` has not run. Correct for this point in the pipeline |
| Sprint review | ⏳ | Same |
| Open bugs | 0 | — |
| Handover | n/a | No deferred tracker actions — `access.tracker` is `full` |

The trail is complete and **honest**, which is the part worth checking rather than assuming: the two
non-PASS gates are still on disk with their findings intact, so the record shows a FAIL that was
fixed rather than a run that was always green.

---

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
|---|---|---|
| Orphan (source deleted) fails the check — mutation-proved | `bundle_skill.py` orphan scan; `tests/bundle-check-mode.test.js` "ORPHANED: a bundled copy whose source was deleted is reported" + "…is invisible to regenerate-and-diff" + late-banner variant; M4 reds 5 tests | ✅ met |
| A symlinked reference is reported | `check_skill` symlink branch (before `exists()`); test "SYMLINK: … not silently accepted" asserts it is **not** MISSING; M1 reds | ✅ met |
| An authored file sharing a name is reported, never rewritten | test "AMBIGUOUS: … reported, never rewritten" asserts both halves in one test | ✅ met |
| The check is read-only — no mutation reachable, asserted | tests "mutates nothing" (bytes + mode + path set) and "does not create a references/ directory"; M7 and M9 red independently | ✅ met |
| Every class's printed remedy clears that class (check → bundle → check) | tests "every class called regenerable is cleared by a bundle run" and its negative twin "no class called non-regenerable is cleared"; M5 reds | ✅ met |
| `npm run bundle` idempotent | Verified in-run: two consecutive runs, 0 writes each | ✅ met |
| `npm run ci` green + `validate.yml` reproduced locally | `ci:fast` 3022/0; all four validate.yml steps run by hand | ✅ met |

**7/7 covered by evidence in the diff**, not by assertion in the document. Each row names the test or
the mutation that would fail if the criterion regressed.

---

## Conformance Findings

```
[PC-1] trail · low · confidence: high — docs/tasks/task.98.bundle-freshness-check-mode/task.98.bundle-freshness-check-mode.md §7
  §7 Files Summary lists `bundle_skill.py`, `validate.yml` and "tests under tests/", but the PR also
  changes `package.json` (adding the `bundle:check` script) and
  `skills/create-skill/references/skill-dependencies.json` (the stale copy the check found). Both are
  justified and are described in the implementation report, the commit messages and the PR body — so
  this is drift between the plan and what shipped, not undocumented work.
  → Add both to §7 Files Summary so the task document matches the change it produced.

[PC-2] scope · low · confidence: high — review methodology
  This skill's default diff scoping excludes `*/references/*` as bundler-generated noise. On THIS PR
  that filter hides `skills/create-skill/references/skill-dependencies.json` — the file whose staleness
  is the PR's headline result. A reviewer applying the default would review a change about bundled-copy
  freshness while excluding the bundled copy at issue.
  → No action on this PR (the exclusion was overridden and the file reviewed). Recorded because the
    general lesson is real: the exclusion is a heuristic about intent, and a PR whose subject IS the
    generated tree inverts it.
```

Coverage: no gaps. Scope: no drift beyond PC-1. Consistency: the task document, the three gates, the
tracker issue and the PR body all agree on what was built and what was found.

---

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — skills/create-skill/scripts/bundle_skill.py (orphan-scan onerror)
  When the unwalkable directory IS `references/` itself, `relative_to` raises and `rel` falls back to
  '.', so the finding renders as `references/.` — correct but awkward.
  → Render the bare directory as `references/` when rel is '.'.

[CR-2] cleanup · low · confidence: high — skills/create-skill/scripts/bundle_skill.py (`check_all` summary)
  A run whose only outcome is an unresolvable target prints
  `❌ bundle freshness: 0 problem(s) across 0 skill(s)` before the line explaining that 1 target could
  not be resolved. The ❌ and the exit code (1) are both right; the "0 problem(s)" phrasing reads as a
  clean result attached to a failure marker.
  → Branch the summary when `all_problems` is empty but `unresolved` is not.
```

No correctness bugs. Specifically probed and clean: the two new branches do not double-report (a real
directory reaches `unwalkable` but never `walked`, since only symlinked directories are collected);
`os.walk` still reaches nested paths (pinned by a test); the symlinked-directory compensation for the
`rglob` → `os.walk` switch is present and now guarded (M18).

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.98.bundle-freshness-check-mode/task.98.bundle-freshness-check-mode.md"
    finding: "§7 Files Summary omits package.json and skills/create-skill/references/skill-dependencies.json, both of which the PR changes."
    suggested_action: "Add both entries to §7 Files Summary."
  - id: PC-2
    category: scope
    severity: low
    confidence: high
    ref: "review methodology"
    finding: "The default */references/* diff exclusion would hide this PR's headline change, because the PR's subject is the generated tree itself."
    suggested_action: "None on this PR — the exclusion was overridden and the file reviewed; recorded as a general lesson."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/create-skill/scripts/bundle_skill.py"
    finding: "An unwalkable references/ directory itself renders as `references/.` because rel falls back to '.'."
    suggested_action: "Render the bare directory as `references/` when rel is '.'."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/create-skill/scripts/bundle_skill.py"
    finding: "An unresolvable-target-only run prints '0 problem(s) across 0 skill(s)' beside a failure marker."
    suggested_action: "Branch the summary when all_problems is empty but unresolved is not."
truncated_count: 0
```

---

## Recommended Actions

1. **PC-1** — add `package.json` and `skills/create-skill/references/skill-dependencies.json` to §7
   Files Summary. One-line documentation fix; the work itself is sound and documented elsewhere.
2. **CR-1 / CR-2** — two cosmetic message improvements. Neither affects a verdict, an exit code or a
   classification. Fold in if convenient; otherwise carry as follow-ups.

None of these blocks the merge. The verdict is APPROVE under the deterministic table: no finding
reaches `severity: medium`.

---

## Assessment

The change does what its work item promised, and the evidence behind it is real rather than asserted.
Three things stand out on a read of the whole trail:

- **The deliverable proved itself on contact with reality.** It found a genuine stale bundled copy —
  missing an `observe-work → create-skill` dependency edge — that the existing CI check is
  structurally incapable of seeing. That is the strongest possible argument for the task, and it was
  discovered rather than constructed.
- **The QA loop worked as designed rather than as theatre.** Cycle 2's refute pass found a HIGH
  defect *in cycle 1's own fix* — a clean result reported over a file that could not be read — and
  cycle 3 then found a third instance of the same class one level up. A narrowed re-review would have
  found neither.
- **Two mutations proved nothing, and both were treated as findings about the tests.** M3 and M18
  each drove a new test rather than a quiet edit. That is the discipline the task's §8 asked for,
  actually applied.

The honest caveat is at the top: both lenses ran inline, so this review is less independent than the
skill intends.

**Verdict: ✅ APPROVE** — proceed to Step 7 `/finalise`.
