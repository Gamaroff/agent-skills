# PR Review Report: PR #531 — feat(qa): gates record the reviewed head:, cycle 3+ scopes from it (task.135)

**Reviewed:** 2026-09-30
**PR:** [#531](https://github.com/Gamaroff/agent-skills/pull/531) — `feature/task.135.gate-scoping-from-recorded-head` → `develop` (OPEN, head `65ea8a96`)
**Work item:** [`task.135.gate-scoping-from-recorded-head.md`](./task.135.gate-scoping-from-recorded-head.md) — resolved via `branch-stem`
**Tracker:** [#444](https://github.com/Gamaroff/agent-skills/issues/444) — OPEN (board In Progress)
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.135.implementation.1.gate-scoping-from-recorded-head-initial-run.md |
| Review report | ✅ | task.135.review.1.gate-scoping-from-recorded-head.md |
| QA reports | 4 | task.135.qa.1 … qa.4 |
| Gate | CONCERNS | task.135.gate.4.gate-scoping-from-recorded-head.yml (90) — reached 5c by route 3 |
| DoD | ❌ | not yet — Step 7 writes it |
| Sprint review | ❌ | not yet — Step 7 writes it |
| Open bugs | 0 | bugs 1–13 closed |
| Handover | ✅ | none — no deferred tracker actions |

Scope note: the diff excludes 16 generated `*/references/*` copies (byte-identical bundles of `shared/resources/`, checked by `bundle:check`). None is named by the work item's Files Summary, the PR body or a commit subject as a deliberate change.

The PR's own four gates were checked against the two 5c trail rows this PR adds: each `head:` resolves, is an ancestor of the PR head, and precedes its `updated:`.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Gate carries `schema: 2`, a 40-hex `head:`, a clock-written `updated:` | qa-task/qa-story/qa-gate/qa-fix templates + bind block; gates 1–4 | ✅ met |
| Cycle N+1 file list = `git diff --name-only <head>..HEAD` whatever `updated:` says | shared scope block (byte-identical ×3, test E); tests B, K | ✅ met |
| Trigger re-reviews after a commit a future-dated gate would hide | qa-task Phase 0 step 3; tests F1, F4–F9 | ✅ met |
| Schema-1 prior gate → unscoped with reason, never `--since` | test C | ✅ met |
| Freshness test green; mutation proofs; no `--since=` in scope paths | gate-head-freshness.test.mjs (criterion 3 amended in QA cycle 2, CR2-2); 21 mutations | ✅ met (as amended) |
| CHANGELOG names schema 2 as Breaking | CHANGELOG [Unreleased] › Changed | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.135.gate-scoping-from-recorded-head.md:249
  Risk Assessment §10 still says "the pipeline never rebases", contradicting the CR2-2 amendment.
  → Reword the probability line to name develop-batch's rebase and squash merges.

[PC-2] consistency · low · confidence: medium — task document § Change Log
  The criterion-3 amendment (CR2-2) has no Change Log row.
  → Append a row recording the amendment.

[PC-3] scope · low · confidence: medium — skills/qa-fix/SKILL.md, skills/qa-fix/resources/qa-gate-template.yaml, shared/resources/tests/qa-scope-from-head.test.mjs
  §4 In Scope and §7 Files Summary omit the qa-fix files (CR2-9) and the second new test.
  → Add them to §4 and §7.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/qa-task/SKILL.md:291
  The step-5 probe's qa-cycle.sh rebind discards rc and stderr: a refusal (two gates claiming one cycle) reads as "no gate" → SAFETY_REPROBE=false. Same at qa-story/SKILL.md:495.
  → Check rc as Step 1 does; keep stderr.

[CR-2] bug · low · confidence: high — shared/resources/tests/gate-head-freshness.test.mjs:53
  field() strips quotes before trimming: `head: '<sha>'  ` reads `<sha>'`, where the shell sed reads `<sha>`.
  → Trim before stripping quotes; add a trailing-whitespace fixture.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.135.gate-scoping-from-recorded-head.md:249"
    finding: "Risk Assessment §10 still says the pipeline never rebases, contradicting the CR2-2 amendment."
    suggested_action: "Reword the probability line to name develop-batch's rebase and squash merges."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "task.135.gate-scoping-from-recorded-head.md § Change Log"
    finding: "The criterion-3 amendment (CR2-2) has no Change Log row."
    suggested_action: "Append a row recording the amendment."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "skills/qa-fix/SKILL.md"
    finding: "§4 and §7 omit the qa-fix files changed under CR2-9 and the qa-scope-from-head test."
    suggested_action: "Add them to §4 In Scope and §7 Files Summary."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/qa-task/SKILL.md:291"
    finding: "The step-5 probe's qa-cycle.sh rebind discards rc and stderr, so a helper refusal reads as no gate and SAFETY_REPROBE=false."
    suggested_action: "Check rc as Step 1 does and keep stderr."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/tests/gate-head-freshness.test.mjs:53"
    finding: "field() strips quotes before trimming, so a quoted value with trailing whitespace reads with a stray quote."
    suggested_action: "Trim before stripping quotes; add a trailing-whitespace fixture."
truncated_count: 0
```

## Recommended Actions

1. PC-1, PC-2, PC-3 — bring the task document in line with what shipped (document-only).
2. CR-1, CR-2 — follow-up: check the step-5 helper's rc; trim before unquoting in `field()`.
3. Carried from QA cycles 3–4 (advisory): CR4-1 validate `head:` in the trigger, CR4-2 `--literal-pathspecs`, CR3-4 recompute clause 1 in the scope block, CR3-7 uncommitted fixes not in scope.
