# Task Review Report: Task 75 — Make the pipeline quality gate run what CI runs

**Reviewed:** 2026-09-01
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-09-01

---

## Executive Summary

The task is accurate, well-motivated and traceable — every file it names exists, no technology is
invented, and the defect it describes is documented with a real PR, a real CI run and a real recovery
commit. The problems are all of one kind: **the task under-counts its own surface**. Phase 2 names two
shared step documents that contain no command to edit, and §7 names one of the five places that
currently restate the `npm test` default. Neither is a design flaw; both would have been discovered
mid-implementation and resolved by guesswork.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — running under the `develop-next` autonomous pipeline; all
gates auto-answered per the pipeline defaults table and recorded below.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` inside a `/develop-next` autonomous run. Per the pipeline's autonomous
defaults, interactive question points were not presented. The decisions taken on the user's behalf:

| Gate                          | Auto-answer                                    | Rationale                                                                 |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Step 0 output format          | Comprehensive report                           | Required for the pipeline audit trail                                     |
| Step 2 check 5 — tracker sync | **Skip — leave unlinked**                      | The skill forbids creating a remote issue unprompted; gap stays flagged   |
| Step 8.5 — apply fixes        | Yes, apply all critical + important fixes      | Pipeline needs the task corrected before `/develop` runs                  |
| Step 9 — status update        | Yes, fixes complete                            | Already `Ready for Development`; no transition needed                     |

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (minor)

All 11 mandatory numbered sections are present, plus Progress Tracking, References, Notes and a
Change Log. Filename follows `task.{n}.{descriptive-name}.md` with dots as structural separators.

**OKF frontmatter**: `type: task` present ✅, `description` present ✅, `tags` a YAML list ✅,
`updated` present ✅. No findings.

**Tracker card preflight** (`sync-jira-task.js --check-card`): exit 0 — Summary, Success Criteria and
Breaking Changes all resolve. Information only: the card omits 6 summary sentences, 5 success criteria
and 2 breaking changes behind `+N more` links.

**Sign-off**: `sign-off.enabled` absent from `skills-config.yaml` → check skipped entirely, as specified.

### Issues

#### Important

- **Change Log is stale** — newest row is `1.0 Initial draft` (2026-09-01) but `status:` is
  `ready-for-development`. Enforcement is `advisory` (default), so this does not block development.
  Closed by the verdict row this review writes in Step 8.5.
- **No tracker linkage** — frontmatter carries neither `github_issue:` nor `jira_key:`. Flagged per
  check 5. Sync was **not** performed: the skill forbids creating a remote issue unprompted and this is
  an unattended run. The repo's own convention is mixed (task.72 and task.71 are linked; task.70 and
  task.76 are not), so this is not a deviation from local practice. Run `/sync-github-task` to link it.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every claim was verified against the tree:

| Claim                                                          | Verification                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| CI's `test` job runs three commands                            | ✅ `.github/workflows/test.yml` — Formatting, Hermetic test suite, replay evals |
| `qualityGateCommand` defaults to `npm test`                    | ✅ `skills/develop-next/SKILL.md:27`, `docs/reference/configuration.md:177`      |
| `format:check`, `test`, `eval:all` exist as separate scripts   | ✅ `package.json`                                                               |
| No `ci` / `ci:fast` script exists yet                          | ✅ grep — nothing outside the task document itself                              |
| `evals/shared/tests/ci-gate-parity.test.mjs` is new            | ✅ absent; sibling `*-parity.test.mjs` files exist and establish the pattern     |
| Step 3 prose calls `qualityGateCommand` "the real gate"        | ✅ `skills/develop-next/SKILL.md:189`                                           |
| Task 67 shipped a red build, recovered by `de9dc8a`            | ✅ recorded in the roadmap Change Log and `bug.3`'s DoD                          |

All 8 files in §7 exist except the one marked "to create". No invented libraries, no fabricated paths,
no API patterns absent from the architecture docs.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important

- **Phase 2 names two files that contain no command to edit.** The phase reads as though it is changing
  an existing invocation, and it is not:
  - `shared/resources/develop-pipeline-step-3-develop-loop.md:137` uses a deliberately generic
    `<test-command>` placeholder inside the triage capture block. Phase 2 is a **placeholder
    resolution**, not an edit.
  - `shared/resources/develop-pipeline-step-5-6-qa-loop.md` names **no test command anywhere**. Phase 2
    is an **addition** there — a verification step that does not exist today — and the task does not say
    where in the cycle it goes. The only sensible seam is after fixes are applied and before the
    `fix(...)` commit (the block at line ~503), so a cycle cannot commit a red tree.

- **A literal `npm run ci:fast` in a shared step doc is wrong for consumer projects.** These two files
  are distributed verbatim into consumer repos by `bundle_skill.py` and `setup-consumer.sh`. A consumer
  has no `ci:fast` script, so hardcoding the literal instructs every downstream project to run a command
  that does not exist. `qualityGateCommand` is configurable for exactly this reason; the fast gate needs
  the same treatment — a config key with `npm run ci:fast` as its **default**, referenced in the step
  docs as `<fastGateCommand>` to match the existing `<qualityGateCommand>` idiom.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **The doc sweep in §7 is incomplete — four further sites restate the `npm test` default.** §7 names
  `skills/develop-next/SKILL.md` and `docs/reference/configuration.md`; the full surface is:

  | Site                                    | What it says                                          | In §7? |
  | --------------------------------------- | ----------------------------------------------------- | ------ |
  | `skills/develop-next/SKILL.md:27`       | config table row, `npm test`                          | ✅     |
  | `skills/develop-next/SKILL.md:189`      | "This is the real gate" prose                         | ✅     |
  | `docs/reference/configuration.md:177`   | reference table row, `npm test`                       | ✅     |
  | `docs/reference/configuration.md:98`    | the YAML **example block**, `qualityGateCommand: npm test` | ❌ |
  | `skills/develop-next/README.md:23`      | "(default `npm test`)"                                | ❌     |
  | `skills/develop-batch/SKILL.md:48`      | **identical config table row**, `npm test`            | ❌     |
  | `skills/develop-batch/README.md:126`    | "(default `npm test`)"                                | ❌     |

  `develop-batch` matters most: it reads the **same `developNext.qualityGateCommand` key** for its
  per-item merge gate (`skills/develop-batch/SKILL.md:355`), so it inherits the new default whether or
  not its table is updated — and an un-updated table means the two sibling orchestrators document
  different defaults for one key. This is the documented failure mode in
  `project_behaviour_change_doc_sweep`: consumer docs restate pipeline behaviour independently and
  drift silently.

**Testing Strategy** is otherwise sound: contract tests, a behaviour verification that reproduces the
exact task-67 failure, and two mutation proofs. **Success Criteria** are all measurable. **Scope** is
tight — 4 phases, one concern, no mixing.

**No breakage risk from existing tests**: `evals/develop-next/protocol/skill-shape.test.mjs:227` and
`evals/develop-batch/protocol/skill-shape.test.mjs:188` assert that the config **key** is documented,
not what its default **value** is. Changing the default breaks neither.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification is honest and correctly calibrated: no high-risk areas (accurate — this adds no
check and changes no logic), and the two medium risks are the real ones. The "merge gate gets slower"
risk is named with probability `Certain`, which is the right way to record an intended cost rather than
a hazard.

The rollback plan is concrete, bounded and verifiable — revert one default, composites stay usable by
hand, CI unaffected either way. The forward fix (move `eval:all` to once-per-branch, or make the eval
tier incremental) is a real option and not a placeholder.

**Breaking Changes** correctly names the one observable behaviour change and correctly states that an
explicit override still wins. No findings.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 5 issues

1. **Extend §7 and Phase 2 to the full doc surface** — add `docs/reference/configuration.md`'s YAML
   example block, `skills/develop-next/README.md`, `skills/develop-batch/SKILL.md` and
   `skills/develop-batch/README.md`. ✅ *Applied*
2. **State that Phase 2 resolves a placeholder in step-3 and adds a new step to step-5-6**, and name the
   seam in the qa-fix cycle (after fixes are applied, before the `fix(...)` commit). ✅ *Applied*
3. **Make the fast gate configurable rather than literal** — `developNext.fastGateCommand`, default
   `npm run ci:fast`, referenced as `<fastGateCommand>` in the shared step docs. ✅ *Applied*
4. **Write a Change Log row recording this review** and bump `updated`. ✅ *Applied*
5. **Link a tracker issue** — flagged, deliberately not auto-created in an unattended run.
   ⏭ *Skipped — requires your input* (`/sync-github-task`)

### Consider (Optional) — 3 items

1. **Phase 3 is already satisfied by the current workflow.** `.github/workflows/test.yml` today already
   runs `npm run format:check`, `npm test` and `npm run eval:all` as three separately named steps —
   exactly what Phase 3 asks for. Phase 3 therefore requires **no edit**; its whole value is that Phase 4
   locks the arrangement so a future step cannot drift out of the composite. Saying so prevents an
   implementer inventing a change to justify the phase. ✅ *Applied*
2. **Phase 4 should assert `develop-batch`'s documented default too**, following from Important #1 —
   otherwise the parity test holds one sibling and not the other. ✅ *Applied*
3. **A third mutation proof** — removing `npm test` from the composite — would round out the two already
   named. Cheap, and it covers the middle tier that the other two skip. ✅ *Applied*

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — complete structure; Change Log stale, tracker unlinked
- Technical Accuracy: 8/10 — zero hallucinations; Phase 3 describes work already done
- Implementation Clarity: 7/10 — Phase 2's target had no command to edit and no named seam
- Consistency: 7/10 — §7 named 2 of the 6 sites that restate the default
- Risk Management: 9/10 — honest, calibrated, concretely reversible

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues and no hallucinations; every gap was a surface-count omission that
has now been closed in the document itself. The task is small, reversible, and the parity test it adds
is what stops the defect recurring.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the plan phase by phase — Phase 1 (composites) gates 2, 3 and 4
2. Treat Phase 3 as a verification, not an edit — confirm the workflow already calls the three scripts
3. Prove Phase 4 by mutation before believing it: remove each composite member in turn and confirm the
   parity test goes red. A contract test that has not been mutation-proven is decoration —
   this repo has already shipped one guard that passed under mutation on the exact bug it named
4. Run `npm run bundle` after editing `shared/resources/` — editing `references/` directly is silently
   reverted on the next bundle

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous pipeline mode)
- **Review Date:** 2026-09-01
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.75.quality-gate-matches-ci/task.75.quality-gate-matches-ci.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Pre-pass:** architecture alignment `aligned`; codebase scan `not-implemented`
