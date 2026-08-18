# QA Report: Task 52 - One deferred-mutation record, four renderings of it

**Task**: [task.52.deferred-mutation-record-and-renderers.md](./task.52.deferred-mutation-record-and-renderers.md)
**Gate File**: [task.52.gate.1.deferred-mutation-record-and-renderers.yml](./task.52.gate.1.deferred-mutation-record-and-renderers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**Gate Status**: FAIL

---

## Executive Summary

The architecture is sound and the half of this task that touches live pipeline paths — the two
access gates — is the best-tested part of it: verified to attempt no network call under all four
restricted modes, byte-identical under `full`, and fail-closed when the journal cannot be written.
The build is green across 1732 tests.

The record-identity and rendering layers are not ready. **Seven HIGH defects, all independently
reproduced.** Two are arbitrary command execution from the *committed* shell script, firing during
the dry run the documentation presents as safe. One silently drops a record whose argv matches
another — the exact invisible-drift failure this task exists to remove, and worse than the status
quo it replaces. One makes the committed script unrunnable under `command` mode by masking the
variable names it needs.

The common thread is worth stating plainly: **every one of the seven sits in code the test suite
covers, and the suite caught none of them.** Each fixture happened not to contain the triggering
shape — no `dependsOn` edge in the dedup fixture, no 32-char run in the hostile-body fixture, no
second body in the identity tests, no second redaction pass over argv.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 12 implementation phases marked complete
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR ([#249](https://github.com/Gamaroff/agent-skills/pull/249))

### Testing Approach

- [x] Automated testing (unit + fixture)
- [x] Adversarial probing of stated invariants
- [x] Regression testing (live board read, credential-free plan path)
- [x] Security review (redaction, gate placement)
- [x] Code review (Step 3b — see note)

### Review Methodology

Direct tools, plus independent adversarial probes written against the task's headline claims rather
than against the implementation. This is what found both defects: each claim ("renderers are pure
functions of the record list", "a body round-trips unchanged", "no credential value in any output")
was tested with inputs the author's own fixtures did not contain.

Step 3b's diff code-review subagent ran to completion. It independently confirmed both defects found
by my probes and surfaced five further HIGH issues. **Every finding below was re-verified by running
the code** before being accepted — one claimed scenario (backticks reaching the `run_step` line) did
not reproduce as described and was re-tested until the real path was found (the no-`argv` `echo`
fallback), where it was confirmed by actual execution.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. `defer-mutation.js` — single writer | PASS | Verified | CJS, dual entry (`require.main === module`), roster-validated, refuses unknown kind |
| 2. `handover-render.js` — four formats | **CONCERNS** | Partial | All four render; `md` duplicates dependants (BUG-1) |
| 3. `tracker-access-record.md` — schema + roster | PASS | Verified | 20 kinds parsed: 9 Jira + 11 GitHub |
| 4. Four renderers as pure functions | **CONCERNS** | Partial | Purity/idempotency verified; `md` occurrence count wrong (BUG-1) |
| 5. `file-naming.md` — story + task tables | PASS | Verified | 2 rows present |
| 6. `pipeline-artifacts.md` — row | PASS | Verified | Row, tree and documents table (seven → eight) |
| 7. Report template section | PASS | Verified | Present in **both** templates |
| 8. `jira-stage.js` gated | PASS | Verified | Gate line 423, `getAuth()` line 498 — gate precedes credential read |
| 9. `gh-stage.js` gated | PASS | Verified | Gate line 829, `ghAvailable()` line 918 — gate precedes credential read |
| 10. `.gitignore` | PASS | Verified | No change needed; fixtures committable, live journal ignored |
| 11. Tests + fixtures | **CONCERNS** | Partial | 51 tests, 9 fixtures — but two blind spots (see below) |
| 12. Build green | PASS | Verified | See Test Artifacts |

**Overall Phase Completion**: 9/12 PASS, 3 CONCERNS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| One writer; shell and node byte-identical | Yes | Yes — asserted in §13 | PASS |
| All 20 kinds render in all four formats | 20 × 4 | 20 × 4, enumerated from the schema doc | PASS |
| Dedup on `id` idempotent across a resume | Yes | Verified through the real CLI path: 3 invocations → 3 lines → 1 action | PASS |
| `dependsOn` respected — nothing before its prerequisite | Yes | Ordering correct; **but each dependant listed twice in `md`** | **FAIL** |
| No credential value in any output | Yes | No leak demonstrated; **but legitimate content corrupted** | **FAIL** |
| Empty journal writes nothing | Yes | Verified — no file created | PASS |
| `handover` registered (story + task, pipeline-artifacts) | Yes | Yes | PASS |
| Stage CLIs decline under every non-`full` mode | Yes | Exit 0, `deferred`, one record, no network — all 4 modes, both CLIs | PASS |
| Byte-identical under `full` | Yes | Unset ≡ explicit `full`; 160 existing stage tests green | PASS |
| Every invariant watched failing under mutation | Yes | 11 invariants; 2 initially survived and drove test strengthening | PASS |
| `npm test`, `validate:all` green; bundle run | Yes | Yes | PASS |

---

## Breaking Changes Validation

### Breaking Change: stage CLIs may exit 0 with `reason: "deferred"`

Documented: Yes · Migration Path Provided: Yes (none needed) · Migration Tested: Yes · Consumer Code Updated: N/A

`reason` is an existing field on both CLIs and callers already branch on it; `deferred` joins the
existing vocabulary. Verified inert under `full` — an unset `ACCESS_TRACKER` is byte-identical to an
explicit `full`, and all 160 pre-existing stage-CLI tests pass unchanged.

### Breaking Change: new report-template section

Documented: Yes · Migration Path: None needed · Tested: Yes

Renders empty and is omitted when the journal has no records.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (7)

**Issue: Arbitrary command execution from the committed handover script**
- **Severity**: HIGH · **Category**: Security · **Priority**: P0
- **Bug Report**: [task.52.bug.3.generated-script-command-execution.md](./task.52.bug.3.generated-script-command-execution.md)
- **Observation**: Two paths. (a) A newline in `intent` escapes the `#` comment and lands at file scope. (b) Backticks in a target label reach an unescaped double-quoted `echo` in the no-`argv` fallback. **Verified by execution**: a record with `target.sprint` = `` `touch /tmp/QA_PWNED` `` created that file during a **dry run**.
- **Impact**: Arbitrary command execution from a file the pipeline commits to the repository and asks a human to read and run. Neither input end is trusted — column names come from the consumer's `tracker-workflow.yaml`, `--issue` is an unvalidated free string.
- **Recommendation**: `shQuote` every interpolated string; reject interior newlines in `buildRecord`; add an execution test asserting a hostile record has no side effect during a dry run.

**Issue: Distinct records collapse to one id and are silently dropped**
- **Severity**: HIGH · **Category**: Functional · **Priority**: P0
- **Bug Report**: [task.52.bug.4.record-identity-collision.md](./task.52.bug.4.record-identity-collision.md)
- **Observation**: `computeId` never uses `command.stdin` or `intent`. Two comments to the same issue share argv and differ only in body. **Verified**: both yield `b3afd88c`; `dedupe` keeps 1 of 2.
- **Impact**: A wanted tracker action vanishes from all four renderings. `⚠️ UNRECORDED` does not help — a record *was* written, so the kind is in `seenKinds`. This is the invisible-drift failure the task exists to remove, and it is worse than today's behaviour, where such a mutation at least becomes an Issues Log warning.
- **Recommendation**: Include `stdin` and `intent` in the fingerprint.

**Issue: Double redaction destroys the variable names the script needs**
- **Severity**: HIGH · **Category**: Functional · **Priority**: P1
- **Bug Report**: [task.52.bug.5.redaction-not-idempotent.md](./task.52.bug.5.redaction-not-idempotent.md)
- **Observation**: Redaction runs on write and again on render. **Verified**: pass 1 gives `["--token","$GITHUB_TOKEN"]`; pass 2 gives `["--token","«redacted»"]`.
- **Impact**: Under `command` mode — whose entire purpose is a runnable script — the committed `.sh` cannot run, and the operator cannot tell which variable to export. §6 passes only because it asserts on `verify.cmd`, a plain string, never on `command.argv` after both passes.
- **Recommendation**: Treat `$IDENT` and `«redacted»` as terminal in `maskOrName`.

**Issue: `-u` and `-p` are masked unconditionally**
- **Severity**: HIGH · **Category**: Functional · **Priority**: P1
- **Bug Report**: [task.52.bug.6.flag-masking-too-broad.md](./task.52.bug.6.flag-masking-too-broad.md)
- **Observation**: **Verified**: `git push -u origin HEAD` → `git push -u «redacted» HEAD`; `mkdir -p docs/tasks` → `mkdir -p «redacted»`.
- **Impact**: The generated script fails or pushes to a branch named `«redacted»`, with no signal that anything was altered.
- **Recommendation**: Make the rule client-aware, or mask only the part after the first `:` for `-u`.


**Issue: Markdown checklist lists dependants twice**
- **Severity**: HIGH · **Category**: Functional
- **Bug Report**: [task.52.bug.1.md-renderer-duplicates-dependants.md](./task.52.bug.1.md-renderer-duplicates-dependants.md)
- **Observation**: `handover-depends-chain.jsonl` (3 records) renders **5** unticked checkboxes. Each `dependsOn` target appears nested under its dependency *and* again standalone in its own consequence group.
- **Impact**: An operator working the `manual`-mode checklist performs each dependent action twice — a duplicate comment, a duplicate board add. Where the duplicated action is `irreversible` (issue/PR creation) it produces a duplicate that must be reconciled by hand. Bounded: `sh`, `json` and `summary` are all correct, so the generated script does not double-execute.
- **Recommendation**: Consult the `_rendered` marker in the top-level loop, and assert one checkbox per outstanding record.
- **Priority**: P1

**Issue: Redaction corrupts legitimate body content**
- **Severity**: HIGH · **Category**: Functional
- **Bug Report**: [task.52.bug.2.redaction-corrupts-legitimate-content.md](./task.52.bug.2.redaction-corrupts-legitimate-content.md)
- **Observation**: The generic `/\b[A-Za-z0-9+/=_-]{32,}\b/g` rule is applied to every string, including `command.stdin`, `intent` and `manual.fields[].value`. A 40-char commit SHA, an embedded base64 asset and a long URL path segment all render as `«redacted»`.
- **Impact**: Silent data corruption in the text a human is instructed to paste into the tracker, with no signal that it was altered. Makes the "a body round-trips unchanged" invariant false in the general case. Commit SHAs and base64 assets are common in the DoD and QA content these records carry.
- **Recommendation**: Scope the generic high-entropy rule to credential-bearing positions only. The env sweep and prefixed shapes — which are what actually catch real secrets — stay applied everywhere.
- **Priority**: P1

### LOW Severity Issues (2)

- **`redactDeep` redacts object values but not object keys.** A secret appearing as a key would survive. Not reachable from current call sites (targets are built from code, not user input), so recorded rather than filed.
- **`nextOrder()` re-reads the whole journal on every append** — O(n²) across a run. Irrelevant at run scale (tens of records); worth revisiting only if journals ever grow.

### MEDIUM Severity Issues (9)

Documented here rather than as individual bug files — all are captured in the gate's `top_issues`
with reproduction and suggested action, and all are being addressed in the same fix cycle.

| ID | Issue | Impact |
| -- | ----- | ------ |
| BUG-7 | `handover-render.js` is bundled into no skill and invoked by no pipeline step | A bundled run under `manual` defers records that **nothing renders** — no artifact, no summary |
| BUG-8 | `read … < /dev/tty` under `set -euo pipefail` aborts the script with no tty | An `--apply` run in CI stops at the first irreversible action and silently skips the rest |
| BUG-9 | `parseRoster` silently truncates on a reformatted row | Bolding one kind drops 11 kinds; `defer()` then throws inside the gate, which swallows it → board move neither performed **nor recorded** |
| BUG-10 | `loadDotEnv` creates a second `ACCESS_TRACKER` path the resolver never sees | `.env` can restrict (or, via a typo, exit-2) every pipeline step while `resolve-platform.sh` reports `full` |
| BUG-11 | Redaction holes: object keys, non-string scalars, sub-8-char env values, URL userinfo | Verified: a token used as an object **key** survives into md/summary/json |
| BUG-12 | `SECRET_ENV_NAME` matches `AUTH` inside `GIT_AUTHOR_*` | Verified: `"Reviewed by Gareth Armstrong"` → `"Reviewed by $GIT_AUTHOR_NAME"` |
| BUG-13 | `markdownItem` mutates model records → `renderMarkdown` not idempotent on a shared model | `--format md --format md` produces two different files |
| BUG-14 | Journal path is cwd-relative; gates don't pass the repo root | A step run from a subdirectory writes a journal the renderer never reads |
| BUG-15 | The gate defers without the permitted board read | A card already at `Done` gets a checklist entry telling the operator to drag it **backwards** |

**Total Issues**: HIGH: 7, MEDIUM: 9, LOW: 2 (+ 6 cleanups recorded in the gate)

---

## Why the existing suite missed both

Neither defect is exotic; both were missed for the same structural reason — **the fixture did not
contain the shape that triggers the bug**:

| Defect | Test that should have caught it | Why it did not |
| ------ | ------------------------------- | -------------- |
| BUG-1 | §2 dedup — "rendered once" | Its fixture has no `dependsOn` edges, so the nesting path never ran |
| BUG-1 | §3 nesting | Asserts relative indentation and ordering only, never occurrence count |
| BUG-2 | §9 hostile body — "round-trips unchanged" | Its fixture has backticks, `$(…)`, terminators and CRLF, but no unbroken 32+ char run |

The lesson for the fix: assert **counts and byte-equality**, not just presence and relative order.

---

## NFR Assessment

### Performance — PASS
Roster parsed once and memoised; journal append is one sub-4KiB write; the gate is a string
comparison ahead of any I/O. `nextOrder()` is O(n) per append (LOW, above).

### Reliability — FAIL
Both HIGH findings are output-layer reliability defects. Otherwise strong: malformed lines skipped
with a warning, a crash leaves a readable prefix, a future schema version refused rather than
guessed at, dedup idempotent across a resume, the defer branch fails closed rather than falling
through to the mutation, and an unrecognised access mode refused rather than defaulted.

### Security — FAIL
Two confirmed arbitrary-command-execution paths (BUG-3) in a **committed** script, both firing during
the dry run. Residual redaction holes (BUG-11): object keys, non-string scalars, sub-8-char env
values, URL userinfo.

What does hold, and holds well: the env sweep and prefixed shape matchers catch real configured
secrets; the gates were verified to attempt **no network call** under all four restricted modes using
throwing transport stubs **with a full credential set present**, so the assertion measures the gate
rather than an empty environment; the gate fails closed if `defer()` throws; an unrecognised access
mode is refused rather than defaulted.

### Maintainability — CONCERNS
Real strengths: the roster is single-sourced and parsed at load so doc and code cannot drift;
conventions match the surrounding modules; the mutation ledger is honest, including two mutations
that initially survived and drove the tests to be strengthened.

Against that: `parseRoster` fails silently on a reformatted row (BUG-9); three dead artifacts remain
(an unused `stack` parameter threaded through every recursive call, an unused `argvLine` export, an
unreachable `startsWith("$")` guard); and the suite has a demonstrated blind spot — all seven HIGH
defects are in covered code.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Existing stage-CLI suites (160 tests) | PASS — unchanged |
| Live board read (`gh-stage --probe-board --issue 230`) | PASS — exit 0, `reason: probe`, board "Agent Skills", options Todo/In Progress/Done |
| Credential-free plan path (`jira-stage --print-plan`) | PASS — exit 0, `reason: plan`, resolves from the authored ladder |
| `gh-stage --probe-board` without `--issue` | PASS — exit 2 usage error, pre-existing behaviour, not a regression |
| Full repo suite | PASS — 1338 node + 394 shell, 0 failed |
| Bundle sync | PASS — `npm run bundle` produces no drift |

Note: the `in-review` moment reporting `stage-disabled` at Step 4 was verified **correct** — the live
board declares only Todo / In Progress / Done, so that moment is genuinely disabled.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test                 # 1338 node + 394 shell, 0 failed
npm run validate:all     # 115 passed, 0 failed
npm run bundle           # clean, no drift
node shared/resources/gh-stage.js --probe-board --issue 230 --json
node shared/resources/jira-stage.js --stage done --print-plan --json
```

### Coverage

Not instrumented in this repo — the suite is behavioural (`node --test` + shell harnesses). Coverage
was assessed by the mutation ledger instead, which is the stronger signal here: 11 invariants, each
watched failing.

---

## Recommendations

### Immediate (Blocking)

1. **BUG-1** — skip already-rendered records in `renderMarkdown`'s top-level loop.
2. **BUG-2** — scope the generic high-entropy rule to credential-bearing positions.
3. Add regression fixtures for both: one checkbox per record under `dependsOn`; a body containing a
   commit SHA and a base64 blob that round-trips byte-exactly.

### Short-term (Non-Blocking)

1. Consider redacting object keys as well as values.
2. Track the max order in memory rather than re-reading the journal per append.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Seven HIGH defects, all reproduced. Two are command execution from a committed
artifact; one silently loses records; one makes the committed script unrunnable. The architecture and
the access gates are sound and genuinely well tested — every failure is localised to record identity
and rendering, and each has a clear, contained fix.
**Quality Score**: 25/100

**Deployment Recommendation**: BLOCKED
**Conditions**: All seven HIGH issues fixed with regression tests, each watched failing; the
command-execution paths proven closed by an execution test.

---

**Next Steps**: `/qa-fix` addresses both bugs, then QA cycle 2 re-reviews (and folds in the Step 3b
code-review findings).
