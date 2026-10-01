# Definition of Done Verification

**Story/Task:** ci-docs-only-tree-equivalence
**Verification Started:** 2026-10-01 16:15

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.172.qa.7.ci-docs-only-tree-equivalence.md` (7 cycles)
**Gate File Found:** `task.172.gate.7.ci-docs-only-tree-equivalence.yml`

**Gate Status:** ✅ PASS (reached through the Cosmetic-residue exit, route 2b)
**Quality Score:** 95/100
**Final PR review (Step 5c):** ⚠️ CONCERNS — `task.172.pr-review.1.ci-docs-only-tree-equivalence.md`: no high finding; three MEDIUM and six LOW, recorded and not blocking at 5c.

**Immediate Actions from QA:** none. **Future Actions from QA:** the gate's `recommendations.future` (CR7-1 carried LOW, the nested-`ci` residual, a second comment-stripping rule, the CANCELLED ancestor).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (10 PASS, 1 FAIL)
**PR Status:** OPEN (PR #543)
**PR Review Decision:** none (`reviewDecision` is empty: no human review; the pipeline's 5c review is advisory)

### Acceptance Criteria

#### Functional-1: a PENDING head, two markdown commits over a green ancestor, yields `SUCCESS (tree-equivalent to <sha12>)` at all four sites
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:206`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:481` (walk `:193`; 6c poll end to end `:2087`; the three prose arms by text-wiring `:1947` and the executed unbound-input blocks `:2289`, not end to end)

#### Functional-2: a FAILURE head is never tree-equivalent
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:170`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:128` (CLI `:502`)

#### Functional-3: a code path anywhere in the delta returns `code-changed`, and the site waits as before
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:201`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:517` (rename out of code `:538`; final-only `:2371`)

#### Functional-4: a Bitbucket 403 returns `unverifiable`
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:735`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:1754`

#### Functional-5: `ci.docsOnly.enabled: false` restores today's behaviour
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:164`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:637`
- Note: "byte for byte" is the decision path only; the 6c result line gains a trailing `TREE_EQ=` field, and no test runs the 6c poll with `enabled: false` (covered by reasoning: the engine's exit code and the `disabled` latch).

#### Performance-1: a docs-only reading resolves in under 60 s on a fake-`gh` fixture
**Status:** ✅ PASS
- Code evidence: `skills/finalise/SKILL.md:1479`; Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:2087` (1.9 s, sleep stubbed). No test asserts a 60 s bound; met by structure plus measured fixture times.

#### Performance-2: at most `1 + docs-only-commits-on-top` ancestor reads
**Status:** ✅ PASS
- Code evidence: `shared/resources/ci-tree-equivalence.js:183`; Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:193` (`:611` the 20-ancestor bound)

#### CodeQuality-1: every new test is mutation-proved red on revert
**Status:** ❌ FAIL
- Code evidence: `docs/tasks/task.172.ci-docs-only-tree-equivalence/task.172.qa.7.ci-docs-only-tree-equivalence.md:100`
- Test evidence: NOT_APPLICABLE: process criterion, evidenced by the QA reports' `mutation-proven:` lines
- Note: proofs are recorded per fix, not per test (QA 7 `:100-104`, QA 6 `:108-110`, QA 5 `:103-106`; 14 proofs for the first 51 tests; QA cycles 2 to 4 each say "No mutation proofs this cycle"). The suite has 93 tests and no ledger maps every test to a proof; the two `readConfig` tests (`:412`, `:433`), the `configuration.md` test (`:2242`), the non-vacuity test (`:1933`), most Bitbucket tests and the 6c reader test (`:2161`) are not shown to be proved. Either record a per-test proof or narrow the criterion to "every fix-driven test".

#### CodeQuality-2: `npm run ci` green; `validate` passes for the three skills
**Status:** ✅ PASS
- Code evidence: `package.json:24`; evidence: gate 7 and `qa.1:163-175`. The local composite was never recorded literally green, only `ci:fast` (4,906 of 4,909; the non-passes are two load-sensitive file-time budgets and one skip, both budget files also exceed it on pristine develop); validate re-run by the agent for all three skills. CI green on the final commit is read by this skill, below.

#### CodeQuality-3: `npm run bundle:check` clean, no UNREACHED copy
**Status:** ✅ PASS
- Code evidence: `package.json:62`; evidence: `qa.7:37` and a re-run by the agent (129 skills, 0 problems).

#### Migration-1: CHANGELOG `[Unreleased]` names the behaviour change and the opt-out
**Status:** ✅ PASS — `CHANGELOG.md:9` (guard: `evals/shared/tests/changelog-entry-drift.test.mjs`, a post-merge backstop)

#### Migration-2: `configuration.md` documents the keys, defaults and the `**/*.md` spelling note
**Status:** ✅ PASS — `docs/reference/configuration.md:259` (five keys, not three; test `:2242`)

### Documentation

- **CHANGELOG.md entry for task 172**: ✅ PASS — `CHANGELOG.md:9`
- **configuration.md schema, key rows, rule section**: ✅ PASS — `docs/reference/configuration.md:259`
- **Skill files updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:880`
- **This repository's override**: ✅ PASS — `skills-config.yaml:45`

**Agent summary:** 10 criteria PASS, 1 FAIL (CodeQuality-1: mutation proofs are recorded per fix, not per test). All 93 engine tests pass; every cited test runs in the per-PR `npm test` job.

---

## Step 3: Security Review

**Story Type:** task (domain: CI-decision engine; credentialed hosted-API reads, a configured shell command, a path predicate)
**Overall Security Status:** ❌ FAIL

### No hardcoded secrets introduced — ✅ PASS (`shared/resources/bb-auth.js:23`)
### git and gh invoked without a shell — ✅ PASS (`shared/resources/ci-tree-equivalence.js:66`)
### Authorization header goes only to the Bitbucket API host — ✅ PASS (`shared/resources/ci-tree-equivalence.js:741`)
### No sensitive data in logs — ✅ PASS (`shared/resources/ci-tree-equivalence.js:931`)
### checkCommand: config source, stdin, timeout — ✅ PASS (`shared/resources/ci-tree-equivalence.js:553`): read from the commit judged, stdin ignored, timeout 1500 s (570 s here), runs only after a tree-equivalent finding; inherits the full environment.

### checkCommand: child processes bounded when the timeout fires — ❌ FAIL (medium, reproduced)
- Evidence: `shared/resources/ci-tree-equivalence.js:890`
- The timeout kills only the `sh -c` pid, not the process group. Reproduced with the exact call shape (`sleep 24` standing in for `npm run ci:fast && npm run eval:all`): `spawnSync` returned ETIMEDOUT after about 1 s and the `sleep` survived; a caller capturing the engine with `$(node … 2>&1)` blocked 23 s because the orphan holds stderr. Fails closed (check-failed, exit 1), so no wrong green; the cost is a leaked suite running in the working tree and a foreground reading that can outlive the tool timeout. Same finding as PR review CR-1.

### checkCommand runs against a possibly dirty working tree — ❌ FAIL (low, by inspection)
- Evidence: `shared/resources/ci-tree-equivalence.js:855`
- `rev-parse HEAD` is compared with `--head`, but `git status` is never checked, so a passing check over uncommitted edits can green a committed head. Same finding as PR review CR-4.

### Glob matcher against pathological patterns — ❌ FAIL (medium, measured)
- Evidence: `shared/resources/glob-match.js:54`
- Measured by the agent and re-measured here: pattern `*a` repeated N times against `a` x 40 followed by `c` takes 131 ms at N=6, 3.4 s at N=8 and 15.3 s at N=9 (the agent also measured `**/` repeated against a non-matching path, 19.6 s at N=10). The run-collapse handles only consecutive `*`. Patterns come from the head commit's `skills-config.yaml`, so a head author controls them; there is no engine-wide timeout, so it hangs the calling step. A hang, not a wrong `true`.

### Docs classifier: a changed path accepted as docs (isDocsPath) — ❌ FAIL (low, reproduced)
- Evidence: `shared/resources/ci-tree-equivalence.js:126`
- `isDocsPath("docs/../src/a.js", ["docs/**"])` returns `true` (re-run here). Git can emit that name from a hand-built tree, but git and standard hosts refuse to check it out, so no code runs from it. Every other case held (code path, `.github/`, root and nested `skills-config.yaml`, gitlink entries, backslash, leading/trailing space, `/` and `./` forms, prefix-not-boundary, bare `docs`, `.mdx`, empty, non-string, newline smuggling). One-line fix: reject any path with a `.`, `..` or empty segment.

### Probe-engine sink fit — ✅ PASS (decision recorded)
- The `filename` and `path` corpus sinks returned `unverifiable` (rejects-every-input; executed 14 and 11): no sink models a docs classifier, a correct predicate refuses their legitimate cases. Not `internal` (the input is a changed-file name a contributor chooses) and not `false` (the signals fire), so the contract was probed with `--cases-file` (agent-authored cases, not corpus cases).

### General Security

- **security TODOs/FIXMEs**: ✅ PASS (none in the diff)
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is not in the diff

### Probe Results

**Candidates executed:** 37 (run record `task.172.dod.security.run.json`) — **reproduced:** 1
- `docs/../src/a.js` — expected **rejected (not documentation)**, got **accepted** (low)

**Agent summary:** boundary: true. `isDocsPath` 23 executed, 1 reproduced; `matchesAnyGlob` 14 executed, engages. Failures: the `checkCommand` timeout leaves children running (medium), exponential glob matching (medium), a dirty working tree (low), the `..` segment (low).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE (an internal CI-decision engine plus skill prose and configuration documentation: no PII, payments, UI or health data).

**Agent summary:** no GDPR, PCI-DSS, WCAG or HIPAA area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:9` (cites `(task 172)`; behaviour change and opt-out named)
- **API/type-specific docs updated**: ✅ PASS — `docs/reference/configuration.md:259`; the engine and the document list the same five keys; no SKILL.md `description` changed, so no catalog regeneration is due. Drift to fix: the work item still says "three keys" (lines 52, 270, 368).
- **README / architecture docs updated**: ⚠️ NOT_APPLICABLE — README only links to `configuration.md`; no new CLI command or feature name.

**Agent summary:** docs verification passes.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (95/100, gate 7); PR review (5c): ⚠️ CONCERNS, not blocking there
- Acceptance Criteria: ⚠️ 10 of 11 (CodeQuality-1 FAIL)
- PR Review & Tests: ✅ 93 engine tests pass in the per-PR lane; no human review decision (PR open)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL (two medium and two low findings, all reproduced or measured)
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: PENDING @ `f92e5c94` (the hosted `test` job was still running; `validate`, `shellcheck` and `link-check` SUCCESS). Not resolved further: the decision is GAPS on the grounds above, so no tree-equivalence reading was taken.

**Fix-and-recheck (Step 8a) does not apply:** two DoD sections are FAIL (acceptance criteria and security), and two of the security findings are medium.

**Outcome:**

- [ ] AC CodeQuality-1: "every new test is mutation-proved red on revert" is evidenced per fix, not per test: record a per-test proof, or narrow the criterion (a work-item edit that needs a decision)
- [ ] Security (medium): the `checkCommand` timeout kills only `sh -c`; spawn it in its own process group and kill the group (`shared/resources/ci-tree-equivalence.js:890`; PR review CR-1)
- [ ] Security (medium): the glob matcher is exponential on repeated `*a` / `**/` patterns taken from the head commit's config; collapse repeats and cap pattern complexity, or bound the engine with a timeout (`shared/resources/glob-match.js:54`)
- [ ] Security (low): `checkCommand` runs against a possibly dirty working tree; treat a dirty tree as `unverifiable` or run it in a clean worktree (`shared/resources/ci-tree-equivalence.js:855`; PR review CR-4)
- [ ] Security (low): `isDocsPath` accepts `docs/../src/a.js`; reject any path with a `.`, `..` or empty segment (`shared/resources/ci-tree-equivalence.js:126`)

**Also recorded, not blocking:** PR review CR-2 (`CI_CHECKS_1` counted before the docs-only arm, so reading 1 satisfied by tree-equivalence hands the 6c poll the unfinished head's check count as its floor), CR-3 (the Step 8a retake record has no tree-equivalent clause), CR-5 (the poll discards the engine's stderr and does not latch exit 2), CR-6 (six dead entries in `tests/unbound-default-reads.test.js`); conformance PC-1 (25 bug reports still `Ready for QA`), PC-2 (no cycle-5 qa-fix Change Log row), PC-3 (the Files Summary omits `bb-auth.js`, `pr-inline-comment.js`, the `_dedent.mjs` helper and three edited tests; the work item says three keys, the code has five).

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-01 16:25
**CI reading 1:** PENDING @ `f92e5c94` (hosted `test` job in progress; decision is GAPS on other grounds)

**Blocking Issues Summary:**

1. AC CodeQuality-1: per-test mutation proof not evidenced
2. Security: `checkCommand` timeout leaves child processes running (medium)
3. Security: exponential glob matching on pathological patterns (medium)
4. Security: `checkCommand` can run on a dirty working tree (low)
5. Security: `isDocsPath` accepts a `..` segment (low)

**Estimated Effort to Close Gaps:** Medium (3-5 hours): four small engine edits with tests that go red on revert, then a per-test proof ledger or a criterion edit, then one more QA gate.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted
- ✅ Security probe run record `task.172.dod.security.run.json`

**Next Steps:**

- Address the blocking issues above, then re-run `/finalise`
