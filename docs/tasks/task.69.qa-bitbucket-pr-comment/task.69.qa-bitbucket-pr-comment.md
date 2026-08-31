---
id: task.69
title: "[Task 69] Give /qa-story and /qa-task a Bitbucket PR-comment path"
type: task
description: "The QA gate comment is GitHub-only in both QA skills, and it is marked BLOCKING. On a Bitbucket repo the step cannot succeed. Two other skills already point at it as the reference Bitbucket recipe, so the gap propagates."
tags: [qa, bitbucket, pr-comment, platform-parity]
category: infrastructure
status: ready-for-development
priority: Medium
risk_level: low
created: 2026-08-31
updated: 2026-08-31
assignee:
estimated_effort_hours: 4
---

# Technical Task: Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path

**Status:** Ready for Development

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
- [ ] Write the comment body to `.claude/state/qa-comment-body.md` before posting
- [ ] Branch Step 13 on `$VCS`
- [ ] GitHub arm: `tracker_call_with_retry gh pr comment "$PR_URL" --body-file …`
- [ ] Bitbucket arm: REST POST with a `jq`-built payload, using `BB_*` resolved in the platform preamble
- [ ] State that the Bitbucket arm is single-shot and why

**Dependencies**: none

---

### Phase 2: qa-story

**Risk Level**: Low

**Files**: `skills/qa-story/SKILL.md`

**Changes**:
- [ ] Apply the identical change to step 6
- [ ] Keep the wording identical between the two skills — they are the same step and should not drift

**Dependencies**: Phase 1

---

### Phase 3: Ensure the platform preamble is present

**Risk Level**: Low

**Files**: both QA skills

**Changes**:
- [ ] Confirm each skill resolves `BB_WORKSPACE`, `BB_REPO`, `BB_API` and sources `bitbucket-auth.sh` before Step 13 / step 6 — the `create-pr` Step 0.5 preamble
- [ ] Add it where missing, guarded `source … || exit 1`
- [ ] Verify Bitbucket auth by status code, never by list length (404, not 401, on a private repo)

**Dependencies**: Phase 1

---

### Phase 4: Tests

**Risk Level**: Low

**Files**: `skills/qa-task/tests/`, `skills/qa-story/tests/` (both new), `package.json`

**Changes**:
- [ ] Assert both skills' PR-comment step branches on `$VCS`
- [ ] Assert both arms exist and the Bitbucket arm hits `/pullrequests/{id}/comments`
- [ ] Assert no inline `--body` remains on the GitHub arm
- [ ] Assert the retry asymmetry is documented
- [ ] Add both globs to `package.json`

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

- [ ] Both skills branch the PR comment on `$VCS`
- [ ] Both have a GitHub arm and a Bitbucket arm
- [ ] The Bitbucket arm targets `/pullrequests/{id}/comments` with a `content.raw` payload
- [ ] The GitHub arm uses `--body-file`; no inline `--body` survives
- [ ] The single-shot asymmetry is stated

### Mutation Proving

- [ ] Delete the Bitbucket arm from either skill → a test goes red
- [ ] Revert the GitHub arm to inline `--body` → a test goes red
- [ ] Change the branch key to `$TRACKER` → a test goes red

---

## 9. Success Criteria

### Functional

- [ ] On `VCS=bitbucket`, both QA skills post the gate decision to the Bitbucket PR
- [ ] On `VCS=github`, behaviour is unchanged apart from `--body-file`
- [ ] `/review-code`'s "mirror `/qa-story` step 6" pointer becomes true

### Code Quality

- [ ] Both skills have a `tests/` directory registered in `package.json`
- [ ] Every fix mutation-proved
- [ ] Wording identical between the two skills

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

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft — found via /review-code's dead cross-reference | create-task |
| 2026-08-31 | 1.1     | Validation pass — 11/11 sections, card preflight clean, no placeholders, links resolve, effort rubric checked; status → ready-for-development | review-task |

---

## Progress Tracking

### Phase 1: qa-task
- [ ] Body file + VCS branch + both arms

### Phase 2: qa-story
- [ ] Identical change, identical wording

### Phase 3: Platform preamble
- [ ] Present and guarded in both

### Phase 4: Tests
- [ ] Both suites + package.json globs

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

**Status:** Ready for Development

**Next Steps**:
1. `/review-task docs/tasks/task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md`
2. `/develop-task docs/tasks/task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md`
