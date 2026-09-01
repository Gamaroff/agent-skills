---
id: task.69
title: "[Task 69] Give /qa-story and /qa-task a Bitbucket PR-comment path"
type: task
description: "The QA gate comment is GitHub-only in both QA skills, and it is marked BLOCKING. On a Bitbucket repo the step cannot succeed. Two other skills already point at it as the reference Bitbucket recipe, so the gap propagates."
tags: [qa, bitbucket, pr-comment, platform-parity]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-08-31
updated: 2026-09-01
assignee:
estimated_effort_hours: 4
---

# Technical Task: Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path

**Status:** Ready for Review

**Review**: ✅ Actionable recommendations from `task.69.review.1.qa-bitbucket-pr-comment.md` implemented 2026-09-01 — 1 applied (Phase 3 scope + divergent resolver note), 1 deferred (tracker linkage; needs an opt-in `/sync-github-task`).

---

## 1. Overview

`qa-story` (step 6) and `qa-task` (Step 13) post the QA gate decision to the pull request using `gh pr comment` with no Bitbucket branch. Both mark the step **BLOCKING**. Add the Bitbucket path, using the recipe `finalise` and `qa-fix` already ship.

**Scope**: one platform branch in each of two skills, plus tests.

---

## 2. Motivation

### Current Problems

1. **A blocking step that cannot succeed on half the supported platforms.** `qa-task`'s Review Completion Checklist requires "PR comment posted … confirm exit code 0 after up to 3 attempts". On a Bitbucket repo, `gh pr comment` cannot address the PR at all.
2. **Two other skills point at it as the Bitbucket reference.** `/review-code` Step 4 tells implementers to "mirror `/qa-story` step 6" for Bitbucket — and step 6 has no Bitbucket arm. The dead pointer was found while building task 66.
3. **The recipe already exists twice in this repo.** `skills/finalise/SKILL.md` has the dual-platform idempotent version; `skills/qa-fix/SKILL.md` has a single-shot version. Neither QA skill uses either.
4. **The asymmetry is undocumented.** `qa-fix` at least says its Bitbucket path is single-shot "for now"; the QA skills say nothing, so the gap reads as an oversight rather than a decision — because it is one.

### Benefits

1. **The blocking step becomes satisfiable on Bitbucket.**
2. **`/review-code`'s cross-reference becomes true**, closing the other half of task 68's dead pointer.
3. **Low cost**: the recipe is already written and shipped; this is applying it in two more places.

---

## 3. Technical Background

### Current architecture

`skills/qa-task/SKILL.md` Step 13:

```bash
source references/resolve-platform.sh || exit 1
tracker_call_with_retry gh pr comment "$PR_URL" --body "## QA Review: {GATE_DECISION} …"
```

The resolver is sourced — so `$VCS` is available — and then never consulted.

### Target architecture

Branch on `$VCS`, mirroring `qa-fix`:

```bash
if [ "$VCS" = "github" ]; then
  tracker_call_with_retry gh pr comment "$PR_URL" --body-file "$BODY_FILE"
elif [ "$VCS" = "bitbucket" ]; then
  BB_PAYLOAD=$(jq -n --arg raw "$(cat "$BODY_FILE")" '{content: {raw: $raw}}')
  curl -sf -X POST "${BB_CURL_AUTH[@]}" -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
    -d "$BB_PAYLOAD" >/dev/null
fi
```

### Important clarifications

- **Use `--body-file`, not an inline `--body`.** The current GitHub call passes a large inline body containing backticks and `$(…)`. Moving to a file is a correctness improvement, not a stylistic one.
- **The QA comment is per-cycle and not idempotent by design** — `finalise` owns the single canonical summary. Do not import `finalise`'s marker logic; import its Bitbucket transport only.
- **The Bitbucket path stays single-shot.** `tracker_call_with_retry` wraps `gh` only. Say so, as `qa-fix` does, rather than leaving the asymmetry unexplained.

---

## 4. Scope

### In Scope

✅ `$VCS` branch in `qa-task` Step 13 and `qa-story` step 6
✅ Bitbucket REST POST arm, lifted from `qa-fix`
✅ Switch the GitHub arm to `--body-file`
✅ Document the retry asymmetry explicitly in both skills
✅ Contract tests asserting both arms exist in both skills

### Out of Scope

❌ **A Bitbucket retry helper** — the standing gap; it deserves its own task rather than being smuggled in here
❌ **Making the QA comment idempotent** — per-cycle comments are deliberate; `finalise` owns the canonical one
❌ Inline comments (task 70)
❌ `/review-code`'s own branch bug (task 68)

---

## 5. Breaking Changes

None on GitHub: same endpoint, same body, delivered via `--body-file` instead of an inline string. The Bitbucket arm is new behaviour where there was previously a silent failure.

---

## 6. Implementation Plan

### Phase 1: qa-task

**Risk Level**: Low

**Files**: `skills/qa-task/SKILL.md`

**Changes**:
- [x] Write the comment body to `.claude/state/qa-comment-body.md` before posting
- [x] Branch Step 13 on `$VCS`
- [x] GitHub arm: `tracker_call_with_retry gh pr comment "$PR_URL" --body-file …`
- [x] Bitbucket arm: REST POST with a `jq`-built payload, using `BB_*` resolved in the platform preamble
- [x] State that the Bitbucket arm is single-shot and why

**Dependencies**: none

---

### Phase 2: qa-story

**Risk Level**: Low

**Files**: `skills/qa-story/SKILL.md`

**Changes**:
- [x] Apply the identical change to step 6
- [x] Keep the wording identical between the two skills — they are the same step and should not drift

**Dependencies**: Phase 1

---

### Phase 3: Ensure the platform preamble is present

**Risk Level**: Low

**Files**: both QA skills

**Changes**:
- [x] Confirm each skill resolves `BB_WORKSPACE`, `BB_REPO`, `BB_API` and sources `bitbucket-auth.sh` before Step 13 / step 6 — the `create-pr` Step 0.5 preamble
- [x] Add it where missing, guarded `source … || exit 1`
- [x] Verify Bitbucket auth by status code, never by list length (404, not 401, on a private repo)
- [x] Reconcile the two skills' **existing** resolver-sourcing lines, which already diverge (see note below)

> **Verified at review time (2026-09-01): the preamble is absent from _both_ skills.** Neither
> `qa-task/SKILL.md` nor `qa-story/SKILL.md` mentions `BB_WORKSPACE`, `BB_REPO`, `BB_API` or
> `bitbucket-auth.sh` anywhere. So this phase is **add to both**, not "confirm and patch the odd one
> out" — budget for it accordingly.
>
> **The two skills also already source the resolver differently**, which collides with Phase 2's
> "keep the wording identical" goal:
>
> - `qa-task/SKILL.md:895` — `source references/resolve-platform.sh || exit 1` (canonical)
> - `qa-story/SKILL.md:1505` — `. "$(dirname "$0")/references/resolve-platform.sh" || exit 1`
>
> The `qa-story` form is the wrong one: these snippets are executed by an agent from the repo root,
> not run as a script, so `$0` is not the skill file and `$(dirname "$0")` does not resolve to the
> skill directory. Normalise `qa-story` onto the `qa-task` form as part of this phase — otherwise
> Phase 2 ships a Bitbucket arm above a resolver line that never resolved.

**Dependencies**: Phase 1

---

### Phase 4: Tests

**Risk Level**: Low

**Files**: `skills/qa-task/tests/`, `skills/qa-story/tests/` (both new), `package.json`

**Changes**:
- [x] Assert both skills' PR-comment step branches on `$VCS`
- [x] Assert both arms exist and the Bitbucket arm hits `/pullrequests/{id}/comments`
- [x] Assert no inline `--body` remains on the GitHub arm
- [x] Assert the retry asymmetry is documented
- [x] Add both globs to `package.json`

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files to Modify

1. ✅ `skills/qa-task/SKILL.md` — Step 13
2. ✅ `skills/qa-story/SKILL.md` — step 6
3. ✅ `package.json` — two new test globs

### Files to Create

4. ✅ `skills/qa-task/tests/qa-task.test.js`
5. ✅ `skills/qa-story/tests/qa-story.test.js`

---

## 8. Testing Strategy

### Contract Tests

- [x] Both skills branch the PR comment on `$VCS`
- [x] Both have a GitHub arm and a Bitbucket arm
- [x] The Bitbucket arm targets `/pullrequests/{id}/comments` with a `content.raw` payload
- [x] The GitHub arm uses `--body-file`; no inline `--body` survives
- [x] The single-shot asymmetry is stated

### Mutation Proving

- [x] Delete the Bitbucket arm from either skill → a test goes red
- [x] Revert the GitHub arm to inline `--body` → a test goes red
- [x] Change the branch key to `$TRACKER` → a test goes red

---

## 9. Success Criteria

### Functional

- [x] On `VCS=bitbucket`, both QA skills post the gate decision to the Bitbucket PR
- [x] On `VCS=github`, behaviour is unchanged apart from `--body-file`
- [x] `/review-code`'s "mirror `/qa-story` step 6" pointer becomes true

### Code Quality

- [x] Both skills have a `tests/` directory registered in `package.json`
- [x] Every fix mutation-proved
- [x] Wording identical between the two skills

---

## 10. Risk Assessment

### Medium Risk Areas

**1. The two skills drift**

- **Risk**: the same step is edited twice and the copies diverge — exactly what happened to the verdict table in task 66 (PC-2).
- **Probability**: Medium
- **Impact**: Major — divergence is silent, and a QA record can certify one copy while the other is wrong.
- **Mitigation**: a cross-file test asserting the Bitbucket arm is present in **both**. Consider extracting the step to `shared/resources/` if a third caller ever appears.

### Low Risk Areas

**1. Unverifiable on this repo**

- **Risk**: GitHub-hosted, so the Bitbucket arm ships unexecuted.
- **Probability**: High
- **Impact**: Minor — the recipe is copied verbatim from two already-shipped call sites.
- **Mitigation**: state it as a known limitation. Task 67 addresses the general problem.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the GitHub arm regresses.

**Steps**: `git revert`; the change is two skill files plus tests.

**Verification**: `npm test` green; a QA cycle posts its comment as before.

### Partial Rollback

Revert `qa-story` only, or `qa-task` only — the two changes are independent.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-01
**Quality Score**: 100/100
**Gate Decision**: PASS
**QA Cycles**: 2

### QA Report
- **Latest Report**: [task.69.qa.2.qa-bitbucket-pr-comment.md](./task.69.qa.2.qa-bitbucket-pr-comment.md)
- **Latest Gate**: [task.69.gate.2.qa-bitbucket-pr-comment.yml](./task.69.gate.2.qa-bitbucket-pr-comment.yml)
- **Cycle 1**: [task.69.qa.1.qa-bitbucket-pr-comment.md](./task.69.qa.1.qa-bitbucket-pr-comment.md) · [gate 1](./task.69.gate.1.qa-bitbucket-pr-comment.yml) (FAIL, 60/100)

### Test Coverage Summary
- **Tests Executed**: 2141 (0 failures)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 open (1 HIGH + 1 MEDIUM found and closed in cycle 1)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Cycle 1 found **TASK69-001 (HIGH)** — `qa-story`'s comment body emitted literal `$PR_NUMBER` / `$PR_TITLE` / `$PR_STATE` after the move to a single-quoted heredoc — and **TASK69-002 (MEDIUM)**, that no test could see it. Both fixed in one qa-fix cycle and verified in cycle 2 by re-mutation, including a mutation QA chose that the developer had not run.
- The new body guard was probed for vacuity: renaming its anchor makes it fail loudly rather than pass on an empty body.
- **Accepted residuals**: TASK69-003 (LOW, unreachable `$VCS` branch), and the standing fact that Step 4b can never execute either skill's PR-comment blocks — so these two steps rest entirely on contract tests.

---

## Bug Reports

### In QA Verification

_None._

### Closed Bugs

- [TASK-69-BUG-1: qa-story's PR-comment body variables stop expanding](./task.69.bug.1.qa-story-body-vars-stop-expanding.md) — ✅ Closed — verified by QA in cycle 2 (re-mutated independently)
- [TASK-69-BUG-2: contract tests cannot see the comment body's expansion semantics](./task.69.bug.2.no-coverage-for-body-expansion.md) — ✅ Closed — verified by QA in cycle 2 (guard exists in both suites and fails loudly)

---

## Dev Agent Record

### Completion Notes

**QA fix cycle 1** — both open findings from gate 1 addressed.

- **TASK69-001 (HIGH)**: `qa-story`'s body used real shell variables inside a single-quoted heredoc.
  Converted `$PR_NUMBER` / `$PR_TITLE` / `$PR_STATE` to `{SLOT}` placeholders, matching `qa-task`.
  Deliberately **not** fixed by unquoting the heredoc: the body carries a backtick pair on the Code
  Review Findings line, so that would have traded a display bug for command substitution.
- **TASK69-002 (MEDIUM)**: added a `bodyHeredoc` helper and a no-`$VAR`-in-body assertion to **both**
  suites. Added to both rather than only the copy that failed, because the drift risk is symmetric.
- **TASK69-003 (LOW)**: not fixed, by instruction and on merit — `COMMENT_RC` is unset only on an
  unreachable third `$VCS` branch, and the quoted test form degrades to a shell diagnostic rather
  than a false success.

The root cause of TASK69-001 is worth recording: Phase 2's "keep the wording identical" was read as
*apply the same structural change to both*, which was done correctly. It was not read as *reconcile
the content the two bodies already differed in* — and that is exactly where the defect lived. The
two bodies now share one placeholder convention, so the instruction is satisfied in the sense that
mattered.

### File List

**Modified**
- `skills/qa-story/SKILL.md` — two body lines converted to `{SLOT}` placeholders
- `skills/qa-story/tests/qa-story.test.js` — `bodyHeredoc` helper + body-expansion assertion
- `skills/qa-task/tests/qa-task.test.js` — same

### Debug Log References

```
node --test 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'
  → 25 tests, 25 pass, 0 fail   (was 23 before this cycle)

mutation: re-introduce $PR_NUMBER/$PR_TITLE in qa-story  → 12 pass, 1 fail  ✅ red
mutation: same defect injected into qa-task              → 11 pass, 1 fail  ✅ red
baseline restored                                        → 25 pass, 0 fail
```

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — found via /review-code's dead cross-reference | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |
| 2026-09-01 | 1.2     | Pipeline review (9/10, ready to implement) — every technical claim verified against the tree; Phase 3 corrected from "confirm" to "add to both" and given the divergent-resolver note | review-task |
| 2026-09-01 |         | Implemented — 5 files (2 skills, 2 new test suites, package.json) + 1 shared test-guard floor; 23 new contract tests, 3 mutations proved | develop |
| 2026-09-01 |         | QA gate FAIL (60/100) — 1 HIGH, 1 MEDIUM, 1 LOW | qa-task |
| 2026-09-01 |         | QA findings fixed — TASK69-001 + TASK69-002, 1 iteration; both mutation-proved | qa-fix |
| 2026-09-01 |         | QA gate PASS (100/100) — both findings verified closed; 1 LOW accepted | qa-task |

---

## Progress Tracking

### Phase 1: qa-task
- [x] Body file + VCS branch + both arms

### Phase 2: qa-story
- [x] Identical change, identical wording

### Phase 3: Platform preamble
- [x] Added to both (it was absent from both), guarded; qa-story's broken `$(dirname "$0")` dot-source normalised onto the canonical `source` form

### Phase 4: Tests
- [x] Both suites + package.json globs

---

## References

- **Origin**: [`task.66`](../task.66.review-pr/task.66.review-pr.md) § Notes follow-ups — the dead "mirror /qa-story step 6" pointer
- **Working dual-platform recipe**: `skills/finalise/SKILL.md`
- **Single-shot Bitbucket precedent**: `skills/qa-fix/SKILL.md`
- **Platform preamble**: `skills/create-pr/SKILL.md` Step 0.5
- **Related**: task 68 (the `/review-code` half of the same dead pointer)

---

## Notes

### Important Reminders

- Do not import `finalise`'s marker/idempotency logic. QA comments are per-cycle by design; `finalise` owns the one canonical summary. Only the transport is being borrowed.

### Future Improvements

- A `bitbucket_call_with_retry` helper would close the standing asymmetry across every Bitbucket call site in the repo. Out of scope here, worth its own task.

---

**Status:** Ready for Review

**Next Steps**:
1. `/review-task docs/tasks/task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md`
2. `/develop-task docs/tasks/task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md`
