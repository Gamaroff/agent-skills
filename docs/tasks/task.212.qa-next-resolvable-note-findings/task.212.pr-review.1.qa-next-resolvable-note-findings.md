# PR Review Report: PR #680 — feat(task.212): qa-next note findings can be resolved, with evidence

**Reviewed:** 2026-10-16
**PR:** [#680](https://github.com/Gamaroff/agent-skills/pull/680) — `feature/task.212.qa-next-resolvable-note-findings` → `develop` (OPEN)
**Work item:** [`task.212.qa-next-resolvable-note-findings.md`](task.212.qa-next-resolvable-note-findings.md) — resolved via `branch stem`
**Tracker:** [#679](https://github.com/Gamaroff/agent-skills/issues/679) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.212.implementation.1.qa-next-resolvable-note-findings-initial-run.md` |
| Review report | ✅ | `task.212.review.1.qa-next-resolvable-note-findings.md` |
| QA reports | 4 | `task.212.qa.1` … `task.212.qa.4` |
| Gate | PASS | `task.212.gate.4.qa-next-resolvable-note-findings.yml` (100) |
| DoD | ❌ | not yet — Step 7 `/finalise` runs after this review |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| A sha-resolved note is closed and shown resolved | `uat-status.test.mjs` "CLI: a validly resolved note is closed…" | ✅ met |
| Absent sha keeps the row open; `--check` names `commit-not-found` | same test | ✅ met |
| Later run closes; self / earlier / missing / bad-evidence named | "verifyResolution names every reason" | ✅ met |
| Bug-link marker is ignored; `on-a-bug-link` is reported | pure + CLI tests | ✅ met |
| `--resolve-finding` changes one cell, is idempotent, and every refusal is byte-identical | writer, replacement, duplicate-number, read-back and CRLF tests | ✅ met |
| No-marker output unchanged | "a run file with no markers yields the same…" | ✅ met |
| `isOpenFinding` is pure | plain-object test | ✅ met |
| `npm test` / `ci:fast` with `.agents/skills` moved aside | 5773/0 (implementation report, cycle-3 fix gate) | ✅ met |
| Every criterion has a per-PR test | `evals/qa-next/unit/*.test.mjs` is in `npm test` | ✅ met |
| Template, SKILL and README state the grammar identically | doc-agreement test | ✅ met |
| Step 5 stages the earlier run files a run resolved | Step 5 block executed; `--changed-runs` non-default registry test | ✅ met |
| The "never does" exception is stated | doc-agreement test | ✅ met |

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — docs/tasks/task.212.qa-next-resolvable-note-findings/task.212.qa-next-resolvable-note-findings.md:296
  The Implementation Record still describes run 1 only. It has no row for --changed-runs, and its test counts (9 new, 68 pre-existing) predate QA cycles 1–3.
  → Add a --changed-runs row and current test counts, or mark the section as the run-1 snapshot and point to the QA reports.

[PC-2] scope · low · confidence: medium — docs/tasks/task.212.qa-next-resolvable-note-findings/task.212.qa-next-resolvable-note-findings.md:141
  --changed-runs appears only in §3 Target. §4 In Scope, §7 and §9 do not name it, even though the diff ships it with its own usage line and tests.
  → Name --changed-runs in §4 In Scope and in the §9 Step 5 staging criterion.
```

## Code Review Findings

Skipped (`--no-code`). The develop pipeline's QA step ran the code reviewer in all four cycles, with `code_review_blocking=true`.

**Anchors:** 2 checked against `82f98e478849a9370ef6381230b4d420b398d7ec` (via `head-branch`) — all verified (`unchecked-text` ×2).

## Machine-Readable Findings

```yaml
reviewed_gate: task.212.gate.4.qa-next-resolvable-note-findings.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.212.qa-next-resolvable-note-findings/task.212.qa-next-resolvable-note-findings.md:296"
    anchor_check: unchecked-text
    finding: "The Implementation Record describes run 1 only: no --changed-runs row, and test counts that predate QA cycles 1–3."
    suggested_action: "Add a --changed-runs row and current test counts, or mark the section as the run-1 snapshot."
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "docs/tasks/task.212.qa-next-resolvable-note-findings/task.212.qa-next-resolvable-note-findings.md:141"
    anchor_check: unchecked-text
    finding: "--changed-runs is recorded only in §3 Target; §4 In Scope, §7 and §9 do not name it."
    suggested_action: "Name --changed-runs in §4 In Scope and in the §9 Step 5 staging criterion."
truncated_count: 0
```

## Recommended Actions

1. Fold PC-1 and PC-2 into the acceptance commit. Both are edits to the work item only.
