# PR Review Report: PR #549 — feat(task.157): context-pressure trigger — recommend a continuation handoff before the context fills

**Reviewed:** 2026-10-02
**PR:** [#549](https://github.com/Gamaroff/agent-skills/pull/549) — `feature/task.157.context-pressure-handoff-trigger` → `develop` (OPEN)
**Work item:** [`task.157.context-pressure-handoff-trigger.md`](./task.157.context-pressure-handoff-trigger.md) — resolved via `branch-stem`
**Tracker:** [#491](https://github.com/Gamaroff/agent-skills/issues/491) — OPEN
**Verdict:** ✅ APPROVE

Scope: `origin/develop...origin/feature/task.157.context-pressure-handoff-trigger`, excluding
`*/references/*` (the three bundled copies under `skills/session-handoff/references/` are byte copies
of `shared/resources/context-pressure*` plus an AUTO-GENERATED header; none is named as an authored
change in the work item, PR body or commit subjects). Effort: medium. Invoked by `/develop-task`
Step 5c.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.157.implementation.1.context-pressure-handoff-trigger-initial-run.md |
| Review report | ✅ | task.157.review.1.context-pressure-handoff-trigger.md |
| QA reports | 5 | task.157.qa.1 … qa.5 |
| Gate | PASS | task.157.gate.5.context-pressure-handoff-trigger.yml (100) |
| DoD | ❌ (expected) | not yet — `/finalise` has not run |
| Sprint review | ❌ (expected) | not yet — `/finalise` has not run |
| Open bugs | 0 | — |
| Handover | ❌ | none (no deferred tracker actions) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Soft once on entering SOFT; firm on FIRM, repeated every REPEAT | `decide()`; `context-pressure.test.mjs` band/hysteresis/repeat tests | ✅ met |
| Nothing for stale / missing / corrupt; exit 0 on every input | stale + corrupt + contract tests | ✅ met |
| Wrapper stdout and exit code equal the original's | `context-pressure-statusline.test.mjs` byte identity, exit 3 | ✅ met |
| Install then uninstall equal as parsed JSON; second install changes nothing | `context-pressure-install.test.mjs` round-trip, re-install byte-identical | ✅ met |
| Invalid `session_id` never writes outside the state dir | listing-unchanged test; probe engages (20) | ✅ met |
| `check` p95 < 150 ms; status line overhead < 50 ms | implementation report: 113 ms; +16–21 ms | ✅ met |
| `npm test`, `bundle:check`, `lint-shell.sh`, mutation proofs | QA reports 1–5 | ✅ met |
| CHANGELOG entry; SKILL documents install, uninstall, knobs, silence | `CHANGELOG.md`, `skills/session-handoff/SKILL.md` | ✅ met |
| Manual install verified on this machine | done on a copy of `~/.claude/settings.json`; the live file left to the user | ⚠️ partial (deliberate) |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.157 closing block "Next Steps: 1. Land task.156 first 2. Implement … 3. Hand off to QA"
  The closing Next Steps still list pre-implementation actions although the document reads ready-for-review with QA PASS at gate 5.
  → Update the closing Next Steps to the current state (awaiting /finalise and merge of PR #549).

[PC-2] consistency · low · confidence: medium — frontmatter: no pr_number
  The work item does not point at PR #549 anywhere.
  → Add pr_number: 549 (/finalise does this).

[PC-3] scope · low · confidence: medium — Task §1 Scope "one engine (record and check sub-commands)" vs context-pressure.mjs `settings` sub-command
  The engine's third `settings` sub-command, the shell-word parser and the needs-manual outcome are not described in the work item's Target Architecture or Phase 3.
  → Amend Target Architecture and Phase 3 to describe them.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/context-pressure.mjs:3128 (diff line)
  After an idle pause longer than CONTEXT_PRESSURE_MAX_AGE_MIN the next prompt treats a still-accurate reading as stale, so the note arrives one prompt late.
  → Measure staleness against activity, or document the pause in the SKILL.md silence list.

[CR-2] cleanup · low · confidence: high — shared/resources/context-pressure.mjs:3522 (diff line)
  The install branch calls unwrapCommand(sl.command) twice.
  → Compute it once before the if/else chain.

[CR-3] cleanup · low · confidence: high — shared/resources/context-pressure.mjs:3462 (diff line)
  The applySettings JSDoc sits above SettingsShapeError instead of the function.
  → Move it down to applySettings.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.157 closing Next Steps block"
    finding: "The closing Next Steps still list pre-implementation actions although the document reads ready-for-review with QA PASS at gate 5."
    suggested_action: "Update the closing Next Steps to the current state."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "frontmatter pr_number"
    finding: "The work item does not point at PR #549 anywhere."
    suggested_action: "Add pr_number: 549 to the frontmatter."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "Task §1 Scope vs context-pressure.mjs settings sub-command"
    finding: "The settings sub-command, shell-word parser and needs-manual outcome are not described in the work item."
    suggested_action: "Amend Target Architecture and Phase 3 to describe them."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/context-pressure.mjs:3128"
    finding: "After an idle pause longer than the freshness window the next prompt treats a still-accurate reading as stale."
    suggested_action: "Measure staleness against activity, or document the pause in the SKILL.md silence list."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/context-pressure.mjs:3522"
    finding: "The install branch calls unwrapCommand twice."
    suggested_action: "Compute it once before the if/else chain."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/context-pressure.mjs:3462"
    finding: "The applySettings JSDoc sits above SettingsShapeError."
    suggested_action: "Move it down to applySettings."
truncated_count: 0
```

## Recommended Actions

1. Merge after `/finalise` — no finding blocks.
2. PC-1, PC-2, PC-3: bring the work item's closing block, `pr_number` and Target Architecture up to date (finalise-time document edits).
3. CR-1: document the idle-pause behaviour in the SKILL silence list, or measure freshness against activity in a follow-up.
