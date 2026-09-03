# Task Review Report: Task 77 — Run the PR conformance review before a work item is finalised

**Reviewed:** 2026-09-03
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 Important recommendations implemented, plus O-2/O-3/O-4/O-5/O-6/O-7 — 2026-09-03.
> O-1 (a count in §7 that the enumeration supersedes) and O-8 (a stale architecture doc, out of scope) are recorded only.

---

## Executive Summary

Task 77 is an unusually well-sourced document: every file path it names exists, every line number it
cites is accurate, and the `/review-pr` CLI surface it plans to invoke (`--effort`, `--comment`) and the
verdict vocabulary it routes on (APPROVE / CONCERNS / REQUEST CHANGES) are all real. The pre-pass
codebase scan returned `not-started` — none of the scope is already built, so there is no scope to trim.

The findings concentrate in three places, all in the *plan* rather than the approach: the Phase 6
documentation sweep **omits two files that carry the exact contradiction the task exists to remove**; one
of its line-number citations points at rows the task itself puts out of scope; and one of the three
mutation proofs in §8 cannot hold as written, because the behaviour it proposes to revert is already
covered by a catch-all arm.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 8 💡

**User Clarifications:** 4 questions auto-answered (autonomous pipeline run — see below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

> **Autonomous run.** This review ran as Step 2 of a `/develop-task` pipeline dispatched by
> `/develop-next`. No human was prompted. Each question below is the question that *would* have been
> asked interactively, together with the answer taken and the reason. Deviations from the option the
> skill labels `(Recommended)` are called out explicitly.

### Question Point 1: Structure & Scope

**Q1: The task has no `github_issue:` in frontmatter. Create and link a GitHub issue now?**

- **Decision**: **Skip — leave unlinked.** _(deviates from the skill's `(Recommended)` option)_
- **Reason**: No sibling task in this repo carries a `github_issue` — checked tasks 70, 73, 75 and 76,
  all unlinked. Task→issue linkage is not this repo's convention, so creating one would be an
  outward-facing side effect that diverges from every neighbouring document rather than a routine
  default. The Important gap stays flagged; `/sync-github-task` remains available.
- **Impact**: No remote mutation. Finding I-5 stands as advisory.

**Q2: `§4 In Scope` lists "a `docs-pipeline` conflict tag in the roadmap Legend" as work, but the tag
already exists. Re-add, or mark satisfied?**

- **Decision**: **Mark satisfied.**
- **Reason**: `docs/development/project-completion-roadmap.md:68` already defines the tag, and T77's own
  row (line 92) already uses it — both landed when the task was filed. Re-adding would duplicate a
  Legend row.
- **Impact**: Finding I-3; fixed in Step 8.5.

### Question Point 2: Technical & Implementation

**Q3: The §8 mutation proof "revert the `review-pr` noop in `advance-pipeline-lock.sh` → its shell test
goes red" cannot hold. Drop the proof, or restate it?**

- **Decision**: **Keep the noop arm, restate the proof honestly.**
- **Reason**: `advance-pipeline-lock.sh:100` has a `*)` catch-all that already `exit 0`s on any unknown
  skill, so `review-pr` is *already* safe there. Removing the explicit arm changes no behaviour, and a
  behaviour-asserting shell test would stay green. Task 76 — which this task cites — names exactly this
  case: an unheld proof whose diagnosis is **redundant source**, not a vacuous test. The arm is still
  worth adding for explicitness and documentation; the proof is what needs rewording.
- **Impact**: Finding I-2; fixed in Step 8.5.

### Question Point 3: Completeness & Safety

**Q4: 7 phases, 36 top-level checkboxes and a ~15-document sweep. Split the task, or keep it whole?**

- **Decision**: **Keep as one task.**
- **Reason**: The obvious split — behaviour in one task, documentation in another — would recreate
  precisely the drift this task exists to close. §6 states the reason ("A developer's model of the
  pipeline comes from these files") and §9 gates acceptance on the documentation criteria, so the doc
  phase is load-bearing, not a tail. 7 phases is under the >8 oversize heuristic.
- **Impact**: No change to scope.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (minor)

All 11 mandatory numbered sections are present (Overview → Rollback Plan), plus Change Log, Progress
Tracking, References and Notes. Filename follows `task.{n}.{descriptive-name}.md`. No placeholders
(`[TBD]`, `[TODO]`, `???`) anywhere in the document.

**OKF frontmatter**: `type: task` present and non-empty ✅; `description` present ✅; `tags` is a YAML
list ✅; `updated` present ✅. Conformant.

**Tracker card preflight** — `sync-jira-task.js --check-card` exits 0, no findings. All three card blocks
resolve:

| Block | Kind | Chars | Omitted (shown as `+N more`) |
| --- | --- | --- | --- |
| Summary | prose | 274 | +6 |
| Success Criteria | list | 419 | +12 |
| Breaking Changes | prose | 139 | +3 |

Reported as information, not a defect — a board reader sees the first slice of each and a link to the
rest.

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, per spec.

### Issues

#### Important

- **[I-4] Change Log is stale** — the newest (and only) row is `1.0 Initial draft` (2026-09-01,
  `create-task`), but frontmatter `status:` is `ready-for-development`. Status has advanced past
  `planned` with no row recording a review or promotion. `change-log.enabled` is unset, so the default
  `true` / `advisory` applies: this deducts from the score and does **not** block development.

- **[I-5] No tracker issue linked** — frontmatter carries no `github_issue:`. Flagged per spec; see Q1
  for why no issue was created. Consistent with every sibling task in the repo.

**Score: 9/10**

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

This section is the document's strongest. Every verifiable claim was checked against the tree and held:

| Claim (task §) | Verified |
| --- | --- |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` has PASS/WAIVED outcome arms and a `ready-for-merge` block | ✅ arms at L233–234, `--stage ready-for-merge` at L245 |
| `advance-pipeline-lock.sh` noops for `qa-story\|qa-task\|qa-fix` | ✅ L80, quoted verbatim in §3 |
| `advance-pipeline-lock.sh` validates `1\|2\|3\|4\|5\|6\|7\|8` | ✅ L116 |
| `docs/reference/pipeline-artifacts.md:50` calls `/review-pr` "standalone — not a pipeline step" | ✅ exact line, exact wording |
| `docs/runbooks/qa-flow.md` L18–23 is the mermaid block with no PASS successor | ✅ |
| `docs/runbooks/qa-flow.md` L60 is "Repeat until `PASS` or `WAIVED`" | ✅ |
| `EXPECTED_STEPS` is the 8-name array walked monotonically | ✅ `pipeline-shape.test.mjs:26` |
| `STEP_KEYWORDS["5-6"]` exists | ✅ `step-contract.test.mjs:41` — currently `["qa-task", "qa-fix", "gate"]` |
| `transition-protocol-parity.test.mjs` hard-codes the develop-batch lane marker | ✅ around L258–283 |
| `docs/standards/file-naming.md` already defines `*.pr-review.{n}.{name}.md` | ✅ L37 (story), L51 (task) |
| `evals/shared/tests/*.test.mjs` is already globbed → no `package.json` edit | ✅ confirmed in `package.json` `test` script |
| `/review-pr` accepts `--effort {low\|medium\|high\|max}` and `--comment` | ✅ SKILL.md L36, L41–42 |
| `/review-pr` verdicts are APPROVE / CONCERNS / REQUEST CHANGES | ✅ SKILL.md L286–288 |
| `--comment` must be passed explicitly or the skill asks first | ✅ SKILL.md L52 — Phase 3's rationale is exactly right |
| `develop-bug` runs a separate verify-loop file | ✅ and it does **not** bundle the shared QA loop |
| Every one of the ~19 Phase 6 target documents exists | ✅ all present, none missing |

### Issues

#### Important

- **[I-6] `docs/reference/commands.md` line citation points at out-of-scope rows.** Phase 6 cites
  "`docs/reference/commands.md` (L20–24, L57–58)". L57–58 is right — those are the two `/review-pr` rows.
  **L20–24 is not**: those five lines are the `/develop-next`, `/develop-next --dry-run`,
  `/develop-batch`, `/develop-batch --dry-run` and `/loop /develop-next` orchestrator rows, which §4
  explicitly places **out of scope** ("Any renumbering of `develop-next` / `develop-batch` steps").

  The rows in this file that actually restate the pipeline chain are **L11–12**:

  ```
  | `/develop-story <path>` | Full story lifecycle: branch → review → develop → PR → QA → fix → finalise → commit | … |
  | `/develop-task <path>`  | Full task lifecycle (no epic) | … |
  ```

  L11 is the file's one literal spelling-out of the pipeline shape, and it is the line that becomes wrong
  when 5c lands. An implementer following the citation mechanically would edit out-of-scope rows and
  leave the actual contradiction in place. The task's own §"Why the docs phase is unusually specific"
  argues that naming files and line numbers is what separates a complete sweep from a plausible one —
  which is exactly why this single bad citation matters here. Phase 6's re-derivation greps would
  eventually catch it, so the mitigation exists, but the citation should be corrected.
  **Fix**: cite L11–12 and L57–58.

**Risk 4 pre-verified**: `transition-protocol-parity.test.mjs:291–310` asserts `--stage ready-for-merge`
matches *somewhere* in each loop file via regex. Moving the stage **within** the file keeps the match, so
the mitigation in §10 Risk 4 is sound as stated.

**Score: 9/10**

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

36 top-level checkboxes across 7 phases, each naming concrete files and concrete edits. Phase risk levels
present and proportionate. Dependencies are implicit but unambiguous (Phase 7 bundles what Phases 1–6
wrote).

**Effort estimate**: frontmatter `estimated_effort_hours: 10`. Rubric recompute — `ac_count`=17,
`task_count`=36, `risk_level`=medium, `files_touched`=14 (>5), integration keywords present →
`2 + 4 + 4 + 1 + 1 + 2 = 14` → snaps to **16h**. Divergence is `|10−16|/16 = 0.375`, under the 0.5
threshold, so **no finding is raised**. Recorded for information only.

### Issues

#### Important

- **[I-3] An in-scope item is already satisfied.** §4 In Scope lists
  `✅ A `docs-pipeline` conflict tag in the roadmap Legend`. That tag already exists at
  `docs/development/project-completion-roadmap.md:68` (`docs/runbooks/*`, `docs/concepts/*`,
  `docs/reference/pipeline-artifacts.md`, `docs/operations/workflows.md`, `skills/develop-*/README.md`),
  and T77's own roadmap row already carries `docs-pipeline!`. Both landed at filing time. No Phase in §6
  covers a Legend edit and §7 does not list the roadmap file, so the In Scope line is the only trace —
  an implementer working the scope list top-down would add a duplicate row.
  **Fix**: mark the item as already satisfied at filing.

**Score: 9/10**

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Internal consistency between Overview, Scope, Implementation Plan and Files Summary is otherwise good,
and §8's Testing Strategy covers all seven phases (structural checks, dual-shell execution, end-to-end
dogfood, mutation proving).

### Issues

#### Important

- **[I-1] Phase 6 omits two files carrying the exact contradiction.** The sweep's stated bar is that "a
  reader of any of them learns that a PR conformance review now runs". Two documents state the opposite
  and are named nowhere in task 77 — not in Phase 6, not in §7 Files Summary, not in the References:

  | File | Line | Current text |
  | --- | --- | --- |
  | `docs/standards/story-documents.md` | 106 | `\| PR review report \| story.{E}.{S}.pr-review.{N}.{name}.md \| review-pr (standalone) \| …` |
  | `docs/standards/task-documents.md` | 108 | `\| PR review report \| task.{N}.pr-review.{N}.{name}.md \| review-pr (standalone) \| …` |

  These are the artifact-ownership tables — the very place a developer looks to find out which skill
  produces a `pr-review` report. They will still say `(standalone)` after Phase 6 closes as written.
  The task anticipates this class of miss ("the enumeration above is a snapshot, not an inventory") but
  neither re-derivation grep would catch them: they contain none of `qa-fix`/`qa-story`/`qa-task`, and
  the second grep is scoped to `docs/reference/` and `docs/concepts/` only — not `docs/standards/`.
  **Fix**: add both files to Phase 6 and widen the second re-derivation grep to cover `docs/standards/`.

- **[I-2] A mutation proof in §8 cannot hold as written.** The proof reads:
  *"Revert the `review-pr` noop in `advance-pipeline-lock.sh` → its shell test goes red."*
  `advance-pipeline-lock.sh:100` already has `*)  # Unknown skill = not a pipeline sub-skill = silent
  noop / exit 0 ;;`. Removing `review-pr` from the explicit arm therefore changes **no behaviour** — the
  call falls through to the catch-all and still exits 0 leaving `current_step` untouched, so a test
  asserting the *behaviour* stays green. The proof holds only against a test asserting the *literal
  string* in the arm, which is the prose-assertion pattern task 67 exists to discourage.

  Task 76 (cited by this task) names the diagnosis for exactly this shape: an unheld proof is **vacuous
  test, redundant source, or wrong premise** — this is redundant source. The arm remains worth adding for
  explicitness and testability, but §8 should say so rather than predict a red that will not appear.
  **Fix**: restate the proof and record why it is expected not to hold.

#### Optional

- **[O-1] Count drift in §7 Files Summary.** Item 10 says "3 diagrams, 7 runbooks, 8 reference/concept
  docs". The Phase 6 enumeration names 10 distinct reference/concept files once
  `docs/concepts/restricted-access.md` is counted (it sits under Runbooks in the prose but is a concept
  doc). Cosmetic; the enumeration governs, not the count. Grows to 12 once I-1 is applied.

- **[O-2] Phase 2's shell test is greenfield, not an extension.** `advance-pipeline-lock.test.sh` has 6
  scenarios and **every** one invokes `--skill commit-changes` — there is currently no coverage of the
  `qa-story|qa-task|qa-fix` noop arm at all. "Cover it in the shell test" is therefore new scaffolding
  rather than one more case in an existing pattern, and the same edit should backfill the three existing
  arms while it is there.

- **[O-5] `docs/runbooks/qa-flow.md` has no "Related skills" heading.** Phase 6 says "an entry in Related
  skills (L88)". L88 sits inside `## Cross-skill data flow` (L86–90); the file's closing section is
  `## See also` (L92). Every other citation for this file is exact (mermaid block L17–23, "Repeat until
  `PASS` or `WAIVED`" at L60). **Fix**: name `## See also`, or say a new section is being added.

- **[O-6] The proposed `qa-flow.md` edge introduces a new node, not just an edge.** That diagram's
  terminal today is `C[qa-gate]` — it models the QA sub-flow only and has **no `finalise` node**. Adding
  `E -->|APPROVE/CONCERNS| F[finalise]` changes what the diagram scopes. Not wrong, but a deliberate
  decision rather than the mechanical edge-add the table implies.

- **[O-7] Both `pipeline-shape.test.mjs` titles hard-code a step count.** develop-task's is
  `"SKILL.md: lists all 8 pipeline steps in order"` (L41) — accurate today, stale once `review-pr` joins
  `EXPECTED_STEPS`. develop-story's is `"SKILL.md: lists all 9 pipeline sub-skills in order"` (L45)
  against an 8-entry array — **already off by one**, and would become accidentally correct. Fix both
  titles in the Phase 5 edit.

- **[O-8] `docs/architecture/concepts/tech-stack.md` is stale about CI — and the task is right.** It says
  CI "lives at `.github/workflows/validate.yml` … Runs `npm test` on every push to main". The real
  workflow is `.github/workflows/test.yml` running `format:check` + `npm test` + `eval:all`, which is
  what §8 asserts. This is a pre-existing architecture-doc defect, **out of scope** for task 77 — noted
  so it is not mistaken for task drift, and worth its own ticket.

- **[O-3] `develop-bug`'s loop file is skill-native, not shared.** §3 and §7 are correct that
  `develop-bug-step-5-6-verify-loop.md` is a separate file, but it lives only at
  `skills/develop-bug/references/` and carries no `AUTO-GENERATED` banner — there is no
  `shared/resources/` source. Worth stating, because §6's standing rule ("Edit `shared/resources/` only")
  would otherwise send someone hunting for a source that does not exist.

- **[O-4] A naive `grep -rn "review-pr"` is misleading.** `code-review-prompt.md` and `review-prd` both
  contain the substring, manufacturing phantom hits — including two inside
  `develop-pipeline-step-5-6-qa-loop.md` itself (L143, L191) that could be mistaken for prior art. Phase
  6's own greps do not use that pattern, but the dogfood and re-derivation steps should use
  `grep -rnE "review-pr([^a-z-]|$)"`.

**Score: 8/10**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Six risks, each with a named likelihood, impact and mitigation. The set is well chosen — Risk 1
(prose passes review but fails on zsh) and Risk 3 (the doc sweep gets dropped) are the two failure modes
this repo has actually experienced, and both carry structural mitigations rather than intentions: §8
mandates dual-shell execution, and §9 gates acceptance on the documentation criteria.

Risk 4 was verified directly during this review and the mitigation is sound (see §2).

The Rollback Plan is specific and, unusually, offers a **partial** rollback: deleting §5c and restoring
the two PASS/WAIVED arms disables the gate while leaving every doc, test and contract in place. That is
the right shape for an additive change inside an existing loop.

The one gap is I-2 above, which is a defect in a *proof of* the change rather than in the change itself.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 6 issues

1. **[I-1]** Add `docs/standards/story-documents.md` and `docs/standards/task-documents.md` to Phase 6,
   and widen the second re-derivation grep to include `docs/standards/`. _(per Q-none — objective miss)_
2. **[I-2]** Restate the `advance-pipeline-lock.sh` mutation proof; record that it is expected not to
   hold, and why. _(per decision on Q3)_
3. **[I-3]** Mark the `docs-pipeline` Legend item in §4 as already satisfied at filing. _(per decision on Q2)_
4. **[I-4]** Write a Change Log row recording this review. _(handled in Step 8.5)_
5. **[I-5]** No tracker issue — left unlinked deliberately. _(per decision on Q1; no action)_
6. **[I-6]** Correct the `commands.md` citation from L20–24 to L11–12. _(objective miss)_

### Consider (Optional) — 8 items

1. **[O-1]** Correct the reference/concept doc count in §7.
2. **[O-2]** Note that Phase 2's shell test is greenfield, and backfill the three existing noop arms.
3. **[O-3]** Note that `develop-bug`'s loop file is skill-native, so the shared-source rule does not apply.
4. **[O-4]** Use a word-boundary grep for `review-pr`.
5. **[O-5]** `qa-flow.md` has `## See also`, not "Related skills".
6. **[O-6]** The `qa-flow.md` edge adds a `finalise` node the diagram does not have.
7. **[O-7]** Fix both `pipeline-shape.test.mjs` titles (develop-story's is already off by one).
8. **[O-8]** File the stale `tech-stack.md` CI description separately — out of scope here.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Zero critical issues and zero hallucinations across an unusually large surface — every
path, line number, CLI flag and verdict name checks out against the tree. The six Important findings are
all corrections to the *plan*, not to the approach: two omitted sweep targets, one miscited line range,
one proof that needs honest restatement, one already-done scope line, and a stale Change Log. All are fixed in Step 8.5 before
`/develop` runs.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work Phases 1–7 in order; Phase 7 (`npm run bundle`, `npm run generate-catalog`) must run last.
2. Edit `shared/resources/` only — never `skills/*/references/`, which the next bundle reverts.
3. Execute every added shell snippet under **both** bash and zsh (§8, Risk 1).
4. Treat Phase 6 as acceptance-gating, and re-derive its file list rather than trusting the enumeration —
   including the two files added by I-1.
5. Gate on `npm run ci` (`ci:fast` + `eval:all`), not `npm test` alone.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, Step 2 of `/develop-task` dispatched by `/develop-next`)
- **Review Date:** 2026-09-03
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Pre-pass agents:** both returned.
  - **Agent C** (codebase already-implemented scan) → `implementation_status: not-started`. Supplied the
    contradiction-site map behind I-1, and the warning behind O-4.
  - **Agent B** (architecture alignment) → `alignment: aligned`, `missing_paths: []`. Supplied I-6, O-2,
    O-5, O-6, O-7 and O-8, and **refuted a draft finding of this review**: an earlier pass reported that
    no assertion in `review-pr.test.js` quotes the "do not call" sentence. One does —
    `review-pr.test.js:546`, `assert.match(SKILL, /do \*\*not\*\* call \`\/review-pr\`/)`. The draft
    finding was a false negative from a grep whose pattern did not account for the backslash-escaped
    asterisks in the test source. Task 77's Phase 5 item is correct as written: that assertion will go
    red on the Phase 4 rewrite and must be updated.
