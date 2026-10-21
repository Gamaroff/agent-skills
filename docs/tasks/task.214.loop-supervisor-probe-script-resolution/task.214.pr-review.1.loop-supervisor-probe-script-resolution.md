# PR Review Report: PR #722 — fix(task.214): loop-supervisor finds select-next.mjs wherever the skills are installed

**Reviewed:** 2026-10-21
**PR:** [#722](https://github.com/Gamaroff/agent-skills/pull/722) — `feature/task.214.loop-supervisor-probe-script-resolution` → `develop` (OPEN)
**Work item:** [`task.214.loop-supervisor-probe-script-resolution.md`](./task.214.loop-supervisor-probe-script-resolution.md) — resolved via `branch stem`
**Tracker:** [#721](https://github.com/Gamaroff/agent-skills/issues/721) — OPEN (closes on merge)
**Verdict:** ✅ APPROVE

**Scope:**
- The diff is `origin/develop...origin/feature/task.214.loop-supervisor-probe-script-resolution`, 1237 lines. The default `*/references/*` exclusion was **not** applied, because `skills/loop-supervisor/references/adapters.js` is authored code named in the task's Files Summary, not a bundled copy. No bundled copies are in the diff.
- Run with `--no-code`: the Step 5a QA pass already ran the code lens over this diff.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.214.implementation.1.loop-supervisor-probe-script-resolution-initial-run.md |
| Review report | ✅ | task.214.review.1.loop-supervisor-probe-script-resolution.md |
| QA reports | 1 | task.214.qa.1.loop-supervisor-probe-script-resolution.md |
| Gate | PASS | task.214.gate.1.loop-supervisor-probe-script-resolution.yml (100) |
| DoD | ❌ | not yet: the task is `ready-for-review`, and `/finalise` writes it |
| Sprint review | ❌ | not yet: written by `/finalise` |
| Open bugs | 0 | — |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `.agents/skills` copy alone → selected | `evals/loop-supervisor/unit/adapters.test.mjs`, each-candidate-alone tests | ✅ met |
| `.claude/skills` or `skills` copy alone → selected | the same tests | ✅ met |
| None present → the `skills/…` default and today's error | none-present tests; the `firstExisting` fallback | ✅ met |
| An override is returned verbatim | the override-while-all-three-exist test | ✅ met |
| At most three `exists` calls | the call-count test | ✅ met |
| Suite passes locally and in CI, with no symlink reliance | temp-`cwd` tests; QA ran them in a symlink-free worktree | ✅ met |
| `npm run validate -- skills/loop-supervisor/` | QA cycle 1: exit 0 | ✅ met |
| Two documentation sentences | `skills/loop-supervisor/README.md`, `docs/reference/configuration.md` | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: low — pr_number
  The task frontmatter has no pr_number field, but the implementation report's step 4 row names PR #722; earlier tasks (task.222, task.223) only gained pr_number at their finalise commit, so this may be expected at this stage.
  → Add `pr_number: 722` to the frontmatter of docs/tasks/task.214.loop-supervisor-probe-script-resolution/task.214.loop-supervisor-probe-script-resolution.md, at the latest during /finalise.
```

## Code Review Findings

Skipped (`--no-code`). The Step 5a QA pass reviewed this diff: two advisory findings, see the QA report.

**Anchors:** 1 checked against `f57324f4e78f7dfa4b7b74433c86183b1ca73aca` (via `head-branch`) — all verified (1 `no-line`: a frontmatter-field ref).

## Machine-Readable Findings

```yaml
reviewed_gate: task.214.gate.1.loop-supervisor-probe-script-resolution.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "pr_number"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number field, but the implementation report's step 4 row names PR #722; earlier tasks (task.222, task.223) only gained pr_number at their finalise commit, so this may be expected at this stage."
    suggested_action: "Add `pr_number: 722` to the frontmatter of the task document, at the latest during /finalise."
truncated_count: 0
```

## Recommended Actions

1. Let `/finalise` write `pr_number: 722` with the acceptance (PC-1).
