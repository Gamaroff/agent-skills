---
name: develop-bug-step-5-6-verify-loop
description: Steps 5–6 (verify & fix loop) for the develop-bug pipeline. Verifies the bug scenario no longer reproduces and no regressions were introduced (regression test + affected suite + review-code on the diff), writes the QA Verification record into the bug's current iteration on PASS, and on FAIL reopens the bug and runs /qa-fix with the concrete findings. Bounded at MAX_ITER=5.
---

# Develop Bug Pipeline — Steps 5–6: Verify & Fix Loop

Loaded by `/develop-bug` during Steps 5–6. This is the bug-specific analogue of the shared QA loop. Because a **general** bug has no parent story/task document (and therefore no Acceptance-Criteria gate), verification is anchored on the bug itself: *does the reported failure still occur, and did the fix break anything?* — rather than on a story/task gate file.

---

## Loop Setup

Maintain a **fix cycle counter** starting at 1. Loop limit = **5 cycles** (`MAX_ITER=5`). A clean PASS on any verification exits immediately.

Each cycle = one **Verify** (5a) + one **Fix** (5b, only when Verify fails).

A PR exists from Step 4, so `/qa-fix` (which requires an active PR) applies cleanly in 5b.

### Signal the `in-qa` stage (when `TRACKER_ISSUE` is set)

Run **once**, before the first cycle — not per cycle. Branch on `TRACKER`:

```bash
# TRACKER=jira
node .agents/skills/develop-bug/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage in-qa --json

# TRACKER=github
node .agents/skills/develop-bug/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage in-qa --json
```

> **A bug's verify loop is a QA loop.** It has the same shape as the story/task QA loop — one entry, a bounded set of cycles, a passing exit — so it signals the same moments. This pipeline signalled none of them for a full release, purely because this file is skill-native and the shared step file moved on without it. That asymmetry bit exactly one person: the consumer who turned `in-qa` on and found it worked for stories and tasks but not bugs, with no explanation anywhere. Keep the three moments here in step with `shared/resources/develop-pipeline-step-5-6-qa-loop.md`; a parity test in `evals/shared/tests/transition-protocol-parity.test.mjs` now asserts it.

`in-qa` is **off by default**. Expect `reason: "stage-disabled"` until a project opts in — that is a success, not a warning. A consumer who wants bugs to skip these columns omits them under a `byIssueType` overlay for the bug issue type.

Log in Decisions Log: "{TRACKER} {TRACKER_ISSUE} — in-qa: {landed status / disabled / skip reason}."

---

## 5a. Verify

Run the bug-appropriate verification signals, in order. **All must pass** for a PASS verdict:

1. **Regression test** — re-run the test added in Step 3. It MUST pass now and MUST have failed on the pre-fix code (that property was established in Step 3). This is the primary "bug is gone" signal.
2. **Affected suite + lint** — run the project's lint + the test suite covering the changed files (`npx nx test <project>` / `deno test -A`, etc.). Zero failures, zero lint errors → no regressions introduced.
3. **Diff code review** — invoke `/review-code` on the fix diff (advisory mode) to surface high-confidence correctness regressions the tests might miss. Treat only **high-confidence correctness** findings as blocking; note simplification/style findings without blocking.

> Standard vs lite: in lite mode (`Minor`/`Trivial` + `Low`/`Medium` only — see Phase 0c), run signals 1 + 2 and skip signal 3. `Blocker`/`Critical`/`Major` bugs always run all three.

Determine the verdict:

- **PASS** — regression test green, suite + lint green, no blocking review-code findings → go to **On PASS**.
- **FAIL** — any signal fails (bug still reproduces, a regression appeared, or a blocking correctness finding) → go to **5b**.

Log the cycle in the implementation report's QA Iteration History:

```
### Verify Cycle {N} — {YYYY-MM-DD}
**Regression test**: {pass/fail}
**Suite + lint**: {pass/fail}
**Code review**: {clean / N blocking findings}
**Verdict**: {PASS / FAIL}
**Action**: {Proceeding to finalise / Running qa-fix (cycle N of 5)}
```

If the bug has a linked tracker issue (`TRACKER_ISSUE` non-empty), post the cycle result through `shared/resources/tracker-comment.js` with `--stage qa-cycle-{N}` — it branches on `TRACKER` internally and is non-blocking. Skip silently when empty (most bugs have no issue). Read `reason` per [`shared/resources/tracker-comment-contract.md`](tracker-comment-contract.md).

---

## On PASS — write the QA Verification record

Update the **bug file**: in the current `### Iteration {N}` under `## Developer Fix Cycle`, complete the **QA Verification** subsection and mark the bug ready to close (final close happens in Step 7):

```markdown
#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: {YYYY-MM-DD}
**Verified by**: develop-bug

**Verification Result**: ✅ Fixed

**Notes**: Regression test `{name}` passes (failed pre-fix); affected suite + lint green;
{code-review clean / lite-mode signals only}. The reported failure no longer reproduces.

**Decision**: Closed (finalised in Step 7)
```

Add a Status History row: `| {date} | Ready for QA | develop-bug | Fix verified — bug scenario gone |`. Do **not** set status `closed` yet — Step 7 owns the close + Resolution Summary.

**Signal the `ready-for-merge` stage** (when `TRACKER_ISSUE` is set) — the gate has cleared and the PR is ready:

```bash
# TRACKER=jira
node .agents/skills/develop-bug/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage ready-for-merge --json

# TRACKER=github
node .agents/skills/develop-bug/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage ready-for-merge --json
```

Off by default; non-blocking; exits 0 on every documented skip. Log in Decisions Log: "{TRACKER} {TRACKER_ISSUE} — ready-for-merge: {landed status / disabled / skip reason}."

Exit the loop and proceed to Step 7.

---

## 5b. Fix (on FAIL — reopen + qa-fix)

0. **Signal the `changes-requested` stage** (when `TRACKER_ISSUE` is set), on entering the fix cycle, before `/qa-fix`:

   ```bash
   # TRACKER=jira
   node .agents/skills/develop-bug/references/jira-stage.js \
     --issue {TRACKER_ISSUE} --stage changes-requested --json

   # TRACKER=github
   node .agents/skills/develop-bug/references/gh-stage.js \
     --issue {TRACKER_ISSUE} --stage changes-requested --json
   ```

   > Fires **per cycle**, unlike `in-qa` above which fires once. `in-qa` marks a phase the card enters once; `changes-requested` marks a state it re-enters on every failed verification, and a board that shows it on cycle 1 and then goes quiet is telling the team something false. Same rule, same rationale, as the story/task QA loop.

   Off by default; non-blocking. Log per cycle: "Verify Cycle {N} — changes-requested: {landed status / disabled / skip reason}."

1. **Reopen the bug**: set frontmatter `status: reopened`, body `**Status:** ⚠️ Reopened`. Append a new `### Iteration {N+1}` to the Developer Fix Cycle with a **Re-Investigation** note quoting the concrete failure (failing test name/output, regression, or review-code finding). Add a Status History row.

2. **Invoke `/qa-fix`** with the bug file path and the concrete findings as the developer-provided fix list (qa-fix discovers the bug, filters to `Reopened`, investigates, fixes, and writes the Fix Implementation for the new iteration — its bug-update machinery matches Step 3's section shapes). qa-fix requires the active PR, which exists.

3. **Check for actual changes**: run `git diff --stat HEAD`. If qa-fix made **no code edits**, do NOT increment the counter — log in Issues Log and **HALT**: "qa-fix could not address the remaining failure. Human review required. See implementation report."

4. **Commit + push (exclude the report)** — Step 8 owns the sole report commit:
   ```bash
   git reset HEAD -- '**/*.implementation.*.md' 2>/dev/null || true
   ```
   Invoke `/commit-changes` with `exclude={bug-prefix}.implementation.*.md` and message `fix({bug-prefix}): fix cycle {N} — {brief summary}`. Then `git push origin HEAD`. Record the commit hash in the Verify Cycle entry.

5. Increment the counter and return to **5a**.

---

## Loop Limit Escalation (after 5 cycles without PASS)

Write a thorough escalation entry in the Issues Log:

```
### Fix Loop Limit Reached — {YYYY-MM-DD}

The pipeline completed 5 verify/qa-fix cycles without the bug scenario clearing.

**Still failing**: {failing test / regression / review finding}
**What was attempted per cycle**:
- Cycle 1: {fix applied}
- … Cycle 5: {fix applied}
**Likely root cause**: {assessment — e.g. the reported behaviour is a spec question,
the fix has an unaddressed dependency, or the repro is environment-specific}
**Recommended next steps**:
1. {specific action}
2. {specific action}
```

Set the report's Final Status to `Escalated`, leave the bug `reopened` (do NOT close), commit the report via `/commit-changes` (`docs({bug-prefix}): implementation report — fix loop escalation`), push, then HALT:

```
⚠️ Bug Fix Paused — Fix Loop Limit Reached

Bug:                 {bug-prefix}
Fix cycles completed: 5
Still failing:       {short description}
Implementation Report: {report file path}

The report contains every issue and fix attempted. Options:
1. Fix the remaining failure manually, then re-run /develop-bug
2. Re-triage — the repro may reflect a spec/environment issue, not a code defect
3. Escalate to the owning team if the root cause is out of scope
```
