# Task Review Report: Task 152 - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Reviewed:** 2026-09-26
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 applied recommendations implemented — 2026-09-26 (I1, I2, O1; O2 and O3 recorded, not applied)

---

## Executive Summary

The task is well-evidenced: every code anchor it relies on was re-read, and all but two resolve to
the thing they name. The plan is concrete, each phase has a test and a mutation proof, and the two
parts are independently revertible. Two Important gaps were found — the path form of the new
fenced-block helper calls is not pinned, and Phase 7 omits the ShellCheck run a new `.sh` file
needs — both fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — defaults recorded below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task` (dispatched by `/develop-next`), so no questions were asked. Output
format was auto-answered "Comprehensive report"; Step 8.5 "apply all critical + important fixes";
Step 9 "Yes, fixes complete". No finding needed a judgement the document did not already settle —
the four Open Questions in § 10 each carry a recorded default, and this review agrees with all four.

---

## Pre-pass Summaries

| Agent | Result |
| --- | --- |
| B — architecture alignment | `drift` — (medium) new `.sh` helper but Phase 7 omits ShellCheck; (low) `quick_validate.py` vs `npm run validate:all`; (low) `status-history.js` exit 1→2 is documented |
| C — already implemented | `not-implemented` — `fill-verification-complete.sh`, `artifactPaths`, `isCoLocatedArtifact`, `KNOWN_ARTIFACT_*`, `normaliseStatus` all absent |

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Progress Tracking, References and Notes.
- OKF frontmatter: `type: task`, `description`, `tags` all present.
- No placeholders.
- Change Log present (advisory currency check passes — status is still `planned`).
- Tracker: `github_issue: 482` exists; body link `[#482](…/issues/482)` matches.
- Card preflight: 3 card blocks resolve, no findings.
- Sign-off: not enabled in `skills-config.yaml` — not checked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (minor)
**Hallucinations Detected:** 0

Line anchors re-read with `sed -n`: `finalise/SKILL.md` :96, :857, :956, :2138, :2180, :2192,
:2275, :2290, :2347 all resolve; `status-history.js:202` (`main`), `finalise-fix-and-recheck.mjs`
:69/:71/:150–165, the preconditions JSON `inside-files-summary`, and `doc-links.test.mjs:316–330`
all resolve. The skip table has 17 rows and Step 8 carries zero bug mentions, as claimed.

Relative links: `doc-links.js --file` exits 0 on the task and on the plan file.

Outcome reachability (check 10): the 8.5 bug-mode branch reads `## Step 5: Acceptance Decision`
bounded at the next `## `. In `assets/bug-dod-template.md` that section's only `- [ ]` lines would be
the gaps under `**Outcome:**` (the other bullets are `- QA record: …` style), so `GAP_COUNT` equal to
the fixture's gap lines is reachable. The helper's "refuse the other verdict" outcome is stated by
Phase 1 as a new branch. Each evaluator refusal in Phase 4 maps to one of the six stated conditions.

### Important

- **I1 — the path form of the new fenced-block helper calls is not pinned.** Phase 1 says 7.1 calls
  the helper "through `.agents/skills/finalise/references/`", but Phase 2's new `gaps-status-history-row`
  call and 8.1's `gaps` fill do not say how they address their helper. `create-skill` § "A helper a
  fenced block executes is addressed from the repository root" requires
  `.agents/skills/{skill}/references/<file>`. The neighbouring 7.3 block uses the bare
  `node references/status-history.js` form, which a developer copying it would reproduce.
  **Fix:** state the root-anchored form for every new fenced-block call in Phase 2.

### Optional

- **O1 — two drifted anchors.** `doc-links.js:197` (`trackedSet()`) is now `:204`; `doc-links.js:287`
  (`usage()`) is now `:362`. The claims are true; the coordinates moved. **Fixed.**
- **O2 — pre-existing bare `references/` calls in 7.3 and 8.5.** `node references/status-history.js`
  (7.3) and `node references/stakeholder-summary-cli.js` (8.5) predate this task. Phase 2 edits the
  8.5 block, so re-addressing its call in the same edit is cheap; 7.3 is outside Phase 2's edit.
  Recorded, not applied to the document — the developer decides at the edit site.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Seven phases, each with files, risk level, checkboxes and a named test. Phases are ordered so a
Part A / Part B split is mechanical. Effort 16h against 7 phases, ~20 success criteria, medium risk —
within 2× of the rubric; no finding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (minor)

- Files Summary matches the phases (8 core, 4 tests, generated copies, CHANGELOG).
- Every success criterion names its test file.
- Scope: two parts in one task; § 10 Open Question 1 records why and keeps the split mechanical. Accepted.

### Important

- **I2 — Phase 7 omits ShellCheck for the new `.sh`.** `fill-verification-complete.sh` is a new
  tracked shell source. `scripts/lint-shell.sh` (the local twin of `.github/workflows/shellcheck.yml`)
  covers it automatically via `git ls-files '*.sh'`, and the develop-next merge gate runs
  `npm run ci`, which ends in `lint:shell` — but Phase 7's list (`ci:fast`, `format:check`,
  `bundle:check`, `quick_validate.py`) would let a ShellCheck finding surface first in CI.
  **Fix:** add `npm run lint:shell` to Phase 7 and the Code Quality criterion.

### Optional

- **O3 — `quick_validate.py` on four skills vs `npm run validate:all`.** The merge gate runs
  `validate:all` anyway; the per-skill run is a faster local subset. Recorded, not changed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The widened admission rule (`artifactPaths`) is anchored to a valid `documentPath`, same directory
and same stem, with a refusal test per condition; the partial rollback covers each part alone.
Mermaid flowchart in § 3 matches the prose (DOC_KIND branch at 8.3, two 8.5 sources).

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 2 issues

1. I1 — pin the root-anchored path form for the new fenced-block calls in Phase 2. **Applied.**
2. I2 — add `npm run lint:shell` to Phase 7 and the Code Quality criteria. **Applied.**

### Consider (Optional) - 3 items

1. O1 — correct two drifted `doc-links.js` anchors. **Applied.**
2. O2 — re-address the bare `references/` call in 8.5 while Phase 2 edits that block.
3. O3 — `validate:all` vs `quick_validate.py` (no change).

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both Important findings are one-line document fixes, now applied.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; run tests after each phase; mutation-prove each fix as § 8 lists.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, inside /develop-task)
- **Review Date:** 2026-09-26
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.152.finalise-gaps-path-and-artifact-links/task.152.finalise-gaps-path-and-artifact-links.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md (via pre-pass B); skills/create-skill/SKILL.md (helper path rule)
