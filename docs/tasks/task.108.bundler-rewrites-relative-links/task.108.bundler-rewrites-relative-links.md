---
id: task.108
title: "[Task 108] The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links"
type: task
description: "bundle_skill.py rewrites shared/resources/X → references/X but leaves the other relative links in those files untouched; authored for shared/resources/ depth, they resolve one level wrong from skills/<x>/references/. Measured 2026-09-12: 864 broken links across 229 bundled files. The bundle-freshness check compares copy to source so it certifies the breakage, and docs-link-check.yml is path-filtered to docs/** so nothing trips. Fix in the bundler, guard with a link check over skills/**."
tags: [bundling, create-skill, docs-links, ci]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 6
github_issue: 395
---

# Technical Task: The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.108.review.1.bundler-rewrites-relative-links.md` implemented 2026-09-12

**GitHub Issue**: [#395](https://github.com/Gamaroff/agent-skills/issues/395)

---

## 1. Overview

`npm run bundle` (`skills/create-skill/scripts/bundle_skill.py`) copies each referenced
`shared/resources/*.md` into `skills/<skill>/references/` and rewrites `shared/resources/X` →
`references/X`. It does **not** rewrite the *other* relative links those files carry. Links authored
for `shared/resources/` depth — `../../docs/reference/configuration.md`, a sibling
`open-knowledge-format.md`, `change-log.js` — resolve one level wrong from
`skills/<skill>/references/`. Measured 2026-09-12: **864 broken relative links across 229 bundled
files** (top targets: `../../docs/reference/configuration.md` ×90, `open-knowledge-format.md` ×64,
`tracker-card-summary.md` ×60, `change-log.js` ×48).

**Scope**: fix the rewrite in the bundler (`bundle_skill.py`, and `package_skill.py` — which today
carries its **own copy** of the rewrite regexes at `package_skill.py:108-135` rather than sharing a
pass; this task makes it import the one pass from `bundle_skill.py`), add a link check over
`skills/**/*.md` + `shared/resources/**/*.md` that runs under `npm test` (and therefore `npm run ci`
and `test.yml`), and close the note the 2026-08-20 pipeline audit left open.

## 2. Motivation

### Current Problems

1. **Every bundled reference file is internally broken.** A reader (human or agent) who follows a
   link inside `skills/develop-story/references/tracker-comment-contract.md` lands on a 404. The
   sources are correct; only the copies are wrong — the worst direction, because the copies are what
   ships (`setup-consumer.sh` tarballs, the `.zip` distributables).
2. **Two guards certify the breakage.** `npm run bundle -- --check` compares each copy to its source
   byte-for-byte and reports `0 problems` on 864 broken links; `docs-link-check.yml` is path-filtered
   to `docs/**`, `README.md`, `AGENTS.md`, `CONTRIBUTING.md` and never reads `skills/**`.
3. **It has been known for three weeks.** `docs/reference/develop-story-pipeline-audit.2026-08-20.md:179-182`
   recorded the class; nothing was filed, so it sat outside the frontier.
4. **Consumers cannot resolve `docs/` at all.** A `../../docs/…` link is wrong in a consumer install
   even if the depth were right — the consumer has no `docs/reference/`. The bundler is the one place
   that knows the destination and can choose: depth-correct in-repo, or an absolute upstream URL.

### Benefits

1. Bundled copies become self-consistent; a skill directory is genuinely self-contained (the stated
   purpose of bundling — AGENTS.md §Creating and Packaging Skills).
2. A link check over the bundle graph turns the next regression of this class into a red CI lane
   instead of an audit footnote.
3. One rewrite pass covers both distribution paths (`bundle_skill.py`, `package_skill.py`) — the
   two-definitions drift the anti-patterns doc warns about is avoided by construction. Today the two
   scripts already hold two copies of the `shared/resources/` → `references/` regexes; adding a third
   rewrite in each would triple it. `package_skill.py` imports the pass from `bundle_skill.py`
   (same directory) instead.

## 3. Technical Background

### Current Architecture

- `skills/create-skill/scripts/bundle_skill.py` — `SH_SIBLING_RE`, `assert_sourced_siblings_landed()`
  (task-era fixes for sourced shell siblings) and the `shared/resources/` → `references/` text
  rewrite over `.md` and `.js`. Idempotent; the pre-commit hook runs it and re-stages.
- `skills/create-skill/scripts/package_skill.py` — the zip path. **Not** shared with
  `bundle_skill.py`: it re-declares `SHARED_REF_RE` / `JS_SHARED_RE` / `SH_SHARED_RE` inline
  (`package_skill.py:108-135`), so any rule added to one script and not the other silently diverges.
- `.github/workflows/validate.yml` — `bundle_skill.py --check` + `bundle --all` no-diff.
- `.github/workflows/docs-link-check.yml` — `paths:` filter excludes `skills/**` and
  `shared/resources/**` (see `.agents/handoff.md` traps → `docs/contributing/traps.md` "CI check
  counts differ per PR").

### Target Architecture

- The bundler resolves each Markdown link in a source file **against the source's directory**, then
  applies **one rule** to the resolved path: if the target lands **inside the destination skill
  directory** (`skills/<skill>/…` — i.e. it is a file the bundle also ships), emit it relative to the
  destination file; **anything else** — a `docs/…` target, an `AGENTS.md`, a `shared/resources/`
  sibling the skill does not bundle, a `tests/fixtures/…` path — becomes the canonical upstream URL
  (`https://github.com/Gamaroff/agent-skills/blob/develop/<repo-relative path>`), one constant.
  The measured breakage splits roughly 347 `../../docs/…` / 320 unbundled siblings / 58 other, so a
  `docs/`-only rule would leave almost half of it pointing at `../../../shared/resources/X` — valid
  in this repo, still a 404 in every consumer install, which is the case the bundle exists for.
  Record the decision in the plan; the pass lives in `bundle_skill.py` and `package_skill.py`
  imports it.
- A link check (`tests/bundled-links.test.js` — `tests/*.test.js` is already in the `npm test`
  glob, so it runs under `npm run ci:fast`, `npm run ci` and `.github/workflows/test.yml` with no
  workflow edit) walks `skills/**/*.md` and `shared/resources/**/*.md`, skips fenced code and
  inline code spans, resolves relative targets against `git ls-files`, and fails on any miss. It
  carries a **non-vacuity floor** (must have visited ≥ N files and ≥ M links) so an empty walk cannot
  pass.

### Important Clarifications

- Links inside fenced code and inline code spans are examples, not links — the 2026-09-12 sweep's
  first pass reported two such false positives (`create-bug-report/SKILL.md:496`,
  `qa-story/SKILL.md:2066`). The checker must skip both. **Fence tracking must be line-based**: a
  fence opens or closes only where a line *starts* with ```` ``` ```` (or `~~~`), and the closing
  fence must be at least as long as the opener. A regex over the whole text (`` ```.*?``` ``) is
  wrong — an inline mention such as `qa-task/SKILL.md:515` ("containing at least one fenced ```bash
  block") flips its parity, after which every real link in the rest of the file reads as code and
  every example link in the next fenced block reads as prose. The 2026-09-12 review's baseline
  scan produced 10 false positives in `qa-task/SKILL.md` and `shard-prd/SKILL.md` from exactly this.
- Placeholder targets are not links either, and the rule is a **pattern**, not a list of files:
  skip a target when it is one of `url`, `path`, `…`, or when any path segment contains `{…}` or
  `[…]` (`./task.{id}.{name}.md`, `../../prd.[name].md`, `{jira_url}`). A whitelist of literal
  strings misses the templated shapes, which are the common case.
- Example links with realistic-looking targets (`./bug.8.5.3.1.cache-cleanup-memory-leak.md`,
  `./schema-catalog.md` in illustrative listings) are indistinguishable by pattern. Put them in a
  fenced block or code span at the source — that is the documented convention — rather than
  teaching the checker per-file exceptions. Fix them as found; they are in scope under §4.

## 4. Scope

### In Scope

✅ **Bundler**: link re-relativisation in `bundle_skill.py` and `package_skill.py`
✅ **Guard**: a link check over `skills/**/*.md` + `shared/resources/**/*.md`, running under `npm test` (hence `npm run ci` and `test.yml`)
✅ **Sources**: any `shared/resources/*.md` link that is wrong *at the source* gets fixed as found
✅ **Docs**: update `docs/reference/develop-story-pipeline-audit.2026-08-20.md` §links note; `docs/contributing/packaging.md`

### Out of Scope

❌ Widening `docs-link-check.yml`'s `paths:` filter — a separate lane with its own tool; this task adds a check that runs where bundling is validated
❌ Rewriting links in `docs/tasks/**` / `docs/prd/**` artifacts (consumer-relative placeholders by design)

## 5. Breaking Changes

None for consumers — bundled files gain working links. In-repo, `npm run bundle` will rewrite every
bundled `.md` once (a large mechanical diff; label it as such in the PR and CHANGELOG, per the
v0.46.0 release lesson about separating churn from behaviour).

## 6. Implementation Plan

1. **Measure first.** Commit the checker, run it, record the baseline (expected ≈864 / 229). This
   is the non-vacuity floor's evidence.
2. **Rewrite in the bundler.** Implement the resolve-then-re-relativise pass; run `npm run bundle`;
   re-run the checker → 0. Confirm a second `npm run bundle` is a no-op.
3. **Package path.** Same pass in `package_skill.py`; unzip one skill and run the checker inside it.
4. **Guard.** Confirm the checker is picked up by the existing `tests/*.test.js` glob in
   `package.json` `test` (no new wiring — `validate.yml` and `validate:all` are the Python
   quick-validate/bundle lanes and a node test does not belong there; see the `shellcheck.yml`
   header note on lanes that go red without a matching `npm run ci` script). Mutation-prove: revert
   the bundler pass, re-bundle, confirm the checker (that test, not another) goes red.
5. **Docs.** Audit note, packaging doc, CHANGELOG `[Unreleased]`.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/create-skill/scripts/bundle_skill.py` | `rewrite_md_links()` + `_relocate_target()` (one rule; line-based fences; placeholder pattern); `expected_bytes(src, name, refs_dir, bundled_names)` now takes the bundled population; `SHARED_REF_RE` guarded against absolute URLs |
| `skills/create-skill/scripts/package_skill.py` | imports `rewrite_text` / `rewrite_md_links` / `expected_bytes` from `bundle_skill` (three inline regexes deleted); writes bundled bytes, not raw source, into the zip; no duplicate arcnames; outside-the-skill rule on the skill's own `.md` |
| `skills/create-skill/scripts/quick_validate.py` | `collect_shared_refs` guarded against absolute URLs (the packager's walk rediscovered upstream URLs as refs) |
| `tests/lib/markdown-links.js` (new) | the extractor — twin of `rewrite_md_links()` |
| `tests/bundled-links.test.js` (new) | the checker, with the non-vacuity floor + extractor unit tests |
| `tests/bundle-link-rewrite.test.js` (new) | the rewriter on a synthetic skill; idempotency; `--check`; zip parity |
| `evals/shared/lib/bundled-parity.mjs` (new), `evals/shared/tests/bundled-parity.test.mjs` (new) | freshness as the bundler defines it (`--check`), fail-closed; replaces two test-local normalisers in `finalise-dod-prompt-contract` / `transition-protocol-parity` |
| `package.json` | unchanged — `tests/*.test.js` already in the `test` glob (verified) |
| `skills/*/references/*.md` (~210 files) | regenerated by `npm run bundle` — mechanical |
| `skills/develop-bug/references/develop-bug-step-{0,3,7}-*.md`, `skills/documentation-standards-validator/references/{epic-template,story-template,prd-structure-guide}.md`, `skills/epic-registry-manager/references/epic-template.md`, `skills/performance-optimizer/references/index-performance-guide.md`, `skills/finalise/assets/sprint-review-summary-template.md`, `docs/templates/epic-template.md` | skill-native / template links wrong at the source — fixed as found (§4 In Scope) |
| `docs/reference/develop-story-pipeline-audit.2026-08-20.md`, `docs/contributing/packaging.md`, `AGENTS.md`, `CHANGELOG.md` | notes |

## 8. Testing Strategy

- **Unit**: the resolver on a fixture tree — source at depth 2, destination at depth 3, targets
  in-repo and under `docs/`; fenced/inline-code links skipped; placeholder set skipped.
- **Integration**: `npm run bundle` twice → second run no-diff; checker → 0 broken.
- **Mutation**: revert the pass → checker red; delete the floor → checker must fail on an empty walk.
- **Suite**: `command npm test`, `command npm run bundle -- --check`, `validate.yml` locally
  (`quick_validate.py` loop).

## 9. Success Criteria

1. ✅ Checker reports **0** broken links over `skills/**/*.md` + `shared/resources/**/*.md`, with ≥ 200 files and ≥ 1,000 links visited — 663 files (605 under `skills/`, 58 shared sources), 2,098 links parsed (958 relative), 0 broken; per-half floor on top-level shared sources (QA cycle 3 found the original pathspec walked only nested shared files)
2. ✅ `npm run bundle` is idempotent after the change (second run: no diff) — status and diff hashes equal across two runs; `--check --all`: 126 skills, 0 problems
3. ✅ A zip produced by `package_skill.py` contains no broken relative links (checked inside the extracted tree) — 3 skills packaged and extracted: 57 md files, 100 relative links, 0 broken
4. ✅ The checker runs under `npm test` — and therefore `npm run ci:fast`, `npm run ci` and `.github/workflows/test.yml` — with no workflow edit (`tests/*.test.js` glob, verified by the fast gate run)
5. ✅ Mutation proof recorded: reverting the bundler pass turns the checker red (implementation report, Step 3)
6. ✅ The 2026-08-20 audit note is updated to point at this task

## 10. Risk Assessment

**Medium.** The rewrite touches every bundled Markdown file; a wrong rule breaks 229 files in one
commit. Mitigation: the checker exists *before* the rewrite (phase 1), so the rewrite is measured, not
believed. The absolute-URL choice for out-of-bundle targets pins a branch name (`develop`) into
shipped files — acceptable (tarball installs already come from `develop`), but record it in the plan
and make it one constant so a tagged-release variant is a one-line change later.

## 11. Rollback Plan

`git revert` the bundler commit and re-run `npm run bundle`; the copies return to their previous
(broken-link) state, which is the state the repo has shipped for months. No consumer migration.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |
| 2026-09-12 | 1.1     | Review passed (9/10) — one in-bundle/else-upstream link rule decided; package_skill.py imports the pass; checker spec: line-based fences + pattern placeholders; guard moved to `npm test`; issue #395 linked | review-task |
| 2026-09-12 |         | Status → ready-for-development | review-task |
| 2026-09-12 |         | Implemented — 8 source files + ~210 regenerated bundles, 10 tests | develop |
| 2026-09-12 |         | QA gate CONCERNS (90/100) — 1 medium (CR-1), 2 low, 5 cleanups | qa-task |
| 2026-09-12 |         | QA gate PASS (100/100) — cycle 2 refute pass; 1 low latent (C2-CR-1), 2 low advisory, 2 cleanups | qa-task |
| 2026-09-12 |         | QA gate CONCERNS (90/100) — cycle 3: guard pathspec skipped the 57 top-level shared sources (C3-CR-1); corpus itself clean | qa-task |
| 2026-09-12 |         | QA findings fixed — fail-closed parity helper (ran/ok split); references-root relpath for nested shared sources; guard now walks shared/resources/*.md with a per-half floor; twin agreement on absolute targets; hygiene; 3 iterations | qa-fix |
| 2026-09-12 |         | QA gate PASS (100/100) — cycle 4 clean; 2 advisory cleanups | qa-task |

---

## Progress Tracking

### Phase 1: measure
- [x] Link-check script over `skills/**/*.md` committed under `tests/` with a non-vacuity floor; baseline count recorded (845 broken / 215 files; 606 files, 1,690 relative links)
### Phase 2: rewrite in the bundler
- [x] `bundle_skill.py` re-relativises (or absolutises) depth-relative links in bundled `.md`
- [x] `package_skill.py` does the same for the zip path (imports the pass; zip copy byte-identical to the in-tree copy)
### Phase 3: guard
- [x] Link check confirmed running under `npm test`; mutation-proved (pass stubbed → checker red; empty walk → floor red)
- [x] 2026-08-20 audit note updated

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-12
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 4; cycles 1–3: CONCERNS 90 / PASS 100 with a gated low / CONCERNS 90)

### QA Report
- **Full Report**: [task.108.qa.4.bundler-rewrites-relative-links.md](./task.108.qa.4.bundler-rewrites-relative-links.md) (cycles 1–3: [qa.1](./task.108.qa.1.bundler-rewrites-relative-links.md), [qa.2](./task.108.qa.2.bundler-rewrites-relative-links.md), [qa.3](./task.108.qa.3.bundler-rewrites-relative-links.md))
- **Gate File**: [task.108.gate.4.bundler-rewrites-relative-links.yml](./task.108.gate.4.bundler-rewrites-relative-links.yml) (cycles 1–3: [gate.1](./task.108.gate.1.bundler-rewrites-relative-links.yml), [gate.2](./task.108.gate.2.bundler-rewrites-relative-links.yml), [gate.3](./task.108.gate.3.bundler-rewrites-relative-links.yml))

### Test Coverage Summary
- **Tests Executed**: 3,203 (`ci:fast`) — 3,202 pass, 0 fail; 16 new tests across this task
- **Phases Verified**: 3/3 (5/5 checkboxes)
- **Critical Issues**: 0 (three fix cycles: 16 findings fixed, 0 remaining)
- **NFR Status**: Security: PASS (reasoned), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1 found one medium (the parity helper failed open when the bundler could not run) plus seven advisory items; all fixed and the fail-closed case mutation-proven. Cycle 2's refute pass found one latent low bug (nested shared source mis-relativised — fixed and mutation-proven in cycle 2). Cycle 3 found that the guard's `shared/resources/**/*.md` pathspec walked only nested files, skipping the 57 top-level shared sources; QA scanned them by hand (0/103 broken) — a coverage hole in the checker, fixed in cycle 3 with a per-half floor (mutation-proved). Cycle 4 clean: PASS 100/100.

---

## References

- **Plan**: [`task.108.plan.bundler-rewrites-relative-links.md`](task.108.plan.bundler-rewrites-relative-links.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Related Skill**: `skills/create-skill/` (`scripts/bundle_skill.py`, `scripts/package_skill.py`)
- **Prior note**: `docs/reference/develop-story-pipeline-audit.2026-08-20.md:179-182`
- **Observation**: #64

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.108.bundler-rewrites-relative-links/task.108.bundler-rewrites-relative-links.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
