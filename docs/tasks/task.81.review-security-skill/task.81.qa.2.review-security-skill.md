# QA Report: Task 81 - Ship `/review-security` (cycle 2)

**Task**: [Link to task document](./task.81.review-security-skill.md)
**Gate File**: [task.81.gate.2.review-security-skill.yml](./task.81.gate.2.review-security-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**Gate Status**: CONCERNS

---

## Executive Summary

Both cycle-1 findings are fixed and were verified independently rather than taken on the fix record's
word. The mandatory cycle-2 refute pass then found one new medium defect, and it is the most
interesting finding of the run: the *engaged* fixture — the artifact that models what a control that
engages looks like — carries a loopback guard that accepts three standard encodings of 127.0.0.1
while its comment states that it refuses loopback.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Cycle 2 is a full refute pass** (`REFUTE_PASS=true`, one prior gate), so the whole branch diff was
re-read to find a claim that is false rather than to confirm the change works. `SAFETY_REPROBE=false`
— the prior gate's security axis was PASS.

Direct tools; subagent dispatch barred in this session, recorded as at every prior step. The reviewer
is the author, which remains a real limit on this gate — mitigated by every finding here being
mechanically demonstrable rather than a matter of judgement.

Re-review scope: **unscoped** (cycle 2 is always the whole branch diff, per the step contract — the
files changed since the last gate are exactly cycle 1's own fixes, and reading only those would never
re-read the original change with what cycle 1 taught).

---

## Re-Review Context

| Previous issue | Status | How verified |
| --- | --- | --- |
| **TASK81-001** — nested fences corrupt prompt §4 | **FIXED** | Block boundaries re-derived from the source: three balanced top-level blocks (`js` 41–43, `markdown` 110–127, `yaml` 131–144). The example block is complete and the YAML schema is its own block. Also confirmed in the bundled copy. |
| **TASK81-002** — probe specs imported by nothing | **FIXED** | Mutation, not inspection: renaming a spec's export to one that does not exist now reds **3** tests including the drift guard. The same mutation was green before the fix. |

Both bug reports are at **Ready for QA** and are verified closed by this cycle.

Worth recording: the cycle-1 fix for TASK81-002 itself contained a defect that was caught before it
shipped — the new drift guard first asserted only on `resolveEntry(...).ok`, which validates shape and
containment rather than existence. That is the correct outcome of an adversarial pass over a fix, and
it is the reason this loop exists.

---

## New Findings This Cycle

- **[medium]** `skills/review-security/tests/fixtures/redis-tls/engaged.mjs:34` — the loopback/private
  guard recognises only dotted-quad IPv4, so `127.1`, `0177.0.0.1` and `2130706433` are accepted while
  the comment above claims an external destination must not resolve to the local machine →
  fail closed on digits-and-dots hosts that are not a clean four-octet quad, and narrow the comment.
  ([bug 3](./task.81.bug.3.loopback-guard-overclaims.md))
- **[low]** `skills/review-security/SKILL.md` — frontmatter description is 149 words against the
  ~100-word guidance in `coding-standards.md`, and longer than the longest sibling (`review-pr`, 130)
  → trim, keeping the discriminator first.

Measured, not asserted:

| Input | Resolves to | Result |
| --- | --- | --- |
| `127.0.0.1` | loopback | REJECTED ✅ |
| `127.000.000.001` | loopback | REJECTED ✅ |
| `127.1` | loopback (shorthand) | **ACCEPTED** |
| `0177.0.0.1` | loopback (octal) | **ACCEPTED** |
| `2130706433` | loopback (bare decimal) | **ACCEPTED** |
| `1.2.3.4.5` | not an address | **ACCEPTED** |
| `8.8.8.8` | public | accepted ✅ (correct) |
| `db.internal.example.com` | DNS | accepted ✅ (correct) |

**Why this is medium and not low.** In absolute terms it is a test fixture that still scores `engages`
against the corpus, which is its functional job. In context it is the worst possible place for the
defect: this fixture is what a reader consults to see what a correct control looks like, inside a skill
whose subject is controls that are present, believed, and inert. A reader who copies the guard inherits
a loopback bypass, having been told by the comment that loopback is covered.

The steady-state suite could not have found it — every corpus case still passes. It took the refute
pass asking which claim is false.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Prompt and output contract | PASS | §4 renders correctly after the cycle-1 fix |
| Phase 2: Fixtures | CONCERNS | TASK81-003 |
| Phase 3: Falsifiability | PASS | 27 tests; drift guard added and itself mutation-proven |
| Phase 4: Registration | PASS | Unchanged; freshness green |

---

## Success Criteria Verification

Unchanged from cycle 1 and still met, with one row improved:

| Criterion | Cycle 1 | Cycle 2 |
| --- | --- | --- |
| Inert fixtures report `present-but-inert` | PASS | PASS |
| Engaged fixtures report `engages` and state what was probed | PASS | PASS |
| Emits a gate-consumable block with `evidence:` / `probes_executed` | CONCERNS (contract rendered wrong) | **PASS** — §4 fixed |
| Cannot emit a bare PASS | PASS | PASS |
| Zero probes → `unverifiable` | PASS | PASS |

The cycle-1 honesty note stands unchanged and is not re-raised as a defect: `evidence: measured ⇒
probes_executed > 0` is enforced against the prompt's documented example, because v1 ships no emitter.
Wiring is `task.82`.

---

## NFR Assessment

### Security — CONCERNS (was PASS)

Downgraded solely because TASK81-003 is a security-shaped inaccuracy in a security-teaching artifact.
Nothing in a product path is affected: no credentials, no network, no new dependencies, sandbox
containment unchanged.

### Performance — PASS
27 tests; full gate 2726 → 2728. No material change.

### Reliability — PASS
Cycle-1 fixes mutation-proven and independently re-verified this cycle.

### Maintainability — PASS (was CONCERNS)
Both drivers resolved: the duplicate source of truth is gone, and the contract section renders
correctly. One deliberate deviation stands, recorded with its reason.

---

## Code Review

Cycle 2, full refute pass over the whole branch diff.

**Correctness bugs (1):**
- [medium/high] `skills/review-security/tests/fixtures/redis-tls/engaged.mjs:34` — loopback guard
  accepts non-dotted-quad encodings while claiming otherwise. **Promoted to gate as TASK81-003.**

**Cleanups (2):**
- `skills/review-security/SKILL.md` — description 149 words vs ~100 guidance. Promoted as TASK81-004 (low).
- `skills/review-security/tests/fixtures/db-url/engaged.mjs:27` — `encodeURIComponent` on compile-time
  constants; carried forward from cycle 1, still advisory.

**Transition probes** (bulk teardown / in-flight / error path / reconnect): not applicable — the
fixtures are pure synchronous composers with no lifecycle, subscription, cache or emission. Stated
rather than silently skipped.

**Combination review**: the three cycle-1 fixes were re-read as one change. The fence fix and the spec
import touch disjoint files; the IPv4 fix is the one that introduced TASK81-003, and it did so by
*replacing* a prefix test that had the same gap in a different form — the earlier version also accepted
`127.1`. So the fix did not regress anything; it corrected one inaccuracy and left a larger one visible.

**mutation-proven**: yes — TASK81-002's fix re-proven this cycle by export-rename (3 red).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (task.80) | PASS |
| Full hermetic suite (`npm run ci:fast`) | PASS — 2728 tests, 2727 pass, 0 fail, 1 skipped |
| Registration freshness | PASS |

No regressions.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Both prior findings verified fixed. One new medium, found by the refute pass, in the
artifact least able to afford it. No HIGH, so no FAIL.
**Quality Score**: 90/100 — 100 less 10 for the single NFR CONCERNS (Security).

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Fix TASK81-003.

---

**Next Steps**: `/qa-fix` cycle 2 for TASK81-003 (and TASK81-004 if cheap), then re-review.
