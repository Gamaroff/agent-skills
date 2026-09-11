---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (develop-story / develop-task / develop-bug PreCompact hook; tracker-comment contract; access gate; the call-site coverage test)'
description: "The shared PreCompact hook posts a bare `gh issue comment … --body …` and a bare `gh pr comment`, outside the tracker-comment contract (no plain-language lead, no idempotency marker, inline body) and outside the tracker_write access gate — so a consumer with access.tracker: read-only still gets a tracker write. The coverage test that AGENTS.md says catches bare invocations scans Markdown only, so the hook is invisible to it."
---

**Bug ID**: bug.14
**Related**: none — cross-cutting (`shared/resources/develop-pipeline-on-precompact.sh`, bundled into `develop-story`, `develop-task`, `develop-bug`; `shared/resources/tracker-comment-contract.md`; `resolve-platform.sh` `tracker_write`; `tests/mutation-call-site-coverage.test.js`)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-09-12
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: when Claude Code is about to compact context mid-pipeline, the PreCompact hook posts a
"pipeline paused" comment on the PR and, when `TRACKER=github`, on the tracker issue. Both calls
are bare `gh` invocations:

```bash
# shared/resources/develop-pipeline-on-precompact.sh
133:  gh pr comment "$PR_URL" --body "$PR_BODY" >/dev/null 2>&1 || true
140:  gh issue comment "$TRACKER_ISSUE" --body "$ISSUE_BODY" >/dev/null 2>&1 || true
```

The hook never sources `resolve-platform.sh`, so neither call passes through `tracker_write` and
`ACCESS_TRACKER` / `ACCESS_VCS` are never consulted. Neither call goes through `tracker-comment.js`
or the PR-stage lead path, so the comment has no plain-language lead, no idempotency marker (a
second compaction posts a second comment), and an inline `--body` rather than `--body-file`.

**Expected Behavior**: per `shared/resources/tracker-comment-contract.md`, a comment on a tracker
issue is one `tracker-comment.js` call with `--stage` and `--body-file`, which renders the lead and
honours the access gate; a PR comment takes the PR-stage path task.106 gave every other PR comment.
Under `access.tracker: read-only` / `approve` / `manual`, nothing is posted — the deferred-mutation
record carries it instead.

**Actual Behavior**: the comment posts regardless of access mode, as raw text, every time the hook
fires. AGENTS.md (§Stakeholder Summaries) states the coverage test "fails on a bare `gh issue
comment` invocation in shipped source"; `tests/mutation-call-site-coverage.test.js` scans
`skills/*/SKILL.md` and `shared/resources/*.md` **only** (its header calls this "canonical prose
only", deliberately) — so the one caller that runs *outside* the agent, with no prose step to obey
the contract, is exactly the one no guard sees. (AGENTS.md's wording was corrected to "canonical
Markdown" on 2026-09-12; this bug is what decides whether the scan is widened instead.)

**Impact**: (1) an access-mode bypass — the consumer declared a restriction and the hook writes
anyway; (2) a contract miss on the most visible comment the pipeline makes, since a paused pipeline
is the moment a non-technical reader most needs the plain-language line; (3) a guard whose stated
scope exceeds its scanned scope, which is the class obs #63 records.

---

## Reproduction Steps

**Environment**: any consumer repo with a `develop-*` pipeline lock present and `gh` on PATH.

**Steps to Reproduce**:

1. In a consumer repo, set `access: { tracker: read-only }` in `skills-config.yaml`.
2. Start `/develop-task` on any task so `develop-pipeline.lock` exists with `tracker: github` and a
   `tracker_issue`.
3. Trigger the PreCompact hook (or run it directly:
   `bash .agents/skills/develop-task/scripts/on-precompact.sh` with the lock in place and `gh`
   shimmed to log its argv).
4. Observe `gh issue comment <n> --body …` in the shim log — no `tracker_write`, no
   `tracker-comment.js`, no lead, no marker.

Static confirmation (no consumer needed):

```bash
grep -n 'gh issue comment\|gh pr comment' shared/resources/develop-pipeline-on-precompact.sh
grep -c 'resolve-platform\|tracker_write\|ACCESS_' shared/resources/develop-pipeline-on-precompact.sh   # → 0
```

**Frequency**: Always (when the hook fires with a PR / GitHub issue)
**Reproducible**: Yes

---

## Evidence

**Measured 2026-09-12** (`develop` @ `6ce3280e`):

```
$ grep -n 'gh issue comment\|gh pr comment' shared/resources/develop-pipeline-on-precompact.sh
133:  gh pr comment "$PR_URL" --body "$PR_BODY" >/dev/null 2>&1 || true
140:  gh issue comment "$TRACKER_ISSUE" --body "$ISSUE_BODY" >/dev/null 2>&1 || true
$ grep -c 'resolve-platform\|tracker_write\|ACCESS_' shared/resources/develop-pipeline-on-precompact.sh
0
$ git grep -n "gh issue comment" -- 'shared/resources/*.sh' 'skills/*/scripts/*' 'scripts/*' | grep -v references/ | grep -v '^\S*:\s*#'
shared/resources/develop-pipeline-on-precompact.sh:140:  gh issue comment "$TRACKER_ISSUE" --body "$ISSUE_BODY" >/dev/null 2>&1 || true
```

`tests/mutation-call-site-coverage.test.js:14-20, 194-200` — `collectCanonicalDocs()` walks
`shared/resources/*.md` and `skills/*/SKILL.md`; no `.sh` is read.

**Related Files**:

- `shared/resources/develop-pipeline-on-precompact.sh` (source; three bundled copies under
  `skills/develop-{story,task,bug}/references/`)
- `shared/resources/develop-pipeline-hooks.md:52`, `develop-pipeline-pause.md:51,134` — document the
  bare call as the behaviour
- `shared/resources/tracker-comment.js`, `tracker-comment-contract.md`, `stakeholder-summary.js`
  (`COMMENT_STAGES` — a new `pipeline-paused` stage needs a lead template, which
  `stakeholder-summary.test.mjs` enforces)
- `shared/resources/resolve-platform.sh` — `tracker_write`
- `tests/mutation-call-site-coverage.test.js`

---

## Scope & Impact

**Reference**: `shared/resources/tracker-comment-contract.md` ("a comment on a tracker issue is one
CLI call"); `shared/resources/platform-detection.md` (access axis, most-restrictive-wins);
AGENTS.md §Tracker Comments / §Stakeholder Summaries.

**How It Failed**: the contract was enforced at prose call sites by a test that reads prose. A hook
is shipped source that is not prose. Cross-cutting because the hook is one file bundled into three
pipelines, and the fix touches the comment engine (new stage), the access gate (sourcing inside a
hook that may run with a minimal environment) and the guard's scan set.

---

## Recommendation

1. Route the issue comment through `tracker-comment.js --stage pipeline-paused --body-file …` (adds a
   `pipeline-paused` lead to the catalogue and to `COMMENT_STAGES`); route the PR comment through the
   PR-stage lead path. Both then inherit the access gate and the marker.
2. If sourcing `resolve-platform.sh` inside the hook is undesirable (hooks run under a timeout and
   with a minimal env), at minimum read `access.tracker` / `access.vcs` and skip the post under
   anything but `full`, writing the deferred-mutation record instead — the hook already writes a
   resume snapshot, so the record has a home.
3. Widen `collectCanonicalDocs()` to tracked `*.sh` outside `references/` (with a non-vacuity floor:
   the test must see at least the known hook files) **or** keep the scope and add a second, explicit
   assertion for shell sources — either way the AGENTS.md sentence and the scan must agree.
4. Update `develop-pipeline-hooks.md` and `develop-pipeline-pause.md`, which currently document the
   bare call.
5. Mutation-prove the widened guard: restore the bare call and confirm that test — not another — goes
   red.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By          | Notes                                   |
| ---------- | ------ | ------------------- | --------------------------------------- |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; obs #63 |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
