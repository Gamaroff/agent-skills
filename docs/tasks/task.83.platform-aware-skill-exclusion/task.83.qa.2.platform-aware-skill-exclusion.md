# QA Report: Task 83 - Platform-aware skill exclusion in setup-consumer.sh (Cycle 2)

**Task**: [Link to task document](./task.83.platform-aware-skill-exclusion.md)
**Gate File**: [task.83.gate.2.platform-aware-skill-exclusion.yml](./task.83.gate.2.platform-aware-skill-exclusion.yml)
**Previous Cycle**: [task.83.qa.1.platform-aware-skill-exclusion.md](./task.83.qa.1.platform-aware-skill-exclusion.md) (FAIL, 70/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

Both cycle-1 findings are genuinely fixed, verified by re-running the differential that found them and
by re-running the end-to-end repro: a repo whose config says `tracker: "jira"` now installs
`sync-jira-story` and `jira-sprint-manager` and prunes `sync-github-story` — exactly inverted from
cycle 1. The fixes are mutation-proven, and M5 in particular shows the two halves of the CR-001 fix
cover different cases rather than one being decorative.

The refute pass found one new defect, and it is in cycle 1's own fix rather than in the original
change: the new `runtimeTracker()` test helper scrubs `JIRA_URL` and `TRACKER` from the environment
but not `SKILLS_CONFIG_FILE`, which `resolve-platform.sh` honours as an explicit config-path override.
The helper it was modelled on scrubs its list precisely to stop an ambient variable flipping a
resolver assertion; the new one did not extend that list. Demonstrated: with `SKILLS_CONFIG_FILE`
exported, the ten parity cases read someone else's config instead of their fixture.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools. **Cycle 2 is the refute pass** — the whole `origin/develop...HEAD` diff re-read to find
the claim that is false, starting with cycle 1's fixes as the least-reviewed code in the change set.
Not narrowed to files changed since gate 1, per the loop's cycle-2 rule.

```
Re-review scope: unscoped (cycle 2 refute pass — whole branch diff, 9 files)
```

`SAFETY_REPROBE`: false — gate 1's `nfr_validation.security.status` was PASS and neither `top_issues`
entry sat on a safety axis.

**Step 4b (Execute the Documented Commands): not applicable** — no `SKILL.md` and no
`shared/resources/*.md` in the change set.

The four transition probes the refute directive names (bulk teardown, in-flight, error path,
reconnect) have no surface here: the changed code is a pure shell parser with no emission,
subscription, caching or lifecycle. The equivalent adversarial work was done against the parser's own
state space — malformed and unusual config shapes, ambient environment, and the interaction between
the two halves of the fix. Findings below.

---

## Re-Review Context

| # | Cycle 1 finding | Status | Evidence |
| - | ---------------- | ------ | --------- |
| CR-001 (HIGH) | Quoted / CRLF `tracker:` resolved `github` at install and `jira` at runtime | **FIXED** | The differential that found it re-run at HEAD: `tracker: "jira"`, `tracker: 'jira'`, CRLF and `tracker: "github"` all agree. End-to-end repro re-run: `Filtering skills for tracker: jira … 3 new, 1 skipped (jira)`, installing `sync-jira-story` + `jira-sprint-manager`. Mutation-proven M4/M5. |
| CR-002 (MEDIUM) | Installer probes `.env` for `JIRA_URL`; runtime resolver does not | **FIXED as documented** | Resolved via the gate's second permitted option: probe kept, comment and CHANGELOG corrected, asymmetry pinned by a test whose failure message names the follow-up. Mutation-proven M6. The reasoning for choosing this over deleting the probe is recorded in `task.83.bug.2` and is sound — the installer runs once in a plain shell, the skills run later in a shell that has `JIRA_URL`. |
| CR-003 (LOW) | Invalid scalar silently defaults where runtime halts | **NOT FIXED** | Correctly left in `recommendations.future`; not a blocker. See RF-002 below, which is the same class. |
| shellcheck criterion | Unverified — not installed on this host | **STILL UNVERIFIED** | Unchanged. `bash -n` clean. |

Both promoted issues are closed. Neither fix reopened the other.

---

## New Findings This Cycle

- **[medium]** `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs:132-146` — the new
  `runtimeTracker()` helper builds its environment by deleting `JIRA_URL` and `TRACKER`, copying
  `callFn()`'s list, but **not `SKILLS_CONFIG_FILE`**. `resolve-platform.sh` honours that variable as
  an explicit override of which config file to read, so an ambient value redirects every parity case
  away from its fixture. Demonstrated: fixture says `tracker: jira`, `SKILLS_CONFIG_FILE` points at a
  file saying `tracker: github` → `runtime=github`, `install=jira`, and all ten parity cases fail
  against code that is correct. `callFn`'s own comment states the hazard verbatim — "so an ambient one
  in the developer's shell cannot silently flip a resolver assertion" — so this is a list that was not
  extended, not a hazard nobody knew about.
  → add `delete clean.SKILLS_CONFIG_FILE` to both helpers, and add a regression test that exports a
  decoy `SKILLS_CONFIG_FILE` and asserts the fixture still wins.
  Bug report: [task.83.bug.3.test-env-scrub-incomplete.md](./task.83.bug.3.test-env-scrub-incomplete.md)

- **[low]** `scripts/setup-consumer.sh` — `tracker:<TAB>jira` resolves `jira` at install and `github`
  at runtime. **Pre-existing, not introduced by cycle 1**: the pre-fix script at `9edb699` returns
  `jira` for the same input, so the widened pattern did not cause it. A tab there is malformed YAML —
  `yaml.safe_load` raises on it — so the runtime is right to refuse and the installer is simply more
  permissive about input nobody should write. Same class as CR-003; belongs with it in `future`, not
  in `top_issues`.

Nothing else. Probes run and found clean: `tracker:` nested under `access:` (not matched — the
pattern is anchored), the flow-mapping form `tracker: {workflowFile: …}` (falls through to the
default, identically to the pre-fix script and to the runtime), duplicate `tracker:` keys (both take
the same one), a value that is only a comment, a quoted value with inner trailing space (both refuse),
mismatched quote pairs (`'jira"` — falls through, not repaired), and CR ordering (awk's trailing-space
trim and the bash CR strip are redundant with each other, so either alone suffices — belt and braces,
not a bug).

---

## Implementation Verification

| Phase                                   | Status | Test Result | Notes                                                             |
| --------------------------------------- | ------ | ----------- | ------------------------------------------------------------------ |
| Phase 1 — Classification and resolver   | PASS   | Verified    | Was CONCERNS in cycle 1; the value parsing now mirrors the runtime reader, which is what the phase asked for |
| Phase 2 — Wire the filter into the loop | PASS   | Verified    | Unchanged by cycle 1; grandfather rule still mutation-proven        |
| Phase 3 — Tests                         | CONCERNS | Partial   | 34 tests green and the parity block is well-shaped, but the new helper's env scrub is incomplete — RF-001 |
| Phase 4 — Documentation                 | PASS   | Verified    | The CHANGELOG's over-claim is corrected and now states what it covers |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

All cycle-1 criteria re-checked; only the deltas are listed.

| Criterion                                                | Cycle 1  | Cycle 2 | Notes                                                 |
| -------------------------------------------------------- | -------- | ------- | ------------------------------------------------------ |
| `--update` resolves the tracker with no wizard run       | CONCERNS | **PASS** | The quoted/CRLF hole is closed                        |
| `npm run ci:fast` green including the new suite          | PASS     | PASS    | 2355 tests, 0 fail, 1 skipped, prettier clean          |
| New suite runs under the existing glob                   | PASS     | PASS    | 34 tests (22 + 12 parity), `package.json` still unmodified |
| Every fix mutation-proven                                | PASS     | PASS    | M4/M5/M6 this cycle, on top of the developer's 7 and QA's M1–M3 |
| `shellcheck` no new warnings                             | CONCERNS | CONCERNS | Still not installed on this host                      |

---

## Code Review

Scope: whole-branch diff at `60a95b8`, refute pass.

**Correctness bugs (2):** RF-001 (medium/high) and RF-002 (low/high) — stated in full under **New
Findings This Cycle** above rather than restated here.

RF-001 is promoted to gate `top_issues[]` under `code_review_blocking`. RF-002 is advisory and joins
CR-003 in `recommendations.future`.

**Cleanups (1):**

- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs:137-146` — `runtimeTracker()`
  discards the resolver's exit status (`source … >/dev/null 2>&1`). For the ten current cases this
  degrades safely: a resolver that returned non-zero would leave `TRACKER` unset or wrong and the
  parity assertion would fail rather than pass. But it means a future regression that makes
  `resolve-platform.sh` *refuse* a legal config is diagnosed as "the two resolvers disagree" rather
  than "the runtime resolver errored", which is a worse error message than the test could give.
  Capturing the status and asserting 0 would cost one line. Advisory.

**Mutation proving (Step 3c)** — the fixes made this cycle, each reverted and confirmed red:

| # | Mutation                                                          | Result                                                              | mutation-proven |
| - | ------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------- |
| M4 | Restore the whole pre-fix read (`[a-z]` pattern + `print $2`)      | `double-quoted`, `single-quoted`, `CRLF line ending` red             | yes             |
| M5 | Keep the new pattern, remove **only** the bash normalisation       | `double-quoted`, `single-quoted` red; CRLF still passes              | yes             |
| M6 | Remove the `.env` probe                                            | `DELIBERATE asymmetry` and `JIRA_URL in .env resolves jira` red      | yes             |

M5 is the one that earns its keep: it proves the widened awk pattern and the bash normalisation cover
*different* inputs, so neither is dead code riding on the other's coverage.

---

## NFR Assessment

### Performance — PASS

Unchanged. The added normalisation is two bash parameter expansions and a `case`; the awk does three
`sub()` calls on one line. The parity tests add ~9s to the suite (eleven `source` calls of the real
resolver) — a deliberate and worthwhile trade for testing the real thing rather than a mock.

### Reliability — CONCERNS

The headline mode is closed: a legal config no longer produces a silently wrong install, and the
guard is a parity assertion against the real resolver rather than a hardcoded expectation, so the two
implementations cannot drift together and still pass.

Two residuals keep this off PASS. The **documented** one: a repo with no `tracker:` key whose
`JIRA_URL` is in `.env` and never exported still resolves differently at the two ends. It is now
tested, attributed and argued rather than accidental, and the wizard writes a `tracker:` key on both
platforms so a generated config cannot reach it — but it is still a divergence, and the proper close
(teaching `resolve-platform.sh` to read `.env`) is un-filed. The **undocumented** one is RF-001: the
guard for all of this can be flipped by an ambient environment variable.

### Security — PASS

Unchanged from cycle 1. The fix adds no network, credential or filesystem surface — it is string
normalisation on a value already being read.

### Maintainability — PASS

Improved this cycle. The function's header comment now explains why the *value parsing* has to mirror
and not just the order, and explicitly warns the next reader not to "correct" the `.env` probe by
deleting it — which is the exact wrong move, and one a reasonable person would otherwise make. The
CHANGELOG no longer claims more than the code delivers. A parity table that asserts agreement is a
better guard than ten independent expectations.

---

## Regression Testing

| Area                                | Result | Notes                                                          |
| ----------------------------------- | ------ | --------------------------------------------------------------- |
| Full repo suite (`npm run ci:fast`) | PASS   | exit 0 — 2355 tests, 0 failures, 1 skipped, prettier clean      |
| Cycle-1 repro, end to end           | PASS   | `tracker: "jira"` now installs the Jira skills, prunes the GitHub-only one |
| Grandfather rule                    | PASS   | Untouched by cycle 1; cycle-1 mutation proofs M1/M2 still stand |
| Classification drift guard          | PASS   | Untouched; M3 still stands                                      |
| Flow-mapping / map-form `tracker:`  | PASS   | Resolves identically to the pre-fix script and to the runtime   |
| `--help`, `--all-skills`, `--dry-run` | PASS | Unaffected by the resolver change                               |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                   # exit 0 — 2355 tests, 0 fail, prettier clean
# differential: installer vs resolve-platform.sh over the cycle-1 shapes → all agree
# end-to-end fixture install with tracker: "jira" → Jira skills installed, GitHub-only pruned
# ambient SKILLS_CONFIG_FILE probe → RF-001
# pre-fix script from 9edb699 vs HEAD on tracker:<TAB>jira → RF-002 is pre-existing
python3 -c "import yaml; yaml.safe_load('tracker:\tjira\n')"   # raises — the tab is malformed YAML
```

---

## Recommendations

### Immediate Actions (Blocking)

1. **RF-001** — add `delete clean.SKILLS_CONFIG_FILE` to `runtimeTracker()` (and to `callFn()` for
   symmetry), plus a regression test that exports a decoy `SKILLS_CONFIG_FILE` and asserts the
   fixture still wins. `refs: shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`

### Short-term Actions (Non-Blocking)

1. Have `runtimeTracker()` assert the resolver exited 0, so a future refusal is diagnosed as a
   refusal rather than as a disagreement.
2. CR-003 + RF-002: decide whether the installer should refuse malformed `tracker:` input rather than
   defaulting, matching the runtime's halt.
3. File the `resolve-platform.sh` `.env` follow-up so the documented residual has an owner.
4. Run `shellcheck scripts/setup-consumer.sh` where it is installed.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Both cycle-1 issues are closed and verified by re-running the checks that found them,
not by re-reading the fix. The refute pass found one new MEDIUM in cycle 1's own test helper — an
incomplete environment scrub that can flip the very guard protecting the HIGH finding. No HIGH
findings remain, so rule 1 does not apply; rule 2 does.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: RF-001 fixed with a regression test.

---

**QA Report**: co-located at `task.83.qa.2.platform-aware-skill-exclusion.md`
**Gate File**: co-located at `task.83.gate.2.platform-aware-skill-exclusion.yml`
**Next Steps**: `/qa-fix` — scrub `SKILLS_CONFIG_FILE` in the test helpers and pin it with a decoy
test, then re-review.
