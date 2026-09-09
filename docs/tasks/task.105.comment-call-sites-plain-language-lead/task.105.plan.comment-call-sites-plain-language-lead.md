---
id: task.105.plan
title: "Implementation Plan: feed the lead, and close the bypass"
type: plan
task-ref: task.105.comment-call-sites-plain-language-lead.md
---

# Implementation Plan: feed the lead, and close the bypass

> Requirements and success criteria: [task.105.comment-call-sites-plain-language-lead.md](task.105.comment-call-sites-plain-language-lead.md)

## Overview

Two mechanical sweeps and one judgement call. The sweeps: append `--slot` values to 22 call sites,
and rewrite seven bare `gh` commands as engine calls. The judgement call is `review-story`, whose two
tracker arms carry different text and must be reconciled before they can be collapsed.

**Before editing anything, re-locate every site.** The task doc's line numbers were true on
2026-09-09 and will not be true when this is picked up:

```bash
grep -rn "tracker-comment.js" --exclude-dir=node_modules --exclude-dir=.git . \
  | grep -v "/references/" | grep -v "^./docs/" | grep -v CHANGELOG
grep -rn "gh issue comment\|gh issue close --comment" \
  shared/resources/*.md skills/*/SKILL.md skills/develop-bug/references/*.md
```

---

## Phase-by-Phase Implementation Guide

### Phase 1: pipeline step docs

Every edit has the same shape — one added continuation line on the existing call:

```diff
 node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
   --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
-  --stage work-started --json
+  --stage work-started \
+  --slot title="{STORY_TITLE|TASK_TITLE}" \
+  --json
```

**Site-by-site slot values.** The right-hand column is the variable the step doc has *already bound*
at that point — check each one; this is the highest-risk part of the task (task doc §10, HIGH).

| Site | Slots |
| :--- | :--- |
| step-0 `work-started` | `title="{STORY_TITLE\|TASK_TITLE}"` |
| step-2 `review` (skipped arm) | `outcome="already reviewed"` |
| step-2 `review` (story arm) | `outcome="{RECOMMENDATION}"`, `blocking="{CRITICAL_COUNT}"` |
| step-2 `review` (task arm) | same |
| step-3 `develop-complete` ×2 | `count="{TASK_COUNT\|PHASE_COUNT}"` |
| step-4 `in-review` | `pr="{PR_URL}"` |
| step-5-6 `qa-cycle-{N}` | `verdict="{GATE_DECISION}"`, `count="{ISSUE_COUNT}"`, `cycle="{N}"` |
| step-5-6 `qa-fix-{N}` | `cycle="{N}"` |
| step-7 `done` | `pr="{PR_URL}"` |
| develop-bug verify-loop | `verdict="{PASS\|FAIL}"`, `cycle="{N}"` |

**The binding check.** For each site, confirm the variable appears in an earlier assignment *in the
same step file* or is documented as caller-supplied in that step's inputs section. A slot whose
variable is bound in a different step renders literally and posts. Where a value genuinely is not
available, **omit that slot** — task.104's templates are grammatical with `{}` precisely so a missing
slot degrades instead of breaking.

Quoting: always `--slot k="value"`, quoted. A title with a space, an unquoted `--slot`, and the next
word becomes a stray argument.

### Phase 2: skill call sites

Same shape. Two need more than a line.

**`qa-story` L1783 / `qa-task` L1190** currently build the body with `printf`:

```bash
printf '%s' "QA ${GATE_DECISION} (${SCORE}/100) — PR #${PR_NUMBER}: ${PR_URL}" \
  > .claude/state/comment-body.md
node …/tracker-comment.js --issue "$ISSUE" --body-file .claude/state/comment-body.md \
  --stage qa-gate --slot verdict="$GATE_DECISION" --slot pr="$PR_URL" --json
```

The score stays in the body — the lead maps the verdict to a sentence (task.104's `GATE_MEANING`) and
deliberately does not repeat the number, because a score on an unexplained scale is the thing the
standard forbids.

**`qa-fix` §5.3 split.** Keep one content variable, two wrappers:

```bash
FIX_SUMMARY="$(cat <<'EOF'
{the shared fix-summary content, unchanged}
EOF
)"

PR_COMMENT_BODY="## 🔧 Fixes Applied
${FIX_SUMMARY}"

printf '%s' "$PR_COMMENT_BODY" > .claude/state/comment-body.md
node …/tracker-comment.js --issue "$ISSUE" --body-file .claude/state/comment-body.md \
  --stage qa-fix --slot cycle="$CYCLE" --json
```

One content variable, not two copies — duplicated prose in this repo drifts within weeks
(`project_behaviour_change_doc_sweep`). Task.106 gives `PR_COMMENT_BODY` its own lead; do not add one
here or the two tasks collide on the same lines.

### Phase 3: close the bypass

**The three plain `gh issue comment` sites** (`step-7-finalise.md` L170/L180, and the qa/review
one-liners already handled in Phase 2 — check whether Phase 2 removed them before doing this):

```diff
-tracker_call_with_retry gh issue comment {TRACKER_ISSUE} \
-  --body "Story development complete — PR: {PR_URL}. Story status: accepted. All DoD criteria verified."
+mkdir -p .claude/state
+cat > .claude/state/comment-body.md <<EOF
+Story development complete — PR: {PR_URL}. Story status: accepted. All DoD criteria verified.
+EOF
+
+node .agents/skills/{develop-story|develop-task}/references/tracker-comment.js \
+  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
+  --stage done --slot pr="{PR_URL}" --json
```

Note what this drops: `tracker_call_with_retry`. The engine has its own retry and its own
`ACCESS_TRACKER` deferral gate — wrapping it again would double-defer. Confirm against
`resolve-platform.sh` L546–593 before removing the wrapper, and say in the implementation report
which mechanism now owns the retry.

**The two `gh issue close --comment` sites** (L173, L183) split into comment-then-close:

```bash
# Comment first, close second. A failed close leaves an open issue that carries its
# own explanation; a failed comment after a close leaves a closed issue with none.
cat > .claude/state/comment-body.md <<EOF
Closing — {story|task} accepted. PR: {PR_URL}. Implementation report: {REPORT_PATH}
EOF

node …/tracker-comment.js --issue {TRACKER_ISSUE} \
  --body-file .claude/state/comment-body.md --stage done --slot pr="{PR_URL}" --json
# read reason; on unverifiable, do not post again and do not proceed to close

node …/tracker-issue.js --issue {TRACKER_ISSUE} --close --json
```

The comment above the close is a real comment, not a marker artefact — do not let the `done` stage
marker suppress it if the `done` comment at L241 already fired in the same run. **Check this**: two
`--stage done` comments on one issue collapse to one under the idempotency marker, which may be the
desired outcome (one closing summary) or a silent loss (the completion note and the closing note are
different texts). Decide deliberately and record the decision; if they must both post, one needs its
own stage, and a new stage needs a new lead template in task.104's catalogue.

> This is the one place where this task can require a change back in task.104's module. Resolve it
> early in Phase 3, not at the end.

**`review-story` L2313–2325.** Diff the GitHub inline body against the Jira heredoc at L2257–2272
before collapsing:

```bash
sed -n '2257,2272p' skills/review-story/SKILL.md > /tmp/jira-arm.txt
sed -n '2313,2325p' skills/review-story/SKILL.md > /tmp/gh-arm.txt
diff /tmp/jira-arm.txt /tmp/gh-arm.txt
```

Then collapse to the single call, mirroring `review-task` L1743 exactly — that site is the worked
example of what this should look like. Record which body won and why.

### Phase 4: tests and the anti-regression guard

**The new guard**, in `tests/mutation-call-site-coverage.test.js` beside the existing
`gh issue comment` entry at L77–80:

```js
// The bypass this guard exists for was not hypothetical: seven shipped sites
// posted a bare `gh issue comment` for months while the contract claimed they
// did not. A rule with no test is a rule that drifts back.
const BARE_COMMENT_ALLOWLIST = new Set([
  "shared/resources/develop-pipeline-on-precompact.sh",  // shell hook; no node
  "shared/resources/develop-pipeline-pause.md",          // documents the hook
  "shared/resources/develop-pipeline-hooks.md",          // documents the hook
  "shared/resources/tracker-comment-contract.md",        // names what it wraps
  "shared/resources/tracker-access-record.md",           // defer-kind table
  "shared/resources/platform-detection.md",              // tracker_write example
]);
```

Assert **zero** hits outside the allowlist, and assert the allowlist is non-empty and every entry
exists on disk — an allowlist naming a deleted file silently widens over time.

**`transition-protocol-parity.test.mjs`**: its `--stage` literal check at L72–133 already extracts
every literal from shipped markdown. Extend the same walk to assert each literal has a lead template
(import `LEAD_STAGES` from `stakeholder-summary.js`). That is one added assertion in an existing
loop, not a new test file.

**Behavioural assertions.** Where a site was converted, add a `qa-execute-snippets` case that runs
the snippet against a fake `gh` on `PATH` and asserts the captured argv is
`["issue","comment",N,"--body-file","-"]` with the lead on stdin. Grepping the SKILL.md for
`tracker-comment.js` proves the string is there, not that the call works — that distinction cost 27
undetected defects on task.84 (`feedback_assert_behaviour_not_source_text`).

Run that file alone before believing a failure in it; it is load-flaky
(`project_qa_execute_snippets_load_flake`).

### Phase 5: bundle and sweep

```bash
npm run bundle
git status --short          # expect only skills/*/references/ changes
npm run generate-catalog
npm test
npm run eval:all
```

Then the consumer-doc sweep. Grep for prose that restates comment behaviour and would now be wrong:

```bash
grep -rIln "tracker-comment\|posts a comment\|comment on the issue" \
  docs/ --exclude-dir=tasks --exclude-dir=bugs
```

---

## Key Patterns and References

- **`review-task` L1674 (Jira) and L1743 (GitHub)** are the reference implementation for a skill with
  both arms on the CLI. Every conversion in Phase 3 should end up looking like L1743.
- **`tracker_call_with_retry`** — `shared/resources/resolve-platform.sh` L546–593. Read before
  removing any wrapper; it also owns the `ACCESS_TRACKER` deferral.
- **Reason handling** — `tracker-comment-contract.md` L59–70. Every converted site must read `reason`
  and must never post over `unverifiable`.
- **Never hand-edit `skills/*/references/`** (`project_bundle_drift_step_docs`).
- **`skills/develop-bug/references/develop-bug-step-*.md` are sources**, not generated — they carry
  no banner. Edit them directly.

## Testing Approach

Order the work so the risky half is provable before the easy half is finished:

1. Phase 3 first for **one** site (`step-7-finalise.md` L170), with its behavioural test, and get it
   green. It exercises conversion, retry-ownership and reason-handling in one site.
2. Then Phase 1 and 2 as bulk sweeps, with the binding check per site.
3. Then the remaining Phase 3 sites.
4. Phase 4's guard last — it is the assertion that the sweep was complete, and it is only meaningful
   once the sweep claims to be.

Mutation proofs to run and record:

| Mutation | Test that must go red |
| :--- | :--- |
| Drop `--slot verdict=…` from the `qa-gate` site | qa-gate lead-content assertion |
| Restore one bare `gh issue comment` in a step doc | the new zero-bypass guard |
| Swap `gh issue close` before the comment call | the comment-then-close ordering assertion |
| Empty `BARE_COMMENT_ALLOWLIST` | the non-vacuity assertion on the allowlist |
