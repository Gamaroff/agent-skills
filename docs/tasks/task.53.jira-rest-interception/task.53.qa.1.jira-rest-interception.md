# QA Report: Task 53 — Intercept Jira REST mutations in two layers

**Task**: [task.53.jira-rest-interception.md](./task.53.jira-rest-interception.md)
**Gate File**: [task.53.gate.1.jira-rest-interception.yml](./task.53.gate.1.jira-rest-interception.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**Gate Status**: FAIL

---

## Executive Summary

The net holds. Under a restricted `access.tracker`, no Jira mutation reaches the network on any
gated path, and the suite proves it against a stub that throws on any write rather than asserting it
by inspection. Layer 1 sits where it must — above the retry loop — and layer 2 renders field names
and values rather than a request body.

What fails is one layer up. **Three high-severity paths report a refused mutation as a success, and
two of them write that false success into a document.** That is the invisible drift this whole
sequence exists to remove, reintroduced by callers that were never taught what a deferral looks
like. The defect is not in the gate; it is in everything downstream of it that still reads
`resp.ok` and believes it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All 7 implementation phases completed and checked
- [x] Tests passing (1379/1379)
- [x] Breaking changes documented (roster 20 → 21, all five counting sites move together)
- [x] Code on `feature/task.53.jira-rest-interception` with open PR #250

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b). The task is
`risk_level: high` and touches multiple modules, so the Adaptive Review Strategy calls for the
heavier path; the code review was scoped to the 25 source files, excluding the 81 generated
`skills/*/references/` copies, so the reviewer read the change rather than 14 copies of it.

A traceability matrix was built first (`.summaries/qa-traceability-matrix.md`). It found eight
success criteria with no asserting test; all eight were closed in commit `7da6fa6` before this
review ran. That is recorded here because it is the reason the suite grew 1371 → 1379, not because
QA fixed anything.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1 — `jira.unknown-mutation` roster kind, renderer, counts | PASS | Verified | Five sites move together; §12 pins the bundled copies too |
| 2 — layer 1 in `makeHttp` / `http()` | PASS | Verified | Above the retry loop; §5 proves one record across a 429 ladder |
| 3 — layer 2 at the semantic mutators | CONCERNS | Partial | Annotations correct (§2, §7b), but the transition chain — reachable from four sync-script call sites — was left un-deferral-aware (**CR-1**) |
| 4 — `jsm_curl` guard incl. the globals | CONCERNS | Partial | Globals set correctly and both scripts complete (§8b), but both then print a success line for a refusal (**CR-4**), and the gate is inert under the documented invocation (**CR-2**) |
| 5 — `--json` `reason: "deferred"` + samples | CONCERNS | Partial | Fidelity guard green, but the reason is keyed off the record id, so a failed journal write reports `null` (**CR-3**) |
| 6 — resolver notice + `tracker-access.test.sh` §17 | CONCERNS | Partial | Assertions green, but the new wording overstates coverage (**CR-5**) |
| 7 — tests, `npm run bundle`, docs | PASS | Verified | 1379/1379; bundle committed and pinned by §12 |

**Overall Phase Completion**: 2/7 clean, 5/7 with findings. No phase is unimplemented.

**Control flow verified by hand.** The riskiest edit is the `if (resp.deferred) { … } else {` wrappers
inserted around existing code in three scripts, and two of the three have no full-mode behavioural
test. Each was verified by walking braces rather than trusting indentation: in all three the `else`
block encloses the entire success path (parse → key → timestamp → success logs → `moveToBacklog`,
plus the Team-field block in the epic) and closes immediately before the status-transition section.
Nothing that ran unconditionally in `full` mode is now skipped.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status |
| - | --------- | ------ | ------ | ------ |
| 1 | `full` mode byte-identical | identical | identical opts key set, empty journal (§1) | PASS |
| 2 | No non-GET reaches the network under non-`full` | 0 | 0, proven by a throwing stub (§2, §3, §5, §7, §8, §9) | PASS |
| 3 | `jira.unknown-mutation` exists and renders in 4 formats | yes | yes (§4, handover §1/§14/§16) | PASS |
| 4 | All 5 new kinds legible | 5/5 | 5/5 (§2, §7b, §8, §8b, §9) | PASS |
| 5 | Un-annotated mutation refused and recorded | yes | yes, `irreversible` (§3) | PASS |
| 6 | Exactly one record per logical mutation | 1 | 1 across retries and the epic double-POST (§5, §7, §7b) | PASS |
| 7 | Deferred creates return the null shape; updates the update shape | yes | yes at the HTTP and script layer (§2, §7, §7c) — **but see CR-3** | CONCERNS |
| 8 | `jsm_curl` sets the globals; both sprint scripts complete | yes | yes (§8, §8b) — **but see CR-4** | CONCERNS |
| 9 | `jira-create-epic.js` gated, exclusion stated | yes | gated (§9) — **but see CR-2** | CONCERNS |
| 10 | `--json` samples updated alongside payloads | yes | yes, both directions | PASS |
| 11 | Resolver notice reflects what is enforced | accurate | **overstates — CR-5** | FAIL |
| 12 | The `deferred` reason is documented | yes | yes (§11) | PASS |
| 13 | Invariants watched failing; suites green; bundle committed | yes | 9 mutation proofs; 1379/1379; §12 pins the bundle | PASS |

---

## Breaking Changes Validation

### Breaking Change: the mutation-kind roster grows from 20 to 21

- Documented: **Yes** — Breaking Changes section names it as internal
- Migration path provided: **Yes** — every consumer counting kinds moves in the same commit
- Migration tested: **Yes** — §12 asserts source/bundle parity; removing the renderer or leaving a
  bundled copy at 20 each turns a test red
- Consumer code updated: **Yes** — all five counting sites, plus the fixture

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity (3)

**CR-1 — the transition chain treats the synthetic 202 as a successful transition**
- **Category**: Functional / correctness
- **Observation**: `transitionToStatus` branches on `if (!resp.ok)` (`jira-sync.js:3549`). A deferred
  response is `ok: true`, so a refused `POST …/transitions` falls into the success branch: it logs
  `🔀 Transitioned` and returns `transitioned: true`.
- **Impact**: `syncDocumentStatus` is reached from four call sites *outside* `jira-stage.js` —
  `sync-jira-epic.js:923` and `:1351`, `sync-jira-story.js:1128`, `sync-jira-task.js:925`. Its
  outcome feeds `buildChangeLogEntries`, which emits a `Status → X` row that is written to disk on
  the epic skip path and the story `skippedNoChanges` path. Neither sets `deferredRecord`, so the
  `!deferredRecord` write-back guard never fires. The document records a status change that Jira
  never made.
- **Why the design note did not cover this**: the task's Decisions table argues, correctly, that
  `jira-stage.js` owns `jira.transition` and that `walkLadder` has one caller. But `syncDocumentStatus`
  is a *different* entry point into the same chain, and it has four. "The kind is covered" was true;
  "the chain is unreachable from the sync scripts" was not.
- **Recommendation**: short-circuit on `resp.deferred` to `{transitioned: false, reason: "deferred"}`
  and teach `buildChangeLogEntries` / `summariseStatusOutcome` that this reason means nothing moved.
- **Priority**: P0

**CR-2 — the two hand-rolled gates read an env var their documented invocation never sets**
- **Category**: Functional / security boundary
- **Observation**: `jsm_access_mode` reads `${ACCESS_TRACKER:-full}` and `jira-create-epic.js` reads
  `process.env.ACCESS_TRACKER`. That variable is an *output* of `resolve-platform.sh`; the
  operator-facing knob is `AGENT_SKILLS_ACCESS_TRACKER`. Neither sprint script nor
  `jira-create-epic.js` sources the resolver, and `jira-sprint-manager/SKILL.md:18-20` documents a
  bare `manage-sprint-state.sh <sprint_id> closed`.
- **Impact**: a project with `access.tracker: manual` following its own documented steps gets a real
  sprint close, with the gate silently resolving to `full`. The fail-closed guarantee is absent
  exactly where the task says it added one.
- **Note**: `jira-stage.js` (task.52) makes the same assumption, so this is a sequence-wide contract
  rather than a defect invented here — but those two CLIs are only ever invoked by a pipeline that
  has already sourced the resolver, and these two scripts are not.
- **Recommendation**: resolve the mode inside both gates, reading `AGENT_SKILLS_ACCESS_TRACKER` as
  well as `ACCESS_TRACKER`, most-restrictive-wins, matching the resolver's own contract.
- **Priority**: P0

**CR-3 — the write-back guard keys off the record id, so a failed journal write reports success**
- **Category**: Functional / correctness
- **Observation**: `recordRefusal` catches a failed `dm.defer`, warns, and returns
  `deferredResponse(null)` — so `deferredRecord` is `null`. All three sync scripts gate write-back on
  `!deferredRecord`.
- **Impact**: the one path that produced **zero** records — unwritable journal, roster load failure,
  a kind the roster rejects — is also the one that writes the Change Log row, stamps
  `jira_last_synced_at`, and emits `reason: null` in `--json`. A run that recorded nothing claims
  everything worked.
- **Recommendation**: carry the boolean (`putIssueAtomic` already returns `deferred: true`); gate
  write-back and the JSON `reason` on the flag and keep the id as reporting detail.
- **Priority**: P0

### MEDIUM Severity (2)

**CR-4 — both sprint scripts print a success line for a refused mutation**
- `jsm_defer` returns `JSM_HTTP_STATUS=200`, which both callers read as success, so the operator sees
  `Sprint 42 transitioned to: closed.` and `Moved N issue(s) to: TARGET.` for a mutation that never
  happened. The new `§8b` tests assert those exact strings, which locks the false report in as
  expected behaviour — a test that protects a defect.
- **Recommendation**: set a `JSM_DEFERRED` sentinel alongside the 200; print a deferred line instead;
  update §8b to assert the deferred wording.
- **Priority**: P1

**CR-5 — the reworded resolver notice overstates coverage**
- The notice now claims *all Jira writes … are deferred and recorded*, but `create-issue/SKILL.md:244`
  and `review-task/SKILL.md:593`, `:620`, `:1653` still create, update and comment on Jira issues with
  raw `curl -X POST ${JIRA_URL}/rest/api/2/issue`, and the Atlassian MCP write tools are ungated too.
  The notice's own preceding comment calls an overstatement "worse than none".
- **Priority**: P1

### LOW Severity (4 — advisory, no bug files)

- **CR-6** — the `require` fallback in `jira-create-epic.js` is a duplicate of its own `try` branch.
  The bundler rewrites `../../../shared/resources/X` → `../references/X` **in skill scripts too**, so
  the in-tree fallback it looks like it provides does not exist.
- **CR-7** — the `jira.issue.update` and `jira.backlog.add` annotations omit `skill`, so those records
  are attributed to the library (`jira-sync`) while every create carries the calling skill. The
  handover renderer groups by skill, so one run splits across two attributions.
- **CR-8** — `summariseFields` only unwraps `name`/`value`/`key`/`id`, so
  `timetracking: {originalEstimate: "3d"}` — a field these scripts actually send — renders as
  "(structured value…)" and loses a value a human could have typed; `{name: null}` renders as the
  string `"null"`; null array members render as empty gaps.
- **QA-1** — `makeHttp` now throws on an unrecognised `ACCESS_TRACKER` at **factory** time. Verified:
  `ACCESS_TRACKER=bogus node -e "…makeHttp()"` throws before any request. That fails read-only paths
  that never write — `--probe-workflow` (`sync-jira-story.js:648`) and
  `scaffold-tracker-workflow.js:961`. Refusing to guess is right; failing a pure read on a typo is a
  behaviour regression no success criterion asks for.

**Total**: HIGH 3, MEDIUM 2, LOW 4

---

## NFR Assessment

### Performance — PASS
One string compare and at most one regex per request under a restricted mode; a single destructure
per call in `full` mode. Suite runtime unchanged (~66s). No allocation on the hot path.

### Reliability — FAIL
CR-1 and CR-3 mean a refused mutation is reported as a success and, on two paths, written to the
local document as though it happened. CR-2 leaves both hand-rolled gates inert under their own
documented invocation. The gate itself is sound and fails closed on its own errors — a journal it
cannot write still refuses the mutation — but the surrounding contract does not hold.

### Security — PASS
No credential can reach a record: `buildRecord` redacts before hashing, `endpointOf` drops the query
string so a token in a URL cannot land in an `intent`, and no request body is journalled. The mode is
captured at require time, before `loadDotEnv`, so a dot-env file cannot escalate a restriction. The
POST-as-search allowlist is by URL, not by heuristic.

### Maintainability — CONCERNS
The layers are well commented, and the roster change is pinned at all five sites including the
bundled copies. Against that: CR-4 is a test asserting behaviour that is wrong, and CR-6 is a
fallback the bundler quietly rewrote into a no-op. Both read as protection and are not.

---

## Code Review

Step 3b, one read-only Explore subagent over the 25-file source diff. `code_review_blocking=true` was
passed by the pipeline, so `category: bug` + `confidence: high` findings were promoted to the gate.

**Correctness bugs (5)** — all five verified against the working tree during this review, not taken
on trust:
- [high/high] `shared/resources/jira-sync.js:3549` — transition chain reads a deferral as success → **CR-1**, promoted
- [high/high] `shared/resources/jira-sprint-lib.sh:43` — gate reads an env var the documented invocation never sets → **CR-2**, promoted
- [high/high] `skills/sync-jira-epic/scripts/sync-jira-epic.js:1366` — write-back keyed on the record id, not the deferral → **CR-3**, promoted
- [medium/high] `skills/jira-sprint-manager/scripts/manage-sprint-state.sh:61` — success line printed for a refusal → **CR-4**, promoted
- [medium/high] `shared/resources/resolve-platform.sh:474` — notice overstates coverage → **CR-5**, promoted

**Cleanups (3)**: CR-6 (dead require fallback), CR-7 (record attribution), CR-8 (`summariseFields`
shape handling). Advisory.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (`npm test`) | PASS — 1379/1379, 0 skipped |
| Platform resolver (`tracker-access.test.sh`) | PASS — 381/381 |
| Skill validation (`validate:all`) | PASS — 115/115 |
| `--json` fidelity, both directions | PASS — 7/7 |
| `full`-mode PUT through `makeHttp` | PASS — reaches the transport, status unchanged |
| CI on PR #250 | PASS — test, validate, link-check |

No regression found in `full` mode. Every finding above is on the restricted-mode path.

---

## Test Artifacts

```bash
npm test                                   # 1379/1379
npm run validate:all                       # 115/115
node --test shared/resources/tests/jira-interception.test.mjs   # 27/27
git diff origin/develop...HEAD -- . ':(exclude)skills/*/references/*'   # review scope
ACCESS_TRACKER=bogus node -e "require('./shared/resources/jira-sync.js').makeHttp({})"  # QA-1
```

No coverage instrumentation in this repo (`node --test`, no `--coverage` lane); coverage is argued
from the traceability matrix instead.

---

## Recommendations

### Immediate (blocking)
1. CR-1 — make the transition chain deferral-aware end to end (P0)
2. CR-2 — resolve the access mode inside both hand-rolled gates (P0)
3. CR-3 — gate write-back and the JSON reason on the deferral flag, not the record id (P0)
4. CR-4 — stop printing a success line for a refusal, and fix the test that asserts it (P1)
5. CR-5 — narrow the resolver notice to what is actually gated (P1)

### Short-term (non-blocking)
1. CR-6, CR-7, CR-8 and QA-1 as described above

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Three high-severity findings, each a path where a refused mutation is reported as
success; two of them persist that false success to a document. The interception itself is correct and
well proven — the failure is in the callers' contract with it.
**Quality Score**: 20/100 — `100 − 20×3 (high) − 10×2 (medium)`

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1, CR-2 and CR-3 fixed and re-reviewed.

---

**Next Steps**: `/qa-fix` against `task.53.gate.1.jira-rest-interception.yml`, then re-review.
