# Definition of Done Verification

**Story/Task:** task.185.review-pr-eval-suite
**Verification Started:** 2026-10-05T19:11:42Z
**Run:** 2. Run 1 (`task.185.dod.1.review-pr-eval-suite.md`) found one security gap. The gap re-entered QA, which ran cycles 5–7. This run verifies afresh and inherits nothing from run 1.

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.185.qa.7.review-pr-eval-suite.md` (cycles 1–7)
**Gate File Found:** `task.185.gate.7.review-pr-eval-suite.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Gate head:** `84506ed6`. Trajectory: FAIL 70 → CONCERNS 80 → CONCERNS 90 → PASS 100 → (finalise gap) → FAIL 60 → FAIL 50 → escalation → PASS 100

**NFR Validation (from QA):** Security PASS (measured, 82 probes executed directly), Performance PASS, Reliability PASS, Maintainability PASS

**Bugs:** 7 raised, 7 closed.
**PR conformance (5c, second run):** `task.185.pr-review.2.review-pr-eval-suite.md`, CONCERNS, non-blocking. CR-1 (medium/medium) is a latent non-verdict exit 0 in the runner; the rest are low.
**Immediate Actions from QA:** none.
**Prior-run body block:** `## Definition of Done - Gaps Identified` from run 1 is present. It is superseded by this run and is retitled historical at acceptance.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (12/13)
**PR Status:** OPEN (PR #574)
**PR Review Decision:** none (no formal GitHub review; the pipeline's review is the QA loop plus 5c `/review-pr`)

| AC | Status | Evidence |
|---|---|---|
| AC1 `next-report-number.sh` → 4 for `.1.`+`.3.`, bash and zsh | ❌ FAIL (execution rule) | `next-report-number.sh:31`; `review-pr.test.js:2374`. The bash arm runs per PR (CI run 37361002462). The zsh arm never runs in CI: `ubuntu-latest` has no zsh and `test.yml` installs none. It passes locally (8/8). Run 1 passed it on the task.176 precedent ("CI runs the bash lane — ubuntu-latest has no zsh"); this run applies the rule as written. |
| AC2 replay 4/4 | ✅ | `package.json:48`; CI `eval:all` |
| AC3 live N=5 | ✅ (measured) | implementation report line 79. These runs predate cycles 1–7; the later 1/1 rechecks cover 02 and 03 only |
| AC4 no refused/unhandled gh call live | ✅ (measured) | 0 in 20 runs |
| AC5 inside timeout | ✅ (measured) | 92–177 s against 300 s |
| AC6 `eval:all` growth < 10 s | ✅ (measured) | +2.8–3.2 s; baseline taken on the pre-Phase-2 branch |
| AC7 `npm test` | ✅ | CI: 4987 pass / 0 fail |
| AC8 `quick_validate` | ✅ | `validate.yml:73` |
| AC9 `lint:shell` | ✅ | `shellcheck.yml:120` |
| AC10 `bundle:check` | ✅ | `validate.yml:128` |
| AC11 CHANGELOG | ✅ (documentation) | `CHANGELOG.md:9`, `:420` |
| AC12 shared README | ✅ (documentation) | `evals/shared/README.md:52`, `:61`, `:133–150` |
| AC13 existing scenarios unchanged | ✅ | `runner-setup.test.mjs:170`; 43 scenarios in CI |

---

## Step 3: Security Review

**Overall Security Status:** ❌ FAIL

- **No hardcoded secrets**: ✅ `evals/review-pr/setup.mjs:417`
- **No unsafe patterns**: ✅ argv-array spawns throughout
- **`api` write refusal (read allow-list)**: ✅ 46 `api` write forms refused, including glued, clustered, mixed `-X`/`--method`, field and input flags, graphql mutations, and the skill's own `api -X PATCH`
- **Real reads served**: ✅ 30 read forms served, including every review-pr skill read and `tracker-comment.js`'s `api --paginate`
- **`pr`/`issue` write refusal**: ❌ the subcommand is taken from `pos[1]`. Cobra resolves it after stripping flags, and an unknown flag before the subcommand takes the next token as its value. So `gh pr --edit-last view comment` is `gh pr comment` to gh 2.94, and the fake reads it as `pr view comment`, logged `notFound`. No scenario asserts on `notFound`, so the "never posts" check misses it (medium). Also: `pr revert`, `label create`, `repo edit`, `release create`, `workflow run` and others are logged `unhandled`, not `refused`. They fail closed through the no-unhandled assertion (low).
- **`next-report-number.sh`**: `boundary: internal` (unchanged)
- **TODOs / dependency risk**: ✅ none / scripts only

### Probe Results

**Candidates executed:** 118 (88 write forms, 30 reads) — **reproduced:** 11

- `gh pr --edit-last view comment --body x` — expected **refused**, got **notFound**
- `gh pr -s view merge` — expected **refused**, got **notFound**
- 9 more (`pr revert`, `pr --squash 901 merge`, flag-before-subcommand forms, `label create`, `repo edit`, `release create`, `workflow run`, `project item-add`) — expected **refused**, got **unhandled**

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — internal eval tooling; no personal, payment or health data; no UI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — `CHANGELOG.md:9`; `evals/shared/README.md:145–150` and the `fake-gh.mjs` header both state the current `api` allow-list, checked against the code.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** SUCCESS @ `22ee1609ac91` (5 checks: branch rule, link-check, shellcheck, test, validate)

**Outcome:**

- [ ] Security: the fake `gh` resolves `pr`/`issue` subcommands by position, not as cobra does, so `gh pr --edit-last view comment` (a write) is logged `notFound`. Apply the same fail-closed rule `api` now uses. Serve a `pr`/`issue` read only when the subcommand follows the group directly and no positional names a write subcommand. Refuse every command whose kind is not a served read.
- [ ] AC1: decide the zsh half. Either install zsh in CI (`test.yml`), or record that zsh is verified locally, as task.176 was accepted.

**Fix-and-recheck (Step 8a):** not taken. Two sections are short, the security finding is medium, and
the CI file is outside the Files Summary.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-05
**CI reading 1:** SUCCESS @ `22ee1609` (the decision reading; no acceptance commit, so no reading 2)

**Blocking Issues Summary:**

1. Security: `pr`/`issue` subcommand resolution in the fake `gh` (medium, reproduced)
2. AC1: the zsh arm has no CI lane

**Estimated Effort to Close Gaps:** Small. The `pr`/`issue` rule mirrors the `api` allow-list (about 1 hour plus one QA cycle). The AC1 decision is a one-line CI change or a recorded deviation.

**Next Steps:**

- The security fix is a code change, so it re-enters QA at 5a before `/finalise` re-runs
