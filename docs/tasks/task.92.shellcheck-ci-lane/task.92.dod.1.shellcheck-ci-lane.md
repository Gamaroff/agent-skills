# Definition of Done Verification

**Task:** task.92 — Add a shellcheck CI lane for the repo's shell scripts
**PR:** [#322](https://github.com/Gamaroff/agent-skills/pull/322) · head `50a2e60c`
**Verification Started:** 2026-09-05
**Status:** COMPLETED — ACCEPTED

---

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.92.qa.1`, `task.92.qa.2`, `task.92.qa.3`
**Gate Files Found:** `task.92.gate.1`, `task.92.gate.2`, `task.92.gate.3`

**Final Gate:** `task.92.gate.3.shellcheck-ci-lane.yml` — ✅ **PASS**, **96/100**, `top_issues: []`

**Progression across three cycles** — recorded because a clean final gate reached through two
CONCERNS cycles is a different artefact from one that passed first time:

| Cycle | Gate | Score | Findings |
| --- | --- | --- | --- |
| 1 | CONCERNS | 80 | TASK-92-001 (vacuous guard), TASK-92-002 (bare disables), 1 LOW |
| 2 | CONCERNS | 85 | TASK-92-003 (11/15 → 9/17 miscount), TASK-92-004 (five → six workflows) |
| 3 | **PASS** | **96** | none — all four verified fixed |

**NFR validation (gate 3):** Security PASS · Performance PASS · Reliability PASS · Maintainability PASS
**Immediate recommendations:** none. **Future:** 2, both non-blocking.
**Step 5c `/review-pr`:** CONCERNS (advisory) — one medium finding, found and fixed during the review.

**No prior DoD block in the document body** (`grep -cE '^## Definition of Done.*(PASSED|✅)'` → 0), so
nothing is being inherited from an earlier run.

---

## Verification method — read this before the sections below

**The four parallel DoD subagents were not used.** Three Explore subagents had already been dispatched
earlier in this run — the QA cycle-2 refute pass and both Step 5c review lenses — and **all three hung
without producing usable output and had to be terminated**, one after roughly forty minutes. Dispatching
four more into the same failure mode would have cost hours and produced nothing.

Each section below was therefore verified **in-line, with commands actually executed and citations to
real files**. That is not the same as an agent returning `NEEDS_MANUAL_REVIEW`, which means an axis went
unchecked — every axis here was checked. But it is also not the independent verification the skill
designs for, and the distinction is recorded rather than smoothed over.

---

## Step 2: Core Acceptance Criteria & PR Review ✅

**Overall AC Status:** ✅ PASS — 11/11
**PR Status:** OPEN, mergeable · **CI:** `CI_ROLLUP=SUCCESS`, re-sampled at acceptance time
**Head parity:** local `50a2e60cfc75` == PR head `50a2e60cfc75` — the tested commit is the PR's

### CI check rollup (hard DoD gate)

| Job | Conclusion |
| --- | --- |
| `shellcheck` | ✅ SUCCESS |
| `test` | ✅ SUCCESS |
| `validate` | ✅ SUCCESS |
| `link-check` | ✅ SUCCESS |
| branch policy | ✅ SUCCESS |

`test` is the one that matters for criterion 8 — it runs `format:check`, `npm test` and
`npm run eval:all`, i.e. the whole `npm run ci` composite, which was never run locally (only
`ci:fast` was).

### Acceptance criteria

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Lane runs on every tracked source script, no path filter | `.github/workflows/shellcheck.yml:20-23` — no `paths:` key; YAML parsed | ✅ |
| 2 | Lints 56 files, not 247 | `shellcheck.yml:73` + assertion `:79-83`; measured 56 | ✅ |
| 3 | Green on the current tree | `shellcheck` job SUCCESS on four successive heads; container run exit 0 | ✅ |
| 4 | Observed failing on a deliberate finding | 3 mutation proofs, implementation report § Step 3 | ✅ |
| 5 | Version pinned or printed | Both — `:43` pins `v0.11.0`, `:48` prints it | ✅ |
| 6 | Every disable carries a reason; no bare suppressions | 0 bare directives across all 56 sources, measured | ✅ |
| 7 | SC2010 fixed or justified | Fixed — glob loop, `tracker-access.test.sh` | ✅ |
| 8 | `npm run ci` still green; local gate duration unchanged | CI `test` SUCCESS; no npm script added to `ci`/`ci:fast` | ✅ |
| 9 | CHANGELOG states gate level + consequence | `CHANGELOG.md` `### Changed`, 21 lines added | ✅ |
| 10 | Local invocation documented, container form included | `CONTRIBUTING.md` (+20), `coding-standards.md` (+10) | ✅ |
| 11 | Sources-only rule documented where the glob lives | `shellcheck.yml:54-72` | ✅ |

---

## Step 3: Security Review ✅

**Task type:** infrastructure / CI · **Overall:** ✅ PASS

| Check | Status | Evidence |
| --- | --- | --- |
| No credentials or secrets introduced | ✅ | Diff grep for `password\|secret\|token\|api_key\|BEGIN PRIVATE` returns only the word "token" inside prose about `BITBUCKET_API_TOKEN` in an unrelated annotated file |
| No new workflow permissions | ✅ | `shellcheck.yml` declares no `permissions:` block and needs none — it reads the repo and runs a linter |
| Network fetch is pinned and over HTTPS | ✅ | `shellcheck.yml:46` — official koalaman release, `SHELLCHECK_VERSION: v0.11.0`, URL verified HTTP 200 |
| No behaviour change to security-relevant scripts | ✅ | `resolve-platform.sh`, `bitbucket-auth.sh`, `read-config.sh`, `tracker-access.test.sh` received comments and quoting only; `tracker-access.test.sh`'s logic change is a glob loop replacing `ls \| grep`, proven byte-identical in output |
| Access-gate scripts still behave identically | ✅ | All 7 shell suites pass, including `tracker-access.test.sh` (the access-mode suite) and `bitbucket-auth.test.sh` |

### Probe Results

**Boundary:** ✅ **true.** The deliverable *is* a boundary — a predicate over a file set that decides
pass/fail. Probe mode fired.

**Candidates executed: 3 — reproduced: 0.**

| Probe | Expected | Actual |
| --- | --- | --- |
| Deliberate SC2034 in `scripts/setup-consumer.sh` — chosen because that file sits **outside** `validate.yml`'s path filter, so the probe tests the boundary at the point the original design would have missed | reject (exit 1) | reject (exit 1), naming the file |
| Sources-only `grep` removed, widening the set to 247 files | reject (exit 1) | reject (exit 1) — "247 files, expected ~56" |
| Empty file list | reject (exit 1) | reject (exit 1) |

✅ **The boundary held** — every candidate returned its expected verdict, and each mutation was
reverted afterwards with the clean tree re-confirmed at exit 0.

An additional boundary probe was run against the shell layer at Step 5c: the exact job body executed
under `set -euo pipefail` in three states (normal, `grep` filtering everything, `git ls-files` matching
nothing) to establish there is **no path on which the job passes without linting anything**. There is not.

---

## Step 4: Compliance Review ⚠️ NOT_APPLICABLE

**Applicable areas:** none.

| Area | Applicable | Reason |
| --- | --- | --- |
| GDPR / PII | ❌ | 0 files in the diff touch user data. The change is a CI workflow, shell comments and documentation |
| PCI-DSS | ❌ | No payment surface anywhere in this repository |
| WCAG / accessibility | ❌ | No UI surface — no rendered output of any kind |
| HIPAA | ❌ | No health data |

---

## Step 4b: Docs & Changelog ✅

**Overall:** ✅ PASS

| Item | Status | Evidence |
| --- | --- | --- |
| CHANGELOG entry | ✅ | `CHANGELOG.md` `## [Unreleased]` → `### Changed`, +21 lines. Names the gate level, the pin, the 9/17 split, and the migration consequence |
| Contributor-facing local invocation | ✅ | `CONTRIBUTING.md` § "Before you open a PR", +20 lines — binary form and container form |
| Agent-facing copy of the same list | ✅ | `docs/architecture/concepts/coding-standards.md` § "Validation before commit", +10 lines. Updated **in the same change**, which is the point — they are two renderings of one list and drift otherwise |
| Architecture doc reflects the new CI surface | ✅ | `docs/architecture/concepts/tech-stack.md` § "Infrastructure and CI" rewritten. It had been stale *before* this task (describing one `validate.yml` running `npm test` on `main`) and this task both fixed it and — caught in QA cycle 2 — got the workflow count wrong on the first attempt. Now: six workflows, all named, triggers and path-filtering verified against the files |
| Task document consistent with what shipped | ✅ | §7 Files Summary rewritten to the 9/17 split and the 137 generated copies; Change Log carries 8 rows covering every pipeline step |
| Sources-only rule at the glob | ✅ | `shellcheck.yml:54-72` |

---

## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Column | Result |
| --- | --- |
| All acceptance criteria met | ✅ 11/11 |
| Tests & PR | ✅ PR open, 7 shell suites + full hermetic suite pass |
| **CI green** | ✅ `CI_ROLLUP=SUCCESS` on the exact head being accepted |
| Documentation updated | ✅ |
| Security passed | ✅ (boundary probed, 3 candidates, 0 reproduced) |
| Compliance passed | ⚠️ NOT_APPLICABLE — counts as pass |
| QA gate | ✅ PASS 96/100, `top_issues: []` |

---

## Two partials recorded rather than papered over

Both are true of this run, neither blocks acceptance, and both are the kind of thing that is worth
more in the record than a clean-looking summary.

### P1 — Every finding was self-inflicted, and a green suite was not evidence

Five findings across three QA cycles and one PR review. **Every one was in code or documentation this
task itself introduced.** The tree it inherited was clean at `error`, and all 26 pre-existing
warning-tier findings were resolved without incident.

The sharpest was **TASK-92-001**: an empty-list guard that reported a failure and then *continued*, into
the exact `sed`-reads-STDIN hang its own comment claimed to prevent. `return` at the top level of an
executed script is illegal, and the `2>/dev/null || true` written after it swallowed both the error and
the status. It is the `task.90` shape — a guard reporting success for something that did not happen —
introduced **in the task whose entire purpose is catching that shape**, while fixing a different finding.

It was unreachable in practice (the directory always contains sibling `.sh` files), so **the suite
stayed green throughout and would have stayed green forever**. It was found by mutation-proving the
guard rather than by running the tests. That is the lesson worth carrying: on this task, a green suite
was never evidence — every finding came from executing something against a hostile input.

The other four: three pre-existing bare suppressions left inside the change that forbids them; a
fix/annotation split miscounted 11/15 when it is 9/17 (counting *assignments quoted* rather than
*findings resolved*); a rewritten stale paragraph that shipped a fresh inaccuracy of the same kind; and
a sources-only comment whose "725 vs 81" figure was made stale by this very change (515 vs 55 now).

### P2 — Independent review never actually happened

**Three Explore subagents were dispatched across this run and all three hung**, produced no usable
output, ignored wrap-up requests, and were terminated:

| Dispatched for | Outcome |
| --- | --- |
| QA cycle 2 refute pass | Hung ~40 min, killed, zero findings returned |
| Step 5c code lens | Hung, killed, one fragment |
| Step 5c conformance lens | Hung, killed, one fragment |

The cycle-2 refute pass and the whole of Step 5c were therefore conducted **in-line by the same agent
that wrote the change** — precisely the arrangement both steps exist to prevent. Four further DoD
subagents were not dispatched for the same reason, and this file's sections were verified in-line
instead.

Self-review still found four of the five findings, so it was not worthless. But **the mechanism meant
to catch what self-review misses has not been exercised on this branch at all**, and no claim to the
contrary should be read into the PASS gate or this acceptance.

**Outstanding mitigation: a human read of the diff.** The reviewable surface is 28 files — the other
137 are generated and confined to commit `d383fa90`.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion:** 2026-09-05

**Artifacts:**

- ✅ Task document updated with DoD section, `status: accepted`, `pr_number`, `completed_date`
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted
- ✅ GitHub issue #321 commented and closed
- ✅ Project board `done` stage signalled

**Next Steps:** merge PR #322 into `develop`; a human read of the 28-file reviewable surface is the
outstanding mitigation for P2.
