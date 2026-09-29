# QA Report: Task 144 - security-probe: a `cli:` entry form (cycle 2)

**Task**: [task.144.probe-engine-cli-entry-form.md](./task.144.probe-engine-cli-entry-form.md)
**Gate File**: [task.144.gate.2.probe-engine-cli-entry-form.yml](./task.144.gate.2.probe-engine-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status    | Evidence                                                                                                                                                                                     |
| -------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-1 (gate 1): `review-security/SKILL.md` routes non-JS to `shell:` only | medium   | **FIXED** | Limit 3 now names `shell-fn:` and `cli:` (37665841). The population test and the limits test both went **red** when the old text was restored from a `cp` snapshot, and green when it was put back |
| CR-2 (gate 1, advisory): caught crash scored as a refusal | low      | PARTIAL   | Documented, but the documented remedy is wrong. See CR-3 below                                                                                                                                |
| CR-3 (gate 1, cleanup): `materialiseFixture` ternary | low      | FIXED     | Collapsed to one call; the 15 cli tests are green                                                                                                                                             |

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs` (`controlKey`) — **QA-1**. A `cli:` control is keyed
  on its whole argv template, so a re-run that differs only in a per-run operand records a **second
  control**. Reproduced: one control, run twice with the `--cases` operand pointing at two temp
  files, gives `controls: 2` and `executed: 4`. This overstates `probes_executed` and leaves the
  first verdict in `--emit-block`. The refute reviewer raised it as CR-1 (medium, medium
  confidence), and this cycle confirmed it by execution. Fix: key on an identity that is stable
  across re-runs, and add a replace-on-re-run test.
- **[low]** `shared/resources/security-review-prompt.md:168` and others — **CR-2**. The record-identity
  statements still say one entry per `{sink, entry}`, and that a re-run of the same pair replaces
  its own. The other sites are `skills/review-security/SKILL.md` lines 82, 90 and 122, and the
  engine comments at lines 1644, 1795 and 1838.
- **[low, advisory]** CR-3: the cycle-1 guidance says "give it an `expected` that only the refusal
  produces". That does not turn a caught crash into could-not-look. A hostile case whose run
  mismatches `expected` scores **accepted** — a reproduction. That is a false alarm rather than a
  false pass, but the doc states the opposite.
- **[low, advisory]** CR-4: the new population test checks for `cli:` anywhere in a file, not in the
  routing statement itself.
- **[cleanup]** CR-5: for a materialised sink, the `cli:` arm writes the case name into the fixture
  and declines a name that carries a `/`.

---

## Testing Scope

### Review Methodology

Direct tools, plus one Explore reviewer. This is cycle 2, which is always the refute pass: the whole
`origin/develop...HEAD` diff (19 files, 1869 lines) was re-read under the REFUTE directive, starting
from cycle 1's fixes.

Re-review scope: unscoped (cycle 2 refute pass; prior gate security `OK measured`, so no safety re-probe).

---

## Implementation Verification

| Phase   | Status   | Notes                                                                 |
| ------- | -------- | --------------------------------------------------------------------- |
| Phase 1 | PASS     | —                                                                     |
| Phase 2 | CONCERNS | QA-1: the record key for `cli:` controls is not stable across re-runs |
| Phase 3 | PASS     | —                                                                     |
| Phase 4 | CONCERNS | CR-2: record-identity prose not updated                                 |

---

## Success Criteria Verification

Same as cycle 1, with one change. **"Two `cli:` probes of one script with different templates land
in two record entries"** still holds, but it holds too broadly: two runs of the *same* control with a
different path operand also land in two entries (QA-1). The criterion needs a partner: a re-run of
one control replaces its entry.

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17
- The `--argv` validator was re-probed through the `cli:` form against the current engine and
  **engages 17/17**. Record: `task.144.qa.2.security.run.json`.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

QA-1 is carried in `top_issues[]` rather than as an NFR concern.

---

## Code Review

This was the refute pass (Step 3b cycle 2), run by an independent Explore reviewer over the whole
branch diff.

**Correctness bugs (4):**

- [medium/medium] `security-probe.mjs:866` — the cli: control key includes per-run paths, so re-runs add controls → **confirmed by execution, entered as QA-1**
- [low/high] `security-review-prompt.md:168` — `{sink, entry}` identity sites are stale → **promoted, CR-2**
- [low/medium] `probe-boundary-rule.md:261` — the caught-crash remedy is misdescribed → advisory
- [low/medium] `probe-boundary-signals.test.mjs:257` — the population test is file-scoped → advisory

**Cleanups (1):**

- `security-probe.mjs:1520` — the cli: arm declines slash-bearing names on a materialised sink → advisory

**Mutation proofs (cycle 1's fixes):**

- mutation-proven: restore the old review-security limit 3 → `every site that routes a non-JS entry names the cli: form too` → covered
- mutation-proven: restore the old review-security limit 3 → `the skill states its own limits` → covered

**Step 4b**: nothing new in this cycle — no fenced blocks were added (see cycle 1).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Rationale**: One medium finding (QA-1, reproduced) and one low (CR-2). No HIGH findings, and every NFR is PASS.
**Deployment Recommendation**: CONDITIONAL — QA-1 and CR-2 fixed
**Next Steps**: `/qa-fix` cycle 2
