# Definition of Done Verification

**Story/Task:** task.243.wireframe-component-mapping
**Verification Started:** 2026-10-29T16:28Z

---

## Verification Results

_DoD results are appended below in 4 consolidated sections after the parallel agents complete._

## Step 1: QA Report Review ✅

**QA Report Found:** `task.243.qa.8.wireframe-component-mapping.md`
**Gate File Found:** `task.243.gate.8.wireframe-component-mapping.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Prior DoD run:** `task.243.dod.1.wireframe-component-mapping.md` (GAPS: SC-1). The fix is commit `9e50d3b7`, and QA re-entered at 5a, producing gate 8.
**PR:** #785 (source: branch)
**PR review:** `task.243.pr-review.2.wireframe-component-mapping.md` — APPROVE. The host requires no reviews, so this report stands in for the PR approval.

**NFR Validation (from QA):** Security PASS, Performance PASS, Reliability PASS, Maintainability PASS
**Immediate Actions from QA:** None
**Future Actions from QA:** CR8-1 (deferred work), CR7-1 (deferred work), and gate 7's carried advisories

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #785)
**PR Review Decision:** null. The host requires no reviews; `task.243.pr-review.2.wireframe-component-mapping.md` (Step 5c, ✅ APPROVE) satisfies it.
**Re-run scope:** scoped (prior-record): 5 re-judged, 2 carried

### Acceptance Criteria

#### SC-1: No ui: block: ensure and resolve answer unset, write nothing

**Status:** ✅ PASS (re-judged: run 1's reported gap)

- Code evidence: `shared/resources/wireframe-map.js:544` (ensure), `shared/resources/wireframe-map.js:645` (resolve)
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:164` (ensure), `shared/resources/tests/wireframe-map.test.mjs:175` (resolve, commit `9e50d3b7`)
- Member "ensure answers unset and writes nothing": ✅ PASS
- Member "resolve answers unset and writes nothing": ✅ PASS. The test covers a config with no `ui:` block and one with `ui:` but no `wireframeMap`.

#### SC-2: ensure seeds missing catalogue and map; second run reports unchanged

**Status:** ✅ PASS (re-judged: evidence moved)

- Code evidence: `shared/resources/wireframe-map.js:552`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:191`

#### SC-3: Existing catalogue gains rows only for missing exports, never loses one

**Status:** ✅ PASS (re-judged: evidence moved)

- Code evidence: `shared/resources/wireframe-map.js:578`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:214` (and `:246`)

#### SC-4: resolve applies most specific matching row, lists other nodes open

**Status:** ✅ PASS (re-judged: evidence moved)

- Code evidence: `shared/resources/wireframe-map.js:362`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:381`

#### SC-5: record adds a link; replaces one with same signature and label

**Status:** ✅ PASS (re-judged: evidence moved)

- Code evidence: `shared/resources/wireframe-map.js:746`
- Test evidence: `shared/resources/tests/wireframe-map.test.mjs:429`

#### SC-6: All eight skills carry their hook and bundled engine, procedure, parser

**Status:** ✅ PASS (carried from run 1, evidence unchanged)

- Code evidence: `skills/create-story/SKILL.md:762`
- Test evidence: `evals/shared/tests/wireframe-mapping-hooks.test.mjs:38`

#### #7: Docs: assumption not recorded; subsection named in four places; not in template

**Status:** ✅ PASS (carried from run 1, evidence unchanged)

- Code evidence: `shared/resources/wireframe-component-mapping.md:98`
- Test evidence: `evals/shared/tests/wireframe-mapping-hooks.test.mjs:409`

### Advisory (not a gap)

- **SC-1**: `resolve` has no write path, so the new test's two `existsSync` assertions cannot fail (gate 8, CR8-1, deferred).
- **SC-4**: carried from run 1. No test asserts that resolved and unresolved together cover every node.

### Documentation

- **Configuration reference documents the new ui: keys**: ✅ PASS (`docs/reference/configuration.md:335`)
- **Skill files updated where behaviour changed**: ✅ PASS (`skills/create-story/SKILL.md:762`)

**Agent summary:** All 7 criteria pass. Run 1's gap is closed: `resolve`'s unset path is tested at `wireframe-map.test.mjs:175`, and the test runs per PR. AC record: `task.243.dod.2.ac.json`.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL (4 reproduced probes, all graded low)

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:13-22`
- Note: no secret-shaped literal in the changed files. The only change since run 1 is a test.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:65-67`
- Note: `fs`, `path` and `yaml-subset.js` only; no `child_process` or `eval`. The fenced guards compare the document key inside jq with `--arg`.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE. `package.json` and `package-lock.json` are unchanged.

### Probe Results

**Candidates executed:** 27 — **reproduced:** 4

- **`2:pp.newline-in-flags`** (low): `parsePattern` accepts `*>button[primary\n| `*>input` | | Evil |]`. Its flag list `[^\]]*` spans a newline.
- **`2:pp.newline-in-attrs`** (low): accepts `*>icon{name=a\nb}`. The attribute list `[^}]*` spans a newline.
- **`2:pp.trailing-newline`** (low): accepts `button\n`. `parsePattern` checks `sig.trim()`, but `record` writes the untrimmed `--signature`.
- **`2:pp.leading-newline`** (low): accepts `\nbutton`. This is the same trim gap.

All four have one cause: `record` (`wireframe-map.js:710`) trusts `parsePattern` to vouch for a one-line signature, and `parsePattern` does not check for newlines. Run end to end in a scratch consumer, `record({signature: "*>icon{name=a\nb}"})` returned `added`. It split the row into a `` `*>icon{name=a `` fragment and a non-table line, and the next `record` was spliced in between the two halves.

The failure is closed. `cell()` escapes every `|`, so no fake row can be added. The fragment matches no node, and the only loss is a row a person later adds below the break, which goes back to being asked. `resolve` builds every signature from a single wireloom line, so the documented flow cannot supply a newline. Only a hand-typed `--signature` reaches this. Fix: have `parsePattern` reject `/[\r\n]/` on the raw string.

- Probe run by /finalise from the security agent's plan: 3 controls, record `task.243.dod.2.security.run.json`.
  - `fence:` Step 3 held-answers guard: 9 cases, held.
  - `fence:` Step 2 key check: 7 cases, held.
  - **new this run** `wireframe-map.js#parsePattern`: 11 cases, 4 reproduced.
- The two fence entries are run 1's corrected plan (`jq exit 5`), reused unchanged. The agent added the `parsePattern` entry at Step 1b, as a boundary run 1 missed.
- Severities came from re-dispatching the security agent with the result file, merged by probe `key`.

**Agent summary:** `boundary: true`. Both fence guards held again (16 of 16). The new `parsePattern` control reproduced 4 of its 7 hostile cases, all newline-in-signature and all graded low.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None (NOT_APPLICABLE)

**Agent summary:** Internal developer tooling with no personal, payment or health data and no rendered UI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`, an `[Unreleased]` entry citing (task 243)

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-component-mapping.md:1`. The procedure, eight hooks and `skill-dependencies.json` are in the diff. The catalog needs no regeneration.

### README / architecture docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:337`

**Agent summary:** CHANGELOG cites task 243, and the config reference, procedure and hooks are in the diff.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** SUCCESS @ `56fab4fb31ae20c4a2ea6d51da6b7371b4a807a9` over 6 checks

**Summary:**

- QA Report: ✅ PASS (100/100, gate 8)
- Acceptance Criteria: ✅ 7/7 (run 1's SC-1 gap closed)
- PR Review & Tests: ✅ 5c APPROVE (no host review required)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL (4 low probes reproduced on `parsePattern`; both fence guards held)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. Security: `parsePattern` (`shared/resources/wireframe-map.js:324`) accepts a signature that contains a newline, and `record` writes it into the map unchanged. This splits the row and ends the table early (probes `pp.newline-in-flags`, `pp.newline-in-attrs`, `pp.trailing-newline`, `pp.leading-newline`; all low, fail-closed).

**Fix-and-recheck refused: inside-files-summary, mutation-proved.**
- `mutation-proved` is the expected first-run refusal.
- `inside-files-summary` refused the eight bundled copies, `skills/{…}/references/wireframe-map.js`. The Files Summary lists them as the glob `skills/*/references/`, and the evaluator matches paths exactly.
- The glob was not expanded to get past the evaluator: the row is reachable through the evaluator only.
- Record: `.claude/state/finalise-fix-finding.json`.

**Outcome:** One small engine fix, with a test and a re-bundle. It changes code, so it re-enters QA at 5a before /finalise re-runs.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-29T16:35Z
**Total Duration:** ~7 minutes

**Blocking Issues Summary:**

1. Security: `parsePattern` accepts a signature that contains a newline, and `record` writes it into the map unchanged (4 low probes, `task.243.dod.2.security.run.json`)

**Estimated Effort to Close Gaps:** Small (a one-line guard, one test, `npm run bundle`, and a mutation proof)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Make `parsePattern` reject `/[\r\n]/` on the raw signature, so `record` refuses it with a UsageError
- Add a test: `record` with each of the four probe inputs throws and leaves the map unchanged
- Run `npm run bundle`, which updates the eight `skills/*/references/wireframe-map.js` copies
- A gap closed by changing code re-enters QA before this verification re-runs
- Re-run verification after the fix
