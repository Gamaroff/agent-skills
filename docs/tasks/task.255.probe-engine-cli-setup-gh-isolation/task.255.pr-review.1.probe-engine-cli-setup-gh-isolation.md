# PR Review Report: PR #821 — fix(probe): a cli: fixture setup runs under the trip-wire gh and a gh-free PATH (task.255)

**Reviewed:** 2026-11-03
**PR:** [#821](https://github.com/Gamaroff/agent-skills/pull/821) — `feature/task.255.probe-engine-cli-setup-gh-isolation` → `develop` (open)
**Work item:** [`task.255.probe-engine-cli-setup-gh-isolation.md`](./task.255.probe-engine-cli-setup-gh-isolation.md) — resolved via `branch stem`
**Tracker:** [#820](https://github.com/Gamaroff/agent-skills/issues/820) — open
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`; the code lens ran in `/qa-task` with `code_review_blocking=true`). The patch excluded the bundled `*/references/*` copies. None of them is named in the task's Files Summary as authored change; they are the generated copies of `shared/resources/` sources.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.255.implementation.1.probe-engine-cli-setup-gh-isolation-initial-run.md |
| Review report | ✅ | task.255.review.1.probe-engine-cli-setup-gh-isolation.md |
| QA reports | 1 | task.255.qa.1.probe-engine-cli-setup-gh-isolation.md |
| Gate | PASS | task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml (100) |
| DoD | ❌ | not yet written — `/finalise` (Step 7) writes it after this review |
| Sprint review | ❌ | written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none outstanding |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| A missed `gh` spelling in a `cli:` setup declines `needs-fake-gh` | split-name and command-substitution tests in `security-probe.test.mjs` | ✅ met |
| A git-only setup still runs and is scored | git-only setup test | ✅ met |
| The `cli:` entry's PATH is unchanged | entry-PATH test; `setupEnv` is a copy | ✅ met |
| `runCaseSetup` still called by both arms | two call sites in `security-probe.mjs` | ✅ met |
| No `--fixture-setup` → no `bin/gh`, no extra spawn | spawn-count test | ✅ met |
| `ghFreePath` called once per case at most | one call in `runCliCase` | ✅ met |
| Probe tests, `npm test`, guard mutations | QA report 1 | ✅ met (one CI-only zsh guard fails on this laptop only) |
| CHANGELOG, `probe-boundary-rule.md`, `bundle:check` | CHANGELOG entry, rule paragraph, bundles | ✅ met |

## Conformance Findings

[PC-1] consistency · medium · confidence: high — docs/tasks/task.255.probe-engine-cli-setup-gh-isolation/task.255.probe-engine-cli-setup-gh-isolation.md
  The task frontmatter has no `pr_number` field, although PR #821 is open and the implementation report names it.
  → Add `pr_number: 821` to the task frontmatter.
  _Note: `/finalise` Step 7 is the one writer of `pr_number:` and writes it at acceptance. Not hand-written here; it clears when `/finalise` runs._

[PC-2] trail · low · confidence: medium — docs/tasks/task.255.probe-engine-cli-setup-gh-isolation/task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml
  The gate's `status_reason` said two guard mutations were re-proven red, but the QA report and the success criterion record three (M1, M2, M3).
  → Correct the gate's `status_reason`.
  _Fixed in this review: the gate and the QA report rationale now say three._

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `ff0eefe991e7` (via `head-branch`) — all verified (`no-line`: both findings name a file, not a line)

## Machine-Readable Findings

```yaml
reviewed_gate: task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.255.probe-engine-cli-setup-gh-isolation/task.255.probe-engine-cli-setup-gh-isolation.md"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number field, although PR 821 is open and the implementation report names it."
    suggested_action: "Add pr_number 821 to the task frontmatter; finalise Step 7 writes it at acceptance."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.255.probe-engine-cli-setup-gh-isolation/task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml"
    anchor_check: no-line
    finding: "The gate status_reason said two guard mutations were re-proven red, but the QA report records three."
    suggested_action: "Correct the gate status_reason to say three guard mutations."
truncated_count: 0
```

## Recommended Actions

1. Run `/finalise`; it writes `pr_number: 821` and the DoD, which clears PC-1.
