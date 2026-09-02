---
id: task.70
title: "[Task 70] Build the inline PR comment primitive, on GitHub and Bitbucket"
type: task
description: "No skill in this repo posts an inline PR comment, yet /review-code documents the behaviour and /review-pr scopes it out. Build the primitive once as a shared CLI so a finding can be anchored to the line it is about."
tags: [pr-comment, inline, github, bitbucket, shared-resource]
category: infrastructure
status: ready-for-review
priority: Low
risk_level: medium
created: 2026-08-31
updated: 2026-09-02
assignee:
estimated_effort_hours: 8
---

# Technical Task: Build the inline PR comment primitive, on GitHub and Bitbucket

**Status:** Ready for Review
**Review**: ✅ All applied review recommendations from `task.70.review.1.inline-pr-comments.md` implemented 2026-09-02 (1 Important deferred: tracker linkage)

---

## 1. Overview

Every review finding in this repo carries a `file_line`, and every one is delivered as a wall of text in a summary comment. Build a shared CLI that posts a finding as an **inline comment anchored to its line**, on both platforms, so `/review-code` and `/review-pr` can use it.

**Scope**: one new shared CLI plus its contract, wired into the two review skills.

---

## 2. Motivation

### Current Problems

1. **The behaviour is documented but does not exist.** `/review-code`'s `--comment` says "post each finding as an inline review comment at its `file_line`". No such code exists anywhere in the repo — the documented behaviour was never built.
2. **`/review-pr` scoped it out for exactly this reason**, naming it as its own task. This is that task.
3. **The findings already carry the anchor.** Both `code_review` and `pr_conformance` emit `file_line` / `ref`. The data is there and is discarded at posting time.
4. **A summary comment scales badly.** Twenty findings become one long comment a reviewer reads separately from the diff, instead of twenty notes beside the lines they describe.

### Benefits

1. **Findings land where the reader is looking** — beside the code, not in a separate essay.
2. **Built once, used by both review skills** — and by anything later.
3. **The output contract already fits.** No schema change; the caller passes `file_line` straight through.

---

## 3. Technical Background

### Current architecture

Every PR comment in the repo is a single summary comment on the PR conversation. The dual-platform idempotent version lives in `skills/finalise/SKILL.md`; single-shot variants live in `qa-fix` and (after task 66) `review-pr`.

### Target architecture

A new `shared/resources/pr-inline-comment.js`, a peer of `tracker-comment.js` with the same exit-code and `--json reason` contract.

**GitHub** — either one comment per finding:

```
gh api -X POST /repos/{owner}/{repo}/pulls/{n}/comments \
  -f path=… -F line=… -f side=RIGHT -f commit_id=… -f body=…
```

or, better, one **review** carrying all findings at once:

```
# `--input` supplies the WHOLE request body and cannot be combined with `-f`
# field flags — build one JSON document and pipe it in.
jq -n --arg body "…" --argjson comments "$(cat comments.json)" \
  '{event:"COMMENT", body:$body, comments:$comments}' \
| gh api --method POST /repos/{owner}/{repo}/pulls/{n}/reviews --input -
```

The batched form is one API call and one notification instead of N — worth preferring.

**Bitbucket** — the same endpoint as an ordinary comment, plus an `inline` key:

```json
{ "content": {"raw": "…"}, "inline": {"path": "src/x.ts", "to": 42} }
```

### Important clarifications

- **Line anchoring fails routinely and must degrade, not error.** A line outside the diff hunk is rejected by GitHub. The fallback is the existing summary comment — never a dropped finding.
- **`commit_id` is required on the GitHub per-comment form** and must be the PR head SHA, not `HEAD`.
- **Bitbucket's `to` is the destination-file line**; `from` anchors the source side. Anchoring a deletion needs `from`.
- **Idempotency is harder than for a summary comment.** A marker in the body works, but re-running after the diff moves means the anchor may no longer be valid. Decide the re-run behaviour explicitly rather than discovering it.

---

## 4. Scope

### In Scope

✅ `shared/resources/pr-inline-comment.js` — CLI peer of `tracker-comment.js`
✅ GitHub: batched `/pulls/{n}/reviews` preferred, per-comment `/pulls/{n}/comments` as fallback
✅ Bitbucket: `inline: {path, to}` payload
✅ Graceful degradation to a summary comment when anchoring fails, per finding
✅ `--json` with the repo's `reason` vocabulary (`posted`, `already`, `deferred`, `unverifiable`, `no-credentials`, `dry-run`, plus `anchor-failed`)
✅ `--body-file` only, never inline `--body`
✅ A contract document alongside, as `tracker-comment-contract.md` does
✅ Wire into `/review-code --comment` and `/review-pr --comment`

### Out of Scope

❌ **Resolving or replying to existing inline threads** — which is why the re-run rule below is *update-in-place*, not resolve-then-repost
❌ **Suggested-change blocks** (GitHub's ```suggestion syntax) — a natural follow-up, not this
❌ **A Bitbucket retry helper** — the standing gap, tracked separately
❌ Changing either lens's finding schema

---

## 5. Breaking Changes

None. Both review skills keep their current summary-comment behaviour as the fallback; inline posting is additive and opt-in through the existing `--comment` flag.

---

## 6. Implementation Plan

### Phase 1: Contract and CLI skeleton

**Risk Level**: Low

**Files**: `shared/resources/pr-inline-comment.js`, `shared/resources/pr-inline-comment-contract.md`

**Changes**:
- [x] Define the CLI surface: `--pr`, `--findings-file` (JSON array of `{path, line, side, body}`), `--json`, `--dry-run`, `--strict`
- [x] Mirror `tracker-comment.js` exit codes exactly: 0 for every normal outcome, 1 for a skip under `--strict`, 2 for usage error
- [x] Write the contract document, including the `reason` table, the degradation rule, and the **re-run rule** (marker + update-in-place — see §10 Medium Risk 1)
- [x] Resolve `$VCS` internally so callers never branch — the property that makes `tracker-comment.js` pleasant to call

**Dependencies**: none

---

### Phase 2: GitHub path

**Risk Level**: Medium

**Files**: `shared/resources/pr-inline-comment.js`

**Changes**:
- [x] Resolve the PR head SHA for `commit_id`
- [x] Build the batched `/pulls/{n}/reviews` request with a `comments[]` array
- [x] On a 422 (line not in diff), retry that finding as a summary comment and report `anchor-failed` for it
- [x] Fall back to per-comment posting if the batched call is rejected wholesale
- [x] Route through `tracker_call_with_retry` semantics for the `ACCESS_TRACKER` gate

**Dependencies**: Phase 1

---

### Phase 3: Bitbucket path

**Risk Level**: Medium

**Files**: `shared/resources/pr-inline-comment.js`

**Changes**:
- [x] POST per finding with `{content: {raw}, inline: {path, to}}`
- [x] Use `from` rather than `to` when the finding anchors a deleted line
- [x] Degrade to a summary comment on rejection
- [x] Single-shot, and say so — no retry helper exists

**Dependencies**: Phase 1

---

### Phase 4: Wire into the review skills

**Risk Level**: Low

**Files**: `skills/review-code/SKILL.md`, `skills/review-pr/SKILL.md`

**Changes**:
- [x] `/review-code --comment`: replace the never-implemented prose with a call to the CLI
- [x] `/review-pr --comment`: keep the summary comment as the default; add `--inline` to post findings inline as well
- [x] Remove `review-pr`'s "inline PR comments are out of scope" note and point at the CLI
- [x] Both: state that anchoring failure degrades rather than drops

**Dependencies**: Phases 2-3

---

### Phase 5: Tests

**Risk Level**: Low

**Files**: `shared/resources/tests/pr-inline-comment.test.mjs`, `package.json`

**Changes**:
- [x] Payload shape for both platforms, from fixtures
- [x] A 422 degrades to summary and reports `anchor-failed`, and the finding is **not** lost
- [x] `--dry-run` performs no network call
- [x] Exit codes match `tracker-comment.js`
- [x] Contract-test both skills for the CLI call and the degradation statement

**Dependencies**: Phase 4

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/pr-inline-comment.js`
2. ✅ `shared/resources/pr-inline-comment-contract.md`
3. ✅ `shared/resources/tests/pr-inline-comment.test.mjs`

### Files to Modify

4. ✅ `skills/review-code/SKILL.md` — Step 4 calls the CLI
5. ✅ `skills/review-pr/SKILL.md` — `--inline`, and remove the out-of-scope note
6. ⬜ `package.json` — **not needed.** `shared/resources/tests/*.test.mjs` is already in the `test` script's glob, so the new suite is collected without an edit.

### Files modified that this plan did not anticipate

Registering a mutation kind is not optional: `defer-mutation.js` validates every emitted `kind`
against the roster and **throws** on an unknown one, and the roster had no Bitbucket kinds at all.
Without `bitbucket.pr.comment` the Bitbucket arm could not honour the `ACCESS_TRACKER` gate this task
requires — it would throw, or bypass the gate. These four edits are therefore part of the in-scope
requirement rather than an addition to it:

7. ✅ `shared/resources/tracker-access-record.md` — new Bitbucket section + row; count 23 → 24
8. ✅ `shared/resources/defer-mutation.js` — `EXPECTED_KIND_COUNT` 23 → 24
9. ✅ `shared/resources/handover-render.js` — `KIND_PRESENTATION` entry (every kind must render)
10. ✅ `shared/resources/handover-verify.js` — `UNRELIABLE`; Bitbucket has no read-back path
11. ✅ `shared/resources/tests/handover-render.test.mjs` + `fixtures/handover-all-kinds.jsonl` — the totality assertions
12. ✅ `AGENTS.md` — a "Inline PR Comments" section beside "Tracker Comments", since a new shared primitive skills must call belongs on the always-loaded surface

---

## 8. Testing Strategy

### Unit Tests

- [x] GitHub batched payload matches the API shape
- [x] Bitbucket payload carries `inline.path` and `inline.to`
- [x] Deletion anchors use `from`
- [x] 422 → `anchor-failed` + summary fallback, finding preserved
- [x] `--dry-run` makes no network call
- [x] Exit codes identical to `tracker-comment.js`

**Command**: `node --test 'shared/resources/tests/pr-inline-comment.test.mjs'`

### Contract Tests

- [x] Both review skills call the CLI rather than describing the behaviour
- [x] Both document the degradation rule
- [x] `review-pr` no longer claims inline comments are out of scope

### Mutation Proving

- [x] Remove the 422 fallback → a test goes red proving findings would be dropped
- [x] Swap `to` for `from` on the Bitbucket path → a test goes red

---

## 9. Success Criteria

### Functional

- [x] A finding with a valid `file_line` posts as an inline comment on GitHub
- [x] The same works on Bitbucket via the `inline` key
- [x] A finding whose line is outside the diff degrades to a summary comment and is **never dropped**
- [x] GitHub posts one batched review rather than N comments where possible
- [x] `--dry-run` resolves everything and posts nothing

### Contract

- [x] Exit codes and `reason` vocabulary match `tracker-comment.js`
- [x] `--body-file` only; no inline `--body`
- [x] The CLI resolves `$VCS` itself so callers never branch

---

## 10. Risk Assessment

### High Risk Areas

**1. A finding is silently dropped when anchoring fails**

- **Risk**: a 422 is swallowed and the finding never reaches the reviewer.
- **Probability**: Medium — anchoring outside a diff hunk is common
- **Impact**: Critical — a review that silently loses findings is worse than one that posts none, because the reader believes they have seen everything.
- **Mitigation**: degradation is a tested requirement, not a nicety; the mutation proof for it is mandatory; every degraded finding is reported as `anchor-failed`, not as `posted`.
- **Rollback**: revert both skills to summary-only.

### Medium Risk Areas

**1. Re-run behaviour with a moved diff**

- **Risk**: a second run duplicates comments, or edits an anchor that no longer means what it did.
- **Probability**: Medium
- **Impact**: Major — duplicate inline comments are noisy and hard to clean up.
- **Mitigation**: decide and document the rule **before** implementing. **Suggested: a marker in each body plus update-in-place** — on a re-run, `PATCH` the existing comment by id where the marker matches and the anchor is still valid; where the anchor has moved out of the diff, degrade that finding to the summary comment rather than re-anchoring it. This needs no thread resolution, so it stays inside the scope declared in §4. The decision is a Phase 1 deliverable, not a code-review discovery.

**2. Bitbucket path ships unexecuted**

- **Risk**: this repo is GitHub-hosted.
- **Probability**: High
- **Impact**: Minor
- **Mitigation**: fixture-test the payload shape; state the limitation. See task 67.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: findings are dropped; duplicate inline comments appear.

**Steps**: revert the two skill files to summary-only posting; leave the CLI in place unused.

**Verification**: `--comment` posts one summary comment as before; `npm test` green.

### Partial Rollback

Keep the CLI and the GitHub path; disable the Bitbucket arm — they are independent.

---

---

## QA Testing Results

**QA Status**: PASS (2 cycles — cycle 1 FAIL, cycle 2 refute pass)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-02
**Quality Score**: 92/100
**Gate Decision**: PASS

### QA Reports
- **Cycle 1**: [task.70.qa.1.inline-pr-comments.md](./task.70.qa.1.inline-pr-comments.md) · gate [task.70.gate.1.inline-pr-comments.yml](./task.70.gate.1.inline-pr-comments.yml) — FAIL (50/100), 9 issues
- **Cycle 2 (refute)**: [task.70.qa.2.inline-pr-comments.md](./task.70.qa.2.inline-pr-comments.md) · gate [task.70.gate.2.inline-pr-comments.yml](./task.70.gate.2.inline-pr-comments.yml) — PASS (92/100), 8 further issues

### Test Coverage Summary
- **Tests Executed**: 905 (shared) + 127 (repo guards) + 63 (skill contracts)
- **Phases Verified**: 5/5 present — 2 FAIL, 3 CONCERNS
- **Issues**: 17 total across 2 cycles (7 HIGH, 10 MEDIUM/LOW) — **16 resolved**, 1 deferred with a stated reason
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS
- **Mutation proofs**: 7, each turning exactly its own assertion red

### Key Findings
Cycle 1 found the module violating its own core invariant on two reachable paths, and jq wiring in
both review skills that could not execute at all. Cycle 2 ran as a **refute pass over the whole
diff** and found eight more — including two that were present in the original commit and invisible
to cycle 1 (`gh api --paginate` needs `--slurp`; the jq aborted the entire array on one malformed
`file_line`), and one case of a cycle-1 fix silently killing a neighbouring branch.

The durable lesson is structural: cycle 1 fixed nine defects and created the conditions for two
more. A narrowed cycle 2 would have re-read only its own repairs and passed.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — scoped out of task.66, filed here | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |
| 2026-09-02 | 1.2     | Review passed (8/10, READY TO IMPLEMENT) — fixed the Out-of-Scope contradiction by fixing the re-run rule as marker + update-in-place; corrected the invalid `gh api --input` + `-f` snippet. Tracker linkage still absent (Important, non-blocking) | review-task |
| 2026-09-02 |         | Implemented — 9 files (3 created, 6 modified), 38 tests, 2 mutation proofs; registered `bitbucket.pr.comment` as the roster's 24th kind | develop |
| 2026-09-02 |         | QA gate FAIL (50/100) — 5 HIGH, 4 MEDIUM, 3 LOW; core invariant violated on the duplicate-marker path, wiring snippets non-functional, CI red | qa-task |
| 2026-09-02 |         | qa-fix cycle 1 — all 9 issues resolved and mutation-proven; suite 40 → 46 tests; new executable jq guard in both review skill suites; gate PASS (95/100) | qa-fix |
| 2026-09-02 |         | QA cycle 2 (refute pass) — 8 further issues, 2 dropping findings silently; all fixed and mutation-proven; gate PASS (92/100) | qa-task |

---

## Progress Tracking

### Phase 1: Contract and skeleton
- [x] CLI surface + contract doc
- [x] Re-run rule decided — marker + update-in-place

### Phase 2: GitHub
- [x] Batched review
- [x] 422 degradation

### Phase 3: Bitbucket
- [x] inline payload
- [x] Deletion anchors

### Phase 4: Wire in
- [x] review-code
- [x] review-pr --inline

### Phase 5: Tests
- [x] Unit + contract + mutation proofs (38 tests)

---

## References

- **Origin**: [`task.66`](../task.66.review-pr/task.66.review-pr.md) § Notes — scoped out explicitly
- **The behaviour documented but never built**: `skills/review-code/SKILL.md` Step 4
- **CLI to model**: [`shared/resources/tracker-comment.js`](../../../shared/resources/tracker-comment.js) and its [contract](../../../shared/resources/tracker-comment-contract.md)
- **Existing summary recipes**: `skills/finalise/SKILL.md`, `skills/qa-fix/SKILL.md`
- **Related**: task 68, task 69 (the other two PR-comment gaps)

---

## Notes

### Important Reminders

- **Degradation is the core requirement, not a nicety.** A review that silently drops findings is worse than one that posts none, because the reader believes they have seen everything.
- The re-run rule is **decided**: marker + update-in-place (§10 Medium Risk 1). Implement it in Phase 1 as the contract states. Discovering a re-run rule during code review is how the duplicate-comment problem gets shipped.

### Why Low priority

Nothing is broken today — the summary comment works on both platforms. This is a quality-of-life improvement whose main cost is that `/review-code` currently documents behaviour it does not have. Tasks 67-69 all fix things that are actively wrong; this one adds something new.

---

**Status:** Ready for Review

**Next Steps**:
1. `/review-task docs/tasks/task.70.inline-pr-comments/task.70.inline-pr-comments.md`
2. `/develop-task docs/tasks/task.70.inline-pr-comments/task.70.inline-pr-comments.md`
