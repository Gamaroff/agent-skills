# PR Review Report: PR #360 — docs(task.95): observe-work config schema, skill boundaries and the meta-skill family

**Reviewed:** 2026-09-09
**PR:** [#360](https://github.com/Gamaroff/agent-skills/pull/360) — `feature/task.95.observe-work-docs-boundaries` → `develop` (OPEN, not draft)
**Work item:** [`task.95.observe-work-docs-boundaries.md`](./task.95.observe-work-docs-boundaries.md) — resolved via `branch stem`
**Tracker:** [#341](https://github.com/Gamaroff/agent-skills/issues/341) — OPEN · `task`, `priority:high` · milestone *Technical Tasks (standalone)*
**Effort:** medium
**Verdict:** ✅ **APPROVE**

---

## Scope of this review

19 files, +2242/−136. **No files were excluded as auto-generated** — the change touches no bundled
`skills/*/references/` copy, so the usual exclusion had nothing to remove and the reviewed diff is
the whole diff. Worth stating rather than assuming: on this repository a skill change often carries
thousands of generated lines, and their absence here is a property of this PR, not of the filter.

Of the 19 files, 9 are the task's own pipeline artifacts (plan, review, implementation report, two QA
reports, two gates, a bug report, the task document). The substantive change set is 10 files.

**CI at time of review:** `validate` ✅ · `link-check` ✅ · `shellcheck` ✅ · `branch-policy` ✅ ·
`test` ⏳ in progress. The local equivalent (`npm run ci:fast`) was green at this head — 2901 pass, 0
fail. `link-check` passing matters specifically here: it runs against the **tracked** tree, which is
what confirms the new `#observation-workspace` anchor resolves for a reader who did not check out
the working directory.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Plan | ✅ | `task.95.plan.observe-work-docs-boundaries.md` |
| Review report | ✅ | `task.95.review.1.observe-work-docs-boundaries.md` — NEEDS REVISION → READY TO IMPLEMENT, 4 Critical + 5 Important, all actioned before development |
| Implementation report | ✅ | `task.95.implementation.1.observe-work-docs-boundaries-initial-run.md` — Pipeline Progress ✅ through Step 6 |
| QA reports | 2 | `task.95.qa.1` (CONCERNS 90) · `task.95.qa.2` (PASS 100, refute pass) |
| Gate | **PASS** | `task.95.gate.2.observe-work-docs-boundaries.yml` — 100/100, `top_issues: []` |
| Open bugs | 0 | `task.95.bug.1` — **Closed**, verified in cycle 2 |
| DoD | ⏳ | Not yet written — Step 7 produces it. Expected absent at 5c |
| Sprint review | ⏳ | Same — Step 7 |
| Handover | n/a | None; `access.tracker` is `full`, so no deferred-mutation checklist exists |

The trail is complete **and honest**, which is the part worth checking rather than counting. Two
specifics stood up:

- Gate 2's `top_issues` is **empty**, and cycle 1's MEDIUM was deliberately *not* carried forward
  with `status: closed`. That is the correct reading of the third-strike rule, which keys on the
  `file:` of HIGH entries across the last three gates and ignores `status`. A copied-forward entry
  would have made one finding look like a file struck twice.
- The QA reports record what was *searched*, not only what was found. Cycle 2's "New Findings This
  Cycle" section states the scope and the specific things re-probed, so "we found nothing" and "we
  did not look" are distinguishable — the property that section exists for.

---

## Success Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `observations.workspace` in Full schema + Key reference; no reader-less key documented | `docs/reference/configuration.md:143-158` (schema), `:222` (key row); enforced by `observe-work.test.js` → *every documented `observations.*` key has a reader* | ✅ met |
| `OBS_STALE_DAYS` documented with its real default (14) | `configuration.md:988-999`; asserted by driving the hook in `observe-work-hook.test.js` | ✅ met |
| Documented precedence matches actual behaviour, **asserted** | 3 tests driving `resolve-observation-workspace.sh` — config > env > default, and refusal returns non-zero | ✅ met |
| Three neighbours carry the note with the shared sentence verbatim | `skills/{autoskill,remember-insight,double-check}/SKILL.md`; enforced by the zero-gap audit | ✅ met |
| Template is a four-column pipe table, pointed at from Session Start | `skills/observe-work/assets/skill-families.template.md`; `observe-work/SKILL.md` pointer conditioned on an *empty* registry | ✅ met |
| Every named member resolves to a real skill directory | asserted per-member in `observe-work.test.js` | ✅ met |
| `families --audit` returns zero gaps | asserted against this repo, mutation-proven three ways | ✅ met |
| `generate-catalog` no diff / `bundle` idempotent / suite green / `format` clean / `quick_validate` ×4 | recorded in the implementation report and re-verified independently in QA cycle 1 | ✅ met |
| README count and badge correct; CHANGELOG covers 93–95 as one capability | `README.md:5,7,71`; `CHANGELOG.md` | ✅ met |

**Coverage: 9/9.** Every criterion has evidence in the diff, and the seven functional ones are
enforced by executable assertions rather than by inspection — which is the difference between a
criterion that is met today and one that stays met.

---

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — docs/tasks/task.95.observe-work-docs-boundaries/task.95.observe-work-docs-boundaries.md:§4
  §4 "Out of Scope" still reads: "**`observe-work` itself** — task 94. This task adds nothing to
  its `SKILL.md` except the pointer to the family template." The diff adds two further things to
  that file: the shared disambiguation sentence (replacing the previous closing line) and a
  four-line paragraph explaining that the sentence is the family's `Shared` value.
  The deviation is CORRECT and necessary — Phase 3's zero-gap audit greps every member the family
  lists, `observe-work` included, so omitting it would make the seeded family fail its own audit on
  first run. It is also already recorded, with that reasoning, in the same document's
  "Implementation Notes" section. What was not done is reconciling §4 itself, so the document now
  states a scope boundary its own Notes section documents crossing.
  → Amend the §4 bullet to "…nothing except the pointer to the family template and the family's
    shared sentence (see Implementation Notes)", so a reader checking scope in the place scope is
    declared is not contradicted by a later section.
```

Nothing else. Specifically checked and found sound:

- **Scope drift**: every file in the substantive change set appears in the task's §7 Files Summary,
  including `observe-work-hook.test.js`, which was added to that list during development rather than
  left implicit. No file was touched that the work item does not name.
- **Out-of-scope items honoured**: no `description:` field changed anywhere (the empty
  `generate-catalog` diff is the proof, and it was re-run independently); the engine, resolver and
  contract are untouched; `autoskill` is not retired; no flush points were wired into the develop
  pipelines; no install profile changed.
- **Consistency with the tracker**: issue #341 is OPEN and the document is `ready-for-review` —
  correct for this pipeline stage; Step 7 closes both.
- **Declared "no breaking changes"** holds: no runtime path is touched, and an existing
  `skills-config.yaml` with no `observations:` block resolves exactly as before (verified by driving
  the resolver with no config file present, not by reading §5).

---

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — skills/observe-work/tests/observe-work.test.js:744
  `makeProject(configBody)` takes a parameter that is dead: all three call sites pass `null`, and
  the one test needing a config file writes it directly afterwards rather than through the helper.
  The `if (configBody !== null)` branch is never taken.
  → Drop the parameter, or route the config-writing test through it so the branch is exercised.

[CR-2] bug · low · confidence: medium — skills/observe-work/tests/observe-work.test.js:766
  `resolveIn()` returns `refused: true` when the RC probe does not parse — which is the correct
  fail-safe for a missing `bash`, but means the ephemeral-refusal test alone cannot distinguish
  "the resolver refused" from "the harness never ran". The helper's own comment documents fixing
  exactly this conflation for the *value*; the residual is on the *status*.
  In practice the file cannot pass with a broken harness, because the two sibling tests assert
  `refused === false` against specific paths and would fail first. That mitigation is real but
  implicit, and it lives in different test bodies from the assertion it protects.
  → Assert the probe actually produced output (`RC=` present in stdout) before reading `refused`,
    making the guarantee local to the test that depends on it.
```

Both are low. Neither blocks.

Worth recording as a positive, because it is the thing this lens most often finds missing: the tests
added by this PR are **mutation-proven**, and one of them was rewritten mid-development after the
mutation pass exposed it as vacuous. The QA cycle then re-ran one mutation independently rather than
accepting the developer's record, and when the first attempt at a cycle-2 mutation went red for the
wrong reason it was redone. That is the evidence chain this review exists to check, and it is intact.

---

## Recommended Actions

1. **[PC-1]** Amend the §4 Out-of-Scope bullet so the declared scope matches what shipped. One
   sentence; the justification is already written in the same document.
2. **[CR-1]** Drop the dead `configBody` parameter from `makeProject`.
3. **[CR-2]** Assert the RC probe produced output before reading `refused`.
4. Carried from gate 2 (`future`, not this PR's problem): state the linked-worktree qualifier beside
   the path formula, and consider binding `observation-log-contract.md`'s precedence statement to the
   resolver.

None of these gates the merge. All three are one- to two-line changes that could ride the Step 7
finalise commit or be taken as follow-ups.

---

**Verdict: ✅ APPROVE** — deterministic table: no finding is `severity: high`, and none is
`severity: medium`; three `severity: low` findings remain, which is the APPROVE row.

This PR does what its work item promised, and the evidence behind it is real rather than asserted.

---

## Addendum — findings actioned (2026-09-09, same day)

All three low findings were taken immediately rather than deferred, since each was a one- to
two-line change:

- **PC-1** — §4's Out-of-Scope bullet now says "…nothing except the pointer to the family template
  **and the family's shared sentence**", with the one-line reason and a pointer to Implementation
  Notes. Declared scope and shipped scope now agree.
- **CR-1** — the dead `configBody` parameter is gone from `makeProject()`, with a comment stating
  why the helper deliberately takes no argument.
- **CR-2** — `resolveIn()` now returns `ran`, and the ephemeral-refusal test asserts it before
  reading `refused`. **Mutation-proven**: silencing the RC probe makes the new guard fire with its
  own message, so it is not decoration.

The verdict is unchanged — it was APPROVE before these edits, and they only remove the reasons it
was not unanimous.
