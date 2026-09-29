---
id: task.126
title: "[Task 126] Citing a hub shared resource bundles its whole transitive closure, and a new generated copy is only a warning at commit time: a non-transitive citation form, a per-skill closure count, and a pre-commit that fails on an untracked references/ file"
type: task
description: "bundle_skill.py follows every shared/resources/X mention recursively with no notion of cite vs depend: a one-line pointer from qa-fix, review-task and review-story to develop-pipeline-autonomous-defaults.md pulled 15–16 files each into skills that read none of them (task.116, ~48 generated files whose only relationship to the change is a sentence). And when a bundle run generates a new untracked references/ copy, the pre-commit hook prints an advisory and lets the commit through; bundle:check then fails in CI a push later (task.99). Give the bundler a citation form that copies one file, print the transitive count per skill on every run so growth is visible when it is caused, and make the pre-commit fail — not warn — on a new untracked generated copy. Observations #83, #114 (mechanism half)."
tags: [create-skill, bundler, pre-commit]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-17
updated: 2026-09-29
assignee:
estimated_effort_hours: 8
github_issue: 426
---

# Technical Task: Citing a hub shared resource bundles its whole transitive closure

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.126.review.1.bundler-citation-form.md` implemented 2026-09-29
**GitHub Issue**: [#426](https://github.com/Gamaroff/agent-skills/issues/426)

---

## 1. Overview

The bundler's discovery is transitive by design — a skill that depends on `jira-sync.js` needs
`change-log.js` too — but it has one edge type, so a *citation* ("the rule is in §Subagents of that
document") costs the same as a *dependency*. Hub documents (the autonomous-defaults doc, the resume
contract) carry large closures, and every skill that points at them for one paragraph inherits the
lot. Separately, the moment the tree gains a generated copy that is not tracked, the pre-commit says
so and proceeds; CI catches it a push later. This task adds a one-file citation form, makes closure
growth visible per skill at bundle time, and turns the pre-commit advisory into a refusal.

**Scope**: `bundle_skill.py` (discovery + reporting), `package_skill.py` (shares the rules), the
pre-commit bundler hook, `create-skill` SKILL.md and AGENTS.md § Shared Resources (the authoring
rule staged on 2026-09-17 is the prose half; this is the mechanism half).

## 2. Motivation

### Current Problems

1. **A citation costs a closure.** On task.116 a one-line pointer to
   `references/develop-pipeline-autonomous-defaults.md` from `qa-fix`, `review-task` and
   `review-story` copied 15–16 files into each — lite-mode, resume-contract, step-7-finalise,
   `gh-stage.js`, `jira-stage.js`, `handover-*.js`, `tracker-issue.js` — none read by the pointing
   skill. ~48 generated files in the PR whose only relationship to the change was a sentence (#83).
2. **Authors respond by not citing.** The alternative to inheriting a closure is restating the rule
   — the drift the one-source rule exists to prevent — or splitting hub documents file-per-section,
   which is its own drift risk.
3. **Growth is invisible at the moment it is caused.** `bundle_skill.py` prints ✅ per skill; the
   closure size shows up in `git status` after the fact.
4. **A new untracked generated copy is advisory at commit time.** The pre-commit prints
   "pre-existing bundle changes left unstaged" and proceeds; `bundle:check` fails in CI on the next
   push (#114, task.99 — one QA cycle cost a second push).

### Benefits

1. Citing a rule pulls one file; depending on a script pulls its closure. Authors point instead of restating.
2. The per-skill count on every bundle run makes a closure jump a number in the output, not a surprise in the diff.
3. A commit cannot leave the tree in a state `bundle:check` will reject.
4. Two observations close (the prose half of #114 is staged separately).

## 3. Technical Background

### Current Architecture

```
discover_needed: shared/resources/X (everywhere) + references/X (skill files) → pending, transitively
                 every match is a dependency edge
bundle_skill:    prints "✅ <skill>: bundled N" — N is the write count, not the closure delta
pre-commit hook: runs the bundler; new untracked references/ file → advisory line; commit proceeds
```

### Target Architecture

```
citation form:   a reference to an `.md` target carrying a `#fragment` — in EITHER spelling,
                 `shared/resources/X.md#anchor` or its in-place-rewritten form `references/X.md#anchor` —
                 or a mention inside `<!-- cite: shared/resources/X.md -->` / `<!-- cite: references/X.md -->`,
                 copies X ALONE: X's own outbound refs (shared, sibling and invocation edges) are not
                 followed from a citation edge. A bare mention remains a dependency edge. A cite of a
                 non-`.md` target (`.js`/`.mjs`/`.sh`/`.json`) is treated as a dependency — a script
                 copied without its runtime siblings is broken, so the fail-safe reading wins.
fragment strip:  the `#fragment` is never part of the bundled name. ONE parser (name + kind) serves
                 `quick_validate.collect_shared_refs`, `bundle_skill.shared_refs_with_lines` and the
                 `REFS_REF_RE` seed in `discover_needed`; today the first two capture `X.md#anchor` as the
                 filename and report the source missing (validate:all FAILS, the bundler warns).
discover_needed: two edge kinds; the closure is computed over dependency edges only; cited files are
                 added as leaves; a name reached both ways is bundled once, with its closure.
                 Reported per skill by extending today's status line:
                 "✅ <skill>: <status> · closure M (+K vs committed)".
dropped copies:  the bundler never deletes a copy (task.122 keeps and refreshes source-backed copies
                 nothing reaches, and `--check` reports each as UNREACHED). Copies a conversion stops
                 reaching are removed with `git rm` in the same commit, or `bundle:check` fails in CI.
pre-commit hook: `.githooks/pre-commit` already stages the copies its own bundle run creates (the NEW
                 set). Add: an UNTRACKED path in the pre-existing-dirty set (LEFT) → print the paths and
                 EXIT 1 with the remedy (`git add` them, or remove the citation that produced them).
                 Advisory only under an explicit BUNDLE_PRECOMMIT_WARN=1. Pathspec
                 'skills/*/references/*' — the form without the trailing `*` matches nothing.
```

### Important Clarifications

- **The citation form must be something authors already write.** A fragment link
  (`shared/resources/X.md#subagents`) is the natural way to point at a section, so it needs no new
  syntax to learn; the HTML comment form is for a bare mention with no anchor. Both are followed
  one level and stop.
- **A cited file's own citations are not followed either.** A citation is a leaf by definition;
  if a cited file *needs* something to be read, that is a dependency and the author of that file
  writes it as one.
- **Refusing the commit is the fail-closed direction** the repo's traps doc already argues for
  (`bundle:check` in CI is the same rule one push later). The escape hatch is an env var, not a flag
  in the hook's default path.
- **This task does not change `source_backed_on_disk` or `--check` classes** — that is task.122,
  independent. It *relies* on them: a copy the conversion stops reaching is reported `UNREACHED`
  until it is deleted, which is the check that proves the conversion removed what it claims.
- **A skill file only ever holds the `references/` spelling.** The bundler rewrites
  `shared/resources/X` to `references/X` in place in every skill `.md`/`.js`, so the three pointer
  sites read `references/develop-pipeline-autonomous-defaults.md` today and are seeded through
  `REFS_REF_RE`, not `SHARED_REF_RE`. A citation form detected only on `shared/resources/X#…` would
  convert nothing in Phase 3. The same rewrite turns `<!-- cite: shared/resources/X -->` into
  `<!-- cite: references/X -->` in skill files and in every bundled copy, so both prefixes are the
  comment form.
- **The pointer's anchor is the heading's real slug.** The hub's heading is
  `## Subagents — unavailable, failed, slow`, slug `subagents--unavailable-failed-slow`; `#subagents`
  names no heading. Inside a code span no link checker reads it, but a markdown link is checked.
- **Measured baseline (2026-09-29, `develop` `f7ca1985`).** Closure = `len(needed)` from
  `discover_needed`; "hub as leaf" = the same call with the hub's own text not followed. qa-fix
  37 → 21 (−16), review-task 45 → 27 (−18), review-story 46 → 29 (−17). No file dropped is one the
  skill reaches directly: `qa-cycle.sh`, `stakeholder-summary-cli.js` (qa-fix) and
  `advance-pipeline-lock.sh` (review-story) are seeded from the skill's own `SKILL.md` and stay.
  The test that lands records the numbers; this is the definition to re-measure them by.

## 4. Scope

### In Scope

✅ Two edge kinds in `discover_needed`, with the citation forms above, detected on both the
   `shared/resources/` and the `references/` spelling; `package_skill.py` and `quick_validate.py`
   use the same parser (no second definition — there are three regex copies today: `SHARED_REF_RE`,
   `SHARED_REF_LINE_RE`, and the inline pattern in `quick_validate.collect_shared_refs`).
✅ The `#fragment` is stripped from every bundled name, so `validate:all` passes on the citation form.
✅ Per-skill closure reporting on every bundle run.
✅ Pre-commit refusal on an untracked generated copy left in the tree, with the env-var escape hatch.
✅ Tests: citation copies one file; dependency still copies the closure; nested citation is a leaf;
   a `.js` cite is a dependency; pre-commit refuses (node test driving the hook in a fixture repo).
✅ `create-skill` SKILL.md: the citation form beside the 2026-09-17 authoring rule; AGENTS.md § Shared Resources one sentence.
✅ Convert the three task.116 pointers to the citation form, `npm run bundle`, and `git rm` the copies
   the three skills no longer reach; confirm the closure shrinks and `bundle:check` reports no `UNREACHED`.

### Out of Scope

❌ Splitting hub documents (option (b) in #83).
❌ Following `references/X` out of shared text (see task.122's rationale).
❌ The `UNREACHED` class — task.122.

## 5. Breaking Changes

None to consumers. Authors: a fragment reference to an `.md` target now bundles one file. Today no
bundled source uses one — measured 2026-09-29, every `shared/resources/X#…` hit is in `docs/tasks/`
or a test fixture, and no skill file carries `references/X.md#…` — and the bundler currently reads
such a reference as a missing file. So nothing that bundles today changes meaning; verify by
bundling before and after Phase 1 and diffing.

## 6. Implementation Plan

> Detailed implementation guide: [task.126.plan.bundler-citation-form.md](task.126.plan.bundler-citation-form.md)

### Phase 1: Citation edges (#83)

**Risk Level**: Medium

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/scripts/quick_validate.py`, `skills/create-skill/scripts/package_skill.py`, `tests/bundle-citation.test.js` (new), `tests/bundle-missing-source.test.js`

**Changes**:
- [x] One parser returns `(name, kind)` with `kind ∈ {dep, cite}` and the `#fragment` stripped from `name`. It lives in `quick_validate.py` beside `collect_shared_refs`, which `bundle_skill.py` and `package_skill.py` already import from. `collect_shared_refs` and `shared_refs_with_lines` become thin views of it, so the parity test `bundle-missing-source.test.js` §1d still holds, and the three regex copies collapse to one.
- [x] `kind = 'cite'` for an `.md` target carrying a `#fragment`, or for a mention inside `<!-- cite: … -->`, in **both** spellings (`shared/resources/X` and `references/X`). Any other target, and any bare mention, is `dep`.
- [x] `discover_needed`: the `REFS_REF_RE` seed from skill files classifies kind too, because that is the spelling every skill file carries after bundling. `pending` entries carry `(name, origin, kind)`, and `pending_quiet` carries `(name, kind)`. Popping a `cite` adds the name to `needed` and reads nothing out of it: no shared, sibling or invocation edges. Popping a `dep` behaves as today. `seen` records the strongest kind reached, so a name first reached as `cite` and later as `dep` is re-processed as `dep`.
- [x] `bundle_skill` status line: append ` · closure M (+K vs committed)` to today's `✅ <skill>: <status>`. `M = len(needed)`. `K` is `M` minus the tracked `references/` files that are source-backed. Take the tracked set from **one** `git ls-files` call per run, not one per skill.
- [x] Tests (fixture pattern of `tests/bundle-check-mode.test.js`) cover five cases:
  - skill A cites `shared/resources/hub.md#rule` → gets `hub.md` only;
  - skill B names `shared/resources/hub.md` → gets hub + closure;
  - skill C cites hub and depends on a leaf → gets hub + that leaf;
  - skill D cites `references/hub.md#rule` → gets hub only;
  - skill E cites `shared/resources/tool.js#x` → treated as a dependency (gets tool.js + its siblings).
  - Plus: `quick_validate` passes on a fragment reference, and a mutation proof for each test.

**Dependencies**: none.

### Phase 2: Pre-commit refusal (#114)

**Risk Level**: Low

**Files**: `.githooks/pre-commit` (the repo's `core.hooksPath` is `.githooks`), `tests/pre-commit-hook.test.js` (new), `docs/contributing/traps.md`

**Changes**:
- [x] The hook already stages the copies its own bundle run creates (the `NEW` set, `comm -13 PRE POST`), so those are not the problem. The problem is an **untracked** path in the pre-existing set (`LEFT`, `comm -12 PRE POST`). Today it is only warned about; this is task.99's case, where a manual `npm run bundle` ran before the commit. Intersect `LEFT` with `git ls-files --others --exclude-standard -- 'skills/*/references/*'`. If the result is non-empty, print the paths and exit 1 with the two remedies. Keep the trailing `*`: without it the pathspec matches nothing, and the refusal would be silently inert. The hook's own comment records that trap.
- [x] `BUNDLE_PRECOMMIT_WARN=1` restores today's warning.
- [x] A node test (so the `tests/*.test.js` glob in `npm test` runs it; a new `*.test.sh` runs nowhere until someone hand-adds it to the `test` script) drives the hook in a fixture git repo. Cases:
  - an untracked generated copy left in the tree, then commit a `SKILL.md` change → exit 1, naming the path;
  - `git add` the copy → exit 0;
  - `BUNDLE_PRECOMMIT_WARN=1` → exit 0 with the warning;
  - a copy the run itself creates is staged, not refused.

**Dependencies**: none.

### Phase 3: Authoring surface

**Risk Level**: Low

**Files**: `skills/create-skill/SKILL.md`, `AGENTS.md`, `skills/{qa-fix,review-task,review-story}/SKILL.md`, the dropped `skills/{qa-fix,review-task,review-story}/references/` copies

**Changes**:
- [x] Document the citation form beside the "literal is a bundling instruction" rule, and name when each is right. Cite a document you point a reader at. Depend on one whose procedure the skill executes.
- [x] Convert the three pointers (`references/develop-pipeline-autonomous-defaults.md` §Subagents) to `references/develop-pipeline-autonomous-defaults.md#subagents--unavailable-failed-slow`, then run `npm run bundle`.
- [x] `git rm` the copies each skill no longer reaches: exactly the set the bundle run's `--check` reports `UNREACHED` for these three skills. The bundler never deletes a copy. The expected sets are measured in §3 Important Clarifications (16 / 18 / 17 files). A difference between the two sets is a finding to explain, not a list to adopt.
- [x] `bundle:check` reports no `UNREACHED`. Record `git diff --stat` in the implementation report.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/quick_validate.py` — the one parser (name + kind, fragment stripped)
2. ✅ `skills/create-skill/scripts/bundle_skill.py` — edge kinds in `discover_needed`, `REFS_REF_RE` seed, reporting
3. ✅ `skills/create-skill/scripts/package_skill.py` — **no edit needed**: it already imports `collect_shared_refs`, which is now a view of the shared parser, so it strips the fragment through that import (held by `bundle-citation.test.js` K)
4. ✅ `.githooks/pre-commit` — refuse an untracked generated copy

### Files to Modify (Tests)

5. ✅ `tests/bundle-citation.test.js` (new) — the five edge cases and the `quick_validate` case
6. ✅ `tests/bundle-missing-source.test.js` — §1d parity kept green over fragment inputs
7. ✅ `tests/pre-commit-hook.test.js` (new) — the hook in a fixture repo

### Files to Modify (Documentation)

8. ✅ `skills/create-skill/SKILL.md`, `AGENTS.md`, `docs/contributing/traps.md`
9. ✅ `skills/{qa-fix,review-task,review-story}/SKILL.md` — pointer form

### Files to Delete

The `references/` copies the three converted skills no longer reach, removed with `git rm` in the same
commit as the conversion. The bundler does not delete them (it keeps and refreshes every
source-backed copy on disk), and `bundle:check` reports each as `UNREACHED` until they are gone.

## 8. Testing Strategy

### Unit Tests
- [x] Citation (both spellings) → one file; dependency → closure; cited file's own refs not followed; a file reached both ways is bundled once with its closure; a `.js` cite is a dependency.
- [x] Fragment stripped: `collect_shared_refs`, `shared_refs_with_lines` and the `REFS_REF_RE` seed name `X.md`, not `X.md#anchor`; `quick_validate` passes on a fragment reference.
- [x] Reporting line format.

**Command**: `node --test tests/bundle-*.test.js tests/pre-commit-hook.test.js`

### Integration Tests
- [x] Full `npm run bundle` on the converted tree, dropped copies `git rm`'d: each of the three skills loses ≥ 12 files; `bundle:check` green with no `UNREACHED`; `validate:all` green; `bundled-links.test.js` green.
- [x] Hook test (node, fixture repo).

### Contract Tests
- [x] One definition of the ref parse — held **behaviourally**, not by an import assertion: §1d (`bundle-missing-source.test.js`) and test K (`bundle-citation.test.js`) fail when either consumer parses differently. `bundle_skill.SHARED_REF_RE` stays by design: it is the *rewrite* regex (`rewrite_text` must keep the fragment in the rewritten text), not a second parse.

### Performance Tests
- [x] `--all` wall time within noise — measured 2026-09-29, 3 runs each: develop 4.86/5.00/5.01 s, branch 4.61/4.63/4.61 s (`--check`: 4.65–4.77 s → 4.34–4.38 s). Faster, because the three skills bundle 51 fewer files.

### Consumer Tests
- [x] `setup-consumer.sh` tarball of `qa-fix` still runs its documented steps (nothing it reads was dropped). **Not run as a tarball install.** Checked statically instead: no file left in any of the three skills names a removed copy by `references/<name>` or `.agents/skills/<skill>/references/<name>`, apart from the cited hub copy itself. The cited §Subagents section's one dependency (`read-config.sh`) still ships in all three. QA cycle 1 accepted this as equivalent evidence (`task.126.qa.1`, Success Criteria table: "PASS (equivalent evidence)"). `setup-consumer.sh` configures credentials; it does not install skills.

## 9. Success Criteria

### Functional
- [x] A fragment reference to an `.md` target, in either spelling, bundles exactly one file.
- [x] After conversion, each of the three task.116 pointer sites contributes exactly one file (the hub document) to its skill's closure. Measured as §3 defines closure, with a ≥ 12-file drop per skill. The 2026-09-29 baseline predicts qa-fix 37 → 21, review-task 45 → 27, review-story 46 → 29.
- [x] `bundle:check` reports no `UNREACHED` for the three skills, and `validate:all` passes.
- [x] A commit that leaves an untracked generated copy in the tree is refused by default.

### Performance
- [x] No measurable change to bundle time.

### Code Quality
- [x] One definition of the edge rules; mutation proofs recorded for each test.

### Migration
- [x] Observations #83, #114 close naming the PR — both set `actioned` on 2026-09-29, resolution naming PR #524 (merge pending in the same /develop-next run).

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **A cite drops a file a skill reads at runtime.** A cite is a leaf, so anything only the cited
   document reaches leaves the skill. Mitigation: bundle the tree before and after Phase 3 and diff.
   For each dropped file, confirm no file of the skill names it: grep the skill outside
   `references/`. The 2026-09-29 measurement found none for the three sites. Any file that
   disappears from a skill that reads it is converted back to a bare mention. Record the list in the
   implementation report. Non-`.md` cites are dependencies by rule, so a script is never copied
   without its siblings.

### Low Risk
1. The hook refusal surprises a contributor — the message carries both remedies and the env var.
2. A shared checkout holds another session's untracked copy. The refusal names it, and `BUNDLE_PRECOMMIT_WARN=1` or `git add` clears it.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: a consumer skill lost a file it reads; the hook blocks unrelated commits.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: `bundle:check` and `bundled-links` green.

### Partial Rollback (1–2 hours)
- Revert Phase 3's conversions only (edges stay; closures return).

### Forward Fix
- Add a missing citation form; adjust the report line.

### Rollback Triggers
- **Critical**: a skill loses a file it invokes.
- **Non-critical**: message wording.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-29
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.126.qa.3.bundler-citation-form.md](./task.126.qa.3.bundler-citation-form.md)
- **Gate File**: [task.126.gate.3.bundler-citation-form.yml](./task.126.gate.3.bundler-citation-form.yml)

### Test Coverage Summary
- **Tests Executed**: 25 (hook + citation), within the 133-test bundler/link/hook/parity set; fast gate 4537/4538
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Both cycle-2 findings are fixed and mutation-proven.
- Advisory: an unreachable fallback and stale comments in `expected_bytes` (CR-1); `revert_new`'s tracked-copy branch has no test (CR-2).

## Definition of Done - Gaps Identified

**Status:** IN PROGRESS (the document stays `ready-for-review`)

### QA Gate Status

**QA Report**: `task.126.qa.3.bundler-citation-form.md`
**Gate File**: `task.126.gate.3.bundler-citation-form.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR review (5c)**: ✅ APPROVE — `task.126.pr-review.1.bundler-citation-form.md`
**CI reading 1**: ✅ SUCCESS @ `4654c4870290` (5 checks)

### Missing Criteria:

1. **Acceptance Criteria:**
   - [ ] AC5 "No measurable change to bundle time" has no automated test. The evidence is a measurement re-executed at finalise: the branch is faster than develop on `--all` and `--check`. A human decides whether to waive, or to reword the criterion to the per-PR 10 s budget in `tests/bundle-missing-source.test.js`.

2. **Security Review:**
   - [ ] The pre-commit refusal is a boundary, and the probe engine cannot execute it: no entry form materialises a git-repository fixture (`probes_executed: 0`, severity low). A human decides whether to record the fixture-repo tests (10 cases, 7 mutations) as adequate evidence, or to open a tooling task for a git-fixture probe form.

### Next Steps:

- [ ] Decide AC5: waive with the measured evidence, or reword it to the enforced per-PR budget
- [ ] Decide the security finding: record the fixture-test judgement, or open the probe-engine tooling task
- [ ] Re-run `/finalise`

**Estimated Effort:** Small, if decided by waiver or rewording.

**Gap Report Generated:** 2026-09-29

**Detailed Verification Log:** see `task.126.dod.1.bundler-citation-form.md` for the complete verification evidence and timestamps.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #83, #114) | create-task |
| 2026-09-29 | 1.1 | Review 4/10 → 8/10 after fixes — cite detected on the `references/` spelling; one fragment-stripping parser in quick_validate.py; `git rm` of UNREACHED copies; hook refusal on untracked ∩ LEFT with a working pathspec; measured closure criteria; node hook test | review-task |
| 2026-09-29 |  | Status → ready-for-development | review-task |
| 2026-09-29 |  | Implemented phases 1–3 (inline, develop-task Step 3): one parser with edge kinds, closure status line, hook refusal, three pointers cited, 51 unreached copies removed; status → ready-for-review | develop |
| 2026-09-29 |  | QA gate CONCERNS (90/100) — 1 finding (CR-1, hook over-refuses skill-native files) | qa-task |
| 2026-09-29 |  | QA gate CONCERNS (80/100) — 2 findings (CR-1 refused-commit retry loop, CR-2 link relocation on on-disk copies) | qa-task |
| 2026-09-29 |  | QA gate PASS (100/100) — 0 findings (2 advisory cleanups) | qa-task |
| 2026-09-29 |  | DoD incomplete — 2 gaps identified (AC5 has no automated test; security probe executed no candidates on the pre-commit boundary) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: citation edges
- [x] Phase 2: pre-commit refusal
- [x] Phase 3: authoring surface + conversions
- [x] QA: `task.126.qa.3.bundler-citation-form.md` (3 cycles)
- [x] Gate: `task.126.gate.3.bundler-citation-form.yml` — PASS 100

## References

- Observations #83, #114; task.122 (`UNREACHED` class — sibling, independent); task.108 (link re-relativiser); task.119 (comment-path rule)
- `docs/reference/anti-patterns.md` — the enumeration class

## Notes

Bugs found during QA land at `task.126.bug.[N].[name].md` in this directory.

### Implementation Summary

**Completed**: 2026-09-29 (develop-task pipeline, Step 3, inline from the plan).

**Approach.**
- **Phase 1.** One parser, `quick_validate.parse_shared_refs`, returns `(line, name, kind)` with
  the fragment stripped. `collect_shared_refs` and `bundle_skill.shared_refs_with_lines` are views
  of it, and `SHARED_REF_LINE_RE` is gone. `ref_kind` states the edge rule once.
  `refs_refs_with_kind` classifies the `references/` spelling seeded through `REFS_REF_RE`.
- **Discovery.** `discover_needed` carries a kind on every queue entry and treats a citation as a
  leaf. `seen` records the strongest kind reached per name, so a cite later reached as a dependency
  is re-processed as one.
- **Status line.** `closure_note` appends `· closure M (±K vs committed)` from one cached
  `git ls-files` per run. It omits the comparison outside a repository.
- **Mentions a cited copy cannot satisfy.** Added after the first fast gate. `executable-instructions.test.js` failed because the cited hub copy named `references/develop-pipeline-resume-contract.md` and `references/develop-pipeline-lite-mode.md`, which the three skills no longer ship. `rewrite_text` now takes an `unshipped` predicate from `expected_bytes`. A mention of a real shared file the skill does not ship becomes its upstream URL, which is the task.108 rule for links applied to prose. Shipped files and placeholders are unchanged, and only the three hub copies changed in the tree. `qa-gate-preconditions-parity.test.mjs` now accepts the citation form of the §Subagents pointer.
- **Phase 2.** `.githooks/pre-commit` refuses the untracked part of its pre-existing dirty set
  (`LEFT`). `BUNDLE_PRECOMMIT_WARN=1` downgrades the refusal to a warning.
- **Phase 3.** Adds "Cite or depend" to `create-skill` and a paragraph to AGENTS.md. It converts the
  three pointers, runs `npm run bundle`, and `git rm`s the 51 `UNREACHED` copies, a set
  identical to the one the review predicted. It also corrects `traps.md`'s stale
  `.git/hooks/pre-commit` path.

- **QA fix cycle 1** (gate 1 CONCERNS, CR-1 open, with the advisory items folded in):
  - **CR-1:** the hook refuses only untracked copies whose `shared/resources/` source exists. A hand-written `references/` file stays a warning.
  - **CR-3:** the refusal now runs before the `NEW` copies are staged, so a refused commit leaves the index as it found it.
  - **`set -e` bug in the first attempt.** The fix's own test caught it: a `[ -f … ] && printf` loop under `set -euo pipefail` ended the hook silently with exit 1.
  - **CR-2:** "unshipped" is decided on `needed`, not on the on-disk copies.
  - **CR-4:** `rewrite_text` and `comment_only_refs` use `split_fragment`.
  - **CR-5:** "vs committed" reads `HEAD` (`git ls-tree`), not the index.
  - **Tests.** Hook tests 6 → 8; bundler tests 14 → 15 (M), and J is extended. 5 more mutations, each red.

- **QA fix cycle 2** (gate 2 CONCERNS, found by the cycle-2 refute pass and located in the cycle-1 fixes):
  - **CR-1:** a refused commit now reverts the copies its own run wrote (`revert_new`), so a retry that follows either printed remedy goes through.
  - **CR-2:** Markdown links relocate on the same reached set as prose mentions.
  - **CR-3:** the refusal names both remedies.
  - **CR-4:** the closure figure is described as a net delta.
  - **CR-5:** the CHANGELOG now names `git ls-tree HEAD`.
  - **CR-6:** the dead `shared_refs_with_lines` is retired, and §1d now asserts `parse_shared_refs` against a fixed expectation.
  - **Tests.** Hook tests 8 → 10, and M is extended with a link. Three more mutations, each red.

**Testing results.**
- **New tests.** 14 in `tests/bundle-citation.test.js` and 6 in `tests/pre-commit-hook.test.js`.
  `bundle-missing-source.test.js` §1d gains two fragment inputs.
- **Mutations.** 13, each reverted and each red, recorded in the implementation report: 9 on the
  parser, discovery and rewrite, 4 on the hook. One of the hook mutations is the pathspec without its
  trailing `*`.
- **Tree.** `bundle:check` is clean. `validate:all` passes 129 skills, and `check:generated`
  and `bundled-links` are green. A second `npm run bundle` is a no-op.
- **Closures.** qa-fix 37 → 21, review-task 45 → 27, review-story 46 → 29, exactly as the review
  measured.

**Deferred work.** None added.

### Known Issues

- ⚠️ **A citation does not carry the cited section's own dependencies.** The cited §Subagents section
  tells its reader to `source references/read-config.sh`. All three skills still ship that script,
  but only because each reaches it independently. If one stops reaching it, the cited section's
  command breaks there, and nothing flags it. The rule already covers this: "a file the cited document
  *needs* to be read is a dependency; write it as one". The limit is that this is enforced by
  authorship, not by the bundler.
