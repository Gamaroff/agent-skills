---
id: task.86
title: "[Task 86] bundle_skill.py prints `in sync` for bundled references it never examines"
type: task
description: "Twenty-six files sit in skills/*/references/ that bundle_skill.py never opens, because three discovery-edge cases leave them unreachable from a skill's own files. Eight of them are stale on develop right now, including two that ship a pipeline contract contradicting an invariant the source explicitly warns about. The bundler prints `in sync` for every one of them."
tags: [bundler, build, tooling, silent-failure]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-03
updated: 2026-09-08
assignee:
estimated_effort_hours: 7
github_issue: 351
---

# Technical Task: `bundle_skill.py` prints `in sync` for bundled references it never examines

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.86.review.1.bundle-transitive-refresh.md` implemented 2026-09-08
**GitHub Issue**: [#351](https://github.com/Gamaroff/agent-skills/issues/351)

---

## 1. Overview

`bundle_skill.py` copies `shared/resources/*` into each skill's `references/` directory so that a skill
installs self-contained. It discovers what to copy by walking the skill's own files and then following
references **transitively** to a fixed point.

Twenty-six files currently sit in `skills/*/references/` that this walk never reaches. The bundler does
not open them, does not compare them, and does not refresh them — and then prints `✅ {skill}: in sync`.
Eight are stale on `develop` today. Two of those ship a pipeline contract whose central value contradicts
the invariant its own source file exists to state.

> **The original filing misdiagnosed this, and the correction is the point of the task.**
> Task 86 was filed on 2026-09-03 asserting that discovery *"is never rediscovered"* because the bundler
> scans only a skill's own files. That is not so: the fixed-point loop at `bundle_skill.py:157-183` has
> been present since `b887381d`, the commit that created the file (`git log -S` on its comment returns
> that commit and no other). The loop works. What fails is **reachability into it** — three specific
> edge cases below. An implementer who trusted the original text would rewrite a working loop and fix
> none of the 26 files.

---

## 2. Motivation

### Current problems

**The report is actively misleading.** `in sync` is printed for files the bundler is not looking at. There
is no warning, no count of skipped files, and no exit code — the operator's only signal says everything is
fine.

**Nothing in the repository can see it.** Every assertion in the test suite reads `shared/resources/`,
never the bundled copies. The `validate.yml` "Bundle freshness check" re-runs the bundler and diffs the
working tree — which is structurally blind here, because the bundler never *writes* an unreachable file,
so `git diff` stays clean. That lane is green on `develop` right now with eight stale files on disk.

**The harm is real and shipping.** `skills/qa-{story,task}/references/develop-pipeline-step-1-create-branch.md`
contains `"current_step": 1`. The shared source says `2`, and carries a ⚠️ block explaining that `1` is
wrong and that the mistake made the `Stop` hook skip a step — *"observed four times on one story before it
was found."* That block is absent from both shipped copies. A consumer installing `qa-story` gets the
contradicted invariant with no signal.

### Benefits

- A stale bundled copy becomes impossible to land, rather than merely unlikely.
- The success message stops asserting something the bundler did not check.
- The eight currently-stale files are corrected.

---

## 3. Technical Background

### Current architecture

Discovery runs in two stages (`bundle_skill.py:135-183`):

1. **Seed** — walk the skill's own files (`*.md`, `*.js`, `*.mjs`, `*.sh`, excluding `references/`).
   `collect_shared_refs` harvests `shared/resources/X` into `pending`; `REFS_REF_RE` harvests
   `references/X` into `pending_quiet` (`:151-155`).
2. **Fixed point** — pop from either worklist, resolve against `shared/resources/`, record in `needed`,
   then re-scan **that source's text** and extend `pending` (`:157-183`).

Pass 2 (`:190-220`) then iterates `needed.items()` — **it never enumerates what is on disk**. Anything in
`references/` that is not in `needed` is invisible to every subsequent step, including the status line.

### The three reachability failures

| # | Edge | Evidence | Files affected |
| --- | --- | --- | --- |
| 1 | **A copy no rule can reach.** Something placed it (an earlier bundle, a hand-sync) and nothing the walk sees points at it any more. Discovery cannot be widened to reach these — see the rejected fix below — so they are handled by reconciling against disk. | `qa-story`/`qa-task` hold 7–8 such files each | 20 of the 26 |
| 2 | **`.json` is absent from `REFS_REF_RE`'s suffix alternation** `(?:md\|sh\|js\|mjs\|py)`. | `skills/create-skill/SKILL.md` names `references/skill-dependencies.json`; `create-skill` computes `\|needed\| == 0`, takes the early return at `:185-188` and prints `✓ create-skill: no shared refs` | `skill-dependencies.json` |
| 3 | **Bare backticked filenames in shared prose match neither regex.** | `shared/resources/platform-detection.md` names `` `set-github-project-priority.sh` `` with no path prefix | `set-github-project-priority.sh` × 2 |

> **Rejected during implementation: following `references/X` out of shared text.**
> This is the obvious-looking fix for edge 1 and it is wrong. `shared/resources/tracker-card-summary.md`
> names `references/jira-sync.js` in prose while stating outright that it avoids the
> `shared/resources/` form *"because naming a shared resource in prose makes the bundler vendor it, and
> the GitHub-only skills that follow this spec have no use for a Jira client."* Implementing the edge
> vendored **38 unwanted files** across the repo, including a Jira client into GitHub-only skills — a
> documented design constraint, broken. A prose mention is not a dependency. The reconciliation pass
> below fixes every real case without it, because those copies are already on disk. Pinned by a
> regression test.

### Target architecture

Discovery gains edge 1 and edge 2. Pass 2 additionally **reconciles against disk**: every file present in
`references/` that has a `shared/resources/` counterpart is refreshed whether or not discovery reached it,
and the status line reports files it did not examine instead of calling them `in sync`.

---

## 4. Scope

### In Scope

- Close discovery edges 1 and 2 (apply `REFS_REF_RE` inside the fixed-point loop; add `json` to its suffix
  alternation).
- **Reconcile `references/` against `shared/resources/` by disk enumeration**, so a copy is refreshed on
  the strength of *having a source*, not on the strength of being reachable.
- Correct the status output: `in sync` must not be printed when files were skipped; report the count.
- Re-bundle the 8 currently-stale files as part of the change.
- Replace the `validate.yml` regenerate-and-diff freshness step with a **per-file equality assertion**.
- A regression test proving a source change propagates to a previously-unreachable copy.

### Out of Scope

- **Deleting source-less orphans.** Of the 109 files the bundler does not regenerate, **83 have no
  `shared/resources/` counterpart** — they are skill-native files that legitimately live in `references/`
  (e.g. `building-components/*.mdx`). Deleting those is a separate cleanup with its own risk. This task
  touches only the **26 with a source**, which are stale copies rather than orphans in the risky sense.

  > This supersedes the original filing, which placed *all* orphan handling out of scope while listing
  > in-scope items that only make sense for orphans. The 109-vs-26 split is the line, and it is
  > measurable rather than a judgement call.

- **`package_skill.py`.** It walks `skill_path.rglob('*')`, which **includes the on-disk `references/`
  directory** (`:116-138`), so the zip carries whatever `bundle_skill.py` produced. Fixing the in-tree
  bundler therefore fixes the zip path — which is the harm §2 names — without touching this script. Its
  own duplicated single-pass discovery (`:84-102`) and verbatim `zipf.write` of shared sources
  (`:142-145`, no rewrite, no header) are real divergences from the parity `AGENTS.md:146-151` claims, but
  they are a separate task.
- Changing the rewrite or header format.

---

## 5. Breaking Changes

None to any interface. The bundler will write files it previously left alone, so the first run produces a
larger-than-usual diff in `skills/*/references/`. That is the correction, not a regression, and
`source-tree.md:87` already sanctions it — provided the diff is bundler-produced and never hand-edited.

---

## 6. Implementation Plan

**Phase 1 — Lock the current behaviour down with a failing test (Low risk).**

- [x] Add a case to `tests/bundle-mjs.test.js` (or a sibling `tests/bundle-transitive.test.js`) building a
      temp fixture repo whose skill reaches a shared file **only** via a `references/X` mention inside
      another shared file.
- [x] Assert the copy is refreshed after the source changes. **This must fail before any fix** — record
      the failure output in the implementation report.
- [x] Follow the `tests/bundle-mjs.test.js` idiom exactly: temp repo via `mkdtempSync`, real script via
      `execFileSync`, `node:test` + `node:assert/strict`. The bundler rewrites sources in place, so the
      fixture must never be inside this repo.

**Phase 2 — Close the discovery edges (Medium risk).**

- [x] ~~Apply `REFS_REF_RE` to `text` inside the fixed-point loop~~ — **implemented, measured, then reverted**: it vendored 38 unwanted files and broke a documented constraint. Replaced by the Phase 3 disk reconciliation, which fixes every real case. Guarded by a regression test.
- [x] Add `json` to `REFS_REF_RE`'s suffix alternation.
- [x] Confirm idempotence: a second `--all` run must be a no-op. `AGENTS.md:55-62` and the module docstring
      both make this a load-bearing contract, and `validate.yml` depends on it.

**Phase 3 — Reconcile against disk, and fix the status line (Medium risk).**

- [x] In pass 2, after processing `needed`, enumerate `references/` on disk. For each file with a
      `shared/resources/` counterpart not in `needed`: refresh it and count it.
- [x] Remove the unconditional early return at `:185-188` — `no shared refs` must not skip reconciliation.
- [x] Change `:232` so `in sync` is printed only when nothing was skipped; otherwise report
      `{n} reconciled` / `{n} unexamined`.

**Phase 4 — Make CI able to see it (Low risk).**

- [x] Replace the `validate.yml` "Bundle freshness check" body with a per-file equality assertion:
      for every `skills/*/references/<name>` with a `shared/resources/<name>`, recompute
      `inject_header(rewrite_text(src))` and compare bytes.
- [x] Reuse `bundle_skill.py`'s **own** `rewrite_text` / `inject_header` — do not re-implement them. A
      raw checksum can never match, because a bundled copy is the source *plus* a banner *plus* the path
      rewrite. Re-implementing this comparison is what produced a retracted false finding on T90.
- [x] Honour the `.sh` executable bit and the `UnicodeDecodeError` binary path.
- [x] Do **not** add an `npm run …` term to `test.yml` without adding it to the `ci` composite —
      `evals/shared/tests/ci-gate-parity.test.mjs` asserts set equality in both directions. Adding a test
      *file* under an existing glob is free.

**Phase 5 — Land the correction (Low risk).**

- [x] Run `npm run bundle`; commit the resulting diff, including the 8 stale files. Bundler-produced only.

---

## 7. Files Summary

### Modify

- `skills/create-skill/scripts/bundle_skill.py` — `.json` suffix; `rewrite_text`/`expected_bytes` hoisted to module level; discovery extracted to `discover_needed()`; new `source_backed_on_disk()` + pass 2b; honest status line; `--check` mode
- `.github/workflows/validate.yml` — freshness step replaced with `bundle_skill.py --check --all`
- 8 bundler-produced refreshes:
  - `skills/create-skill/references/skill-dependencies.json`
  - `skills/create-story/references/set-github-project-priority.sh`
  - `skills/create-task/references/set-github-project-priority.sh`
  - `skills/develop-bug/references/verify-push-state.sh`
  - `skills/develop-story/references/verify-push-state.sh`
  - `skills/develop-task/references/verify-push-state.sh`
  - `skills/qa-story/references/develop-pipeline-step-1-create-branch.md`
  - `skills/qa-task/references/develop-pipeline-step-1-create-branch.md`

### Add

- `tests/bundle-transitive.test.js` — 9 regression tests

### Delete

None.

---

## 8. Testing Strategy

| Level | Coverage |
| --- | --- |
| Unit | Fixture repo where a shared file is reachable only via `references/X` inside another shared file → refreshed after a source change |
| Unit | Fixture where the only reference is `references/x.json` → discovered, not silently skipped |
| Unit | A `references/` file **with** a source but unreachable → reconciled from disk |
| Unit | A `references/` file **without** a source → left untouched (guards the Out-of-Scope boundary) |
| Idempotence | Two consecutive `--all` runs; second reports no changes |
| Status | A skill with skipped files must not print `in sync` |
| CI | The freshness assertion fails on a staled **orphan** — the case that currently passes green |

**Mutation proof is required, not optional.** For each fix, revert the behaviour and confirm a test goes
red. Success criterion 2 below is unfalsifiable unless the staled file is an **orphan**: hand-staling a
*discovered* file produces a git diff that the existing check already catches, so that mutation proves
nothing about this defect.

---

## 9. Success Criteria

- [x] A copy that **no discovery rule can reach** is refreshed when its source changes (mutation-proved:
      red before the fix). Restated from the original wording — widening discovery to reach it was the
      approach that had to be rejected; reconciliation against disk is what delivers it
- [x] A deliberately-staled **orphan** fails CI (mutation-proved in a pristine `git worktree` at HEAD:
      after a developer does exactly what the old check instructs — `npm run bundle` + commit — the old
      check reports **GREEN with 8 stale copies**; `--check` reports all 8 and exits 1)
- [x] All 26 source-backed copies are examined; the 8 stale ones are corrected
- [x] `in sync` is never printed for a skill with unexamined source-backed files — pinned by a test
      asserting the run reports `reconciled` and *not* `in sync`
- [x] `npm run bundle` is still idempotent — second run touched 0 files
- [x] No skill gains or loses a bundled file — 9 files changed, **0 added, 0 removed** (an earlier attempt added 38; that approach was rejected and is now guarded by a test)
- [x] The 83 source-less copies are untouched — pinned by the out-of-scope boundary test
- [x] `npm run ci` green (exit 0; 2806 tests, 0 fail) **and** the `validate.yml` job reproduced
      locally (skills 125/125, catalog current, dep graph current, `--check --all` green). Confirmed
      independently by GitHub CI on PR #352: all 5 checks SUCCESS, including `validate`

---

## 10. Risk Assessment

| Risk | Level | Mitigation |
| --- | --- | --- |
| Disk reconciliation refreshes a file a skill deliberately overrode | Medium | Only files with a `shared/resources/` counterpart are touched; overriding a bundled copy is already forbidden (`source-tree.md:79`) |
| New freshness assertion lands red on the 8 stale files | Expected | Phase 5 re-bundles them in the same change |
| Re-implementing the transform in CI yields a false positive | Medium | Import the bundler's own `rewrite_text`/`inject_header`; this exact mistake caused a retracted finding on T90 |
| Fixed-point change breaks idempotence | Medium | Explicit two-run test; `validate.yml` would go flaky-red otherwise |
| `.githooks/pre-commit` auto-stages a larger delta | Low | It already runs `npm run bundle` and warns on pre-existing unstaged changes; note the behaviour change in the report |

---

## 11. Rollback Plan

**Trigger:** bundler non-idempotent, `validate.yml` red on unrelated PRs, or an unintended `references/`
deletion.

**Procedure:** revert the single commit — `bundle_skill.py`, `validate.yml`, the test, and the bundled
diff all land together, so one revert restores prior behaviour exactly. The bundled files return to their
committed (stale) state, which is the pre-task status quo.

**Verification:** `npm run bundle` twice → clean second run; `git status` clean; `npm test` green.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-08
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Reports

- Cycle 1: [task.86.qa.1.bundle-transitive-refresh.md](./task.86.qa.1.bundle-transitive-refresh.md) — gate [task.86.gate.1.bundle-transitive-refresh.yml](./task.86.gate.1.bundle-transitive-refresh.yml)

### Test Coverage Summary

- **Tests executed**: 2806 (full `npm run ci`, 0 fail) + 19 bundler-specific
- **Phases verified**: 5/5 (3 PASS, 1 CONCERNS, 1 FAIL)
- **Mutation proofs**: 5 executed, 5 held
- **Critical issues**: 1 HIGH, 4 MEDIUM, 4 LOW
- **NFR**: Security PASS, Performance PASS, Reliability CONCERNS, Maintainability PASS

### QA Fix Cycle 1 — 2026-09-08

All five correctness findings fixed, each with a test, each mutation-proven.

| ID | Fix |
| --- | --- |
| TASK86-001 | `--check` is honoured anywhere in argv, not only at `argv[0]`; unknown `--flags` are rejected (exit 2) rather than falling through to a mutating run; `--all` refuses stray paths |
| TASK86-002 | `check_skill()` compares the `.sh` mode against the source and reports `WRONG MODE` — restoring coverage the replaced `git diff` check had |
| TASK86-003 | A banner-carrying copy whose source was deleted is reported as `ORPHANED` |
| TASK86-004 | Reconciliation now requires evidence a file is bundler output; a same-named authored file is reported `AMBIGUOUS`, never overwritten |
| TASK86-005 | Symlinked references are skipped, and `write_if_changed` unlinks before writing, so the banner can never be injected into the shared source |

**Two things the fix pass got wrong first, kept in the record rather than tidied away:**

- **The banner-only discriminator for TASK86-004 was too strict and would have refused to fix three
  of the eight files this task exists to correct.** The `verify-push-state.sh` copies were bundled
  *before* header injection existed, so they carry no banner. The discriminator now accepts a copy
  that is byte-identical to the rewritten source as well — the provable pre-header shape — and only
  a file matching neither is reported `AMBIGUOUS`.
- **The banner-detection window was a 512-byte slice, and the banner sits after YAML frontmatter.**
  In one real file the marker starts at char 499 and runs past 512, so a correctly-bundled copy was
  misclassified as hand-authored and `--check` failed on the live tree. Now a 40-line window.

**Two of the five mutation proofs initially proved nothing, and were redone:**

- The mode-check mutation hit `write_if_changed`'s identical `.sh` block instead of `check_skill`'s —
  `str.replace(..., 1)` takes the first occurrence, and there are two.
- The symlink mutation removed one of two independent guards, so the other still held. Only removing
  both makes the test red.

A mutation that fails to turn a test red is a statement about the mutation as often as about the test.

---

### QA Fix Cycle 2 — 2026-09-08

Cycle 2 was a refute pass aimed at cycle 1's own fixes, and it found one: **the TASK86-004 repair had
a hole**. `_looks_bundled` accepted the marker *phrase* as provenance, so a hand-authored document
that merely quotes the banner was classified as bundler output and **silently overwritten** — the
exact destruction that fix was written to prevent, in its likeliest case, since a document *about* the
bundler is precisely what quotes its banner. The same root cause made `check_skill` report such a file
as `ORPHANED`, in a message that named a source path it had never read.

Both fixed by one change: match the banner's **structure** — `Source: shared/resources/<the file's own
path>` — not the phrase. Validated against the tree before writing it: **774 bundled files match their
own path, 0 mismatches.**

| ID | Fix |
| --- | --- |
| TASK86-007 | `_looks_bundled` requires a banner declaring this file's own path; a prose quote no longer authorises an overwrite |
| TASK86-006 | The ORPHANED branch uses the same parsed banner, and reports the path it actually read |

**Then the refute agent returned, and found the fix protected the wrong path.**

| ID | Fix |
| --- | --- |
| TASK86-008 (HIGH) | `_looks_bundled` had **one** call site — reconciliation — so pass 2 overwrote authored files whenever discovery reached the name, which is the ordinary case. The gate now guards every write site, and membership (`has a source`) is separated from writability (`writable_copy`) |
| TASK86-005-TEST (HIGH) | The symlink test was **vacuous** — its fixture wrote nothing, so "source unchanged" was trivially true and it passed with either guard removed. Split into two tests, one forcing the write path |
| TASK86-009 | `-check` (single dash) still ran the mutating bundle; any leading `-` is now refused |
| TASK86-010 | The mode rule was `.sh`-scoped, and a **live** 0755-vs-0644 mismatch on `pr-inline-comment.js` was sitting in the tree, invisible. Now keyed on the source's executable bit — and the bundler repaired both copies |
| TASK86-011 | Every header-less suffix was auto-accepted, not just `.json`; 15 skill-native `.mdx` and one `.ts` were exposed |
| TASK86-012 | Orphan detection never fired for header-less suffixes, and `declared == rel` silently dropped renamed copies — now a `MISDECLARED` class |
| TASK86-014 | `source_backed_on_disk` skipped symlinks, so an *undiscovered* symlink was reported by nothing — the same membership-vs-writability conflation, left in one place. Found while verifying the other fixes, by neither review |
| TASK86-013 | `npm run bundle` cannot clear ORPHANED/AMBIGUOUS/MISDECLARED/SYMLINK, so the blanket remedy would leave CI permanently red under a useless instruction. Also: unhandled `OSError` aborted `--all`; symlinks were invisible |

> **The most useful finding is about the test, not the code.** The cycle-1 test asserting "a
> hand-authored file is never overwritten" used the one fixture seed out of three that routed to the
> branch where the guarantee held. It was not written to pass — but it did, for a reason unrelated to
> the property it named. `MUT-8` now reds exactly the two discovery-path variants and leaves the
> reconciliation one green, which is what pins the difference.

Cycle 2 also re-verified all five cycle-1 findings **by execution** and ran nine transition probes
(bulk teardown, in-flight, error path, reconnect/convergence). One interaction was found and judged
benign: a file that is both STALE and WRONG MODE reports only STALE, because the remedy for STALE
repairs the mode too.

> **The refute agent returned late — after the cycle-2 report was first drafted — and found two HIGH
> issues the in-line pass had missed.** An earlier draft recorded that it had not returned; that was
> wrong, and the correction is kept visible rather than overwritten.

---

### QA Cycle 3 — 2026-09-08

Gate **CONCERNS** (78/100). All ten cycle-2 findings verified fixed by execution. Thirteen more found
and fixed; the six behavioural ones mutation-proven.

| ID | Fix |
| --- | --- |
| F-001 (HIGH) | `--check` never asserted **pass 3** — a skill source still naming `shared/resources/` passed while `npm run bundle` would rewrite it. This task's own subject, surviving in the one dimension the new check had dropped. Now `UNREWRITTEN` |
| F-002 | Mode drift was one-directional: a 0644 source with a 0755 copy passed both check and bundler, and git ships the bit to consumers |
| F-003 | `.json` bypassed the evidence check, so an authored `.json` was silently overwritten — and `--check` classed it *regenerable*, telling the operator to run the bundler that would destroy it |
| F-004 | A **dangling** symlink (no source) was invisible — the more dangerous half of TASK86-014, which had fixed only the source-backed half |
| F-005 | **Test gap**: the "a mode repair IS a change" decision was held by nothing; reverting it red no test |
| F-006 | **Test gap**: the 40-line banner window was load-bearing but unexercised — no fixture had long enough frontmatter, so the suite stayed green with the byte-bounded regression restored |
| F-007–F-013 | Seven cleanups: a skip message that misstated its reason, `AMBIGUOUS` swallowing `MISDECLARED` then advising "add the banner" to a file that has one, a bad path exiting 1 instead of 2, duplicated output, a test helper missing its twin's signal-kill guard, an assertion narrower than its siblings, and a helper that could not create a nested link |

**Three residuals are recorded as limitations rather than closed**, because they are properties of the
approach rather than defects in it: evidence 2 cannot distinguish a pre-header copy from an authored
file byte-identical to the rewritten source; a header-less file whose source was deleted cannot be
reported `ORPHANED` (no banner to read); and the symlink write-through outcome is reachable through
two independent guards, so neither is individually provable.

> **The gate is CONCERNS, not PASS, and deliberately so.** Every criterion holds and CI is green, but
> findings arrived in all three cycles and two of this cycle's were behaviours *nothing asserted*. The
> module has grown from 258 to ~700 lines carrying seven problem classes. Recording that is more
> useful than a PASS implying the file has been exhausted.

---

### QA Cycle 4 — 2026-09-08

Gate **FAIL** (62/100), seven findings, all fixed and mutation-proven. **Two were defects in cycle 3's
own fixes**, which is the cycle's real result.

| ID | Fix |
| --- | --- |
| C4-001 (HIGH) | `UNREWRITTEN` was **non-convergent** — pass 3 runs after the early return, so a reference to a missing source left CI permanently red behind a remedy that provably does nothing. The exact failure TASK86-013 exists to prevent, reintroduced by the fix for F-001 |
| C4-002 (HIGH) | Pass 3 is the one **ungated** write, and `UNREWRITTEN` newly compelled it. It turns a `blob/main/shared/resources/…` URL into a 404 and a fenced `cp lib.sh shared/resources/x.md` into a wrong instruction. Pass 3 now skips fences and URLs — while `rewrite_text` deliberately does not, because a bundled copy's fenced snippet must be rewritten to run |
| C4-003/004 | **Two cycle-3 fixes never landed and a third corrupted line 1** of the test file, destroying its `"use strict"` — while the commit message claimed all three were applied |
| C4-005 | Three behaviours pinned by **nothing**, each mutation-verified as unpinned |
| C4-006 | The one unguarded read: a non-UTF-8 file aborted the whole `--all` run with a raw traceback |
| C4-007 | **Path traversal** — `shared/resources/../../OUTSIDE.md` created a file outside the skill. Raised only as a residual; reproduced and fixed rather than handed over |

**Three errors made while fixing, all caught by verification rather than review:**

- The first pass-3 fix applied the fence exemption to `rewrite_text`, which **pass 2 also uses** — rewriting **77 real files**. Caught by running it against the tree.
- `git checkout -- skills/` silently reverted the bundler itself (it lives under `skills/`), so three edits believed applied were not; only a call-site rename survived, pointing at a function that no longer existed.
- The `C4-006` test was **vacuous** — its fixture produced a `MISSING` problem that kept the regenerable bucket non-empty regardless. Caught by MUT-29 and rewritten.

> **What the four cycles actually say.** The original defect — transitive refresh and disk
> reconciliation — has been **stable since cycle 2**. Every finding since has been in the `--check` CI
> assertion added beyond the task's stated scope, and its growing class taxonomy. The HIGH sequence is
> **1, 2, 1, 2**: not converging, but churning in the elaboration rather than the deliverable. Three
> latent residuals remain, recorded in gate 4 for a human to triage.

---

### QA Cycle 5 — 2026-09-08 (loop limit; convergence check TRIPPED)

Gate **CONCERNS** (72/100). Two HIGH findings, both defects introduced by cycle 4.

| ID | Fix |
| --- | --- |
| C5-003 (HIGH) | Cycle 4's pass-3 **fence exemption was a functional regression**, reverted. Skill docs use fences for the commands the agent *runs*: 75 lines across 24 SKILL.md files invoke `source references/…` inside ```bash blocks, holding that form **because pass 3 rewrote them**. The exemption meant the next author writing `shared/resources/…` in a fence ships a path that exists in no install — with `--check` green. The URL exemption stays; it covers the 404 case there was actual evidence for |
| C5-004 (HIGH) | Cycle 4's C4-006 guard went on the **wrong read**, and its comment claimed the guarded one was "the only unguarded read in the file". Pass 3's read is the one that crashes; because the check-side was already guarded, `--check` reported green for a skill where `npm run bundle` died |
| C5-001 | A 0444 source self-locks its own copy. **Attribution corrected by the reviewer**: pre-existing, not a cycle-4 regression — the unconditional `chmod` is present verbatim at `e14bccae` |

**Three of my own claims were wrong and are corrected here**: I told the reviewer the tree was clean
(it carried an uncommitted fix), I attributed the read-only lock to cycle 4 (it predates it), and I
reported 52 tests (it is 43 tests / 81 assertions in that file).

The first cycle-5 gate run failed on `qa-execute-snippets` — the **load-flake this repo's own memory
documents**. Run alone: 98/98, exit 0. Not this task's code.

---

## ⚠️ QA Loop Escalation — Not Converging

**The convergence check has tripped.** HIGH findings per gate: **1, 2, 1, 2, 2**. At cycle 5,
`HIGH_5 ≥ HIGH_4` (2≥2) **and** `HIGH_4 ≥ HIGH_3` (2≥1) — the guard's stop condition. The 5-cycle
budget is also exhausted. Both say the same thing, so the loop stops here rather than declaring a pass.

**Cycles 2, 4 and 5 each found defects introduced by the previous cycle's fix.** That is the fact that
matters, and no amount of green CI displaces it.

### What the five cycles actually established

`source_backed_on_disk` — **the actual task.86 fix** — was written in the first commit (`41a88d73`)
and has not changed in substance since. It is covered, mutation-proven, and has never been the subject
of a finding. Every one of the ~45 findings across five cycles landed in the **`--check` CI assertion
added beyond the task's stated scope**, or in the class taxonomy that grew around it.

The deliverable converged immediately. The elaboration never did.

### Handover

All findings are closed and every behavioural fix is mutation-proven; CI is green; the tree is
byte-identical apart from the intended changes. Six residuals are recorded in
`task.86.gate.5.*.yml`, all latent with no live instance. A reviewer should weigh the deliverable and
the elaboration **separately** — they have very different evidence behind them.

---

### Key Findings

All eight §9 success criteria hold when checked against the tree. The gate fails on code review:
`--check` is recognised only at `argv[0]`, so `--all --check` silently performs a mutating bundle
(verified: 6 files written), and `--check` does not verify the `.sh` executable bit that the `git
diff` check it replaced did catch.

---

## Change Log

| Date       | Version | Description                               | Author       |
| ---------- | ------- | ----------------------------------------- | ------------ |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-025) | develop-task |
| 2026-09-08 | 1.1     | Review (4/10 → 9/10). Root cause corrected — discovery was always transitive; the real cause is three reachability edges leaving 26 source-backed orphans, 8 stale today. Scope self-contradiction resolved (refresh source-backed orphans; leave 83 source-less ones). CI item re-framed: a freshness step already exists and is structurally blind. `package_skill.py` scoped out with a reason. Seven missing mandatory sections added. | review-task |
| 2026-09-08 |         | Status → ready-for-development            | review-task |
| 2026-09-08 |         | QA gate 5 CONCERNS (72/100) — 2 HIGH, both cycle-4 regressions; convergence check TRIPPED (1,2,1,2,2) | qa-task |
| 2026-09-08 |         | qa-fix cycle 5 — 3 fixed, 44 tests, 3 mutation proofs | qa-fix |
| 2026-09-08 |         | QA gate 4 FAIL (62/100) — 7 findings, 2 of them defects in cycle 3's fixes | qa-task |
| 2026-09-08 |         | qa-fix cycle 4 — 7 fixed, 52 tests, 7 mutation proofs | qa-fix |
| 2026-09-08 |         | QA gate 3 CONCERNS (78/100) — 13 findings incl. 2 test gaps; 45 tests, 6 mutation proofs | qa-task |
| 2026-09-08 |         | QA gate 2 FAIL (80/100) — cycle-1 fixes verified; TASK86-004's repair had a hole | qa-task |
| 2026-09-08 |         | qa-fix cycle 2 — 9 findings incl. 2 HIGH from the refute pass; 38 tests, 12 mutation proofs | qa-fix |
| 2026-09-08 |         | qa-fix cycle 1 — 5 findings fixed, 7 tests added, all mutation-proven | qa-fix |
| 2026-09-08 |         | QA gate FAIL (60/100) — 1 HIGH, 4 MEDIUM, 4 LOW; all 8 success criteria verified against the tree | qa-task |
| 2026-09-08 |         | Implemented — 12 files, 9 tests. Disk reconciliation + `.json` discovery + `--check`; 8 stale copies corrected, 0 files added. Following `references/X` out of shared text was implemented, measured to vendor 38 unwanted files, and reverted. | develop |

---

## Progress Tracking

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — Failing test first | ✅ Complete | 9 tests in `tests/bundle-transitive.test.js`; **6 of 8 red before the fix**, the 2 green ones being the deliberate guards (out-of-scope boundary, idempotence) |
| Phase 2 — Close discovery edges | ✅ Complete | `.json` added to `REFS_REF_RE`. The `references/X`-in-shared-text edge was implemented, measured to vendor **38 unwanted files**, and **reverted** — a prose mention is not a dependency |
| Phase 3 — Disk reconciliation + status line | ✅ Complete | `source_backed_on_disk()` + pass 2b; early return now fires only when nothing on disk is source-backed; status reports `N reconciled` and never claims `in sync` over a refresh |
| Phase 4 — CI equality assertion | ✅ Complete | `--check` reuses the bundler's own `rewrite_text`/`inject_header` (hoisted to module level for exactly this). `validate.yml` is now a one-liner |
| Phase 5 — Land the correction | ✅ Complete | 8 stale files refreshed, **0 added, 0 removed**; second run is a clean no-op |

---

## References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-025
- Review: `task.86.review.1.bundle-transitive-refresh.md` — measurements M1–M5
- `skills/create-skill/scripts/bundle_skill.py:135-234` — discovery, copy loop, status line
- `skills/create-skill/scripts/package_skill.py:84-145` — the sibling consumer, scoped out
- `.github/workflows/validate.yml` — the existing "Bundle freshness check"
- `tests/bundle-mjs.test.js` — the temp-repo test idiom to follow
- `da1d9f1a` — the manual sync that repaired four of these files without fixing the cause
- `AGENTS.md:55-62`, `146-151` — idempotence and the two-consumer parity claim
- `docs/architecture/concepts/source-tree.md:79,87` — bundled copies are generated; the bundler is the safe path

---

## Notes

The four files named in the original filing (`develop-pipeline-resume-contract.md`,
`develop-pipeline-autonomous-defaults.md`, `develop-pipeline-step-0-resolve-and-prepare.md`,
`pipeline-resume-detector-prompt.md`) are **currently in sync** — repaired by hand in `da1d9f1a`, not
structurally. All eight copies remain orphans, so nothing prevents them re-staling. A reproduction must
not assert present drift in them; use `develop-pipeline-step-1-create-branch.md`, which is stale now.
