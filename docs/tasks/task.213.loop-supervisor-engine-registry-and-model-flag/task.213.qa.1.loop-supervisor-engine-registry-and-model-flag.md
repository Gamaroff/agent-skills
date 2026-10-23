# QA Report: Task 213 - loop-supervisor: an engine registry (claude, agy) and a --model flag

**Task**: [Link to task document](./task.213.loop-supervisor-engine-registry-and-model-flag.md)
**Gate File**: [task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml](./task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

QA reviewed PR #716 at head `a31d73ce`. That covers the new `engines.js` table, the rewiring of `run-loop.mjs`, the 31 new tests and the documentation sweep.

- The code and its guards hold. All 10 mutations of the key behaviours were killed by committed tests. The `resolveEngine` refusal engages on 10 hostile names and accepts both real ones. The fast gate is green.
- One stated success criterion fails as measured. The Migration search still returns three `claude -p` lines that do not say "default" on the line itself.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-213-BUG-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Phase 0–4 ticked)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#716, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit + one full `run` iteration per engine through fake binaries)
- [x] Performance Testing (timing of pre-existing files, base vs head)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

Direct tools, plus one read-only Explore code reviewer (Step 3b) and one traceability mapper. The task has 5 phases, a single module, and no auth, payments or secrets, so direct tools fit the default. This is a first review: no prior gate existed, so the scope is the whole `origin/develop...HEAD` diff, 2,240 lines.

- **Code reviewer**: dispatched 07:07Z, returned in 86 s (`duration_ms` 86307).
- **Mapper**: 61 s.
- **Traceability matrix**: `.summaries/qa-traceability-matrix.md`, 14 criteria.
- **Step 4b**: ran on both changed `SKILL.md` files (`--diff-base` the merge base). The changed fenced blocks numbered 0, so 0 were executed. File level: loop-supervisor `SKILL.md` has 2 blocks and develop-next `SKILL.md` has 16. All are `mutating` (deny-listed `gh`, `node`, writes), with the note `no-executable-blocks`. No findings, and no zsh disagreement was possible.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Verify `agy` | PASS | Verified | Real captures committed as fixtures; facts in the plan file match `engines.js` comments |
| Phase 1: Registry, `claude` only | PASS | Verified | Characterisation tests pin the pre-change argv; `buildClaudeArgs` etc. are delegates |
| Phase 2: Flags, config, refusals | PASS | Verified | Refusal runs before `resolveBinary`; skip-permissions never read from config |
| Phase 3: `agy` entry | PASS | Verified | Fail-closed parser; ledger id from the stream; `transcriptPath` null |
| Phase 4: Tests + doc sweep | CONCERNS | Partial | Three `claude -p` lines miss the on-line qualifier (TASK-213-BUG-1) |

**Overall Phase Completion**: 4/5 PASS, 1 CONCERNS

---

## Success Criteria Verification

Each criterion was verified from evidence: the committed test that holds it, or for a measured or structural criterion, its command or `file:line`.

**Functional Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| `dry-run --engine claude` argv unchanged | identical after normalising session id | identical | PASS | R "t213: characterisation: …unchanged…", "…--max-turns stays the last pair…"; mutation M7 covered |
| `dry-run --engine agy --model <id>` argv | contains model, matches Phase 0 | matches | PASS | R "t213: dry-run --engine agy prints the agy argv…"; E "agy: the argv matches the Phase 0 findings…"; M8 covered |
| Non-`SUCCESS`/unknown agy status → `isError`, classifies `error` | yes | yes | PASS | E "agy control: …fail closed", "run: an agy result with an unknown status classifies as error…"; M1 covered |
| agy + `--max-cost`/`--max-turns` exits 1 naming both | yes | yes | PASS | R "t213: an engine-unsupported flag exits 1…"; M2 covered |
| claude + skip-permissions exits 1; agy passes it only from the flag | yes | yes | PASS | R "t213: the agy skip flag reaches the argv only from the operator flag", "t213: skipping permissions is never read from config"; M5 covered |
| claude `--effort` in argv | yes | yes | PASS | R "t213: --engine claude --effort is honoured, not refused"; M3 covered |
| Flags win over `loopSupervisor.engine\|model\|effort` | yes, incl. default-equal | yes | PASS | R "t213: loopSupervisor.engine\|model\|effort fill only…" (calls `parseArgs` + `applyConfig`, the real code path); M9 covered |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Pre-existing five files within 10% of base | ≤ +10% | −3% (0.282 s vs 0.292 s median, 185 pass each) | PASS | Implementation report, Step 3, with `uptime` load lines (2.33 base, 5.45 head) and `--test-skip-pattern='^t213:'` |
| `dry-run` never executes the engine | no marker | no marker, both engines | PASS | R "t213: dry-run never executes the engine binary"; M4 covered |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| No `if (engine === …)` in `run-loop.mjs` | none | none | PASS | Read `run-loop.mjs`: the only `"claude"` literals are `DEFAULTS.engine` (`run-loop.mjs:100`) and a comment (`:1093`); engine behaviour comes from `engine.buildArgs/parseResult/renderLine/transcriptPath/supports` |
| Full `npm test` passes | 0 fail | 0 fail | PASS | `npm run ci:fast` (= `format:check && npm test`) rc 0: 6,136 tests, 6,122 pass, 14 skipped; run on the code committed as `a31d73ce` |
| `npm run validate -- skills/loop-supervisor/` | pass | ✓ (rc 0) | PASS | Re-run in this QA cycle; `skills/develop-next/` also ✓ |

**Migration Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Every `claude -p` line names it as the default | all matched lines | 3 of 9 matched lines do not | **CONCERNS** | Search re-run: `skills/loop-supervisor/SKILL.md:63`, `skills/develop-next/SKILL.md:677`, `docs/runbooks/unattended-overnight-runs.md:28` (TASK-213-BUG-1) |
| `configuration.md` documents the three keys + flags | yes | yes | PASS | Example block and `loopSupervisor.engine\|model\|effort` table rows |

---

## Breaking Changes Validation

### Breaking Change 1: `buildClaudeArgs` replaced by the engine's `buildArgs`
Documented: Yes
Migration Path Provided: Yes (kept as an exported delegate)
Migration Tested: Yes (characterisation tests call through the delegate)
Consumer Code Updated: N/A (no external caller changes needed)

### Breaking Change 2: `--max-cost` and `--max-turns` can now be refused
Documented: Yes (README options table and Engines section, configuration reference)
Migration Path Provided: Yes (claude remains the default and honours both)
Migration Tested: Yes (refusal tests on agy; claude path unchanged)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Three `claude -p` lines fail the Migration criterion's own search**
- **Severity**: MEDIUM
- **Category**: Quality (documentation)
- **Bug Report**: [task.213.bug.1.claude-p-lines-lack-default-qualifier.md](./task.213.bug.1.claude-p-lines-lack-default-qualifier.md)
- **Observation**: The criterion is line-level, and three matched lines carry the qualifier only in the following sentence.
- **Impact**: Documentation only, but a stated criterion fails as measured.
- **Recommendation**: Put "by default" on each matched line and record the search output.
- **Priority**: P2

### LOW Severity Issues (3, advisory)

- CR-2: the `dryRun` helper's `spawnSync` (`evals/loop-supervisor/unit/run-loop.test.mjs:749`) has no timeout.
- The stale comment at `skills/loop-supervisor/scripts/run-loop.mjs:1093` still says `resolveBinary("claude")`.
- CR-1 (medium severity, medium confidence; advisory): see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3 (advisory)

---

## NFR Assessment

### Performance — PASS
The pre-existing test files run 3% faster at head than at base, at about twice the load. No hot path was added: the table lookup happens once per run, and parsing is per stream line as before.

### Reliability — PASS
- The `agy` parser fails closed on any status other than `SUCCESS`, including a missing one.
- Refusals run before any binary is resolved, so a refused run spawns nothing.
- An unknown cost reads `null`, never `$0`.
- Advisory gap (CR-1): an `agy` run killed before its result line records `sessionId: null`, although the `init` line carried a `conversation_id`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (`task.213.qa.1.security.run.json`, `totals.executed`); escaped: 0
- **Boundary**: true. `engines.js` declares its own refusal in its header (signal `self-declared-refusal`).
  - **`resolveEngine`** (input is the operator's `--engine` or the committed config): probed with 10 hostile names and 2 legitimate ones. The hostile names were `__proto__`, `constructor`, `toString`, `hasOwnProperty`, empty, `Claude`, `agy ` (trailing space), `agy` + NUL, `../claude` and `gpt`. Verdict `engages`: every hostile name was refused and both real names were accepted.
  - **`assertSupported`** takes `(engine, opts)`, and **`parseAgyResult`** answers through an envelope field rather than a reject shape. Neither is a single-input reject-shaped export the JS form can score. Both are held by committed refusal and fail-closed tests, with mutations M2 and M1 `covered`.
- **Skip permissions**: `--dangerously-skip-permissions` is an operator flag only. Config never sets it (test plus M5), and it is refused on `claude`.

### Maintainability — PASS
There is one table and no engine-name branch, and the exported delegates keep the old API. There are two advisory cleanups: the stale comment at `:1093` and the `dryRun` spawn with no timeout.

---

## Code Review

Advisory except where promoted. `code_review_blocking=true` was passed by the pipeline, but no finding is both `category: bug` and `confidence: high`, so none was promoted to the gate.

**Correctness bugs (2):**
- [medium/medium] `skills/loop-supervisor/references/engines.js:143` — CR-1. `parseAgyResult` reads only the `result` line, but agy's `init` line already carries `conversation_id`. So an iteration that dies before its result line records `sessionId: null`, and that null covers two cases: "no conversation" and "conversation not recorded". → Take `conversation_id` from `init` as a fallback, through an optional engine hook.
- [low/medium] `evals/loop-supervisor/unit/run-loop.test.mjs:749` — CR-2. The `dryRun` helper's `spawnSync` has no timeout. → Bound it with `spawnBudget`, as `runOnce` does.

**Cleanups (1, QA-found):**
- `skills/loop-supervisor/scripts/run-loop.mjs:1093` — the comment still says `resolveBinary("claude")`. → Say "the engine binary".

Anchors: `finding-anchors.js --rev HEAD`, reason `ok`; both findings `anchor_check: ok`.

**Boundary record:** `boundary: true`. The run record is `task.213.qa.1.security.run.json`: `probes_executed: 12`, `escaped: 0`, control `resolveEngine` at `skills/loop-supervisor/scripts/run-loop.mjs:1103`, verdict `engages`.

**Mutation proofs** (committed tests; snapshot/restore, with sources sha1-verified identical afterwards; run after the reviewer returned):
- mutation-proven: agy `isError: !ok` → `false` → "agy control: a status the captures never show is an error (fail closed)" → covered
- mutation-proven: refusal guard removed → "agy refuses --max-turns and --max-cost…" → covered
- mutation-proven: claude `--model` spliced before `--settings` → "claude: --model and --effort follow --settings…" → covered
- mutation-proven: dry-run spawns the engine → "t213: dry-run never executes the engine binary" → covered
- mutation-proven: skip-permissions read from config → "t213: skipping permissions is never read from config" → covered
- mutation-proven: agy gets a supervisor uuid → "run: an agy SUCCESS iteration takes its session id from the stream…" → covered
- mutation-proven: `--include-partial-messages` dropped → "claude: with model and effort unset…" → covered
- mutation-proven: agy argv sends `--conversation` → "agy: the argv matches the Phase 0 findings…" → covered
- mutation-proven: config overrides an explicit flag → "t213: loopSupervisor.engine|model|effort fill only…" → covered
- mutation-proven: agy totals start at `0` → "run: an agy SUCCESS iteration … cost unknown" → covered

All 10 of 10 are covered.

**Platform variance:** the tests pass `os.tmpdir()` only to `mkdtempSync`, and no validating consumer reads it. Not applicable.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Pre-existing loop-supervisor unit tests (adapters, classify, dashboard, render, run-loop) | PASS — 185/185 |
| Whole repository (`ci:fast`) | PASS — 0 fail |
| `classify.js` contract (normalised envelope keys `isError`/`subtype`) | PASS — exercised end to end by the fake-binary `run` tests |
| `render.js` null cost/transcript | PASS — `money()` and `—` paths already tolerate null |

---

## Test Artifacts

### Files Reviewed
`skills/loop-supervisor/references/engines.js`, `skills/loop-supervisor/scripts/run-loop.mjs`, `evals/loop-supervisor/unit/engines.test.mjs`, `evals/loop-supervisor/unit/run-loop.test.mjs`, the two fixtures, and the seven documentation files in the diff.

### Test Commands Executed
```bash
npm run validate -- skills/loop-supervisor/        # ✓
npm run validate -- skills/develop-next/           # ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/loop-supervisor/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/develop-next/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'skills/loop-supervisor/references/engines.js#resolveEngine' --cases-file docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.qa.1.resolve-engine-cases.json --record docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.qa.1.security.run.json --name resolveEngine --json
python3 t213-mutate.py                              # 10/10 killed, sources restored
git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks
```

### Coverage Report
No coverage tooling is configured for these `node --test` suites, so coverage was not measured. The mutation proofs above stand in as the evidence that the guards are held.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-213-BUG-1: put the default-engine qualifier on the three matched `claude -p` lines (P2).

### Short-term Actions (Non-Blocking)
1. CR-1: add an `init`-line fallback for the `agy` conversation id.
2. CR-2: bound the `dryRun` spawn.
3. Refresh the `run-loop.mjs:1093` comment.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high-severity finding, and every behaviour criterion is held by a committed test that a mutation turns red. One documentation criterion fails as written and needs a three-line fix.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-213-BUG-1 fixed.

---

**QA Report**: co-located at `task.213.qa.1.loop-supervisor-engine-registry-and-model-flag.md`
**Gate File**: co-located at `task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml`
**Next Steps**: `/qa-fix` for TASK-213-BUG-1, then re-review.
