# PR Review Report: PR #644 — fix(task.184): qa-results carried-block and log residuals

**Reviewed:** 2026-10-13
**PR:** [#644](https://github.com/Gamaroff/agent-skills/pull/644) — `feature/task.184.qa-results-carried-block-and-log-residuals` → `develop` (OPEN)
**Work item:** [`task.184.qa-results-carried-block-and-log-residuals.md`](./task.184.qa-results-carried-block-and-log-residuals.md) — resolved via `branch stem`
**Tracker:** [#572](https://github.com/Gamaroff/agent-skills/issues/572) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.184.implementation.1.qa-results-carried-block-and-log-residuals-initial-run.md` (final state committed at Step 8) |
| Review report | ✅ | `task.184.review.1.qa-results-carried-block-and-log-residuals.md` |
| QA reports | 4 | `task.184.qa.1` … `task.184.qa.4` |
| Gate | PASS | `task.184.gate.4.qa-results-carried-block-and-log-residuals.yml` (100) |
| DoD | — | not yet — Step 5c runs before `/finalise` |
| Sprint review | — | not yet — same reason |
| Open bugs | 0 | `task.184.bug.1`, `task.184.bug.2` — both closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| CR-1 nested shape keeps `[a]`, `[b]` across three writes | `shared/resources/tests/qa-results.test.mjs` R5 | ✅ met |
| CR-2 both variants refuse with `structural-line:` | R6 | ✅ met |
| CR3-2 shape refuses; G1 still `replaced` | R3; G1 | ✅ met |
| CR6-1 refuses with `carried-tail:- [b](./b.md)` | R7 | ✅ met |
| Suites under 2 s, `uptime` recorded | measured at QA cycles 3–4 relative to the cycle-0 head; idle re-measure at `/finalise` | ⚠️ partial (by design) |
| No network access | one `require(`, of `./change-log.js` | ✅ met |
| Corpus survey 0/0/0 | `tests/qa-results-corpus.test.js` | ✅ met |
| R5–R7 mutation-proved | implementation report, QA reports | ✅ met |
| CHANGELOG `[Unreleased]` cites `(task 184)` | `CHANGELOG.md` — entry is under `v0.53.0` | ❌ unmet (PC-1) |
| Seven task.183 passages + one row | task.183 diff | ✅ met |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — CHANGELOG.md:919
  The Migration criterion says the CHANGELOG [Unreleased] cites (task 184) and is ticked, but the
  (task 184) entry sits under the released `## [v0.53.0] - 2026-10-07` / `### Fixed` heading
  (CHANGELOG.md:319), next to task 183's entry, not under `## [Unreleased]` (CHANGELOG.md:5).
  → Move the (task 184) entry into `## [Unreleased]` `### Fixed`; leave task 183's narrowed wording
    where it is.

[PC-2] consistency · low · confidence: medium — docs/tasks/task.184.qa-results-carried-block-and-log-residuals/task.184.qa-results-carried-block-and-log-residuals.md:432
  The Implementation Summary's testing results still give the develop-time figures (88/88 engine,
  101/101 in 1.08 s, only R5–R7 new); the QA Testing Results in the same document report 104 tests,
  and R8–R10 and the cycle-3 refactor shipped after the 1.08 s measurement.
  → Update the count, name R8–R10, mark 1.08 s as pre-QA until /finalise re-measures.

[PC-3] scope · low · confidence: medium — docs/tasks/task.184.qa-results-carried-block-and-log-residuals/task.184.qa-results-carried-block-and-log-residuals.md:195
  § 5 Breaking Changes lists two behaviour changes, but the shipped sectionGuard() adds a third: an
  up-front `unplaceable` refusal for a write whose written section the next write would refuse
  (R9). The CHANGELOG and both QA SKILL.md hints describe it; § 5 does not.
  → Add the unplaceable refusal, and the carried-tail exemption when another carried block carries
    the list, to § 5 with migration notes.
```

## Code Review Findings

Skipped (`--no-code`) — the QA loop's Step 3b ran the code reviewer every cycle with `code_review_blocking=true`.

**Anchors:** 3 checked against `4919f2834bf3` (via `head-branch`) — all verified.

**Scope note:** the diff excludes `skills/qa-task/references/qa-results.js` and `skills/qa-story/references/qa-results.js`, generated copies of `shared/resources/qa-results.js` that differ only by the AUTO-GENERATED header line.

## Machine-Readable Findings

```yaml
reviewed_gate: task.184.gate.4.qa-results-carried-block-and-log-residuals.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "CHANGELOG.md:919"
    anchor_check: ok
    finding: "The (task 184) CHANGELOG entry sits under the released v0.53.0 section, not under [Unreleased] as the ticked Migration criterion states."
    suggested_action: "Move the (task 184) entry into the [Unreleased] Fixed section."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.184.qa-results-carried-block-and-log-residuals/task.184.qa-results-carried-block-and-log-residuals.md:432"
    anchor_check: ok
    finding: "The Implementation Summary's testing results give develop-time figures that QA cycles 1–3 superseded."
    suggested_action: "Update the test count, name R8–R10, and mark the 1.08 s figure as pre-QA."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "docs/tasks/task.184.qa-results-carried-block-and-log-residuals/task.184.qa-results-carried-block-and-log-residuals.md:195"
    anchor_check: ok
    finding: "Section 5 Breaking Changes omits the up-front unplaceable refusal the shipped sectionGuard adds."
    suggested_action: "Add the unplaceable refusal and the carried-tail exemption to section 5 with migration notes."
truncated_count: 0
```

## Recommended Actions

1. Move the `(task 184)` CHANGELOG entry to `[Unreleased]` (PC-1).
2. Bring § 5 and the Implementation Summary in line with what shipped (PC-3, PC-2).
