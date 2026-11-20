# Definition of Done Verification

**Story/Task:** task.314 — the security probe engine loads a TypeScript entry
**Verification Started:** 2026-11-20T17:54Z

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.314.qa.1` to `qa.4`. **Gate:** `task.314.gate.4.probe-engine-loads-a-typescript-entry.yml`
**Gate Status:** ✅ PASS (95/100), `top_issues: []`, three low advisories in `recommendations.future`
**PR review (Step 5c):** `task.314.pr-review.1.*.md`, verdict CONCERNS with four document findings, all cleared in the carry (PC-1 refuted: `qa.1` line 102 already holds the figure).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (12 of 12)
**PR Status:** OPEN (PR #925, source: branch)
**PR Review Decision:** none required (`null`); the newest `pr-review` report is CONCERNS with no open coverage finding
**Re-run scope:** full (no-prior-record) — 12 re-judged, 0 carried

**CI-state criteria:** #9 → PASS (CI reading 1: SUCCESS @ `d0daf814a`) — AC_OVERALL re-folded: PASS

| AC | Status | Evidence |
| --- | --- | --- |
| #1 fixture library loads and scores | ✅ | `security-probe-typescript-entry.test.mjs:158` |
| #2 calibration | ✅ | `…test.mjs:264` |
| #3 mutation proof | ✅ | `qa.1:157-158`; `qa.4` "Mutation (a) re-run, with the decline reason" (18 red, `entry-not-probeable`) |
| #4 no compiler, named decline | ✅ | `security-probe.mjs:852`, `…test.mjs:297` |
| #5 writes nothing, nothing interpolated | ✅ | `…test.mjs:289`, `:389`, `:408` |
| #6 per-child cost | ✅ | `qa.4` "Per-child cost, re-measured on head": +355 ms, 9 runs, load1 at most 1.10 |
| #7 bundle `--check` | ✅ | 129 skills, 0 problems |
| #8 validate | ✅ | four changed skills pass |
| #9 `CI=true` test lane green | ✅ | CI reading 1 below |
| #10 docs name the TypeScript entry | ✅ | `probe-boundary-rule.md:285`, `SKILL.md:914` |
| #11 CHANGELOG cites (task 314) | ✅ | `CHANGELOG.md:23` |
| #12 overridden plans | ✅ | `qa.1:82` ("none known") |

### Advisory (not a gap)

- **#5**: no test reads the hook source for case input; the static hook path and the argv tests cover it.
- **#7, #8**: the committed QA record says the developer ran them; the evidence used is `validate.yml` per PR and a fresh `bundle --check` run.

**Agent summary:** 12 of 12 criteria met. The AC agent was run three times: the first run failed #6 (a measurement that predated three cycles of hook changes), the second failed #3 (the record named the red tests but not the decline reason). Each was a missing record, not a code defect, and each is now written into `task.314.qa.4` and pushed.

---

## Step 3: Security Review

**Story Type:** task (tooling)
**Overall Security Status:** ✅ PASS

- No hardcoded secrets, no `eval`/`exec` in the hook (`security-probe-ts-hook.mjs`).
- Hook inputs `PROBE_TS_COMPILER` and `PROBE_TS_ROOT` are bound by the engine (`security-probe.mjs:2353`, `:2356`), never by a plan or case.
- Every compiler filesystem read goes through the root-bound `rooted` host (`security-probe-ts-hook.mjs:62`).
- The only new package is the devDependency `typescript` 5.9.3.

### Probe Results

**Candidates executed:** 10 — **reproduced:** 0. ✅ **The boundary held**: `resolveEntry` containment of `.ts`/`.mts`/`.cts`/`.tsx` `path#export` entries (four hostile: `../outside.ts#fn`, an embedded `..`, two absolute paths; six legitimate, one through a symlink that stays inside). Record: `task.314.dod.1.security.run.json`.

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed. **A hostile symlink-escape case could not be built** (the read-only plan cannot write a symlink out of the repo root); task 314's own fixture tests cover the escape cases.

- Probe run by /finalise from the security agent's plan — 1 control, record `docs/tasks/task.314.probe-engine-loads-a-typescript-entry/task.314.dod.1.security.run.json`. The plan was extracted from the agent's transcript (`agent-reply-block.js`, sha256 `1c081b5b…` for the first plan; the second plan was extracted the same way).
- **A first plan was discarded.** It probed `resolveEntry` with the bare-path corpus; 3 of 11 cases were rejected only because a bare path has no `#export`. A grading agent confirmed that is the entry grammar, not path over-blocking, and that task 314 does not touch `resolveEntry`. The corrected plan above replaced it, and the first run's files were moved out of the work-item directory (never committed).

**Agent summary:** classified boundary: true on the criteria signal (QA gates 1 to 4 had said false); the corrected probe confirms containment.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — internal tooling; no personal data, payments, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG.md:22 — entry cites (task 314).
- `probe-boundary-rule.md:285` and `:175-176`, `skills/finalise/SKILL.md:914-916`; bundled copies regenerated in four skills.
- README and architecture docs: NOT_APPLICABLE.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Gate: ✅ PASS (95/100)
- Acceptance Criteria: ✅ 12/12
- PR Review & Tests: ✅ pr-review CONCERNS with no open coverage finding; CI green
- Documentation: ✅
- Security Review: ✅ 10 probed, 0 reproduced
- Compliance Review: ⚠️ NOT_APPLICABLE

**CI reading 1:** SUCCESS @ `d0daf814a` (acceptance decision). All six checks `SUCCESS`: test, validate, link-check, shellcheck, secret-scan, branch-name.

**Deviations recorded, not hidden:**

1. Two document commits landed during `/finalise` (`67d30dc7a`: the re-measured hook cost; `d0daf814a`: mutation (a) with its decline reason), both into `task.314.qa.4`. Neither touched code; the code last changed at `4d2d5939c`. CI was re-run on both heads.
2. The security plan was re-planned once (above). The first probe's three "reproduced" cases were not deferred and not waived: they were an artefact of the wrong control, and the run was replaced, not edited.

**Outcome:** Task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-20T18:50Z
**Total Duration:** 56 minutes
**CI reading 1:** SUCCESS @ `d0daf814a` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (the PR canonical comment; no tracker issue is linked) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
