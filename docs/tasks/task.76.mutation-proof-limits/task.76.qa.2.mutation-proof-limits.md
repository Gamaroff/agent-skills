# QA Report: Task 76 — State what a mutation proof does not tell you (Cycle 2)

**Task**: [task.76.mutation-proof-limits.md](./task.76.mutation-proof-limits.md)
**Gate File**: [task.76.gate.2.mutation-proof-limits.yml](./task.76.gate.2.mutation-proof-limits.yml)
**Previous Gate**: [task.76.gate.1.mutation-proof-limits.yml](./task.76.gate.1.mutation-proof-limits.yml) (CONCERNS, 90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Gate Status**: PASS

---

## Executive Summary

TASK-76-001 is fixed correctly and by the narrowest possible change — one line, verified against
`git diff --stat`. The cycle-2 **refute pass** re-read the whole branch diff looking for a claim that
is false rather than confirmation that the change works, and found none. One candidate was probed at
length and dismissed on the evidence, which is written up below rather than silently dropped.

The most valuable thing this cycle did was not the fix verification: it was checking the new artefacts'
relative links **in the tracked tree** via a detached worktree rather than in the dirty working tree.
That is the one failure mode in this repository that passes locally and goes red in CI.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Refute pass (cycle 2).** `PRIOR_GATES=1`, so scope is the **whole branch diff**, not the files
changed since gate 1. The narrowing that applies from cycle 3 onward is deliberately skipped here: the
files changed since gate 1 are cycle 1's own fixes, and reading only the repairs would never re-read
the original change with what cycle 1 learned.

`SAFETY_REPROBE=false` — gate 1's `nfr_validation.security.status` was `PASS`, so the safety carve-out
does not apply.

Direct tools, per the Adaptive Review Strategy's re-review row.

**Re-review scope**: unscoped (cycle 2 refute pass — whole `origin/develop...HEAD` diff, 10 files).

---

## Re-Review Context

| Previous finding | Severity | Status | Verification |
| --- | --- | --- | --- |
| **TASK-76-001** — frontmatter `description` describes a one-question document | MEDIUM | ✅ **FIXED** | `sed -n '3p'` shows all three questions named in 60 words, under the ~100-word cap. `git diff --stat shared/resources/mutation-proving.md` → **1 insertion, 1 deletion** — the fix touched nothing else. All three generated copies carry the new text, with `AUTO-GENERATED` banners intact. |
| LOW-1 — the file's own bash block cannot be executed by Step 4b (`cp` off the allow-list) | LOW | **NOT FIXED — correctly** | Pre-existing, not introduced by this change, and the fail-closed refusal is the boundary working as designed. Carried to `recommendations.future`. |
| LOW-2 — `skills/develop/SKILL.md` says "the four shapes" against a five-shape document | LOW | **NOT FIXED — correctly** | Pre-existing drift, and the task's §4 Out of Scope forbids any SKILL.md edit. Carried to `recommendations.future`. |

Both LOWs were deliberately left alone and the fix cycle said so explicitly rather than quietly
skipping them. That is the right handling: fixing either would have been scope the gate did not ask
for, and one would have violated the task's own stated boundary.

---

## New Findings This Cycle

**None.**

Stating what was searched, because a bare "None" on an unscoped pass is a defect in the report rather
than a clean result:

Searched the full `origin/develop...HEAD` diff — 10 files, 1352 insertions. Specifically probed:

1. **The fix itself, as new code.** Does the new description assert anything the document does not
   deliver? Its three claims map exactly: *"revert the behaviour, re-run, confirm red, restore"* →
   `## The procedure`; *"what a held proof does NOT tell you (it is evidence about a test, not about
   coverage)"* → L52 verbatim; *"the three things an unheld proof can mean: a vacuous test, a
   redundant source, or a wrong premise"* → the L58–62 table's three rows, in order. No overclaim.

2. **What the fix removed.** The old description ended *"Reading a test does not tell you whether it
   can fail."* — a strong line, and it is gone. Probed as a possible regression in match signal, and
   dismissed: the concept survives verbatim in the document's opening blockquote (*"A test you have
   read is a test you have assumed"*), and the ~100-word cap makes some trade necessary. The trade
   made — keeping the procedure sentence first, appending the two new signals — preserves every
   existing match while adding new ones.

3. **The combination, not each change alone.** Re-read the full diff as one change. The fix and the
   original three sections do not interact: the fix is frontmatter, the sections are body, and no
   cross-reference spans them.

4. **The four lifecycle transitions** (bulk teardown / in-flight / error path / reconnect) that the
   refute directive mandates: **not applicable and recorded as such rather than performed as ritual.**
   The change set is markdown. There is no emission, no subscription, no caching, no lifecycle — no
   state for a transition to be wrong in.

5. **One candidate finding, probed and dismissed.** The boundary paragraph closes:

   > *A separately maintained set of legitimate patterns did — and nothing above asks you to keep one.*

   It sits seven lines below the new table row that **does** ask for both directions, so it reads at
   first pass as if the paragraph contradicts the row it exists to justify. Probed on that basis, then
   dismissed: the row asks you to *prove both directions* on a given fix; the sentence observes that
   nothing asks you to *maintain a standing accept-set*, which is a different and stronger obligation —
   and it is what actually caught the two task-67 regressions. Read that way the sentence is flagging a
   residual gap in its own new advice, which is the register the whole document is written in. Not a
   finding. Recorded here so the dismissal is auditable rather than invisible.

---

## Verification Performed

### Link resolution — in the tracked tree

The change set added five cross-linked markdown artefacts, so this cycle checked them the way CI will,
not the way the working tree allows:

```bash
git worktree add --detach /tmp/probe76 HEAD
# resolve every ./ and ../ link in the task-76 artefacts from inside the worktree
```

**12 links, all resolve.** 8 sibling links between the task, QA report and bug report; 4 parent-relative
links out to `shared/resources/mutation-proving.md` and three task-67 artefacts. The worktree was
removed afterwards.

This matters because the repository has been bitten by exactly the inverse: an untracked file that a
tracked document links to resolves locally and fails in CI, producing a red build that cannot be
reproduced by running the same command in the same directory. The Step 4 decision to commit the
implementation report at PR time — rather than holding it to Step 8 — is what keeps that from
happening here, and it is confirmed above: the report is present in the tracked tree at `67b156a`.

### Regression re-check

| Check | Result |
| --- | --- |
| `npm run ci:fast` (format:check + full hermetic suite) | **exit 0, zero failures** |
| `npx prettier --check` on all four changed files | clean |
| Source ↔ generated copy equality | all three carry the new description; banners intact |
| Bundle freshness | in sync (pre-commit hook re-ran the bundler across every skill) |
| Document length | 194 lines — unchanged by the fix, inside the ~195 budget |
| The three new sections, the procedure, the five shapes, *Recording it*, *Do not claim it* | untouched since gate 1 |
| All 10 success criteria | still met — re-confirmed, not assumed |

---

## NFR Assessment

### Performance — PASS

The fix added no lines. 194 total, inside the budget.

### Reliability — PASS

Re-verified after the fix rather than carried forward: all three generated copies carry the new
description and their `AUTO-GENERATED` banners are intact, so the rollback path (revert + re-bundle) is
still complete.

### Security — PASS

Unchanged. No executable surface; the fenced bash block is still correctly refused by the fail-closed
classifier.

### Maintainability — PASS

Cycle-1 CONCERNS resolved. The description now reaches all three questions in 60 words and keeps the
original procedure sentence first, so every match the old description attracted still lands.

---

## Code Review

Not applicable — the change set is markdown, unchanged from cycle 1. `code_review_blocking=true` had
nothing to act on.

### Step 4b — Execute the documented commands

Re-run after the fix. Result identical to cycle 1: **1 block, 0 executed** — L22 classified `mutating`
(`unrecognised-command: cp`, fail-closed), skipped and named. The fix touched frontmatter only, so no
bash lines were added, modified, or removed. `zero-blocks-executed` recorded, not suppressed, and
graded LOW for the same reason as cycle 1.

### Step 3c — Mutation-proof spot check

**n/a.** No behaviour to revert, and no fix in this cycle introduced one — the change was to a
frontmatter string that nothing parses for behaviour. Recorded as `mutation-proven: n/a`. Fabricating a
proof here would violate the document being changed, which is the whole subject of this task.

---

## Issues Found

**HIGH: 0 · MEDIUM: 0 · LOW: 2** (both carried from cycle 1, both pre-existing, both correctly
deferred to `recommendations.future`).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The one MEDIUM from cycle 1 is fixed and verified by the narrowest change that could
fix it. The refute pass found no false claim in the original change, and says explicitly what it
searched and what it dismissed. Every deterministic gate rule lands on PASS: no HIGH, no MEDIUM, no NFR
below PASS.
**Quality Score**: 100/100 — per the schema's formula, `100 - (20 × FAILs) - (10 × CONCERNS)` with
zero of each. The two open LOW observations do not deduct under that formula; they are real, they are
named in `recommendations.future`, and neither was introduced by this change.

**Deployment Recommendation**: APPROVED
**Conditions**: none.

---

**Next Steps**: proceed to `/finalise`.
