# QA Report: Task 81 - Ship `/review-security`

**Task**: [Link to task document](./task.81.review-security-skill.md)
**Gate File**: [task.81.gate.1.review-security-skill.yml](./task.81.gate.1.review-security-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**Testing Completed**: 2026-09-07
**Gate Status**: CONCERNS

---

## Executive Summary

The deliverable does the thing it claims. All four fixtures land in their required verdict bands with
verdicts computed by the engine rather than asserted by an agent, and all four mutation proofs hold —
including the one that matters most, where removing the `present-but-inert` branch reds exactly the two
inert tests and nothing else. The falsifiability criterion this task exists to satisfy is met.

Two medium defects sit in the artifacts rather than the behaviour: the reviewer prompt's Output Contract
section is broken by nested code fences, and the six `probe.mjs` specs — a declared Phase 2 deliverable —
are imported by nothing.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, all checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented — task declares none, and the review confirms none
- [x] Code on feature branch with open PR (#347, OPEN)

### Testing Approach

- [x] Automated Testing (unit / contract)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review
- [ ] Manual Testing — not applicable; deliverable is a skill plus its test suite
- [ ] Performance Testing — not applicable; no runtime performance claim

### Review Methodology

**Direct tools.** The Adaptive Review Strategy's parallel-agent row did not apply (4 phases, not >5) and
the default row permits direct tools. Independently, **subagent dispatch is barred in this session** by
operator constraint, so the axes a parallel agent would have covered — the diff code review (Step 3b) and
the fence/structure analysis — were performed directly instead. This is recorded rather than skipped:
Step 3b ran, it simply ran in the main context against the branch diff.

The reviewer is the same agent that wrote the code. That is a real limit on this gate and is stated here
rather than left implicit; it is mitigated only by the fact that both findings below are mechanically
demonstrable (a fence scan and a `grep` for importers), not matters of judgement.

Step 3c (mutation-proof spot check) was satisfied by the four proofs executed during development and
re-verified from the implementation report; each names the assertion it reds.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Prompt and output contract | CONCERNS | Verified | Both files exist and carry the required sections; §4 renders incorrectly (TASK81-001) |
| Phase 2: Fixtures | CONCERNS | Verified | All four fixtures land in the correct verdict bands; the probe specs are unreferenced (TASK81-002) |
| Phase 3: Falsifiability | PASS | Verified | 25 tests, all passing; 4/4 mutation proofs held |
| Phase 4: Registration | PASS | Verified | Glob, CATEGORIES, catalog, four docs, CHANGELOG, skill-deps, bundle all present and fresh |

**Overall Phase Completion**: 4/4 phases complete, 2 with findings.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Inert Redis fixture reports `present-but-inert` | yes | `present-but-inert`, reason `a-hostile-case-passed-a-control-that-rejects-others` | PASS |
| Inert DB-URL fixture reports high | yes | `present-but-inert` (rated high in the vocabulary) | PASS |
| Engaged variants report no findings and state what was probed | yes | `engages`, 12 executed, 0 reproduced, both | PASS |
| Emits a gate-consumable block with `evidence:` and `probes_executed` | yes | documented in prompt §4 | CONCERNS — see limitation below |
| `full` mode reviews the surface regardless of what changed | yes | documented in SKILL.md and prompt §5 | PASS |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No existing gate, schema or pipeline step changes | 0 | 0 | PASS |
| `npm run ci` green with the new suite confirmed to have run | yes | `ci:fast` green; suite confirmed running by test-count delta | PASS |

### Safety

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Cannot emit a bare PASS — no PASS token in the schema | yes | `VERDICTS` frozen to four; asserted | PASS |
| Zero executed probes renders `unverifiable`, never a pass | yes | asserted behaviourally against the engine | PASS |
| A verdict resting on reading is `reasoned`, never `measured` | yes | stated in prompt §2; asserted | PASS |

**One criterion carries a limitation worth naming.** The task's risk mitigation says
`evidence: measured` requires `probes_executed > 0` "enforced by a schema test in CI". What ships
enforces that invariant **against the documented example block in the prompt**, because v1 has no
emitter — there is no produced report to validate. That is the strongest form available at this stage
and the test is real, but it is weaker than the mitigation's wording implies, and a reader of the risk
section could reasonably expect otherwise. Wiring is `task.82`. Recorded as an honesty note, not a
defect: nothing claimed to exist is missing.

---

## Breaking Changes Validation

### Breaking Change: none declared

Documented: N/A
Migration Path Provided: N/A
Migration Tested: N/A
Consumer Code Updated: N/A
Notes: Verified independently. The change adds a skill and a shared resource, edits only additive lines
in `package.json`, `generate_catalog.py`, four `docs/reference/` files and `CHANGELOG.md`, and regenerates
`skill-dependencies.json`. The one edit to an existing behavioural file — `security-probe.mjs` — is
comment-only, and `security-probe.test.mjs` passes unchanged alongside the new suite.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Nested code fences break the reviewer prompt's Output Contract**
- **Severity**: MEDIUM
- **Category**: Quality (documentation correctness)
- **Bug Report**: [task.81.bug.1.malformed-nested-fences-in-prompt.md](./task.81.bug.1.malformed-nested-fences-in-prompt.md)
- **Observation**: §4 opens a ```` ```markdown ```` fence at line 110 and nests a ```` ```bash ```` fence at 119. Line 122's bare closing fence terminates the *outer* block, so lines 123–126 render outside any block and lines 127–144 collapse into one untitled block that swallows the `security_review:` YAML schema.
- **Impact**: §4 is the Output Contract — the section a reviewing agent must follow most precisely. Neither `prettier --check` nor the suite caught it, because the raw text still satisfies the suite's YAML-block regex.
- **Recommendation**: Four-backtick outer fence.
- **Priority**: P2

**Issue: The six probe.mjs specs are referenced nowhere**
- **Severity**: MEDIUM
- **Category**: Quality (dead artifact / duplicate source of truth)
- **Bug Report**: [task.81.bug.2.probe-specs-referenced-nowhere.md](./task.81.bug.2.probe-specs-referenced-nowhere.md)
- **Observation**: `grep` for importers of `fixtures/*/probe.mjs` returns only the files themselves. `review-security.test.js` redeclares the same `{sink, entry}` objects.
- **Impact**: A declared Phase 2 deliverable ships unexercised, and the entry paths exist in two places where only one is executed — so the specs can drift while the suite stays green. That is a quieter instance of the presence-without-engagement problem this task exists to name.
- **Recommendation**: Import the specs; build `FIXTURES` from them.
- **Priority**: P2

### LOW Severity Issues (2)

- **Private-range guard over-blocks legitimate DNS names.** `skills/review-security/tests/fixtures/redis-tls/engaged.mjs:34` — `/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i` matches on string prefix, so `10.example.com` and `172.20.example.com` are rejected as private addresses. Verified by direct call. Not exercised by the corpus and it errs toward refusal, which is the safe direction for a security fixture — but it is an inaccuracy in code that models a correct control.
- **The suite reads the `shared/resources/` source rather than the bundled `references/` copy**, unlike the `review-pr` sibling precedent. A consumer install that copies the skill verbatim has no `shared/resources/`, so the suite would not run there.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS

25 tests, ~17s wall. The cost is child spawns: 12 corpus cases per fixture, and the suite memoises each
spec so four fixtures cost 48 spawns rather than re-running per assertion. Full `ci:fast` moved from 2701
to 2726 tests with no material runtime change.

### Reliability — PASS

The load-bearing property is that the verdicts are engine-computed. All four mutation proofs held, each
reding its own assertion and no others:

| Mutation | Result |
| --- | --- |
| Remove the `present-but-inert` branch | 2 red — exactly the two inert verdict tests |
| Rename the grep-decoy tokens | 1 red — the decoy assertion |
| Zero-case branch returns `engages` | 1 red — the vacuity test |
| Remove the test glob | gate log 2726 → 2701, no test name from this suite present |

### Security — PASS

No credentials, no network, no new dependencies. Fixtures are pure composers and execute only inside the
engine's sandbox (temp working dir, six-key env allowlist, write-escape sentinel). Note a pleasing
consistency: the skill's own documented command is `node …`, and `node` is deliberately absent from the
snippet executor's `SAFE_COMMANDS`, so Step 4b correctly **refused** to run it rather than executing an
arbitrary interpreter — the probe-boundary rule working as designed.

### Maintainability — CONCERNS

Driven by both medium findings: two sources of truth for the probe entry paths, and a core contract
section that renders incorrectly. Both live in the artifacts a future reader learns the contract from,
which is where an error costs most.

---

## Code Review

Step 3b, direct (no subagent — see Review Methodology). Whole-branch diff, first review.

**Correctness bugs (2):**
- [medium/high] `shared/resources/security-review-prompt.md:110-144` — nested three-backtick fences close the outer block early → four-backtick outer fence. **Promoted to gate `top_issues[]` as TASK81-001.**
- [medium/high] `skills/review-security/tests/fixtures/redis-tls/probe.mjs:1` (and the db-url peer) — spec files imported by nothing; the test redeclares the entry paths → import the specs. **Promoted to gate `top_issues[]` as TASK81-002.**

**Cleanups (3):**
- `skills/review-security/tests/fixtures/redis-tls/engaged.mjs:34` — prefix-matched private-range guard over-blocks `10.example.com` → anchor on octet boundaries.
- `skills/review-security/tests/fixtures/db-url/engaged.mjs:27` — `encodeURIComponent("app")` and `encodeURIComponent("appdb")` encode compile-time constants; harmless but reads as protection that is not doing anything, in a fixture whose subject is exactly that distinction.
- `skills/review-security/tests/review-security.test.js:40` — reads the shared source rather than the bundled copy, unlike `review-pr`.

**mutation-proven**: yes — all four proofs executed and restored, each verified to red only its own assertion.

Neither promoted finding is `high` severity, so under the deterministic rules the gate is CONCERNS, not FAIL.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Probe engine (`security-probe.test.mjs`, task.80) | PASS — 22 tests, unaffected by the comment-only edit |
| Bundle behaviour (`tests/bundle-mjs.test.js`) | PASS |
| Full hermetic suite (`npm run ci:fast`) | PASS — 2726 tests, 2725 pass, 0 fail, 1 skipped |
| Registration freshness (catalog, skill-deps) | PASS after running the generators — and the pre-fix failure is itself recorded, since it revealed `generate-skill-deps` is missing from the task's Phase 4 list |

No regressions.

---

## Test Artifacts

### Files Reviewed

`skills/review-security/SKILL.md`, `shared/resources/security-review-prompt.md`, the four fixtures and two
probe specs, `skills/review-security/tests/review-security.test.js`, `package.json`,
`skills/create-skill/scripts/generate_catalog.py`, four `docs/reference/` files, `CHANGELOG.md`,
`shared/resources/security-probe.mjs` (comment diff).

### Test Commands Executed

```bash
node --test 'skills/review-security/tests/*.test.js'
node --test 'shared/resources/tests/security-probe.test.mjs' 'tests/bundle-mjs.test.js'
npm run ci:fast
node shared/resources/qa-execute-snippets.mjs --file skills/review-security/SKILL.md --json
node shared/resources/qa-execute-snippets.mjs --file shared/resources/security-review-prompt.md --json
npx prettier --check skills/review-security shared/resources/security-review-prompt.md
```

### Step 4b — Documented command execution

| File | Blocks | runnable / placeholder / mutating | Outcome |
| --- | --- | --- | --- |
| `skills/review-security/SKILL.md` | 1 | 0 / 0 / 1 | `no-executable-blocks` (information, exit 0). The single block is `node --test …`; `node` is deny-listed by design, so refusal is correct and no configuration would change it. |
| `shared/resources/security-review-prompt.md` | 0 | 0 / 0 / 0 | No top-level bash blocks — **and this is the symptom that led to TASK81-001**: the `​```bash` block in §4 is nested inside a `​```markdown` fence, so the engine never saw it as a block. |

zsh available; both shells configured. No shell disagreements (nothing executed).

### Coverage Report

Not applicable — no coverage instrumentation in this repo. Coverage is expressed as mutation proofs,
reported above.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK81-001** — four-backtick outer fence in the reviewer prompt §4. P2.
2. **TASK81-002** — import the probe specs in the test. P2.

### Short-term Actions (Non-Blocking)

1. Anchor the private-range guard on octet boundaries.
2. Consider reading the bundled `references/` copy, matching `review-pr`.
3. Add `npm run generate-skill-deps` to the task's Phase 4 list (already recorded in the implementation report).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The behaviour is correct and its falsifiability is genuinely established — the verdicts
come from the engine and all four mutation proofs hold. Two medium defects in the shipped artifacts (a
mis-rendering contract section and an unreferenced declared deliverable) keep this off a clean PASS.
Neither is HIGH, so no FAIL.
**Quality Score**: 90/100 — 100 less 10 for the single NFR CONCERNS (Maintainability).

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Fix TASK81-001 before merge — §4 is the contract a reviewing agent follows.

---

**QA Report**: co-located at `task.81.qa.1.review-security-skill.md`
**Gate File**: co-located at `task.81.gate.1.review-security-skill.yml`
**Next Steps**: `/qa-fix` for TASK81-001 and TASK81-002, then re-review.
