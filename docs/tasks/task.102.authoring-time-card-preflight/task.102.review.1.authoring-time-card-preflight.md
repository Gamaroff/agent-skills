# Task Review Report: Task 102 — The card preflight runs in every review-* skill and no create-* skill

**Reviewed:** 2026-09-10
**Review Depth:** Standard
**Task Status:** Draft → Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

A well-evidenced task built from a measured failure (PR #355), with an explicit trap section and a
testing strategy that leads with anti-vacuity. Every technical claim in § 3 was re-verified against
the tree rather than taken on trust, and two of them did not survive: the checker is **not** already
bundled into all three `create-*` skills, and the out-of-scope rationale for `create-bug-report`
rests on a rule that does not say what the task says it says. Both are corrected. A third finding is
structural: there are **four** section specs, not three, and Success Criterion 4 cannot mean anything
while the fourth stays behind.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` → `/develop-task`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `develop-task` pipeline, itself dispatched by `/develop-next` in
autonomous mode. No `AskUserQuestion` was issued; every gate took its documented auto-answer:

| Gate | Auto-answer | Source |
| :--- | :--- | :--- |
| Step 0 output format | Comprehensive report | `develop-pipeline-autonomous-defaults.md` |
| Step 2 check 5 tracker sync | Sync to GitHub (Recommended) | develop-next directive — take the recommended option |
| Step 8.5 apply fixes | Yes, apply all critical + important fixes | develop-task skill-specific defaults |
| Step 9 status update | Yes, fixes complete | develop-task skill-specific defaults |

**Phase 1.5 pre-pass subagents were not dispatched.** The session carries a standing instruction not
to use the Agent tool unless the user asks. Both axes were covered inline instead — architecture
alignment by reading the tree the task describes, and the already-implemented scan by grepping for
every `CARD_SECTIONS` definition and every `check-card` call site. The findings below are the output
of that scan, so the axis was reviewed, not skipped.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory numbered sections are present, plus Change Log, Progress Tracking, References
and Notes. Filename follows `task.{n}.{descriptive-name}.md`. No placeholders (`TBD`, `TODO`, `???`)
anywhere in the document.

**OKF frontmatter:** `type: task` present and non-empty ✅; `description` present ✅; `tags` is a
YAML list ✅; `updated` present ✅.

**Sign-off / Change Log:** `sign-off` is not configured in `skills-config.yaml`, so check 4a is
skipped entirely. `change-log` is likewise unconfigured, so it defaults to `enabled: true`,
`enforcement: advisory` — the document has a `## Change Log` with the four canonical columns and one
row, and `status: draft` has not advanced past `planned`, so the currency heuristic does not fire.
Both clean.

**Tracker card preflight (check 5a):**

```
node .agents/skills/sync-jira-task/scripts/sync-jira-task.js --file <task> --check-card --json
→ { "ok": true, "findings": [] }
```

All three card blocks resolve — `Summary` (prose, 213 chars, 3 omitted), `Success Criteria` (list,
679 chars, 4 omitted), `Breaking Changes` (prose, 92 chars). The `+N more` counts are reported here
as information: a board reader sees roughly the first four sentences of the Overview and the first
five success criteria, with the rest behind the document link. That is the contract working, not a
defect.

### Issues

#### Important

- **[Important] No `github_issue` in frontmatter** — the task was filed by PR #358 without one, so
  it was invisible to every tracker path. **Fixed this run**: dedup search returned zero matches for
  `in:title "[Task 102]"`, issue **#372** was created against the `Technical Tasks (standalone)`
  milestone with labels `task` + `priority:medium`, added to board `Agent Skills` (#1), board
  Priority mirrored to **P2**, and `github_issue: 372` plus the body cross-reference link written
  back. The board Estimate field does not exist on that project, so the estimate was skipped — a
  board-configuration gap, not a task defect.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — but **2 of 3 verified claims in § 3 were wrong**

Nothing invented. The failures here are the opposite kind: claims about the repository's current
state that were plausible, were labelled "verified rather than assumed", and were not.

### Issues

#### Important

- **[Important] § 3 claim 1 is false for `create-epic`.** The task states "`create-task` bundles
  `references/jira-sync.js` … No new dependency and no new install surface." Checked all three:

  | Skill | `references/jira-sync.js` |
  | :--- | :--- |
  | `create-task` | bundled |
  | `create-story` | bundled |
  | `create-epic` | **NOT bundled** |

  Adding the call to `create-epic` makes `npm run bundle` pull a 5,538-line module into that skill's
  `references/`. That is automatic, and it is still a new install-surface entry.
  **Fix applied** — § 3 claim 1 rewritten to say "in two of the three skills" and name the
  consequence.

- **[Important] § 4's out-of-scope rationale for `create-bug-report` rests on a misread rule.** The
  task says "Bug reports are barred from tracker cards by the comment contract, so no preflight
  applies." Verified against the code and the contract:

  - `sync-jira-bug` defines `BUG_CARD_SECTIONS` (`sync-jira-bug.js:53`) with `Summary`,
    `Reproduction` and `Impact` blocks, and supports `--check-card` (`:476`). Bug reports plainly
    **do** get tracker cards.
  - The rule that actually bars something is about the **Change Log**: `AGENTS.md` records "bug
    reports use `## Status History`" as a Change Log exclusion. It says nothing about cards.

  **Fix applied** — § 4 rewritten with the true reason (see finding 3 below), and § 1's table gained
  a row naming the bug gap explicitly so the document no longer reads as if the population were
  three skills.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (one, structural — now closed)

Phases are four, each with a purpose, and Phase 4 correctly ends on `npm run bundle`. § 7 names the
trap and § 8 names the open decision. This is unusually complete for a draft.

### Issues

#### Important

- **[Important] There are four section specs, not three, and Success Criterion 4 is unsatisfiable as
  written.** Enumerated every definition site in the tree:

  | Definition | Location |
  | :--- | :--- |
  | `TASK_CARD_SECTIONS` | `skills/sync-jira-task/scripts/sync-jira-task.js:47` |
  | `STORY_CARD_SECTIONS` | `skills/sync-jira-story/scripts/sync-jira-story.js:39` |
  | `EPIC_CARD_SECTIONS` | `skills/sync-jira-epic/scripts/sync-jira-epic.js:34` |
  | **`BUG_CARD_SECTIONS`** | `skills/sync-jira-bug/scripts/sync-jira-bug.js:53` |

  SC4 asks for "exactly one place" with a non-vacuity floor. Move three and the assertion has to
  enumerate *which* three — the § 7 enumeration trap, reintroduced inside the assertion written to
  prevent it. Moving the fourth costs one import.

  **Fix applied** — § 4 in-scope, Phase 1, § 9 Files Summary, SC4, SC6 and § 10 all widened to four
  specs, with the reasoning stated inline rather than left for the implementer to rediscover.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (one — now recorded as a deferred follow-up)

Internal consistency is good: Overview, § 4 scope, § 9 Files Summary and § 11 Success Criteria all
described the same work before the edits and still do after them. Testing Strategy leads with the
anti-vacuity fixture, which is the right ordering for a task whose main risk is a present-but-inert
call.

**Scope and complexity:** four phases, ~3h estimated, single coherent concern. Well under the
oversized-task threshold. No split recommended.

### Issues

#### Important

- **[Important] Bug reports have no preflight at any of the three layers, and the task did not say
  so.** Measured, not inferred:

  | Layer | task | story | epic | **bug** |
  | :--- | :--- | :--- | :--- | :--- |
  | authoring (`create-*`) | 0 | 0 | 0 | **0** |
  | review (`review-*`) | 1 | 1 | 1 | **0** |
  | CI corpus test | ✅ (`:558`) | ✅ (`:612`) | ✅ (`:613`) | **absent** |

  The `review-*` row is the task's own § 1 table and is correct as far as it goes; `review-bug` has
  zero `check-card` references, and the corpus loop in `jira-sync-card-summary.test.mjs` iterates
  story and epic with task tested separately — bug appears nowhere. So a thin bug card is caught by
  nothing at all, which is a strictly worse position than the one this task exists to fix.

  **Not pulled into scope, deliberately.** Closing it needs a `review-bug` change plus a new corpus
  test whose fallout across the existing bug corpus is unmeasured — that is a second task, and
  widening this one to absorb it would be exactly the scope drift § 7 guards against. **Fix
  applied**: § 4 now records it as an explicit deferred follow-up with the measurements above, so it
  is filed rather than forgotten. Phase 1 moving `BUG_CARD_SECTIONS` means the follow-up is a call
  site and a test, not another move.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

`risk_level: low` is right — the check is offline and advisory, and the spec move is
behaviour-preserving with re-exports retained. The four-row risk table names the real risks in the
right order, and the top one (present-but-inert) is mapped to the primary test rather than to prose.
§ 13's claim that the two phases are separably revertible holds: removing the authoring call and
reverting the spec move touch disjoint files.

No findings.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 4 issues — **all 4 applied this run**

1. ✅ **Fixed**: § 3 claim 1 corrected — `create-epic` does not bundle `jira-sync.js`; the "no new
   install surface" claim now scoped to the two skills where it holds.
2. ✅ **Fixed**: § 4's `create-bug-report` rationale replaced — the barred-from-cards premise is
   false; the true reason (a wider, separately-scoped gap) now stated with its measurements.
3. ✅ **Fixed**: all four specs now in scope for the Phase 1 move — § 4, Phase 1, § 9, SC4, SC6 and
   § 10 updated together, so no reader meets a stale "three".
4. ✅ **Fixed**: `github_issue: 372` created, linked, boarded, prioritised, and written back to
   frontmatter and body.

### Consider (Optional) — 2 items

1. 💡 § 8's naming question is well posed but carries no decision procedure. SC8 requires it be
   answered in the implementation report — which is the right place, so this is a note rather than a
   defect. The constraint that will decide it: a GitHub-only consumer under platform-aware skill
   exclusion may not install `sync-jira-*` at all, so if the requirement is tracker-agnostic its
   definition cannot live behind a Jira-only skill. `shared/resources/jira-sync.js` is Jira-*named*
   but is not a Jira-only skill — it is already bundled into `create-task` and `create-story` — so
   placement there answers the practical half; the naming half stays open.
2. 💡 `jira-sync-card-summary.test.mjs:469` asserts `TASK_CARD_SECTIONS.length === 3` directly. SC6
   already covers this; the line reference is now in the criterion so the implementer does not have
   to find it.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — everything present; one Important tracker-linkage gap, fixed
- Technical Accuracy: 6/10 — nothing invented, but two of three "verified" claims did not hold
- Implementation Clarity: 9/10 — four phases, explicit trap, explicit open decision
- Consistency: 8/10 — internally coherent; the bug-layer gap was unrecorded
- Risk Management: 9/10 — right level, right mitigations, separable rollback

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues, and all four Important findings
were applied to the document in this run.

**Justification:** The task was already implementable; what the review changed is that it is now
implementable against the tree as it actually is. The two false § 3/§ 4 claims would each have sent
an implementer down a wrong path — one expecting a bundled module that is not there, the other
skipping a fourth definition site on a rule that does not exist.

---

## Next Steps

Task is ready for implementation. The implementer should:

1. Phase 1 — move all four specs into `shared/resources/jira-sync.js`, re-export from each
   `sync-jira-*` module.
2. Phase 2 — add the advisory preflight call to `create-task`, `create-story`, `create-epic`.
3. Phase 3 — answer § 8 in the implementation report (SC8) and let placement follow the answer.
4. Phase 4 — `npm run bundle`, commit the regenerated `references/`.
5. Lead the test work with the anti-vacuity fixture (§ 10), not with the happy path.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous pipeline mode)
- **Review Date:** 2026-09-10
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.102.authoring-time-card-preflight/task.102.authoring-time-card-preflight.md`
- **Architecture Docs Consulted:** `AGENTS.md`, `shared/resources/tracker-card-summary.md` (via the card contract), `docs/reference/anti-patterns.md` § *Never fix N call sites without a population check*
- **Evidence gathered by:** direct grep/inspection of `skills/sync-jira-{task,story,epic,bug}/scripts/`, `skills/create-{task,story,epic,bug-report}/references/`, `skills/review-bug/SKILL.md`, `shared/resources/tests/jira-sync-card-summary.test.mjs`
