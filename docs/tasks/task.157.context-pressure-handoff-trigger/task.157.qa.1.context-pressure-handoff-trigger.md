# QA Report: Task 157 - Context-pressure trigger: recommend a continuation handoff before the context fills

**Task**: [Link to task document](./task.157.context-pressure-handoff-trigger.md)
**Gate File**: [task.157.gate.1.context-pressure-handoff-trigger.yml](./task.157.gate.1.context-pressure-handoff-trigger.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #549. All four phases are delivered and the 31 new tests pass, including under
`TMPDIR=/tmp`; the session-id boundary engages under probing; performance targets are met. The diff
code review found three high-confidence correctness bugs in the installer's settings transform — one
medium (a re-install from a new location leaves the status line pointing at the old wrapper path) and
two low — which gate the cycle at CONCERNS under the pipeline's `code_review_blocking=true`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — TASK-157-CR-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (16/16 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#549, OPEN)

### Testing Approach

- [x] Automated Testing (unit, integration, contract)
- [x] Performance Testing (measured in development, re-read here)
- [x] Regression Testing (`npm run ci:fast`)
- [x] Security Review (probe engine)
- [x] Code Review (one read-only subagent)

### Review Methodology

Default strategy: direct tools first, one read-only Explore subagent for the diff code review (first
review, whole branch diff `origin/develop...HEAD`, 2775 lines). Reviewer dispatched 07:39Z, returned
in 153.8 s (`duration_ms` 153811). Step 4b ran over `skills/session-handoff/SKILL.md`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine `record` / `check` | PASS | Verified | `decide()` bands, hysteresis, repeat, freshness; session-id guard; contract test |
| Phase 2: Status line wrapper | PASS | Verified | byte identity + exit 3, broken engine, no node on PATH, metacharacter original |
| Phase 3: User-level installer | CONCERNS | Verified with findings | CR-1, CR-3, CR-4 in `applySettings` / `stripHooks` |
| Phase 4: Docs, bundle, changelog | PASS | Verified | SKILL section, `bundle:check` 0 problems, CHANGELOG entry |

**Overall Phase Completion**: 4/4 delivered, 1 with open findings

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Soft once on entering SOFT, firm on FIRM, repeat every REPEAT | yes | `decide` tests 1–4 | PASS |
| Nothing for stale / missing / corrupt; exit 0 everywhere | yes | stale + corrupt + contract tests | PASS |
| Wrapper stdout and exit code equal the original's | yes | byte-identical, exit 3 | PASS |
| Install then uninstall equal as parsed JSON; second install changes nothing | yes | equal for the fixture; **not** for empty-container inputs (CR-3) | CONCERNS |
| Invalid `session_id` never writes outside the state dir | yes | listing unchanged; probe 16/16 hostile rejected | PASS |

**Performance**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `check` p95 | < 150 ms | 113 ms | PASS |
| Status line overhead | < 50 ms | +16–21 ms | PASS |

**Code Quality**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm test` with new suites counted | pass | 4968/4971, 2 LOAD-SENSITIVE file budgets pass alone | PASS |
| `bundle:check` | 0 problems | 0 problems, 129 skills | PASS |
| `lint-shell.sh` | clean | clean (80 scripts) | PASS |
| Mutation proofs (hysteresis, freshness, identity dedupe) | each reds a named test | all three red (implementation report) | PASS |

---

## Breaking Changes Validation

None declared, none found — nothing is installed unless the user runs the installer. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: Re-install leaves the status line on the old wrapper path (TASK-157-CR-1)**
- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: `applySettings` install replaces every other spelling of the hook but treats any
  status line containing `context-pressure-statusline.sh` as "already wrapped — unchanged", whatever
  path it names.
- **Impact**: a user who first installs from a checkout and later, as SKILL.md advises, from the
  installed skill keeps a status line pointing at the checkout; deleting it blanks the status line.
- **Recommendation**: re-wrap the recovered original with the current wrapper when the paths differ.

### LOW Severity Issues (2)

- **TASK-157-CR-3** — uninstall deletes `hooks` / `UserPromptSubmit` containers it did not create
  (`{"hooks":{}}` → `{}`).
- **TASK-157-CR-4** — malformed `hooks` shapes: `hooks: []` reports success and writes no hook; a
  string `UserPromptSubmit` is spread into characters; an object-valued one throws and exits 1 silently.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (gating) — plus 3 advisory bugs and 2 cleanups below

---

## NFR Assessment

### Performance — PASS
`check` p95 113 ms; wrapper overhead +16–21 ms (20 runs, load average ~150).

### Reliability — PASS
Every `record` / `check` path exits 0 (contract test over ten inputs plus unknown subcommands);
the wrapper runs the original unchanged with a broken engine and with no `node` on `PATH`; malformed
settings are refused untouched. The open findings are installer-transform defects tracked above.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20
- `validSessionId` probed with `task.157.qa.1.security.cases.json` (4 legitimate session-id shapes,
  16 hostile: traversal, absolute, separators, NUL, newline, unicode slash, over-length, empty,
  `$(…)`): verdict `engages`, 0 reproduced. Record: `task.157.qa.1.security.run.json`. No network, no
  secrets, settings written atomically with a `.bak`.

### Maintainability — PASS
The settings edit is a pure, unit-tested function; the state format has one owner; three guards are
mutation-proven.

---

## Code Review

**Boundary rule**: `boundary: true` for `validSessionId` (the only gate between stdin and a
filename) — probed, `probes_executed: 20`. Other predicate-shaped functions in the diff:
`isHookIdentity` (identity match, not an accept/reject boundary — covered by the dedupe tests) and
`unshq` (`boundary: internal` — its only input is a status-line command this installer wrote; no
corpus sink models a shell-quoted word; covered by the round-trip test).

**Correctness bugs (6):**
- [medium/high] `shared/resources/context-pressure.mjs:404` — CR-1, gated (above).
- [medium/medium] `skills/session-handoff/SKILL.md:322` — CR-2: the documented install check (one
  prompt with `CONTEXT_PRESSURE_SOFT=1`) reads a working install as broken, since no reading exists
  before the first response → say two prompts, or check the state file.
- [low/high] `shared/resources/context-pressure.mjs:336` — CR-3, gated.
- [low/high] `shared/resources/context-pressure.mjs:376` — CR-4, gated.
- [low/low] `shared/resources/context-pressure.mjs:304` — CR-5: the original runs under `sh -c`; an
  original that needs bash syntax would break where `/bin/sh` is dash → confirm the shell Claude Code
  uses, or document it.
- [low/medium] `shared/resources/context-pressure-install.sh:101` — CR-6: the moved-in temp file is
  0600, so a 0644 settings file changes mode → copy the original mode onto it.

**Cleanups (2):**
- `shared/resources/tests/context-pressure-install.test.mjs:126` — CR-7: the `tr a A` assertion has
  no `a` to transform, so it passes trivially.
- `shared/resources/context-pressure.mjs:169` — CR-8: a failed `writeAtomic` leaves `*.tmp`, which
  `prune` never removes.

Promoted to `top_issues` (`code_review_blocking=true`): CR-1, CR-3, CR-4.

Provenance: every finding is in files this branch adds, so none is pre-existing.

**Step 4b**: `skills/session-handoff/SKILL.md` — 5 bash blocks, all refused as mutating (they run
installers and write files): `no-executable-blocks` (information, not a finding).

**Platform variance**: `TMPDIR=/tmp command node --test shared/resources/tests/context-pressure*.test.mjs`
→ 31/31, exit 0.

**Mutation proofs** (Step 3 development, re-read here — no fix this cycle to prove):
- mutation-proven: hysteresis compare → "decide: 59 says nothing; 60 enters soft once; 61 …" → covered
- mutation-proven: freshness return → "decide: a stale reading says nothing, even at 95%" → covered
- mutation-proven: identity removal in stripHooks → "identity dedupe: other spellings … collapse to one" → covered

---

## Regression Testing

`npm run ci:fast`: prettier clean after formatting, 4968/4971 tests pass, 1 skipped. The two failures
are LOAD-SENSITIVE file-time budgets (`tests/bundle-missing-source.test.js`,
`tests/test-clean-checkout.test.js`) under load average 153; each passes alone. No existing suite
touches the new files. **PASS**

---

## Test Artifacts

### Files Reviewed
`shared/resources/context-pressure.mjs`, `context-pressure-statusline.sh`, `context-pressure-install.sh`,
the three `shared/resources/tests/context-pressure*.test.mjs`, `skills/session-handoff/SKILL.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/context-pressure*.test.mjs
TMPDIR=/tmp command node --test shared/resources/tests/context-pressure*.test.mjs
npm run ci:fast
npm run validate -- skills/session-handoff/
npm run bundle:check
bash scripts/lint-shell.sh
command node .agents/skills/qa-task/references/security-probe.mjs --cases-file docs/tasks/task.157.context-pressure-handoff-trigger/task.157.qa.1.security.cases.json --sink filename --entry 'shared/resources/context-pressure.mjs#validSessionId' --record docs/tasks/task.157.context-pressure-handoff-trigger/task.157.qa.1.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/session-handoff/SKILL.md --json
```

### Coverage Report
Not instrumented (node:test without coverage); every exported function has direct tests.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix TASK-157-CR-1, CR-3, CR-4 with tests.

### Short-term Actions (Non-Blocking)
1. CR-2 (SKILL.md install check), CR-5, CR-6, CR-7, CR-8.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH finding and every NFR passes; one MEDIUM high-confidence installer bug.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-157-CR-1 fixed

---

**QA Report**: co-located at `task.157.qa.1.context-pressure-handoff-trigger.md`
**Gate File**: co-located at `task.157.gate.1.context-pressure-handoff-trigger.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review.
