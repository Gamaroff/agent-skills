---
id: task.120
title: "[Task 120] The pause hook, the hook installer and the README badge each rely on a human remembering: make them idempotent, self-healing and generated"
type: task
description: "On task.110 the PreCompact pause hook ran twice in parallel — a local settings.json carried the same hook under two path spellings the installer's exact-string dedupe cannot see — and appended its report block line-for-line twice and posted its PR and issue comments twice (obs #101). The hook itself has no claim: two concurrent runs both see the lock. Separately, the README skills badge is a hand-typed number that generate_catalog.py never touches, one behind before task.110 and two behind after it. Three small mechanisms: an atomic pause claim and a marked PR comment in the hook, identity-based dedupe with a healer in the installer, and a badge the catalog generator writes so validate.yml's no-diff check owns it."
tags: [develop-task, develop-story, hooks, install-hooks, catalog, readme, drift]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-16
updated: 2026-09-16
assignee:
estimated_effort_hours: 8
github_issue: 409
---

# Technical Task: The pause hook, the hook installer and the README badge each rely on a human remembering

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.120.review.1.hook-idempotence-and-badge-drift.md` implemented 2026-09-16
**GitHub Issue**: [#409](https://github.com/Gamaroff/agent-skills/issues/409)

---

## 1. Overview

Three things drifted during task.110 for the same reason — a mechanism that works only if something outside it behaves: the PreCompact pause hook assumes it fires once, the hook installer assumes a hook has one spelling, and the README skills badge assumes someone bumps it. This task removes the assumption from each.

**Scope**: `shared/resources/develop-pipeline-on-precompact.sh` (atomic pause claim; idempotency marker on the PR comment), `shared/resources/develop-pipeline-install-hooks.sh` (dedupe by hook identity; heal the duplicate), `skills/create-skill/scripts/generate_catalog.py` (write the badge count into `README.md`), plus tests for each and the bundled copies.

**Key deliverables**:

1. A hook that appends once and posts once however many times the host fires it.
2. An installer that ends with one entry per hook regardless of the `.claude/skills` / `.agents/skills` spelling, and heals a settings file that already carries both.
3. A README badge that the catalog generator owns, caught by the existing CI no-diff check when it drifts.

---

## 2. Motivation

### Current Problems

1. **The pause hook double-fired and corrupted its own trail.** On 2026-09-15T18:25:48Z (commit `dd934a86`) the hook appended its "Pipeline Paused" block to task.110's implementation report **line-for-line twice** (65 added lines, one timestamp, one commit) and posted the pause comment twice on PR #408 and twice on issue #407. The report read as corrupted on resume and was deduplicated by hand (obs #101).
2. **The cause was a double registration the installer cannot see.** The local `.claude/settings.json` carried the PreCompact and Stop hooks twice — once as `.claude/skills/develop-story/scripts/on-precompact.sh`, once as `.agents/skills/develop-story/scripts/on-precompact.sh`. Both resolve to the same script through the repo's symlinks; the harness runs every hook for an event in parallel; `patch_hook` dedupes on the exact command string (`develop-pipeline-install-hooks.sh:128`), so the two spellings are two hooks to it.
3. **The hook has no claim on the pause.** It tests `[ -f "$LOCK" ]` and arms `trap 'rm -f "$LOCK"' EXIT` (`:84-99`) — a check-then-act. Two concurrent runs both pass the check, both write the snapshot, both append, both post. The issue comment goes through `tracker-comment.js` and carries a marker, but two parallel runs race the marker search too; the PR comment is a bare `gh pr comment --body-file` (`:211`) with no marker at all.
4. **The README skills badge is a hand-typed number.** `README.md:5` reads `skills-126`; the catalog has 128 entries. `generate_catalog.py` computes `total` (`:214`) and prints it, but never writes it anywhere a check can see. The badge was already one behind before task.110 (last bumped 2026-09-09) — it drifts on every new skill.

### Benefits of the Three Mechanisms

- **A hook that is idempotent by construction**: an `mv` of the lock is atomic; the loser of a concurrent double-fire finds no lock and exits at the existing noop path. No dependence on how many times the host fires or how many entries a settings file carries.
- **A settings file that cannot carry the same hook twice**: identity dedupe plus a healer means an older or hand-edited install converges on one entry per hook on the next `install-hooks.sh` run — the same self-healing the installer already does for the obsolete `on-skill-return.sh` hook (`:246`).
- **A badge that cannot drift**: once the generator writes it, `validate.yml`'s "Catalog up-to-date check" (`:72-81`, which already regenerates and diffs) catches a stale count on every PR that touches `skills/**` — no new CI step, no new convention.
- **One less class of "fixed by hand on resume"**: the enumeration/drift class in `docs/reference/anti-patterns.md`, applied to three more places.

---

## 3. Technical Background

### Current Architecture

**Pause hook** (`shared/resources/develop-pipeline-on-precompact.sh`, bundled to `skills/develop-{story,task,bug}/scripts/on-precompact.sh` and `references/`):

```
[ -f $LOCK ] || emit_empty          # check
write_pause_snapshot                # copies the lock to last-halt.json
trap 'rm -f "$LOCK"' EXIT           # act — much later
append block >> $REPORT             # :130-157
tracker_write gh pr comment …       # :211, no marker
tracker-comment.js --stage pipeline-paused   # marker, but raced
git commit + push
```

Two processes started within the same second both pass the check; nothing between the check and the `rm` is exclusive.

**Installer** (`shared/resources/develop-pipeline-install-hooks.sh`): resolves one `BASE` from a candidate list (`.agents/skills/…` first, `.claude/skills/…` last, `:62-79`), then `patch_hook EVENT CMD` adds an entry unless `[.hooks[$event][]?.hooks[]?.command] | index($cmd)` finds the exact string (`:128`). `unpatch_hook EVENT PATTERN` (`:159`) removes entries whose command matches a jq regex — used once, to retire `on-skill-return.sh` (`:246`). There is already a healer for spelling drift: `unpatch_hook_exact EVENT CMD` (`:193`) is looped over every candidate base (`:237-240`) to strip the legacy **bare-relative** form `bash <candidate>/on-precompact.sh`. It is an exact-string match, so the `${CLAUDE_PROJECT_DIR}`-quoted `.claude/skills/…` form that task.110's settings carried (`.claude/settings.json.bak-2026-09-16`) slips past it — two healers, each blind to the other's spelling, is the enumeration class this task removes.

**Badge**: `README.md:5` — `[![Skills](https://img.shields.io/badge/skills-126-brightgreen)](#skill-catalog)`, edited by hand. `generate_catalog.py` writes `docs/reference/skill-catalog.md` and prints `✅ Generated catalog with {total} skills` (`:214-215`).

### Target Architecture

**Pause hook**: the check becomes a claim.

```
CLAIM="$LOCK.pausing.$$"
mv "$LOCK" "$CLAIM" 2>/dev/null || emit_empty     # atomic: exactly one caller wins
LOCK="$CLAIM"                                     # everything below reads the claimed copy
write_pause_snapshot
trap 'rm -f "$LOCK"' EXIT
…
PR body starts with "<!-- agent-skills-comment:pipeline-paused-{step} -->" — the same marker family
tracker-comment.js uses — and the post is find-by-marker → edit → else create, as finalise does.
```

The loser's `mv` fails (`ENOENT`), it takes the existing "no lock" noop path, and nothing is written. The `last-halt.json` snapshot, the report block, the comments and the commit are each produced once. The winner then sweeps every other `$LOCK.pausing.*` — a loser never owns one, so anything else there is a killed run's — which is what keeps `.claude/state/` from accumulating stale claims.

**Installer**: `patch_hook` dedupes on the hook's **identity** — `<skill>/scripts/<hook>.sh` with `bash`, the optional quoted `${CLAUDE_PROJECT_DIR}/` and the `.claude/skills/` or `.agents/skills/` prefix stripped — and, before adding, removes every entry under the event whose identity equals the new hook's and whose command differs from `$cmd`. No per-prefix regex and no escaping: any spelling of the same script — bare-relative, quoted, either root — converges on the one the resolver prefers. The existing `unpatch_hook_exact` loop (`:237-240`) is retired in the same change; the legacy form it strips is one more spelling of the identity.

**Badge**: `generate_catalog.py` gains a `--readme` step (on by default) that rewrites the `skills-\d+-` segment of the badge line in `README.md` to `total`. `validate.yml`'s existing catalog step regenerates and diffs `docs/reference/skill-catalog.md`; it extends its `git diff --quiet` to `README.md`, **and** `README.md` joins both `on.pull_request.paths` and `on.push.paths` (`:3-30`) — the workflow is path-filtered, and without the trigger a hand-edit of the badge would run no check at all (the file's own comment on `skill-dependencies.json` states the rule). Three lines, and a stale badge fails CI the same way a stale catalog does.

### Important Clarifications

- **The registration fix and the hook fix are both needed.** Deduping the installer stops *this* cause; the atomic claim stops the class (a host that fires PreCompact twice, a user who hand-adds a hook, a future third spelling). The hook is the one that must not depend on the other.
- **`mv` on the same filesystem is the atomic primitive available to bash 3.2** (macOS default) — no `flock`, no `mkdir` lock directory to clean up. The claimed name carries `$$` so a stale `.pausing.*` from a killed run never blocks the next.
- **The Stop hook is registered twice the same way** but is idempotent by nature (it reads the lock and returns a block decision); it is covered by the installer fix and needs no change of its own.
- **The badge count must be the catalog's count**, not `ls skills | wc -l` — the two agree today (128) and the generator's `total` is the one the catalog check already trusts.

---

## 4. Scope

### In Scope

✅ Atomic pause claim in `develop-pipeline-on-precompact.sh`; marker + find-then-edit on its PR comment
✅ A concurrency test: two hook invocations against one lock → one snapshot, one report block, one comment call
✅ Identity-based dedupe and healing in `develop-pipeline-install-hooks.sh`; a test that a settings.json carrying both spellings ends with one entry per event
✅ `generate_catalog.py` writes the README badge; `validate.yml` diffs `README.md` alongside the catalog; the badge bumped to the current count in the same change
✅ `npm run bundle` so the `skills/*/scripts/on-precompact.sh` shims and `references/` copies follow

### Out of Scope

❌ Making the Stop hook or the develop-next hooks atomic — they are read-only or already idempotent
❌ Any change to the pause's *content* (the resume contract in `develop-pipeline-pause.md` is unchanged)
❌ Deduplicating the two 2026-09-15 comments on PR #408 / issue #407 — historical, already noted in the trail
❌ The four LOW code follow-ups from task.110's `pr-review.2` (separate task)

---

## 5. Breaking Changes

None — API stable. The hook's inputs (the lock file, the environment), its outputs (snapshot, report block, comments, commit) and the installer's CLI are unchanged; the only observable difference is that each output is produced once. `generate_catalog.py` gains an opt-out flag (`--no-readme`) for callers that do not want `README.md` touched; the default writes it, which is what CI now expects.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.120.plan.hook-idempotence-and-badge-drift.md](task.120.plan.hook-idempotence-and-badge-drift.md)

### Phase 1: Atomic pause claim and a marked PR comment

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-on-precompact.sh`
- `shared/resources/develop-pipeline-on-precompact.test.sh`
- `shared/resources/develop-pipeline-pause.md` (one paragraph: the claim)

**Changes**:
- [x] Replace the `[ -f "$LOCK" ]` check with `mv "$LOCK" "$LOCK.pausing.$$"`; on failure take the existing noop path; point every later read and the EXIT trap at the claimed name
- [x] After a successful claim, remove every `"$LOCK".pausing.*` other than `$CLAIM` (only the winner runs this; a loser has exited)
- [x] Prefix the PR body with `<!-- agent-skills-comment:pipeline-paused-{step} -->` (marker **before** the lead — `finalise` records why) and post find-by-marker → PATCH → else create (the `finalise` recipe), through `tracker_write` as now. The search is `gh pr view --json comments`, a partial read (no paging — `tracker-comment.js` moved its own to `gh api --paginate`); accepted here as `finalise` accepts it, and noted in the plan
- [x] `develop-pipeline-pause.md` paragraph states both the claim and the same-step re-pause semantics: the PR arm **edits** the earlier comment in place, the issue arm reports `already` and posts nothing; the report keeps every pause
- [x] Test: two concurrent invocations with one lock → exactly one snapshot, one report block, one PR-comment call (stub `gh`), one tracker-comment call; the loser exits 0 with the empty signal
- [x] Test: a stale `.pausing.*` file from a killed run does not block a fresh pause, and is gone after it

**Dependencies**: none

### Phase 2: Installer dedupes by identity and heals

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-install-hooks.sh`
- `shared/resources/develop-pipeline-install-hooks.test.sh` (new)

**Changes**:
- [x] `hook_identity()` — strip `bash`, the optional quoted `${CLAUDE_PROJECT_DIR}/`, then `.claude/skills/` or `.agents/skills/`, from a command; `patch_hook` compares identities, not strings
- [x] Before `patch_hook`, `heal_hook EVENT CMD` removes every entry whose identity equals `hook_identity "$CMD"` and whose command is not exactly `$CMD` (jq: `select(.command != $cmd)` over the identity match); label the echo `removing duplicate spelling`
- [x] Retire the `unpatch_hook_exact` candidate loop (`:237-240`) — the bare-relative legacy form is one more spelling the identity healer already covers; keep the function only if another caller remains
- [x] Test: a settings.json with both quoted spellings **and** the legacy bare-relative form for PreCompact and Stop → one entry each (the `$BASE` spelling), other keys and an unrelated `PostToolUse` hook byte-identical; idempotent on a second run; `--dry-run` shows the prune
- [x] Wire the test into `package.json` `scripts.test` (the glob lists per-file; a new suite runs nowhere until added — see project memory)

**Dependencies**: none (independent of Phase 1)

### Phase 3: The badge is generated

**Risk Level**: Low

**Files**:
- `skills/create-skill/scripts/generate_catalog.py`
- `README.md`
- `.github/workflows/validate.yml`
- a test under `tests/` or the generator's own `--check` path

**Changes**:
- [x] Switch `main()` (`:218-223`, positional `sys.argv` only) to `argparse`: the two positionals (`skills_dir`, `output_file`) stay optional with today's defaults, plus `--no-readme` and `--readme PATH` — `npm run generate-catalog` and the CI step are unchanged
- [x] After the catalog is written, rewrite `skills-\d+-` in the badge line of `README.md` (or `--readme PATH`) to `total`; `--no-readme` opts out; print what changed
- [x] `validate.yml` "Catalog up-to-date check": `git diff --quiet docs/reference/skill-catalog.md README.md`; add `README.md` to `on.pull_request.paths` and `on.push.paths` so a badge-only edit triggers the workflow
- [x] Bump the badge to 128 (the generator does it; commit the result)
- [x] Test: a README with a stale count is rewritten; a README without the badge line is left untouched with a warning, never an error
- [x] `npm run generate-catalog` and `npm run bundle` — no diff after

**Dependencies**: none

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-on-precompact.sh` — atomic claim; marked, idempotent PR comment
2. ✅ `shared/resources/develop-pipeline-install-hooks.sh` — identity dedupe; healer for the other spelling
3. ✅ `skills/create-skill/scripts/generate_catalog.py` — argparse CLI; badge rewrite

### Files to Modify (Tests)

4. ✅ `shared/resources/develop-pipeline-on-precompact.test.sh` — concurrency and stale-claim cases
5. ✅ `shared/resources/develop-pipeline-install-hooks.test.sh` — new; both-spellings → one; idempotent
6. ✅ `tests/generate-catalog-badge.test.js` — the generator test for the badge rewrite (`node --test`, runs the script against a fixture skills tree + README; the repo has no Python test harness)
7. ✅ `package.json` — the new shell suite added to the `bash …` chain (`tests/*.test.js` is already a glob, so the generator test needs no entry)
7a. ✅ `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` — the static `#2e` assertions re-pointed from the retired `unpatch_hook_exact "bash ${c}/…"` loop to the identity healer (`hook_identity`, `heal_hook`), and to the wizard's mirrored `_hook_identity` / `_heal_hook`

### Files to Modify (Dependencies)

8. ✅ `.github/workflows/validate.yml` — diff `README.md` with the catalog; `README.md` in both trigger path lists
8a. ✅ `scripts/setup-consumer.sh` — the wizard's inline installer (`_patch_hook` / `_unpatch_hook_exact` loop) is a second copy of the same exact-string dedupe; ported to the same `_hook_identity` / `_heal_hook` rule so a consumer set up by the wizard does not re-create the duplicate this task removes (found by the static `#2e` test naming both files; not in the original scope, same defect)

### Files to Modify (Documentation)

9. ✅ `README.md` — badge 126 → 128 (generated)
10. ✅ `shared/resources/develop-pipeline-pause.md` — the claim (side-effect 0), the marker/find-then-edit PR arm, the same-step re-pause note, and the flow diagram
10a. ✅ `shared/resources/develop-pipeline-hooks.md` — trigger condition (claim), installer step 3 (identity + heal), idempotency paragraph, and a troubleshooting row for "paused twice"
10b. ✅ `docs/reference/configuration.md` — the one-line installer description no longer says "skips entries already present" as if spelling were identity
11. ✅ `CHANGELOG.md` — `[Unreleased]` entry `(task 120)`
12. ✅ `skills/develop-{story,task,bug}/references/*` and `scripts/on-precompact.sh` — via `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each mechanism in isolation, hermetic (stubbed `gh`, `git`, `node`; temp settings files; fixture README)

**Actions**:
- Hook: run the script twice concurrently (`&` + `wait`) against one lock in a temp `PIPELINE_LOCK`; assert one snapshot, one appended block, one `gh pr comment` call recorded by the stub, one tracker-comment call; assert the second exit is 0 with the empty signal. Mutation: revert `mv` to `[ -f ]` → the test goes red.
- Installer: fixture settings.json with both spellings → run → assert one entry per event and the non-hook keys byte-identical; run again → no change. Mutation: make `hook_identity` the identity function → red.
- Generator: fixture README with `skills-126-` → run → `skills-128-`; fixture without the badge line → unchanged, warning on stderr, exit 0. Mutation: remove the rewrite → red.

**Command**: `npm test` (both shell suites and the generator test under the per-file globs); `bash shared/resources/develop-pipeline-on-precompact.test.sh` standalone

### Integration Tests

- Install into a copy of this repo's actual `.claude/settings.json` shape (both symlink roots present) → one entry per event.
- `python3 skills/create-skill/scripts/generate_catalog.py && git diff --quiet docs/reference/skill-catalog.md README.md` — the CI step, run locally.

### Performance Tests

Not applicable — a hook that runs once per compaction and a generator that runs per commit.

### Consumer Tests

- A consumer installed by `setup-consumer.sh` (only `.agents/skills`) — installer output unchanged, one entry per event.
- `bundle --check` clean after `npm run bundle`.

---

## 9. Success Criteria

### Functional

- [x] Two concurrent PreCompact invocations against one lock produce one snapshot, one report block, one PR comment and one issue comment; the loser exits 0 with the empty signal
- [x] `install-hooks.sh` on a settings.json carrying `.claude/skills/…` and `.agents/skills/…` entries for the same hook ends with one entry per event, and is a no-op on the second run
- [x] `generate_catalog.py` rewrites the README badge to the catalog count; `validate.yml` fails on a stale badge, and runs on a PR that touches only `README.md`
- [x] `README.md` badge reads 128 on the branch

### Performance

- [x] The hook's wall-clock is unchanged within noise (one `mv` replaces one `test -f`)
- [x] `generate_catalog.py` completes in the same time class (one extra small file rewrite)

### Code Quality

- [x] Every new mechanism has a test that goes red when the mechanism is reverted (recorded as `covered` in the implementation report)
- [x] `shellcheck` clean on both shell scripts; `bundle --check` clean; `prettier --check` clean
- [x] The new test suites are listed in `package.json` `scripts.test`

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` cites `(task 120)`
- [x] `develop-pipeline-pause.md` describes the claim; the resume contract is unchanged
- [x] The local `.claude/settings.json` fix applied on 2026-09-16 (duplicates removed by hand) is reproduced by the installer's healer on a re-run — verified against a copy of the pre-fix file (`.claude/settings.json.bak-2026-09-16`)

---

## 10. Risk Assessment

### High Risk

None.

### Medium Risk

1. **The claim renames the lock the Stop hook reads**
   - Risk: `on-stop.sh` reads `develop-pipeline.lock`; during a pause the file is briefly `*.pausing.*`, so a Stop firing in that window sees no lock and lets the orchestrator stop
   - Probability: Low (the window is the hook's own runtime; compaction is already halting the turn)
   - Impact: Low — this is the intended end state after a pause anyway (the hook removes the lock)
   - Mitigation: document the window in `develop-pipeline-pause.md`; the snapshot is written before anything else, so resume is unaffected
   - Rollback: revert Phase 1 alone

### Low Risk

2. **A consumer README without the badge line**
   - Risk: the generator warns and leaves README untouched; a consumer's CI diff step does not include README unless they add it
   - Mitigation: the README rewrite is a no-op without the line; `--no-readme` for consumers who generate their own
3. **`hook_identity` strips too much**
   - Risk: an identity that collapses two different scripts to one string removes a consumer's unrelated hook
   - Mitigation: the strip list is three literal prefixes (`bash`, the quoted `${CLAUDE_PROJECT_DIR}/`, `.claude/skills/` | `.agents/skills/`) and nothing else — the identity keeps the full `<skill>/scripts/<hook>.sh` tail; the test asserts non-hook keys and an unrelated hook are byte-identical

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a pause that produces no snapshot; an installer run that removes a hook it should keep; `validate.yml` red on README for a reason other than the count
- **Steps**: revert the offending phase's commit (each phase is one commit); `npm run bundle`; push
- **Validation**: `bash shared/resources/develop-pipeline-on-precompact.test.sh` green; `install-hooks.sh --dry-run` shows no removal; validate workflow green

### Partial Rollback (1–2 hours)

- **When to use**: only the badge step misbehaves on a consumer — revert Phase 3's `validate.yml` line and keep the generator's rewrite behind `--no-readme`

### Forward Fix

- **When to use**: the healer misses a third spelling — add it to `hook_identity`'s strip list with a fixture that carries it; never widen the strip without one

### Rollback Triggers

- **Critical**: a lost pause snapshot (resume impossible) — revert Phase 1 immediately
- **Non-critical**: badge or dedupe cosmetics — fix forward

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-16 | 1.0     | Initial draft — filed from task.110's finalise (obs #101; README badge drift) | create-task |
| 2026-09-16 | 1.1 | Review passed (9/10) — 3 Important + 5 Optional fixes applied: identity-based installer healer (retires unpatch_hook_exact loop), README.md in validate.yml triggers, argparse for generate_catalog.py, stale-claim sweep, re-pause semantics; ready for development | review-task |
| 2026-09-16 |  | Status → ready-for-development | review-task |
| 2026-09-16 |  | Implemented — 28 files (3 sources, 3 test suites, wizard mirror, 4 docs, CHANGELOG, bundled copies), 14 new tests (3 hook scenarios, 6 installer, 5 generator); every mechanism mutation-proven | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Atomic pause claim and a marked PR comment
- [x] `mv` claim; loser takes the noop path; EXIT trap on the claimed name; winner sweeps stale claims
- [x] Marked, find-then-edit PR comment
- [x] Concurrency and stale-claim tests

### Phase 2: Installer dedupes by identity and heals
- [x] `hook_identity()`; identity compare in `patch_hook`
- [x] Heal every other spelling of the same identity before adding; retire the `unpatch_hook_exact` loop
- [x] Both-spellings test; `package.json` glob

### Phase 3: The badge is generated
- [x] `generate_catalog.py` argparse CLI; badge rewrite (+ `--no-readme`, `--readme PATH`)
- [x] `validate.yml` diffs README and triggers on it; badge at 128
- [x] Generator test; bundle clean

---

## References

- Observation #101 — PreCompact pause hook appended its report block and posted its comments twice
- `docs/tasks/task.110.session-handoff-skill/task.110.implementation.1.session-handoff-skill-initial-run.md` — the deduplicated pause block (resumed 2026-09-15, third session)
- Commit `dd934a86` — the double-appended pause; PR #408 / issue #407 comments at 2026-09-15T18:25:53Z (×2 each)
- `shared/resources/develop-pipeline-pause.md` — pause/resume contract
- `docs/reference/anti-patterns.md` — the enumeration/drift class
- Project memory: `package.json` test globs are per-file — a new suite runs nowhere until added

---

## Notes

The 2026-09-16 hand fix to the local `.claude/settings.json` (duplicates removed, backup at `.claude/settings.json.bak-2026-09-16`) is the manual form of Phase 2; keep the backup until Phase 2's healer has been run against it.

**Implementation record (2026-09-16, `/develop` via the develop-task pipeline)**

- **Phase 1** — `develop-pipeline-on-precompact.sh`: the `[ -f "$LOCK" ]` check is now `mv "$LOCK" "$LOCK.pausing.$$"`; the loser takes the pre-existing `emit_empty` path; the winner sweeps other `.pausing.*` files and reassigns `LOCK` so every later read, the degraded `rm` and the EXIT trap address the claim (`SNAPSHOT`/`STATE_DIR` were derived before the reassignment and still point at the real state dir). The PR body opens with `<!-- agent-skills-comment:pipeline-paused-<step> -->`; the post is `gh pr view --json comments` → `gh api -X PATCH …/issues/comments/<id> -F body=@<file>` on a hit, `gh pr comment --body-file` on a miss, both through `tracker_write` with the same `TRACKER_WRITE_KIND`. The outcome string distinguishes `updated in place` from `posted`.
- **Phase 2** — `develop-pipeline-install-hooks.sh`: `hook_identity()` (strips `bash `, the quoted `${CLAUDE_PROJECT_DIR}/`, either skills root, the closing quote), `patch_hook` compares identities, `heal_hook` removes identity-equal/command-different entries via `unpatch_hook_exact` (which gained an optional label). The per-candidate `unpatch_hook_exact "bash ${c}/…"` loop is deleted. Verified against `.claude/settings.json.bak-2026-09-16`: the healer's output is byte-identical (after `jq -S`) to the hand-fixed live file. The wizard's inline copy in `scripts/setup-consumer.sh` got the same `_hook_identity` / `_heal_hook` (found because the static `#2e` protocol test names both files).
- **Phase 3** — `generate_catalog.py`: `argparse` with the two optional positionals, `--readme PATH`, `--no-readme`; `generate_catalog()` returns the total; `update_readme_badge()` rewrites only the `img.shields.io/badge/skills-<N>-` segment (anchored so prose is never touched), warns on a README without it, reports "already reads" without rewriting. `validate.yml` diffs `README.md` beside the catalog and lists it in both trigger path lists. Badge 126 → 128 by running the generator.
- **Tests** (all hermetic): hook suite 11 → 14 scenarios (concurrent ×2 with a sleeping `git` shim so the runs provably overlap; stale claim swept; marker → PATCH); new `develop-pipeline-install-hooks.test.sh` (6 scenarios) wired into `package.json`; new `tests/generate-catalog-badge.test.js` (5, incl. the CI no-diff check run locally against scratch copies). `install-hooks-behavior.test.mjs` (real installer, legacy-replacement) still green.
- **Mutation proofs** — each turned exactly the named test red and was restored from a `cp` snapshot: claim → `[ -f ]`+`cp` (concurrent: 2 report blocks); sweep dropped (stale claim survives); PATCH arm disabled (second `pr comment`); `hook_identity` = identity (3 entries/event); `bash ` no longer stripped (legacy form escapes); healer matches on tail only (different script collapsed); `update_readme_badge` call removed (3 generator tests); badge regex unanchored (prose rewritten, badge stale).
- **Gate** — `npm run ci:fast`: prettier clean, 3308/3309 pass (1 skipped, pre-existing); shellcheck clean on all 58 source shell files incl. the two new/changed suites; `bundle --check` 0 problems; `generate_catalog.py` + `git diff --quiet docs/reference/skill-catalog.md README.md` clean.
- **Timing** — hook 0.12–0.13 s (no PR/issue path), unchanged; generator 0.16 s with and without `--readme`.
- **Deferred** — none. Two static `#2e` assertions in `stall-and-cleanup-protocol.test.mjs` that pinned the retired loop by source text were re-pointed at the identity mechanism (and now assert the loop is *gone*).
