# Task Review Report: Task 203 - Migrate documents to hierarchical numbering

**Reviewed:** 2026-10-15
**reviewed_blob:** c3ef9ab74cb2321dd69a25e108eeac2cfdc21287
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** NEEDS IMPROVEMENT (before fixes) → GOOD (after fixes)

> **Implementation Status**: ✅ All 7 critical + important recommendations implemented — 2026-10-15

---

## Executive Summary

A well-scoped task whose dependency gate holds: task.202's `doc-id.js` is merged and exports every name the plan calls. The review found one Critical defect: seven `.validate.{date}.md` reports in the tree sit outside doc-id's artifact vocabulary. As planned, they would be renamed into documents that `checkCorpus` flags, so the run would always end `post-check-failed`. It also found six Important gaps: the PRD registry does not exist and the plan never creates it; the path-literal site list disagrees with its own search; three standards go stale on merge; the plan re-implements a resolver `doc-id.js` already exports; the parent-PRD rule is ambiguous; and three criteria have no planned test or measuring command. All seven were fixed in the task document.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked. This was an autonomous pipeline run (`/develop-next` → `/develop-task --defaults`), so every decision below took the recommended option and is recorded as such.
**Implementation Readiness:** 8/10 after fixes (6/10 before)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked, because this review ran inside an autonomous develop pipeline. The auto-answers were:

- Step 0 output format: Comprehensive report (pipeline default).
- Step 8.5 apply fixes: Yes, apply all critical + important fixes (pipeline default).
- Step 9 status: Yes, fixes complete → Ready for Development (pipeline default).
- **C1 (the `validate` artifact):** the reviewer chose to extend the one shared vocabulary (`ARTIFACTS` plus `WORK_ITEM_ARTIFACT_RE`, which the existing contract test pins equal). The alternatives were to special-case the files in the engine, or to accept a permanent `post-check-failed`. `review-story` is a live writer of `.validate.{date}.md` (`skills/review-story/SKILL.md:147`), so a special case would only defer the same failure to the next validate report.
- **I2 (literal-pass scope):** the reviewer chose the reading the task already states ("bodies stay frozen", "fixtures are out of scope") over widening the rewrite.
- **I3 (stale standards):** the reviewer chose to fix the three sentences that become false at merge, and to leave the full prose sweep with task.207.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References are present. There are no placeholders.
- OKF: `type: task`, `description` and `tags` (as a list) are present.
- Tracker: `github_issue: 646` exists (OPEN). The body link `[#646](…/issues/646)` matches.
- Card preflight: 3 card blocks resolve (`sync-jira-task.js --check-card`, exit 0).
- Change Log present (`change-log.enforcement` defaults to advisory). Sign-off is not configured, so it was not checked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

**Pre-pass B (architecture):** `alignment: drift`, `axes_checked: [What this repo produces, File naming, Cross-skill resources, Registries, Validation before commit, Do not]`, from `prepass-axes.js` with source `architecture`. Dispatched at 07:14Z; returned in 27 s (`duration_ms` 26653).
**Pre-pass C (codebase):** `implementation_status: not-implemented`. Returned in 22 s (`duration_ms` 21512).

### Critical

- **C1. `.validate.{date}.md` reports are outside doc-id's artifact vocabulary, so the post-check can never be clean.**
  - **Location:** § 3 "Artifact names use two infix shapes"; Phase 1 `discover`; Success Criteria "`doc-id check --corpus` is clean".
  - **Evidence:** Seven tracked files carry a `validate` infix (`git ls-files docs/prd | grep -c '\.validate\.'` → 7). `validate` is not in `ARTIFACTS` (`doc-id.js:47`), so:
    - `parseLegacy('story.1.1.validate.2026-05-12.md')` → `{ok:false, reason:"bad-artifact"}`.
    - After renaming, `checkCorpus` walks `story.1.1.1.validate.2026-05-12.md` as a *document*: `parse` fails, and `looksLikeArtifact` finds no keyword. It then reports `bad-shape`. Ran with an injected io:

      ```
      [{"reason":"bad-shape","path":"R/story.1.1.1.validate.2026-05-12.md","detail":"story.1.1.1.validate.2026-05-12.md: bad-artifact"}]
      ```

    - The task's own exit contract then answers `post-check-failed` on every run over this repository.
  - **Recommendation (applied):** Phase 0 adds `validate` to `ARTIFACTS` in `doc-id.js` and to `WORK_ITEM_ARTIFACT_RE` in `finalise-fix-and-recheck.mjs`. The `doc-id.test.mjs` contract test pins the two equal, so both change in one commit. Artifacts are renamed by old-prefix substitution, never by requiring `parseLegacy` to succeed. The seven files contain no relative links, so the doc-links ratchet partition is unaffected (`doc-links.js --file` on each: 0 links).

### Important

- **I1. The PRD registry does not exist, and the plan never creates it.** `docs/prd/prd-registry.md` is absent (`ls` → No such file). `nextNumber("prd", …, null)` throws `registry-missing` (`doc-id.js:473`). The standard says *"task 203 creates this repository's own registry"* (`docs/standards/prd-registry.md`, Interim note), but neither the task nor the plan says how. **Applied:**
  - When the registry is absent and no numbered PRD exists, the engine creates it from the standard's format with counter `1`.
  - When it is absent but a numbered PRD is already on disk, the run blocks with a new eighth code, `registry-missing`, and never invents rows.
- **I2. The path-literal site list disagrees with its own search.** Re-running the task's recorded search (`git grep -n 'docs/prd/onboarding' -- ':!docs/prd' ':!docs/tasks'`) finds two sites the table does not name:
  - `examples/prd-example/prd.onboarding.md` (7 lines). These are *body* text of a captured copy. The task says those bodies stay frozen, but the planned literal pass (exact old paths, every tracked `*.md` outside history) would rewrite three of them.
  - `skills/sync-jira-epic/tests/relative-doc-links.test.js` (7 lines). These are synthetic fixture strings, and fixtures are out of scope. The pass covers `*.js`, so it would rewrite them.

  **Applied:**
  - The literal pass skips the bodies of files under `examples/**`. Their frontmatter `prd_source:` and `source_path:` are still rewritten.
  - It skips test files (`*.test.*`, `tests/**`, `evals/**`), except `shared/resources/tests/doc-links.test.mjs`, which is named explicitly.
  - The site table now lists both sites with their disposition.
- **I3. Three standards become false at merge** (pre-pass B, medium). These sentences describe the epic registry as live until task 203 retires it:
  - `docs/architecture/concepts/coding-standards.md:64` (always-loaded): *"Source of truth: `docs/development/epic-registry.md`. Interim … until task 203 migrates them"*
  - `docs/standards/epic-registry.md` *"still governs … until task 203 … retires it"*
  - `docs/standards/file-naming.md:92` *"governs the legacy `epic.{number}` shape until task 203 retires it"*

  **Applied:** Phase 4 updates those three sentences to say the registry is retired. The skill-prose sweep stays with task.207.
- **I4. The plan re-implements a resolver `doc-id.js` already exports** (check 6). The plan reads `PRD_ROOT` "like `resolve-paths.sh`" and edits frontmatter by its own line scan. `doc-id.js` exports `resolvePrdRoot` (`:853`; `--prd-root` → `skills-config.yaml` `prd.prdShardedLocation` → `docs/prd`) and `frontmatterField` (`:543`). A second resolver can drift from the first. **Applied:** the engine reads `PRD_ROOT` through `resolvePrdRoot` and frontmatter values through `frontmatterField`. `--root` maps to `--prd-root`.
- **I5. The parent-PRD rule for `prd-less-epic` is ambiguous** (check 10). § 3 lists `brownfield-enhancement` *or* "no PRD in an ancestor dir", and the success criterion expects `blocked` for a `brownfield-enhancement` epic. What happens when location and `prd_source` disagree is unstated. `create-epic` writes a brownfield epic under `${PRD_ROOT}/{domain}/{feature}/epics/` with no PRD file beside it (`skills/create-epic/SKILL.md:92,109`). **Applied:**
  - **Location is authoritative.** The parent is the PRD document that owns the epic's `epics/` directory.
  - `prd_source` is rewritten and is never used to place an epic.
  - An epic with no owning PRD is `prd-less-epic`, whatever its `prd_source` says.
- **I6. Three criteria have no planned test or measuring command** (checks 4 and 11):
  - *"finishes in under 5 seconds"* is wall-clock, so it needs the measuring command and its load: `uptime; time …` on the head commit.
  - *"one `git mv` per tracked file, no repeated full-tree walks"* is a behaviour a per-PR test can assert, by injecting the io and counting calls. No test was named.
  - *"No new `story\.(\d+)` regex"* is held by task.207's test, which does not exist yet.

  **Applied:** the criteria now name the commands and tests that hold them.

### Optional

- **O1.** § 2's link figures (192 / 17 / 10 / 19) cite *"the link scan in the plan file, Phase 4"*, which the plan does not contain (check 7). **Applied:** the figures are now attributed to the engine's dry-run link index, and the implementation report records the measured numbers.
- **O2.** The legacy shapes cite `v0.55.0`. The latest release tag is `v0.57.1` (`git tag --list 'v*' --sort=-v:refname | head -1`). The shape-defining files are byte-identical between the two (`git diff --stat v0.55.0 v0.57.1 -- docs/standards/{prd,story,epic}-documents.md docs/standards/file-naming.md skills/{create-prd,create-epic,create-epics-from-shards,shard-prd,qa-gate}/SKILL.md` → empty). No change is needed. Noted for the record.
- **O3.** Pre-pass B flagged `.mjs` under `shared/resources/` as scoped to the eval harness in `tech-stack.md`. There is precedent (`generate-prd-epic-index.mjs`, `finalise-fix-and-recheck.mjs`), and the plan follows the first's layout. No change.

### Verified correct

- **Dependency gate.** `doc-id.js` is CommonJS, landed in `e28a1cce`, and exports `parse`, `parseLegacy`, `format`, `matchesEpic`, `next`, `nextNumber`, `check`, `checkCorpus`, `resolvePrdRoot`, `registryNumbers` and `frontmatterField`. There is no row writer, so `appendPrdRow` is correctly planned.
- **Corpus figures.**
  - 146 tracked files and 17 non-`.md` files.
  - 22 documents and 106 canonical artifacts once renamed, plus the 7 `validate` files of C1.
  - 11 `sprint-review-summary.md` (the doc-id simulation in this review).
  - Story main docs: 16 `accepted` and 1 `cancelled`.
- **`checkCorpus` layout.** It reads the parent two directories up (`doc-id.js:690`), which matches the target tree in § 3 for both epics and stories.
- **Unprefixed `sprint-review-summary.md` is skipped by `checkCorpus`.** The kind word is absent, so keeping the basename is safe.
- **Test reach.** `package.json` runs `shared/resources/tests/*.test.mjs`, so the new test is reached (check 18).
- **Selector.** `select-next.mjs` never selects from the PRD registry (only `bugs` and `tasks` call `parseRegistry`, `:1493–1498`), so creating it changes no selection.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. The phases carry files, risks and dependencies. Phase 0 now owns the vocabulary change (C1) and the registry bootstrap (I1).

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes.
- Files Summary now lists `finalise-fix-and-recheck.mjs` and the three standards.
- The blocker table now has eight codes, and the plan matches it.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE.
- Rollback is a single commit revert, and all verification happens before the first write.
- The vocabulary change (C1) widens what finalise and doc-links treat as an artifact. It is now listed as a Medium risk with its test: the existing `doc-id.test.mjs` classification-agreement test runs over every tracked task and bug file.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue (applied)
1. Add `validate` to the shared artifact vocabulary, and rename artifacts by prefix (C1).

### Should Fix (Important) - 6 issues (applied)
1. Bootstrap the PRD registry, and add the `registry-missing` blocker (I1).
2. Bound the literal pass: no `examples/**` bodies, no test fixtures except doc-links (I2).
3. Correct the three standards that go stale at merge (I3).
4. Reuse `resolvePrdRoot` and `frontmatterField` (I4).
5. Make location authoritative for the parent PRD (I5).
6. Name the test or command for each of the three unheld criteria (I6).

### Consider (Optional) - 3 items
1. Attribute the link figures to the engine's dry run (O1, applied).
2. The release-tag note (O2, no change).
3. The `.mjs` precedent (O3, no change).

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes)

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one defect that made success unreachable (C1) is fixed in the document, and every Important gap now names its rule or test. What remains is the risk the task already states: link rewriting at scale.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-task Step 2)
- **Review Date:** 2026-10-15
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.203.migrate-doc-numbering/task.203.migrate-doc-numbering.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md` (pre-pass B); `docs/standards/prd-registry.md`, `docs/standards/epic-registry.md`, `docs/standards/file-naming.md`
- **Subagents:** pre-pass B and pre-pass C, both dispatched 07:14Z and both returned within 30 s
