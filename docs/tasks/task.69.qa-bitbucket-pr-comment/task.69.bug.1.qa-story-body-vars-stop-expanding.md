# Bug Report: Task 69 — qa-story's PR-comment body variables stop expanding

**Task**: [Link](./task.69.qa-bitbucket-pr-comment.md)
**Bug ID**: TASK-69-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-01

## Description

Moving `qa-story` step 6 from an inline `--body "…"` to a **single-quoted** heredoc
(`cat > "$BODY_FILE" <<'EOF'`) changed the expansion semantics of the comment body — and
`qa-story`'s body contains three **real shell variables**, unlike `qa-task`'s, which uses only
`{SLOT}` template placeholders.

In the previous form the body was a double-quoted shell string, so these expanded. In a
single-quoted heredoc nothing expands, so they are now written literally.

Affected lines in the new body (`skills/qa-story/SKILL.md`):

```
**PR**: #$PR_NUMBER - $PR_TITLE
**PR State**: $PR_STATE
```

`qa-task` is **not** affected — its body uses `#{PR_NUMBER} - {PR_TITLE}`, which are template
slots the agent substitutes, and for which a quoted heredoc is correct.

## Steps to Reproduce

1. Follow `qa-story` step 6 as written on this branch, with `PR_NUMBER=295`, `PR_TITLE="…"`,
   `PR_STATE=OPEN` set as the Prerequisites step specifies.
2. Run the `cat > "$BODY_FILE" <<'EOF' … EOF` block.
3. `cat .claude/state/qa-comment-body.md`.

## Expected Behavior

The body contains the real PR metadata:

```
**PR**: #295 - feat(task.69): give /qa-story and /qa-task a Bitbucket PR-comment path
**PR State**: OPEN
```

## Actual Behavior

The body contains the literal variable names:

```
**PR**: #$PR_NUMBER - $PR_TITLE
**PR State**: $PR_STATE
```

Both platform arms then post that text verbatim — the GitHub arm via `--body-file`, the Bitbucket
arm via the `content.raw` payload. The comment posts successfully, so **nothing reports an error**:
the step's own BLOCKING check confirms exit code 0 and passes.

## Impact

- **Regression on GitHub** — the platform this repo actually uses, and the one arm the change was
  supposed to leave behaviour-identical on. The task's own Success Criteria say "On `VCS=github`,
  behaviour is unchanged apart from `--body-file`". It is not.
- **Silent.** The failure is in the comment's *content*, not its delivery, so exit-code checking
  cannot see it and the QA record would certify a step that emitted placeholder text.
- Breaks the task's Breaking Changes claim of "None on GitHub — same endpoint, same body".

## Recommendation

Do **not** switch to an unquoted heredoc. The body also contains a backtick pair —
`` `file:line — finding` `` on the Code Review Findings line — which an unquoted heredoc would
treat as command substitution, trading a display bug for an execution one.

Instead, convert the three variables to `{SLOT}` placeholders so the body matches `qa-task` and the
quoted heredoc stays correct:

```
**PR**: #{PR_NUMBER} - {PR_TITLE}
**PR State**: {PR_STATE}
```

This also delivers what Phase 2 asked for and did not get — the two skills' bodies genuinely
identical in style — and it is the divergence that caused this bug in the first place.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-01
**Developer**: qa-fix (develop-task pipeline, Step 6, cycle 1)

**Investigation Notes**

- Confirmed the defect by reading the committed body: `skills/qa-story/SKILL.md` opens its body with
  `cat > "$BODY_FILE" <<'EOF'` and contains `**PR**: #$PR_NUMBER - $PR_TITLE` and
  `**PR State**: $PR_STATE`.
- Confirmed `qa-task` is genuinely unaffected rather than assumed to be: its body contains no `$VAR`
  reference at all, only `{SLOT}` placeholders.

**Root Cause Analysis**

The two skills' bodies were never symmetric to begin with. `qa-task` templated its PR metadata as
`{PR_NUMBER}` / `{PR_TITLE}`; `qa-story` used live shell variables, which worked because the body was
a double-quoted `--body "…"` argument. Task 69 moved both to a single-quoted heredoc — correct for
`qa-task`, and a silent behaviour change for `qa-story`.

The task's Phase 2 said "keep the wording identical between the two skills". That was read as *apply
the same structural change to both*, which was done; it was not read as *reconcile the content the
two bodies already differed in*, which is where the defect lived.

**Proposed Fix**

Convert the three variables to `{SLOT}` placeholders. Rejected alternative: unquoting the heredoc —
the body carries a backtick pair on the Code Review Findings line, so an unquoted heredoc would turn
a display bug into command substitution.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-01

**Root Cause**: real shell variables inside a single-quoted heredoc, in `qa-story` only.

**Fix Description**

- `**PR**: #$PR_NUMBER - $PR_TITLE` → `**PR**: #{PR_NUMBER} - {PR_TITLE}`
- `**PR State**: $PR_STATE` → `**PR State**: {PR_STATE}`

The two bodies now use one placeholder convention, which is what Phase 2 was asking for.

**Files Modified**

- `skills/qa-story/SKILL.md` — the two body lines above

**Testing**

Covered by the new assertion added for TASK69-002, and mutation-proved in both directions:

| Mutation | Result |
|---|---|
| Re-introduce `$PR_NUMBER` / `$PR_TITLE` in `qa-story` | `the quoted heredoc body carries no shell variables` — **red** (12 pass, 1 fail) |
| Same defect injected into `qa-task` | same test — **red** (11 pass, 1 fail) |
| Baseline restored | 25 pass, 0 fail |

**Verification Steps for QA**

1. `awk '/^cat > "\$BODY_FILE" <</,/^EOF$/' skills/qa-story/SKILL.md | grep -E '\$[A-Za-z_]'` returns
   only the `cat` line itself.
2. `node --test 'skills/qa-story/tests/*.test.js' 'skills/qa-task/tests/*.test.js'` → 25/25.
3. Re-introduce a `$VAR` into either body and confirm the suite goes red.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-01 | In Progress | qa-fix | Investigation started |
| 2026-09-01 | Ready for QA | qa-fix | Placeholders converted; mutation-proved both directions |
| 2026-09-01 | Closed | QA Engineer | Verified by QA: no shell variables remain in either body; independently re-mutated ($PR_STATE) → suite red. |
