# QA Report: Task 327 - SubagentHandback replies are extracted, not hand-copied

**Task**: [task.327.subagenthandback-replies-are-extracted.md](./task.327.subagenthandback-replies-are-extracted.md)
**Gate File**: [task.327.gate.1.subagenthandback-replies-are-extracted.yml](./task.327.gate.1.subagenthandback-replies-are-extracted.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

The hand-back reader does what the task asks. A real hand-back transcript from this host extracts byte for byte, and every new rule is held by a named test that a mutation turns red. The new `--out` removal brings a data-loss path, though. A symlinked `--transcript` gets past the same-file guard, and `extract` then deletes the transcript. It also crashes on a directory `--out`. The CI `link-check` lane is red on a `mailto:` false link in the implementation report.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (T327-QA-1 and T327-CI-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status Ready for Review
- [x] All 4 implementation phases ticked
- [x] Tests passing (ci:fast 8919/0 on the LAN server)
- [x] Breaking change documented (failed extract removes an existing `--out`)
- [x] Feature branch with open PR #959

### Review Methodology

Direct tools (small task: 4 phases, one module, low risk). Diff review: code review, one read-only Explore subagent over the whole branch diff, docs excluded (dispatched 20:35:21Z, returned after 54176 ms by its completion notice). Traceability mapper not dispatched; criteria were mapped inline.

CI on c1976c87392a: 1 failed (0 pre-existing)

Step 4b: the change set touches no fenced bash block in `skills/finalise/SKILL.md`. The engine reports `changed` total 0. The file-level `zero-blocks-executed` (52 blocks: 2 placeholder, 50 mutating) is the file's existing state, not this change's.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Read the hand-back reply | PASS | Verified | later-of-two rule, `reply` field |
| Phase 2: Clear `--out` before reading | CONCERNS | Partial | symlink gap (T327-QA-1), directory crash (T327-QA-3) |
| Phase 3: Callers and prose | PASS | Verified | CLI hand-back test, both SKILL.md paragraphs, bundle, CHANGELOG |
| Phase 4: Verify | PASS | Verified | mutation table, ci:fast green |

**Overall Phase Completion**: 3/4 phases passed clean, 1 with concerns

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Hand-back-only transcript → `extracted`, `reply: "handback"`, byte-exact with CONTROLS | PASS | test "task 327: a hand-back-only transcript…"; mutation (a) red |
| 2 | Text control → `reply: "text"`, same bytes | PASS | text-control test |
| 3 | Later of text and hand-back wins, both orders | PASS | both order tests and the same-message tie; mutations (a), (b) red |
| 4 | Block only in an earlier turn not read | PASS | "earlier hand-back, then a text turn with no block" test; mutation (b) red |
| 5 | Other tool names never read; empty or non-string message → unreadable | PASS | mutations (c), (c2) red |
| 6 | No file at `--out` after any answer but `extracted` | PASS | module + CLI stale-`--out` tests; mutation (d) red |
| 7 | `--out` naming the `--transcript` is exit 2, transcript unchanged | **FAIL** | literal path holds (mutations e, f); a symlink to the transcript deletes it (T327-QA-1) |
| 8 | `finalise-rerun-scope.js extract` on a hand-back + `merge --sha256` → `verified: true` | PASS | CLI test in `finalise-rerun-scope.test.mjs` |
| 9 | One real hand-back transcript extracts, recorded here | PASS | record below |
| 10 | Every new test red before its change | PASS (7 of 10) | 3 cases held rules that already held; each is held by a mutation instead (b, c, c2) |
| 11 | Reverting any remedy turns a named test red | PASS | mutation table below |
| 12 | `npm test` under CI=true; bundle leaves no diff | PASS | ci:fast 8919/0; `bundle:check` 0 problems |
| 13 | SKILL.md says a failed extract leaves no `--out`, both paragraphs | PASS | `skills/finalise/SKILL.md` probe-plan and AC fallback paragraphs |
| 14 | CHANGELOG cites (task 327) | PASS | `changelog-cites.sh task.327` → cites |

### Record: real hand-back transcript (criterion 9)

```
command node shared/resources/agent-reply-block.js extract --transcript ~/.claude/projects/<project>/<session>/subagents/agent-a7b3a36606dac7dad.jsonl --block finalise-ac-yaml --out <scratch>/ac.yaml --json
reason: extracted   bytes: 17900   reply: handback
sha256: 77072d335c5e3efee8b7192872d87b047c51a7fe5398afd668f0f8f602a970c9
cmp against the jq | awk hand copy: identical
```

### Criteria drift

`criteria-drift.js --base-from-review develop` → `drift`, base `review-commit` (inexact). Criterion #7 is reported `added`, not approved. Review 1 added it as an Important fix. The review's `reviewed_blob` (3caae1de…) is not in the object database, so the engine fell back to the review commit. That commit holds only the review report and predates the fix (T327-QA-2).

---

## Breaking Changes Validation

### Breaking Change: a failed extract removes an existing `--out`
Documented: Yes (task §5, PR body, both SKILL.md paragraphs)
Migration Path Provided: Yes (both callers write `--out` afresh on fallback)
Consumer Code Updated: Yes
Notes: the removal is where T327-QA-1 and T327-QA-3 come from.

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### MEDIUM Severity Issues (3)

**T327-QA-1: the same-file guard misses a symlinked transcript, which is then deleted**
- **Category**: Reliability / data loss
- **Observation**: reproduced by QA. `t.jsonl` holds a transcript and `link.jsonl → t.jsonl`. `extract --transcript link.jsonl --block finalise-ac-yaml --out t.jsonl --json` answered `transcript-not-found`, exit 0, and `t.jsonl` was gone. Control: `--transcript u.jsonl --out u.jsonl` answers `usage`, exit 2, and `u.jsonl` survives. Base never removed `--out`, so this is new (not pre-existing).
- **Recommendation**: compare file identity (realpath, or dev+ino), and remove `--out` only after the transcript path is resolved, never when it is that file. Add a symlink test.
- **Origin**: code-review CR-1 (medium/high), reproduced by QA.

**T327-QA-2: criterion 7 reads as added without an approver**: see Criteria drift above. Record the approval on the criterion. Do not reword it.

**T327-CI-1: `link-check` red on PR #959**
- `ERROR: 1 dead link … initial-run.md — [✖] mailto:ci@… → Status: 400`. The implementation report names the LAN test host in user@address form. Green on develop (run 45888757219).
- **Recommendation**: name the host without that form, and commit the report change with the fix.

### LOW Severity Issues (1)

**T327-QA-3**: `fs.rmSync(opts.out, { force: true })` is unwrapped. A directory `--out` crashed `extract` with an uncaught Node error (reproduced), where it used to return a named reason. Wrap it, or refuse a directory `--out`.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
One pass over the transcript lines, unchanged in shape.

### Reliability — CONCERNS
Directory or unremovable `--out` crashes `extract` (T327-QA-3).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- The criteria's `never` signal names reply selection and self-deletion. `replyText` reads only transcript JSONL the harness writes, and no corpus sink models it. `extractUsageError` is an equality guard, not a hostile-input gate. The symlink data-loss path was found by the reviewer and reproduced by execution (T327-QA-1).

### Maintainability — PASS
One reader for both callers. The bundled copy matches its source, and the doc comments describe the new rule.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/agent-reply-block.js:338`: the guard compares `path.resolve` strings, so a symlink, a hard link or the agent-id route gets past it and the transcript is deleted → compare file identity, and remove after the transcript is resolved. Promoted: T327-QA-1 (reproduced).
- [low/high] `shared/resources/agent-reply-block.js:217`: unwrapped `rmSync` crashes on a directory `--out` or an EACCES path → wrap it and return a named reason. Promoted: T327-QA-3.

**Cleanups (0)**

Anchors: `finding-anchors.js` → ok (both `ok`).

Boundary: `boundary: internal` for `replyText` (input is harness-written transcript JSONL; no corpus sink fits). `boundary: false` for `extractUsageError` (equality guard; candidates named: `extractUsageError`, the in-`extract` guard; no hostile-input signal). `probes_executed: 0`, `escaped: 0`.

mutation-proven: (a) drop the hand-back branch → hand-back-only, same-message tie, hand-back-after-text, CLI hand-back/merge → covered
mutation-proven: (b) hand-back wins regardless of order → text-after-hand-back, earlier-hand-back-then-text → covered
mutation-proven: (c) accept any tool name → "a tool_use of another name is never read" → covered
mutation-proven: (c2) accept an empty message → "empty or not a string answers transcript-unreadable" → covered
mutation-proven: (d) drop `rmSync` → module stale-`--out` + CLI stale-`--out` → covered
mutation-proven: (e) drop the usage refusal → "`--out` names the `--transcript`" → covered
mutation-proven: (f) drop the in-`extract` same-file guard → same test (direct-call assertion) → covered

Six remedies, seven mutations, all `covered` by committed tests.

---

## Regression Testing

`agent-reply-block.test.mjs` 16/16 and `finalise-rerun-scope.test.mjs` 65/65 pass. ci:fast 8919/0 covers the other callers.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/agent-reply-block.test.mjs
CI=true command node --test shared/resources/tests/finalise-rerun-scope.test.mjs
npm run test:remote            # ci:fast, CI=true, LAN server
npm run -s bundle:check
npm run -s validate -- skills/finalise/
bash .agents/skills/qa-task/references/changelog-cites.sh task.327
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 959
```

### Coverage Report
Not measured (node:test, no coverage tool in this repository's gate).

---

## Recommendations

### Immediate Actions (Blocking)
1. T327-QA-1: compare file identity in both guards; add a symlink test.
2. T327-CI-1: drop the user@address host name from the implementation report and commit it.
3. T327-QA-2: record the approval on criterion 7.

### Short-term Actions (Non-Blocking)
1. T327-QA-3: wrap the `rmSync`.
2. review-task: write the reviewed blob to the object database when stamping `reviewed_blob`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three medium findings, one reproduced data-loss path among them; no high.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: T327-QA-1 and T327-CI-1 fixed.

**Next Steps**: `/qa-fix` cycle 1, then QA cycle 2 (refute pass).
