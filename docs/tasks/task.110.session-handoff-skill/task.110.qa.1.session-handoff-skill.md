# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.1.session-handoff-skill.yml](./task.110.gate.1.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

The deliverable is complete and its tests are real: 17 tests, every verdict reached through an injected runner, three mutants killed by name at development and one re-proved here, read mode over the live handoff reporting 18 confirmed · 0 stale · 2 timeouts. The gate fails on the one risk §10 named — the read-only whitelist is present but porous. Executing 56 hostile inputs against `isAllowed()` accepted 11 (`gh api -XPOST`, `git branch -D`, `git tag -d`, `git remote add`, `git diff --output=`, `node -e`, `npx --write --check`, `find -fprint`, …), and the independent diff review confirmed the same holes plus two parser robustness defects and an orphaned-child timeout.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (11 mandatory sections; reviewed 8/10 at Step 2)
- [x] All implementation phases completed (4/4 Progress Tracking boxes)
- [x] Tests passing (`npm run ci:fast` exit 0 on 7053c0a6 — 3288 node tests, 3287 pass, 1 skipped; 513 bash assertions; prettier clean)
- [x] Breaking changes documented (None — new skill)
- [x] Code on feature branch with open PR (#408, base develop, head 7053c0a6)

### Testing Approach

- [x] Automated Testing (unit + CLI contract, `node --test`)
- [x] Security Review — **measured**: 56 probes executed against the boundary
- [x] Code Review — independent read-only Explore reviewer over the full branch diff (5m10s, returned 13 findings)
- [x] Regression Testing (full hermetic suite, `TMPDIR=/tmp` platform-variance run)
- [x] Manual Testing (documented commands run under bash and zsh)
- [ ] Performance Testing — not applicable (no hot path; read mode is seconds at `--timeout 20`)

### Review Methodology

Direct tools first (standard mode; 3 implementation phases, one skill directory plus wiring), with one dispatched Explore subagent for the Step 3b diff review — the pass performed by an agent that did not write the code. First review: whole-branch diff (`origin/develop...HEAD`, 18 files, 2137 insertions). No lite-mode override.

Step 4b: **1 bash block, 0 runnable** — `qa-execute-snippets.mjs` refused it as `unrecognised-command: command (fail-closed)` → `no-executable-blocks` (information, not a finding). The block begins `command node …`, which `docs/contributing/traps.md` mandates; the engine does not know the prefix. Logged as observation #90. The documented commands were run by hand under `bash` and `zsh` (both available): identical exit codes and JSON `reason` on both shells.

Boundary rule (Step 3b.3): `isAllowed()` is a validator whose `false` prevents execution → **boundary: true**. Probed with `corpusFor("shell-exec")` (31 cases) plus 25 whitelist-specific candidates; `probes_executed: 56`. Script: scratchpad `probe-isallowed.mjs` (to be committed as a test in the fix cycle).

Platform variance: `TMPDIR=/tmp node --test 'skills/session-handoff/tests/*.test.js'` → 17/17 pass (exit 0). The tests use `os.tmpdir()` only for CLI fixture dirs; no validating consumer reads them.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract → SKILL.md | PASS | Verified | Write/read contracts, parse rule, verdict vocabulary, whitelist table, `--json` reason table; `quick_validate.py` ✓ |
| Phase 2: read mode is real (`handoff-verify.mjs`) | CONCERNS | Partial | Verdicts, injectable runner, exit codes all correct; **the whitelist admits mutating shapes** (bug.1); parser aborts on a malformed `expect:` (bug.2); timed-out child orphaned (bug.3) |
| Phase 3: write mode + wiring | PASS | Verified | Template section order + half-life labels + traps pointer (tested); `.agents/handoff.md` rewritten and read-mode-proved; package.json glob; catalog/deps regenerate to no diff; AGENTS.md pointer names read mode; commands.md / activation-phrases.md rows; CHANGELOG entry |

**Overall Phase Completion**: 3/3 phases delivered; 1 with issues.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. One verdict per figure; annotated 2026-09-10 fixture → `stale` on the frontier line and the `change-log.js` claim | Yes | Yes | PASS | `regression:` test; both named lines `stale` with the new value |
| 2. `--json` follows the `reason` / exit-code contract | Yes | Yes | PASS | `ok/stale/unverifiable/no-figures/missing/usage`; `process.exitCode`, never `process.exit()`; `missing` now emitted as JSON |
| 3. Write mode emits the fixed section order; traps is a pointer, never content | Yes | Yes | PASS | `template:` test asserts order + pointer + no `###` in §5 |
| 4. Tests run under `npm test` (glob present) and in CI | Yes | Yes | PASS | glob added; suite green |
| 5. `quick_validate.py` passes; catalog and deps regenerate to no diff | Yes | Yes | PASS | 128 skills; bundle check 0 problems |
| 6. AGENTS.md names the read mode | Yes | Yes | PASS | line 5 names the command |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Whitelist is read-only (§10) | fail-closed | porous | **FAIL** | 11/56 hostile probes accepted — bug.1 |
| Linting / formatting | clean | clean | PASS | prettier |
| Tests | present, mutation-proved | 17, 3 mutants + 1 re-proved | PASS | see Code Review |

---

## Breaking Changes Validation

None declared; none found. The handoff file gains structure but stays hand-editable Markdown. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (3)

**Issue: `gh api` joined-flag forms bypass the whitelist**
- **Severity**: HIGH · **Category**: Security · **Bug Report**: [task.110.bug.1.whitelist-admits-mutating-shapes.md](./task.110.bug.1.whitelist-admits-mutating-shapes.md)
- **Observation**: `gh api -XPOST repos/x/y/issues`, `--method=DELETE …`, `--field=title=x …` → `ok: true` (CR-1).
- **Impact**: a mutating request runs under a read-only contract. **Recommendation**: prefix-match the flags. **Priority**: P1

**Issue: `git branch` / `tag` / `remote` admitted unconditionally; `--output=` writes**
- **Severity**: HIGH · **Category**: Security · **Bug Report**: bug.1
- **Observation**: `git branch -D develop`, `git tag v9`, `git tag -d v1`, `git remote add/set-url/remove`, `git diff --output=/tmp/x` (corpus `shell-exec.git-diff-output`) → `ok: true` (CR-2 + probe).
- **Recommendation**: restrict the three to list/inspect shapes; refuse `--output`. **Priority**: P1

**Issue: `node -e` / `python3 -c` / `npx <any> --check` run arbitrary code**
- **Severity**: HIGH (QA probe PRB-1; reviewer CR-5 at medium/medium) · **Category**: Security · **Bug Report**: bug.1
- **Observation**: `node -e "require('fs').rmSync('x')"`, `node --eval 1`, `npx prettier --write --check .` → `ok: true`. The timeout test at `handoff-verify.test.js` currently depends on `node -e` being allowed.
- **Recommendation**: refuse eval/preload flags; require a relative script path; refuse `npx --write`; restrict the npx binary. **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: unguarded `new RegExp` aborts the run** — CR-3 · [bug.2](./task.110.bug.2.parser-aborts-and-table-boundary.md) · `expect: /usr/bin/node` throws `Invalid flags supplied`; one bad line becomes a stack trace. P2.

**Issue: a blank line does not end the header table** — CR-4 · bug.2 · a following `| Id | Title |` table is emitted as `no command` figures. P2.

**Issue: timed-out child keeps running** — CR-6 (medium/medium, advisory but real) · [bug.3](./task.110.bug.3.timed-out-child-keeps-running.md) · bash 3.2 forks; `spawnSync` kills only the wrapper. P2.

### LOW Severity Issues (5)

- CR-7 — glob/tilde tokens are single-quoted and run literally; `ls docs/tasks/*.md` is reported `command failed`. Document or refuse with a reason.
- CR-8 — `stripEmphasis` treats snake_case underscores as emphasis; `**probes_executed**` normalises differently on each side → false `stale`.
- CR-9 — an empty Result cell yields `figures: [""]` → `stale — moved:` instead of `no figure`.
- CR-10 — `find` deny-list omits `-fprint`, `-fprint0`, `-fprintf`, `-fls`, `-okdir`.
- CR-11 (low/medium) — any non-zero exit is `command failed` unless the figure is `exit N`; `grep -c … | **0**` (grep exits 1 on no match) can never be `confirmed`.

**Total Issues**: HIGH: 3, MEDIUM: 3, LOW: 5 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
Read mode over the live handoff at `--timeout 20`: seconds. Slow rows (`npm test`, `ci:fast`) land `unverifiable: timeout` by design. No hot path in the deliverable.

### Reliability — CONCERNS
CR-3 turns one malformed line into a process abort; CR-6 leaves a child running after `timeout`. The `unverifiable` vocabulary exists precisely so that neither happens.

### Security — FAIL
- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 56 (31 `shell-exec` corpus + 25 whitelist-specific)
- Hostile accepted: 11 — listed under bug.1. The allowlist is the right mechanism (argv-based, fail-closed on unknown binaries, shell operators refused, injectable runner gated behind it) and it holds for `rm`, `git push`, `npm run bundle`, `gh pr merge`, `$(…)`, pipes and redirects; it is the per-binary rules that are too coarse.

### Maintainability — CONCERNS
Well-structured, exhaustively header-documented, tests reach every verdict; CR-12 (dead `split` in `firstLines`) and CR-13 (CLI tests leak temp dirs) are the residue.

---

## Code Review

Reviewer: read-only Explore subagent, `references/code-review-prompt.md` verbatim, whole-branch diff (2,562 lines). Returned in 5m10s. `code_review_blocking=true` (pipeline override; no per-doc opt-out) → every `bug` + `confidence: high` finding is promoted to gate `top_issues[]`.

**Correctness bugs (11):**
- [high/high] `handoff-verify.mjs:107` — `gh api` refuses only space-separated flag forms → **gate CR-1**
- [high/high] `handoff-verify.mjs:83` — `branch`/`tag`/`remote` unconditional; `--output=` writes → **gate CR-2**
- [medium/high] `handoff-verify.mjs:296` — unguarded `new RegExp` aborts the run → **gate CR-3**
- [medium/high] `handoff-verify.mjs:277` — blank line does not end a table → **gate CR-4**
- [medium/medium] `handoff-verify.mjs:114` — `node`/`python3`/`npx` accept inline code and arbitrary packages (advisory by confidence; promoted by the QA probe as **PRB-1**, high)
- [medium/medium] `handoff-verify.mjs:411` — timed-out child orphaned under bash 3.2 (advisory; bug.3)
- [low/high] `handoff-verify.mjs:429` — glob tokens quoted literally → **gate CR-7**
- [low/high] `handoff-verify.mjs:325` — snake_case underscores stripped as emphasis → **gate CR-8**
- [low/high] `handoff-verify.mjs:269` — empty Result cell → `[""]` → **gate CR-9**
- [low/high] `handoff-verify.mjs:140` — `find` write actions not refused → **gate CR-10**
- [low/medium] `handoff-verify.mjs:513` — grep exit 1 can never be `confirmed` (advisory)

**Cleanups (2):**
- `handoff-verify.mjs:376` — `text.split(…)[0] === text ? text : text` is dead work → `JSON.parse(text)`.
- `handoff-verify.test.js:380` — CLI tests never remove their `mkdtempSync` dirs.

**Mutation proof (Step 3c):**
- mutation-proven: `compareFigure` token match forced `holds = true` → `regression: the 2026-09-10 handoff reads stale …` and `verify: confirmed when every figure's tokens appear …` went red → **covered** (re-run by QA from a `cp` snapshot; mutation applied 1/1; restored clean; 17/17 after).
- Dev-time proofs (whitelist disabled → 2 red; failure branch disabled → 1 red) recorded in the implementation report; not re-run this cycle — **dev-only** as far as this report can claim.

**Boundary probe (Step 3b.3):** `boundary: true`; `probes_executed: 56`; mismatches: 1 corpus (`shell-exec.git-diff-output`) + 10 whitelist-specific — all reported above.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) | PASS — 3287/3288, 1 skipped |
| `tests/skill-doc-coverage.test.js` (new skill must be documented) | PASS after the commands.md / activation-phrases.md rows |
| Bundle freshness (`npm run bundle -- --check`) | PASS — 128 skills, 0 problems |
| Catalog / skill-dependencies regeneration | PASS — no diff |
| Platform variance (`TMPDIR=/tmp`) | PASS — 17/17 |
| Documented commands under bash + zsh | PASS — identical |

---

## Test Artifacts

### Files Reviewed
`skills/session-handoff/scripts/handoff-verify.mjs`, `skills/session-handoff/tests/handoff-verify.test.js`, `skills/session-handoff/tests/fixtures/handoff-2026-09-10.txt`, `skills/session-handoff/SKILL.md`, `skills/session-handoff/assets/handoff.template.md`, `.agents/handoff.md`, `package.json`, `AGENTS.md`, `CHANGELOG.md`, `docs/reference/commands.md`, `docs/reference/activation-phrases.md`.

### Test Commands Executed
```bash
command node --test 'skills/session-handoff/tests/*.test.js'          # 17/17
TMPDIR=/tmp command node --test 'skills/session-handoff/tests/*.test.js'   # 17/17
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/session-handoff/SKILL.md --json
command node <scratch>/probe-isallowed.mjs                                 # 56 probes
command node skills/session-handoff/scripts/handoff-verify.mjs --timeout 20  # 18 confirmed · 0 stale · 2 unverifiable
# mutation: sed comparator → always true; node --test → 2 red by name; restore from cp snapshot
```

### Coverage Report
Not measured (repo does not run coverage); every verdict and every `reason` value is reached by at least one test.

---

## Recommendations

### Immediate Actions (Blocking)
1. Close the whitelist (bug.1) — CR-1, CR-2, PRB-1/CR-5, CR-10 — and **commit the probe as a test** so the corpus's hostile direction is asserted on every run.
2. Guard the `expect:` RegExp and end a table on a blank line (bug.2 — CR-3, CR-4, CR-9).

### Short-term Actions (Non-Blocking)
1. Kill the process group on timeout (bug.3 — CR-6).
2. CR-7 glob policy, CR-8 underscore stripping, CR-11 grep exit 1, CR-12 dead split, CR-13 temp-dir cleanup.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Three HIGH findings on the safety boundary the task itself identified as its only real risk; the NFR security axis is FAIL on measured evidence. Everything else — the contract, the verdicts, the tests, the write mode, the wiring — passes.
**Quality Score**: 30/100 (100 − 20×3 HIGH − 10×… bounded; the deterministic formula is dominated by the three HIGH entries)

**Deployment Recommendation**: BLOCKED
**Conditions**: all HIGH findings closed; whitelist probe test committed.

---

**QA Report**: co-located at `task.110.qa.1.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.1.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 1 (pipeline Step 5b), then re-review.
