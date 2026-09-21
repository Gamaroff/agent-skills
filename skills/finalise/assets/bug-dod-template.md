# Definition of Done Verification

**Bug:** {bug-prefix}.{name} ({story | task | general} bug — `{bug-directory}`)
**Verification Started:** {YYYY-MM-DDTHH:MMZ}
**PR:** [#{pr_number}]({pr_url}) → `{base-branch}`, head `{head-sha-12}`
**Mode:** `/finalise --bug` — fix-evidence DoD for a bug report. A bug has no acceptance criteria, carries no Change Log (`document-change-log.md` §Exclusions), and closes through its own lifecycle in `develop-bug` Step 7 Part B; the story/task-shaped steps are skipped by the mode, not by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited.

---

## Step 1: QA Report Review

**QA Reports:** {none — a bug directory carries no gate file; the develop-bug verify loop is the QA record: N cycles in the implementation report (`{bug-prefix}.….implementation.{N}.….md` §QA Iteration History), {FAIL → … → PASS}, with the bug file's `#### QA Verification` on the last iteration reading `✅ Fixed` | the co-located `*.qa.*.md` / `*.gate.*.yml` found, summarised}

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** {✅ PASS | ❌ FAIL | ⚠️ PARTIAL}

#### Expected behaviour — "{the bug's Expected Behaviour, quoted}"

**Status:** {✅ PASS | ❌ FAIL}
- Code evidence: {file:line citations from the PR diff that implement the expected behaviour}
- Test evidence: {test file:line that asserts it, and the lane it runs in per PR}
- Executed evidence: {what was run in this pass and its result}

#### Regression test fails without the fix, passes with it

**Status:** {✅ PASS | ❌ FAIL}
- {the mutation record from the bug file's `#### QA Verification` / implementation report, or the revert-and-rerun performed in this pass — name the commit or snapshot the test was red against}

#### The guard's stated scope matches its scanned scope

**Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
- {when the fix adds or widens a test/guard: what it scans, the non-vacuity floor, and the mutation that turns it red; otherwise NOT_APPLICABLE with the reason}

#### Bundled copies match the source

**Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
- {`npm run bundle:check` (or the pre-commit bundle) result on the head; NOT_APPLICABLE when no `shared/resources/` file changed}

#### Suite + lint green

**Status:** {✅ PASS | ❌ FAIL}
- {the fast gate (`npm run ci:fast` or the project's `develop.fastGateCommand`) on the head: pass / fail counts, formatter result}

### Documentation

- **Bug report fix record**: {✅ PASS | ❌ FAIL} — {Investigation + Fix Implementation for every iteration; QA Verification on the last; template placeholders remaining = 0}
- **Status History**: {✅ PASS | ❌ FAIL} — {N rows; every transition recorded}
- **Change Log**: ⚠️ NOT_APPLICABLE — bug reports carry `## Status History`, never a Change Log (`document-change-log.md` §Exclusions); count of `## Change Log` in the bug file = {0}. ✅ as required.
- **Review report**: {✅ PASS | ⚠️ NOT_APPLICABLE} — {`{bug-prefix}.….review.1.fix-readiness.md` (READY TO FIX N/10)}
- **Implementation report**: {✅ PASS | ❌ FAIL} — {path; Pipeline Progress through Step 5–6; verify-cycle entries}
- **Behaviour docs**: {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE} — {the docs that restate the changed behaviour, each named}

---

## Step 3: Security Review

**Story Type:** {bug — the fix's surface, e.g. shell hook + Node CLI}
**Overall Security Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}

{per-check lines from the security agent YAML — access gate, fail-closed, injection surface; and the boundary decision: `boundary: true` with `probes_executed: N` and the reproduced list, or `boundary: false` with the reason}

---

## Step 4: Compliance Review

**Overall Compliance Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
**Applicable areas:** {none — no user data, no UI, no persistence, no third-party service | the areas checked}

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** {✅ PASS | ❌ FAIL} (see Step 2 → Documentation). {Repository `CHANGELOG.md` entry under `## [Unreleased]` citing `(bug N)`, or the reason none is needed}; `{bug registry | parent story/task Bug Reports}` row flips to `closed` in Part B.

---

## Step 5: Acceptance Decision

**Decision:** {✅ ACCEPTED | ❌ GAPS IDENTIFIED}

- QA record: {✅ verify loop PASS (cycle N of 5)}
- Fix evidence: {✅ N/N criteria}
- PR review: {— no human review (autonomous run; the merge gate is `npm run ci` on the PR branch plus the CI rollup) | ✅ approved by …}
- Documentation: {✅}
- Security: {✅}
- Compliance: {⚠️ N/A}
- **CI rollup on `{head-sha-12}`:** {per-job conclusions; the rollup token; the head it was read on}

**Outcome:** {the fix meets every applicable Definition of Done criterion on a CI-green head. Accepted. | the gaps, each named}

---

## Verification Complete

**Final Status:** {✅ ACCEPTED | ❌ GAPS IDENTIFIED - NOT ACCEPTED}
**Completion Time:** {YYYY-MM-DDTHH:MMZ}
**CI reading 1:** {CI_ROLLUP} @ `{CI_HEAD_1}` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ This DoD summary (committed and pushed at 6a)
- ✅ Bug report: Status History row `DoD verified — {this file}` (6a); Resolution Summary + `status: closed` are written by develop-bug Step 7 Part B, after this skill returns
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report, not here
- — Sprint Review summary: not generated — a bug fix is reported through its Resolution Summary and the registry, not a sprint-review artifact (bug mode skip)
- — Change Log row: not written — forbidden for a bug report (bug mode skip)
- — Task registry tick: `not-a-task` (a bug run; the bug registry / parent Bug Reports table is written in Part B)

**Next Steps:**

- develop-bug Step 7 Part B: Resolution Summary, `status: closed`, final Status History row, parent linkage / registry row
