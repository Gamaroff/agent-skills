# PR Review Report: PR #534 — test(reference-docs): pin commands.md and activation-phrases.md to the skills they name (task 142)

**Reviewed:** 2026-09-30
**PR:** [#534](https://github.com/Gamaroff/agent-skills/pull/534) — `feature/task.142.reference-doc-skill-pinning` → `develop` (OPEN)
**Work item:** [`task.142.reference-doc-skill-pinning.md`](./task.142.reference-doc-skill-pinning.md) — resolved via `branch-stem`
**Tracker:** [#467](https://github.com/Gamaroff/agent-skills/issues/467) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.142.implementation.1.reference-doc-skill-pinning-initial-run.md |
| Review report | ✅ | task.142.review.1.reference-doc-skill-pinning.md |
| QA reports | 1 | task.142.qa.1.reference-doc-skill-pinning.md |
| Gate | PASS | task.142.gate.1.reference-doc-skill-pinning.yml (100) |
| DoD | ❌ | not yet — pipeline Step 7 runs after this review |
| Sprint review | ❌ | not yet — written by Step 7 |
| Open bugs | 0 | — |
| Handover | ❌ | none — full tracker access, nothing deferred |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Every `commands.md` command resolves to a skill or `NON_SKILL_ROWS` | `tests/reference-doc-skill-pinning.test.js` — "every row resolves to a skill", "NON_SKILL_ROWS is exactly the set…" | ✅ met |
| Every advertised `--flag` exists in the skill's `SKILL.md` | "every flag a row advertises is documented by that skill" (substring match — see CR-1) | ✅ met |
| Every activation-table skill exists | "every named skill exists" | ✅ met |
| `/loop /develop-next` → `develop-next` | fixture test | ✅ met |
| Deleted skill / fake flag fail the test | mutation tables in the task Implementation Notes and QA report | ✅ met |
| No spawn, no network; memoised reads | `skillMdCache`; `fs` only | ✅ met |
| Header states what is not pinned | file header comment | ✅ met |
| CHANGELOG `[Unreleased]` entry | `CHANGELOG.md` | ✅ met |
| Obs #159 → `actioned` | post-merge | — deferred by design |

Scope note: `*/references/*` excluded from the diff by default; nothing under it changed.

## Conformance Findings

None.

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — tests/reference-doc-skill-pinning.test.js:265
  The flag check uses body.includes(flag), so a flag also passes when SKILL.md holds only a longer flag that starts with it (--read on --readonly); no current row relies on it.
  → Match with a trailing boundary and add a prefix fixture.

[CR-2] cleanup · low · confidence: high — tests/reference-doc-skill-pinning.test.js:121
  extractActivationSkills computes a flags field that no live-corpus test reads.
  → Assert activation flags against SKILL.md, or drop the field and say so in the header.
```

## Machine-Readable Findings

```yaml
findings:
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "tests/reference-doc-skill-pinning.test.js:265"
    finding: "The flag check uses body.includes(flag), so a flag passes when SKILL.md holds only a longer flag that starts with it."
    suggested_action: "Match the flag with a trailing boundary and add a fixture where SKILL.md has only the longer flag."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "tests/reference-doc-skill-pinning.test.js:121"
    finding: "extractActivationSkills computes a flags field that no live-corpus test reads."
    suggested_action: "Assert activation flags against SKILL.md, or drop the field and note it in the header."
truncated_count: 0
```

## Recommended Actions

1. Merge-eligible. Optionally close CR-1 and CR-2 in a follow-up — both are low severity and already recorded in gate 1's `recommendations.future`.
