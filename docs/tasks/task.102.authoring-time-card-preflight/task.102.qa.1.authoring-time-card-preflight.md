# QA Report: Task 102 — run the card preflight where the defect is created

**Task**: [task.102.authoring-time-card-preflight.md](./task.102.authoring-time-card-preflight.md)
**Gate File**: [task.102.gate.1.authoring-time-card-preflight.yml](./task.102.gate.1.authoring-time-card-preflight.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Gate Status**: PASS (after one fix cycle — CONCERNS → PASS)

---

## Executive Summary

All nine success criteria were verified **by execution**, not by reading: the preflight fires on a
document missing its `## Success Criteria`, it is advisory at authoring and blocking at review, the
four section specs now live in exactly one source file, all four `sync-jira-*` modules still export
theirs, and the authoring path runs with no sync skill installed. Every regression suite is green —
3047 tests, 0 failures.

One medium finding stands between this and a clean pass, and it is worth reading rather than
skimming: the new `card-preflight.js` hand-rolls a frontmatter parse that the same library it
imports already exports. The two implementations **demonstrably diverge**. That is the exact
duplication class this task exists to remove, reintroduced one function down, in the file whose own
header says it defines nothing of its own for precisely that reason.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — resolve T102-001 before merge

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases completed and ticked
- [x] Tests passing (`npm run ci:fast` — 3047 tests, 0 failures, 1 skipped)
- [x] Breaking changes documented (none — verified against the diff)
- [x] Code on feature branch with open PR #373

### Testing Approach

- [x] Automated Testing (unit + regression suites)
- [x] Regression Testing (all four `sync-jira-*` suites, corpus preflight)
- [x] Security Review (reasoned — see NFR)
- [x] Code Review (Step 3b)
- [x] Mutation-Proof Spot Check (Step 3c)
- [x] Documented-command execution (Step 4b)
- [ ] Performance Testing — not applicable, no runtime-critical path

### Review Methodology

**Direct tools, whole-branch scope.** First review, so no re-review narrowing applies.

The Adaptive Review Strategy table nominates **parallel agents** for this task (4 phases, multiple
modules). They were **not** dispatched: the session carries a standing instruction not to use the
Agent tool unless the user asks for it. Recorded as a methodology deviation rather than silently
absorbed, because it changes what this review is evidence of — a single reviewer covered every axis
sequentially instead of four in parallel. The compensating measure was to verify each success
criterion by running it rather than by reading for it, and to re-run one mutation independently of
the develop step's own mutation matrix.

`Adaptive strategy override: parallel agents unavailable — direct tools, all axes covered sequentially`

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| 1 — one definition | PASS | Verified | Four specs + `CARD_SECTIONS_BY_KIND` in `shared/resources/jira-sync.js`; all four sync scripts re-export. `lib` is required before the const in every one (checked by line number, not by eye). |
| 2 — the authoring call | PASS | Verified | `card-preflight.js` called from all three `create-*` skills; path rewritten to `references/…` by the bundler in each. |
| 3 — naming question | PASS | Verified | Answered tracker-agnostic in the implementation report § "The § 8 decision", with the residual tension named rather than claimed resolved. |
| 4 — bundle | PASS | Verified | Re-running `npm run bundle` produces zero further changes — idempotent. |

**Overall Phase Completion**: 4/4 passed

---

## Success Criteria Verification

Every row below was produced by running the check, not by reading the code.

| # | Criterion | Method | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | All three `create-*` run the preflight | `grep -c 'card-preflight.js --file'` per SKILL.md | 1, 1, 1 | PASS |
| 2 | Advisory at authoring | ran the CLI on a document with a missing block | exit **0**; `--strict` exit **1** | PASS |
| 3 | `review-*` remains the blocking gate | `grep -c -- '--check-card'` per review SKILL.md | 1, 1, 1 — unchanged | PASS |
| 4 | Specs defined in exactly one place, asserted with a non-vacuity floor | grep for `const *_CARD_SECTIONS = [` across source | one file: `shared/resources/jira-sync.js` | PASS |
| 5 | A document missing Success Criteria produces a finding | 4 fixture tests, incl. `task.99`'s literal shape | all green; finding is `critical` and names the heading | PASS |
| 6 | Sync suites pass unchanged; each still exports its spec | ran all four suites; read each export | 420 tests, 0 fail; lengths 3/2/1/3 | PASS |
| 7 | Works for a consumer without `sync-jira-*` installed | ran the CLI from a temp dir holding only it + its libs | finding produced, `kind: task` | PASS |
| 8 | § 8 answered and placement follows | read the implementation report | answered **tracker-agnostic**, with evidence and a named residual | PASS |
| 9 | `npm run bundle` run, `references/` committed | re-ran bundle after commit | zero further modifications — idempotent | PASS |

**9/9 verified.**

---

## Breaking Changes Validation

### Breaking Change: none claimed

Documented: N/A — the task states none expected
Verified: **Yes.** The spec move keeps re-exports in place; all four sync suites pass unchanged (420
tests) and the corpus preflight passes unchanged (37 tests). The new authoring call is advisory and
additive.

**Overall Breaking Changes Assessment:** PASS

---

## Code Review

Whole-branch diff, hand-written files only (the 21 generated `references/jira-sync.js` copies were
excluded from the read — they are byte-derived from one source, which a dedicated test now asserts).

**Correctness bugs (1):**

- **[medium/high]** `shared/resources/card-preflight.js:79` — `stripFrontmatter()` reimplements a
  parse the same library exports as `parseFrontmatter()`, and the two diverge. Probed directly:

  | Input | `lib.parseFrontmatter().body` | `pf.stripFrontmatter()` |
  | :--- | :--- | :--- |
  | body opens with a blank line | `"## Overview…"` | `"\n## Overview…"` |
  | CRLF document | `"\r\n## Overview…"` | `"## Overview…"` |

  → **Corpus-checked before sizing it**: both parsers were run over all **177** task/story/epic/bug
  documents in the repo and compared on `ok`, findings and per-block char counts. **Zero
  disagreements.** So this is latent, not live, and it is medium rather than high severity — but the
  divergence is real and the direction of failure is bad: the authoring check passing a body the
  sync then reads differently is the thing the whole task is about.
  → **Fix**: use `lib.parseFrontmatter(text).body`; cover it with a test on a CRLF document and one
  whose body opens with a horizontal rule.

**Cleanups (1):**

- `shared/resources/card-preflight.js:104` — `preflight()` is exported and calls `readFileSync`
  directly, while only `main()` guards with `existsSync`. A library caller gets a raw `ENOENT`
  rather than the CLI's named error. LOW; no gate impact.

**Mutation-proven** (T102-001 is a finding, not a fix, so nothing to prove for it). The develop step
proved four mutations red; QA independently re-ran a fifth, reverting `preflight()` to always return
`ok: true` — **4 of 11 tests went red**, restored to 11/11. The anti-vacuity guarantee is real, not
asserted.

---

## Step 4b — Documented-Command Execution

| File | Blocks | runnable | placeholder | mutating | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `create-task/SKILL.md` | 3 | 0 | 0 | 3 | `no-executable-blocks` (information) |
| `create-story/SKILL.md` | 4 | 0 | 2 | 2 | `zero-blocks-executed` (medium) |
| `create-epic/SKILL.md` | 5 | 0 | 0 | 5 | `no-executable-blocks` (information) |
| `authoring-card-preflight.md` | 1 | 0 | 0 | 1 | `no-executable-blocks` (information) |

**Every skipped block, with its reason** — the silent skip is the failure this step exists to
prevent, so none is elided:

- All four new preflight blocks refused as `unrecognised-command: node (fail-closed)`. The engine's
  allow-list does not include `node`, so a read-only `node <script> --file <doc>` is classified
  mutating. That is the engine's conservatism, not a property of this change — and it is recorded as
  a **future** recommendation, not a defect in this task.
- `create-story/SKILL.md:388` — `unrecognised-command: source (fail-closed)`.
- `create-story/SKILL.md:415`, `:436` — template slots.

**The one `zero-blocks-executed` finding is pre-existing.** Its two placeholder blocks (lines 415,
436) predate this change; they surface now only because the file entered the change set. Not counted
against this task's gate, and stated rather than quietly dropped.

**Coverage note.** Step 4b could not exercise the new call, but the call is not unexercised: the
suite in `card-preflight.test.mjs` invokes the CLI through `execFileSync` four times, including once
from an isolated directory. The check has execution coverage; it just does not come from this step.

---

## NFR Assessment

### Performance — PASS

Offline, one file read, sub-100ms in every observed run; one invocation per authoring session. The
12,714-line diff is almost entirely generated `references/` copies and carries no runtime cost.

### Reliability — PASS

Advisory by construction: exit 0 even with findings, so a preflight failure cannot break an authoring
run. Unknown kind, missing file and unreadable kind each return exit 2 with a message naming the fix.
`process.exitCode` is set rather than `process.exit()` called, so a piped `--json` payload cannot be
truncated — the `bug.3` failure mode is avoided by construction, and the header says why.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0 — and the evidence value says so rather than claiming otherwise.
- No new network, auth or credential surface. The CLI reads one file, writes nothing, spawns nothing
  and takes no shell input. The three `create-*` call sites add one `node` invocation of a read-only
  script. The verdict was reached by reading the diff and the CLI's surface; no hostile candidate was
  executed, so `measured` would be false.

### Maintainability — CONCERNS

Net strongly positive — four definitions became one, held by a test with a non-vacuity floor plus a
bundle-drift check that catches the stale-copy case a forgotten `npm run bundle` creates. The medium
finding is the counterweight, and it is the reason this axis is not PASS: a change that removes
duplicated specs introduced a duplicated parse.

---

## Regression Testing

| Area | Method | Result |
| :--- | :--- | :--- |
| `sync-jira-{task,story,epic,bug}` | full suites | 420 tests, 0 failures |
| Corpus card preflight (task/story/epic) | `jira-sync-card-summary.test.mjs` | 37 tests, 0 failures |
| Whole repo | `npm run ci:fast` | 3047 tests, 0 failures, 1 skipped |
| Bundle idempotency | re-ran `npm run bundle` | zero further modifications |

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: duplicated frontmatter parse in `card-preflight.js`**

- **Severity**: MEDIUM
- **Category**: Quality / latent correctness
- **Observation**: `stripFrontmatter()` duplicates `lib.parseFrontmatter()`; the two diverge on
  leading whitespace and CRLF. 177 real documents produce identical verdicts today.
- **Impact**: latent. If they ever disagree on a real document, the authoring check and the sync read
  different bodies — the failure this task was written to prevent.
- **Recommendation**: use `lib.parseFrontmatter(text).body`; add a divergence test.
- **Priority**: P2
- **Gate entry**: `T102-001`

### LOW Severity Issues (1)

- `preflight()` is exported but only `main()` guards the file's existence; a library caller gets a
  raw `ENOENT`. Documented here only.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## Test Artifacts

### Files Reviewed

- `shared/resources/jira-sync.js` (spec block + exports)
- `shared/resources/card-preflight.js`
- `shared/resources/authoring-card-preflight.md`
- `shared/resources/tests/card-preflight.test.mjs`
- `skills/sync-jira-{task,story,epic,bug}/scripts/*.js`
- `skills/create-{task,story,epic}/SKILL.md`

### Test Commands Executed

```bash
npm run ci:fast
node --test shared/resources/tests/card-preflight.test.mjs
node --test 'skills/sync-jira-{task,story,epic,bug}/tests/*.test.js'
node --test shared/resources/tests/jira-sync-card-summary.test.mjs
node shared/resources/card-preflight.js --file <fixture>            # advisory exit 0
node shared/resources/card-preflight.js --file <fixture> --strict   # exit 1
node references/qa-execute-snippets.mjs --file <each changed .md> --json
npm run bundle                                                       # idempotency
```

### Coverage Report

Not instrumented in this repo — coverage is asserted structurally (mutation proofs + non-vacuity
floors) rather than by percentage.

---

## Recommendations

### Immediate Actions (Blocking)

1. **T102-001** — replace `stripFrontmatter()` with `lib.parseFrontmatter().body` and add a
   divergence test (CRLF document, and one whose body opens with a horizontal rule).

### Short-term Actions (Non-Blocking)

1. Close the bug-report preflight gap: no check at authoring, none in `review-bug`, none in the CI
   corpus. Already filed as a deferred follow-up in the task's § 4.
2. Teach `qa-execute-snippets` that a read-only `node <script> --file` is not mutating, so Step 4b
   can exercise blocks of this shape instead of refusing them.
3. Guard `preflight()` against a missing file so library callers get the CLI's named error.

---

## Final Assessment

**Gate Status**: PASS (after one fix cycle)
**Rationale**: Nine of nine success criteria verified by execution; every regression suite green; no
HIGH findings at any point. The single MEDIUM (T102-001) and the single LOW were both fixed and
mutation-proved in one cycle — including a correction to the regression test itself, which initially
asserted the wrong invariant.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: none.

---

## Bug Resolution Summary

_Appended after the qa-fix cycle. The gate above was updated in place, per the re-review contract._

### T102-001 — duplicated frontmatter parse — **FIXED**

- **Fix**: `stripFrontmatter()` deleted; `preflight()` now takes its body from
  `lib.parseFrontmatter(text).body`, the same parser every sync path uses. A comment at the call
  site records what diverged and why a second parse is forbidden here specifically.
- **Also fixed** (the LOW finding, same cycle): `preflight()` now raises the CLI's named
  `no-such-file` error instead of a bare `ENOENT`, so library callers get the same message as CLI
  users.
- **Verification — and the first attempt at it was inadequate, which is worth recording.** The
  regression test initially compared the two paths' **verdicts**. Reinstating the hand-rolled parse
  turned only the *structural* test red: the divergence produces identical verdicts on every shape
  it was tested against, so a verdict-only assertion would have passed while the two paths read
  different text — the precise state the test exists to forbid. The test now asserts the resolved
  **body** is identical, and `preflight()` returns `body` for that purpose alone.
- **Mutation-proved**: reinstating the hand-rolled parse turns **2 of 13** tests red (parity +
  structural); restored, 13/13 green.
- **Corpus re-probe**: all 177 task/story/epic/bug documents — **0 body mismatches**, now
  structurally rather than coincidentally.
- **Gate**: CONCERNS → PASS. Quality score 90 → 100. Maintainability CONCERNS → PASS.

### Cycle summary

| | Cycle 1 |
| :--- | :--- |
| Findings | 1 MEDIUM, 1 LOW |
| Fixed | 2 of 2 |
| Remaining | 0 |
| Tests | 3047 → **3049**, 0 failures |
| Suite | 11 → **13** assertions |

---

**QA Report**: `task.102.qa.1.authoring-time-card-preflight.md`
**Gate File**: `task.102.gate.1.authoring-time-card-preflight.yml`
**Next Steps**: `/qa-fix` on T102-001, then re-review.
