# Definition of Done Verification

**Story/Task:** task.329.git-name-probe-sink
**Verification Started:** 2026-11-26T14:40Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.329.qa.3.git-name-probe-sink.md` (cycles 1–3: qa.1, qa.2, qa.3)
**Gate File Found:** `task.329.gate.3.git-name-probe-sink.yml` (head `eed003c37`)

**Gate Status:** ✅ PASS
**Quality Score:** 96/100

**Immediate Actions from QA:** none.
**Open entries:** T329-QA-9, T329-QA-10, both LOW. The cosmetic-residue exit carried them to the task's `## Deferred Work`.
**Future Actions from QA:** `isDocsPath` admits the NTFS `.git:` stream spelling and U+0085. This is pre-existing (identical on develop), and a follow-up task will cover it.
**PR review (5c):** `task.329.pr-review.1.git-name-probe-sink.md` returned CONCERNS with no open coverage finding. PC-1 is applied (`pr_number: 956`). PC-2 is the criteria ticks, which this run writes.

**NFR Validation (from QA):** Security PASS (`boundary: false`), Performance PASS, Reliability PASS, Maintainability PASS.

**PR:** #956 (source: branch)
**Record criteria (Step 3a):** `ok`. Criterion #4's committed place is the QA report. The preflight
confirmed only that a place exists, not that the record was in it (see the deviations below).
**Re-run at head:** `not-configured`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL at Step 3c, before CI reading 1. #5 is DEFERRED-CI; Step 6 grades it (see below).
**PR Status:** OPEN (PR #956)
**PR Review Decision:** null. The host requires no review; `task.329.pr-review.1.git-name-probe-sink.md` (5c) returned CONCERNS with no open coverage finding.
**Re-run scope:** full (no-prior-record) — 7 re-judged, 0 carried
**AC YAML:** hand-copied (unverified): `transcript-unreadable` ("the transcript holds no final assistant text"; the agent answered through its hand-back). The record `task.329.dod.1.ac.json` says `verified: false`.

### Acceptance Criteria

#### #1: Every row of the § 8 table holds in a test

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-input-corpus.mjs:677`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:4752` (plus `:4726`, `:4740`; `security-input-corpus.test.mjs:63`, `:209`, `:147`, `:513`, `:596`). It runs per PR through `test.yml`.

#### #2: `corpusFor("path")` unchanged, pinned by a test

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-input-corpus.mjs:577` (the `PATH` block is byte-identical at `684b2db38` and HEAD)
- Test evidence: `shared/resources/tests/security-input-corpus.test.mjs:230`

#### #3: Performance: not applicable, no bound claimed

**Status:** ✅ PASS

- Code evidence: `task.329.git-name-probe-sink.md:330`
- Test evidence: not applicable (§ 8 Performance Tests: "Not applicable", `:317`)

#### #4: Every § 8 mutation recorded in the QA report with the test it turned red

**Status:** ✅ PASS, after Step 8a (one FAIL and one fix, both in this run; see the deviations below)

- Code evidence: `task.329.qa.3.git-name-probe-sink.md` § "Mutation records for § 8": M8–M11, and M12 before and after the fix
- Test evidence: not applicable (process criterion)

#### #5: `npm run test:remote` and `npm run bundle:check` pass

**Status:** ⏳ DEFERRED-CI — graded at Step 6 from CI reading 1 (fix head)

- `npm run test:remote` at the fix commit `d71760925` (as the 8a fast gate, `--timeout-min 60`): 8902 tests, 8899 pass, 0 fail. The first attempt hit the 30-minute limit (exit 124, no failures) on a server at load average about 20.
- The bundler ran in the pre-commit hook on `d71760925`: every skill in sync, closure +0.

#### #6: Both prompts and `probe-boundary-rule.md` say when to choose `git-name` over `path`

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-dod-security-prompt.md:164-167`, `shared/resources/security-review-prompt.md:93`, `shared/resources/probe-boundary-rule.md:206-209`
- Test evidence: not applicable (documentation)

#### #7: CHANGELOG `[Unreleased]` names the sink and the routing rule

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:9-16`; `changelog-cites.sh task.329` → `cites (task 329)`
- Test evidence: not applicable (documentation)

### Advisory (not a gap)

- **#4**: the review-prompt half of § 8's third mutation. The rerun agent reasoned that this mutation survives. The main context ran it (M12) and confirmed it: no test went red. A re-judge graded the criterion FAIL, severity low. Step 8a fixed it (below).

### Documentation

- **Skill/reference files updated where behaviour changed**: ✅ PASS — `shared/resources/security-input-corpus.md:259`. Both prompts, `probe-boundary-rule.md` and the bundled copies are updated.

**Agent summary:** 6 of 7 PASS with committed, per-PR evidence (drift check clean). #5 is DEFERRED-CI.

**CI reading 1 (fix head):** SUCCESS @ `d71760925f0c7a193504c55c28aaebb4223e35aa` — 6 checks (floor 6), waited 360 s
**CI-state criteria:** #5 → PASS (CI reading 1: SUCCESS @ d71760925) — AC_OVERALL re-folded: PASS

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `.claude/state/pr-diff-956.diff`. A grep of the added lines for credential literals finds none.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: the diff adds no `eval(`, `exec(` or `execSync(`. The new test writes mutants only into an `mkdtempSync` root and removes it in `finally`.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` or lockfile change

### Probe Results

_Probe mode did not fire: the deliverable is not a boundary._ `probe-boundary-signals.mjs --doc` → `boundary: false`, `matched: []`. The change adds corpus data and prose. `isDocsPath`, the predicate the corpus targets, is not in the diff.

**Agent summary:** no secrets, no unsafe patterns, no dependency changes. `boundary: false` was reached from Step 1b on the diff, not copied from the gates.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

GDPR, PCI-DSS, WCAG and HIPAA are all NOT_APPLICABLE. The task is internal developer tooling, with no personal data, payments, PHI or UI.

**Agent summary:** No compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9` (cites `(task 329)` at `:16`)

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/security-review-prompt.md:93`, `finalise-dod-security-prompt.md:97`, `:160`, `:166`, `probe-boundary-rule.md:206`, `security-input-corpus.md:425`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE. No public API, config or CLI changes, and the corpus sinks are not mentioned in the README or `docs/architecture/`.

**Agent summary:** the CHANGELOG entry is present and cited, and the routing docs are updated.

---

## Step 2b: Fix-and-recheck (Step 8a)

**Deviations recorded, not hidden:**

1. **The first AC pass (at `62fe945b1`) failed #4, severity medium.** qa.1 had recorded M1–M7, and three of the four mutations § 8 names had never been run. The Step 3a record preflight answered `ok`, and my confirmation of it (a grep for `M[1-7]`) was too weak to catch the gap. As the preflight table directs ("a record that is missing is written there and committed first"), the four mutations were run and recorded in qa.3 (M8–M11, commit `f43ad031c`), and the AC agent was dispatched again at that head. The first agent's answer was not merged.
2. **The second AC pass passed #4. Its advisory said the review-prompt half of "dropped from either prompt's list" would survive.** It was run (M12): no test went red. M12 is recorded in qa.3 as surviving. A re-judge graded #4 FAIL, severity **low** (agent-graded, not typed here).
3. **The fix (`d71760925`) landed during `/finalise`, after the QA loop exited at 5c. It was verified inline, not by another QA cycle or an independent reviewer:**
   - fast gate: `npm run test:remote` 8902 tests, 0 fail;
   - mutation proof: with the fix, M12 turns "every sink is named in each prompt's sink enumeration" red. Without the fix, `.claude/state/mut-dod1/m12.log` shows 24/24 green. M10 still turns the same test red;
   - the section's reproduction was re-run: M12, recorded in qa.3.

   The other three DoD sections were not re-run. The fix touched only `shared/resources/tests/security-input-corpus.test.mjs`, which is inside the Files Summary (§ 7 item 6), and they were evaluated against a tree that path does not reach.
4. **Fix-and-recheck preconditions: all five held.** `finalise-fix-and-recheck.mjs` exited 0 after the proof, and again with `--git-base f43ad031c` after the commit. The record is at `.claude/state/finalise-fix-finding.json`.
5. **A stale-state defect was found and avoided.** `.claude/state/finalise-ac-result-1.yaml` was left over from task 325's DoD run 1. The first `merge` call read it, because the extract wrote nothing, and merged task 325's verdicts under task 329's ids `#1`–`#7`. That record and the merged file were deleted before use, and task 329's YAML was merged in their place. The engine does not check that the result's `story_file` matches the scope's document.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 96/100, gate 3)
- Acceptance Criteria: ✅ 7/7 complete (#4 after the Step 8a fix `d71760925`; #5 graded from CI reading 1)
- PR Review & Tests: ✅ the host requires no review (`reviewDecision` null); `task.329.pr-review.1.git-name-probe-sink.md` returned CONCERNS with no open coverage finding. `npm run test:remote` at `d71760925`: 8902 tests, 0 fail
- CI: ✅ SUCCESS @ `d71760925` (6/6 checks)
- Documentation: ✅ CHANGELOG cites task 329; both prompts, `probe-boundary-rule.md` and the corpus prose updated
- Security Review: ✅ PASS (`boundary: false`)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Outcome:** Task meets all Definition of Done criteria and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-26T17:41Z
**Total Duration:** 181 minutes
**CI reading 1:** SUCCESS @ `d71760925f0c7a193504c55c28aaebb4223e35aa` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section, `status: accepted` and the § 9 criteria ticked
- ✅ Task registry row ticked
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- Follow-ups: the `isDocsPath` NTFS `.git:` stream and U+0085 gaps (pre-existing); T329-QA-9 and T329-QA-10; the AC merge not checking the result's `story_file`
