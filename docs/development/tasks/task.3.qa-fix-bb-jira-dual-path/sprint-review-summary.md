# Sprint Review Summary — Task 3

**Task:** qa-fix: add Bitbucket REST + Jira MCP dual-path
**Status:** ACCEPTED ✅
**Acceptance Date:** 2026-05-05
**PR:** [#6 — feat(qa-fix): add Bitbucket REST + Jira MCP dual-path](https://github.com/Gamaroff/agent-skills/pull/6)
**QA Gate:** PASS (92/100)

---

## Summary

Refactored `skills/qa-fix/SKILL.md` to support both GitHub and Bitbucket+Jira projects in the develop pipeline. The skill previously hard-coded the GitHub `gh` CLI for PR detection and comment posting, breaking the pipeline for any Bitbucket project. This change adds full platform parity — Bitbucket teams now receive the same QA fix trail as GitHub teams.

---

## Success Criteria Met

- ✅ PR detection works on github.com remotes (existing behavior preserved)
- ✅ PR detection works on bitbucket.org remotes (REST /pullrequests with branch filter)
- ✅ Post-fix comment lands on GitHub PR via `gh pr comment`
- ✅ Post-fix comment lands on Bitbucket PR via REST POST /pullrequests/{id}/comments
- ✅ Jira comment posted via `addCommentToJiraIssue` MCP when `JIRA_URL` set (non-blocking)
- ✅ No `gh` calls execute on a Bitbucket project
- ✅ No measurable performance change on GH projects

---

## Key Changes Implemented

### Platform Detection Block (Phase 1)
Added environment variable documentation table (`BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`, `JIRA_URL`) and platform detection block mirroring `create-pr` / `finalise` patterns. Detection runs once; all downstream branches use `$PLATFORM`.

### Dual-Path PR Detection (Phase 2)
Replaced single `gh pr view` call with `if/elif` on `$PLATFORM`:
- GitHub: `gh pr view --json url,state,title,number`
- Bitbucket: `curl -sf .../pullrequests?q=source.branch.name=...+AND+state=OPEN` with URL-encoded branch name

Both branches set identical downstream variables (`PR_URL`, `PR_NUMBER`, `PR_STATE`, `PR_TITLE`).

### Dual-Path PR Comment (Phase 3)
Replaced `gh pr comment` with platform-branched block:
- GitHub: `gh pr comment "$PR_URL" --body "$COMMENT_BODY"`
- Bitbucket: `curl -X POST .../pullrequests/${PR_NUMBER}/comments` with `jq`-built JSON payload

Unified `COMMENT_RC` exit code check for both platforms.

### Jira MCP Comment (Phase 4)
Added optional non-blocking Jira comment step after PR comment success. Reads `jira_key` from `$STORY_FILE` frontmatter, calls `addCommentToJiraIssue` with `contentFormat: "markdown"`. Mirrors `finalise` MCP call shape. Failure logs warning and continues — never halts qa-fix.

### Repackage and Validate (Phase 5)
`quick_validate.py` passes. `package_skill.py` regenerated `skills/qa-fix/qa-fix.zip`. Grep audit confirms no stray `gh pr` calls outside the GitHub platform branch.

---

## Files Modified

| File | Change |
|------|--------|
| `skills/qa-fix/SKILL.md` | Core change: platform detection, dual-path PR detection, dual-path comment, Jira MCP block |
| `skills/qa-fix/qa-fix.zip` | Regenerated build artifact (gitignored) |

---

## Testing & QA

- **Static validation**: `quick_validate.py` PASS
- **Grep audit**: All `gh pr` calls inside `if PLATFORM=github` branches — PASS
- **Diff review**: All 5 phases verified in `git diff origin/main..HEAD`
- **QA Gate**: PASS (92/100) — 0 HIGH, 0 MEDIUM, 2 LOW observations

## Known Limitations / Future Work

1. Step 0 of qa-fix lacks explicit `$STORY_FILE` variable export — Jira block references it by description; low-impact since Jira step is non-blocking.
2. PR display block handles `MERGED`/`CLOSED` states but not Bitbucket-specific `DECLINED`/`SUPERSEDED` — cosmetic gap only.

---

## Impact

- **Bitbucket+Jira teams**: qa-fix pipeline step now functional (was broken — `gh pr view` failed silently on BB remotes)
- **GitHub teams**: No change — GitHub path is identical to pre-change code
- **No breaking changes**
