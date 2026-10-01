# Task Review Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Reviewed:** 2026-10-01
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-10-01

---

## Executive Summary

The task is well specified and its citations are accurate. Every `path:line` anchor, the three call-site
rollup queries and the `read -r` binding claim were re-measured and hold. Two Important findings, both
about this repository's own `checkCommand`, were fixed in the task and its plan.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (pipeline mode: autonomous defaults, see Decisions)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Run inside the `develop-task` pipeline: output format auto-answered "Comprehensive report", Step 8.5
auto-answered "apply all critical + important fixes", Step 9 auto-answered "fixes complete". Both
Important findings had one defensible fix, so no question was needed.

---

## Pre-pass

Run inline, not by Explore subagents (Explore subagents hung three times in earlier sessions on this
repository). **Independence of the pre-pass was lost**: the same session that read the task also
checked it.

- **Architecture alignment (PREPASS_B):** `aligned`. `prepass-axes.js` `source: architecture`; axes
  checked: What this repo produces, SKILL.md authoring, Cross-skill resources, Platform branching,
  Validation before commit, Do not. The task follows the cite-or-depend bundling rule and puts shared
  code in `shared/resources/`.
- **Codebase scan (PREPASS_C):** `not-implemented`. No `ci-tree-equivalence.js` or `glob-match.js`
  exists; `ci.docsOnly` is read nowhere.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 mandatory sections present, no placeholders. `type: task`, `description`, `tags` present (OKF).
- Change Log present and current for `status`. Sign-off not enabled.
- Tracker linkage: `github_issue: 539` set. Card preflight
  (`sync-jira-task.js --check-card`): 3 card blocks resolve, no problems.
- `doc-links.js`: 1 relative link, resolves.

**Optional:** `estimated_effort_hours: 16` was not recomputed against the effort rubric. Non-blocking.

---

## 2. Technical Accuracy

**Status:** ACCURATE. Hallucinations detected: 0.

Re-measured on 2026-10-01:

| Claim | Result |
| --- | --- |
| `finalise/SKILL.md` anchors `:780 :872 :885 :897 :1379 :1416 :1436 :1476 :1507 :2554` | all resolve to the named thing |
| `develop-next` `:182 :195`, `develop-batch` `:373 :403 :415` | all resolve |
| `qa-diminishing-returns.js` `:121 :180 :194`, exports `:1060-1066` | all resolve |
| `gh-stage.js:48` requires `yaml-subset.js`; `:167` reads `skills-config.yaml` | confirmed |
| Default patterns `["**/*.md","docs/**"]` | `README.md`, `skills/x/SKILL.md`, `CHANGELOG.md`, `docs/a/b.yml` match; `.github/workflows/ci.yml`, `src/a.ts` do not |
| `["docs/**"]` override | does not match `skills/x/SKILL.md` or `README.md` |
| `read -r` with four names binds the rest of the line to the last | `D=[60s TREE_EQ=def]` |
| Only two bundled copies of `qa-diminishing-returns.js` (`develop-story`, `develop-task`) | confirmed, so the "every existing bundled copy" regeneration is two files |

Check 14 (call-site population): not applicable, the task enumerates none of the five named engines.
Check 12 (released-shape diff): not applicable, no legacy format handling.

### Important

**I1. The repository's `checkCommand` omits `eval:all`.**
`ci:fast` is `format:check && npm test`. The CI `test.yml` also runs `npm run eval:all`, which holds
`evals/shared/tests/task-registry-drift.test.mjs`. A docs-only edit under `docs/tasks/` (the exact kind
of tail commit this task targets: a status or registry change) can fail it, and `checkCommand` would not
have run it. Measured: `npm run eval:all` takes about 5 s, so there is no reason to leave it out.
Fix applied: `checkCommand: "npm run ci:fast && npm run eval:all"` in the task (three places) and the plan.

**I2. A path-filtered workflow can be red on a docs-only head that its green ancestor never ran.**
`docs-link-check.yml` triggers only on `docs/**/*.md`, `README.md`, `AGENTS.md` and `CONTRIBUTING.md`, and
checks external URLs. A green ancestor that touched none of those never ran it, and no local
`checkCommand` reproduces URL reachability. Risk 1 named the doc-link checker as an example but its
mitigation (`checkCommand`) does not cover it.
Fix applied: Risk 1 now states the residual as accepted and documented, and Phase 4's
`configuration.md` item now requires the rule "`checkCommand` should reproduce every check that a
workflow path-filtered to the docs patterns runs". Rollback is unchanged: `ci.docsOnly.enabled: false`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE. Phases are ordered by dependency, each has a risk level and named files, and every
phase item is a checkable change. The wiring-test population is derived from files that carry a
`statusCheckRollup` read, with a floor of 3 (check 13: the key is the read itself, not a shared token).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT. Success criteria map to phases. Mutation proofs are listed for the three
fail-closed branches. The task correctly leaves a rebased `/develop-batch` head waiting.

## 5. Risk & Rollback

**Status:** ADEQUATE after I2. Rollback is one config key, with per-site partial rollback.

---

## Summary of Recommendations

### Must Fix (Critical) - 0
### Should Fix (Important) - 2 (both applied)
1. I1 — widen the repository `checkCommand` to include `eval:all`.
2. I2 — record the path-filtered-workflow residual and the `checkCommand` rule.

### Consider (Optional) - 1
1. Recompute `estimated_effort_hours` against the rubric.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 8/10 (before I2), 9/10 after

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No Critical issues, every cited fact re-measured true, and both Important findings were
fixed in this review.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-10-01
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.172.ci-docs-only-tree-equivalence/task.172.ci-docs-only-tree-equivalence.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{tech-stack,coding-standards}.md
