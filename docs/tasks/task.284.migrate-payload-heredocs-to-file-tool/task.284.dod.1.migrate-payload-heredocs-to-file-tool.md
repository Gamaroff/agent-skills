# Definition of Done Verification

**Story/Task:** task.284 — Migrate shipped payload heredocs to the file tool
**Verification Started:** 2026-11-20T12:56Z

---

## Verification Results

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #923)
**PR Review Decision:** null (the host requires no reviews; the newest co-located review, `task.284.pr-review.1.migrate-payload-heredocs-to-file-tool.md`, has verdict APPROVE)
**Re-run scope:** full (no-prior-record) — 6 re-judged, 0 carried

### Acceptance Criteria

#### #1: Ratchet allowlist empty; test fails on any added payload heredoc (mutation-proven)

**Status:** ✅ PASS

- Code evidence: `shared/resources/tests/payload-heredoc-ratchet.test.mjs:9`
- Test evidence: `shared/resources/tests/payload-heredoc-ratchet.test.mjs:124`
- Note: the final test asserts `measure()` deep-equals `[]`. The mutation proof is in QA report 1 (a heredoc appended to `file-write-rules.md` turned the test red, then restored). The test runs per PR under `npm test`.

#### #2: Every changed block classed runnable by qa-execute-snippets still runs clean

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.284.migrate-payload-heredocs-to-file-tool/task.284.qa.1.migrate-payload-heredocs-to-file-tool.md:99`
- Test evidence: NOT_APPLICABLE (process criterion)
- Note: `criteria-drift.js` reads the reword as approved (approver "the repository owner on 2026-11-20"). QA report 1 records zero failures on the one runnable block.

#### #3: `CI=true npm test` wall time within 10% of develop, load recorded

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.284.migrate-payload-heredocs-to-file-tool/task.284.qa.1.migrate-payload-heredocs-to-file-tool.md:84-95`
- Test evidence: NOT_APPLICABLE (measured criterion)
- Note: ten interleaved runs on the LAN server, `uptime` before each. Head median 618,157 ms against 618,433 ms for `develop` (−0.04%). Measured on `91f1a9fc3`, tree-equivalent to the PR head (`finalise-delta.js docs-only` returned `tree-equivalent`). The command was `CI=true npm run test:remote -- --run test`, the remote form of `npm test`.

#### #4: bundle --check reports 0 problems; validate passes for each changed skill

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.284.migrate-payload-heredocs-to-file-tool/task.284.qa.5.migrate-payload-heredocs-to-file-tool.md:114`
- Test evidence: NOT_APPLICABLE (measured criterion)
- Note: `quick_validate.py` passed on all 26 changed skills and `bundle:check` reported 129 skills, 0 problems. The agent re-ran both on the head.

#### #5: CHANGELOG.md [Unreleased] entry citing (task 284)

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:9`
- Test evidence: NOT_APPLICABLE (documentation criterion)

#### #6: Each remaining --body-file site cites the fresh-body-post recipe or is listed as excluded

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.284.migrate-payload-heredocs-to-file-tool/task.284.qa.5.migrate-payload-heredocs-to-file-tool.md:39-46`
- Test evidence: NOT_APPLICABLE (process criterion)
- Note: the uncited set, recomputed with `git grep`, is exactly the seven files listed with a reason in QA report 5.

### Advisory (not a gap)

- **#2**: QA report 1 never names the single runnable block, so the claim rests on the engine's zero-failure report.
- **#3**: the measurement used the `test:remote` form of `npm test`, not the literal `time CI=true npm test`.
- **#1-6**: the agent's named diff file was absent, so it used `git diff 850985da3...HEAD` (133 files).

### Documentation

- **README or skill files updated where behaviour changed**: ✅ PASS — `CHANGELOG.md:9`

**Agent summary:** All six criteria judged: #1 to #6 PASS.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS

- Note: no added non-docs line assigns a string literal to a password, key or secret.

### No new unsafe patterns (eval/exec/shell.run)

**Status:** ✅ PASS

- Note: the `tracker-comment.js` change adds only `fs.unlinkSync(args.bodyFile)` inside try/catch.

### Fixed body-file path is a stale-body risk

**Status:** ✅ PASS

- Evidence: `skills/create-issue/SKILL.md:222`
- Note: found in QA bugs 1 to 4 and fixed in this PR. The create-issue pre-flight now halts on a missing, empty or foreign body file.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

**Candidates executed:** 18 — **reproduced:** 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held; a write to an absolute path outside the sandbox (an injected `$(touch /abs/x)`) is not observed. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict. The run recorded no escapes and no refusals (`task.284.dod.1.security.run.json`).

### Recommendations for the owner

These are not security findings, and they do not count against the verdict above. Each is an input the work item's specification allows, which may be a risk (task 249, obs #81). Tightening the specification is the owner's decision.

- **Spec challenge:** `ISSUE_DOC_NAME=a.md` with a body that contains `xa.mdx` — allowed by `skills/create-issue/SKILL.md:228`. The freshness check is a substring match (`grep -qF`), so a leftover body whose text merely contains this document's file name as a fragment passes. The owner may want a match anchored on the Local Doc line.

**Agent summary:** boundary true. One probe planned, the create-issue pre-flight (7 hostile and 2 legitimate cases); 18 candidates executed, none reproduced.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR: Applicability

**Status:** ⚠️ NOT_APPLICABLE

- Note: no personal data collected.

### PCI-DSS: Applicability

**Status:** ⚠️ NOT_APPLICABLE

- Note: no payment features.

### WCAG: Applicability

**Status:** ⚠️ NOT_APPLICABLE

- Note: no UI changed.

### HIPAA: Applicability

**Status:** ⚠️ NOT_APPLICABLE

- Note: no health data.

**Agent summary:** Pure internal refactor of skill prose and a ratchet test; no compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS

- Evidence: `CHANGELOG.md:9`
- Note: the `[Unreleased]` entry cites (task 284).

### API/type-specific docs updated

**Status:** ✅ PASS

- Evidence: `shared/resources/file-write-rules.md` and its regenerated per-skill copies
- Note: no catalog regeneration was needed; no SKILL.md frontmatter changed.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

- Note: no public API, config variable or CLI command added.

**Agent summary:** CHANGELOG entry present, skill and shared-resource docs updated, README not applicable.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate 5, `task.284.gate.5.migrate-payload-heredocs-to-file-tool.yml`)
- Acceptance Criteria: ✅ 6/6 complete
- PR Review & Tests: ✅ review decision is null (no reviews required); `task.284.pr-review.1.migrate-payload-heredocs-to-file-tool.md` verdict APPROVE
- CI reading 1: SUCCESS (6 checks) @ `180be6f02e71539321f87bf16befee6fc2b0c55b`
- Documentation: ✅ CHANGELOG and skill docs updated
- Security Review: ✅ 18 probe candidates executed, none reproduced, no escapes
- Compliance Review: ⚠️ NOT_APPLICABLE

**Outcome:** Task meets all Definition of Done criteria and is ready for acceptance.

**Run notes:** the first AC run on head `50fab41c1` failed #2 (an unapproved amendment), #3 (no five-run median) and #4 (no committed validate record), all low. Each was fixed by evidence or by the owner's approval, then a full AC agent re-judged all six on the current head. The task document's Change Log records the owner's narrowing of criterion 2.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-20T15:17Z
**Total Duration:** 141 minutes
**CI reading 1:** SUCCESS @ `180be6f02e71539321f87bf16befee6fc2b0c55b` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section, `status: accepted` and a Change Log row
- ✅ Task registry row ticked and staged
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment and the tracker steps — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
