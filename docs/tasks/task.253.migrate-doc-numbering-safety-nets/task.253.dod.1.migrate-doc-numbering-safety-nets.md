# Definition of Done Verification

**Story/Task:** migrate-doc-numbering-safety-nets (task.253)
**Verification Started:** 2026-11-04
**PR:** #823 (`feature/task.253.migrate-doc-numbering-safety-nets` → `develop`)

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.253.qa.1…`, `task.253.qa.2…`, `task.253.qa.3…`
**Gate File Found:** `task.253.gate.3.migrate-doc-numbering-safety-nets.yml` (newest of three)

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Gate head:** `46c2815d8b2045761f39d972fa3ac4617876f68b`; `top_issues: []`
**Status Reason:** T253-QA-2 and T253-QA-3 are fixed and verified; the scoped diff review found nothing, and five mutations of the cycle 2 fixes each turn a named test red. Remaining items are advisory.

**QA history:** gate 1 CONCERNS (90), gate 2 CONCERNS (90), gate 3 PASS (100). Bugs 1, 2 and 3 are closed.

**Step 5c PR review:** `task.253.pr-review.1.migrate-doc-numbering-safety-nets.md`: CONCERNS, no `coverage` finding. PC-1 (the implementation report lacked the QA history) is fixed in the working tree. PC-2 (unticked checkboxes) is closed by this run.

**Immediate Actions from QA:** none.
**Future Actions from QA (advisory, carried):** unclosed-fence warning, `GIT_TERMINAL_PROMPT=0` on the fetch, CR-2, CR-4, CR-6, CR-7, CR-8.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL → ✅ PASS once #8 is graded from CI reading 1 (Step 5)
**PR Status:** OPEN (PR #823)
**PR Review Decision:** null (no required reviewers); satisfied by `task.253.pr-review.1.migrate-doc-numbering-safety-nets.md`, verdict CONCERNS with no coverage finding
**Re-run scope:** full (no-prior-record) — 11 re-judged, 0 carried

### Acceptance Criteria

#### #1: On the fixture, the multi-line link resolves after `--apply`.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:1171`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2378`
- Note: linkPass edits at `targetLine ?? openLine`. `scanLinks` adds `targetLine` at `doc-links.js:187-189`, tested at `doc-links.test.mjs:987`. Both test files are in the `test:suite` glob that `test.yml` runs on every pull_request.

#### #2: A dangling link left by the tool is printed with file and line.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:2584`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2478`
- Note: `deadLinks` entries carry file and line (`targetLine ?? line`). The text output is pinned by the test at 2788.

#### #3: The stub contains no link.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:1843`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2444`
- Note: `epicRegistryPointer` writes code spans, not links.

#### #4: `--apply` refuses a dirty tree and a branch behind upstream.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:2345`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2655`
- Note: the warnings become blockers under `--apply`. The controls test at 2698 covers no upstream, an upstream deleted on the remote and an unreachable upstream. This run also executed the guard through the probe engine (Step 3).

#### #5: A generated file is not edited.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:1486`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2549`
- Note: a generated file is skipped and listed; `inRewriteScope` also refuses it (test at 2805).

#### #6: A tracked script containing a legacy pattern is listed in the closing line.

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:2774`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2582`
- Note: the closing line reads `N repo files still hard-code legacy names: ...`.

#### #7: The post-apply scans read each tracked file once; the test's read counter is …

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:2569`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:2813`
- Note: `scanTracked` has one `io.readFile` per file, shared by the link, old-path and legacy-name scans; the test asserts `n === 1` per path.

#### #8: Tests, `npm test`, `npm run bundle:check` pass.

**Status:** ⏳ DEFERRED-CI — graded in Step 5 from CI reading 1

- Code evidence: `.github/workflows/test.yml:58`
- Note: `validate.yml:128` runs `bundle:check`. QA cycles 1–3 each recorded `npm run bundle:check # 128 skills, 0 problems`.

#### #9: Each fix's test goes red when the fix is reverted (QA report).

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.253.migrate-doc-numbering-safety-nets/task.253.review.2.mutation-proof.md:11`
- Note: the committed table (lines 11–28) names a revert and the red test for each unit: gaps 1, 2, 4, 5, 6, 7, QA bugs 1–3 and CR-3. QA gate 3 (`qa.3:93`) re-confirmed bug 2. One row (new-scheme exclusion, line 20) records that no test went red because the code was deleted, so no fix is left unheld. Gap 3 has no fix.

#### #10: `CHANGELOG.md` updated.

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:23`
- Test evidence: `shared/resources/tests/changelog-cites.test.mjs:1`
- Note: the `[Unreleased]` entry cites `(task 253)` and covers the changes, the `--apply` behaviour change and the gap 3 non-reproduction.

#### #11: Gaps that did not reproduce are recorded as such in the QA report.

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.253.migrate-doc-numbering-safety-nets/task.253.qa.1.migrate-doc-numbering-safety-nets.md:60`
- Note: `qa.1:60` records "Gap 3 (frontmatter validation) did not reproduce", with the evidence and the dropped fix; repeated at `qa.1:54` and `qa.3:31`.

### Advisory (not a gap)

- **#7**: the read-once test calls `scanTracked` with `applied:false`, so the post-apply link path (`wantsLinks`) is not exercised by the counter. The code is one `readFile` per file, so the criterion holds structurally. A test with `applied:true` and a touched `.md` file would assert that path directly.

### Documentation

- **README or skill files updated where behaviour changed (task type)**: ✅ PASS — `skills/review-prd/references/migrate-doc-numbering.mjs` — bundled copies regenerated in 11 skills; the behaviour change is in `CHANGELOG.md:23-37`.

**Agent summary:** 10 of 11 criteria PASS. #8 is DEFERRED-CI. No FAILs, and the mutation-proof record covers every fix.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:359`
- Note: the diff adds no password, api_key or secret literals.

### No new unsafe patterns (eval/exec/shell)

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:359`
- Note: git is spawned with `spawnSync("git", argsArray)` and no shell; the fetch at line 2655 uses the same form. No `eval`, `child_process.exec` or `shell:true`.

### Network fetch bounded by a timeout

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:2655`
- Note: `git fetch --quiet --prune <remote>` runs with `timeout: 20000`. The remote name comes from `for-each-ref %(upstream:remotename)`, not user input. A failed fetch becomes the `upstream-unverified` warning. Advisory carried from QA: no `GIT_TERMINAL_PROMPT=0`.

### Caller-supplied --root is contained to the repository

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:1949`
- Note: `checkPrdRoot` refuses NUL, `%`, `..` escapes, absolute paths outside the repo, symlink escapes, the repo root, `.git` and `node_modules`. Executed below.

### Caller-supplied --name is contained

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:370`
- Note: `parseNameValue` accepts at most two segments, each a lowercase kebab segment. Executed below.

### Link rewriting stays inside the repository

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:1278`
- Note: `outsideReferences` resolves each token; an absolute or URL path never matches; `linkPass` is limited to the tracked walk.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — the diff adds none.
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is not in the diff; the one import added is built-in `node:child_process`.

### Probe Results

**Candidates executed:** 22 — **reproduced:** 0

✅ **The boundary held** — every candidate returned its expected verdict. Three controls, all `engages`:

| Control | Sink | Executed |
| --- | --- | --- |
| `--root` (`checkPrdRoot` containment) | `path` corpus | 10 |
| `--name` (`parseNameValue` segments) | `path`, 9 inline cases | 9 |
| `--apply` repository-state guard (dirty tree, behind upstream) | `path`, 3 inline cases | 3 |

- Probe run by /finalise from the security agent's plan — 3 control(s), record `task.253.dod.1.migrate-doc-numbering-safety-nets.security.run.json`. Cases: `…security.cases.2.json`, `…security.cases.3.json`.
- **Boundary decision.** QA gate 3 recorded `boundary_signals: ['refuses']` and judged the matched criterion a repository-state guard, so it ran no probe. The security agent disagreed: the tool also has two input-validating refusals (`--root`, `--name`), so the boundary rule fires. Both views are kept here; the probe settles it.
- **Plan provenance.** The agent planned the three controls but named a `--fixture-setup` script that did not exist. This run committed it (`shared/resources/tests/fixtures/security-probe/migrate-doc-numbering-guard-setup.sh`) and corrected two plan details: the `--name` entry embedded `{input}` inside an argv element, which the engine refuses, so it now takes the whole `path=slug` value as the input; and the dirty-tree case uses a `make-dirty.flag` the setup script reads, because a fixture file written before `git add -A` would be committed and leave the tree clean.
- **First run, 3 reproduced, all fixture artefacts.** The corpus's legitimate `--root` names (`reports/2026/q1.csv`, `archive..2026.tar.gz`, `.gitkeep`) were refused with "PRD root … does not exist". Checked by hand: the same names are refused when absent and accepted (exit 0) once the directory exists. The setup script now creates them; the re-run reproduced none. No code changed.
- **Mutation proof.** With the `dirty-tree` / `behind-upstream` blocker conversion disabled (`shared/resources/migrate-doc-numbering.mjs`, temporary, restored byte-identical), the same plan reproduced exactly `apply-dirty-tree-refused` and `apply-behind-upstream-refused` (2 of 22). A clean probe therefore catches the defect it exists for.
- No escapes; no refused entries on the final run.

**Agent summary:** the static checks pass, the boundary was probed (22 candidates, none reproduced) and the guard is mutation-proven.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA: Applicability

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: an internal developer CLI tool. No personal data, payments, UI or health data.

**Agent summary:** no compliance areas apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:23`
- Note: the `[Unreleased]` entry cites `(task 253)` and covers all the changes and the `--apply` behaviour change.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/migrate-doc-numbering.mjs:2613`
- Note: the header comment documents the new dirty-tree, behind-upstream and no-upstream warning codes. The PR touches no `SKILL.md`, so no catalog regeneration is needed. Advisory: `skills/review-prd/SKILL.md` (lines 416 and 608) calls the tool with `--check` / `--apply`, and its prose does not mention the new `--apply` refusal on a dirty or behind checkout.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: no README or `docs/architecture` file mentions `migrate-doc-numbering`; no public API, config variable or CLI command was added.

**Agent summary:** `CHANGELOG.md:23` records task 253 and the script header documents the new output.

---

## Step 5: Acceptance Decision

**Decision:** ACCEPTED

| Column | Reading |
| --- | --- |
| All acceptance criteria met | ✅ 11 of 11 (10 PASS; #8 graded PASS from CI reading 1 below) |
| Tests and PR approved | ✅ No required reviewers (`pr_review_decision: null`); newest PR review `task.253.pr-review.1.migrate-doc-numbering-safety-nets.md` is CONCERNS with no coverage finding |
| Docs updated | ✅ PASS |
| Security passed | ✅ PASS (22 probes, none reproduced; guard mutation-proven) |
| Compliance passed | ⚠️ NOT_APPLICABLE (counts as pass) |
| QA gate | ✅ PASS 100/100 (`task.253.gate.3…`) |

**CI reading 1:** `SUCCESS` @ `afc91b30fb384a60eb32bc82871fd6e4fa62db80` (the pushed branch head; all six checks completed green: PR-into-main branch check, link-check, secret-scan, shellcheck, test, validate). Criterion #8 (tests, `npm test`, `bundle:check`) is graded PASS from it.

**Open items, none blocking:**

- Advisories carried from gate 3 (`recommendations.future`), unchanged by this run.
- Docs advisory: `skills/review-prd/SKILL.md` does not mention the new `--apply` refusal on a dirty or behind checkout.
- AC advisory on #7: the read-once test does not exercise the post-apply link path.
- Security provenance: the probe plan was corrected in-session (see Step 3); the probe fixture script is committed with this run.

**Registry:** ticked by `registry-tick.js --stage` in Step 7 (outcome recorded in the acceptance commit).

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-04T04:55Z
**CI reading 1:** SUCCESS @ `afc91b30` (the acceptance decision, Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- ✅ Security probe record and cases files, AC record, and the probe fixture script, committed with this file
- Outward side-effects (the PR canonical comment) fire after this file is committed and pushed; their outcomes are recorded on the PR and in the implementation report, not here

**Next Steps:**

- Task is ready for merge to `develop`
- No further action required on the task itself
