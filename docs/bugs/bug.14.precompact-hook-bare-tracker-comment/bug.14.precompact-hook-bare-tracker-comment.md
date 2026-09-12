---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
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
**Status**: ✅ Closed
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

**Date**: 2026-09-12
**Verified by**: develop-bug (Verify Cycle 1)

**Verification Result**: ⚠️ Still Failing

**Notes**: Regression scenarios S4–S6 and the suites were green, but the adversarial diff review found that the issue comment's tracker routing depended on whether the PR arm had sourced the resolver (CR-1, high confidence) — a GitHub project with an ambient `JIRA_URL` and no PR yet would post to Jira. Three further low-severity defects and one cleanup recorded in Iteration 2.

**Decision**: Reopened

### Iteration 2

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-12
**Trigger**: Verify Cycle 1 code review (`/review-code`, adversarial diff pass) — one blocking finding plus three low-severity correctness findings and one cleanup, all in the Iteration 1 fix itself:

- **CR-1 (blocking)** `develop-pipeline-on-precompact.sh:203` — the `tracker-comment.js` call passes no `--tracker`, and the hook never exports the lock's tracker. Whenever the PR arm has *not* sourced `resolve-platform.sh` (no `pr_url` — every pause before Step 4 — or `gh` absent), the engine's own resolver falls back to `JIRA_URL` presence alone: a GitHub project whose hook environment or `.env` carries `JIRA_URL` posts issue `#42` to Jira; a Jira project without credentials is treated as GitHub and reports `unverifiable` instead of `no-credentials`.
- **CR-2** `:167` — sourcing `resolve-platform.sh` unsets and re-resolves `TRACKER`, silently replacing the lock-derived value used in the outcome string, and leaving it unset when the resolver returns 1 part-way.
- **CR-3** `:166` — "resolve-platform.sh not found beside the hook" is also reported when the file exists but failed to load (config rejected), and the troubleshooting row then sends the operator to re-run the bundler for a config problem.
- **CR-4** `:176` — the `deferred — recorded in the deferred-mutation journal` outcome is asserted without checking; `tracker_write` returns 0 on every deferral branch including "record could not be written".
- **CR-5 (cleanup)** `tests/mutation-call-site-coverage.test.js:298` — `isInvocation` splits on connectives before checking leading text, so a shell `#` comment containing `&& gh issue comment` would be flagged; no such line exists today, but the widened scan makes it a latent false positive.

**Re-Investigation Notes**: all five findings verified against the tip (`1138b9c8`). CR-1 reproduced with a new shell scenario: lock with no `pr_url` and `JIRA_URL` in the environment → the shim log showed no `issue comment 42` on `gh` (the engine had routed to Jira). CR-3 and CR-4 reproduced the same way (S8: a rejected `access:` value reported "not found"; S9: an unwritable journal reported "recorded"). CR-5 reproduced as a unit test on `isInvocation`.

**Revised Approach**: the Iteration 1 design stands (both arms through the contract, fail closed); Iteration 2 removes the places where the hook let the *environment* decide something the *lock* already knows, and where an outcome string asserted more than the hook had checked.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: the Iteration 1 hook (a) let `tracker-comment.js` infer the tracker from whatever environment the PR arm happened to leave behind, (b) reused the shell variable name `TRACKER` that `resolve-platform.sh` unsets and re-resolves, and (c) reported outcomes ("not found", "recorded") that it had not actually established. The coverage-test predicate inspected text *after* splitting on connectives, so a `#` comment could lose its `#`.

**Fix Description**:

- **CR-1** — the lock's tracker is passed explicitly as `--tracker jira|github` to `tracker-comment.js` (only when the lock value is one of the two; anything else lets the engine resolve). Routing no longer depends on whether the PR arm ran.
- **CR-2** — the lock's tracker lives in `LOCK_TRACKER`; `TRACKER` is left to the resolver. The report entry and the signal's outcome string read `LOCK_TRACKER`.
- **CR-3** — the `-f` existence check and the `source` result are separate outcomes: `not found beside the hook` (re-bundle) vs `failed to load: it rejected the config` (fix `skills-config.yaml`). Troubleshooting rows added for both.
- **CR-4** — `tracker_write`'s stderr is captured and read; under a restricted mode the outcome says `recorded in the deferred-mutation journal` only when the `recorded as` line is present, and `the deferred record was NOT written (body kept at …)` otherwise.
- **CR-5** — `isInvocation` returns `false` for any line whose first non-blank character is `#`, before the connective split.
- **Adversarial pass finding (fixed in the same cycle)**: the CR-1 fix introduced `"${TRACKER_FLAG[@]}"` on a possibly-empty array, which is `unbound variable` under `set -u` on bash 3.2 — the `/bin/bash` that `#!/usr/bin/env bash` can resolve to on a consumer's macOS. Replaced with the portable `${arr[@]+"${arr[@]}"}` expansion; the hook suite now runs under both 5.3 and 3.2 (`HOOK_TEST_BASH=/bin/bash`).

**Files Modified**:

- `shared/resources/develop-pipeline-on-precompact.sh` — `LOCK_TRACKER`; `--tracker` flag; split resolver outcomes; stderr-verified deferral outcome; portable array expansion
- `shared/resources/develop-pipeline-on-precompact.test.sh` — scenarios S7 (CR-1), S8 (CR-3), S9 (CR-4); `HOOK_TEST_BASH` override so every scenario can run under bash 3.2
- `tests/mutation-call-site-coverage.test.js` — `#`-comment early return; §0b unit test (three comment shapes rejected, two real call sites still accepted)
- `shared/resources/develop-pipeline-hooks.md` — two troubleshooting rows (`failed to load`, `record NOT written`)
- `skills/develop-{bug,story,task}/references/` — bundle output

**Testing**:

- S7/S8/S9 and §0b all red before the fix (S7 showed the issue comment routed to Jira), green after: hook suite 9/9 under bash 5.3 **and** `/bin/bash` 3.2; coverage test 8/8.
- Empty-`tracker` lock run under bash 3.2: no `unbound variable`.
- shellcheck (warning level) clean; `npm run ci:fast` per the implementation report.

**Verification Steps for QA**:

1. `bash shared/resources/develop-pipeline-on-precompact.test.sh` → 9 passed; `HOOK_TEST_BASH=/bin/bash bash …` → 9 passed.
2. `grep -n -- '--tracker\|LOCK_TRACKER' shared/resources/develop-pipeline-on-precompact.sh` → the flag is built from the lock, not from `TRACKER`.
3. `node --test tests/mutation-call-site-coverage.test.js` → §0b passes.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-09-12
**Verified by**: develop-bug (Verify Cycle 2, full-branch refute pass)

**Verification Result**: ⚠️ Still Failing

**Notes**: All Iteration 2 fixes held under execution (bash 3.2 expansion, env-prefix function semantics, `--tracker` honoured). The refute pass found two further high-confidence defects in the Iteration 1 design: the PR arm's deferral record id was identical for every pause, and the slot-coverage guard could not see `$(command node …)` call sites. Recorded in Iteration 3.

**Decision**: Reopened

### Iteration 3

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-12
**Trigger**: Verify Cycle 2 — full-branch refute pass over the Iteration 2 fixes. All Iteration 2 fixes held; the pass found two further correctness defects and two cleanups, all in the Iteration 1 design that Iteration 2 did not touch:

- **CR-1** `develop-pipeline-on-precompact.sh:197` — under a restricted `access.tracker`, the PR arm's deferred record id is derived from intent + argv + target + stdin, and all four are identical for every pause (no step in the intent, the same body-file path in argv, target `{}` because the fourth argv word is a URL, no stdin). A pipeline pausing at Step 3 and again at Step 6 produces two records with one id; the handover renderer keeps the first, while the hook has overwritten the body file with the Step 6 text — one checklist row pointing at the other pause's body. The issue arm is immune (its body travels in `stdin`).
- **CR-2** `:244` — both engine call sites are `$(command node …)`; `comment-slot-coverage.test.mjs`'s regexes match a bare `node`, and its `baseStage` strips only `qa-cycle-N`/`qa-fix-N`, so the hook's slot-free `tracker-comment.js` call is invisible to the guard AGENTS.md says "fails on a call site that feeds the lead nothing".
- **CR-3 (cleanup)** `:178` — "failed to load: it rejected the config" also fires when `resolve-platform.sh` returns 1 because `read-config.sh` is missing beside it, and `:182` blames the lead CLI when `node` itself is off PATH (the issue arm checks `command -v node`; the PR arm does not).
- **CR-4 (cleanup)** `develop-pipeline-pause.md:106` — the lock-field table still says `tracker_issue` is used only when `tracker=github`.

**Re-Investigation Notes**: reproduced each: S10 (two deferred pauses at Steps 3 and 6 → one journal id), S11 (resolver present, `read-config.sh` absent → "failed to load"), and a guard-side test asserting the hook's `$(command node …)` sites are collected (red: neither site collected). Probed the transitions the suite cannot see: a second pause at the *same* step reports `already` (marker holds); a later step posts again; no `.stderr` leftovers; lock removed on every path.

**Revised Approach**: make each pause a distinct, self-describing event — the step in the body-file name and in the deferral intent — and make the guard read the call shape the hook actually uses.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: (CR-1) the PR arm's deferral inputs carried nothing pause-specific, so the record fingerprint was constant; (CR-2) the slot-coverage guard's call-site regexes were written for prose (`node …`) and its suffix-strip list predated `pipeline-paused`; (CR-3) one outcome string covered two causes; (CR-4) a doc row predating the fix.

**Fix Description**:

- **CR-1** — body files are `precompact-pr-comment.step-<N>.md` / `precompact-issue-comment.step-<N>.md` and the deferral intent names the step, so each pause yields a distinct record whose argv points at its own body. Verified: two deferred pauses → two ids, both bodies on disk.
- **CR-2** — `comment-slot-coverage.test.mjs` accepts `command node` (and a `VAR=$(…)` capture) on both engine regexes, tolerates a quoted `--stage "…"`, strips `pipeline-paused-N` in `baseStage`, classifies the hook in `NO_SLOT_ALLOWED` with its slot-free rationale, and pins the hook's two sites with a named non-vacuity test (mutation-proved: reverting to the bare-`node` regex turns it red). Guard C's "slotless only when the sole slot is `pr`" property gained the case it lacked — a template that reads no slot at all — read off the template rather than allowlisted.
- **CR-3** — the PR arm checks `command -v node` and the presence of *both* `resolve-platform.sh` and `read-config.sh` before sourcing; "not found beside the hook" now names a bundling problem and "failed to load: it rejected the config" a config one.
- **CR-4** — `develop-pipeline-pause.md` lock-field row: `tracker_issue` is used for both trackers via `--tracker`.

**Files Modified**:

- `shared/resources/develop-pipeline-on-precompact.sh` — step-suffixed body/stderr files; step in the intent; `node` + `read-config.sh` gates
- `shared/resources/develop-pipeline-on-precompact.test.sh` — S10, S11; `HOOK_TEST_STEP` override
- `shared/resources/tests/comment-slot-coverage.test.mjs` — regexes, `baseStage`, allowlist entry, non-vacuity test, Guard C property
- `shared/resources/develop-pipeline-pause.md`, `develop-pipeline-hooks.md` — file names, lock-field row
- `skills/*/references/` — bundle output

**Testing**:

- Hook suite 11/11 under bash 5.3 and `/bin/bash` 3.2; guards 102/102 (slot-coverage, call-site coverage, stakeholder-summary, parity); shellcheck clean.
- All new tests red before the fix; slot-guard regex mutation-proved.
- `npm run ci:fast` per the implementation report.

**Verification Steps for QA**:

1. `bash shared/resources/develop-pipeline-on-precompact.test.sh` → 11 passed (S10 two distinct ids; S11 "not found").
2. `node --test shared/resources/tests/comment-slot-coverage.test.mjs` → the `$(command node …)` visibility test passes.
3. Fire the hook twice at the same step with a GitHub tracker: the second issue comment reports `already`.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-09-12
**Verified by**: develop-bug (Verify Cycle 3)

**Verification Result**: ✅ Fixed

**Notes**: Regression scenarios S4–S11 in `develop-pipeline-on-precompact.test.sh` pass (11/11 under bash 5.3 and `/bin/bash` 3.2; each was red before its fix). Under `access.tracker: read-only` neither `gh issue comment` nor `gh pr comment` is executed and both writes are journaled with distinct ids; under `full` the issue comment is one `tracker-comment.js` call (marker + lead, `--body-file -`, `--tracker` from the lock) and the PR comment opens with the lead via `--body-file`. Guards: `mutation-call-site-coverage` 8/8 (scans tracked shell; bare call → red), `comment-slot-coverage` 12/12 (sees the hook's `$(command node …)` sites), stakeholder-summary / tracker-comment / parity suites green; shellcheck clean. Cycle-3 code review (scoped): no blocking findings; one medium-confidence test-assertion weakness and two cleanups applied before finalise (S11 anchored on the PR line; `baseStage` derived from the engine's `CYCLE_SCOPED_STAGES`; docs name `node` as a PR-arm precondition). The reported failure no longer reproduces.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By          | Notes                                   |
| ---------- | ------ | ------------------- | --------------------------------------- |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; obs #63 |
| 2026-09-12 | new | ensure-bug-github-issue | GitHub issue created (#391) |
| 2026-09-12 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-12 | Ready for QA | develop-bug | Fix implemented + regression test (S4–S6 in the hook test) |
| 2026-09-12 | Reopened | develop-bug | Verify Cycle 1 FAIL — review-code CR-1 (tracker routing) blocking; Iteration 2 opened |
| 2026-09-12 | Ready for QA | qa-fix | Iteration 2: CR-1..CR-5 fixed + bash 3.2 array expansion; S7–S9 regression scenarios |
| 2026-09-12 | Reopened | develop-bug | Verify Cycle 2 FAIL — refute pass: deferral-id collapse + slot-guard blind spot; Iteration 3 opened |
| 2026-09-12 | Ready for QA | qa-fix | Iteration 3: distinct deferral ids per pause; slot-guard sees command-node sites; S10/S11 |
| 2026-09-12 | Ready for QA | develop-bug | Fix verified — bug scenario gone (Verify Cycle 3 PASS) |
| 2026-09-12 | Closed | develop-bug | Fix verified and accepted — PR #392, DoD bug.14.dod.1 |

---

## Resolution Summary

**Final Status**: Closed — Fixed
**Total Iterations**: 3
**Time to Resolution**: same day (filed 2026-09-12, closed 2026-09-12)
**Final Fix Details**: The PreCompact hook's two tracker writes were bare `gh … comment --body` calls outside both the comment contract and the access gate. The issue comment is now one `tracker-comment.js` call (`--stage pipeline-paused-<step>`, `--body-file`, `--tracker` taken from the lock) — lead, idempotency marker and access gate all come from the engine; the PR comment sources `resolve-platform.sh` beside the hook, renders the same lead and posts through `tracker_write gh pr comment --body-file` with a per-step body file so each deferred pause is its own record. Both arms fail closed when a sibling engine is missing or the config is rejected, and the pause signal carries each outcome verbatim. `tests/mutation-call-site-coverage.test.js` now scans tracked shell (with a non-vacuity floor and a comment guard) and `comment-slot-coverage.test.mjs` sees `$(command node …)` call sites, so the guards' stated scope matches what they scan. PR #392.
**Lessons Learned**: (1) A guard's stated scope and its scanned scope must be held equal by a test that names the file the guard was written for — "canonical prose only" was a reasonable narrowing that made the one non-prose caller invisible, and the sentence in AGENTS.md claimed otherwise for months. (2) A shell hook must not let its *environment* decide what its *lock* already knows: routing the tracker from whatever the previous arm exported reproduced the bug in a subtler form (cycle-1 CR-1). (3) An outcome string is a claim; "recorded in the journal" and "not found beside the hook" both had to be made true by checking rather than asserted. (4) `"${arr[@]}"` on an empty array is an unbound-variable error under `set -u` on bash 3.2 — a hook that a consumer's `/bin/bash` may run needs the `${arr[@]+"${arr[@]}"}` form, and its test suite now runs under both bashes. (5) The verify loop's per-cycle adversarial review earned its cost: three of the five cycle-2/3 findings were in the cycle-1 fixes themselves.
