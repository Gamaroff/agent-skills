---
id: task.120.review.1
title: "Task Review Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering"
type: review
task-ref: task.120.hook-idempotence-and-badge-drift.md
reviewed: 2026-09-16
review_depth: standard
assessment: GOOD
readiness_score: 9
recommendation: READY TO IMPLEMENT
---

# Task Review Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering

**Reviewed:** 2026-09-16
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 recommendations (3 Important, 5 Optional) implemented in the task and plan files — 2026-09-16

---

## Executive Summary

The task is well-evidenced — every factual claim in Motivation was re-verified against the tree and git history (commit `dd934a86` adds the pause block twice in 64 insertions; `README.md:5` reads `skills-126` against 128 skills, last bumped 2026-09-09 in `d955f01f`; issue #409 exists, open, with the milestone and labels the task expects). The three mechanisms are the right shape and each has a mutation-proven test. Three Important gaps are all in the *how*, not the *what*: Phase 2 does not know about the healer the installer already has, Phase 3's CI change is one line short of actually triggering, and the generator's CLI has no flag parsing to hang `--no-readme` on.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT (after the three Important fixes below, which are document edits)

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.120.hook-idempotence-and-badge-drift
  - Base:       develop
  - Epic branch:N/A
  - Auto-skip:  false
```

Pre-pass (Phase 1.5): both Explore agents returned within 25 s.
- **PREPASS_B** — `alignment: aligned`; two `low` findings. One (validate.yml path filter) is promoted to Important below. The other (generator test placement under top-level `tests/`) is dismissed — `tests/*.test.js` is an established location already in the `npm test` glob, and `tests/bundle-*.test.js` already exercise Python scripts from there.
- **PREPASS_C** — `implementation_status: not-implemented`; all five symbols absent. No scope-down question warranted.

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: Phase 2 omits that the installer already has a healer loop (`unpatch_hook_exact`, `install-hooks.sh:193`, called at `:237-240`) which strips the legacy bare-relative spelling for every candidate base. The duplicate that survived on task.110 was the `${CLAUDE_PROJECT_DIR}`-quoted `.claude/skills/` form, which that loop does not cover. How should Phase 2 heal?**
- **User Decision**: Identity: same id, different command. `hook_identity()` as planned, but the healer removes every entry whose identity equals the new hook's and whose command differs from `$cmd` — no per-prefix regex, no escaping; subsumes the existing `unpatch_hook_exact` loop, which can be retired.
- **Impact**: Phase 2's plan replaces `heal_hook`'s other-prefix regex with an identity-equal/command-differs rule; the `unpatch_hook_exact` loop at `:237-240` is retired in the same change (its legacy bare-relative form is one more spelling of the same identity). Technical Background gains the missing sentence about `unpatch_hook_exact`.

**Q2: `validate.yml` is path-filtered (`on.pull_request.paths` / `on.push.paths`) and does not list `README.md`. With only the diff line widened, a hand-edit of the badge triggers no workflow at all — the gap the file's own comment describes for `skill-dependencies.json`. Add `README.md` to both trigger lists?**
- **User Decision**: Yes, add `README.md` to both triggers.
- **Impact**: Phase 3 touches three lines of `validate.yml`, not one; the task's "one path added to one line" wording is corrected.

**Q3: `generate_catalog.py` takes positional args only (`main()` at `:218-223`). Phase 3 adds `--no-readme` and `--readme PATH`. How should the CLI evolve?**
- **User Decision**: argparse, positionals kept — both positionals optional, plus the two flags. `npm run generate-catalog` and validate.yml unchanged.
- **Impact**: Phase 3 gains an explicit "switch `main()` to argparse" change; the test can pass `--readme <fixture>` without disturbing the positional callers.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory numbered sections present, plus Change Log, Progress Tracking, References and Notes. Filename `task.120.hook-idempotence-and-badge-drift.md` follows the dots convention. No placeholders. Frontmatter: `type: task`, `description`, `tags` list, `status: planned` ↔ `**Status:** Planned` consistent, `priority: Medium`, `risk_level: low`, `estimated_effort_hours: 8`, `github_issue: 409`.

- **OKF**: conformant (`type` present, `description` present, `tags` a list).
- **Sign-off**: not enabled in `skills-config.yaml` — not checked.
- **Change Log**: present, one row at 1.0; status is `planned`, so currency holds.
- **Tracker linkage**: `github_issue: 409` verified open (`[Task 120] …`, milestone `Technical Tasks (standalone)`, labels `task`, `priority:medium`); body link `[#409](…/issues/409)` matches. Board Priority self-heal ran (P2).
- **Card preflight**: `--check-card` exit 0, no findings. Card omissions for the reader's information: Summary `+4` sentences, Success Criteria `+7` criteria, Breaking Changes `+2` sentences beyond the card caps.
- **Effort rubric**: 12 criteria, 13 plan checkboxes, 12 files, low risk, integration keywords present → 13h → snaps to 16h. Frontmatter 8h; divergence 0.5, at the threshold, not over it. No finding.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every cited mechanism exists as described: `[ ! -f "$LOCK" ]` at `on-precompact.sh:84`, `trap` at `:99`, bare `tracker_write gh pr comment` at `:211`, the issue arm through `tracker-comment.js` with stage `pipeline-paused-${CURRENT_STEP}` (`:255-257`); `patch_hook`'s `index($cmd)` at `install-hooks.sh:128`, `unpatch_hook` at `:159`, its one call at `:246`; `total` at `generate_catalog.py:214`; the catalog step at `validate.yml:72-80`. The marker family (`<!-- agent-skills-comment:<stage> -->`, `tracker-comment.js:280`) and the `finalise` find-then-edit recipe (`finalise/SKILL.md:1312-1320`) are what the task says they are, and the plan puts the marker *before* the lead, which is the lesson `finalise` records at `:1298-1301`. `on-stop.sh:64-66` does read the lock, so Medium Risk 1 is real and its assessment is right. `tracker_write` records any `gh …` argv generically when deferred, so the PATCH arm needs no gate change.

### Issues

#### Important
- **The installer's existing healer is missing from Technical Background** — `unpatch_hook_exact` (`install-hooks.sh:193`) already loops every candidate base (`:237-240`) to strip the legacy bare-relative spelling. It is the healer whose blind spot caused the task: the duplicate was the `${CLAUDE_PROJECT_DIR}`-quoted form (`.claude/settings.json.bak-2026-09-16`), which an exact match on the bare form cannot see. A plan that adds `heal_hook` beside it ships two healers for one problem.
  - **Location:** §3 Technical Background → Installer; plan Phase 2
  - **Recommendation:** _Per Q1_ — dedupe and heal on identity: `patch_hook` skips when an existing entry has the same identity; before adding, remove every entry with the same identity and a different command. Retire the `unpatch_hook_exact` loop (its legacy form is one more spelling of the identity). Name `unpatch_hook_exact` in Technical Background.

#### Optional
- **Line anchors drifted by a few lines** — the `jq -r … "$LOCK"` reads are at `:119-121` (task says `:116-125`), the degraded `rm -f "$LOCK"` at `:127` (task `:125`), the report append at `:130-157` (task `:128-157`), the PR-comment region `:200-226` (plan `:200-224`). Every path and claim is right; the coordinates moved.
  - **Recommendation:** correct the four numbers.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Phases are one-file mechanisms with named files, checkboxed changes, risk levels, explicit independence and a mutation per test. A developer can follow them without guesswork except at the two points below.

### Issues

#### Important
- **`validate.yml` change is one line short** — the workflow is path-filtered; `on.pull_request.paths` and `on.push.paths` (`validate.yml:3-30`) do not list `README.md`. Widening `git diff --quiet` alone means a stale badge is caught only on the next PR that happens to touch `skills/**`; a hand-edit of the badge triggers nothing. The file's own comment on `skill-dependencies.json` (`:8-10`) states the rule.
  - **Location:** §3 Target Architecture → Badge ("one path added to one line"); Phase 3 changes; plan Phase 3
  - **Recommendation:** _Per Q2_ — add `README.md` to both trigger lists; reword to "three lines".
- **`generate_catalog.py` has no flag parsing** — `main()` reads `sys.argv[1]`/`[2]` positionally (`:218-223`). `--no-readme` / `--readme PATH` would be read as the skills dir.
  - **Location:** Phase 3 changes; plan Phase 3
  - **Recommendation:** _Per Q3_ — switch `main()` to argparse with both positionals optional (defaults unchanged) plus `--no-readme` and `--readme PATH`; `npm run generate-catalog` and the CI step keep working unmodified.

#### Optional
- **Files Summary item 7 over-states the `package.json` change** — only the new shell suite needs adding to the `bash …` chain; `tests/*.test.js` is already a glob, so `tests/generate-catalog-badge.test.js` runs without a `package.json` edit.
  - **Recommendation:** "the new shell suite" rather than "the new suites".
- **Stale `.pausing.*` claims accumulate** — the plan says a stale claim never *blocks* a pause (true, `$$` makes the name unique) but nothing removes one. Only the winner of the claim can safely sweep: after `mv` succeeds, remove every `"$LOCK".pausing.*` other than `$CLAIM` — the losers exit before this point and never own a file, so anything else there is a dead run's.
  - **Recommendation:** add the sweep to Phase 1 and a line to the stale-claim test asserting the stale file is gone afterwards.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Overview ↔ phases ↔ Files Summary ↔ Success Criteria ↔ Progress Tracking all name the same three mechanisms and the same files. Testing Strategy names a mutation per mechanism and the CI step run locally. Out of Scope is explicit about the Stop hook, the pause content, the historical comments and task.110's follow-ups. Three independent phases at 8h is an appropriate size; no split.

### Issues

#### Optional
- **Same-step re-pause semantics differ between the two comment arms** — with the marker, a second pause at the same step **edits** the earlier PR comment in place (finalise recipe), while the issue arm via `tracker-comment.js` reports `already` and posts nothing. Both are fine; the report keeps every pause. The `develop-pipeline-pause.md` paragraph should say which happens where so the trail is not misread.
- **`gh pr view --json comments` is a partial read** — `tracker-comment.js:399-420` moved its own marker search to `gh api --paginate` because `--json comments` has no paging. `finalise` still uses the partial read and the PR is busy only in pathological cases; acceptable, but the plan could name the trade-off.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium Risk 1 (the Stop hook sees no lock during the claim window) is verified real (`on-stop.sh:64`) and correctly assessed as the intended end state. Low Risk 3 (over-matching `unpatch_hook` regex) disappears under the Q1 design — identity equality and exact-command inequality need no regex. Rollback is per-phase, one commit each, with concrete validation commands and named triggers.

### Issues

None. Low Risk 3 can be reworded to the identity design (Optional, folded into the Q1 fix).

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues

1. **Phase 2 heals on identity, not on the other prefix** — remove every entry with the same identity and a different command; retire the `unpatch_hook_exact` loop; name it in Technical Background. _Per Q1_
2. **Add `README.md` to `validate.yml`'s `pull_request.paths` and `push.paths`** — the diff line alone does not trigger. _Per Q2_
3. **Switch `generate_catalog.py` `main()` to argparse** — positionals kept, `--no-readme` / `--readme PATH` added. _Per Q3_

### Consider (Optional) - 5 items

1. Correct the four drifted line anchors.
2. "the new shell suite" in Files Summary item 7.
3. Winner sweeps stale `.pausing.*` after the claim; test asserts it.
4. Document the same-step re-pause semantics (PR edit vs issue `already`) in `develop-pipeline-pause.md`.
5. Name the partial-read trade-off of `gh pr view --json comments`.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 10/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No Critical findings; the three Important ones are design refinements the user has already decided and which land as document edits before development starts.

---

## Next Steps

Task is ready for implementation once the three Important fixes are applied to the document. Developer should:

1. Follow the plan phase by phase — three independent phases, one commit each
2. Edit `shared/resources/` sources only, then `npm run bundle`
3. Run the named mutation for each mechanism and record `covered` in the implementation report
4. Refer to the rollback plan if a pause loses its snapshot

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-09-16
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.120.hook-idempotence-and-badge-drift/task.120.hook-idempotence-and-badge-drift.md`
- **Plan File:** `docs/tasks/task.120.hook-idempotence-and-badge-drift/task.120.plan.hook-idempotence-and-badge-drift.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md` (via pre-pass Agent B)
- **Sources Verified In-line:** `shared/resources/develop-pipeline-on-precompact.sh`, `develop-pipeline-install-hooks.sh`, `develop-pipeline-on-stop.sh`, `tracker-comment.js`, `resolve-platform.sh` (`tracker_write`), `skills/create-skill/scripts/generate_catalog.py`, `.github/workflows/validate.yml`, `README.md`, `package.json`, `skills/finalise/SKILL.md`, `.claude/settings.json` + `.bak-2026-09-16`, git history (`dd934a86`, `d955f01f`)
