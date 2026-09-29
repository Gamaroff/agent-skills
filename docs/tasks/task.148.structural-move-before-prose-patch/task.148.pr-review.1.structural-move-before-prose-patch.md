# PR Review Report: PR #492 — feat(task.148): offer a structural move before another prose patch (#478)

**Reviewed:** 2026-09-25
**PR:** [#492](https://github.com/Gamaroff/agent-skills/pull/492) — `feature/task.148.structural-move-before-prose-patch` → `develop` (OPEN)
**Work item:** [`task.148.structural-move-before-prose-patch.md`](./task.148.structural-move-before-prose-patch.md) — resolved via `branch-stem`
**Tracker:** [#478](https://github.com/Gamaroff/agent-skills/issues/478) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.148…`, excluding `*/references/*`, the four generated
copies of `qa-diminishing-returns.js` and `develop-pipeline-step-5-6-qa-loop.md`. None of them is named
as an authored change: the Files Summary lists them under "Generated". Effort: medium.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.148.implementation.1.structural-move-before-prose-patch-initial-run.md |
| Review report | ✅ | task.148.review.1.structural-move-before-prose-patch.md |
| QA reports | 3 | task.148.qa.{1,2,3}.structural-move-before-prose-patch.md |
| Gate | PASS | task.148.gate.3.structural-move-before-prose-patch.yml (100) |
| DoD | ❌ (expected) | Step 7 `/finalise` writes it next |
| Sprint review | ❌ (expected) | Step 7 |
| Open bugs | 0 | bugs 1–3 closed |
| Handover | n/a | no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Fires on task.143 at cycles 2, 3, 6 only | `qa-narrowing-residue.test.mjs` rows 1–7, whole-run test | ✅ met |
| Declines on HIGH / differing files / missing file / unreadable; counts closed | rows 8, 10–15 | ✅ met |
| `classifyLoopRoute` unchanged | `qa-loop-route.test.mjs` 2 rows; source read + deep-equal pairs | ✅ met |
| 5b offer runs from a consumer cwd, signal true at cycle 3 | `qa-narrowing-offer-wiring.test.mjs` (bash + zsh) | ✅ met |
| Step 2.6 triggers, moves, summary shape | `qa-fix-structural-move.test.js` | ✅ met |
| Population returns the restating files in the fixture repo | same test — 4 paths (widened from 3 in QA cycle 1) | ⚠️ partial — the task text still says 3 (PC-1) |
| Row 1 requires `Probe:`, cites obs #177 | same test | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.148 §9 / §8 vs tests/qa-fix-structural-move.test.js:167
  A ticked criterion and the §8 test description still say the population test asserts 3 files, and
  the Implementation Record says "15 rows"; what shipped asserts 4 paths and has 16 predicate rows.
  → Update §9, §8 and the Implementation Record before /finalise.

[PC-2] consistency · low · confidence: low — task.148 frontmatter
  No pr_number:, and the body never mentions PR #492.
  → /finalise adds pr_number: 492, or add it now.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/qa-fix/SKILL.md:699
  The population command's `git grep -F` matches within one line, and the searched files are
  hard-wrapped, so a restatement whose phrase breaks across a line is left out. This diff contains
  one ("in this file or in another\nfile that restates it"). The "never record 0" guard catches only
  a missed edited file, so an undercounted population is recorded as complete.
  → Tell the fixer to choose a phrase that cannot wrap (one distinctive token), or search with
    line-break tolerance; add a fixture where the phrase is split across a line.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.148.structural-move-before-prose-patch.md §9 vs tests/qa-fix-structural-move.test.js:167"
    finding: "A ticked criterion, the §8 description and the Implementation Record still state 3 population paths and 15 rows; the tests assert 4 paths and 16 rows."
    suggested_action: "Update §9, §8 and the Implementation Record before /finalise."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "task.148.structural-move-before-prose-patch.md frontmatter"
    finding: "The task document has no pr_number and does not mention PR #492."
    suggested_action: "Let /finalise add pr_number: 492, or add it now."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/qa-fix/SKILL.md:699"
    finding: "git grep -F matches within one line, so a phrase that wraps across a line is missed and the population is undercounted without warning."
    suggested_action: "Choose a phrase that cannot wrap, or make the search tolerate line breaks; add a split-phrase fixture."
truncated_count: 0
```

## Recommended Actions

1. Fix PC-1 before `/finalise`, so the ticked criteria match the tests that hold them.
2. Take CR-1 together with the gate-3 advisory finding on the same population rule ("never record
   0"). Both are about when the population can be trusted, so raise them as one follow-up task.
