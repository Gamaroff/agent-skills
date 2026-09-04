# Task Review Report: Task 90 - `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Reviewed:** 2026-09-04
**Review Depth:** Standard
**Task Status:** Draft → Ready for Development
**Overall Assessment:** GOOD (content) / NEEDS IMPROVEMENT (structure) — resolved by applied fixes

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-09-04

---

## Executive Summary

The task's *substance* is unusually strong: both defects were reproduced byte-for-byte during this
review, the root cause (`jq` on empty input emits nothing and exits 0) is exactly right, and the
success criteria are measurable and evidence-backed. The problems were structural and referential —
the document carried 5 of the 11 mandatory sections, with **no Implementation Plan and no Testing
Strategy at all**, and three of its factual claims about the current codebase were wrong in ways that
would have sent a developer to the wrong line, the wrong file count, and the wrong assumption about
existing test coverage.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (develop-task Step 2/8); every
finding was resolvable from verified evidence in the repository, so no ambiguity required user input.
**Implementation Readiness:** 8.6/10 (after fixes; 5.2/10 as filed)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. This review ran under the `develop-task` autonomous directive. The three pipeline auto-answers
were:

| Gate | Auto-answer |
| ---- | ----------- |
| Step 0 — output format | Comprehensive report (pipeline audit trail) |
| Step 8.5 — apply fixes | Yes, apply all critical + important fixes |
| Step 9 — update status | Yes, fixes complete → Ready for Development |

Every finding below was decided against verified repository state rather than user preference; each
one names the evidence.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (resolved)

The repository's task corpus uses the full 11-section numbered template — verified against
`task.89.relationship-assertion-lint` and `task.77.review-pr-in-pipeline`, both of which carry
§1 Overview through §11 Rollback Plan plus Progress Tracking. Task 90 as filed carried five sections:
Overview, "Why defect 1 is High", Scope, Success Criteria, References.

### Issues

#### Critical

- **Missing `## 6. Implementation Plan`** — no phases, no file-level changes, no dependencies, no risk
  levels. `/develop` has nothing to execute phase-by-phase. This is the template checklist's named
  Critical section.
- **Missing `## 8. Testing Strategy`** — the Success Criteria mention tests, but nothing states what
  is tested at which level, or that the 14 pre-existing scenarios must stay green. Also a named
  Critical section.

#### Important

- **Missing `## 7. Files Summary`** — the 9 bundled copies were described in prose but never
  enumerated, so "refreshed and verified by content" had no checklist to verify against.
- **Missing `## 10. Risk Assessment` and `## 11. Rollback Plan`** — the change alters the pipeline's
  own state machine and regenerates 9 files; neither the failure modes nor the revert path were
  stated.
- **No linked tracker issue** (`github_issue:` absent from frontmatter). Flagged as documented, but
  **not** acted on: 0 of the last 4 tasks in this repository (T75, T76, T77, T89) carry one either, so
  this is the repo-wide convention rather than a defect in this document. The autonomous path is
  "skip — leave unlinked, make no remote changes"; run `/sync-github-task` if a card is wanted.

#### Optional

- **Missing `## 5. Breaking Changes`** and `## Progress Tracking` — both applicable here (the exit
  code and file mode both change), so their absence was a real omission rather than an N/A section.
- `## 2. Why defect 1 is High` was a bespoke heading in the position the template reserves for
  `## 2. Motivation`.

### Checks that passed

- **File naming** — `task.90.pipeline-lock-silent-success.md` follows `task.{n}.{kebab-name}.md`. ✅
- **OKF frontmatter** — `type: task` present and non-empty, `description` present, `tags` a YAML
  list, `updated` set. ✅
- **Placeholders** — no `[TBD]`, `[TODO]`, `???` anywhere. ✅
- **Change Log (check 4b)** — present, four canonical columns, two rows, current with `status: draft`.
  `change-log.enabled` defaults to true; no finding. ✅
- **Stakeholder Sign-off (check 4a)** — `sign-off.enabled` is absent from `skills-config.yaml`, so
  this check is skipped entirely. Not a finding, and no section is expected. ✅
- **Tracker card preflight (5a)** — not applicable: `TRACKER=github` (`JIRA_URL` unset) and no linked
  issue, so no card is published from this document.

### Recommendations applied

1. Restructured to the full 11-section template, preserving all original content verbatim where it
   already fit a section (Overview, Scope, Success Criteria, References).
2. `## 2. Why defect 1 is High` folded into `## 2. Motivation` as "Current problems", with its
   argument intact and the hooks consequence added.
3. Authored §5, §6, §7, §8, §10, §11 and Progress Tracking from verified evidence.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (resolved)
**Hallucinations Detected:** 0

No invented libraries, no invented paths, no invented APIs. Every technology named (`jq`, `mktemp`,
`bash`, `zsh`, `npm run bundle`) is real and present. The defect analysis is correct and was
independently reproduced during this review:

```
zero-byte lock  → "advance-pipeline-lock: step 0 → 5", exit 0, file still 0 bytes
whitespace lock → same, and the file is TRUNCATED to 0 bytes
symlink at $LOCK.tmp → canary file received {"current_step": 3}
jq -r '.current_step // 0' <empty>            → no output, exit 0
jq --argjson n 5 '.current_step = $n' <empty> → no output, exit 0   ← the hole
```

But three claims about the current repository state were wrong.

### Issues

#### Important

- **Wrong line range for the failing guard.** §5 References said "the guard at `:94-104`". Lines
  94–104 are the `--skill commit-changes` arm. The `if ! jq` guard the Overview describes — the one
  that fails to fire — is at `:138-142`. A developer following the reference lands on the wrong
  branch of the script.
  **Fixed**: References now name `:138-142` for the guard, `:95-102` for the `commit-changes` read,
  and keep the correct `:120-126` for the `1..8` validator.

- **Wrong bundled-copy count.** The document said "**10** bundled copies across
  `skills/*/references/`" and the success criterion said "All 10 bundled copies refreshed". There are
  **9** under `skills/*/references/` (`commit-changes`, `create-branch`, `create-pr`, `develop`,
  `develop-bug`, `develop-story`, `develop-task`, `finalise`, `review-story`); 10 is the total
  *including* the `shared/resources/` source. A DoD check counting 10 bundled copies would never be
  satisfiable.
  **Fixed**: "9 bundled copies under `skills/*/references/` (10 files in total, counting the source)",
  with all 9 enumerated in the new §7.

- **Wrong claim about existing zsh coverage.** The document said
  "`advance-pipeline-lock.test.sh` — 14 tests, bash and zsh" and instructed to extend it "under bash
  and zsh **as the suite already does**". The file has 14 scenarios ✅ but runs under bash only —
  `package.json:26` invokes `bash shared/resources/advance-pipeline-lock.test.sh`, and the file
  contains no zsh invocation. The `command -v zsh` parity pattern exists in
  `tracker-access.test.sh` (§12, §45), a different file.
  This changes the work: zsh coverage must be **added**, not extended, and it must carry the
  `command -v zsh` skip guard — GitHub's `ubuntu-latest` runner has no zsh, so an unguarded pass
  would turn CI red on absence rather than green on skip.
  **Fixed**: §4, §8 and §12 now state this accurately and name the pattern file to copy.

### Verified correct (no finding)

- "`pipeline-steps` is scoped to `develop-pipeline-step-*.md` and `lite-mode.md`" — matches the
  roadmap legend exactly. ✅
- "`test-harness` covers `shared/resources/tests/*`, which does not include
  `advance-pipeline-lock.test.sh`" — correct; the test file sits in `shared/resources/`, not the
  `tests/` subdirectory. ✅
- "fails closed on every other malformed input — 18 executed `current_step` values" — spot-checked
  against malformed JSON: `jq` fails at `:138`, the script exits 1, lock untouched. ✅

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved)

### Issues

#### Critical

- **No plan existed.** The Scope section listed four bullets of intent. There were no phases, no risk
  levels, no per-file changes, no dependency ordering — the four things `/develop` consumes.

#### Important

- **The fix for Defect 1 was under-specified on its most consequential axis: which invocation paths
  it applies to.** "Fail closed, exit non-zero, leave the lock untouched" is unambiguous about
  *behaviour* and silent about *scope*. The script reads or writes the lock JSON at two sites
  (`:95-102` and `:128-144`), and removes it without parsing at a third (`--complete`, `:68-72`).
  Guarding `--complete` would make a corrupt lock **permanently unclearable** — a worse failure than
  the one being fixed. A developer would have had to guess, and the wrong guess is not obviously
  wrong at review time.
  **Resolved**: §3 and §4 now state the exemption explicitly, and §6 Phase 3 adds scenario 11 to pin
  it, so a later widening of the guard fails a test rather than shipping.

#### Optional

- **`estimated_effort_hours: 3` is low against the rubric.** 9 success criteria, 5 phases, medium
  risk, 10 files touched plus a new interpreter pass. Rubric lands nearer 5h. Divergence is under the
  2× flag threshold, so this is advisory only.
  **Fixed**: bumped to 5.

### Recommendations applied

1. Five phases authored with explicit risk levels, files, checkbox changes and dependencies —
   matching the shape used by `task.89` §6.
2. Phase 4 is a standalone mutation-proof phase, per the task's own success criterion and
   `mutation-proving.md`.
3. Phase 5 carries the roadmap legend tag work, which had a success criterion but no home in any
   plan.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (resolved)

### Issues

#### Important

- **No Testing Strategy** meant the strongest implicit requirement went unstated: the **14
  pre-existing scenarios must stay green**. They pin the `commit-changes` nesting contract and the
  Steps 5–6 loop noops — the contracts most at risk from a guard inserted near the `commit-changes`
  read.
  **Fixed**: stated as its own success criterion and named in §8.

#### Optional

- **Defect 2 offered three fix options without discriminating between them** — "`mktemp` in the
  lock's directory, or `set -o noclobber` / an `O_EXCL` create". These are not equivalent:
  `noclobber` refuses to overwrite an existing file, but a symlink pointing at a **non-existent**
  target is still created through it, so it does not close the stated hole. `mktemp` is `O_EXCL` on
  an unpredictable name and closes both.
  **Fixed**: §6 Phase 2 recommends `mktemp` and states why the alternative is weaker.

- **An undocumented side effect of the `mktemp` fix**: `mktemp` creates `0600`, while
  `> "$LOCK.tmp"` created with the umask (typically `0644`), so the lock's mode changes on first
  advance.
  **Fixed**: named in the new §5 Breaking Changes as a deliberate tightening.

### Scope and complexity

5 phases, one script, one test file, one doc, 9 generated copies. Well under the >8-phase oversizing
threshold. **No split recommended.**

### Success criteria measurability

Strong as filed — every criterion is executable, and the mutation-proof and content-verified-bundle
clauses are exactly the two things that have previously been claimed without being done in this
repository (tasks 76 and 86 respectively). Extended from 8 to 10 criteria to cover the `--complete`
exemption and the 14-scenario regression guard.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND (resolved)

### Issues

#### Important

- **No Risk Assessment section**, for a change to the pipeline's own state machine. The material
  risks — a guard that fires on a legitimate lock, a `--complete` that can no longer clear a corrupt
  lock, a stale bundled copy — were all undocumented.
- **No Rollback Plan.** The revert is genuinely simple (one script, one test, one doc, 9 generated
  files, no migration, no persisted state), which is worth stating rather than leaving a reader to
  infer.

**Fixed**: §10 carries five risks with mitigations; §11 carries a three-step revert with a trigger
condition and a sub-5-minute estimate.

### Mermaid diagram (Step 6.5)

No diagram present, and none recommended. The change is a guard plus a temp-file swap; a flowchart
would restate the Implementation Plan. Per the skill's own guidance, absence is not flagged where
prose already conveys the structure.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. ✅ Author `## 6. Implementation Plan` — 5 phases with risk levels, files, changes, dependencies.
2. ✅ Author `## 8. Testing Strategy` — levels, the 14-scenario regression guard, mutation proof,
   bundle content verification, full `npm run ci` gate.

### Should Fix (Important) — 5 issues

1. ✅ Correct the guard's line reference: `:94-104` → `:138-142`.
2. ✅ Correct the bundled-copy count: 10 → 9 (plus source = 10 total), enumerated in §7.
3. ✅ Correct the zsh claim — the test file is bash-only today; add coverage with a `command -v zsh`
   guard so CI stays green.
4. ✅ Resolve the unstated scope of the new guard: applies to both JSON-reading sites, exempts
   `--complete`, pinned by a new test scenario.
5. ✅ Author `## 7. Files Summary`, `## 10. Risk Assessment`, `## 11. Rollback Plan`.

### Consider (Optional) — 3 items

1. ✅ Recommend `mktemp` over `noclobber`, with the reason.
2. ✅ Document the `0644 → 0600` mode change in `## 5. Breaking Changes`.
3. ✅ Raise `estimated_effort_hours` 3 → 5.

Not acted on: tracker issue linkage (`github_issue`) — left unlinked, matching the repository
convention and the autonomous no-remote-changes rule.

---

## Implementation Readiness Assessment

**Score:** 8.6/10 (as filed: 5.2/10)

| Axis | As filed | After fixes |
| ---- | -------- | ----------- |
| Template Compliance | 4/10 | 9/10 |
| Technical Accuracy | 7/10 | 9/10 |
| Implementation Clarity | 4/10 | 9/10 |
| Consistency | 7/10 | 9/10 |
| Risk Management | 4/10 | 8/10 |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — both defects are reproduced and understood, the fix
for each is specific, the scope ambiguity that would have caused a wrong guess is resolved and pinned
by a test, and every factual reference now points at the right line, the right count and the right
current state.

**Justification:** The task was never weak on substance — it was a precise bug report missing the
scaffolding a pipeline executes. All 7 critical + important findings were resolvable from repository
evidence without user input, which is why this returns GO rather than NEEDS REVISION.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work §6 phases in order — Phase 2 depends on Phase 1 only for diff readability; Phases 3–5 have
   real ordering dependencies.
2. Keep the 14 pre-existing scenarios green at every step; they are the regression surface.
3. Do Phase 4's mutation proof per fix, individually — a combined revert proves less.
4. Verify the 9 bundled copies by content, not by the bundler's `in sync` line (task 86).
5. Tick Progress Tracking as each phase closes.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous — develop-task Step 2/8)
- **Review Date:** 2026-09-04
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md`
- **Sources consulted:** `shared/resources/advance-pipeline-lock.sh`,
  `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/tracker-access.test.sh`,
  `docs/development/project-completion-roadmap.md` (legend), `package.json`,
  `.github/workflows/test.yml`, `skills-config.yaml`,
  `docs/tasks/task.89.relationship-assertion-lint/` and `task.77.review-pr-in-pipeline/` (corpus
  calibration)
- **Defects independently reproduced:** both, before any recommendation was written
