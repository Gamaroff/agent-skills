# Task Review Report: Task 158 - QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment

**Reviewed:** 2026-09-29
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 Important recommendations implemented — 2026-09-29

---

## Executive Summary

Every technical claim in the task was checked against the code and holds: the six gate lookups,
the two bare `startsWith("..")` sites, the three `isWithin` copies and the discarded resolved paths
in `checkDocument` are all where the task says. Two gaps would have surfaced during develop: the
helper is not bundled into the pipeline skills whose step docs will call it, and the task does not
say what a block does when `--path gate` refuses an ambiguous cycle.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous `develop-task` run; no finding needed a user decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review ran as `develop-task` Step 2 under the autonomous defaults. Both Important
findings have one evident fix, and the task already fixes the design.

---

## Pre-pass summaries

- **PREPASS_B** (architecture alignment, `prepass-axes.js` source `architecture`): `aligned`.
  Axes checked: What this repo produces, SKILL.md authoring, File naming, Cross-skill resources,
  Plan files, Validation before commit, Do not. Three low findings, all pre-existing layout
  (tests under `shared/resources/tests/*.test.mjs`; ESM import between two shared engines;
  `qa-cycle.sh` edits covered by `lint:shell` inside `npm run ci`). No action.
- **PREPASS_C** (codebase scan): `not-implemented`, no findings. Independently confirmed: both
  `security-probe.mjs` sites (lines 415, 868) still use a bare `startsWith("..")`.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References are present. There are no placeholders.
- OKF: `type: task`, `description` and `tags` are present.
- Tracker: `github_issue: 494` resolves (OPEN), and the body link `[#494](…/issues/494)` matches.
- Card preflight: `sync-jira-task.js --check-card` exits 0 (Summary, Success Criteria, Breaking Changes resolve).
- Change Log: present and current for `planned`. Sign-off is not configured.
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE — 0 hallucinations

Verified by reading or running:

- **Gate lookups**: `git grep -n -E 'find [^|]*gate' -- ':(glob)skills/*/SKILL.md' ':(glob)shared/resources/*.md'`
  lists the six named sites: `qa-task` 161/1496, `qa-story` 238/2076, `step-5-6` 142/150,
  `resume-contract` 430, `step-7` 346. It also lists the out-of-scope `PRIOR_GATES` counts and
  prose-only matches.
- **Invariant (check 11), run**: in a directory holding `task.9.gate.02.x.yml`, `qa-cycle.sh` prints `2`,
  `--path gate` names the file, and the literal `find -name 'task.*.gate.2.*.yml'` finds nothing.
  This is the defect the task describes.
- **Containment, run**: `isWithin("/repo", …)` gives `/repo` → true, `/repo/..fixtures/x` → true,
  `/repo/../x` → false, `/x` → false, `/repo/a/../../x` → false, `/repofoo/x` → false, and
  `isWithin("/", "/a")` → true. The root-equality caveat in § 3 is therefore correct:
  `security-probe` must keep `entryPath === root` as a separate refusal.
- **Read-back**: `checkDocument` (doc-links.js:295) computes `resolved` per link and returns only
  `links: links.length`. The additive `resolved[]` is the smallest change. Real documents link with a
  `./` prefix (`](./task.149.gate.8.qa-evidence-integrity.yml)`), and `path.posix.normalize` strips it.
- **Outcome reachability (check 10)**: the "exit 1 naming both links" outcome is produced by a branch
  that Phase 1 states (condition and outcome). The resume-contract "reconstructs 0" outcome follows
  Phase 2's stated rc-1 → 0 mapping.

### Important

- **I-1 — `qa-cycle.sh` is not bundled into the skills whose step docs will call it.** It exists in
  `qa-task` and `qa-story` only. `develop-pipeline-step-5-6-qa-loop.md` is bundled into
  `develop-story` and `develop-task`. The resume contract and `step-7-finalise` are bundled into
  nine skills (`develop-bug develop-story develop-task qa-fix qa-story qa-task review-pr review-story
  review-task`). A block that calls `.agents/skills/develop-task/references/qa-cycle.sh` would be
  `rc 127` in every consumer install. The shared step docs must carry the
  `shared/resources/qa-cycle.sh` bundling literal (CLAUDE.md § Shared Resources). The new bundled
  copies must be committed. The existing "helper is bundled into every skill whose prose calls it"
  test must cover the skills that bundle these docs, not only `qa-task`/`qa-story`/`qa-fix`.
- **I-2 — the ambiguous-cycle path is unspecified.** When two files claim the current cycle,
  cycle mode exits 0 (`2`) and `--path gate` exits 1. This was run in a scratch directory holding
  `task.9.gate.2.x.yml` and `task.9.gate.2.y.yml`. A block that treats `--path` rc 1 as "no gate"
  would silently take the first-review branch at Phase 0 (`LATEST_GATE` empty). At Step 13b it would
  post `BLOCKING_COUNT=0`, which is the defect this task fixes, reached another way. The spec must say
  that a non-empty cycle plus a `--path` refusal stops the block with the helper's message.

### Optional

- **O-1 — `step-5-6` § "Finding the Latest Gate File" is stem-keyed today** (`story.{epic}.{story}.gate.*.yml`).
  Moving it onto `qa-cycle.sh`'s `*.gate.*.yml` widens it to any co-located gate. No bug gate exists in
  the tree today (`git ls-files | grep -E 'bug[^/]*\.gate\.'` → 0 lines), and Known Issues already
  records the stem-filter follow-up. No change is needed, but name it when the site moves.
- **O-2 — effort**: 8h is plausible for 4 phases of this size. Not recomputed.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after I-1/I-2). The phases name the files and the changes. Their dependencies
are stated as independent in § 11.

## 4. Consistency & Completeness

**Status:** CONSISTENT. The Files Summary matches the phases. Each success criterion maps to a phase
checkbox and a test.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Both medium risks have a concrete mitigation and a test. Rollback works per
phase, because the three mechanisms are disjoint.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. I-1: bundle `qa-cycle.sh` into the skills that bundle the three step docs, and widen the bundled-helper test (applied to § 3, Phase 2 and § 7).
2. I-2: a cycle with a `--path` refusal stops the block, and never proceeds with an empty file (applied to § 3 and Phase 2).

### Consider (Optional) - 2 items

1. O-1: note the stem-keyed step-5-6 site when it moves.
2. O-2: none.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 7/10 (before I-1/I-2)
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** There are no critical issues, and every claim checked against the code held. Both
Important gaps are applied to the task document.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-09-29
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.158.cycle-file-and-containment-definitions/task.158.cycle-file-and-containment-definitions.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Pre-pass agents:** B and C dispatched in parallel 15:02 → both returned by 15:04
