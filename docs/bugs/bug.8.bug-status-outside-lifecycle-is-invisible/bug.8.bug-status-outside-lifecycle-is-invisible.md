---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-02'
related: 'none — cross-cutting (no single owner)'
description: 'A bug filed with a status outside the general-bug lifecycle is silently invisible to /develop-next forever, and the one check that would catch it runs downstream of the gate it would have to pass.'
---

**Bug ID**: bug.8
**Related**: none — cross-cutting (selection · bug authoring · validation)
**Status**: 🆕 New
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
   `select-next.mjs`. The bug is not selected and is not mentioned in `skipped[]`.

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
   finished one. Surfacing it in `skipped[]` — or as a `lint.warnings` entry — turns silence into a
   sentence. Note this is the same shape as `bug.7`: one signal standing for two states.
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

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file1]
- [file2]

**Testing**: [How the fix was tested]

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

---

## Resolution Summary

[Will be completed when bug is closed]
