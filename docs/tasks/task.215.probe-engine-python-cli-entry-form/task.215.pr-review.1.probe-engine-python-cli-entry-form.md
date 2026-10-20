# PR Review Report: PR #692 — feat(task.215): security probe runs a Python CLI under the cli: entry form

**Reviewed:** 2026-10-19
**PR:** [#692](https://github.com/Gamaroff/agent-skills/pull/692) — `feature/task.215.probe-engine-python-cli-entry-form` → `develop` (OPEN)
**Work item:** [`task.215.probe-engine-python-cli-entry-form.md`](./task.215.probe-engine-python-cli-entry-form.md) — resolved via `branch-stem`
**Tracker:** [#689](https://github.com/Gamaroff/agent-skills/issues/689) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.215.implementation.1.probe-engine-python-cli-entry-form-initial-run.md |
| Review report | ✅ | task.215.review.1.probe-engine-python-cli-entry-form.md |
| QA reports | 7 | task.215.qa.1 … qa.7 (one per gate) |
| Gate | PASS | task.215.gate.7.probe-engine-python-cli-entry-form.yml (95) — cycle 7 entry reads `Proceeding to 5c` (route 2b) |
| DoD | ❌ | not yet — `/finalise` writes it (task not accepted) |
| Sprint review | ❌ | not yet — `/finalise` writes it |
| Open bugs | 0 | bugs 1–10 closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — `cli:<fixture>.py` returns `executed > 0` with the expected verdicts | `shared/resources/security-probe.mjs` (`runCliCase`, `.py` arm); test `a refusing .py CLI engages …` | ✅ met |
| SC2 — `.py` is no longer declined for the extension | interpreter map in `security-probe.mjs`; test `.py entry with no --argv is bad-argv` | ✅ met |
| SC3 — result and record carry `interpreter` | test `the record entry carries the interpreter …` | ✅ met |
| SC4 — a Python crash is `errored`, never `rejected`; `sys.exit(1)` stays `rejected` | exit record (`PYTHON_BOOTSTRAP`, `pythonExitRecord`), exit-120 branch; crash-shape tests and the plain-refusal control | ✅ met |

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.implementation.1.probe-engine-python-cli-entry-form-initial-run.md:7 ⚠️ unverified anchor (text-mismatch)
  The implementation report still says `**Status**: Escalated`, and its qa loop Pipeline Progress row still reads `🛑 Escalated`, though QA Cycle 7 records a PASS gate and `Proceeding to 5c`.
  → Change the report's Status and its qa loop progress row to match the cycle-7 exit to 5c.

[PC-2] consistency · low · confidence: medium — docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.probe-engine-python-cli-entry-form.md:17 ⚠️ unverified anchor (text-mismatch)
  The body status line reads `**Status:** In Progress` while the frontmatter says `status: ready-for-review`.
  → Change the body line to `**Status:** Ready for Review` so it matches the frontmatter.
```

Both facts are true at the PR head. The quoted text sits one line away from where the lens put it:
line 6, not 7, in the implementation report, and line 18, not 17, in the task document.

## Code Review Findings

Skipped (`--no-code`): QA's code reviewer ran on every cycle (`code_review_blocking=true`).

**Anchors:** 2 checked against `918e077c` (via `origin/feature/task.215.probe-engine-python-cli-entry-form`). 2 are unverified, both `text-mismatch`, each off by one line.

Scope: the generated `skills/*/references/` copies (10 files) and the probe run-record shards
(`*.run.json.d/*`) were excluded. The copies are byte-identical to `shared/resources/`, and
`npm run bundle:check` enforces that. The work item names them only as "bundled copies".

## Machine-Readable Findings

```yaml
reviewed_gate: task.215.gate.7.probe-engine-python-cli-entry-form.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.implementation.1.probe-engine-python-cli-entry-form-initial-run.md:7"
    anchor_check: text-mismatch
    finding: "The implementation report still says Status Escalated and its qa loop progress row reads Escalated, though QA Cycle 7 records a PASS gate and Proceeding to 5c."
    suggested_action: "Change the report's Status and its qa loop progress row to match the cycle-7 exit to 5c."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.probe-engine-python-cli-entry-form.md:17"
    anchor_check: text-mismatch
    finding: "The body status line reads In Progress while the frontmatter says status: ready-for-review."
    suggested_action: "Change the body line to Ready for Review so it matches the frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Align the task's body `**Status:**` line with its frontmatter (PC-2). `/finalise` rewrites both to Accepted.
2. Update the implementation report's Status and its qa-loop row now that the loop has exited (PC-1).
