---
id: task.120
title: "[Task 120] The pause hook, the hook installer and the README badge each rely on a human remembering: make them idempotent, self-healing and generated"
type: task
description: "On task.110 the PreCompact pause hook ran twice in parallel — a local settings.json carried the same hook under two path spellings the installer's exact-string dedupe cannot see — and appended its report block line-for-line twice and posted its PR and issue comments twice (obs #101). The hook itself has no claim: two concurrent runs both see the lock. Separately, the README skills badge is a hand-typed number that generate_catalog.py never touches, one behind before task.110 and two behind after it. Three small mechanisms: an atomic pause claim and a marked PR comment in the hook, identity-based dedupe with a healer in the installer, and a badge the catalog generator writes so validate.yml's no-diff check owns it."
tags: [develop-task, develop-story, hooks, install-hooks, catalog, readme, drift]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-09-16
updated: 2026-09-16
assignee:
estimated_effort_hours: 8
github_issue: 409
---

# Technical Task: The pause hook, the hook installer and the README badge each rely on a human remembering

**Status:** Planned
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
append block >> $REPORT             # :128-157
tracker_write gh pr comment …       # :211, no marker
tracker-comment.js --stage pipeline-paused   # marker, but raced
git commit + push
```

Two processes started within the same second both pass the check; nothing between the check and the `rm` is exclusive.

**Installer** (`shared/resources/develop-pipeline-install-hooks.sh`): resolves one `BASE` from a candidate list (`.agents/skills/…` first, `.claude/skills/…` last, `:62-79`), then `patch_hook EVENT CMD` adds an entry unless `[.hooks[$event][]?.hooks[]?.command] | index($cmd)` finds the exact string (`:128`). `unpatch_hook EVENT PATTERN` (`:159`) removes entries whose command matches a jq regex — used once, to retire `on-skill-return.sh` (`:246`).

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

The loser's `mv` fails (`ENOENT`), it takes the existing "no lock" noop path, and nothing is written. The `last-halt.json` snapshot, the report block, the comments and the commit are each produced once.

**Installer**: `patch_hook` dedupes on the hook's **identity** — `<skill>/scripts/<hook>.sh` with the `.claude/skills/` or `.agents/skills/` prefix stripped — and, before adding, calls `unpatch_hook` with a pattern that matches the *other* spelling of the same hook, so a settings file carrying both converges on the one the resolver prefers.

**Badge**: `generate_catalog.py` gains a `--readme` step (on by default) that rewrites the `skills-\d+-` segment of the badge line in `README.md` to `total`. `validate.yml`'s existing catalog step regenerates and diffs `docs/reference/skill-catalog.md`; it extends its `git diff --quiet` to `README.md` (one path added to one line), so a stale badge fails CI the same way a stale catalog does.

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
- [ ] Replace the `[ -f "$LOCK" ]` check with `mv "$LOCK" "$LOCK.pausing.$$"`; on failure take the existing noop path; point every later read and the EXIT trap at the claimed name
- [ ] Prefix the PR body with `<!-- agent-skills-comment:pipeline-paused-{step} -->` and post find-by-marker → PATCH → else create (the `finalise` recipe), through `tracker_write` as now
- [ ] Test: two concurrent invocations with one lock → exactly one snapshot, one report block, one PR-comment call (stub `gh`), one tracker-comment call; the loser exits 0 with the empty signal
- [ ] Test: a stale `.pausing.*` file from a killed run does not block a fresh pause

**Dependencies**: none

### Phase 2: Installer dedupes by identity and heals

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-install-hooks.sh`
- `shared/resources/develop-pipeline-install-hooks.test.sh` (new)

**Changes**:
- [ ] `hook_identity()` — strip `${CLAUDE_PROJECT_DIR}/`, then `.claude/skills/` or `.agents/skills/`, from a command; `patch_hook` compares identities, not strings
- [ ] Before `patch_hook`, `unpatch_hook EVENT` with a pattern for the other prefix of the same `<skill>/scripts/<hook>.sh`, so both spellings converge on `$BASE`
- [ ] Test: a settings.json with both spellings for PreCompact and Stop → one entry each, other keys byte-identical; idempotent on a second run; `--dry-run` shows the prune
- [ ] Wire the test into `package.json` `scripts.test` (the glob lists per-file; a new suite runs nowhere until added — see project memory)

**Dependencies**: none (independent of Phase 1)

### Phase 3: The badge is generated

**Risk Level**: Low

**Files**:
- `skills/create-skill/scripts/generate_catalog.py`
- `README.md`
- `.github/workflows/validate.yml`
- a test under `tests/` or the generator's own `--check` path

**Changes**:
- [ ] After the catalog is written, rewrite `skills-\d+-` in the badge line of `README.md` to `total`; `--no-readme` opts out; print what changed
- [ ] `validate.yml` "Catalog up-to-date check": `git diff --quiet docs/reference/skill-catalog.md README.md`
- [ ] Bump the badge to 128 (the generator does it; commit the result)
- [ ] Test: a README with a stale count is rewritten; a README without the badge line is left untouched with a warning, never an error
- [ ] `npm run generate-catalog` and `npm run bundle` — no diff after

**Dependencies**: none

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-on-precompact.sh` — atomic claim; marked, idempotent PR comment
2. ✅ `shared/resources/develop-pipeline-install-hooks.sh` — identity dedupe; healer for the other spelling
3. ✅ `skills/create-skill/scripts/generate_catalog.py` — badge rewrite

### Files to Modify (Tests)

4. ✅ `shared/resources/develop-pipeline-on-precompact.test.sh` — concurrency and stale-claim cases
5. ✅ `shared/resources/develop-pipeline-install-hooks.test.sh` — new; both-spellings → one; idempotent
6. ✅ a generator test for the badge rewrite (Python, beside the existing catalog tests if any; else a `node --test` file under `tests/` that runs the script against a fixture README)
7. ✅ `package.json` — test globs for the new suites

### Files to Modify (Dependencies)

8. ✅ `.github/workflows/validate.yml` — diff `README.md` with the catalog

### Files to Modify (Documentation)

9. ✅ `README.md` — badge 126 → 128 (generated)
10. ✅ `shared/resources/develop-pipeline-pause.md` — the claim, one paragraph
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

- [ ] Two concurrent PreCompact invocations against one lock produce one snapshot, one report block, one PR comment and one issue comment; the loser exits 0 with the empty signal
- [ ] `install-hooks.sh` on a settings.json carrying `.claude/skills/…` and `.agents/skills/…` entries for the same hook ends with one entry per event, and is a no-op on the second run
- [ ] `generate_catalog.py` rewrites the README badge to the catalog count; `validate.yml` fails on a stale badge
- [ ] `README.md` badge reads 128 on the branch

### Performance

- [ ] The hook's wall-clock is unchanged within noise (one `mv` replaces one `test -f`)
- [ ] `generate_catalog.py` completes in the same time class (one extra small file rewrite)

### Code Quality

- [ ] Every new mechanism has a test that goes red when the mechanism is reverted (recorded as `covered` in the implementation report)
- [ ] `shellcheck` clean on both shell scripts; `bundle --check` clean; `prettier --check` clean
- [ ] The new test suites are listed in `package.json` `scripts.test`

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` cites `(task 120)`
- [ ] `develop-pipeline-pause.md` describes the claim; the resume contract is unchanged
- [ ] The local `.claude/settings.json` fix applied on 2026-09-16 (duplicates removed by hand) is reproduced by the installer's healer on a re-run — verified against a copy of the pre-fix file (`.claude/settings.json.bak-2026-09-16`)

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
3. **`unpatch_hook` pattern over-matches**
   - Risk: a jq regex that strips too much removes a consumer's unrelated hook
   - Mitigation: the pattern is anchored on `<skill>/scripts/<hook>.sh` with the specific prefix; the test asserts non-hook keys and unrelated hooks are byte-identical

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a pause that produces no snapshot; an installer run that removes a hook it should keep; `validate.yml` red on README for a reason other than the count
- **Steps**: revert the offending phase's commit (each phase is one commit); `npm run bundle`; push
- **Validation**: `bash shared/resources/develop-pipeline-on-precompact.test.sh` green; `install-hooks.sh --dry-run` shows no removal; validate workflow green

### Partial Rollback (1–2 hours)

- **When to use**: only the badge step misbehaves on a consumer — revert Phase 3's `validate.yml` line and keep the generator's rewrite behind `--no-readme`

### Forward Fix

- **When to use**: the healer's pattern misses a third spelling — add it to the identity strip list with a test; never widen the regex without one

### Rollback Triggers

- **Critical**: a lost pause snapshot (resume impossible) — revert Phase 1 immediately
- **Non-critical**: badge or dedupe cosmetics — fix forward

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-16 | 1.0     | Initial draft — filed from task.110's finalise (obs #101; README badge drift) | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Atomic pause claim and a marked PR comment
- [ ] `mv` claim; loser takes the noop path; EXIT trap on the claimed name
- [ ] Marked, find-then-edit PR comment
- [ ] Concurrency and stale-claim tests

### Phase 2: Installer dedupes by identity and heals
- [ ] `hook_identity()`; identity compare in `patch_hook`
- [ ] Heal the other spelling before adding
- [ ] Both-spellings test; `package.json` glob

### Phase 3: The badge is generated
- [ ] `generate_catalog.py` badge rewrite (+ `--no-readme`)
- [ ] `validate.yml` diffs README; badge at 128
- [ ] Generator test; bundle clean

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
