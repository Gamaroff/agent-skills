# Definition of Done Verification

**Story/Task:** task.215.probe-engine-python-cli-entry-form
**Verification Started:** 2026-10-19T14:18Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.215.qa.7.probe-engine-python-cli-entry-form.md`
**Gate File Found:** `task.215.gate.7.probe-engine-python-cli-entry-form.yml` (head `066813660d51`)
**PR:** #692 (source: branch)

**Gate Status:** ✅ PASS
**Quality Score:** 95/100

**Success Criteria Coverage (from QA):** SC1–SC4 PASS.

**NFR Validation (from QA):** Security PASS (measured, 8 executed, 0 reproduced), Performance PASS,
Reliability PASS, Maintainability PASS.

**Immediate Actions from QA:** None.
**Future Actions from QA:** TASK-215-QA7-1 to QA7-3 (LOW, carried to `recommendations.future` by
route 2b, closed) plus one pre-existing item (signal-kill detail wording).

**QA loop:** 7 cycles; bugs 1–10 all closed. Step 5c `/review-pr`:
`task.215.pr-review.1.probe-engine-python-cli-entry-form.md`, ✅ APPROVE (PC-1, PC-2 LOW, both
fixed).

No prior acceptance block in the task body (`PRIOR_DOD=0`).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #692)
**PR Review Decision:** null — the host requires no reviews; satisfied by the Step 5c report
`task.215.pr-review.1.probe-engine-python-cli-entry-form.md` (verdict ✅ APPROVE)

### Acceptance Criteria

#### SC1: `cli:<fixture>.py` returns `executed > 0` with the expected verdicts

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:724` (`CLI_INTERPRETERS`), `:2597-2601` (spawn)
- Test evidence: `shared/resources/tests/security-probe.test.mjs:2792` (per-PR `npm test` lane)
- Note: the criterion's example names `--sink path`, but every `.py` test uses `url-authority`. The
  path-sink fixture setup (`:2548-2588`) runs before the runtime branch, so the Node arm shares it
  and the Node arm's test (`:3407`) covers it. No `.py` test runs under the path sink directly.

#### SC2: `.py` no longer declined for the extension; other decline reasons unchanged

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:1445`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:3283`; `.sh` still declined at `:2484`

#### SC3: result and run record carry `interpreter` for `.py`, `null` otherwise

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:3669`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:3369`

#### SC4: a Python crash is `errored`, never `rejected`; a plain `sys.exit(1)` stays `rejected`

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:2624`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:2851`, `:3031` (exit 120), `:3121` (control)

### Documentation

- **CHANGELOG [Unreleased] entry citing task 215**: ✅ PASS — `CHANGELOG.md:9`
- **Routing docs say "a Node or Python CLI" at every recorded site**: ✅ PASS — `shared/resources/probe-boundary-rule.md:347`
- **Bundled copies in sync**: ✅ PASS — `skills/finalise/references/security-probe.mjs:2`

**Agent summary:** All 4 success criteria trace to engine code and per-PR tests (CI `test` green on
`918e077c`). One caveat: SC1's `--sink path` example has no `.py` test.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:724-871` (non-docs diff: no secret literal added)

### No new unsafe patterns (eval/exec/shell)

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:844`
- Note: the one added `exec` is `PYTHON_BOOTSTRAP`'s `exec(compile(source, entry, 'exec'), …)`. It runs
  the consumer's own entry inside the sandboxed child, as `python3 <entry>` would. Case input
  reaches argv only as a whole element (`:2594-2596`, `:905-916`). The spawn takes an argv array,
  with no shell, under `caseEnv` with `-E -s -B`.

### No secrets in version control (infrastructure)

**Status:** ✅ PASS
- Evidence: `shared/resources/tests/fixtures/security-probe/` (none of the 25 added `.py` fixtures holds a credential)

### TLS configured

**Status:** ⚠️ NOT_APPLICABLE
- Note: no network config changed.

### Logs don't contain PII

**Status:** ⚠️ NOT_APPLICABLE
- Note: no logging config changed; decline details carry fixture stderr only (sliced to 160 chars).

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — 0 hits in the non-docs diff
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` and the lockfile are untouched; `python3` is the consumer's interpreter

### Probe Results

**Candidates executed:** 71 — **reproduced:** 0

✅ **The boundary held**. Every candidate returned its expected verdict.

- Probe run by /finalise from the security agent's plan: 12 controls, record
  `docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.dod.1.security.run.json`
  (cases `task.215.dod.1.security.cases.<i>.json`). 0 escapes, 0 refusals.
- Six controls read `engages`: the exit-3 refuser, the plain `sys.exit(1)` refusal, the
  exception-shaped refusal line, the sibling import (no escape under `-B`), the `__main__` guard and
  the forked-child crash. The seventh, the `isPythonCrash` predicate, also reads `engages` (11 cases).
  So no refusal was wrongly scored `errored`.
- Crash controls (replaced excepthook, unprintable exception, forged answer record, shutdown flush
  at exit 120): each hostile case declined `errored`, and only the 3 legitimate cases count as
  executed. The verdict is `unverifiable`, as designed. No crash was scored as an answer.
  `cli-closes-record-fd.py` closes fd 3 on every input, so all of its cases are `errored`
  (0 executed). That is the safe direction, by design.

**Agent summary:** The boundary is the `cli:` `.py` arm's answer-vs-crash decision (SC4) and the
exported `isPythonCrash`. The static checklist passes. All 12 controls probe committed fixtures, so
the plan re-runs in any checkout.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- Note: internal tooling. No PII, payments, UI or health data. The diff is engine code, docs,
  `.py` test fixtures, QA artefacts and the CHANGELOG.

**Agent summary:** None of the compliance areas apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/qa-task/SKILL.md:679`
- Note: every site from the recorded `Node CLI` search names Python CLIs. The bundled copies are in
  the diff. The SKILL.md edits are body-only, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: README and `docs/architecture/` do not describe the probe engine.

**Agent summary:** The CHANGELOG entry is present, and the routing docs and bundled copies are updated.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 95/100, gate 7)
- Acceptance Criteria: ✅ 4/4 met (SC1 note: no `.py` path-sink test; the setup is shared with the tested Node arm)
- PR Review & Tests: ✅ host requires no reviews; Step 5c `/review-pr` APPROVE; per-PR `npm test` green
- Documentation: ✅ CHANGELOG and routing docs updated, bundle in sync
- Security Review: ✅ PASS — probe 71 executed, 0 reproduced, 0 escapes
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: SUCCESS @ `918e077c9f4e` over 5 checks (link-check, shellcheck, test, validate, branch rule)

**Outcome:** The task meets every Definition of Done criterion and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-19T14:24Z
**Total Duration:** ~15 minutes
**CI reading 1:** SUCCESS @ `918e077c9f4e` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed. It is
recorded on the PR canonical summary comment and in the implementation report (Step 7 publish
boundary).

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section
- ✅ Sprint Review summary created
- The outward side-effects (the PR canonical comment, the tracker comment and close, the board move)
  fire **after** this file is committed and pushed (Step 7 publish boundary). Their outcomes are
  recorded on the PR canonical comment and in the implementation report's Decisions Log, not here.

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
