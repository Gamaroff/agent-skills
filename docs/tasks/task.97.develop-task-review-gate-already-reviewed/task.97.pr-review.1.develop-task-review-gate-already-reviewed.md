# PR Review Report: PR #350 — feat(develop-task): key the Step 2 review gate on evidence of review

**Reviewed:** 2026-09-08
**PR:** [#350](https://github.com/Gamaroff/agent-skills/pull/350) — `feature/task.97.develop-task-review-gate-already-reviewed` → `develop` (OPEN)
**Work item:** [`task.97.develop-task-review-gate-already-reviewed.md`](./task.97.develop-task-review-gate-already-reviewed.md) — resolved via `branch stem`
**Tracker:** [#348](https://github.com/Gamaroff/agent-skills/issues/348) — OPEN
**Verdict:** ⚠️ **CONCERNS** — 16 findings, all addressed before this report was filed; none blocking

Diff scope: 17 files. The 4 auto-generated `skills/*/references/*` bundles were excluded from review.

---

## Artifact Trail

| Artifact | Status | Detail |
| --- | --- | --- |
| Implementation report | ✅ | `task.97.implementation.1.*` |
| Review report | ✅ | `task.97.review.1.*` (review-task, 9/10) |
| QA reports | 3 | `task.97.qa.{1,2,3}.*` |
| Gate | **PASS** | `task.97.gate.3.*` (95/100); gate.1 FAIL 70, gate.2 FAIL 70 |
| DoD | ❌ | Step 7 has not run yet — expected |
| Sprint review | ❌ | Step 7 has not run yet — expected |
| Open bugs | 0 | Every finding was in code this change introduced and was fixed in the same run; they live in the gates' `top_issues[]` |
| Handover | ✅ | none outstanding — `access.tracker` is `full` |

---

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence | Status |
| --- | --- | --- |
| Phase 1 records reachability + what could not be determined | `## Phase 1 Record` — both blocking gates cited, two non-reaching paths, explicit "not determinable" paragraph | ✅ met |
| `planned` + current report reaches Step 3 | skip-table row; executed: `{verdict:'fresh'}` | ✅ met |
| `planned` + no report still runs the review | executed: `{verdict:'absent'}` | ✅ met |
| **`planned` + report older than `updated:` still runs it** | executed; mutating `>=` → `true` turns 3 tests red. All four historic defeats re-run and now stale | ✅ met |
| `planned` + unparseable date still runs it | executed; `2026-99-99` → stale | ✅ met |
| A review producing no report still HALTs | two HALT rows in the post-review table | ✅ met |
| Halt message names the failed precondition | `describeVerdict()`, six distinct branches, asserted per-precondition | ✅ met |
| Freshness from content, no mtime; fresh clone | **was `partial`** — no clone was made. Criterion reworded to the evidence actually produced (the module is asserted to consult no filesystem API, which subsumes the clone case) | ✅ met, after correction |
| Resource states the divergence from the resume-contract mtime rule | **was `unmet` and ticked anyway** — 0 grep hits, and the module pointed at a note that did not exist. Divergence paragraph now added | ✅ met, after correction |
| `/develop-story`'s tables unchanged — *asserted* | **was `partial`** — true, but verified only by hand. Now pinned by a test that diffs the sections against `origin/develop`; mutation-proved | ✅ met, after correction |
| New test file executed by `npm test` | glob verified in `package.json` | ✅ met |
| Resource carries a `Draft`-shaped note | four ⚠️ notes | ✅ met |
| Every new test is mutation-proved | 21 mutations across three QA cycles; the reviewer independently re-proved 5, all red | ✅ met |

---

## Conformance Findings

**[PC-1] coverage · medium · confidence: high** — `shared/resources/develop-pipeline-step-2-review.md`
§9's criterion "the resource states how and why this diverges from the mtime rule in
`develop-pipeline-resume-contract.md:95–110`" was **unmet and ticked `[x]`**. Zero grep hits for
`resume-contract` / `_mtime` in the resource or either bundle — and the module header stated the
divergence then deferred to "the note in the step-2 resource", a **dangling pointer to a note that
did not exist**. This is exactly the failure §4 named: two contradictory freshness conventions with
nothing telling a reader which governs.
→ **Fixed**: divergence paragraph added naming both mtime rules, why Step 2 differs (its verdict
authorises *skipping a review*; theirs selects a cached plan), and what to do if that reasoning
fails. Module's dangling pointer corrected.

**[PC-2] trail · medium · confidence: high** — `shared/resources/review-report-freshness.js`
The header's corpus statistics were **half-corrected, and the uncorrected half was wrong**: "68 task
review reports, 7 carried a frontmatter block and 6 an `updated:` field". Measured: 68 reports, **20**
with frontmatter, **7** with `updated:`. The 7/6 pair is the *numbered-subset* count re-labelled onto
the 68-file corpus — the very error the next sentence of that same comment calls out. The date half
was re-measured; the frontmatter half was not.
→ **Fixed**: figures corrected, and the comment now says explicitly that re-measuring one half of a
claim while re-labelling the other is how a corrected comment stays wrong.

**[PC-3] consistency · medium · confidence: high** — `CHANGELOG.md`, PR description
Both consumer-facing narratives carried cycle-1 numbers superseded twice over: "27 new tests, all 8
mutations proved red" (actual: 67 tests, 21 mutations) and the same wrong 7-of-49 corpus figures.
CHANGELOG understated the net by 40 tests.
→ **Fixed**: both updated, and both now say the count is the size of the net that closed seven
defeats rather than a measure of how clean the first cut was.

**[PC-4] trail · low · confidence: high** — `task.97.gate.1.*`
All ten of gate 1's `top_issues[]` were still `status: open` while QA cycle 3 asserted "all 18
findings closed". Gate 2 had been retro-updated; gate 1 was missed. The code was fine — the reviewer
confirmed 001/002/003 by mutation — only the artifact was stale.
→ **Fixed**: all ten closed with `fixed_date`, plus a `superseded_by` marker.

**[PC-5] coverage · low · confidence: high** — §9
"Verified in a clone where every mtime is the checkout time" asserted an experiment nobody performed.
The substituted evidence (two tests asserting the module contains no fs API at all) is arguably
*stronger* — an input the module cannot consult cannot vary — but the criterion claimed a clone.
→ **Fixed**: criterion reworded to what was actually done, and says so.

**[PC-6] coverage · low · confidence: high** — §8.6
`/develop-story` unchanged is **true** — independently re-verified — but was asserted only by hand,
three times, which is the kind of guarantee that regresses silently. The PR body also said "74 lines
compared" where the six sections total 66.
→ **Fixed**: a test now extracts the `#### develop-story` sections and diffs them against
`origin/develop`; mutation-proved by altering a story row (goes red). PR body corrected.

**[PC-7] consistency · low · confidence: high** — task frontmatter
`updated: 2026-09-07` while the document gained 2026-09-08 content in this very PR. **The card that
makes frontmatter `updated:` the load-bearing task-side input to the new gate was not maintaining its
own.** Benign here, but pointed.
→ **Fixed**: bumped to 2026-09-08.

**[PC-8] scope · low · confidence: high** — §7
Scope is otherwise clean: all 21 files checked against §4/§7, nothing outside stated scope, none of
§4's four out-of-scope items touched. But §7 said the bundle regenerates "two copies of the step-2
resource" when it regenerates **four** files — `review-report-freshness.js` is now shipped into
`develop-story` too, an executable file added to a skill §4 lists as out of scope.
→ **Fixed**: §7 names all four and explains that develop-story receives the engine as a bundling
consequence only.

---

## Code Review Findings

**[CR-1] bug · medium · confidence: high** — `tests/…:616` — the `~~~`-not-closed-by-` ``` ` test was
**vacuous**: its date sat *before* the mismatched delimiter, where the `~~~` fence blanks it either
way, so the fence-**character** comparison had no coverage at all.
→ **Fixed**: date moved after the wrong-character line and inside the block; mirror case added.

**[CR-2] bug · medium · confidence: high** — `review-report-freshness.js:231` — the comment says the
fence-open branch deliberately does not reset `inComment`, and that an earlier draft's reset was
found because no test reached it. **The surviving behaviour was equally unreached**: every
comment/fence test has the comment *inside* the fence, where it is never parsed.
→ **Fixed**: both halves pinned (a comment opened in prose survives a fenced block; stops surviving
once closed).

**[CR-3] bug · low** — `report-date-unparseable` fired both for "no date line" and for "a date line
whose value is not a real date", and its message asserted the former. A reader was sent looking for a
missing line instead of a typo'd date.
→ **Fixed**: split into `report-date-missing` / `report-date-invalid`, computed from the *blanked*
content so a label inside a fenced example correctly reads as *missing*.

**[CR-4] bug · low** — the `no-report` message claimed "and the review produced none", but
`describeVerdict` is also called at the **pre**-review gate check, where no review has run.
→ **Fixed**: clause dropped; the post-review table supplies the stronger wording itself.

**[CR-5] cleanup · low** — a third vacuous test (CRLF report with a fenced block).
→ **Fixed**: superseded by the load-bearing sibling.

**[CR-6] cleanup · low** — dead `.trim()`; `splitFrontmatter` already stores trimmed values.
→ **Fixed**.

**[CR-7] bug · low · confidence: high** — `FENCE_RE`'s info-string group allowed backticks after a
backtick opener, which CommonMark forbids *precisely* so an inline code span at column 0 is not read
as a fence. A report line beginning `` ```code``` is inline `` opened a phantom fence that never
closed and **blanked the rest of the document**, taking the real date with it. Safe direction, but
the escape hatch silently stopped working for that report.
→ **Fixed**: a backtick opener carrying backticks is not an opener. Tilde fences unaffected.

**[CR-8] bug · low · confidence: medium** — comment removal did not preserve column positions, so the
`^ {0,3}` indented-code bound — the module's only defence against indented examples — could be
**shifted out from under the matcher**. `<!-- x\n    -->**Reviewed:** 2030-01-01` returned the date.
**Fails toward `fresh`** — the only under-blanking case found.
→ **Fixed**: removed spans are replaced by equal-length spaces, and the remainder of a line that
*closes* a comment is blanked (CommonMark: it is still HTML block, never markdown).

---

## Recommended Actions

All 16 findings were addressed before this report was filed; nothing is outstanding for this PR.
Three items are recorded as follow-ups **outside** this task's scope:

1. **Step 4 of the develop pipelines silently drops every repo-root file from staging scope**
   (`develop-pipeline-step-4-create-pr.md:41` skips `dirname` `.`), while `/develop` *requires* a
   CHANGELOG update for behaviour changes. Step 3 mandates the edit; Step 4 declines to stage it.
   Worked around by hand here.
2. **`develop-bug` still carries the presence-only Step 2 gate** in its own step-2 document, which
   this change never touched — the recovery path does not exist there.
3. **A CI check that each bundled `references/*.js` byte-matches its `shared/resources/` source**
   would close the drift class this run hit by hand.

---

## Note on the review itself

Both lenses were told the run had disclosed five silent no-op string replacements, four of which
produced false "STILL GREEN" mutation results. The conformance reviewer **hit the same failure mode
while checking** — a perl-based mutation matched nothing and reported a clean 59/59, indistinguishable
from a held test — and only caught it because it had been warned to assert the needle first. That is
worth recording: the disclosure was load-bearing, not decorative.
