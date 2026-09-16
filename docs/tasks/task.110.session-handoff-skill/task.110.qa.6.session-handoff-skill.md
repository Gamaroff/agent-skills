# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.6.session-handoff-skill.yml](./task.110.gate.6.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 6 — standalone `/qa-task`, outside the develop-task loop's budget)
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

The cycle-5 fix holds: every module-loading flag under the `npx` tools is refused with an absolute
value, and restoring the global exemption turns the named test red. The boundary probe then walked
the **other arms that reach the same binaries** and found the allow-list's core invariant broken in
two places neither of five previous enumerations tried: the `npm` `--` passthrough forwards any
dash token and any absolute positional, so `npm run format:check -- --write` **rewrites the working
tree** and `npm test -- -r /tmp/evil.js` **preloads a module from outside the repo**; and `gh api`
accepts an **absolute URL**, so read mode makes a request to any host. All three were executed in a
scratch fixture, not read. One HIGH (a write with no precondition) → FAIL.

**Overall Assessment**: FAIL · **Deployment Recommendation**: BLOCKED (bug.6; bug.7)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 boxes ticked)
- [x] Tests passing (28/28 skill suite)
- [x] Breaking changes: none declared, none found
- [x] Code on `feature/task.110.session-handoff-skill` with open PR #408 → `develop`

### Testing Approach

- [x] Automated Testing (skill suite; full hermetic suite; `TMPDIR=/tmp` variance run)
- [x] Boundary probing — executed, per `references/probe-boundary-rule.md`
- [x] Mutation proofs of the cycle-5 fix
- [x] Security Review (executed egress and write probes)
- [x] Code Review (read-only Explore subagent, narrowed)
- [x] Regression (live handoff read mode; `quick_validate.py`; prettier)

### Review Methodology

Direct tools + one read-only Explore subagent (re-review row of the Adaptive Review Strategy; not
lite — standalone invocation, no pipeline directive). `code_review_blocking` not passed and not in
frontmatter → the subagent's findings are advisory; the executed boundary probes are QA findings
and enter `top_issues[]` as such.

```
Re-review scope: since 2026-09-15T04:14:45Z (default) — clause 1 read `OK measured`; gate 5 carried no HIGH (clause 2) and was not FAIL (clause 3)
```

Step 4b: not applicable this cycle — the change set since gate 5 touches no `SKILL.md` or prompt
(earlier cycles recorded `no-executable-blocks`, obs #90).

---

## Re-Review Context

| Cycle-5 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 `PATTERN_FLAGS` exempts module-loading flags (`npx mocha --reporter=/tmp/evil.js` …) | **FIXED** | 4 absolute spellings + `-R`, `-f`, `\/`, quoted forms refused; `--format=json`, `--reporter=spec`, `--reporter=./x` allowed; mutant (restore global `--reporter`) → `whitelist: mutating shapes … are refused` red → `covered` |
| CR-2 runner JSDoc omits `truncated` | FIXED | documented at `:1361`; reviewer notes the catch-block resolve still omits the key (cleanup, below) |
| CR-3 cap wording / ls-remote anchor comment | FIXED | reworded |

## New Findings This Cycle

- **[high]** `skills/session-handoff/scripts/handoff-verify.mjs:707` — the `npm` `--` passthrough accepts any dash token and any absolute positional; `npm run format:check -- --write` runs `prettier --check . --write` and **rewrote the fixture tree** (`Code style issues fixed in 6 files`, probe file content changed) → [bug.6](./task.110.bug.6.npm-passthrough-admits-writes-and-outside-modules.md)
- **[medium]** same site — `npm test -- -r /tmp/evil.js` reaches `node --test … -r /tmp/evil.js` and **preloaded the file** (marker written; node v26.4.0); `--require=`, `--import=`, `--experimental-loader=`, `--test-reporter=` absolute forms and the quoted form are likewise allowed. Same root cause → bug.6. Cycle 3 accepted `-r ./x` as in-repo and never tried the absolute form.
- **[medium]** `handoff-verify.mjs:622` — `gh api https://evil.example/x` allowed (`POS.PATHS` + `allowAbsolute` refuses only `..`); executed against a local listener: `GET /probe-path` arrived from `GitHub CLI 2.94.0` with **no** `Authorization` header — egress, not a token leak; the `--hostname` refusal reached by another spelling → [bug.7](./task.110.bug.7.gh-api-accepts-absolute-url.md)
- **[low]** `handoff-verify.mjs:733` — `npm run eval:create-task:cli` / `:sdk` allowed by the `eval:*` regex; both set `DRIVER=claude-*` and shell out to `claude -p` — a live, billed agent run the repo documents as opt-in. Not executed (deliberately); reasoned from `evals/shared/drivers/claude-cli.mjs:75`
- **[low]** `handoff-verify.mjs:191` — Windows drive-letter absolute paths pass the absolute-path rule: `npx eslint --config=C:/tmp/evil.js .`, `--config=C:\tmp\evil.js`, `node C:/tmp/evil.js` allowed. The design already covers `//host` (UNC) for Windows; harmless on POSIX (a relative dir named `C:`). Reasoned
- **[low]** `tests/handoff-verify.test.js:232` — the per-spec `patternFlags` mechanism has no committed test: deleting `patternFlags` from both git specs leaves 28/28 green (mutant → `no-red-untested`); reviewer CR-1 reached the same conclusion independently
- **[low]** task document — `## QA Testing Results › NFR Status` read the cycle-1 values (`Security: FAIL (measured, 56 probes), Reliability: CONCERNS, Maintainability: CONCERNS`) through cycles 2–5 while gate 5 said CONCERNS / PASS / PASS; corrected in this cycle's Step 12 (obs #92)
- **Probed and not defects**: `npx mocha --reporter=file:///tmp/evil.js` and `npx eslint --format=file:///…` (allowed; mocha/eslint resolve the string under cwd → not found); `npx mocha --reporter=./evil.js` (in-repo by design); `cat <absolute secret path>` and `jq -n env` (allowed by design as plain readers — note that `firstLines()` prints the first two lines / 160 chars of output into the verdict table, so the report is an output channel; out of the stated model, advisory)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract (SKILL.md, verdict vocabulary) | PASS | Verified | unchanged since gate 5; `quick_validate.py` ✓ |
| Phase 2: read mode is real (`handoff-verify.mjs`) | **FAIL** | 28/28 unit; boundary broken | cycle-5 fix holds; bug.6 (HIGH), bug.7 (MEDIUM) in arms no cycle probed |
| Phase 3: write mode + wiring | PASS | Verified | live handoff: 18 confirmed · 0 stale · 2 timeouts (by design) |

**Overall Phase Completion**: 2/3 phases passed (phase 2 blocked)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. one verdict per figure; 2026-09-10 fixture → 2 `stale` | Yes | Yes | PASS | fixture test green |
| 2. `--json` follows `reason` / exit-code contract | Yes | Yes | PASS | live run `reason: unverifiable`, exit 0 |
| 3. fixed section order; traps a pointer | Yes | Yes | PASS | unchanged |
| 4. tests under `npm test` and CI | Yes | Yes | PASS | glob present; full suite 3298/3299 pass, 0 fail (1 skipped), exit 0 |
| 5. `quick_validate.py`; catalog/deps no diff | Yes | Yes | PASS | validator ✓; `git status` clean before QA artifacts |
| 6. AGENTS.md names read mode | Yes | Yes | PASS | unchanged |
| §10 risk: whitelist of read-only prefixes; anything else `unverifiable` | Read-only | **write + egress admitted** | **FAIL** | bug.6, bug.7 |

Performance: no targets; read mode over the live handoff at `--timeout 20` completes in seconds.
Code quality: prettier ✓ on the skill and the task directory; lint N/A (no eslint config in repo).

---

## Breaking Changes Validation

None declared; none found (new skill; the handoff stays hand-editable Markdown). **PASS**.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: npm `--` passthrough admits a working-tree write and an outside-repo module load**
- **Severity**: HIGH · **Category**: Security
- **Bug Report**: [task.110.bug.6](./task.110.bug.6.npm-passthrough-admits-writes-and-outside-modules.md)
- **Observation**: `npm run format:check -- --write` rewrote the fixture tree; `npm test -- -r /tmp/evil.js` preloaded the file. Both executed
- **Impact**: one committed handoff line mutates the reader's uncommitted work, or runs code from outside the repo — the two invariants the whitelist section states as the design; the write needs no attacker file
- **Recommendation**: no passthrough for non-test scripts; hold `npm test -- …` to the `node --test` allow-list and `POS.PATHS`
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: `gh api` accepts an absolute URL**
- **Severity**: MEDIUM · **Category**: Security
- **Bug Report**: [task.110.bug.7](./task.110.bug.7.gh-api-accepts-absolute-url.md)
- **Observation**: local listener received the request; no `Authorization` header
- **Impact**: read mode as a beacon / SSRF into the reader's network; response head lands in the verdict table
- **Recommendation**: refuse `://` (or anchor the endpoint to `^[A-Za-z0-9_./-]+$`)
- **Priority**: P2

### LOW Severity Issues (4)

1. `eval:*:cli|sdk` scripts are live driver runs (billed) — exclude the `:cli`/`:sdk` suffixes or require the `DRIVER`-free scripts only.
2. Windows drive-letter absolute paths (`C:/`, `C:\`) pass `valueOk` / `isSafePositional` — add `/^[A-Za-z]:[\\/]/` to the absolute test beside the UNC rule.
3. `patternFlags` per-spec path untested — add `git log --format=/%H` and `git show --pretty=/x HEAD` to the allowed list.
4. Task document NFR Status line stale since cycle 1 — corrected this cycle.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
No hot path; live read mode completes in seconds at `--timeout 20`; the 16 M-character cap and the timeout bound every child.

### Reliability — PASS
Timeout → `unverifiable: timeout`; truncation → `unverifiable`; no orphaned children after the live run (`pgrep` showed only the reviewer subagent's own test runs).

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 73 — 63 `isAllowed()` spellings (17 unexpected `allow`), 7 per-spec `--format=/x` spellings, 3 **executed** runs (prettier `--write`, node `-r`, gh egress) in a scratch fixture
- A write with no precondition and an arbitrary-host request from a mode the contract calls read-only. The cycle-5 shapes themselves are closed; the failures are in arms (`npm --` passthrough, `gh api <url>`) that no cycle's enumeration reached — cycle 3 tried `npm test -- -r ./x`, accepted it as relative, and stopped.

### Maintainability — CONCERNS
The mechanism the cycle-5 fix introduced (`spec.patternFlags`) is untested (mutant `no-red-untested`; reviewer CR-1); `--date` lives in both the global and the git set (CR-2); one comment miscounts the removed names (CR-3); the catch-block resolve omits `truncated` (CR-4). The task document's QA section drifted for four cycles.

---

## Code Review

Reviewer: read-only Explore subagent, narrowed to commit `979a1a8e` (4m05s, 16 tool uses, suite re-run 28/28). `code_review_blocking` not set → advisory. Boundary rule: `boundary: true` (the allow-list is a classifier), **`probes_executed: 73`**.

**Correctness bugs (1):**
- [low/high] `skills/session-handoff/tests/handoff-verify.test.js:232` — `git log --format=%H --date=/x` never exercises the per-spec `patternFlags` path (`%H` passes the plain rule; `--date` is still global), so deleting `patternFlags` from both git specs keeps the suite green → add `git log --format=/%H` and `git show --pretty=/x HEAD` as allowed assertions.

**Cleanups (3):**
- `handoff-verify.mjs:294` — `--date` is in `GIT_PATTERN_FLAGS` and still in the global `PATTERN_FLAGS` → one home per name.
- `handoff-verify.mjs:188` — comment says "exactly those four" but five names were removed → reword.
- `handoff-verify.mjs:1361` — the JSDoc promises `truncated` but the spawn-throw catch resolve omits it → add `truncated: false`.

**Mutation proofs (this cycle):**
```
mutation-proven: restore `--reporter` to the global PATTERN_FLAGS → `whitelist: mutating shapes, unknown binaries and shell operators are refused` → covered
mutation-proven: delete `patternFlags` from GIT_SPECS.log and .show → (nothing) → no-red-untested
```

**Platform variance**: `TMPDIR=/tmp command node --test 'skills/session-handoff/tests/*.test.js'` → 28/28, exit 0.

**QA-executed boundary probes** (not the reviewer's — Step 3b.3, on the `code_review` finding shape):
- [high/high] `handoff-verify.mjs:707` — `npm run format:check -- --write` rewrites the tree (executed) → promoted to gate as bug.6
- [medium/high] `handoff-verify.mjs:707` — `npm test -- -r /tmp/evil.js` preloads (executed) → bug.6
- [medium/high] `handoff-verify.mjs:622` — `gh api http://127.0.0.1:<port>/x` requested (executed) → bug.7
- [low/high] `handoff-verify.mjs:733` — `npm run eval:*:cli|sdk` live drivers allowed (reasoned)
- [low/medium] `handoff-verify.mjs:191` — `C:/…` / `C:\…` pass the absolute rule (reasoned)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Skill suite (`skills/session-handoff/tests`) | PASS 28/28 |
| Full hermetic suite (`npm test`) | PASS — 3299 tests, 3298 pass, 0 fail, 1 skipped, exit 0 |
| Live handoff read mode (`.agents/handoff.md`, `--timeout 20`) | PASS — 18 confirmed · 0 stale · 2 unverifiable (timeouts, by design) |
| `quick_validate.py skills/session-handoff` | PASS |
| `prettier --check` (skill + task dir) | PASS |
| Cycle-5 refused shapes (4 absolute spellings + variants) | PASS — all refused |

---

## Test Artifacts

### Files Reviewed
`skills/session-handoff/scripts/handoff-verify.mjs` (whitelist §, `npmRule`, `ghRule`, `interpreterRule`, `valueOk`, `compareFigure`, `firstLines`), `skills/session-handoff/tests/handoff-verify.test.js`, `skills/session-handoff/SKILL.md` (whitelist contract), `package.json` scripts, `evals/shared/drivers/claude-cli.mjs`, gate/QA 1–5.

### Test Commands Executed
```bash
command node --test 'skills/session-handoff/tests/*.test.js'                 # 28/28
TMPDIR=/tmp command node --test 'skills/session-handoff/tests/*.test.js'     # 28/28
npm test                                                                      # full hermetic suite
python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff
npx prettier --check skills/session-handoff docs/tasks/task.110.session-handoff-skill
command node skills/session-handoff/scripts/handoff-verify.mjs .agents/handoff.md --timeout 20
command node <scratch>/probe.mjs            # 63 isAllowed() spellings
command node <scratch>/fixture/run.mjs      # npm test -- -r <abs>   → marker written
npm run format:check -- --write             # in fixture → files rewritten
command node <scratch>/egress.mjs           # gh api http://127.0.0.1:<port>/x → listener hit
```

### Coverage Report
Not collected (node `--test` without `--experimental-test-coverage`; no target set by the task).

---

## Recommendations

### Immediate Actions (Blocking)
1. **bug.6** — remove the `--` passthrough for non-test npm scripts; hold `npm test -- …` to `NODE_FLAGS`/`NODE_FLAG_PATTERN` + `POS.PATHS`; add `npm run format:check -- --write`, `npm test -- -r /tmp/evil.js`, `--require=`, `--import=`, `--experimental-loader=`, `--test-reporter=` (absolute) and the quoted form to the refused-list test. P1.
2. **bug.7** — refuse `://` in the `gh api` endpoint; add `gh api https://evil.example/x` to the refused-list test. P2.

### Short-term Actions (Non-Blocking)
1. Exclude `eval:*:cli` / `eval:*:sdk` from the npm `run` allow-list.
2. Drive-letter absolute rule (`/^[A-Za-z]:[\\/]/`) beside the UNC rule.
3. Test the per-spec `patternFlags` path; one home for `--date`; the three reviewer cleanups.
4. Consider redacting or not printing measured output for plain readers on absolute paths outside the repo (`firstLines` is an output channel).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH — a working-tree write from read mode with no precondition beyond the handoff line — plus a MEDIUM egress; both executed, both in arms no previous enumeration probed. Security NFR FAIL.
**Quality Score**: 40/100 (100 − 20 HIGH − 10 MEDIUM − 20 security FAIL − 10 maintainability CONCERNS)

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.6 and bug.7 closed with refused-list tests; per-spec `patternFlags` tested.

---

**QA Report**: co-located at `task.110.qa.6.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.6.session-handoff-skill.yml`
**PR comment**: posted — https://github.com/Gamaroff/agent-skills/pull/408#issuecomment-5674820127
**Tracker comment** (#407): `reason: already` — the `qa-gate` marker from cycle 1 is per stage, so the card still shows the cycle-1 verdict (obs #93)
**Next Steps**: `/qa-fix` on gate 6, then `/qa-task` cycle 7. The develop-task loop's five-cycle budget is spent; this cycle and the next are the operator's call. The third-strike rule does not fire (gates 4 and 5 carried no HIGH).
