# PR Review Report: PR #527 — fix(task.140): shell-fn sentinel and fake-gh coverage reach every library shape

**Reviewed:** 2026-09-30
**PR:** [#527](https://github.com/Gamaroff/agent-skills/pull/527) — `feature/task.140.shell-fn-sentinel-hardening` → `develop` (OPEN)
**Work item:** [`task.140.shell-fn-sentinel-hardening.md`](./task.140.shell-fn-sentinel-hardening.md) — resolved via `branch-stem`
**Tracker:** [#464](https://github.com/Gamaroff/agent-skills/issues/464) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.140.shell-fn-sentinel-hardening`, excluding `*/references/*` (6 auto-generated bundled copies; none named in the Files Summary or a commit subject). Effort: medium. Run as develop-task Step 5c, before `/finalise`, so the missing DoD and sprint review are expected.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.140.implementation.1.shell-fn-sentinel-hardening-initial-run.md |
| Review report | ✅ | task.140.review.1.shell-fn-sentinel-hardening.md |
| QA reports | 5 | task.140.qa.1–5.shell-fn-sentinel-hardening.md |
| Gate | PASS | task.140.gate.5.shell-fn-sentinel-hardening.yml (100) |
| DoD | ❌ (Step 7 not yet run) | — |
| Sprint review | ❌ (Step 7 not yet run) | — |
| Open bugs | 0 | bug.1–7 all Closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Criteria are traced in the QA reports (qa.1 matrix, gates 1–5), and the conformance lens raised no coverage findings.

## Conformance Findings

```
[PC-2] consistency · medium · confidence: high — task.140.shell-fn-sentinel-hardening.md frontmatter
  No pr_number field and no PR #527 in the body, so /finalise Step 3a gets an empty PR_NUMBER and diffs HEAD~1 only.
  → Add `pr_number: 527` to the frontmatter before /finalise.

[PC-5] scope · medium · confidence: medium — shared/resources/security-probe.mjs (tripwireGh, source-completed marker, run-time decline)
  The run-time trip-wire gh, the source-completed marker and the ancestor realpath, all added in QA cycles 2–3, are not described in §1/§3/§6 or the Implementation Summary.
  → Add a deviation bullet naming them and the limits stated in rule §5.

[PC-1] trail · low · confidence: high — implementation report § Completion
  Completion still records the cycle-3 halt as final, while QA Cycle 5 shows PASS and 5c.
  → Mark it superseded or let Step 8 rewrite it.

[PC-3] consistency · low · confidence: high — task § Implementation Summary
  Test counts (105, 7 mutants) are pre-QA; the final count is 115.
  → Update the counts or mark them as pre-QA.

[PC-4] consistency · low · confidence: medium — task § Progress Tracking
  The QA and Gate boxes are unticked although five of each exist.
  → Tick them and point them at qa.5 and gate.5.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/security-probe.mjs:3562
  The `exit` shadow is inherited by subshells and command substitutions during source, so a top-level `x=$(exit 0)` returns 97.
  → Call builtin exit with the caller's status when not at the source's top level, or state the case in rule §5.

[CR-2] cleanup · low · confidence: high — shared/resources/security-probe.mjs:3601
  repoRoot is realpath'd 3–4 times per run.
  → Compute the real root once and pass it in.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "task.140.shell-fn-sentinel-hardening.md frontmatter"
    finding: "No pr_number field and no PR #527 in the body, so /finalise Step 3a gets an empty PR_NUMBER."
    suggested_action: "Add pr_number: 527 to the frontmatter before /finalise."
  - id: PC-5
    category: scope
    severity: medium
    confidence: medium
    ref: "shared/resources/security-probe.mjs (tripwireGh, source-completed marker, run-time decline)"
    finding: "The trip-wire gh, source-completed marker and ancestor realpath added in QA are not described in the task document."
    suggested_action: "Add a deviation bullet to the Implementation Summary naming them and the section 5 limits."
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "implementation report § Completion"
    finding: "Completion records the cycle-3 halt as final."
    suggested_action: "Mark it superseded or let Step 8 rewrite it."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "task § Implementation Summary"
    finding: "Test counts are pre-QA."
    suggested_action: "Update to the final counts or mark as pre-QA."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "task § Progress Tracking"
    finding: "QA and Gate boxes unticked."
    suggested_action: "Tick them, pointing at qa.5 and gate.5."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/security-probe.mjs:3562"
    finding: "The exit shadow is inherited by subshells and command substitutions during source."
    suggested_action: "Call builtin exit with the caller's status off the top level, or state it in rule section 5."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/security-probe.mjs:3601"
    finding: "repoRoot is realpath'd several times per run."
    suggested_action: "Compute the real root once and pass it in."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 527` to the task frontmatter before `/finalise` (PC-2).
2. Record the QA-cycle mechanisms as deviations in the Implementation Summary, and bring its counts and Progress Tracking up to date (PC-5, PC-3, PC-4).
3. Step 8 rewrites the implementation report's Completion block (PC-1).
4. CR-1 and CR-2: follow-up, beside the gh containment work.
