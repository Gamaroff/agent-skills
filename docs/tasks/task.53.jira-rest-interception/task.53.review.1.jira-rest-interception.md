# Task Review Report: Task 53 — Intercept Jira REST mutations in two layers

**Reviewed:** 2026-08-18
**Review Depth:** Thorough
**Task Status:** `planned`
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 11 critical + important recommendations implemented — 2026-08-18

---

## Executive Summary

The task's architecture is sound and its prose is unusually good — the two-layer split, the fail-closed
premise, and the mutation-prove section are all genuinely well reasoned. The problem is that it was
authored against the *plan* for tasks 51–52 rather than against what 51 and 52 actually shipped. Four
of its load-bearing claims are contradicted by merged code: the record kind it writes cannot be
written, the access mode it gates on cannot be set, the bash function it calls "free coverage" has
callers that abort, and one of its six mutation kinds is already intercepted.

None of this requires a rewrite. Every defect is a bounded correction inside the existing structure,
and all four have now been decided.

**Critical Issues:** 4 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 6 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 5/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1: `jira.unknown-mutation` vs the closed 20-kind roster

- **User Decision**: **Add a 21st roster kind.**
- **Impact**: `shared/resources/tracker-access-record.md`, `handover-render.js` (a `KIND_PRESENTATION`
  entry) and `handover-render.test.mjs` (three hard-coded `20`s) all become deliverables of task 53.
  The success criterion "the whole existing suite green unchanged" must be narrowed — the roster-count
  assertions change by design.

### Q2: The `access.vcs: approve` HALT

- **User Decision**: **Move it to its own task.**
- **Impact**: The two orchestrator HALTs, their success criterion, their test row, and the
  `develop-next`/`develop-batch` rows in Files Summary all leave task 53. The Decisions table row is
  rewritten as a forward reference rather than deleted, so the rationale is not lost.

### Q3: `jira.transition` already intercepted

- **User Decision**: **Drop transition from Layer 2.**
- **Impact**: `walkLadder`, `transitionToStatus` and its inner `post()` leave Implementation Plan
  step 2. Coverage is restated as **5 new kinds + 1 already owned by `jira-stage.js`**.

### Q4: `jira-create-epic.js` outside the net

- **User Decision**: **Hand-roll a gate and say so.**
- **Impact**: The file gets an explicit access check, its real path enters Files Summary, and a new
  Decisions row states that this one file sits outside Layer 1 and why.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

Frontmatter is clean: `type`, `description`, `tags`, `status`, `priority`, `risk_level`, `created`,
`updated`, `estimated_effort_hours`, `github_issue` all present and well-formed. OKF conformance is
satisfied. `github_issue: 231` resolves to an open issue with matching title, correct labels
(`task`, `priority:high`) and milestone; the body cross-reference link matches. No placeholders.

Tracker-card preflight passes (`ok: true`) — Summary and Success Criteria both resolve; Breaking
Changes is `absent-optional`. Success Criteria reports `omitted: 5`, so a board reader sees 5 of the
10 criteria plus a `+5 more` link. Informational, not a defect.

Sign-off is **not checked** — `skills-config.yaml` declares no `sign-off` block.

### Issues

#### Important

- **Missing `## Technical Background`.** The template's §3 (Current Architecture / Target
  Architecture). Sibling task 52 carries it. For a task whose entire subject is *where in an existing
  call graph to insert two gates*, this is the section a developer most needs.
- **Missing `## Progress Tracking`.** Template §"Progress Tracking"; task 52 has it.
- **Missing `## Change Log`.** `change-log.enabled` defaults to `true`. Enforcement is `advisory`, so
  this does not block development.

#### Optional

- **Missing `## Breaking Changes`.** Conditional in the template, and the card preflight treats it as
  optional. Arguably applicable now only if the orchestrator HALTs had stayed; with Q2 moving them
  out, a short "none — `full` mode is byte-identical" note is sufficient.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

No invented functions, files, libraries or endpoints. Every named symbol exists: `makeHttp`
(`jira-sync.js:1586`), `moveToBacklog` (`:1864`), `transitionToStatus` (`:3098`), `planHops`
(`:3419`), `walkLadder` (`:3451`), `putIssueAtomic` (`:4177`), `jsm_curl`
(`jira-sprint-lib.sh:32`). The "14 skills" blast-radius claim is exact —
`skills/*/references/jira-sync.js` resolves to precisely 14 bundled copies. The retry analysis is
correct: the 429/5xx branches are inside the `while` opened at `:1595`, so a gate at the top of the
returned `http` records once.

The failures are of *currency*, not invention — claims true of the plan, false of the merged code.

### Issues

#### Critical

- **`jira.unknown-mutation` is not a writable kind.** `tracker-access-record.md:16-17` states the
  file is load-bearing: "`defer-mutation.js` refuses to write a record whose `kind` is absent from
  §'The 20 kinds'". `buildRecord` throws (`defer-mutation.js:639-646`), the roster is pinned at 20
  (`:63`), and `handover-render.test.mjs` asserts the count at `:75`, `:111`, `:156` plus bidirectional
  renderer totality at `:86-102`. **Layer 1's central mechanism fails at runtime as specified.**
  - *Evidence:* roster read directly; totality test read directly.
  - *Fix (per Q1):* add the kind, its renderer, and the count updates as explicit deliverables.

- **`access.vcs: approve` is not a reachable state.** `resolve-platform.sh:456-462` rejects **any**
  `ACCESS_VCS != full` with `return 1` and the message "accepted as a key but not supported as a
  value … Only `full` is supported today." The resolver aborts the run before either orchestrator's
  Step 0 executes, so "HALT below `approve`" can never fire.
  - *Fix (per Q2):* move to its own task.

- **`jsm_curl`'s "no caller consumes a return value" is false.** Its own docblock
  (`jira-sprint-lib.sh:29`) reads "Sets globals: JSM_HTTP_STATUS, JSM_BODY", and both mutating callers
  branch on them and abort: `manage-sprint-state.sh:45,49-50` and `move-sprint-issues.sh:46-47`, both
  under `set -euo pipefail`. This claim is the sole basis for the "free coverage, taken" decision.
  - *Consequence:* a defer branch that returns without setting the globals makes both scripts
    `exit 1` — directly contradicting the Testing Strategy row "`set -euo pipefail` scripts do not
    abort".
  - *Fix:* the defer branch must set `JSM_HTTP_STATUS=200` (accepted by both callers) and a jq-safe
    `JSM_BODY`.

- **`jira.transition` is already intercepted.** `jira-stage.js:447-449` calls `dm.defer` with
  `kind: "jira.transition"` and returns at `:500` with `reason: "deferred"`. And `jira-stage.js:621`
  is the **only** caller of `walkLadder` in the repository. Task 53's Layer 2 work on
  `walkLadder` + `transitionToStatus` + its inner `post()` is therefore redundant, and annotating all
  three nested sites risks 2–4 records for one logical hop — breaking the success criterion "exactly
  one record per logical mutation".
  - *Fix (per Q3):* drop transition from Layer 2.

#### Important

- **`jira-create-epic.js` bypasses the library entirely.** It calls global `fetch` directly
  (`skills/jira-epic-creator/scripts/jira-create-epic.js:291`, `:339`) against the legacy
  `/rest/api/2/issue`, and does not bundle `jira-sync.js`. It has no `makeHttp`/`fetchImpl` seam, so
  Layer 1's fail-closed guarantee does not reach it. There is precedent for this file drifting from
  the shared library — `task.46.bug.2` was filed for exactly that. The task never states the file's
  location and omits it from Files Summary.
  - *Fix (per Q4):* hand-roll a gate, add the real path, and state the exception in Decisions.

- **The kind arithmetic contradicts itself three ways.** The roster header
  (`tracker-access-record.md:233`) reads "**Jira — 9** (6 REST mutators + 2 sprint + 1 transition)" —
  the sprint kinds are *inside* the nine. So:
  - the description's "6 of 9 Jira mutation kinds **plus** the 2 sprint kinds" double-counts;
  - the Decisions row's "**~12 kinds** the pipelines actually fire" has no basis — 9 is the ceiling;
  - Motivation's "six of the nine … **with no call-site edits**" is contradicted by its own
    Implementation Plan, which edits four scripts and a bash file.

  Verified coverage after task 53:

  | Kind | Status |
  |---|---|
  | `jira.issue.create` | ✅ new — 3 sync scripts + `jira-create-epic.js` |
  | `jira.issue.update` | ✅ new — `putIssueAtomic` |
  | `jira.backlog.add` | ✅ new — `moveToBacklog` |
  | `jira.sprint.move-issues` | ✅ new — `jsm_curl` |
  | `jira.sprint.set-state` | ✅ new — `jsm_curl` |
  | `jira.transition` | ⚠️ **already owned** by `jira-stage.js:447` |
  | `jira.comment.add` | ❌ task 55 (stated) |
  | `jira.issue.link` | ❌ **no code path in the repo** (unstated) |
  | `jira.worklog.add` | ❌ **no code path in the repo** (unstated) |

  Accurate statement: **5 new kinds, 1 already covered, 6 of 9 total; 3 uncovered — one deferred to
  task 55, two with no interception point at all.**

- **Record vocabulary has drifted from the shipped schema.** The task says records carry "kind,
  target, deep link and human-readable field list". Task 52 actually shipped
  `{v,id,order,dependsOn,ts,run,step,skill,system,access,kind,consequence,produces,intent,target,desired,observed,satisfied,manual,command,verify,retry_of}`
  (`defer-mutation.js:686-716`). The deep link is `target.url` / `target.ui_url`; the human-readable
  "set Team to Platform" is `intent` (required — throws if absent, `:663-669`) plus `desired`. There
  is no "field list" field.

- **"Deferring mode" is undefined vocabulary.** It appears nowhere in shipped code or in task 52; the
  only occurrence in the repo is `.agents/plans/restricted-tracker-access.md:112`. The established
  concept is "a non-`full` mode". Define on first use or adopt task 52's language.

- **Deferred *update* has a different null shape than deferred *create*.** The create dry-run branch
  (`sync-jira-story.js:1005`) returns `{issueKey: null, issueUrl: null, updated: null}`, but the
  update dry-run branch (`:914-921`) returns a **real** `issueKey` with `updated: null`. The Decisions
  row implies one shape covers both; the success criterion silently narrows to creates only.

- **`sync-jira-epic.js` has two create-POST sites** — `:1125-1126` and a retry at `:1146-1147`. The
  plan says "the create-POSTs" without saying which one records, putting the "exactly one record per
  logical mutation" criterion at risk.

- **Files Summary is materially incomplete.** Eight files the plan requires are absent from it:

  | Missing file | Why it is needed |
  |---|---|
  | `shared/resources/tracker-access-record.md` | the 21st kind (Q1) |
  | `shared/resources/handover-render.js` | its `KIND_PRESENTATION` entry (Q1) |
  | `shared/resources/tests/handover-render.test.mjs` | the three hard-coded `20`s (Q1) |
  | `skills/jira-epic-creator/scripts/jira-create-epic.js` | named in the plan, absent from the table (Q4) |
  | `tests/json-output-fidelity.test.js` | named in plan step 4 |
  | `shared/resources/resolve-platform.sh` | the "PARTIALLY ENFORCED" notice at `:471-474` goes stale the moment Layer 1 lands |
  | `shared/resources/tracker-access.test.sh` | §17 asserts that notice string |
  | `skills/jira-sprint-{manager,retrospective,review-prep}/references/jira-sprint-lib.sh` | 3 bundled copies regenerated by `npm run bundle` |

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

The six steps are well sequenced and mostly specific — step 4's note that
`tests/json-output-fidelity.test.js` compares samples bidirectionally, so samples must move in the
same change, is exactly the kind of detail that prevents a mid-implementation surprise.

### Issues

#### Important

- **Step 2 lists five annotation sites for four kinds**, three of which (Q3) are redundant. After the
  decision it should read: `putIssueAtomic`, `moveToBacklog`, and the create-POSTs in four named
  scripts.
- **Step 5 is removed entirely** by Q2.
- **Step 1's `makeHttp({ access, system })` is written as if it describes the current signature.** It
  is actually `makeHttp({fetchImpl, timeoutMs, retries, retryDelayMs, maxRetryAfterMs})`
  (`jira-sync.js:1586`). Both new options must default so that all 14 bundled copies and 4 script
  call sites are unaffected — phrase it as an additive change.

#### Optional

- Step 3 should name the required `JSM_HTTP_STATUS` / `JSM_BODY` assignment, not just "a method
  check at the top".

**Effort estimate:** `estimated_effort_hours: 10`; the rubric computes 8 (base 2, +4 for 10 success
criteria, +1 for 6 plan steps, +2 high risk, +1 for >5 files). 20% divergence — well inside
tolerance. **No finding.** Note the Q1 and Q4 additions push real scope up, so 10 remains reasonable
even after the Q2 removal.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Critical

- **"The whole existing suite green unchanged" is unsatisfiable under Q1.** Adding a 21st kind
  necessarily edits `handover-render.test.mjs`. The criterion must narrow to "green except the
  roster-count assertions, which change by design".

#### Important

- **Files Summary ≠ Implementation Plan** (see the eight-file table above).
- **Testing Strategy needs three edits:** the "each of the 6 kinds" row should enumerate the 5 new
  kinds; the sprint row must assert `JSM_HTTP_STATUS` is set, not merely that the script "does not
  abort"; the `develop-next` row leaves with Q2.
- **Success Criteria:** "All 6 semantic kinds" → 5; add a criterion for the 21st roster kind
  rendering in all four formats; drop the orchestrator criterion.

#### Optional

- **Motivation overstates the interception point.** "Every Jira REST mutation in the repository
  passes through a small number of its functions" is false — `jira-create-epic.js` and the three
  `jsm_curl` mutation call sites do not. The Motivation and the Implementation Plan currently
  disagree with each other on this.
- **Uncovered kinds are unnamed.** `jira.issue.link` and `jira.worklog.add` appear nowhere in Scope or
  Out of Scope. Both have **no code path anywhere in the repo** — they exist only as roster rows,
  reachable only via MCP tools from prose. Worth one sentence in Out of Scope, since "the checklist
  says which items are generic so the reader knows" is the stated contract.

**Scope and complexity:** 6 plan steps, one file dominating. Appropriately sized — no split
recommended. Q2 makes it smaller and more coherent by removing the one step unrelated to Jira REST.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The strongest section in the document. All four named risks are real, correctly rated, and carry
actionable mitigations. The "never write a placeholder key to frontmatter — it would defeat the
idempotent `synced-from-*` label search" note is a genuinely subtle catch. The **Mutation-prove**
list (five specific invariants, each with the test that must go red) is exemplary and should be kept
verbatim.

### Issues

#### Important

- **Two discovered risks are unlisted:** double-recording via the `walkLadder → transitionToStatus →
  post()` chain overlapping `jira-stage.js`'s existing gate (Q3), and the roster/renderer/test triple
  that must move together or the suite fails closed (Q1).

#### Optional

- Rollback is a single line. Adequate for an additive, default-off gate — but it should note that
  reverting the roster addition requires reverting the renderer and test counts in the same commit,
  or the totality test fails.

---

## Summary of Recommendations

### Must Fix (Critical) — 4

1. **Add `jira.unknown-mutation` as a 21st roster kind** — roster row, `KIND_PRESENTATION` entry,
   three count assertions, and the schema doc's own stated count. Narrow the "suite green unchanged"
   criterion. _Per Q1._
2. **Remove the two orchestrator HALTs** and rewrite the Decisions row as a forward reference to a
   follow-up task. _Per Q2._
3. **Correct the `jsm_curl` premise** — delete "no caller consumes a return value"; specify that the
   defer branch sets `JSM_HTTP_STATUS=200` and a jq-safe `JSM_BODY`. _Verified against both callers._
4. **Drop `walkLadder` / `transitionToStatus` / `post()` from Layer 2**; cite `jira-stage.js:447` as
   the owner of `jira.transition`. _Per Q3._

### Should Fix (Important) — 7

1. Add the eight missing files to Files Summary.
2. Fix the kind arithmetic in description, Motivation, Decisions and Testing Strategy; state
   **5 new + 1 existing = 6 of 9**.
3. Replace "deep link and field list" with the real schema fields — `intent`, `target.url`,
   `target.ui_url`, `desired`.
4. Add the `jira-create-epic.js` Decisions row, its real path, and its hand-rolled gate. _Per Q4._
5. Distinguish deferred-update from deferred-create null shapes; correct `:819` → `:1005`.
6. Say which of `sync-jira-epic.js`'s two create-POSTs records.
7. Add the missing template sections: Technical Background, Progress Tracking, Change Log.

### Consider (Optional) — 6

1. Define "deferring mode" on first use, or adopt task 52's "non-`full`" language.
2. Name `jira.issue.link` and `jira.worklog.add` in Out of Scope as having no interception point.
3. Soften Motivation's "every Jira REST mutation".
4. Replace volatile line refs with function names (`:4147` → `findExistingByLabel`;
   `jira-sprint-lib.sh:43` → `:32`) — this task edits the very file it cites.
5. Phrase `makeHttp` as an additive signature change.
6. Correct "Step 0 state check" → `## Step 0 — Preflight` (moot if Q2 removes the step).

---

## Implementation Readiness Assessment

**Score:** 5/10

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 6/10 | Frontmatter and card preflight clean; four sections missing |
| Technical Accuracy | 4/10 | Zero hallucinations, but four claims contradicted by merged code |
| Implementation Clarity | 5/10 | Well-sequenced; Files Summary incomplete, one step redundant |
| Consistency | 4/10 | Kind arithmetic self-contradictory; a success criterion unsatisfiable |
| Risk Management | 7/10 | Genuinely strong; missed two discovered risks |

**Confidence Level for Successful Implementation:** Medium

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The design is right and the writing is good — this is a currency problem, not a
thinking problem. The task was written against the plan for 51–52 and merged reality moved. All four
critical issues have bounded fixes, all four are now decided, and none touches the two-layer
architecture that makes the task worth doing.

> A note on why this scored as low as it did: three of the four criticals would each have failed at
> runtime or in CI on first execution, not at review. A developer following this document would have
> written Layer 1, watched `buildRecord` throw on an unroutable kind, and had to redesign mid-task.

---

## Next Steps

1. Apply the four critical fixes (Q1–Q4 decisions above).
2. Apply the seven important fixes — Files Summary and the kind arithmetic are the two that most
   affect a developer following the plan.
3. File the follow-up task for `access.vcs: approve` support in `resolve-platform.sh` so the Q2
   removal does not lose the requirement.
4. Re-run `--check-card` after editing (heading changes can alter card resolution).
5. Promote to `ready-for-development` and run `/develop-task`.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-08-18
- **Review Depth:** Thorough
- **Task File:** `docs/tasks/task.53.jira-rest-interception/task.53.jira-rest-interception.md`
- **Pre-pass:** 2 parallel Explore agents (architecture alignment → `conflict`; codebase scan →
  `not-started`). Both high-severity claims independently re-verified before use; one agent
  arithmetic error (`8 of 9`) corrected against the roster.
- **Sources consulted:** `shared/resources/{jira-sync.js,jira-sprint-lib.sh,defer-mutation.js,jira-stage.js,tracker-access-record.md,resolve-platform.sh,effort-estimation-rubric.md}`,
  `shared/resources/tests/handover-render.test.mjs`, `skills/sync-jira-*/scripts/*.js`,
  `skills/jira-epic-creator/scripts/jira-create-epic.js`, `skills/jira-sprint-manager/scripts/*.sh`,
  `docs/tasks/task.5{1,2}.*`, `docs/architecture/concepts/*`, `package.json`
