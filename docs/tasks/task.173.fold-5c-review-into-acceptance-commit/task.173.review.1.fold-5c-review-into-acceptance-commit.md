# Task Review Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit

**Reviewed:** 2026-10-08
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-10-08

---

## Executive Summary

The task's premise holds: every current-state claim was re-measured on `develop` @ `3a62c860`, the
one git invariant it rests on was executed, and the doc-only classifier behaves as stated. The gaps are
in how the work will be held: the 5c carry path is specified as numbered prose that no test can run,
and the list of index-sweeping commits carries no search. Both are fixable in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run; defaults recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the Important fixes, applied in Step 8.5)

---

## User Decisions & Clarifications

This review ran inside `/develop-next` → `/develop-task` Step 2, which is autonomous. No question
point needed a human decision: every finding below has a single fix that the task's own scope implies.

- **QP1 (structure & scope):** no question — the template is complete and the scope is stated.
- **QP2 (technical):** no question — the carry path's executable form is dictated by obs #258 (a
  behaviour fix in prose must land in an executable block).
- **QP3 (completeness):** no question — the other index sweepers are classified, not re-scoped.

Pre-pass agents B and C were **not dispatched**; both passes were performed inline by the reviewer.
Independence loss recorded: the architecture and codebase scans are the same reader as the review.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present. `type: task`, `description`,
  `tags` present (OKF conformant). No placeholders.
- Tracker linkage: `github_issue: 540`, body link `[#540](…/issues/540)` matches.
- Card preflight: `sync-jira-task.js --check-card` → "No problems found. 3 card blocks resolve".
- `doc-links.js`: 1 relative link resolves.
- Change Log present; status `planned` with an `Initial draft` row is current.
- Sign-off not enabled in `skills-config.yaml` — not checked.

---

## 2. Technical Accuracy

**Status:** ACCURATE (anchors drifted)
**Hallucinations Detected:** 0

Every named mechanism exists and does what the task says:

- 5c verdict table: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1391–1393`; the CONCERNS
  row says "Record the findings … **Do not block.**" with no commit rule.
- `/review-pr` stages its report: `skills/review-pr/SKILL.md:808`, "the pipeline commits these files
  next anyway" at `:814`.
- `/finalise` 6a: `skills/finalise/SKILL.md:1307`; `git add "${ADD_PATHS[@]}"` at `:1349`; bare
  `git commit -m "${COMMIT_MSG}${REG_SUFFIX}"` at `:1370`; "NOT staged here" comment at `:1325`.
- `/finalise` 8a: prose `git commit` bullet at `:2655`; `--git-base "$CI_HEAD_1"` at `:2663`, deriving
  `touched` from `git diff --name-only <base>..HEAD` (`:2666`). 8a runs from Step 8 (gaps), which is
  before Step 7's 6a — so a staged 5c set **is** still staged when 8a commits. Claim confirmed.
- PreCompact hook: `shared/resources/develop-pipeline-on-precompact.sh:211–212`.
- Step-7 boundary check: `shared/resources/develop-pipeline-step-7-finalise.md:154`.
- `ci.docsOnly.patterns`: `docs/reference/configuration.md:260`; this repo overrides to `["docs/**"]`
  (`skills-config.yaml:50`). Dependency task.172 merged via PR #542.

**Check 11 — invariant executed.** Scratch repo: stage `a` and `b`, `git commit -m only -- a` →
`git show --name-only HEAD` lists `a`; `git status --porcelain` shows `A  b`. Holds.

**Doc-only classifier executed.** `matchesAnyGlob("docs/tasks/x/y.md", ["docs/**"])` → `true`;
`matchesAnyGlob("skills/x/SKILL.md", ["docs/**"])` → `false`. Matches § 8's expectations.

**Check 15 — removed-literal sweep.** `git grep -n 'pipeline paused at step\|context compaction imminent' -- '*.test.*'`
→ no hits; `git grep -n 'NOT staged here\|registry ticked\|REG_SUFFIX' -- '*.test.*' 'evals/**'` → no
hits. No test pins a literal this task changes.

**Check 18 — runner reach.** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs` is
reached by `package.json`'s `'shared/resources/tests/*.test.mjs'` glob; `develop-pipeline-on-precompact.test.sh`
is listed by name. Reached.

### Important

- **I3 — The index-sweeper list carries no search (check 20).** § 1 and § 2 assert "two other commits
  … commit the whole index". The search
  `git grep -nE 'git commit( |$)' -- 'shared/resources/*.md' 'shared/resources/*.sh' 'skills/*/SKILL.md'`
  filtered to pipeline sources finds a third bare commit — the QA loop's path-1 gate commit
  (`develop-pipeline-step-5-6-qa-loop.md:395`) — plus the `/commit-changes` sweeps at 5b and at every
  HALT. Each runs **before** 5c on the normal path, so no carried set exists yet; the one state where
  a carried set meets them is a finalise DoD-gaps HALT followed by re-entry at 5a (task.170). There
  the set rides the HALT or path-1 commit and is pushed — nothing is lost. The document must record
  the search and classify each site.
- **I4 — Doc sweep for the pause commit.** `shared/resources/develop-pipeline-hooks.md:50` and
  `shared/resources/develop-pipeline-pause.md:141` restate the pause commit as
  `git add <report> && git commit -m …`. After Phase 1 that restatement is wrong. Add both to the
  Files Summary.

### Optional

- **O1 — Line anchors drifted** (claims true, coordinates moved): `:1315`→`:1392`,
  `finalise :1302`→`:1370`, `:2537`→`:2655`, `:2545`→`:2663`, step-7 `:147`→`:154`,
  review-pr `:421`→`:808`, `:427`→`:814`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are ordered (Phase 1 before Phase 2, stated with the reason), files are named, and the plan
gives concrete blocks. `estimated_effort_hours: 8` is consistent with 4 phases and ~11 criteria.

### Optional

- **O2 — 6a `EXTRA` comparison must normalise paths.** `git diff --cached --name-only` prints
  repo-root-relative paths; `ADD_PATHS` holds substituted paths, and `newest_numbered` echoes the
  directory as given. A `./docs/…` spelling on one side makes every path "extra" and the suffix fire
  falsely. Strip a leading `./` when building the comparison set. Also state that in a standalone
  `/finalise`, anything the operator staged by hand counts as carried — the suffix then reads
  correctly as "the commit carried more than the acceptance artefacts".

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I1 — The 5c carry path is prose no test can execute (obs #258).** Functional criterion 1 ("pushes
  no commit between the last QA push and 6a") is a behaviour criterion, and its fix lands in a skill
  document as a numbered list. Fix: write the carry as a **fenced bash block** in the 5c subsection —
  assert the report is staged (stage it if not), classify each finding with the `glob-match.js`
  snippet, stage exactly the doc-only paths, and contain no `git commit` / `git push`. The new test
  extracts that block and runs it in a scratch repo, asserting `HEAD` is unchanged and the paths are
  staged.
- **I2 — Criteria do not name the tests that hold them (check 4).** Map each criterion to its test:
  Functional 1 + Performance 1 → the carry-block test (commit count between the QA head and 6a is
  zero, then one); Functional 2 → the 6a carry test; Functional 3 → the 8a narrowing test;
  Functional 4 → the PreCompact staged-sibling case; Functional 5 → the doc-only classification test.
  Performance 2 ("CI runs drop by one") is not measurable per PR: it follows from Performance 1
  because the pipeline pushes every tail commit, and the criterion should say so and cite that test.
- *(Withdrawn during review: `glob-match.js` is already bundled into `develop-task`, `develop-story`
  and `finalise` `references/` — `ls skills/develop-task/references/glob-match.js` exists.)*

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are named with mitigations; rollback is phase-granular and Phase 1 is independently correct.

### Optional

- **O3 — Reconstruction states (check 19).** The task changes no resume rule, and says the index is
  durable across processes. I3's re-entry-at-5a state is the one reconstruction path that meets a
  carried set; it is now named there.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues

1. I1 — carry path as an executable fenced block, run by the new test.
2. I2 — map every criterion to its test; re-scope Performance 2.
3. I3 — record the sweeper search and classify the path-1 commit and `/commit-changes` sweeps.
4. I4 — add `develop-pipeline-hooks.md` and `develop-pipeline-pause.md` to the Files Summary.

### Consider (Optional) - 3 items

1. O1 — refresh drifted anchors.
2. O2 — normalise `./` in the 6a `EXTRA` comparison.
3. O3 — re-entry at 5a named (folded into I3).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 7/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** once the four Important fixes are applied (done in Step 8.5).

**Justification:** Every claim the plan rests on was measured or executed and holds; the remaining work
was making the carry path testable and the sweeper inventory searchable.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous via /develop-task Step 2)
- **Review Date:** 2026-10-08
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.fold-5c-review-into-acceptance-commit.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (via always-load), `docs/reference/configuration.md`
