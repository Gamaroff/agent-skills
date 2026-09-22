---
type: review
description: "Review of task.141 — /qa-next accepts an explicit registry item id. One Critical (the run-file sequencing scheme breaks listRunFiles' documented ordering invariant), five Important, four Optional. All Critical and Important findings fixed in this pass."
tags: [review, task-141, qa-next, uat]
status: accepted
created: 2026-09-22
updated: 2026-09-22
---

# Task Review Report: Task 141 — `/qa-next <id>`: target a specific registry item

**Reviewed:** 2026-09-22
**Review Depth:** Thorough
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (one design defect, now fixed)

> **Implementation Status**: ✅ All 6 Critical + Important recommendations implemented — 2026-09-22

---

## Executive Summary

The document is unusually well-sourced: every claim about `uat-status.mjs` that this review checked
against the file is accurate, the card preflight and the relative-link check are both clean, all
eleven mandatory sections are present, and the co-located plan carries real code rather than
gestures at it. The defects are not sloppiness — they are four places where a rule was stated for
one case and the neighbouring cases were not walked.

The Critical one is a genuine design error: the proposed run-file sequencing does not preserve the
ordering invariant the task says it preserves, and the plan's own test asserts the property that
would fail.

**Critical Issues:** 1 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10 as reviewed · **9/10** after the fixes applied below
**Recommendation:** NEEDS REVISION → **READY TO IMPLEMENT** (revisions applied in this pass)

---

## User Decisions & Clarifications

**Q1 — Run-file ordering.** `listRunFiles` sorts by basename and documents "oldest run first". The
proposed names put run 1 at `<date>-<env>.md` and run 2+ at `<date>-<env>-02.md`, and `.` sorts
after `-`, so run 1 lands **last** among the same-day runs.

- **User Decision**: fix `listRunFiles`' sort key — normalise a missing sequence to `-01` in the
  comparator, keep `<date>-<env>.md` for run 1.
- **Impact**: Phase 2 and the Files Summary gain `listRunFiles`; a mixed-name ordering test is added
  to § 8. Preserves the Risk-section mitigation ("the first run of a day keeps the existing name
  exactly") and fixes ordering for run files already on disk.

**Q2 — `--clear-note` versus acceptance provenance.**

- **User Decision**: refuse `--clear-note` when the verdict is `pass` and the row is `accepted`.
- **Impact**: the guard lives in the state machine beside the kept-accepted rule, so no call site
  can forget it. Phase 3, § 5, § 8 and § 9 updated.

**Q3 — Verdicts other than `pass` landing on a `✅` row.**

- **User Decision**: extend the rule — `pass`, `blocked` and `na` all keep `✅`; only `fail` overrides.
- **Impact**: Phase 3, the Breaking Changes section, § 8 and § 9 restate the rule as *only a `fail`
  moves an accepted row*.

**Q4 — The bug-reuse rule's missing data source.**

- **User Decision**: add `notes` and `bug` to the shared payload.
- **Impact**: `describeRow` returns both on `--item` and `--next`; the field-identity test pins them.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory sections present (Overview · Motivation · Technical Background · Scope ·
Breaking Changes · Implementation Plan · Files Summary · Testing Strategy · Success Criteria · Risk
Assessment · Rollback Plan), plus Change Log, Progress Tracking, References and Notes.

| Check | Result |
|---|---|
| Filename convention `task.{n}.{name}.md` | ✅ |
| OKF frontmatter — `type`, `description`, `tags`, `updated` | ✅ all present |
| Placeholders (`[TBD]`, `???`, …) | ✅ none |
| Stakeholder Sign-off | not checked — `sign-off` absent from `skills-config.yaml` |
| Change Log | ✅ present, one row, `status: planned` so currency does not apply |
| Tracker linkage — `github_issue: 466` | ✅ issue exists, OPEN, title matches |
| Body cross-reference `[#466](…/issues/466)` | ✅ matches frontmatter |
| Card preflight (`sync-jira-task --check-card`) | ✅ 3 blocks resolve (Summary +4, Success Criteria +14, Breaking Changes +6 omitted) |
| Relative links (`doc-links.js`) | ✅ 1 relative link, resolves |

**Score: 10/10.** Nothing to fix.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every named symbol in § 3 *Current Architecture* was checked against
`skills/qa-next/scripts/uat-status.mjs` and is real and correctly described:

| Claim | Verified |
|---|---|
| `nextItem({ sections })` returns the first `untested` row in file order | ✅ line 596 |
| `cmdNext` payload fields (`id`, `function`, `what`, `entry`, `surface`, `surfaceTitle`, `stories[]`, `items`, `automatedBy`, `uatSpecs`, `checklists`) | ✅ line 625, exact |
| `cmdNext` prints `null` and sets `exitCode = 3` when nothing is untested | ✅ |
| `updateRow(opts, id, mutate)` is the single writer | ✅ line 675 |
| `cmdSet` writes `Notes / bug` only when `--bug` or `--note` is given | ✅ line 694 |
| `cmdAccept` refuses a non-`🟡` unless `--force` | ✅ line 738 |
| `listRunFiles` sorts by basename first, then full path | ✅ line 508 |
| `dispatch` is a first-match `if` ladder behind an `OPTIONS` allowlist | ✅ line 816 |
| `die()` throws `UsageError`; never `process.exit()` | ✅ lines 320, 805 |
| Exit codes 0 / 1 / 2 / 3 as described | ✅ |
| `SKILL.md` documents `--dry-run` as a prose bullet, no `## Arguments` | ✅ line 19 |
| `## Arguments` house style exists in `review-code` / `review-pr` / `double-check` | ✅ lines 28 / 34 / 64 |
| `evals/qa-next/unit/*.test.mjs` already in the `npm test` glob | ✅ `package.json:26` |
| `skills/qa-next/references/` exists and is empty | ✅ |
| No `eval:qa-next` npm script | ✅ |
| `docs/reference/commands.md` rows 25–26 still say *story* | ✅ both |
| `docs/reference/activation-phrases.md:60` says "the next accepted story" | ✅ |

### Issues

#### 🚨 Critical — the run-file sequencing does not preserve the ordering it claims to

**Location:** § 3 *Target Architecture* (the `--run-path` bullet), Phase 2, § 8 *Unit Tests*,
§ 10 *Medium Risk 2*; plan file lines 154–171 and 427–438.

**Claim.** "The sequence is zero-padded (`-02`, `-03`) so `listRunFiles`' basename sort stays
chronological past nine runs in a day." The plan repeats the reasoning as a code comment:
`// Sequence, zero-padded: listRunFiles sorts by basename, and "-10" must not sort before "-2".`

**What is actually true.** The padding does fix `-10` versus `-2`. It does nothing about run 1,
which has **no suffix at all** — and `.` sorts after `-`:

```console
$ node -e 'console.log(["2026-09-22-lan.md","2026-09-22-lan-02.md","2026-09-22-lan-10.md"].sort())'
[ '2026-09-22-lan-02.md', '2026-09-22-lan-10.md', '2026-09-22-lan.md' ]
```

The first run of the day sorts **last**. `listRunFiles`' own comment declares the invariant
("Ordered by file name (the date prefix) first, so 'oldest run first' holds across function
directories"), `--findings` groups its output by run in that order, and the plan's `priorRuns`
inherits it — so a re-run's header would cite the wrong previous run.

**Evidence that the design was not walked.** The plan's own test asserts the property that fails:

```js
assert.deepEqual([...files].sort(), files);   // files[0] === "2026-09-22-lan.md"
```

`files[0]` sorts to position 9. This test goes red against the implementation beside it.

**Why nothing else catches it.** The existing ordering test
(`evals/qa-next/unit/uat-status.test.mjs:581`) uses two runs on **different dates** in different
directories, so it passes unchanged — which is exactly what § 8 *Contract Tests* predicts and
takes as reassurance. An existing test passing is not evidence about a case it does not exercise.

**Recommendation (per Q1):** normalise the sort key in `listRunFiles` rather than renaming files:

```js
const seq = (p) =>
  basename(p).replace(/^(.*?)(?:-(\d{2}))?\.md$/, (_, base, n) => `${base}-${n ?? "01"}.md`);
…
.sort((a, b) => seq(a).localeCompare(seq(b)) || a.localeCompare(b));
```

Add `listRunFiles` to Phase 2 and to § 7; add a test over the mixed set
`[lan.md, lan-02.md, lan-10.md]`; correct the two prose claims and the code comment.

**Severity rationale:** Critical, not Important. Silent evidence disorder is the precise failure the
task's own Problem 3 exists to prevent — "the loss shows up as a shorter list nobody can tell is
short" — and this variant produces a *reordered* list, which is even less visible.

#### ⚠️ Important — the Performance criterion is contradicted by `priorRuns`

**Location:** § 8 *Performance Tests*, § 9 *Performance*; plan lines 79–92.

`priorRuns` is specified as `listRunFiles(<the whole runs/ tree>).filter(startsWith("runs/<id>/"))`
— a recursive walk of every function's directory, on **every** `--item` *and* `--next` call. § 9
asserts "`--item` reads the registry once, like `--next`" and "No command gains a network call", and
§ 8 asserts `--run-path` does not walk the tree — all true as far as they go, and all silent about
the walk `--next` has just acquired.

**Recommendation:** either state the cost honestly in § 8 (one recursive walk, deliberately, to
reuse the single sorted comparator rather than duplicate it — which is the right trade once Q1's
fix puts the comparator in one place) or read the single directory with `readdirSync` and sort with
the same exported key. The first is preferred and is what was applied.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

The plan is exceptionally concrete — real signatures, real hunks, a fixture shape, a mutation-proof
per group and a verification transcript. Two gaps, both of the same kind: a rule stated for one case
with its neighbours unwalked.

#### ⚠️ Important — Step 4's bug-reuse rule has no data source

**Location:** § 6 Phase 4 ("reuse the row's open bug on a repeat fail"); plan step 5, second bullet.

The payload gains `state`, `lastRun` and `priorRuns`. It does **not** gain the `Notes / bug` cell,
which is where the bug link lives (`checkRegistry` reads it with
`/\[[^\]]*bug\.[^\]]*\]\(([^)]+)\)/`). So the skill would have to re-read and re-parse the registry
by hand — a second reader of the registry, which is the thing `--item` exists to remove.

**Recommendation (per Q4):** `describeRow` returns `notes` (raw cell) and `bug` (parsed target, or
`null`), using the regex `checkRegistry` already owns. Pin both in the `--item`/`--next`
field-identity test.

#### ⚠️ Important — a targeted resume is destroyed by the staleness rule

**Location:** § 6 Phase 4, Step 0 bullet; plan step 2. `SKILL.md` § *Run state*.

The plan adds `"targeted": true` so a resume at `phase: selected` re-resolves the id. It does not
touch the sentence two lines above it:

> If the registry row for `item` is no longer ⬜ and the phase is `selected`, someone else finished
> it — delete the state file and start over.

For a targeted run this premise is false by construction: targeting a `❌` or a `✅` is the whole
point, so the rule fires on **every** targeted resume and discards the state file. The flag is added
to the object without being read by the rule that needs it.

**Recommendation:** gate the staleness rule on `targeted` — it applies only to an untargeted run.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### ⚠️ Important — the kept-accepted rule covers one verdict of four

**Location:** § 3 *Target Architecture*, § 5 *Breaking Change 1*, § 6 Phase 3.

`cmdSet` accepts `pass`, `fail`, `blocked`, `na`, `untested`. The new rule guards `pass` only, and
the document reasons about `fail` explicitly. `blocked` and `na` still overwrite `✅` from any
state — and Step 2's two early exits reach both. A regression sweep in an environment that cannot
supply a third-party credential demotes accepted rows to `⏸`, which is precisely the failure
Problem 4 names ("replace fifty owner signatures with fifty machine `🟡`s"), arriving through a
different verdict.

**Recommendation (per Q3):** state the rule as *only a `fail` moves an accepted row*. `pass`,
`blocked` and `na` keep `✅` and write only `Last run` / `Notes / bug`.

#### ⚠️ Important — "always pass `--note` or `--clear-note`" is unsatisfiable on a fail, and destructive on a kept `✅`

**Location:** § 6 Phase 4, Step 4 bullet; plan step 5, fourth bullet.

Two separate collisions with Phase 3's own refusals:

1. **On a fail.** Phase 3 adds `die("--clear-note cannot be combined with --note or --bug")`, and
   `--bug` is mandatory for `fail`. So on a failing re-run `--clear-note` is always a usage error.
   The rule is satisfiable only by `--note`, which the prose does not say.
2. **On a kept `✅`.** `--clear-note` writes `row.notes = ""` unconditionally, and `cmdAccept` stores
   the acceptance provenance *in that cell* (`accepted 2026-09-22 — <note>`). A passing regression
   re-run would erase it. `checkRegistry` imposes no note requirement on `accepted`, so `--check`
   stays green and the loss is silent — the same shape as the Critical finding above.

**Recommendation (per Q2):** refuse `--clear-note` when the verdict is `pass` and the row is
`accepted` (there is no stale bug link to clear on a `✅`), and restate the protocol rule per
verdict rather than as a blanket "always".

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification, probability/impact, mitigation and per-phase rollback are all present and the
rollback boundaries are real (Phase 3 is genuinely independent of 1, 2 and 4). Two notes:

- **Medium Risk 2** mitigates the wrong failure. It says "the first run of a day keeps the existing
  name exactly; only the second onwards gains a suffix" as *reassurance* — that unsuffixed first
  name is the Critical defect. The mitigation sentence is corrected to name the sort-key change.
- **Low Risk 2 (doc drift)** is well-judged: the two already-stale `commands.md` rows are cited as
  evidence the risk is live, which it is.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **Fix the run-file ordering.** Normalise a missing sequence to `-01` in `listRunFiles`' sort key;
   add `listRunFiles` to Phase 2 and § 7; add a mixed-name ordering test; correct the three places
   that assert zero-padding alone is sufficient. *Per user decision on Q1.*

### Should Fix (Important) — 5

2. **Extend the kept-accepted rule to `blocked` and `na`** — only a `fail` moves a `✅`. *Per Q3.*
3. **Refuse `--clear-note` on a kept `✅`**, and restate the Step 4 rule per verdict so it is not
   unsatisfiable on a fail. *Per Q2.*
4. **Add `notes` and `bug` to the shared payload** so the bug-reuse rule has a source. *Per Q4.*
5. **Gate the state-file staleness rule on `targeted`** so a targeted resume survives.
6. **Name the `priorRuns` recursive walk in § 8**, which the Performance criteria are currently
   silent about while asserting the neighbouring costs.

### Consider (Optional) — 4

7. **`--item` sits one character from `--items`**, which does something entirely different (read a
   row versus write the Items cell). No functional collision — `dispatch` matches exact strings —
   but it is a real typo hazard in a tool whose other commands are unambiguous. Worth one sentence
   in the usage header, or a different name (`--row`).
8. **The plan's test sketches use `describe()`/`it()`**; the existing suite uses flat `test()`
   throughout. `node:test` supports both, but the plan says "follow the file's existing fixture
   pattern" and then does not.
9. **A state diagram would earn its place.** The registry state machine now has a rule that depends
   on both the prior state and the verdict; a six-node `stateDiagram-v2` says in one glance what
   § 3, § 5 and Phase 3 each say in prose. Nothing else in the task needs a diagram.
10. **`estimated_effort_hours: 8` against a rubric of 16h.** Signals: 19 success criteria, 28 plan
    checkboxes, 9 files, `risk_level: low`, "migration" in the body → 2 + 4 + 4 + 1 + 2 = 13 → 16h.
    The divergence is exactly at the 0.5 threshold so it does not trip the flag, and the
    integration bonus fires on the word "migration" in a *Migration Path* heading — a rubric
    artefact. Non-blocking; left at 8.

---

## Implementation Readiness Assessment

**Score:** 7/10 as reviewed · **9/10** after the applied fixes

**Scoring Breakdown (as reviewed):**

- Template Compliance: 10/10
- Technical Accuracy: 6/10 — one asserted property is false; everything else verified exact
- Implementation Clarity: 8/10 — two rules without a mechanism behind them
- Consistency: 6/10 — three rules stated for one case with the neighbouring cases unwalked
- Risk Management: 7/10 — thorough, but one mitigation reassures about the defect

**Confidence Level for Successful Implementation:** High (post-fix)

**Recommendation:** ✅ **READY TO IMPLEMENT** — the single Critical finding and all four Important
findings (1 Critical, 5 Important) were applied to the task document and its plan in this review pass.

**Justification:** the document's factual grounding is strong enough that the review could be run
almost entirely as verification rather than interrogation; the defects were all in reasoning about
cases the author had not enumerated, and all five are now closed with a mechanism rather than a
sentence.

---

## Next Steps

1. Implement Phases 1–5 in order; Phase 2 now touches `listRunFiles` as well as `runPathFor`.
2. **Mutation-prove the ordering test first** — write the mixed-name assertion against the *current*
   comparator and watch it go red before fixing the sort key. It is the one test this review exists
   for.
3. Move the gitignored `.claude/skills → ../skills` symlink aside before believing a local green.
4. `npm test`, `npm run check:generated`, `npm run bundle -- --check`, prettier.

---

## Review Metadata

- **Reviewer:** Claude (`review-task`, thorough)
- **Review Date:** 2026-09-22
- **Task File:** `docs/tasks/task.141.qa-next-targeted-item/task.141.qa-next-targeted-item.md`
- **Plan File:** `docs/tasks/task.141.qa-next-targeted-item/task.141.plan.qa-next-targeted-item.md`
- **Sources Consulted:** `skills/qa-next/scripts/uat-status.mjs` (836 lines, read in full),
  `skills/qa-next/SKILL.md`, `skills/qa-next/README.md`, `skills/qa-next/assets/run.template.md`,
  `evals/qa-next/unit/uat-status.test.mjs`, `package.json`, `docs/reference/commands.md`,
  `docs/reference/activation-phrases.md`, GitHub issue #466
- **Checks Executed:** `sync-jira-task --check-card` (exit 0), `doc-links.js` (exit 0), ordering
  repro in `node -e`
- **Pre-pass:** performed inline — no Explore subagents dispatched; independence loss recorded
