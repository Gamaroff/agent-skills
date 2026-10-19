# Definition of Done Verification

**Story/Task:** task.195.finding-anchors-follow-ups
**Verification Started:** 2026-10-19T16:19:52Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.195.qa.2.finding-anchors-follow-ups.md`
**Gate File Found:** `task.195.gate.2.finding-anchors-follow-ups.yml`
**PR Review Report:** `task.195.pr-review.1.finding-anchors-follow-ups.md`. The verdict is APPROVE, with 0 findings and SC-1 to SC-11 met.

**Gate Status:** ✅ PASS (cycle 2; cycle 1 was CONCERNS 90)
**Quality Score:** 100/100
**Gate head:** `bdd4b66e11c6f83e0e982a669e0aac8739a9dc99`

**Phase coverage (from QA):** phases 1, 2 and 3 are covered; no phase has issues.

**NFR Validation (from QA):**

- Security: ✅ PASS. Measured: the fence probe of the review-pr `--inline` guard executed 14 cases and reproduced 0.
- Performance: ✅ PASS
- Reliability: ✅ PASS. Advisory CR-1 is routed to future work.
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** CR-1, CR-2 (pre-existing) and CR-3 from cycle 2, plus the items carried from gate 1. All are non-blocking.

**Prior acceptance blocks in the body:** 0, so there is no superseded verdict to discount.

**PR:** #695 (source: branch)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #695)
**PR Review Decision:** `null`. This host requires no reviews, so the decision is satisfied by `task.195.pr-review.1.finding-anchors-follow-ups.md`, the Step 5c `/review-pr` report, whose verdict is ✅ APPROVE.

### Acceptance Criteria

#### SC-1: An unparseable code `file_line` reads `unparseable` (exit 1); a conformance `ref` stays `no-line`

**Status:** ✅ PASS

- Code evidence: `shared/resources/finding-anchors.js:131-134`
- Test evidence: `shared/resources/tests/finding-anchors.test.mjs:159` (also :141, :170, :193, :642, :667), which runs per PR
- Note: the lens comes from `lensesOf(doc)`, or from the key in a bare array. The QA1-1 change from the §3 key-only rule is recorded in the task's QA Fix section.

#### SC-2: `--rev` with a `--root` absent from that commit exits 2 `bad-root`

**Status:** ✅ PASS

- Code evidence: `shared/resources/finding-anchors.js:255-260`
- Test evidence: `shared/resources/tests/finding-anchors.test.mjs:694`, which includes an in-tree sub-root control

#### SC-3: `--index` reads staged content; `--index` with `--rev` exits 2

**Status:** ✅ PASS

- Code evidence: `shared/resources/finding-anchors.js:296` (usage error at :381-384)
- Test evidence: `shared/resources/tests/finding-anchors.test.mjs:751` and `:796`

#### SC-4: Each dispatcher block HALTs when the checker cannot load, and continues on `malformed-anchors`

**Status:** ✅ PASS

- Code evidence: `skills/qa-task/SKILL.md:647-655`, `skills/qa-story/SKILL.md:1137`, `skills/review-code/SKILL.md:103` and `skills/review-pr/SKILL.md:619`
- Test evidence: `evals/shared/tests/finding-anchors-blocks.test.mjs:176` (also :194 and :212), looping over all four dispatchers. Unmapped members: none.

#### SC-5: Both `--inline` blocks refuse un-annotated findings instead of posting `[]`

**Status:** ✅ PASS

- Code evidence: `skills/review-pr/SKILL.md:945-975` and `skills/review-code/SKILL.md:166-173`
- Test evidence: `skills/review-pr/tests/review-pr.test.js:2501` and `skills/review-code/tests/review-code.test.js:384`

#### SC-6: `/review-pr` Step 6 passes the local PR head as `--rev`

**Status:** ✅ PASS

- Code evidence: `skills/review-pr/SKILL.md:607-618`
- Test evidence: `skills/review-pr/tests/resolve-head-rev.test.js`, plus `finding-anchors-blocks.test.mjs` for the reason decision
- Note: the Bitbucket arm is verified by inspection only, as the task's Out of Scope states.

#### SC-7: The develop-bug verify loop states the `(location unverified: …)` rule

**Status:** ✅ PASS

- Code evidence: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:50`
- Test evidence: `evals/shared/tests/finding-anchors-callers.test.mjs:226` (also :216)

#### SC-8: The engine still reads each distinct path once per run

**Status:** ✅ PASS

- Code evidence: `shared/resources/finding-anchors.js:127-138`
- Test evidence: `shared/resources/tests/finding-anchors.test.mjs:260`, a counting `readFile`

#### SC-9: `npm test`, `bundle:check` and `validate` pass for the five skills

**Status:** ✅ PASS

- Code evidence: `package.json:26`
- Test evidence: `.github/workflows/test.yml:58`
- Note: the agent re-ran two checks at `faec9ea4`. `bundle:check` reported 128 skills and 0 problems, and `quick_validate.py` passed for all five skills. Gate 2 records the fast gate at 5961/0 on `bdd4b66e`, and `bdd4b66e..faec9ea4` touches docs/tasks only. CI results are under Step 5.

#### SC-10: Each of the four named mutations turns its test red

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.195.finding-anchors-follow-ups/task.195.implementation.1.finding-anchors-follow-ups-initial-run.md:79`
- Test evidence: `shared/resources/tests/finding-anchors.test.mjs:170`, `:694`, `finding-anchors-blocks.test.mjs:176` and `finding-anchors-callers.test.mjs:216/:226`. Unmapped members: none.

#### SC-11: The CHANGELOG `[Unreleased]` › Fixed entry names the new verdict, `--index` and the dispatcher change

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:9`
- Test evidence: NOT_APPLICABLE (documentation criterion)

### Documentation

- **CHANGELOG [Unreleased] entry for task 195**: ✅ PASS — `CHANGELOG.md:9`
- **Skill files updated where behaviour changed**: ✅ PASS — `skills/review-code/SKILL.md:94`, plus the four reason-decision blocks and the develop-bug verify loop at :50. The bundled copies are fresh.

**Agent summary:** All 11 success criteria have code and per-PR test citations, with SC-11 being a documentation criterion. The CHANGELOG and skill docs are updated. PR #695 is OPEN with `reviewDecision` null; the APPROVE in pr-review.1 covers it.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `.claude/state/pr-diff-1792426746.diff`
- Note: no added line assigns a secret or token literal. The checker imports only fs, path and child_process.

### No new unsafe patterns (eval/exec/shell.run)

**Status:** ✅ PASS
- Evidence: `shared/resources/finding-anchors.js:224-229`
- Note: git runs only through execFileSync with argv arrays. Every spec starts with `<sha>:./` or `:./`, so a path cannot become a git option.

### Probe reproduced: review-pr `--inline` guard accepts a non-array `code_review.findings` beside annotated conformance findings

**Status:** ❌ FAIL (severity **medium**)
- Evidence: `skills/review-pr/SKILL.md:971-975`; probe `1:code-findings-string-beside-annotated-conformance@bash` in `task.195.dod.1.security.run.json`
- Note: this fails open. The code lens's findings are dropped with no HALT, and the run reads as "nothing anchorable". It is the same shape as QA 2's CR-1, which was routed to future work. The probe reproduces it.

### Probe reproduced: review-pr `--inline` guard accepts `anchor_check: null`

**Status:** ❌ FAIL (severity **low**)
- Evidence: `skills/review-pr/SKILL.md:971-975`; probe `1:anchor-check-null@bash`
- Note: this fails closed. Nothing is posted inline as verified, and the finding still reaches the summary. The checker never writes null, so only a hand-edited file produces it. The fix is one line: `.anchor_check | type == "string"`.

### Probe escaped its sandbox: ``fence:skills/review-pr/SKILL.md#`--inline` — findings beside the lines they are about``

**Status:** ❌ FAIL (no severity)
- Evidence: `skills/review-pr/SKILL.md:951`, `INLINE_FILE="$(mktemp -t review-pr-inline.XXXXXX.json)"`. It runs **before** the guard and is never removed on the HALT path.
- Escapes (13, each `tmp/review-pr-inline.*.json`): empty-object, wrapper-no-findings, conformance-wrapper-no-findings, bare-array, null, string, findings-not-array, unannotated-code, unannotated-conformance, empty-arrays-unannotated-other, not-json, non-object-finding, null-finding.
- Note: every refused input leaves a scratch file behind in `$TMPDIR`. QA 2's identical run recorded `escaped: 10` in `task.195.qa.2.security.run.json`, but its report did not surface it.

### General Security

- **Security TODOs/FIXMEs**: ✅ PASS — `.claude/state/pr-diff-1792426746.diff`
- **Dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is not in the diff

### Probe Results

**Candidates executed:** 43 — **reproduced:** 2

- `{"code_review":{"findings":"oops"},"pr_conformance":{"findings":[{…,"anchor_check":"no-line"}]}}` — expected **rejected**, got **accepted**
- `{"code_review":{"findings":[{…,"anchor_check":null}]}}` — expected **rejected**, got **accepted**

Controls:

- **review-code Step 2b checker** (containment, unparseable, reason decision): 23 executed, 0 reproduced. The verdict is hostile-rejected-legitimate-accepted.
- **review-pr `--inline` guard**: 20 executed (QA 2's 14 plus 6 more), 2 reproduced and 13 escaped.
- **review-code `--inline` guard**: declined (`bad-slot`). It is the second bash block under its heading, out of fence reach. Its committed test, `skills/review-code/tests/review-code.test.js:384`, holds it, and that is a test, not a probe count.

- Probe run by /finalise from the security agent's plan — 3 control(s), record `docs/tasks/task.195.finding-anchors-follow-ups/task.195.dod.1.security.run.json`
- Probes graded by a second read-only pass of the security agent: medium for the first, low for the second.

**Agent summary:** The task-type checks pass. Boundary is true: the checker classifies anchors, and both `--inline` guards refuse un-annotated input. The checker control held across 23 cases. The review-pr guard reproduced 2 hostile inputs and leaked a temp file on 13 refused inputs.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: this is an internal refactor of the finding-anchors checker, its tests and skill prose. It has no data, PII, payment, UI or health changes, and greps of the diff for card, `aria-`, `<img`, patient and PHI returned nothing.

**Agent summary:** No compliance areas apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: the `[Unreleased]` › Fixed entry cites `(task 195)` and includes consumer upgrade notes.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/review-code/SKILL.md:89`
- Note: the four dispatcher SKILL.md files and the develop-bug verify loop are updated. The SKILL.md hunks are body-only, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: there is no root-level API, configuration or CLI change, and README and docs/architecture do not mention finding-anchors.

**Agent summary:** The CHANGELOG cites task 195 and the affected skill docs are updated. README and architecture docs are not applicable.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate 2)
- Acceptance Criteria: ✅ 11/11 (SC-1 to SC-11)
- PR Review & Tests: ✅ `reviewDecision` is null (no reviews required); pr-review.1 verdict is APPROVE
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — 2 reproduced probes (medium, low) and 13 sandbox escapes on the review-pr `--inline` guard
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: PENDING @ `faec9ea45bf91575be6afd3aebf1321d999e4bd3` over 5 checks (link-check SUCCESS; test IN_PROGRESS; shellcheck, validate and the branch check QUEUED)

**Fix-and-recheck (Step 8a):** refused. `finalise-fix-and-recheck.mjs` exited 1 on `severity-low` (the lead finding is medium), `mutation-proved` and `no-other-finding-open` (2 others open).

**Blocking Issues:**

- [ ] Security (medium): the review-pr `--inline` guard (`skills/review-pr/SKILL.md:971-975`) must require an array for **every** wrapper key present, not one of the two. Probe `code-findings-string-beside-annotated-conformance` reproduces, and `findingsOf` in `shared/resources/finding-anchors.js` has the same leniency.
- [ ] Security (low): the same guard must treat `anchor_check: null` as absent (`.anchor_check | type == "string"`). Probe `anchor-check-null` reproduces.
- [ ] Security (escape): move `mktemp -t review-pr-inline…` (`skills/review-pr/SKILL.md:951`) after the guard, or remove it on every exit. 13 refused inputs leave a scratch file in `$TMPDIR`.
- [ ] CI: reading 1 is PENDING on `faec9ea4`. Acceptance needs a green run on the head carrying the final code.

**Outcome:** The task does NOT meet the Definition of Done. A code fix in `skills/review-pr/SKILL.md` (plus its guard test) closes all three security gaps. Because it changes code, it re-enters QA at 5a before /finalise re-runs.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-19T16:29:26Z
**CI reading 1:** PENDING @ `faec9ea45bf91575be6afd3aebf1321d999e4bd3` (the acceptance decision — Step 6)

**Blocking Issues Summary:**

1. Security (medium): the review-pr `--inline` guard passes a file where one lens's `findings` is not an array
2. Security (low): the review-pr `--inline` guard passes `anchor_check: null`
3. Security (escape): the review-pr `--inline` block's `mktemp` runs before the guard and leaks on HALT (13 escapes)
4. CI not yet finished on `faec9ea4`

**Estimated Effort to Close Gaps:** Small (≈1 hour): two jq conditions, one line moved, guard-test cases, then one QA cycle

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ Security probe record `task.195.dod.1.security.run.json` and its cases files
- ✅ PR comment posted (Step 8.5)

**Next Steps:**

- Fix the three review-pr `--inline` gaps above in `skills/review-pr/SKILL.md` and add the reproducing cases to `skills/review-pr/tests/review-pr.test.js`
- A gap closed by changing code re-enters QA before this verification re-runs; a document-only fix (documentation under `ci.docsOnly.patterns`, such as a CHANGELOG entry) re-runs it directly
- Re-run verification after fixes are implemented
