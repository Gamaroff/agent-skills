# Task Review Report: Task 39 — `gh-stage.js`, a GitHub Projects board engine

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-08-12

**Reviewed:** 2026-08-12
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

Task 39 is a well-specified, unusually self-aware task document: it states its own asymmetry with the
Jira twin up front, scopes itself to "nothing is wired yet", and carries a plan file with real code
sketches. Every architectural claim it makes checks out — file locations, the test glob, the
dependency boundary, config-key naming, and `project.yml` all verified against the tree.

The defects found are **citation drift**, not design error. Five `file:line` references point at the
wrong code — two of them (`describeAlternatives`, the Jira monotonicity guard) at code that looks
plausible enough to mislead an implementer who follows the reference instead of grepping. One
scope gap was also closed: Motivation #5 raised a real problem (`"Todo"` unranked) that no phase
addressed and no success criterion covered, and it named the wrong constant besides.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run; every ambiguity was resolved
against the codebase and recorded as an assumption below.
**Implementation Readiness:** 9/10
**Recommendation:** ✅ READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline in autonomous mode, so no questions were put to
the user. Each point that would normally have been a question was resolved from the task document,
the plan file, and the codebase. The resolutions:

| Would-be question | Resolved how | Assumption recorded |
|---|---|---|
| Motivation #5 names `DEFAULT_STATUS_RANK`, but `gh-stage.js` is barred from `jira-sync.js`. Which constant is meant? | Read both. `rankOf` in `tracker-workflow.js` consults `DEFAULT_LADDER` (`:82-84`); `DEFAULT_STATUS_RANK` (`jira-sync.js:1874`) is Jira-side and unreachable from this CLI. | The substantive claim is true of **both**; the actionable one is `DEFAULT_LADDER`. Rewrote Motivation #5 to name it. |
| Is adding `"Todo"` to the ladder in scope? | Not listed in §4 In Scope, no phase implements it, no success criterion covers it. | **Out of scope** — it mutates a default that Jira consumers also read. Moved to Known Issues with its blast radius stated. |
| Where does `resolveOption`'s `candidates` argument come from? | `resolveMoment` (`tracker-workflow.js:628`) returns `{ targets, rank, offLadder, isLastRung }`. | `candidates` = `resolveMoment(...).targets` (plural). Documented in the plan. |

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present, plus Progress Tracking and References. No placeholders
(`[TBD]`, `[TODO]`, `???`) anywhere in the document. Filename follows `task.{n}.{descriptive-name}.md`
with dots as structural separators.

**OKF frontmatter:** `type: task` present ✅ · `description` present ✅ · `tags` is a YAML list ✅ ·
`updated` present ✅ · tracker URL derivable from `github_issue: 187` ✅.

**Stakeholder Sign-off:** `sign-off` is absent from `skills-config.yaml`, so this check is skipped
entirely per the conditional contract — no finding raised.

**Tracker linkage:** `github_issue: 187` → issue exists, state `OPEN`, title matches. Body
cross-reference link `[#187](https://github.com/Gamaroff/agent-skills/issues/187)` matches
frontmatter. ✅

**Tracker card preflight:** `sync-jira-task.js --check-card` → **exit 0, `ok: true`, zero findings**.
All three card blocks resolve:

| Block | Kind | Chars | Omitted (announced via `+N more`) |
|---|---|---|---|
| Summary | prose | 416 | 2 sentences |
| Success Criteria | list | 357 | 9 criteria |
| Breaking Changes | prose | 51 | 4 |

Reported as information, not a defect — the builder caps each block and announces every omission.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

No invented libraries, no invented APIs, no fabricated file paths. Every technology named is real and
present: Node ≥22 with native `node --test` (local v24.13.1), `gh` 2.94.0 on PATH,
`shared/resources/tracker-workflow.js` exporting exactly the surface the Target Architecture names.

What was found instead is **citation drift** — real code, wrong line numbers. The two `medium`
findings matter because the cited lines contain *plausible but different* code, so an implementer who
follows the reference lands somewhere believable and wastes the trip.

### Issues

#### Important

- **[Important] `describeAlternatives` cited at the wrong location.** Task §References and the plan's
  Phase 3 both cited `jira-stage.js:87-110`. That range is the `parseArgs` switch
  (`--print-plan`/`--json`/`--quiet`/`--dry-run`/`--strict`/`--allow-regress`). The function is
  defined at **`jira-stage.js:127`** and called at `:448` and `:513`.
  → **Fixed** in both files.

- **[Important] `skills/finalise/SKILL.md` references ~90–100 lines early.** The task cited
  `:1023-1093` for the GitHub board block and `:1061` for the case-sensitive `name == "Done"` match.
  `:1023-1093` is the *Jira* MCP transition section. The GitHub board block is at **`:1114-1195`**;
  the case-sensitive match is at **`:1152`**. The substantive claim — that `finalise` matches
  case-sensitively while the other four sites use `ascii_downcase` — is **correct**, and is precisely
  what `gh-stage.js` unifies.
  → **Fixed** in the task (Motivation #2 and References) and the plan (fixture table).

- **[Important] Jira monotonicity guard cited at `jira-sync.js:2241`.** That range is warning-message
  prose about `jira.statusMap`. The guard is at **`:2933-2957`** — rationale comment `:2933-2937`,
  the `if (!allowRegress && minRank != null)` check at `:2938`, the `would-regress` return at `:2952`.
  The plan's stated semantics ("unranked either side → no opinion, allow") match the real code
  exactly.
  → **Fixed** in the plan.

- **[Important] `buildWorkflowRecord` cited at `jira-sync.js:2731`.** That is `resolveTransition`.
  `buildWorkflowRecord` is at **`:3744`**, and the preserve-hand-authored-intent discipline the plan
  wants copied is the `...(existing.X ? { X: existing.X } : {})` spread block at `:3771-3781` —
  which notably includes `existing.statusRank`, the ladder field `--write-ladder` must not clobber.
  → **Fixed** in the plan.

#### Optional

- **[Optional] Exit-code block cited as `jira-stage.js:19-27`; actual `:21-27`** (`:19-20` are usage
  examples). Semantics transcribed correctly.
  → **Fixed** in both files.

### Verified accurate (no action)

- `develop-pipeline-step-0-resolve-and-prepare.md:364-504`, `-step-4-create-pr.md:178-238`,
  `-step-5-6-qa-loop.md:43-106`, `-step-7-finalise.md:165` — all four correct, including the
  sub-claims: `BOARD_NUM` computed at step-4`:182` and never reused ✅, `[ "$BOARD_STATUS" = "Todo" ]`
  at step-0`:497` ✅, the hand-edit `select(.name == "In Review")` instruction at step-4`:237` ✅.
- `tracker_call_with_retry` at `resolve-platform.sh:69-80` ✅ (3×, 1s/2s/4s, as the plan states).
- `project.yml` at repo root: `project_board_name: "Agent Skills"`, `project_board_number: 1` ✅ —
  matches the Consumer Test's "board 1" exactly.
- `tracker-workflow.js:26` carries an explicit comment forbidding `require("./jira-sync.js")`, so the
  §9 Code Quality criterion is already the module's enforced contract ✅.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (one gap closed)

Four phases, each with an explicit risk level, named files, checkbox changes, and stated
dependencies. Changes are specific rather than vague — "Single GraphQL read fetching item id, project
id/title, the Status field id and all options, **and the current value**" names both the what and the
why. The plan file supplements with real code sketches for `resolveOption`, the board-selection
precedence, the guard, and the dry-run assertion.

**Effort estimate:** `estimated_effort_hours: 16` against 14 success criteria, 4 phases, medium peak
risk. Within rubric tolerance — no finding.

### Issues

#### Important

- **[Important] `resolveOption`'s `candidates` argument had no stated source.** The plan gives the
  signature `resolveOption(options, candidates, current)` but never says where `candidates` comes
  from. It is `resolveMoment(moment, workflow).targets` — **plural**, a preference-ordered list —
  and `resolveMoment` returns `null` for a disabled moment, which is the `stage-disabled` exit and
  must be checked *before* `resolveOption` is reached. Also worth stating: `ladderFor` and `rankIn`
  are **not** exported, so `isLastRung` must be taken off the `resolveMoment` result rather than
  recomputed.
  → **Fixed** — added to the plan's Phase 1.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (resolved)

Internal consistency is strong: the Files Summary matches the files named in the phases, the Testing
Strategy covers all four phases across five test scopes (unit/integration/contract/performance/
consumer), Success Criteria map onto the stated benefits, and the Rollback Plan covers each phase
with a stated trigger.

Scope and complexity are appropriate: 4 phases, one new source file plus tests and three doc updates.
No case for splitting.

### Issues

#### Important

- **[Important] Motivation #5 raised a problem nothing in the task fixed.** The document argued that
  GitHub's default `Todo` column is unranked and therefore unguarded — a real and well-observed
  point — but §4 In Scope did not include fixing it, no phase implemented it, and no success
  criterion covered it. A stated problem with no corresponding change reads as an oversight to the
  next person.

  Compounding it, the paragraph named `DEFAULT_STATUS_RANK`, which lives in `jira-sync.js:1874` and
  is **unreachable from `gh-stage.js`** by the module's own dependency ban. The constant that
  actually governs this CLI's rank is `DEFAULT_LADDER` at `tracker-workflow.js:82-84`, whose rung-0
  name list is `["To Do", "Backlog", "Open", "New", "Selected for Development"]` — no `"Todo"`.

  → **Fixed**: Motivation #5 rewritten to name `DEFAULT_LADDER`, with a note that the Jira-side
  constant has the same gap but is not the one to change. The fix is **explicitly deferred** — it
  mutates a default ladder Jira consumers also read — and recorded under Known Issues with its blast
  radius stated: on a stock-`Todo` board with no declared `tracker-workflow.yaml`, `rankOf` returns
  `null` and the guard permits every move out of that column; any board that declares a ladder is
  unaffected; `--probe-board` surfaces it.

#### Optional

- **[Optional] `shared/resources/tests/` is undocumented in `source-tree.md`.** The directory holds
  10 existing `.mjs` suites and is globbed by `package.json`, so the task's "New tests under an
  already-globbed directory" criterion is satisfied — but `source-tree.md` names only
  `skills/<x>/tests/` and top-level `tests/`, and `coding-standards.md:29` says tests are
  "`*.test.js` co-located". The `.mjs`-under-`tests/` pattern is de-facto. Not this task's job to fix;
  noted so it is not mistaken for a violation during QA.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification is genuinely good — each entry carries probability, impact, mitigation, and (for
the high-risk one) rollback, and the mitigations are concrete rather than aspirational.

- **Multi-board fan-out** correctly rated High/Critical, with the right mitigation: *never fan out*,
  explicit precedence, and an `ambiguous-board` skip that names candidates rather than guessing.
  Verified real: `set-github-project-priority.sh` and `set-github-project-estimate.sh` genuinely do
  iterate every board, so multi-board issues are known to exist in this repo.
- **Option-id instability** correctly rated Medium/Major. The mitigation ("resolve ids per call, never
  persist") is the right one, and the two-boards-with-different-`Done`-ids fixture pins it.
- **`projectItems` propagation delay** rated High/Minor with the correct mitigation — port the
  existing `sleep 3` + retry-after-5s rather than inventing a new dance. Verified present in the step-0
  block.

Rollback is credible precisely because nothing is wired: `git revert` + `npm test`, and no pipeline
behaviour can regress. The Partial Rollback (revert Phase 3 only, keep 1–2 for task.40) shows the
phase boundaries were chosen with rollback in mind.

### Issues

None.

---

## 6. Mermaid Diagram Validation

**Status:** N/A — no Mermaid diagrams present.

The Target Architecture is conveyed by an ASCII call-tree and two GraphQL fences, both of which read
clearly. A diagram would restate the Implementation Plan without adding structure. **No diagram
recommended.**

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 4 issues — ✅ all applied

1. ✅ `describeAlternatives` → `jira-stage.js:127` (was `:87-110`, which is `parseArgs`) — task + plan.
2. ✅ `skills/finalise/SKILL.md` → block `:1114-1195`, case-sensitive match `:1152` (was `:1023-1093` /
   `:1061`) — task Motivation #2, task References, plan fixture table.
3. ✅ Jira guard → `jira-sync.js:2933-2957` (was `:2241`); `buildWorkflowRecord` → `:3744` with the
   preserve-intent spread at `:3771-3781` (was `:2731`, which is `resolveTransition`) — plan.
4. ✅ Motivation #5 rewritten to name `DEFAULT_LADDER` (`tracker-workflow.js:82-84`), the `"Todo"` fix
   explicitly scoped **out** with its blast radius stated, and recorded under Known Issues — task.

### Consider (Optional) — 3 items

1. ✅ Exit-code citation `:19-27` → `:21-27` — applied (task + plan).
2. ✅ `candidates` = `resolveMoment(...).targets`, plural, with the disabled-moment and non-exported-
   `ladderFor` caveats — applied to the plan.
3. ⏭ `shared/resources/tests/` undocumented in `source-tree.md` — **not applied**, out of scope for
   this task. Noted for whoever next touches the architecture docs.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10 — all sections, no placeholders, card preflight clean, tracker linked
- Technical Accuracy: 8/10 — zero hallucinations; five citations were wrong, all now corrected
- Implementation Clarity: 9/10 — phases specific and actionable; the one real gap (`candidates`
  source) is closed
- Consistency: 9/10 — the Motivation-#5-with-no-phase gap is closed by explicit deferral
- Risk Management: 10/10 — risks real, mitigations concrete, rollback credible

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues and no hallucinations; the task's design is sound and every
architectural claim verified against the tree. All four Important findings were citation or scope
defects and have been fixed in place, so an implementer following the references now lands on the
right code.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the four phases in order — Phase 1 (`resolveOption` + CLI skeleton) has no dependency
   beyond task.37, which has landed.
2. Take `candidates` from `resolveMoment(...).targets` and check for `null` (disabled moment) first.
3. Keep the module free of `jira-sync.js` — `tracker-workflow.js:26` already states this contract, and
   §9 Code Quality gates on it.
4. Assert the write-free `--dry-run` by stubbing `gh` and failing on any argv containing `item-add`,
   `mutation`, or `--method POST`. A comment is not a guarantee, and this is the one place a naive
   port of `jira-stage.js` is genuinely unsafe.
5. Run `npm test` before commit — nothing existing should change; this task only adds files.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous — invoked from `/develop-task` Step 2, itself
  dispatched by `/develop-next` for roadmap item T39)
- **Review Date:** 2026-08-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.39.github-board-stage-engine/task.39.github-board-stage-engine.md`
- **Plan File:** `docs/tasks/task.39.github-board-stage-engine/task.39.plan.github-board-stage-engine.md`
- **Pre-pass agents:** B (architecture alignment) → `drift`; C (codebase scan) → `not-started`
- **Architecture Docs Consulted:** `concepts/coding-standards.md`, `concepts/tech-stack.md`,
  `concepts/source-tree.md`, `docs/reference/tracker-workflow.md`, `docs/reference/configuration.md`
- **Source Files Verified:** `shared/resources/jira-stage.js`, `jira-sync.js`, `tracker-workflow.js`,
  `resolve-platform.sh`, `set-github-project-priority.sh`, `set-github-project-estimate.sh`,
  `skills/finalise/SKILL.md`, `package.json`, `project.yml`
