# Definition of Done Verification

**Story/Task:** ci-docs-only-tree-equivalence
**Verification Started:** 2026-10-01 17:41
**Run:** 2 (run 1, `task.172.dod.1.ci-docs-only-tree-equivalence.md`, stopped on five gaps)

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.172.qa.8.ci-docs-only-tree-equivalence.md` (8 cycles)
**Gate File Found:** `task.172.gate.8.ci-docs-only-tree-equivalence.yml`

**Gate Status:** ✅ PASS (through the Cosmetic-residue exit, route 2b)
**Quality Score:** 95/100
**Final PR review (Step 5c, run twice):** ⚠️ CONCERNS — `task.172.pr-review.1.*.md` and `task.172.pr-review.2.*.md`: no high finding in either; the MEDIUM and LOW findings are recorded in the work item's Deferred Work and in gate 8's `recommendations.future`.

**Immediate Actions from QA:** none. **Future Actions from QA:** gate 8's `recommendations.future` (the interrupt-path residual of the detached check, two untested branches of the dirty-tree rule, the carried LOWs from gate 7, the PR-review items).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (12 of 12)
**PR Status:** OPEN (PR #543)
**PR Review Decision:** none (`reviewDecision` is empty: no human review; the pipeline's 5c review is advisory)

### Acceptance Criteria

#### F1: a PENDING head, two docs commits over a green ancestor, yields `SUCCESS (tree-equivalent to <sha12>)` at all four sites
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:212`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:481` (6c poll end to end `:2087`, reader `:2161`, the three prose arms by text-wiring `:1947` and the executed blocks `:2289`)

#### F2: a FAILURE head is never tree-equivalent
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:175`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:128` (CLI `:502`)

#### F3: a code path anywhere in the delta returns `code-changed`
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:196`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:176` (CLI `:517`, rename out of code `:538`)

#### F4: a Bitbucket 403 returns `unverifiable`
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:740`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:1754`

#### F5: `ci.docsOnly.enabled: false` restores today's behaviour
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:169`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:637`. "Byte for byte" is evidenced by the exit-1 fall-through structure and these tests, not by a literal diff of a whole site's output.

#### P1: a docs-only reading resolves in under 60 s on a fake-`gh` fixture
**Status:** ✅ PASS — test `shared/resources/tests/ci-tree-equivalence.test.mjs:2087` (30 s, the existing `WAITED > 0` rule); no test asserts a 60 s wall clock directly.

#### P2: at most `1 + docs-only-commits-on-top` ancestor reads
**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:187`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:193`

#### CQ1: every test written for a QA, PR-review or DoD-gate defect is mutation-proved red on revert (as narrowed by the operator on 2026-10-01)
**Status:** ✅ PASS WITH NOTE — recorded `mutation-proven:` lines: QA 8 `:100-103` (SEC-1 to SEC-4; SEC-2's from the fix cycle, red after 304 s), QA 7 `:100-104`, QA 6 `:108-110`, QA 5 `:103-106`. Notes, stated so a reader can overrule: (1) QA reports 1 to 4 carry no `mutation-proven:` line (cycles 1 to 3 are evidenced in the bug reports and the implementation report as the fixer's own records, not independent QA runs; QA 2 to 4 each say "No mutation proofs this cycle"); (2) two branches of the dirty-tree rule (the rename/copy source-path parse, an unreadable `git status`) have no test that goes red (`no-red-untested`, QA 8 `:104-105`): no test was written for them, which is the gap, carried as a LOW in gate 8; (3) the test at `:1662` (review CR-10, the jq guard in the 6c poll) has no proof line in any report read.

#### CQ2: `npm run ci` green; `validate` passes for the three skills
**Status:** ✅ PASS — `package.json:24`; fast gate on the fix commit 4,910 of 4,911 (one skip); validate re-run by the agent for all three. The local composite was not recorded literally green end to end; hosted CI is read below.

#### CQ3: `npm run bundle:check` clean, no UNREACHED copy
**Status:** ✅ PASS — re-run by the agent: 129 skills, 0 problems.

#### M1: CHANGELOG `[Unreleased]` names the behaviour change and the opt-out
**Status:** ✅ PASS — `CHANGELOG.md:8` (guard `evals/shared/tests/changelog-entry-drift.test.mjs`, a post-merge backstop)

#### M2: `configuration.md` documents all five keys with defaults and the `**/*.md` spelling note
**Status:** ✅ PASS — `docs/reference/configuration.md:259`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:2242`

### Documentation

- **CHANGELOG.md entry for task 172**: ✅ PASS — `CHANGELOG.md:8`
- **configuration.md schema, key rows, rule section**: ✅ PASS — `docs/reference/configuration.md:259`
- **Skill files updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:894`
- **This repository's override**: ✅ PASS — `skills-config.yaml:46`

**Agent summary:** all 12 criteria pass on the diff and the per-PR lane; 97 engine tests pass.

---

## Step 3: Security Review

**Story Type:** task (domain: CI-decision engine; credentialed hosted-API reads, a configured shell command, a path predicate)
**Overall Security Status:** ✅ PASS

### The four run-1 findings, re-verified by execution
- **checkCommand timeout leaves no child** — ✅ PASS (`shared/resources/ci-tree-equivalence.js:962`): a check running `sleep 300 & sleep 301 & wait` with a 2 s timeout gave check-failed after 2,120 ms and no leftover process; the group is killed after every return.
- **glob matcher no longer exponential** — ✅ PASS (`shared/resources/glob-match.js:77`): `*a` x 9 answered in 0 ms (run 1: 15.3 s); `**/` x 300 in 19 ms; 397,179 differential cases against an independent reference RegExp, 0 mismatches.
- **checkCommand refuses uncommitted code** — ✅ PASS (`shared/resources/ci-tree-equivalence.js:832`): an untracked or modified code file, a staged rename out of `src/`, and a path with an embedded newline each gave `unverifiable`; untracked documentation let the check run; `git status` failing is `unverifiable`.
- **dot, dot-dot and empty path segments are never docs** — ✅ PASS (`shared/resources/ci-tree-equivalence.js:131`): `isDocsPath("docs/../src/a.js")` is false; the probe engine control ran 36 (28 hostile, 8 legitimate), 0 reproduced, 0 overblocked.

### Probe-engine sink fit — ✅ PASS (decision re-stated)
No corpus sink models a docs classifier (their legitimate cases are paths a correct predicate refuses), so a sink run reads `unverifiable`; not `internal` (the input is a name a contributor chooses), not `false` (the signals fire). Probed with `--cases-file` (agent-authored cases, not corpus cases).

### New weaknesses weighed
- **The detached check is not stopped when the engine is interrupted or killed from outside** (gate 8 CR8-1; the PR review's CR-3) — ✅ PASS, weighed LOW, reproduced: SIGKILL or SIGTERM to the engine left `sh -c` and its `sleep` running and the orphan finished its marker. No wrong-acceptance path (a killed engine prints no tree-equivalent and the callers accept only on exit 0 plus a non-empty `greenSha`; the check's stdout goes to the engine's stderr so a `$(…)` capture is not held open). The owner's own finite check is what runs on; the 570 s setting is meant to fire before the host's 600 s tool limit, with a margin the agent did not measure. Documented in `configuration.md:354`. Suggested hygiene, not required: an async spawn with signal handlers.
- **Uncommitted documentation is allowed** (stated residual) — ✅ PASS: confirmed as documented. Two further classes `git status` does not list, gitignored non-docs files and tracked files marked skip-worktree or assume-unchanged, are local-environment states not reachable through a PR; recommended for the documented residual (low, documentation only).
- **Glob size caps** (1,024-character glob, 4,096-character path never match) — ✅ PASS: false is the safe direction for both consumers.
- **Credentials and subprocess boundaries** — ✅ PASS: the Bitbucket header goes only to the constant API host, a `next` link off `https://api.bitbucket.org/2.0/` is refused, every `git`/`gh` call is an argv array with no shell, `--head` is resolved by `rev-parse --verify`, `skills-config.yaml` changes are never docs.
- **No hardcoded secrets / no new unsafe patterns** — ✅ PASS (the one shell invocation is `sh -c <checkCommand>` from committed configuration, by design).

### General Security
- **security TODOs/FIXMEs**: ✅ PASS (none in the diff)
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is not in the diff

### Probe Results

**Candidates executed:** 74 (run record `task.172.dod2.security.run.json`, `totals.executed` 74) — **reproduced:** 0
✅ **The boundary held** — every candidate returned its expected verdict. (Run 1's record, `task.172.dod.security.run.json`, had 37 executed and 1 reproduced; it is kept as history.)

**Agent summary:** all four run-1 fixes hold when executed; no hostile accepted or legitimate refused on `isDocsPath` (36), `matchesAnyGlob` (21) and `globMatch` (17).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE (internal CI-decision engine plus skill prose and configuration documentation: no PII, payments, UI or health data).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:9`; the six behaviours it claims match the engine one by one.
- **API/type-specific docs updated**: ✅ PASS — `docs/reference/configuration.md:259-263`; the engine and the document list the same five keys; no SKILL.md `description` changed, so no catalog regeneration is due; the work item says five keys everywhere (the only "three keys" text is quoted inside the run-1 block, labelled historical).
- **README / architecture docs updated**: ⚠️ NOT_APPLICABLE — README only links to `configuration.md`.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (95/100, gate 8); PR review (5c, twice): ⚠️ CONCERNS, advisory
- Acceptance Criteria: ✅ 12 of 12 (CQ1 passes with the stated notes)
- PR Review & Tests: ✅ 97 engine tests pass in the per-PR lane; no human review decision (PR open)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (probes: 74 executed, 0 reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: ✅ SUCCESS @ `55444bd4` over 5 checks (the head's own CI finished green: `test`, `validate`, `shellcheck`, `link-check` and the branch-name check), so the docs-only rule was not needed for this reading

**Outcome:** the task meets the Definition of Done. Findings accepted over, recorded and not hidden: the PR review's CR-1, CR-2 and CR-3, gate 8's CR8-1 and its untested-branch cleanup, and the carried LOWs live in the work item's Deferred Work.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-01 17:50
**CI reading 1:** SUCCESS @ `55444bd4` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- ✅ Security probe run record `task.172.dod2.security.run.json`

**Next Steps:**

- The task is ready for Sprint Review; no further action required
