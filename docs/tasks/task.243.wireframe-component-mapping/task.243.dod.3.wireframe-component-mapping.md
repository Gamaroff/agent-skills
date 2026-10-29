# Definition of Done Verification

**Story/Task:** task.243.wireframe-component-mapping
**Verification Started:** 2026-10-29T17:14:08Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.243.qa.11.wireframe-component-mapping.md`
**Gate File Found:** `task.243.gate.11.wireframe-component-mapping.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100

**Success Criteria Coverage (from QA):** SC-1 to SC-7 PASS.

**NFR Validation (from QA):**

- Security: ✅ PASS (measured; probe 79 executed, 0 reproduced, 0 escaped)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** CR11-1, CR11-2, CR8-1, CR7-1 and carried gate 1–7 lows, all listed under Deferred Work.

**Prior DoD runs:** run 1 (gap: SC-1, closed by `9e50d3b7`) and run 2 (gap: `parsePattern` accepted a newline, closed by `c9f77474` and extended through gates 9–11). The document body's `## Definition of Done - Gaps Identified` section is run 2's report and is superseded by this run.

**PR:** #785 (source: branch)
**5c PR review:** ✅ APPROVE — `task.243.pr-review.3.wireframe-component-mapping.md` (2 low trail findings, both fixed in the carry)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #785)
**PR Review Decision:** null (no review required on this repository) — satisfied by `task.243.pr-review.3.wireframe-component-mapping.md`, verdict APPROVE
**Re-run scope:** scoped (prior-record) — 5 re-judged, 2 carried

### Acceptance Criteria

#### SC-1: No ui: block: ensure and resolve answer unset, write nothing

**Status:** ✅ PASS

- Code evidence: `shared/resources/wireframe-map.js:549`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:176`

#### SC-2: ensure seeds missing catalogue and map; second run reports unchanged

**Status:** ✅ PASS

- Code evidence: `shared/resources/wireframe-map.js:575`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:192`

#### SC-3: Existing catalogue gains rows only for missing exports, never loses one

**Status:** ✅ PASS

- Code evidence: `shared/resources/wireframe-map.js:582`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:215`

#### SC-4: resolve applies most specific matching row, lists other nodes open

**Status:** ✅ PASS

- Code evidence: `shared/resources/wireframe-map.js:366`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:382`

#### SC-5: record adds a link; replaces one with same signature and label

**Status:** ✅ PASS

- Code evidence: `shared/resources/wireframe-map.js:780`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:430`

#### SC-6: All eight skills carry their hook and bundled engine, procedure, parser

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `skills/create-story/SKILL.md:762`
- Test evidence: `evals/shared/tests/wireframe-mapping-hooks.test.mjs:38`

#### #7: Docs: assumption not recorded; subsection named in four places; not in template

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/wireframe-component-mapping.md:98`
- Test evidence: `evals/shared/tests/wireframe-mapping-hooks.test.mjs:409`

All cited tests run per PR: `shared/resources/tests/*.test.mjs` and `evals/shared/tests/*.test.mjs` are in `npm test`, which `.github/workflows/test.yml` runs on every pull request with no path filter.

### Advisory (not a gap)

- **SC-1**: resolve has no write path, so the two `existsSync` assertions at `wireframe-map.test.mjs:184-185` cannot fail; the `deepEqual {reason:'unset'}` does the real work (carried from run 2).
- **SC-4**: no test asserts that resolved plus unresolved covers every node; the partition loop at `wireframe-map.js:672-695` guarantees it (carried from run 2).
- **SC-6**: all eight bundled `wireframe-map.js` copies match the source apart from the generated header.
- **SC-1**: the PR's `test` check was still pending when the agent read it; CI reading 1 below records it green.

### Documentation

- **Procedure and config reference updated where behaviour changed**: ✅ PASS — `docs/reference/configuration.md:335`

**Agent summary:** SC-1..SC-5 re-judged PASS at head `f08386fc`; record's new checks run before any read or write and leave the add/replace path unchanged; SC-6 and #7 carried.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL — 9 probes reproduced (all graded low)

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:65`
- Note: the engine requires only `fs`, `path` and `./yaml-subset.js`; a grep of every added line for credential patterns returns 0.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:65`
- Note: no `eval`, `exec`, `child_process` or `new Function`. `new RegExp` at `:357` compiles a `/re/` label from the project's own map and catches an invalid pattern (a slow pattern is the consumer's own; advisory).

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — `shared/resources/wireframe-map.js:1`
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` or lockfile change

### Probe Results

**Candidates executed:** 114 — **reproduced:** 9 — **escaped:** 0

- Probe run by /finalise from the security agent's plan — 11 control(s), record `task.243.dod.3.security.run.json`

| Control | Executed | Verdict |
| --- | --- | --- |
| Step 3 held-wireframe-answers guard (fence) | 9 | engages |
| Step 2 wireframe-writes key check (fence) | 7 | engages |
| `wireframe-map.js#parsePattern` | 17 | present-but-inert (4 reproduced) |
| `record --signature` (cli) | 11 | present-but-inert (3 reproduced) |
| `record --label` (cli) | 11 | present-but-inert (2 reproduced) |
| `record --component`, `--variant`, `--hint`, `--notes` (cli) | 44 | engages |
| `record --by`, `--date` (cli) | 15 | engages |

Reproduced (hostile, expected rejected, got accepted), each graded **low** by the security agent:

- `2:pp.u2028-trailing` — `*>chip` + U+2028
- `2:pp.u2028-leading` — U+2028 + `*>chip`
- `2:pp.u2029-in-flags` — `*>button[a` U+2029 `b]`
- `2:pp.u2028-in-attrs` — `*>icon{name=a` U+2028 `b}`
- `3:rec3.signature.u2028-trailing` — `--signature` `*>chip` + U+2028
- `3:rec3.signature.u2028-leading` — `--signature` U+2028 + `*>chip`
- `3:rec3.signature.u2029-in-flags` — `--signature` `*>chip[a` U+2029 `b]`
- `4:rec3.label.u2028` — `--label` `Sa` U+2028 `ve`
- `4:rec3.label.u2029-trailing` — `--label` `Save` + U+2029

**Consequence (the agent's grading):** `parsePattern`'s `/[\r\n]/` check at `wireframe-map.js:328` and `record`'s line-break check at `:729` miss U+2028 and U+2029, and `--signature`/`--label` skip the read-back check. The row stays one table line (neither `readMap` nor CommonMark ends a line at U+2028), but `unquote`'s `.` cannot cross it, so the cell reads back with its backticks. The row then never matches (score −1), is never offered as a candidate, and a re-record adds a duplicate instead of replacing it. Nothing is split, injected or mis-resolved.

**Agent summary:** checklist PASS; boundary true, 11 controls, 114 cases; the U+2028/U+2029 cases on `parsePattern`, `--signature` and `--label` reproduce.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: internal agent-skill tooling (a markdown map engine, procedure docs, skill hooks, tests). No user data, payments or PHI; no UI files in the diff. `record --by` is a developer attribution in a project-owned document.

**Agent summary:** no compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: `### Added` entry under `[Unreleased]` citing `(task 243)` at `:10`.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-component-mapping.md:1`
- Note: procedure and engine bundled into all eight skills; SKILL.md hooks updated; the catalogue needs no regeneration (only `create-task`'s `invokes:` frontmatter changed).

### README / architecture docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:337`
- Note: the `ui:` block is documented in the configuration reference, which the README links.

**Agent summary:** CHANGELOG entry present; `ui:` config documented; procedure and SKILL.md updates bundled into all eight skills.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (gate 11, 100/100)
- Acceptance Criteria: ✅ 7/7 (5 re-judged, 2 carried)
- PR Review & Tests: ✅ 5c APPROVE (`task.243.pr-review.3`); tests run per PR
- CI reading 1: SUCCESS @ `f08386fc98030d6dbd900b1a515060c0d15e8c75` over 6 checks
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — 9 low probes reproduced (U+2028/U+2029 in a signature or label)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. Security: `parsePattern` and `record` accept U+2028/U+2029 in `--signature` and `--label`; the written row reads back with its backticks, never matches, and duplicates on re-record (9 probes, all low).

**Fix-and-recheck refused: inside-files-summary.** Step 8a's evaluator (`finalise-fix-and-recheck.mjs`) was run on the planned fix — widen the line-break checks at `wireframe-map.js:328` and `:729` to U+2028/U+2029, with a test. It refused `inside-files-summary`: the fix must regenerate the eight `skills/*/references/wireframe-map.js` copies, and the evaluator matches paths exactly while the Files Summary names the copies by the glob `skills/*/references/`. Severity, single commit and no other open finding all held; `mutation-proved` was not yet run (it always fails on the first pass).

**Outcome:** Task does NOT meet the Definition of Done. The fix is a code change, so it re-enters QA before this verification re-runs.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-29T17:41Z
**Total Duration:** ~27 minutes
**CI reading 1:** SUCCESS @ `f08386fc98030d6dbd900b1a515060c0d15e8c75` (6 checks)

**Blocking Issues Summary:**

1. Security: U+2028/U+2029 accepted in `--signature`/`--label` and by `parsePattern` (9 low probes, record `task.243.dod.3.security.run.json`).

**Estimated Effort to Close Gaps:** Small (one regex widened in two places, one test, a re-bundle)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ AC record `task.243.dod.3.ac.json`, probe record and cases files
- PR comment posted after this file is committed and pushed

**Next Steps:**

- Widen both line-break checks to U+2028/U+2029 and add the cases to test 18 (mutation-proven), then re-bundle
- The gap is closed by changing code, so it re-enters QA (gate 12, the last cycle of the 12-cycle budget) before `/finalise` run 4
