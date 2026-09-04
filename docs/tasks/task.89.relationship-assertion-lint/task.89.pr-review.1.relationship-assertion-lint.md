# PR Review Report: PR #312 — feat(task.89): lint assertions that claim a relationship but test co-occurrence

**Reviewed:** 2026-09-04
**PR:** [#312](https://github.com/Gamaroff/agent-skills/pull/312) — `feature/task.89.relationship-assertion-lint` → `develop` (OPEN)
**Work item:** [`task.89.relationship-assertion-lint.md`](./task.89.relationship-assertion-lint.md) — resolved via `branch stem`
**Tracker:** none linked (`TRACKER=github`, no `github_issue` in frontmatter)
**HEAD:** `de19e1c`
**Verdict:** ⚠️ **CONCERNS**

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.89.implementation.1.relationship-assertion-lint-initial-run.md` |
| Review report | ✅ | `task.89.review.1.relationship-assertion-lint.md` (9/10 READY TO IMPLEMENT) |
| QA reports | 2 | `task.89.qa.1.*.md`, `task.89.qa.2.*.md` |
| Gate | **PASS** | `task.89.gate.2.relationship-assertion-lint.yml` (100/100); gate 1 was CONCERNS 90 |
| DoD | ⏳ | not yet written — Step 7 has not run. Expected at this point in the pipeline |
| Sprint review | ⏳ | as above |
| Open bugs | 0 | — |
| Handover | n/a | no deferred tracker actions (nothing linked) |

Trail is complete and honest for a pre-finalise PR. Gate 1's CONCERNS and its closure are both on the
record, and cycle 1's fix **discloses a defect it found in its own guard** rather than quietly
correcting it — the strongest single signal in this trail.

---

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Flags all six historical instances, reconstructed from the commits in §3 | `tests/fixtures/relationship-assertion/instance-{1..6}.fixture.js`; `tests/relationship-assertion-lint.test.js` `HISTORICAL[]` — each pinned to gate finding + closing commit, each asserted **by its assigned rule** | ✅ met |
| Does not flag the two surviving mechanisms | `survivor-{1,2}.fixture.js` + `SURVIVORS[]` assertions | ✅ met |
| FP rate measured against the current suite and reported | `tests/fixtures/relationship-assertion/README.md` — 61 → 11 → 4 suppressed → 0 unsuppressed | ⚠️ **partial — see PC-1** |
| Each rule mutation-proved | 4 rule mutations + M5, M6 (cycle 0) + M11, M12, M13 (cycles 1–2) | ✅ met |
| Runs in `npm run ci`, no `package.json` change | `tests/*.test.js` glob already present; `git diff` shows 0 `package.json` changes | ✅ met |
| `npm run ci` exits 0 | `ci:fast` exit 0 at HEAD (2320/2319/0/1); `eval:all` exit 0 at `fe7f617`, untouched since | ✅ met |

---

## Conformance Findings

**[PC-1] consistency · medium · confidence: high** — `tests/fixtures/relationship-assertion/README.md`

Every published number in the PR body, the FP record and the task document is a snapshot taken at
`fe7f617`, and the cycle-1 fix (`183a19e`) moved all of them. None is anchored to the commit it
describes, so each now reads as a statement about the PR being merged:

| Claim | Stated | Actual at `de19e1c` | Where |
|---|---|---|---|
| assertion call sites | 2188 | **2191** | PR body, README §"False-positive measurement", task §6 / §9 / Change Log |
| lint suite size | 22 | **31** | PR body, README ("Baseline is 22 pass / 0 fail") |
| mutation proofs | 6 | **9** (M1–M6, M11–M13) | PR body, task Change Log |
| full suite | 2311 / 2310 pass | **2320 / 2319 pass** | PR body, task §9 ticked criterion |

Two of these are worse than merely stale:

- The README's **"Baseline is 22 pass / 0 fail"** heads a mutation-proof table that is still the
  six-proof table. M11, M12 and M13 — the proofs that closed the gate-1 finding, including the one
  that established the corpus guard can fail at all — **are absent from the record entirely**. That
  record is the artifact success criterion 3 points at.
- Task §9's ticked criterion `[x] npm run ci exits 0 — ci:fast 2311 tests` presents a superseded
  count as the evidence for a criterion marked met.

**This is an underclaim, not an overclaim**, and the direction matters — the evidence is stronger
than the record says, not weaker. It is still a finding, and a pointed one: this is the task whose
entire subject is not asserting more than you tested, and its own record is anchored to no commit.
The rule it teaches applies to its own paperwork.

→ Update the README's measurement section and proof table to HEAD (2191 sites, 9 proofs, 31-test
baseline), **stating the commit each measurement was taken at**, and refresh the four stale numbers
in the task document. Leave the PR body's history table as history.

---

## Code Review Findings

**None.**

The code lens found no correctness bug at HEAD. The substance was covered by QA cycle 2's refute
pass, whose findings are on the record rather than repeated here: six regression probes confirm the
`>`/`<` addition does not consume legitimate division (including `obj.return / 2`), and M11–M13
establish that both arms of the fix and the corpus-level guard are load-bearing.

One LOW is carried forward from gate 2 and deliberately not fixed — the keyword arm does not exclude
property access. Zero occurrences in the corpus, damage bounded to a single line, and any resulting
blindness is now *named* by the reachability guard rather than silent. The reasoning is recorded at
the point of decision, which is the right disposition for it.

---

## Scope

In scope. The six live true-positive fixes in `f94ff95` touch files outside the lint itself, which
reads at first glance as drift against §4's *"Rewriting existing assertions beyond what validation
requires"*. It is not: those six are what the lint flags on its own corpus, so leaving them would
ship a red CI. They are enumerated in §7 Files Summary. Rule D's addition beyond the filed
three-rule plan is disclosed in §6 with its reason rather than folded in silently.

---

## Recommended Actions

1. **[PC-1]** Refresh the FP record to HEAD — 2191 call sites, 31-test baseline, and the M11–M13
   proofs — and anchor each measurement to the commit it was taken at. Refresh the four stale numbers
   in the task document. Non-blocking; the evidence is stronger than the record, not weaker.

---

**Verdict rationale**: one `severity: medium` / `confidence: high` conformance finding, no high-severity
finding of either kind → ⚠️ **CONCERNS** by the deterministic table. Advisory: no gate written, no
formal review submitted, no code edited.

> **Independence limitation.** Step 5 dispatches both lenses as read-only subagents so the reviewer is
> not the author. This session operates under a standing instruction not to dispatch subagents unless
> asked, so both lenses were run inline by the session that produced the change. Mitigated by anchoring
> every conformance check to a re-derived number rather than to a reading of the diff — PC-1 was found
> by recomputing the corpus at HEAD and comparing it against the published figures, which is a check
> indifferent to who wrote the code.
