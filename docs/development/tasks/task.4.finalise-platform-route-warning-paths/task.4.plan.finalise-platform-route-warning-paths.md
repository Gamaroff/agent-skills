---
id: task.4.plan
title: "Implementation Plan: finalise warning-path PLATFORM routing"
type: plan
task-ref: task.4.finalise-platform-route-warning-paths.md
---

# Implementation Plan: finalise warning-path PLATFORM routing

> Requirements and success criteria: [task.4.finalise-platform-route-warning-paths.md](task.4.finalise-platform-route-warning-paths.md)

## Overview

Patch four warning-path call sites in `skills/finalise/SKILL.md` to route through the existing `$PLATFORM` branch. The primary PR-comment block at lines 783-784 is already correct; this task brings the secondary blocks in line.

## Phase-by-Phase Implementation Guide

### Phase 1: Audit

```bash
grep -n 'gh pr comment\|gh issue close' skills/finalise/SKILL.md
```

Expected: lines 882, 915, 1057, 1100 (per audit). Treat any extra hits as in-scope.

Confirm `$PLATFORM` is defined before each line. If not, hoist the detection block (lines 312-329) earlier in the workflow.

### Phase 2: Replace each site

**Line 882** — currently a prose instruction:

> Do NOT silently skip. Post a PR comment (GitHub: `gh pr comment <pr-number>`, Bitbucket: REST API as in Step 6) warning that the board was not updated:

This is already mostly correct in prose — verify the surrounding code block actually branches. If it has a bare `gh pr comment`, replace with:

```bash
if [ "$PLATFORM" = "github" ]; then
  gh pr comment "$PR_NUMBER" --body "$WARNING_BODY"
elif [ "$PLATFORM" = "bitbucket" ]; then
  curl -sf -X POST -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
    -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
    -d "$(jq -n --arg raw "$WARNING_BODY" '{content:{raw:$raw}}')" >/dev/null
fi
```

**Line 915** — board-mutation retry failure path. Wrap in the same `if/elif`.

**Line 1057** — DoD gaps notification. Wrap in the same `if/elif`.

**Line 1100** — post-condition checklist line:

Current:

> - [ ] GitHub PR comment posted via `gh pr comment <number>` (skip only if no PR exists)

Change to:

> - [ ] PR comment posted on the active platform (GitHub: `gh pr comment <number>`; Bitbucket: REST POST to `/pullrequests/{id}/comments`) — skip only if no PR exists

### Phase 2b (optional refactor): Reusable snippet

If diff is noisy, define a snippet near line 783-784:

```bash
post_pr_comment() {
  local body="$1"
  if [ "$PLATFORM" = "github" ]; then
    gh pr comment "$PR_NUMBER" --body "$body"
  elif [ "$PLATFORM" = "bitbucket" ]; then
    curl -sf -X POST -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
      -H "Content-Type: application/json" \
      "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
      -d "$(jq -n --arg raw "$body" '{content:{raw:$raw}}')" >/dev/null
  fi
}
```

Then call `post_pr_comment "$WARNING_BODY"` at each site. Keeps the SKILL.md readable. Skill bodies are markdown-with-bash-snippets, not actually executed as a script — so this is a documentation device for the agent to follow, not an actual function. Use whichever form is clearest.

### Phase 3: Validate

```bash
python skills/create-skill/scripts/quick_validate.py skills/finalise
python skills/create-skill/scripts/package_skill.py skills/finalise
grep -nE '^\s*gh pr comment' skills/finalise/SKILL.md
# All matches must sit inside `if [ "$PLATFORM" = "github" ]` blocks.
```

## Key Patterns and References

- Canonical platform detection: `skills/finalise/SKILL.md` lines 312-329
- Canonical primary PR comment dual-path: `skills/finalise/SKILL.md` lines 783-784
- Test command pattern: this repo's existing `quick_validate.py` + manual smoke

## Testing Approach

Trigger each warning path on a scratch BB repo. Concrete recipes:

- **Line 882 / 915 (board mutation failure)**: set `BOARD_NUM` to a non-existent project board → mutation fails → warning fires
- **Line 1057 (gaps)**: leave one DoD checkbox unchecked → gap notification fires
- **Line 1100 (post-condition)**: just a checklist line, verified by reading

For each, confirm the comment lands on the BB PR via the BB UI or `curl` GET on the PR comments endpoint.
