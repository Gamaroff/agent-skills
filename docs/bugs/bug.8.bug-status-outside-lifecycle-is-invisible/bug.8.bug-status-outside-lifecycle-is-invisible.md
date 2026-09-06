---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-02'
related: 'none — cross-cutting (no single owner)'
description: 'A bug filed with a status outside the general-bug lifecycle is silently invisible to /develop-next forever, and the one check that would catch it runs downstream of the gate it would have to pass.'
---

**Bug ID**: bug.8
**Related**: none — cross-cutting (selection · bug authoring · validation)
**Status**: ✅ Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-09-02
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `select-next.mjs` gates the registry fallback on
`BUG_ELIGIBLE_STATUSES = {"new", "reopened"}`. A bug whose frontmatter carries any other value — including
a plausible-looking one like `open` — is never selected. Nothing validates that value at filing time, and
the only check that would catch it runs **after** selection, so it can never fire on the bugs it would
catch.

**Expected Behavior**: a filed, unfinished general bug is visible to `/develop-next` once the roadmap
frontier empties. If its status is outside the lifecycle, something says so at filing time.

**Actual Behavior**: the bug is skipped in silence. The loop reports `roadmap-complete` and stops, which
is indistinguishable from there genuinely being nothing to do — the exact failure mode the registry
fallback was built to remove.

**Impact**: **both general bugs filed on 2026-09-02 were invisible — the two most recent filings, and
100% of them.** `bug.6` (Major/High — twelve fail-open routes past the snippet classifier, found by
task.73's own probe mode) sat on `develop` unselectable. `bug.7` had the same defect. Both are corrected in
the commit that files this report; the defect that let them through is not.

Bugs 1–5 were filed correctly and reached `closed` through the pipeline, so the rate is 2 of 7 rather than
universal. That is the honest number, and it is still enough: the two that failed are the two most recent,
both were authored by an agent mid-pipeline rather than through `/create-bug-report`, and that authoring
path is becoming the common one.

---

## Reproduction Steps

**Environment**: `agent-skills` on `develop`, any Node version. No credentials needed.

**Steps to Reproduce**:

1. File a general bug whose frontmatter reads `status: open` (rather than `new`), and add the matching
   registry row. Both the document and the row agree, so nothing looks wrong to a reader.
2. Confirm the eligibility floor:

   ```bash
   node -e "
   const s=require('fs').readFileSync('.agents/skills/develop-next/scripts/select-next.mjs','utf8');
   const m=s.match(/BUG_ELIGIBLE_STATUSES\s*=\s*new Set\(\[([^\]]*)\]/);
   const set=m[1].replace(/[\"'\s]/g,'').split(',').filter(Boolean);
   console.log(set, \"'open' eligible? ->\", set.includes('open'));"
   # => [ 'new', 'reopened' ] 'open' eligible? -> false
   ```

3. Empty the roadmap frontier (or run against a roadmap with no actionable rows) and run
   `select-next.mjs`. The bug is not selected, and nothing distinguishes it from a bug that is
   legitimately finished.

   **Precisely (measured on HEAD 9e54f93f, corrected by review-bug 2026-09-06):** the row *is*
   recorded — `registryFrontier.passedOver[]` carries it with
   `reason: "document status open — outside the bug eligibility floor (new, reopened)"`. It is not in
   `skipped[]`, which holds roadmap rows only. The defect is therefore **indistinguishability, not
   absence**: that reason string is byte-identical in shape to the one every correctly-`closed` bug
   gets, there is no `warnings[]` entry, and the run's `rationale` counts rejected rows without
   naming which reasons were lifecycle-valid. On the current corpus a real typo would sit among 8
   `closed` bugs and ~90 `accepted` tasks wearing the same sentence. A fixer must close the
   *distinguishability* gap, not re-add a record that already exists.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**The lifecycle, and what is outside it** — `docs/standards/bug-documents.md:57`:

> | `status` | enum | Yes | Bug lifecycle: `new`, `in-progress`, `ready-for-qa`, `closed`, `reopened` |

`open` is not a member. Yet both bugs filed since the fallback shipped used it:

```
docs/bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/…  status: open   (Major/High)
docs/bugs/bug.7.zero-blocks-executed-fires-on-correct-refusal/… status: open   (Minor/Medium)
```

**The gate** — `shared/resources/…/select-next.mjs:127`:

```js
export const BUG_ELIGIBLE_STATUSES = new Set(["new", "reopened"]);
```

**Why nothing caught it**, and this is the part worth reading twice. `review-bug` *does* check it —
`skills/review-bug/SKILL.md:71`:

> **Frontmatter**: `type: bug` present → **Critical** … `status` ∈ bug lifecycle; `severity` ∈ {…}

But `review-bug` is invoked from `develop-bug` **Step 2**, which only runs on a bug the selector already
chose. **The guard sits downstream of the gate it would have to pass.** A bug with a bad status is never
selected, so `review-bug` never runs on it, so the check that would catch the bad status never executes.
It is a check that can only fire on inputs that did not need it.

**The template is not the culprit** — `skills/create-bug-report/assets/bug-report-template.md:3` is
correct:

```yaml
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
```

Both real cases were authored by an agent mid-pipeline rather than through `/create-bug-report`, which is
the ordinary way bugs get filed here — `bug.6` by task.73's DoD run, `bug.7` by a QA cycle. So the failure
is not "the template is wrong"; it is "nothing checks, and the common authoring path does not use the
template."

**No code anywhere knows the lifecycle.** A search for `ready-for-qa` across `evals/`, `shared/`, `tests/`
and `skills/*/tests/` returns nothing — the enum exists only in prose and in `BUG_ELIGIBLE_STATUSES`,
which consumes it without validating against it.

---

## Scope & Impact

**Areas this cuts across**: bug authoring (`create-bug-report`, and agent-authored filings that bypass
it) · selection (`select-next.mjs` registry fallback) · validation (there is none) · `review-bug`
(the misplaced guard).

**Why it has no single owner**: the selector is behaving correctly — `open` genuinely is not an eligible
status. The template is correct. `review-bug`'s check is correct. The defect is in the *composition*: no
component is wrong on its own, and the gap is that nothing validates between filing and selection.

**Why Major.** The registry fallback exists precisely so that "work exists" and "the loop can see it" stop
being separated by a manual step nobody notices skipping (`roadmap-selection.md:62`). This defect
reintroduces exactly that separation, with the same silent failure mode, for the class of agent-authored
bugs. Severity is driven by the consequence rather than the rate: a Major/High bug can sit indefinitely in
a registry that reports it as filed, and nothing anywhere says otherwise.

---

## Suggested Fix

Not prescriptive — the fix belongs to whoever picks this up. Three candidates, in rough order of value:

1. **Validate at filing time.** A test over `docs/bugs/*/bug.*.md` asserting `status` ∈ lifecycle, and the
   same for the registry row. Cheap, runs in CI, and would have caught both. Precedent for reading the
   corpus as a test: `evals/shared/tests/qa-re-review-scope-parity.test.mjs`.
2. **Make the selector say something.** An unrecognised status is currently indistinguishable from a
   finished one — both land in `registryFrontier.passedOver[]` under the same "outside the … eligibility
   floor" sentence. Emitting a `warnings[]` entry (or a distinct `reason`) when the document status is
   not a member of the kind's *lifecycle* — as opposed to being a valid-but-terminal member — turns a
   sentence nobody can act on into one that names a typo. Note this is the same shape as `bug.7`: one
   signal standing for two states.
3. **Derive the enum rather than restating it.** `BUG_ELIGIBLE_STATUSES` and
   `docs/standards/bug-documents.md` are two independent copies of one lifecycle, which is the drift this
   repo has now written three tasks about (T43, T74, and task.79's non-restatement guard).

**Do not** simply widen `BUG_ELIGIBLE_STATUSES` to include `open`. That treats the symptom, admits a
status the lifecycle does not define, and leaves the next unrecognised value just as silent.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-06
**Developer**: develop-bug (Claude)

**Reproduction**: A fixture registry row pointing at a document whose frontmatter reads `status: open`,
fed through `registryFrontier()` from `skills/develop-next/scripts/select-next.mjs`. Observed on HEAD
`9e54f93f`:

- the row is **not selected** — correct, `open` is genuinely not eligible;
- the run stops with `stopReason: "roadmap-complete"`, whose `detail` counts registry rows considered and
  says nothing about the unrecognised value;
- the row lands in `registryFrontier.passedOver[]` with
  `reason: "document status open — outside the bug eligibility floor (new, reopened)"` — **the same
  sentence shape a correctly-`closed` bug gets**;
- `frontier.warnings` gains nothing, and on the normal (non-`--lint`) path `selectNext` **drops
  `frontier.warnings` entirely** — it returns `registryFrontier: { passedOver }` only, so even a warning
  emitted here would never reach an operator running `/develop-next`.

Measured against the live corpus: `select-next.mjs --lint` returns 101 `passedOver` rows, of which 8
(closed bugs) and ~90 (accepted tasks) carry that identical sentence. A typo hides in a crowd of 98.

**Root Cause Analysis**: `registryFrontier()` knows exactly one status vocabulary — the **eligibility
floor** (`BUG_ELIGIBLE_STATUSES` / `TASK_ELIGIBLE_STATUSES`, `select-next.mjs:127,128`). Its rejection
branch (`select-next.mjs:1258`) is a single `!ELIGIBLE_FOR[kind].has(docStatus)` test, so `closed` (a
valid terminal status — nothing to do) and `open` (not a status at all — a filing error) take the same
path and produce the same sentence. **The lifecycle itself exists nowhere in code**: `grep -rl
"ready-for-qa"` over `evals/`, `shared/` and `skills/*/tests/` returns only consumers of the floor, never
a definition of the full set. With no lifecycle in code there is nothing to validate a filing against,
and nothing the selector could use to tell "terminal" from "unrecognised" apart.

The second half is placement, exactly as the report argues: `review-bug` does check `status` ∈ lifecycle,
but it runs as `develop-bug` Step 2, on a bug the selector has already chosen. A bug the selector cannot
see never reaches the check that would explain why.

**Proposed Fix**: give the lifecycle a home in code (`BUG_LIFECYCLE_STATUSES` /
`TASK_LIFECYCLE_STATUSES`, exported), split the rejection branch so a non-lifecycle status gets its own
reason **and** a `warnings[]` entry, stop dropping `frontier.warnings` on the normal selection path, and
add a corpus test that fails at filing time when any bug/task document or registry row carries a status
outside its lifecycle. Deliberately **not** widening `BUG_ELIGIBLE_STATUSES` — the floor and the
lifecycle are different sets on purpose (`select-next.mjs:100–126`).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-06

**Root Cause**: `registryFrontier()` knew only the **eligibility floor**, so its single
`!ELIGIBLE_FOR[kind].has(docStatus)` branch answered "is this selectable?" for a question that was
really "is this a status?". `closed` and `open` therefore produced the same sentence. The lifecycle
existed only in prose (`docs/standards/bug-documents.md`), so there was nothing for a filing-time check
to validate against, and the one check that did exist (`review-bug`) ran downstream of the selection it
would have had to pass.

**Fix Description** — three changes, matching the report's own Suggested Fix ordering. The eligibility
floor is deliberately **not** widened:

- **Give the lifecycle a home in code.** `BUG_LIFECYCLE_STATUSES` and `TASK_LIFECYCLE_STATUSES` are
  exported from `select-next.mjs` alongside the floors, with a comment stating the distinction the file
  previously had no way to express: the floor answers *"should this be nominated now?"*, the lifecycle
  answers *"is this a string a status at all?"*. They are strict supersets of the floors, asserted as
  such, and pinned against the prose in `docs/standards/bug-documents.md` by a parse-and-compare test —
  so the two copies cannot drift silently, which is the objection Suggested Fix §3 raised.
- **Make the selector say something.** The lifecycle test now runs **before** the floor test, because it
  names the nearer and more actionable cause. An off-lifecycle row gets its own `reason` (which names the
  whole lifecycle, so the typo is fixable from the message alone), `offLifecycle: true`, a
  `warnings[]` entry, and a named mention in the `roadmap-complete` `detail` line. A second gap was found
  and closed while doing this: `frontier.warnings` was returned **only** under `--lint`; the normal
  `selectNext` path returned `registryFrontier: { passedOver }` and dropped them — so the unattended
  `/develop-next` loop, the one caller that most needed the warning, was the one caller that could never
  see it.
- **Validate at filing time.** `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` reads the
  repo's own corpus and fails when any `type: bug` or `type: task` document, or any bug/task registry
  row, carries a status its lifecycle does not define — the guard moved **upstream** of the gate, so it
  fires on commit regardless of whether the document came from `/create-bug-report` or (as both real
  cases did) from an agent mid-pipeline. It imports the lifecycles rather than restating them, so the
  chain is prose → code → corpus with exactly one comparison at each link.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs` — exported `BUG_LIFECYCLE_STATUSES` /
  `TASK_LIFECYCLE_STATUSES` + `LIFECYCLE_FOR`; split the rejection branch in `registryFrontier()`;
  surfaced `frontier.warnings` on the normal `selectNext` path; named off-lifecycle rows in the
  `roadmap-complete` `detail`.
- `evals/develop-next/unit/select-next.test.mjs` — 7 regression tests (§B8), each paired with a
  terminal-status counterexample so the distinction cannot pass vacuously.
- `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` — **new**: the filing-time corpus guard
  (6 tests), with an anti-vacuity floor on the glob so a scan that matches nothing fails instead of
  passing.
- `skills/develop-next/references/roadmap-selection.md` — the canonical prose listing passed-over
  reasons now includes the lifecycle case and the both-paths warning; test-coverage summary §15 updated.

**Testing**:

- **Fails-without proved, then mutation-proved five ways.** All 7 §B8 tests fail on the pre-fix code
  (`TypeError: BUG_LIFECYCLE_STATUSES is not iterable`, plus reason/warning mismatches). After the fix,
  each of five separate reversions was applied in isolation and turned the expected test red:

  | Reversion | Tests that went red |
  |---|---|
  | delete the off-lifecycle branch | reason · warning · task-axis · stop-path (4) |
  | drop `warnings` from the normal-path output | stop-path · clean-stop (2) |
  | drop the off-lifecycle suffix from `detail` | stop-path (1) |
  | fire the warning on *every* rejection | clean-stop · warning-anti-vacuity (2) |
  | set a bug document to `status: open` | corpus guard — bug documents (1) |
  | set a registry row to `open` | corpus guard — bug registry rows (1) |

- `evals/develop-next/unit/select-next.test.mjs`: **142 pass, 0 fail**.
- `evals/shared/tests/document-status-lifecycle-corpus.test.mjs`: **6 pass, 0 fail**; the corpus is
  currently clean (12 `type: bug` docs, 94 `type: task` docs, 10 + 92 registry rows), which is the point —
  it would have been red on 2026-09-02 when `bug.6` and `bug.7` were filed.
- `npm test` (full suite) and `npx prettier --check` on every touched path: see QA Verification below.

**Verification Steps for QA**:

1. `command node --test evals/develop-next/unit/select-next.test.mjs` → 142 pass, including 7 `B8:` tests.
2. `command node --test evals/shared/tests/document-status-lifecycle-corpus.test.mjs` → 6 pass.
3. Re-file the original defect: set `status: open` in any `docs/bugs/*/bug.*.md` and re-run (2) — it must
   go red and name the file. Revert.
4. Confirm the floor was not widened: `BUG_ELIGIBLE_STATUSES` is still `{new, reopened}` and §16/H1 (the
   bug-axis-gap test) still passes.
5. `npm test` green end to end.

> **Note on `command node`.** This session's shell defines `node()` as a function that runs bare `nvm`
> before `command node "$@"`, so nvm's help text is written to **stdout** ahead of every node CLI's real
> output — enough to corrupt any captured JSON. Environment-specific, not a defect in this repo, but it
> is why every command above is spelled `command node`.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By | Notes                                                                 |
| ---------- | ------ | ---------- | --------------------------------------------------------------------- |
| 2026-09-02 | New    | Claude     | Filed after finding bug.6 and bug.7 both unselectable with `status: open` |
| 2026-09-06 | New    | review-bug | Fix-readiness review: READY TO FIX (9/10). Corrected the Reproduction Steps + Suggested Fix evidence — the passed-over row *is* recorded in `registryFrontier.passedOver[]` with a reason; the defect is that the reason is indistinguishable from a terminal status. Severity/priority unchanged. |
| 2026-09-06 | In Progress | develop-bug | Reproduced against `registryFrontier()`; root cause localised to the single floor-only rejection branch |
| 2026-09-06 | Ready for QA | develop-bug | Fix implemented + 13 regression tests (7 selector, 6 corpus), mutation-proved 6 ways; eligibility floor unchanged |

---

## Resolution Summary

[Will be completed when bug is closed]
