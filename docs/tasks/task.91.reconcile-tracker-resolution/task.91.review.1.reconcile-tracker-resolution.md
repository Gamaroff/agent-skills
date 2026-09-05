# Task Review Report: Task 91 — Reconcile install-time and run-time tracker resolution

**Reviewed:** 2026-09-05
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-09-05

---

## Executive Summary

Task 91 is an unusually well-sourced task document: every technical claim it makes about the two
resolvers was verified against the actual files during this review and **all of them are accurate**,
including the one claim most likely to be stale (the `shellcheck` baseline). Its structure is complete,
its options analysis records why the rejected options were rejected, and its Phase 1 is honest about the
fact that the approach is not yet decided. The defects found are peripheral — two stale line references
and two missing frontmatter fields — not substantive.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — see below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline under an **AUTONOMOUS RUN** directive from
`/develop-next`. No interactive questions were asked. The following were auto-answered with the
recommended option and are recorded here in place of user decisions:

| Question point | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 2 — tracker sync (no `github_issue`) | Sync to GitHub | Tasks 83 (#316) and 84 (#317) both carry issues; the pipeline's Steps 4 and 7 expect one to comment on and close |
| Step 8.5 — apply fixes | Yes, apply all critical + important | Pipeline needs the task corrected before `/develop` runs |
| Step 9 — update status | Yes, fixes complete | Promote `planned` → `ready-for-development` |

---

## 1. Template Structure Compliance

**Status:** PASS (after fixes)

All eleven mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes. No placeholders
(`[TBD]`, `[TODO]`, `???`) anywhere in the document. Filename follows `task.{n}.{descriptive-name}.md`
with dots as structural separators.

**Stakeholder Sign-off**: not checked — `sign-off.enabled` is absent from `skills-config.yaml`, so the
section is correctly not expected.

**Change Log** (check 4b): present with the four canonical columns and one row. Currency was satisfied
at review time (`status: planned`, newest row `1.0 Initial draft`). Two rows were appended by this
review per the Step 8.5 / Step 9 contract.

**OKF conformance**: `type: task` present and non-empty ✅; `description` present ✅; `tags` a valid YAML
list ✅; `updated` present ✅.

**Tracker card preflight** (`sync-jira-task.js --check-card`): **exit 0, no findings.** All three card
blocks resolve — Summary (prose, 364 chars, +4 omitted), Success Criteria (list, 504 chars, +7 omitted),
Breaking Changes (prose, 100 chars, +3 omitted). The `+N more` counts are reported here as information,
not defects: a board reader will see roughly the first third of each block.

### Issues

#### Important

- **[Important] No tracker issue linked.** Frontmatter carried no `github_issue:`, while sibling tasks
  83 and 84 both do (#316, #317). Without it, Step 4 (`create-pr --issue`), Step 7 (issue close + board
  Done) and every tracker comment in the pipeline silently no-op.
  **Fixed** — created [#319](https://github.com/Gamaroff/agent-skills/issues/319) (labels `task`,
  `priority:medium`; milestone `Technical Tasks (standalone)`; added to the *Agent Skills* board with
  Priority P2), wrote `github_issue: 319` to frontmatter, and added the body cross-reference link.
  A dedup search (`gh issue list --search 'in:title "[Task 91]"' --state all`) returned zero matches
  first.

- **[Important] Missing `risk_level:` frontmatter.** The document has a rich §10 Risk Assessment that
  names a **HIGH RISK** item, but no `risk_level:` field. This is not cosmetic: the develop pipeline's
  lite-mode detector reads exactly this field, and treats *absent* as satisfying the `risk_level ∈
  {low, absent}` condition. On this run the task escaped lite mode only because the other two
  conditions failed (4 phases ≥ 3, multi-module). Had the plan been consolidated into two phases, a
  task whose own risk section says HIGH would have taken the **shortened QA path**.
  **Fixed** — added `risk_level: medium`, matching Phase 2 ("Risk: Medium"), which the document itself
  identifies as the phase that carries the task.

#### Optional

- **[Optional] `estimated_effort_hours: 3` diverges from the rubric.** Recomputing
  `references/effort-estimation-rubric.md` against the current document: `ac_count`=12, `task_count`=13,
  `files_touched`=5, `risk_level` absent at the time, `has_integration`=true ("migration") →
  `2 + 4 + 4 + 0 + 0 + 2 = 12` → snapped to **8h**. Divergence is `|3−8|/8 = 0.63`, above the 0.5
  threshold. **Not changed** — this is non-blocking by spec, and silently overwriting an author's own
  estimate is not a fix a reviewer should make unprompted. Flagged for the author to confirm or adjust.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every file the document references exists on disk, and every substantive technical claim was verified:

| Claim | Verified |
|---|---|
| `resolve-platform.sh:424-437` is the identity resolution | ✅ — that range is the `TRACKER` resolution block ending in `validate_enum … jira github auto \|\| return 1` |
| The runtime **halts** on an unrecognised scalar | ✅ — `validate_enum` returns 1 |
| The installer **silently defaults** instead | ✅ — `_resolve_install_tracker`'s `case` falls through `jira\|github)` to `*)`, which probes `JIRA_URL` then defaults `github` |
| The installer probes `.env`; the runtime does not | ✅ — `grep -qE '^JIRA_URL=.+' .env` in the installer; no `.env` read in `resolve-platform.sh` |
| The installer strips a trailing `\r` and one matched quote pair | ✅ — `_t=${_t%$'\r'}` plus the two `case` arms |
| A lone unmatched quote falls through to the default | ✅ — matched-pair-only stripping, and a test pins it |
| The map form resolves as `auto` at both ends | ✅ — installer's awk pattern requires a same-line value; runtime maps `__MAP__` → `auto` |
| `configuration.md` says a scalar is validated and `tracker: bitbucket` is rejected | ✅ — verbatim at line 153 |
| The §4b parity table has ten cases | ✅ — `PARITY_CASES` has exactly 10 entries |
| The `DELIBERATE asymmetry` test pins the divergence and says to update both sides together | ✅ — quoted assertion message matches the document verbatim |
| **`shellcheck` baseline is 1 pre-existing SC2209** | ✅ — independently corroborated by commit `c5ca3ec7` (task 84), which measured `origin/develop` at exactly "1 finding — SC2209 line 269, pre-existing" |

> The shellcheck baseline deserves specific mention. It was the claim most at risk of being stale,
> because task 84 touched `setup-consumer.sh` with a shellcheck-motivated fix **after** this document
> was authored. It is not stale: task 84's fix removed a warning its *own branch* introduced (SC2155),
> returning the branch to the same 1-warning baseline this document states. I could not re-run
> `shellcheck` directly — the Docker daemon is not running on this host — so this is verified by
> corroboration rather than by execution. **Phase 4 must run it for real**, per the task's own success
> criterion; the daemon needs starting first.

### Issues

#### Important

- **[Important] Two stale line references.** Both cited as evidence, so a developer following them
  lands in the wrong place:
  - `scripts/setup-consumer.sh:820` → `_resolve_install_tracker` is actually at **line 878** (cited
    twice: §3 Current Architecture and §References).
  - `docs/reference/configuration.md:148` → the `tracker` row is actually at **line 153**.

  **Fixed** — all three occurrences corrected.

  > Line-number citations drift on every edit to the target file. The `resolve-platform.sh:424-437`
  > citation happens to still be correct, but the same hazard applies. Prefer citing the **symbol**
  > (`_resolve_install_tracker`) over the line, as §4 In Scope already does.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each carrying a **Files** list, a **Risk** level, concrete checkboxes and an explicit
**Dependencies** line. Changes are specific rather than vague — they name functions
(`_resolve_install_tracker`), test blocks (§4b) and the exact test that must change (`the .env probe is
a DELIBERATE asymmetry`).

Three things this plan does notably well and which should survive into implementation:

1. **Phase 1 does not pretend the decision is made.** It requires establishing Option A's viability
   *empirically, by running the wizard*, and explicitly permits concluding that Option B is "the honest
   answer" if the fallback has to exist anyway. A plan that had picked an option in advance would have
   been worse.
2. **The rejected option carries its reasoning forward.** Option C is rejected with a pointer to
   `task.83.bug.2.env-probe-asymmetry.md` and the instruction not to revisit it "without new evidence
   that overturns that argument".
3. **The Known Issues section pre-declares an expected test failure.** The `DELIBERATE asymmetry` test
   is expected to go red, and the document says so — so a developer does not mistake it for a
   regression and "fix" it back.

No issues found.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- §7 Files Summary (5 files) matches the files named across §6's phases. ✅
- §8 Testing Strategy covers every behaviour §9 asserts — parity table, `.env`-only case, malformed
  scalar, tab separator, map form, `access.tracker`. ✅
- §11 Rollback Plan covers all phases (revert the commit) and correctly notes the `npm run bundle`
  re-run if `resolve-platform.sh` changed — matching Phase 2's own bullet. ✅
- §9 Success Criteria are measurable and each maps to a stated benefit in §2. ✅
- Scope: 4 phases, well under the >8 threshold that suggests splitting. ✅

**Mermaid diagrams** (Step 6.5): none present, and none needed. The document's core content is a
three-way option comparison and two ordered resolution lists — both already rendered as tables and
numbered lists, which read better than a flowchart would. Not flagged.

No issues found.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are correctly stratified: the HIGH RISK entry is Option B's repo-wide resolution change (with
probability, impact and mitigation all stated), MEDIUM is Option A's fallback narrowing rather than
removing the parity problem, LOW is the malformed-input refusal turning a working install into a halt.
Each carries an actionable mitigation. The rollback plan names a concrete trigger.

The one gap was that none of this reached frontmatter where tooling reads it — see the `risk_level`
finding in §1.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 3 issues

1. ✅ **Fixed** — Link a tracker issue. Created #319, wrote `github_issue: 319`, added body link, added
   to board at P2.
2. ✅ **Fixed** — Add `risk_level: medium` to frontmatter so the pipeline cannot select lite mode for a
   task whose risk section names a HIGH RISK item.
3. ✅ **Fixed** — Correct the two stale line references (`setup-consumer.sh:820`→`878` ×2,
   `configuration.md:148`→`153`).

### Consider (Optional) — 1 item

1. ⏭ **Not applied** — Confirm or raise `estimated_effort_hours` (rubric suggests 8h against the
   recorded 3h). Left to the author deliberately.

**Fixes applied: 3 / Skipped (needs your input): 1**

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — complete structure and a clean card preflight; lost a point for the two missing frontmatter fields
- Technical Accuracy: 10/10 — every claim verified against source; zero hallucinations
- Implementation Clarity: 9/10 — phases are specific and dependency-ordered; Phase 1 correctly leaves the approach open
- Consistency: 10/10 — no contradictions found
- Risk Management: 8/10 — thorough prose analysis, but it was not surfaced in frontmatter until this review

**Confidence Level for Successful Implementation:** High

**Recommendation:**

✅ **READY TO IMPLEMENT** — score ≥ 8 with no critical issues. All three important issues were fixed
during this review.

**Justification:** The document's substance was already sound and independently verifiable; the defects
were peripheral metadata and citation drift, all now closed. The one genuine caution is not a document
defect at all — Phase 1's decision between Options A and B is real, unmade, and load-bearing, and the
document is right to treat it as the phase that carries the task.

---

## Next Steps

Task is ready for implementation. The developer should:

1. **Start with Phase 1 and actually run the wizard** — the document is explicit that viability must be
   established empirically at all three call sites (real install, `--update`, `--dry-run`), not by
   reading the script. Record the decision and rationale in §3 *before* writing code.
2. **Start the Docker daemon before Phase 4.** The `shellcheck` success criterion requires
   `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable scripts/setup-consumer.sh`, and
   the daemon is currently down on this host. The baseline to beat is **1 finding (SC2209, line 269)**.
   Recording this criterion as unrunnable is itself a claim — task 84 recorded it three times before
   discovering it was false and that the check found a real defect.
3. **Expect `the .env probe is a DELIBERATE asymmetry` to go red**, and update it rather than reverting
   the change that broke it — as both the task's Known Issues and the test's own failure message say.
4. **Mutation-prove every behaviour change** per `shared/resources/mutation-proving.md`, reverting the
   *specific* behaviour rather than the general one.
5. **Re-run `npm run bundle` and commit the result** if `resolve-platform.sh` changes — every skill
   carries a bundled copy.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous pipeline mode)
- **Review Date:** 2026-09-05
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.91.reconcile-tracker-resolution/task.91.reconcile-tracker-resolution.md`
- **Sources Consulted:** `scripts/setup-consumer.sh`, `shared/resources/resolve-platform.sh`, `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`, `docs/reference/configuration.md`, `skills-config.yaml`, commit `c5ca3ec7`, task 83's document / bug.2 / gate.3
- **Pre-pass agents:** not dispatched — this review verified claims directly against the named source files, which is the same evidence the pre-pass would have gathered for a task whose scope is four known files
