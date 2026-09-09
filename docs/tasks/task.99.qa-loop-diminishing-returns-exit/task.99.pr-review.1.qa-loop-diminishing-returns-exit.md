# PR Review Report: PR #361 — feat(qa-loop): a diminishing-returns exit for the QA loop (task.99)

**Reviewed:** 2026-09-09
**PR:** [#361](https://github.com/Gamaroff/agent-skills/pull/361) — `feature/task.99.qa-loop-diminishing-returns-exit` → `develop` (OPEN)
**Work item:** [`task.99.qa-loop-diminishing-returns-exit.md`](./task.99.qa-loop-diminishing-returns-exit.md) — resolved via `branch stem`
**Tracker:** none linked — the task carries no `github_issue:` (see PC-3)
**Verdict:** ⚠️ **CONCERNS**

**Scope reviewed:** 32 of 36 changed files. Four excluded as auto-generated: the two bundled
`skills/*/references/` copies of the shared resource and of the engine, byte-identical to their
`shared/resources/` sources and headed `AUTO-GENERATED — DO NOT EDIT`.

> **Both lenses ran in-line, not as independent read-only subagents.** Subagent dispatch was outside
> this session's remit, so the reviewer of this PR is the author of it — the weakest form of the
> check, and the same caveat recorded in all five QA cycles. Weight the findings accordingly: the
> ones below were reached by comparing artifacts against each other, which is a form of checking an
> author can still do honestly, rather than by fresh reading, which is the part that is missing.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.99.implementation.1.qa-loop-diminishing-returns-exit-initial-run.md` — Pipeline Progress complete through Step 5c, five QA cycle entries, decisions and deviations logged |
| Review report | ✅ | `task.99.review.1.qa-loop-diminishing-returns-exit.md` — 8/10 READY TO IMPLEMENT, 8 of 9 findings fixed in place |
| QA reports | 5 | `task.99.qa.{1..5}.*.md` |
| Gate | **PASS** | `task.99.gate.5.*.yml` (100/100); the series reads FAIL 50 → FAIL 60 → CONCERNS 90 → CONCERNS 90 → **PASS 100** |
| DoD | ❌ | Expected — Step 7 has not run. 5c precedes it by design |
| Sprint review | ❌ | Same |
| Open bugs | 0 | `bug.1` and `bug.2` both **Closed**, each verified at a later gate and non-recurring through gate 5 |
| Handover | ✅ n/a | No deferred tracker mutations — nothing was restricted |

The trail is unusually complete for a five-cycle run: every cycle has both a gate and a QA report,
the HIGH sequence is recorded on each cycle entry, and both bug reports carry a full Status History.

---

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 — section placed, 3 conditions + floor | `develop-pipeline-step-5-6-qa-loop.md:419` (Convergence at 334, 5b at 522) | ✅ met |
| 2 — fires on the reconstructed sequence at cycle 3 | `qa-diminishing-returns.test.mjs` — "fires at the end of the second consecutive zero-HIGH cycle" | ✅ met |
| 3 — never fires on `7,7,7,7,4` | test loops all five cycles asserting CONTINUE | ✅ met |
| 4 — one HIGH / production MEDIUM do not fire it | two tests, each naming its reason code | ✅ met |
| 5 — anti-vacuity, glob match is the only thing withheld | `no-glob-match.yml` + the widened-glob half that proves it non-vacuous | ✅ met |
| 6 — no `file:`, or unmatched, fails | `finding-without-file` and `non-test-finding` are distinct codes with distinct tests | ✅ met |
| 7 — config key documented with the fail-safe stated | `configuration.md` × 3 (schema, key reference, prose) | ✅ met |
| 8 — the record distinguishes this exit from a stall | `**Loop exit**` row + template default + the escalation-block note | ✅ met |
| 9 — Convergence check byte-unchanged, **by diff** | 5624 bytes both sides, re-verified at every cycle | ✅ met |
| 10 — the engine is what the criteria assert against | every test calls the module; the two source-text assertions are labelled negative properties | ✅ met |
| 11 — hands to 5c, not straight to Step 7 | "On exit" step 2 **and** 5c's route 2 — both halves, after gate 2 found only one was present | ✅ met |
| 12 — bundle run, copies committed | `npm run bundle` → 0 files changed | ✅ met |

12 / 12. Criterion 2 was **corrected during implementation** from "cycle 2" to "cycle 3" — the task's
own rule cannot fire at cycle 2 on a `2,0,0,0` sequence — and the correction, its arithmetic and its
cost (one cycle saved on the recorded run, not two) are all argued in the document rather than
silently applied. That is the single best thing about this change set's paper trail.

---

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — docs/tasks/task-registry.md:140
  The registry row for task 99 still reads `draft`, and its PR column is `—`, while the
  document reads `ready-for-review` and PR #361 is open. Every accepted task in the
  registry (75, 84, 95) carries `accepted` plus a "PR #N merged" note, so the convention
  is established and this row diverges from it.
  → Update the row at Step 8 alongside the final commit. Note this is a KNOWN SYSTEMIC
    GAP, not a defect introduced here: task.103 in this same repo is titled "Nothing
    updates the task-registry row after a task is accepted" and is still `draft`. The
    per-task fix is one line; the systemic fix is task.103's.

[PC-2] consistency · low · confidence: high — PR #361 description
  The description says "32 tests" and "12 reconstructed gate fixtures". The suite is 33
  (the 33rd was added in qa-fix cycle 1) and the fixture directory holds 11 gate files
  plus a README. It was written at Step 4, before the QA loop ran, and five cycles of
  findings have not been reflected in it.
  → Refresh the description at Step 7/8. The PR body is the first artifact a human reads
    and it is currently the least current one in the set.

[PC-3] trail · low · confidence: high — task.99.qa-loop-diminishing-returns-exit.md frontmatter
  No `github_issue:`, so the task is invisible on the project board and the PR carries no
  "Closes #N". Every tracker signal in this run was a no-op.
  → Deliberate and logged rather than overlooked: creating a remote issue requires an
    opt-in prompt an autonomous run must not answer for the user. Run /sync-github-task
    to link it. Recorded so that "no board activity" is not later read as a failed sync.
```

**Scope: no drift.** Every changed path is named in the task's §8 Files Summary, which was itself
corrected during review to add the engine, the tests and the fixtures. `CHANGELOG.md` is in scope
because the change is user-facing behaviour plus a new config key — the develop skill's own rule for
when a CHANGELOG entry is required.

**Coverage: complete, and verified rather than asserted.** The mechanical re-verification at cycle 5
(line numbers, test count, config occurrences, byte-diff, zero-diff bundle) is the kind of evidence
that survives someone re-running it.

---

## Code Review Findings

**None.**

`shared/resources/qa-diminishing-returns.js` has been untouched since qa-fix cycle 1 and carried one
HIGH there, now closed and mutation-proved. A focused re-read this cycle of the paths QA did not
change — the glob compiler's metacharacter escaping, `normalisePath`'s prefix stripping, the
`KEY_RE` `lastIndex` reset, the `base`-indent entry boundary, and the `cycle-1` / `cycle-2` index
arithmetic — surfaced nothing.

Two properties are worth naming as *strengths* rather than absences of findings:

- **Every ambiguity resolves toward `continue`.** Eight malformed inputs were fed to the classifier
  and none returns `exit`. For a rule whose failure direction is one-directional — a wrong exit ships
  a defect a later cycle would have caught — that is the property that matters most.
- **`HIGH_N` is an input, not a re-derivation**, with a test asserting the verdict follows the
  *supplied* counts even when they contradict the gate's own contents, in both directions. That is
  what makes the claim testable rather than merely stated.

The three carried LOWs in the gate's `recommendations.future` were re-checked and remain correct to
leave: two are latent under YAML's own rules, one is a wording preference.

---

## Recommended Actions

1. **PC-1** — update the `task-registry.md` row for task 99 at Step 8 (`accepted`, PR #361). One line.
2. **PC-2** — refresh the PR description: 33 tests, 11 gate fixtures.
3. **PC-3** — no action in this run; `/sync-github-task` when a board link is wanted.

None blocks the merge. The verdict is CONCERNS rather than APPROVE because PC-1 is a real
inconsistency between two committed artifacts, and CONCERNS is the verdict that records findings
without blocking — which is exactly the treatment these three warrant.

---

## A note on what this PR's own loop demonstrated

This is the reviewer's judgement, not a finding, and it is the strongest argument for merging.

The rule being shipped was run against **this PR's own five gates** throughout. It declined three
times for three distinct correct reasons (`high-findings-remain`, `non-test-finding`, `no-residue`)
and fired once, when the globs were configured to cover the residue. Condition 1 was first satisfied
at cycle 4 and the exit still declined — because this repository has never set
`qa.testArtifactGlobs`, so the documented fail-safe default was demonstrated live rather than
asserted.

And it correctly would **not** have shortened this loop: the findings after cycle 1 were real defects
in the deliverable's prose, not pin-refinement. A rule that ended its own review early would be the
one result that should have blocked the merge.
