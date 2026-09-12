---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (develop-story / develop-task / develop-bug PreCompact hook; tracker-comment contract; access gate; the call-site coverage test)'
description: "The shared PreCompact hook posts a bare `gh issue comment … --body …` and a bare `gh pr comment`, outside the tracker-comment contract (no plain-language lead, no idempotency marker, inline body) and outside the tracker_write access gate — so a consumer with access.tracker: read-only still gets a tracker write. The coverage test that AGENTS.md says catches bare invocations scans Markdown only, so the hook is invisible to it."
github_issue: 391
---

**Bug ID**: bug.14
**GitHub**: [#391](https://github.com/Gamaroff/agent-skills/issues/391)
**Related**: none — cross-cutting (`shared/resources/develop-pipeline-on-precompact.sh`, bundled into `develop-story`, `develop-task`, `develop-bug`; `shared/resources/tracker-comment-contract.md`; `resolve-platform.sh` `tracker_write`; `tests/mutation-call-site-coverage.test.js`)
**Status**: ✅ Ready for QA
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

**Date**: 2026-09-12
**Developer**: Claude (develop-bug, via /develop-next)

**Reproduction**: three new scenarios in `shared/resources/develop-pipeline-on-precompact.test.sh`
(a `gh` shim on PATH logging argv + stdin; hook run with cwd = a temp consumer dir). On the
pre-fix hook at `30865480`, all three failed as the report predicts:

- **S4** `access.tracker: read-only` → shim log shows `pr comment … --body ⏸️ …` and
  `issue comment 42 --body ⏸️ …` — both writes performed, nothing recorded.
- **S5** full access → `issue comment 42 --body …` inline, no marker, no lead.
- **S6** hook copied without its siblings → still posts bare (no fail-closed path existed).

**Root Cause Analysis**: `shared/resources/develop-pipeline-on-precompact.sh:130-141` built two
notice strings and called `gh pr comment … --body` / `gh issue comment … --body` directly. The hook
never sourced `resolve-platform.sh` (so `tracker_write` and `ACCESS_TRACKER` did not exist in its
shell) and never invoked `tracker-comment.js` (so no lead, no marker, no journal). The guard that
AGENTS.md said would catch this — `tests/mutation-call-site-coverage.test.js` — walked
`shared/resources/*.md` and `skills/*/SKILL.md` only; a `.sh` was outside its scan set, so the
one caller that runs with no prose step behind it was the one no guard saw.

**Proposed Fix**: route both arms through the contract (issue → one `tracker-comment.js` call with a
new `pipeline-paused` stage; PR → `stakeholder-summary-cli.js` lead + `tracker_write gh pr comment
--body-file`), fail closed when a sibling engine is missing, and widen the guard's scan set to
tracked shell so the AGENTS.md sentence and the scan agree.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: two bare `gh … comment --body` invocations in a shell hook, invisible to a
Markdown-only call-site guard.

**Fix Description**:

- **Issue comment** is now one `tracker-comment.js --issue … --stage pipeline-paused-<step>
  --body-file …` call. The engine resolves the tracker itself, renders the lead, prepends the
  idempotency marker and applies the access gate (`deferred` under anything but `full`). The stage
  is cycle-scoped by the step it paused at, so a pipeline that pauses at Step 3 and again at Step 6
  posts twice, while a repeat at the same step reports `already`. Consequence: the hook no longer
  branches on `tracker=github` — Jira issues get the comment when `JIRA_*` credentials are in the
  hook's environment, and the engine reports `no-credentials` otherwise (the previous "Jira pause
  is silent by design" was the absence of a path, not a choice; the docs now say what actually
  happens).
- **PR comment** sources `resolve-platform.sh` beside the hook, renders the same lead with
  `stakeholder-summary-cli.js`, writes lead + `---` + notice to
  `.claude/state/precompact-pr-comment.md` (a durable path, so the deferred record's argv names a
  file a human can replay) and posts via `tracker_write gh pr comment … --body-file`.
- **Fail closed**: if `resolve-platform.sh`, `stakeholder-summary-cli.js`, `tracker-comment.js`
  or `node` cannot be found, that arm is skipped and the signal names why — never a bare call as a
  fallback. The signal and the user-facing summary now carry both outcomes verbatim
  (`posted` / `deferred` / `already` / `no-credentials` / `skipped — …`).
- **Guard widened** (Recommendation item 3, first option): `collectCanonicalDocs()` now also walks
  `shared/resources/*.sh`, `skills/*/scripts/*.sh` and `scripts/*.sh` (still not
  `references/`). A new §0 pins the PreCompact hook in the scan set with a ≥20-file floor, so the
  set cannot quietly narrow. `tracker-access.test.sh` joins `NOT_CALL_SITES` with its reason (it
  invokes the wrapper on purpose, as the thing under test).
- **Recommendation item 2 branch taken**: the hook *does* source `resolve-platform.sh` (guarded,
  never `|| exit` — a hook must exit 0). Verified it sources cleanly under `set -u` from a
  non-git cwd, reads the same `skills-config.yaml` tier as `defer-mutation.js`, and costs one
  python spawn.

**Files Modified**:

- `shared/resources/develop-pipeline-on-precompact.sh` — both comment arms rewritten; `HOOK_DIR` /
  `STATE_DIR`; outcome lines in the signal; header documents the contract, the fail-closed rule and
  the sibling engines (spelled as `shared/resources/…` for the bundler)
- `shared/resources/stakeholder-summary.js` — `pipeline-paused` lead template; added to
  `CYCLE_SCOPED_LEAD_STAGES`
- `shared/resources/tracker-comment.js` — `pipeline-paused` in `COMMENT_STAGES` and
  `CYCLE_SCOPED_STAGES`
- `shared/resources/develop-pipeline-on-precompact.test.sh` — regression scenarios S4–S6
- `shared/resources/tests/tracker-comment.test.mjs` — cycle-scoped list + `pipeline-paused-4`
- `shared/resources/tests/stakeholder-summary.test.mjs` — new test holding the catalogue's and the
  engine's suffix rules equal behaviourally over every `COMMENT_STAGE`
- `tests/mutation-call-site-coverage.test.js` — shell scan set, §0 non-vacuity, allowlist entry
- `shared/resources/develop-pipeline-hooks.md`, `develop-pipeline-pause.md`,
  `tracker-comment-contract.md`, `stakeholder-summary.md` — describe the new behaviour and stage
- `skills/develop-{bug,story,task}/SKILL.md` — pause summary repeats the signal's two outcomes
  instead of asserting Jira was not commented on
- `AGENTS.md` — the coverage sentence now names the scanned scope, which matches the scan
- `skills/*/references/*` — `npm run bundle` output for the above

**Testing**:

- Regression scenarios S4/S5/S6 fail on the pre-fix hook (output captured above) and pass after
  the fix; S1–S3 unchanged and green.
- Mutation proofs of the widened guard: appending a bare `gh issue comment` to the hook turns
  `mutation-call-site-coverage.test.js` §1 red naming the hook's line; dropping the `.sh` readdir
  turns §0 red ("the PreCompact hook must be in the scan set"). Both reverted.
- Bundled copy exercised through `skills/develop-bug/scripts/on-precompact.sh` (the installed
  path): sibling lookup resolves in `references/`; marker `pipeline-paused-6` observed.
- `stakeholder-summary`, `tracker-comment`, `comment-slot-coverage` and
  `transition-protocol-parity` suites: 166/166.
- `npm run ci:fast` (prettier + full `npm test`): see implementation report.

**Verification Steps for QA**:

1. `bash shared/resources/develop-pipeline-on-precompact.test.sh` → 6 passed.
2. `grep -n 'gh issue comment\|gh pr comment' shared/resources/develop-pipeline-on-precompact.sh`
   → only the `tracker_write gh pr comment … --body-file` line and comments.
3. `grep -c 'resolve-platform\|tracker_write\|ACCESS_' shared/resources/develop-pipeline-on-precompact.sh`
   → non-zero.
4. Re-apply the bare call and confirm `node --test tests/mutation-call-site-coverage.test.js` fails.

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
| 2026-09-12 | new | ensure-bug-github-issue | GitHub issue created (#391) |
| 2026-09-12 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-12 | Ready for QA | develop-bug | Fix implemented + regression test (S4–S6 in the hook test) |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
