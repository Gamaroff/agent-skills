# QA Report: Task 144 - security-probe: a `cli:` entry form (cycle 3)

**Task**: [task.144.probe-engine-cli-entry-form.md](./task.144.probe-engine-cli-entry-form.md)
**Gate File**: [task.144.gate.3.probe-engine-cli-entry-form.yml](./task.144.gate.3.probe-engine-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue (gate 2) | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-1: a re-run with a per-run path adds a second control | medium | **FIXED** for the reported shape; **over-corrected** | Replay gives 1 control and `executed: 2`. Restoring whole-template keying turns `re-running one control … REPLACES its entry` **red** (`covered`). The new key merges distinct controls — see CR-1 |
| CR-2: `{sink, entry}` identity prose is stale | low | FIXED | security-review-prompt, review-security SKILL.md, engine comments |
| CR-3 (advisory): caught-crash wording | low | **PARTIAL** | Corrected in the wrong direction — see CR-2 below |
| CR-4 (advisory): population test is file-scoped | low | FIXED | Block-scoped. It went red on a reverted limit 3 in a file that names `cli:` five other times |
| CR-5 (cleanup): materialised-sink note | low | FIXED | Documented in §5 |

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs` `cliControlSlot` — **CR-1**. Keying only on the
  element before `{input}` merges two different controls that share that flag or position:
  `--set D.1 blocked --note {input}` and `--accept D.1 --note {input}` both key as `--note`, and
  `add {input}` and `remove {input}` both key as `#1`. The later run silently replaces the earlier
  one. That is the defect the key was introduced to prevent, now in the opposite direction from
  QA-1. Fix: key on the skeleton, keeping flags and bare positionals and dropping only operand values.
- **[low, advisory]** CR-2 — the cycle-2 rewrite says `expected` "does not rescue" a caught crash and
  "never a false pass". In fact, without `expected` a caught crash on a hostile case scores `rejected`,
  which **is** a false pass. An `expected` that only a refusal produces is what turns it into a
  false alarm.
- **[low, advisory]** CR-3 — the element-before-slot heuristic reads a boolean flag before a
  positional `{input}` as the guarded flag, and reads a `-1` value as a flag.
- **[cleanup]** CR-4 — the record test's title and comment still say it keys on the template.

---

## Testing Scope

### Review Methodology

Direct tools, plus one Explore reviewer over the scoped diff: 7 files and 1804 lines, weighted to the
348-line cycle-2 delta. Step 4b is unchanged; no fenced blocks were added.

Re-review scope: since 2026-09-23T18:16:28Z (default; prior gate security `OK measured`).

---

## NFR Assessment

- **Security — PASS.** Evidence: measured, 17 probes executed. The `--argv` validator engages
  17 of 17 on the committed tree. Record: `task.144.qa.3.security.run.json`.
- **Performance — PASS · Reliability — PASS · Maintainability — PASS.** CR-1 is carried in
  `top_issues[]`.

---

## Code Review

**Correctness bugs (3):**

- [medium/high] `security-probe.mjs:1685` — the guarded-flag key merges distinct controls → **promoted, CR-1**
- [low/medium] `probe-boundary-rule.md:260` — the caught-crash false-pass case is misstated → advisory
- [low/low] `security-probe.mjs:1688` — boolean-flag / negative-value heuristics → advisory

**Cleanups (1):**

- `security-probe.test.mjs:2106` — the test title and comment still say template keying

**Mutation proofs:**

- mutation-proven: restore whole-template keying → `re-running one control with a different per-run operand REPLACES its entry` → covered

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **HIGH**: 0 · **MEDIUM**: 1
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed
**Next Steps**: `/qa-fix` cycle 3
