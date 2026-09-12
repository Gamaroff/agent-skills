---
id: task.108
title: "[Task 108] The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links"
type: task
description: "bundle_skill.py rewrites shared/resources/X → references/X but leaves the other relative links in those files untouched; authored for shared/resources/ depth, they resolve one level wrong from skills/<x>/references/. Measured 2026-09-12: 864 broken links across 229 bundled files. The bundle-freshness check compares copy to source so it certifies the breakage, and docs-link-check.yml is path-filtered to docs/** so nothing trips. Fix in the bundler, guard with a link check over skills/**."
tags: [bundling, create-skill, docs-links, ci]
category: infrastructure
status: planned
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 6
---

# Technical Task: The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Status:** Planned

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

**Scope**: fix the rewrite in the bundler (both `bundle_skill.py` and `package_skill.py`, which share
the pass), add a link check over `skills/**/*.md` + `shared/resources/**/*.md` that CI runs, and
close the note the 2026-08-20 pipeline audit left open.

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
   two-definitions drift the anti-patterns doc warns about is avoided by construction.

## 3. Technical Background

### Current Architecture

- `skills/create-skill/scripts/bundle_skill.py` — `SH_SIBLING_RE`, `assert_sourced_siblings_landed()`
  (task-era fixes for sourced shell siblings) and the `shared/resources/` → `references/` text
  rewrite over `.md` and `.js`. Idempotent; the pre-commit hook runs it and re-stages.
- `skills/create-skill/scripts/package_skill.py` — the zip path, same rewrite.
- `.github/workflows/validate.yml` — `bundle_skill.py --check` + `bundle --all` no-diff.
- `.github/workflows/docs-link-check.yml` — `paths:` filter excludes `skills/**` and
  `shared/resources/**` (see `.agents/handoff.md` traps → `docs/contributing/traps.md` "CI check
  counts differ per PR").

### Target Architecture

- The bundler resolves each Markdown link in a source file **against the source's directory**, then
  emits it **relative to the destination directory** (in-repo targets) — or, for targets under
  `docs/`, emits the canonical upstream URL (`https://github.com/Gamaroff/agent-skills/blob/develop/…`)
  since no consumer has `docs/`. Decide once, record the decision in the plan, apply to both scripts.
- A link check (`tests/bundled-links.test.js` or a `scripts/` node script wired into
  `validate.yml`) walks `skills/**/*.md` and `shared/resources/**/*.md`, skips fenced code and
  inline code spans, resolves relative targets against `git ls-files`, and fails on any miss. It
  carries a **non-vacuity floor** (must have visited ≥ N files and ≥ M links) so an empty walk cannot
  pass.

### Important Clarifications

- Links inside fenced code and inline code spans are examples, not links — the 2026-09-12 sweep's
  first pass reported two such false positives (`create-bug-report/SKILL.md:496`,
  `qa-story/SKILL.md:2066`). The checker must skip both.
- `{jira_url}`, `url`, `path`, `…` placeholders in templates are not links either; the checker
  should whitelist a small placeholder set rather than special-casing files.

## 4. Scope

### In Scope

✅ **Bundler**: link re-relativisation in `bundle_skill.py` and `package_skill.py`
✅ **Guard**: a link check over `skills/**/*.md` + `shared/resources/**/*.md`, in CI and in `npm run validate:all`
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
4. **Guard.** Wire the checker into `validate.yml` and `npm run validate:all`. Mutation-prove: revert
   the bundler pass, re-bundle, confirm the checker (that test, not another) goes red.
5. **Docs.** Audit note, packaging doc, CHANGELOG `[Unreleased]`.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/create-skill/scripts/bundle_skill.py` | link re-relativisation pass |
| `skills/create-skill/scripts/package_skill.py` | same pass |
| `tests/bundled-links.test.js` (new) | the checker, with floor |
| `.github/workflows/validate.yml`, `package.json` | wire the checker |
| `skills/*/references/*.md` (229 files) | regenerated by `npm run bundle` — mechanical |
| `docs/reference/develop-story-pipeline-audit.2026-08-20.md`, `docs/contributing/packaging.md`, `CHANGELOG.md` | notes |

## 8. Testing Strategy

- **Unit**: the resolver on a fixture tree — source at depth 2, destination at depth 3, targets
  in-repo and under `docs/`; fenced/inline-code links skipped; placeholder set skipped.
- **Integration**: `npm run bundle` twice → second run no-diff; checker → 0 broken.
- **Mutation**: revert the pass → checker red; delete the floor → checker must fail on an empty walk.
- **Suite**: `command npm test`, `command npm run bundle -- --check`, `validate.yml` locally
  (`quick_validate.py` loop).

## 9. Success Criteria

1. Checker reports **0** broken links over `skills/**/*.md` + `shared/resources/**/*.md`, with ≥ 200 files and ≥ 1,000 links visited
2. `npm run bundle` is idempotent after the change (second run: no diff)
3. A zip produced by `package_skill.py` contains no broken relative links (checked inside the extracted tree)
4. The checker runs in CI (`validate.yml`) and locally (`npm run validate:all`)
5. Mutation proof recorded: reverting the bundler pass turns the checker red
6. The 2026-08-20 audit note is updated to point at this task

## 10. Risk Assessment

**Medium.** The rewrite touches every bundled Markdown file; a wrong rule breaks 229 files in one
commit. Mitigation: the checker exists *before* the rewrite (phase 1), so the rewrite is measured, not
believed. The absolute-URL choice for `docs/` targets pins a branch name (`develop`) into shipped
files — acceptable, but record it in the plan and make it one constant.

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

---

## Progress Tracking

### Phase 1: measure
- [ ] Link-check script over `skills/**/*.md` committed under `tests/` with a non-vacuity floor; baseline count recorded
### Phase 2: rewrite in the bundler
- [ ] `bundle_skill.py` re-relativises (or absolutises) depth-relative links in bundled `.md`
- [ ] `package_skill.py` does the same for the zip path
### Phase 3: guard
- [ ] Link check wired into `validate.yml` and `npm run validate:all`; mutation-proved
- [ ] 2026-08-20 audit note updated

---

## References

- **Plan**: [`task.108.plan.bundler-rewrites-relative-links.md`](task.108.plan.bundler-rewrites-relative-links.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Related Skill**: `.agents/skills/create-skill/` (`scripts/bundle_skill.py`, `scripts/package_skill.py`)
- **Prior note**: `docs/reference/develop-story-pipeline-audit.2026-08-20.md:179-182`
- **Observation**: #64

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.108.bundler-rewrites-relative-links/task.108.bundler-rewrites-relative-links.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
