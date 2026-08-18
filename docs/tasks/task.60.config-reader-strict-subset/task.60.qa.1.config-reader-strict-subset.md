---
id: task.60.qa.1
title: 'QA Report: Task 60 — Give the config readers awk tier a grammar, or make it refuse'
type: qa-report
task-ref: task.60.config-reader-strict-subset.md
status: complete
created: 2026-08-18
updated: 2026-08-18
---

# QA Report: Task 60 — Give the config reader's awk tier a grammar, or make it refuse

**Task**: [task.60.config-reader-strict-subset.md](./task.60.config-reader-strict-subset.md)
**Gate File**: [task.60.gate.1.config-reader-strict-subset.yml](./task.60.gate.1.config-reader-strict-subset.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**PR**: [#248](https://github.com/Gamaroff/agent-skills/pull/248) (OPEN)
**Gate Status**: CONCERNS

---

## Executive Summary

The work is strong and the hard parts are right: the subset is defined by a rule rather than a
shape, the refusal fires from the one position where its message is reachable, the message carries
both migration paths, and the sentinel cannot be forged from config data. The mutation audit is the
real thing — 21 mutations, three survivors found and each closed by adding the missing witness
rather than by adjusting the count.

One escalation of **the same class the task exists to close** survives, on the same tier, in the
same direction. A duplicated `access:` key is not in the refused set, so the scan reports the file
clean and the block reader takes the first match: with the permissive value written first, tier 2
resolves `full` at exit 0 while tier 1 halts. That is not a new defect introduced here — but §9's
functional criterion says *"No legal spelling of `access:` resolves more permissive than declared on
either tier"*, and this one does.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL
**Quality Score**: 80/100

---

## Review Methodology

Direct tools throughout. **Two documented deviations, both forced by session policy rather than
chosen**, and both recorded so the next reviewer knows what was not run:

- **Traceability mapper not dispatched.** The pipeline runs it as an Explore subagent; this session
  forbids Agent-tool dispatch. Success criteria were mapped internally against §9 instead.
- **Step 3b diff code review run directly rather than via a subagent**, for the same reason. The
  diff was read and probed by hand, which is what produced TASK-60-QA1-1.

The Adaptive Review Strategy would normally call for parallel agents here (6 phases, multiple
modules, security-adjacent). Direct tools were used instead. A reviewer weighing this gate should
know the breadth came from targeted adversarial probing, not from fan-out.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1 — Define and document the subset | PASS | Verified | Spec published in `platform-detection.md`; validated against all three corpora, and §43 derives the canonical example config from the doc at run time so it cannot drift |
| 2 — Give tier 2 a third answer | CONCERNS | Verified | `__UNSUPPORTED__`, the source-time scan and the tier-1 `__MAP__` split all correct. Duplicate keys not covered — see TASK-60-QA1-1 |
| 3 — Propagate the refusal | PASS | Verified | Hoisted above the identity block; `__UNREADABLE__` folded in and deleted rather than run beside it; `resolve-paths.sh` never-fail contract intact (§26) |
| 4 — Carry the parse-failure reason | PASS | Verified | `__ERR__:<line>:<reason>`, sanitised before framing; the enumerated-shapes workaround retired |
| 5 — Make the suite hold it | CONCERNS | Verified | 285 → 371 assertions; §30 inverted and §41 migrated as specified. CI install robustness — see TASK-60-QA1-2 |
| 6 — Retire the documentation | PASS | Verified | Warnings removed from both docs; LIMIT-1/2 marked closed in task.51 with the original descriptions retained as the record |

**Overall Phase Completion**: 6/6 phases implemented, 2 carrying issues.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No legal spelling of `access:` resolves more permissive than declared on either tier | 0 routes | **1 route open** (duplicate key) | **CONCERNS** |
| Every in-subset construct resolves identically on both tiers | all | all (§41, 13 shapes) | PASS |
| Every out-of-subset construct produces a refusal naming line + construct | all | all (§42, 8 shapes) | PASS |
| A refused config halts through a real guarded call site | yes | yes (§46, bash + zsh) | PASS |
| `resolve-paths.sh` still never fails | yes | yes (§26) | PASS |
| Own config + canonical example config inside the subset | both | both | PASS |
| Refusal fires from one site above the identity block, asserted on stderr | yes | yes (§42, M5 → 18 failing) | PASS |
| Mapping-valued `access.tracker` refuses on tier 1 as well | yes | yes (§42b, both tiers) | PASS |

### Performance

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No additional process spawns per source beyond one awk pass | ≤1 awk | awk tier 8→9, python tier 13→13 | PASS |
| Source time unchanged within noise | unchanged | no python spawns added | PASS |

Independently reproduced, not taken from the report.

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| §41 deleted, not repaired | deleted | deleted, 4 fixtures migrated | PASS |
| Every new invariant mutation-witnessed | all | 21 mutations recorded | PASS |
| Zero surviving mutations | 0 | 0 (after 3 closed) | PASS |
| `npm test`, `validate:all`, Prettier, bundle idempotent | green | green | PASS |
| Verified under bash and zsh, and on a genuine awk-only host | yes | yes (§46) | PASS |
| Green under BWK awk, gawk and mawk with both in CI | all three | **BWK only observed** | CONCERNS |

---

## Issues Found

### MEDIUM Severity (2)

**TASK-60-QA1-1 — a duplicated `access:` key resolves permissively on tier 2**

- **Category**: Functional / Security
- **Observation**: reproduced against the branch —

  ```
  access:
    tracker: full
  access:
    tracker: manual
  ```

  | Tier | Result |
  | --- | --- |
  | python | `rc=1` — halts on the duplicate key |
  | awk | `rc=0`, `ACCESS_TRACKER=full` |

  The scan reports `_CONFIG_SUBSET_VERDICT=-` (clean), and `read_nested_config_key`'s block matcher
  `exit`s on the first matching child, so the *first* block wins. YAML says last-wins (`manual`).
  The same holds for a duplicated child: `access:\n  tracker: full\n  tracker: manual` → `full`.

- **Why it matters**: `read-config.sh:81` describes this precise shape as the reason tier 1 rejects
  duplicates — *"a copy-pasted second `access:` block made the first one vanish, silently resolving
  a declared `manual` back to `full`"*. Tier 1 closed it in task.51; tier 2 still has it, and tier 2
  is the default tier on a stock macOS host. It is the exact failure mode this task was written to
  end, reachable by the most ordinary editing accident there is.
- **Impact**: inert today (nothing consumes `ACCESS_TRACKER`), which is precisely the condition
  task.51 was accepted under — and task.52 removes it.
- **Recommendation**: add duplicate detection for the guarded keys to `_config_subset_scan` — a
  repeated top-level guarded key, and a repeated child under a guarded parent — and refuse. Cheap:
  the scanner already walks every line and already knows the guarded set. Add both shapes to the
  refusal matrix and a mutation witness.

**TASK-60-QA1-2 — the awk-variant CI install can fail the whole Test job**

- **Category**: Quality / CI
- **Observation**: `sudo apt-get install -y --no-install-recommends gawk mawk` runs with no
  preceding `apt-get update`.
- **Impact**: a stale package index on the runner fails the step, and the step sits *before*
  `npm test`, so an unrelated infrastructure flake turns into a red build on every PR. It is also
  the step that gives §45 its meaning, so its reliability is load-bearing rather than incidental.
- **Recommendation**: add `sudo apt-get update` before it, or make the step non-fatal so §45
  degrades to its printed SKIP instead of failing the job.

### LOW Severity (2)

- **The else-branch of the hoisted refusal is indented at the outer level** in
  `resolve-platform.sh`, so on a skim the halt message reads as unconditional rather than as the
  `access`-may-be-declared branch. Functionally correct; this is a security-relevant branch where a
  misread is expensive.
- **The alias rule `(^|[[:space:]])\*[A-Za-z0-9_]` does not match an alias whose name starts with a
  non-alphanumeric** (e.g. `*.d`). Not exploitable — a legal alias needs an anchor earlier in the
  file, `&[^[:space:]]` catches it, and the scan reports the first offender — but the narrowness is
  deliberate and the comment should say so rather than leaving the next reader to work it out.

**Total**: HIGH 0, MEDIUM 2, LOW 2.

---

## Breaking Changes Validation

### BC-1 — a config outside the subset now halts on a host without pyyaml

Documented: **Yes** · Migration path: **Yes, two** · Tested: **Yes** (§42 asserts both appear in
stderr) · Consumer code updated: **N/A**

The migration paths are in the *message*, not only the docs, which is the right call — the operator
who hits this is on a host without `pyyaml` and will not go looking. §42 asserts the line number,
the construct name, `pip install pyyaml` and the `platform-detection.md` pointer all appear, so the
message cannot silently degrade into a bare `rc=1`.

BC-1 was also correctly **narrowed during implementation**: a config that provably declares no
`access:` warns and degrades rather than halting. That matches the file-state table in
`platform-detection.md` and is the right asymmetry.

### BC-2 — `__ERR__` gains structure

Documented: **Yes** · Migration path: **N/A** (internal) · Tested: **Yes** · Consumers updated:
**Yes** — `resolve-paths.sh` unaffected, verified by §26.

**Overall**: PASS.

---

## NFR Assessment

### Security — CONCERNS

Closes a real escalation class in the fail-closed direction, including the tier-1 half that was
never an awk problem. The anti-forgery property is genuinely held rather than assumed: the hoisted
check reads the verdict global, and `tracker: __UNSUPPORTED__` on a clean file is asserted to stay
DATA and fail enum validation (§42c). Mutation M7 — routing the check through a reader's stdout —
goes red.

CONCERNS solely for TASK-60-QA1-1.

### Performance — PASS

See Success Criteria. Independently reproduced.

### Reliability — PASS

The awk-died fallback is the detail that earns this: a failed `awk` produces no output, which was
byte-identical to "found nothing outside the subset" — the task's own defect one layer down. Caught
by the audit, closed, and witnessed. `resolve-paths.sh` keeps its never-fail contract.

### Maintainability — CONCERNS

Comments are better than this repo's already-high bar; every non-obvious decision carries its
reason at the point a reader meets it. Deductions for TASK-60-QA1-2 and the indentation LOW.

---

## Code Review

Read directly rather than via subagent (see Review Methodology).

**Correctness bugs (1):**

- [medium/high] `shared/resources/read-config.sh` (`_config_subset_scan`) — a duplicated guarded key
  is not refused, so the tier-2 first-wins block reader can return the permissive value where tier 1
  halts → add duplicate detection for guarded keys (TASK-60-QA1-1, promoted to gate `top_issues`
  under `code_review_blocking=true`)

**Cleanups (2):**

- `shared/resources/resolve-platform.sh` (hoisted refusal) — else-branch indented at the outer level
  → re-indent to match nesting
- `shared/resources/read-config.sh` (alias rule) — state why the rule is deliberately narrow, and
  that the anchor rule covers what it misses

---

## Regression Testing

| Area | Result |
| --- | --- |
| `resolve-platform.test.sh` | 6/6 PASS |
| `bitbucket-auth.test.sh` | PASS |
| `resolve-paths.sh` sentinel containment (§26) | PASS — no sentinel reaches `PRD_ROOT`/`ARCH_ROOT` on either tier |
| Repo's own config through the real resolver | `rc=0`, unchanged on both tiers |
| 92 bundled copies | verified as pure regeneration — each differs from its source by exactly one generated header line |

---

## Test Artifacts

```bash
bash shared/resources/tracker-access.test.sh      # 371 passed, 0 failed
bash shared/resources/resolve-platform.test.sh    # 6 passed, 0 failed
npm test                                          # 1287/1287
npm run validate:all                              # 115/115
npm run format:check                              # clean
npm run bundle                                    # idempotent
```

Skips observed and accounted for: §45 prints SKIP for `gawk` and `mawk` (neither installed on this
host). The dev flagged this rather than claiming it — correct, and it is why the CI step's
reliability is a MEDIUM rather than a nitpick.

---

## Verification of the dev's two flagged items

1. **gawk/mawk unobserved** — confirmed. §45 skips loudly, never silently, and the CI step exists.
   Downgraded from a blocker to CONCERNS on the success criterion, with TASK-60-QA1-2 raised
   against the step's robustness.
2. **Three deviations from the plan** — all three reviewed and all three are **correct**:
   - *Local/non-local split* — verified necessary: a uniformly file-wide radius refuses §14's
     `"my key": 1` fixture, which exists precisely because over-rejection once bricked pipelines.
   - *Degrade instead of halt when no access is declared* — matches the documented file-state table
     and preserves §8. Gated on the same fail-closed probe as the malformed branch.
   - *Tier-1 fix needed in the bulk path* — verified: `_rp_val` yields nothing for a signal, so the
     strict reader is never reached when tier 1 is available. §42b passing on the python tier is the
     proof.

Deviating from the plan here was the right call in all three cases, and each is recorded with its
reasoning in the task's Implementation Record.

---

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL

**Conditions**:

1. TASK-60-QA1-1 closed, or consciously accepted and recorded as a known limit with a test pinning it
2. TASK-60-QA1-2 closed so CI reliably exercises `gawk`/`mawk`

Nothing here argues against the approach or the implementation. The subset is well-chosen, the
refusal is in the right place, and the audit is honest — including about its own gaps. The one
functional finding is the same defect class, one spelling further along, and the task's own success
criterion is what makes it blocking rather than a note.
