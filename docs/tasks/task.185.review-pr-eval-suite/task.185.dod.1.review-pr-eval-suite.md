# Definition of Done Verification

**Story/Task:** task.185.review-pr-eval-suite
**Verification Started:** 2026-10-05T17:01:58Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.185.qa.4.review-pr-eval-suite.md` (cycles 1–4)
**Gate File Found:** `task.185.gate.4.review-pr-eval-suite.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Gate head:** `2064ee43`; gate trajectory FAIL 70 → CONCERNS 80 → CONCERNS 90 → PASS 100

**Phase coverage (from QA):** phases 1–4 covered, none with open issues.

**NFR Validation (from QA):**

- Security: ✅ PASS (reasoned; 28 probes, `task.185.qa.2.security.run.json`)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Bugs:** 4 raised (`task.185.bug.1`–`bug.4`), 4 closed.
**PR conformance (5c):** `task.185.pr-review.1.review-pr-eval-suite.md` — CONCERNS, non-blocking
(one medium/medium out-of-scope follow-up, CR-1; the rest low/low).
**Immediate Actions from QA:** none.
**Future Actions from QA:** carried in gate 4 `recommendations.future`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (13/13)
**PR Status:** OPEN (PR #574)
**PR Review Decision:** none (no formal GitHub review; the pipeline's review is the QA loop plus 5c `/review-pr`, which is advisory)

### Acceptance Criteria

| AC | Criterion | Code / measurement | Test / lane |
|---|---|---|---|
| AC1 | `next-report-number.sh` → 4 for `.1.`+`.3.`, bash + zsh | `skills/review-pr/scripts/next-report-number.sh:31` | `skills/review-pr/tests/review-pr.test.js:2374`, per PR via `npm test`; the zsh arm runs locally only (no zsh on ubuntu-latest) |
| AC2 | `eval:review-pr` 4/4 in replay | `package.json:48` | `.github/workflows/test.yml:57` (`eval:all`) |
| AC3 | Live N=5: 02, 03 at 5/5; 01, 04 ≥ 4/5 | implementation report line 79: 5/5 each | measured criterion |
| AC4 | No refused or unhandled `gh` call in live runs | implementation report line 79: 0 in 20 runs | measured criterion |
| AC5 | Inside the default timeout | 92–177 s against 300 s | measured criterion |
| AC6 | `eval:all` growth < 10 s | 4.77 s → 7.59 / 7.92 s (line 81) | measured criterion |
| AC7 | `npm test` passes | `package.json:26` | `test.yml:54` |
| AC8 | `quick_validate` | `skills/review-pr/SKILL.md:1` | `validate.yml:73` |
| AC9 | `lint:shell` | `next-report-number.sh:1` | `shellcheck.yml:58` |
| AC10 | `bundle:check` | `package.json:64` | `validate.yml:128` |
| AC11 | CHANGELOG `[Unreleased]` | `CHANGELOG.md:9`, `:420` | documentation criterion |
| AC12 | Shared README documents the harness additions | `evals/shared/README.md:52`, `:61`, `:133` | documentation criterion |
| AC13 | Existing scenarios unchanged | `evals/shared/runner.mjs:271` | `evals/shared/tests/runner-setup.test.mjs:170`; `eval:all` per PR |

**Agent summary:** All 13 criteria trace to code and to a per-PR lane, a committed measurement, or a doc line that was read.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `evals/review-pr/setup.mjs:417` — the sandbox env blanks `GH_TOKEN` / `GITHUB_TOKEN` and points `GH_CONFIG_DIR` at an empty directory

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `evals/shared/lib/fake-gh.mjs:168` — every spawn takes an argv array with no shell; `next-report-number.sh` quotes every expansion and reads `{n}` in base 10

### `next-report-number.sh` boundary decision

**Status:** ✅ PASS — `boundary: internal`, matching QA. Its only input is the pipeline's own `.pr-review.{n}.` reports.

### `fake-gh.mjs#runFakeGh` write refusal — boundary on agent-chosen argv

**Status:** ❌ FAIL — reproduced by execution

The agent classed the write deny-list as a boundary on external input and ran nothing (`probes_executed: 0`, the zero-guard), naming glued short flags as the untested axis. `/finalise` then ran 9 candidates directly against `runFakeGh` under bash:

| Input | Fixture for the path | Result | Expected |
|---|---|---|---|
| `api -X POST …/issues/1/comments` | none | refused | refused ✅ |
| `api --method=POST …` | none | refused | refused ✅ |
| `api -f body=x …` | none | refused | refused ✅ |
| `api -XPOST …` | none | unhandled | refused ⚠️ |
| `api -fbody=x …` | none | unhandled | refused ⚠️ |
| `api -Fbody=@f …` | none | unhandled | refused ⚠️ |
| `api …/issues/1/comments` (GET) | `[]` | served, exit 0 | served ✅ |
| `api -XPOST …/issues/1/comments` | `[]` | **served, exit 0, no flag** | refused ❌ |
| `api -fbody=x …/issues/1/comments` | `[]` | **served, exit 0, no flag** | refused ❌ |

`parseArgs` (`evals/shared/lib/fake-gh.mjs:133-143`) reads a glued short flag (`-XPOST`, `-fbody=x`) as a boolean
flag named `-XPOST`. Real `gh` (pflag) reads it as `-X POST`. So when a fixture serves the path, a glued
write is answered as a read and logged with neither `refused` nor `unhandled`, and the eval's "never posts"
assertion passes on a run that tried to post. In the four review-pr scenarios no `api` fixture is served, so
the call is logged `unhandled` and the scenario still fails. The gap is latent in the shared harness, not live
in this suite.

### General Security

- **Security TODOs/FIXMEs**: ✅ PASS — none on added lines
- **Dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` changes scripts only

### Probe Results

**Candidates executed:** 9 (by `/finalise`, directly; the agent executed 0) — **reproduced:** 2 (plus 3 mislabelled `unhandled`)

- `api -XPOST repos/o/r/issues/1/comments` with a GET fixture — expected **refused**, got **served (exit 0)**
- `api -fbody=x repos/o/r/issues/1/comments` with a GET fixture — expected **refused**, got **served (exit 0)**

**Agent summary:** No secrets and no unsafe exec patterns. Overall FAIL: the fake `gh`'s write refusal is a boundary on agent-chosen input, and it was not probed. `/finalise` probed it and reproduced the gap above.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — internal eval harness and a report-numbering script; no personal data, payments, UI or health data (the age-gate code is a made-up fixture inside a temporary sandbox).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md**: ✅ `CHANGELOG.md:9` (Added) and `:420` (Fixed, obs #272)
- **Harness and suite docs**: ✅ `evals/shared/README.md:46`, `evals/review-pr/README.md:14`, `skills/review-pr/SKILL.md:636`
- **Architecture / contributor docs**: ✅ `docs/architecture/concepts/tech-stack.md:42`, `docs/contributing/evals/reference.md:15`

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** SUCCESS @ `21f7703484fe342fc9536a52db84a24afbe540bb` (5 checks: branch rule, link-check, shellcheck, test, validate)

**Summary:**

- QA Report: ✅ PASS (100/100, gate 4)
- Acceptance Criteria: ✅ 13/13
- PR Review & Tests: ✅ CI green; no formal review (solo pipeline)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — the fake `gh` serves a glued-shorthand write as a read (reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

- [ ] Security: `evals/shared/lib/fake-gh.mjs` `parseArgs` must split a glued short value flag (`-XPOST` → `-X POST`, `-fbody=x` → `-f body=x`, as pflag does), so `gh api -XPOST …` and `gh api -fbody=x …` are refused whatever the fixtures serve. Add the two served-path cases to `fake-gh.test.mjs` "every write is refused" and mutation-prove them.

**Fix-and-recheck (Step 8a):** not taken. The security agent rated the finding medium, so the `severity-low`
precondition cannot hold, and `/finalise` does not re-grade a finding to clear its own gate. The fix is a code
change, so on resume it re-enters QA at 5a (`reenter-qa-after-finalise.sh`).

**Outcome:** The task does NOT meet the Definition of Done. One security gap must be closed before acceptance.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-05
**CI reading 1:** SUCCESS @ `21f77034` (the decision reading; no acceptance commit was made, so there is no reading 2)

**Blocking Issues Summary:**

1. Security: the fake `gh` serves a glued-shorthand `api` write (`-XPOST`, `-fbody=x`) as a read when a fixture serves the path

**Estimated Effort to Close Gaps:** Small (≈1 hour: a `parseArgs` change, two test cases, a mutation proof, one QA cycle)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted (see the implementation report's Decisions Log)

**Next Steps:**

- Fix `parseArgs` as above; the code change re-enters QA at 5a before `/finalise` re-runs
- Re-run verification after the fix
