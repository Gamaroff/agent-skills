---
id: task.106.plan
title: "Implementation Plan: the lead reaches the pull request"
type: plan
task-ref: task.106.pr-comment-plain-language-lead.md
---

# Implementation Plan: the lead reaches the pull request

> Requirements and success criteria: [task.106.pr-comment-plain-language-lead.md](task.106.pr-comment-plain-language-lead.md)

## Overview

Three new catalogue entries, one engine change, and eleven prose sites each gaining a single
insertion point above the GitHub/Bitbucket arm split. The whole task turns on one rule: **the lead
goes below the marker and above everything else, once per site.**

Re-locate the sites before editing — §3's line numbers were true on 2026-09-09:

```bash
grep -rn "gh pr comment\|pullrequests/.*\/comments\|issues/comments" \
  shared/resources/*.md skills/*/SKILL.md | grep -v "/references/"
```

---

## Phase-by-Phase Implementation Guide

### Phase 1: three catalogue entries

Added to `LEAD_TEMPLATES` in `shared/resources/stakeholder-summary.js`, same shape as task.104's.

```js
"pr-summary": (s) =>
  `Some review notes below could not be attached to the exact lines of code they ` +
  `refer to${s.degraded ? ` (${s.degraded} of them)` : ""}, so they are collected here instead. ` +
  `Nothing was lost. Each one names the file and line it is about.`,

"board-warning": (s) =>
  `The work itself is fine — this note is about the tracking board only. ` +
  `${s.what || "The card could not be moved to its new column automatically"}, ` +
  `so someone will need to move it by hand. Nothing about the change is affected.`,

"dod-gaps": (s) =>
  `This work is not finished yet. Some of the checks it has to pass are still ` +
  `outstanding${s.count ? ` (${s.count})` : ""}, and they are listed below. ` +
  `It will come back here once they are done.`,
```

`board-warning` takes `what` rather than having three near-identical templates for the three notices.
The three differ only in *why* the board did not move, and that difference is one clause.

Then the standard, `shared/resources/stakeholder-summary.md`, gains a `## Pull-request comments`
section. It must contain the exclusion **and its reason**, because a scope line in a task document
disappears the moment the task is accepted:

> **Inline findings carry no lead, deliberately.** A comment anchored to line 47 of a diff is read by
> one person — the developer who wrote line 47. A non-technical paragraph on each of forty findings
> is noise for the only reader they have, and it would push the actual finding below the fold. The
> lead belongs on the *summary* comment, which is the one a non-technical reader reaches.

### Phase 2: `pr-inline-comment.js`

`buildSummaryBody()` at L288–305. Current shape: heading, then the "none were dropped" italic line,
then the per-finding entries. Change:

```js
const { renderLead } = require("./stakeholder-summary.js");

function buildSummaryBody(degraded, callerSummary) {
  const parts = [];
  if (callerSummary) {
    // The escape hatch wins outright. A caller-supplied summary is already
    // the lead; prepending a second one double-leads the comment.
    parts.push(callerSummary);
  } else {
    parts.push(renderLead("pr-summary", { degraded: degraded.length }));
  }
  parts.push("---", DEGRADED_HEADING, …);
  return parts.join("\n\n");
}
```

Two things to check against the current code before writing this:

- `--summary-file` content is currently prepended to the summary comment *outside*
  `buildSummaryBody()` (usage text at L87). If so, the precedence check belongs at that call site
  instead — the rule is "one lead per comment", wherever it is enforced.
- The degraded block is only emitted when `degraded.length > 0`. A comment that is *only* a caller
  summary must not acquire a `pr-summary` lead about findings that do not exist.

`pr-inline-comment-contract.md`: add the composition order to the existing call section, and the
inline exclusion beside the degradation rule at L54–72 — that is where a reader asking "why is there
no lead here?" will already be looking.

### Phase 3: `finalise`

**Sites 1, 2, 6** — the lead goes below the marker:

```diff
 BODY="<!-- finalise-canonical-summary -->
+This work is finished and has been accepted. Everything it set out to do was checked and
+confirmed working, and the change is now part of the product. No further action is needed.
+
+---
+
 ## ✅ Accepted — Canonical Pipeline Summary
 …"
```

The marker must stay on the first line. Site 2's idempotency is a marker search at L1023–1025
followed by `gh api -X PATCH …/issues/comments/{id}` at L1028 — a lead above the marker breaks the
search and the pipeline posts a duplicate every run without failing.

**Sites 3, 4, 5** — the board warnings are rewrites, not prefixes. Current form is mechanism-first:

```
⚠️ Project Board Not Updated
The project board could not be updated for this item. …
```

Target form is consequence-first, with the mechanism kept below:

```
⚠️ Project Board Not Updated

The work itself is fine — this note is about the tracking board only. The card could not be
moved to its new column automatically, so someone will need to move it by hand. Nothing about
the change is affected.

---

{the existing mechanism text, unchanged}
```

Site 4 (`⏸️ Project Board Move Deferred`) **must still name its deferral record id** in the body
below. That requirement predates this task and is what makes the deferral recoverable; do not let a
rewrite drop it.

### Phase 4: QA and review skills

One insertion point per site, **above the arm split**. The wrong shape:

```bash
# ❌ two insertion points — the arms will drift
if [ "$VCS" = "github" ]; then
  gh pr comment "$PR_URL" --body "$(printf '%s\n\n---\n\n%s' "$LEAD" "$BODY")"
else
  curl … --data "{\"content\":{\"raw\":\"$LEAD\n\n---\n\n$BODY\"}}"
fi
```

The right shape:

```bash
# ✅ one insertion point; both arms post the same bytes
LEAD="$(node .agents/skills/{skill}/references/stakeholder-summary-cli.js \
          --stage qa-gate --slot verdict="$GATE_DECISION")"
BODY="$(printf '%s\n\n---\n\n%s' "$LEAD" "$BODY")"

if [ "$VCS" = "github" ]; then …
```

That implies a tiny CLI wrapper around `renderLead()` so a prose site can obtain a lead without a
Node one-liner inline. **Decide in Phase 1 whether to add it**: if `stakeholder-summary-cli.js` is
worth having, it belongs in task.104's module directory and should be added here as a small
addition, not improvised at eleven sites. The alternative — each site writing its own
`node -e "…"` — is eleven copies of the same expression and will drift.

`qa-fix` site 9 operates on `$PR_COMMENT_BODY`, which task.105 §5.3 creates. If task.105 has not
merged, do the split here and record it in the implementation report; do **not** add a lead to the
shared `$COMMENT_BODY`, or the tracker comment gets a pull-request lead.

### Phase 5: tests and bundle

```bash
npm run bundle
git status --short          # expect only skills/*/references/
npm test
npm run eval:all
```

---

## Key Patterns and References

- **Marker-then-PATCH idempotency**: `skills/finalise/SKILL.md` L1023–1028 and
  `skills/review-pr/SKILL.md` L381–384. Both are `gh api -X PATCH` with `-F "body=@${BODY_FILE}"`.
  The lead must survive that path, not only the POST path.
- **Bitbucket arm shape**: `skills/finalise/SKILL.md` L1050 (search, `?pagelen=100`), L1059 (PUT),
  L1067 (POST) is the fullest example; `review-pr` L398/404/408 mirrors it.
- **The de-escaping assertion** at `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`
  L211–212 exists because a prompt example once carried an escaped `gh pr comment --body x`. Any
  edit near it must keep the example de-escaped.
- **Never hand-edit `skills/*/references/`** (`project_bundle_drift_step_docs`).

## Testing Approach

Assert order, not presence — presence passes on a build that puts the lead at the bottom:

```js
const iMarker  = body.indexOf("<!-- finalise-canonical-summary -->");
const iLead    = body.indexOf(lead);
const iHeading = body.indexOf("## ✅ Accepted");
assert.equal(iMarker, 0);
assert.ok(iMarker < iLead && iLead < iHeading);
```

Add the assertion the exclusion needs, or it will be "fixed" by a future sweep:

```js
test("inline finding bodies carry no lead", () => {
  const sent = capturedInlineComments[0].body;
  assert.ok(sent.startsWith("<!-- agent-skills-inline:"));
  for (const stage of LEAD_STAGES) {
    assert.ok(!sent.includes(renderLead(stage, {})));
  }
});
```

Bitbucket arms: assert on the captured request body's `content.raw`, not on the SKILL.md text.

Mutation proofs to run and record in the implementation report:

| Mutation | Test that must go red |
| :--- | :--- |
| Remove the lead from `buildSummaryBody()` | the summary ordering assertion |
| Move the lead above `<!-- finalise-canonical-summary -->` | `assert.equal(iMarker, 0)` |
| Prepend a lead to an inline finding body | the inline-findings-stay-bare test |
| Pass both `--summary-file` and let the template fire | the no-double-lead assertion |
