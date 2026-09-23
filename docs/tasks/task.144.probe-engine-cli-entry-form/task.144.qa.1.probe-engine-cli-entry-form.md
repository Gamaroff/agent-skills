# QA Report: Task 144 - security-probe: a `cli:` entry form

**Task**: [task.144.probe-engine-cli-entry-form.md](./task.144.probe-engine-cli-entry-form.md)
**Gate File**: [task.144.gate.1.probe-engine-cli-entry-form.yml](./task.144.gate.1.probe-engine-cli-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-23
**Testing Completed**: 2026-09-23
**Gate Status**: CONCERNS

---

## Executive Summary

The `cli:` entry form is correctly built. The fast gate is green (3961 pass, 0 fail), the 15 new tests pass
under both the default `TMPDIR` and `TMPDIR=/tmp`, and the boundary this change adds — the `--argv`
template validator — was executed through the new form itself and **engages** on 17 of 17 probes. One
medium finding holds the gate at CONCERNS: `skills/review-security/SKILL.md` was not updated with the
other entry-form listings, and nothing checks that population.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, every checkbox ticked)
- [x] Tests passing
- [x] Breaking changes documented (none — additive)
- [x] Code on feature branch with open PR (#471, OPEN)

### Testing Approach

- [x] Automated Testing (unit + the real `uat-status.mjs` consumer run)
- [x] Regression Testing (full `npm run ci:fast`)
- [x] Security Review (probe engine, measured)
- [x] Code Review (Step 3b, independent Explore reviewer)

### Review Methodology

Direct tools, plus one Explore subagent for the Step 3b diff review. The task has 4 phases, so the
Adaptive Review Strategy's default applies. This is a first review, with no prior gate, and the
whole branch diff was reviewed (`origin/develop...HEAD`, excluding bundled `references/` copies
and the task directory).

---

## Implementation Verification

| Phase                                          | Status | Test Result | Notes                                                                                             |
| ---------------------------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------- |
| Phase 1: Entry resolution and the argv template | PASS   | Verified    | `CLI_PREFIX`, `resolveEntry` `kind: "cli"`, `parseArgvTemplate` shared by `main` and `runProbeSpec` |
| Phase 2: The run and the scoring               | PASS   | Verified    | Helpers factored out of `runShellCase`; the shell arm's 66 tests stayed green                     |
| Phase 3: First real consumer                   | PASS   | Verified    | `uat-status.mjs --env {input}` → `present-but-inert`, measured, executed 5                        |
| Phase 4: Documents and bundling                | CONCERNS | Partial   | Three of four sites that route a non-JS entry updated; `review-security/SKILL.md` missed (CR-1)   |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

| Criterion                                                                 | Target            | Actual                                              | Status |
| ------------------------------------------------------------------------- | ----------------- | --------------------------------------------------- | ------ |
| `cli:` runs every case, `probes_executed` = case count                    | = count           | refuser 5/5; uat-status 5/5                         | PASS   |
| Refuser engages / inert present-but-inert / accept-all absent / crasher unverifiable | as stated | all four, by test                               | PASS   |
| Malformed `--argv`/`cli:` → exit 2 `bad-argv`, no record; entry problems → named decline | as stated | 6 combos exit 2, no record; out-of-root / `.sh` declined | PASS |
| Two templates on one script → two record entries                          | 2                 | 3 controls from 3 runs; re-run replaces only its own | PASS  |
| Input reaches the CLI as one argv element, byte-identical                 | identical         | 9 inputs incl. `$(…)`, quotes, newline, leading `-`, empty | PASS |
| uat-status run within per-case budget                                     | inside budget     | ~0.5 s for 5 cases                                  | PASS   |
| No network; child under the sandbox env                                   | sandbox keys only | parent canary did not cross; HOME/TMPDIR in sandbox | PASS   |
| Every new test mutation-proved                                            | all               | 14/14 `covered`                                     | PASS   |
| `no interpreter is on the snippet allow-list` still green                 | green             | green                                               | PASS   |
| `npm test`, `bundle --check`, `check:generated`, Prettier clean           | clean             | 3961/0; all clean                                   | PASS   |
| §5.1 no longer lists a multi-argument CLI; §5 states exit-status contract | as stated         | done                                                | PASS   |
| CHANGELOG cites `(task 144)`                                              | present           | present                                             | PASS   |

---

## Breaking Changes Validation

None declared. Verified: record entries gain one key (`argv`), and the control key is byte-identical
for the JS, `shell:` and `shell-fn:` forms (asserted: a JS entry's file name is
`sha256(sink \0 entry)`). **Overall**: PASS.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: CR-1 — `review-security/SKILL.md` still routes a non-JS entry to `shell:` only**

- **Severity**: MEDIUM
- **Category**: Quality (enumeration)
- **Observation**: `skills/review-security/SKILL.md:155`, limit 3, reads "routed to the engine's `shell:`
  entry form … only a script neither form reaches (stdin, two positionals, network) is declined". The diff
  updated the same statement in `security-review-prompt.md` (limit 3), both qa Step 3b paragraphs and the
  finalise prompt. Enumerated with `git grep` over the canonical sources: this is the one canonical site
  left, and no test enforces the population.
- **Impact**: `/review-security`'s own contract tells a reviewer that a multi-flag CLI is declined, which
  is the task.141 outcome this task exists to end.
- **Recommendation**: Update the paragraph to name `shell-fn:` and `cli:`. Then add a population test
  with a non-vacuity floor, so that every canonical source routing a non-JS entry names all three
  forms.
- **Bug report**: none filed. This is a `code_review` finding carried in the gate's `top_issues[]`
  (CR-1), which `/qa-fix` consumes directly.

### LOW Severity Issues (1)

- **CR-2 (bug, low, confidence medium)** — `security-probe.mjs` crash detection keys on Node's
  default fatal footer. A CLI that catches its own crash (`main().catch(e => { …; process.exitCode = 1 })`)
  is scored `rejected`. Document the limit (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

One `node` spawn per case. The consumer run takes about 0.5 s for 5 cases. There is no network access.

### Reliability — PASS

A crash, kill or timeout is scored `errored` and folds into `entry-not-probeable`. A `--argv` shape
error exits 2 before any record write. A `cp`-snapshot refactor check showed the shell arm unchanged
(66/66 green before the cli arm was added).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17
- The boundary this change adds is the `--argv` template validator. It was probed **through the `cli:`
  form itself** against the engine's `main`:
  `--entry cli:shared/resources/security-probe.mjs --argv '["--sink","url-authority","--entry","cli:…/cli-refuser.mjs","--argv","{input}","--cases-file",…]'`.
  13 hostile templates were refused with named `bad-argv` reasons (exit 2): embedded, suffix-,
  dollar- and fixture-embedded slots; two `{input}`; none; unknown, near-miss (`{inputs}`) and
  upper-case slots; nested array; bare string; object; number. 4 legitimate templates were accepted
  (exit 0, inner probe engages), and there were 0 escapes. Record: `task.144.qa.1.security.run.json`.
  `node` stays off `SAFE_COMMANDS`.

```yaml
security_review:
  mode: diff
  probes_executed: 17
  evidence: measured    # computed by security-probe.mjs from the run record
  controls:
    - name: "security-probe --argv template validator"
      verdict: engages
      severity: none
      call_site: shared/resources/security-probe.mjs:parseArgvTemplate
      entry: cli:shared/resources/security-probe.mjs
      sink: template-render
      reason: hostile-rejected-legitimate-accepted
      probes_executed: 17
```

### Maintainability — PASS

The fixture, env and spawn helpers were factored out rather than copied. `bundle:check` and
`check:generated` are clean. The one missed doc site is CR-1.

---

## Code Review

Step 3b ran as an independent Explore reviewer over the whole branch diff: 12 files, with bundled
copies and task docs excluded. `code_review_blocking=true` came from the pipeline, and the frontmatter
has no opt-out, so CR-1 (bug, medium, high confidence) was promoted to `top_issues[]`.

**Correctness bugs (2):**

- [medium/high] `shared/resources/security-review-prompt.md:249` — enumeration: `skills/review-security/SKILL.md:155`
  was not updated, and no check enforces the population. → name `cli:` there, and add a population
  test. **Promoted to gate as CR-1.** Verified by re-running the enumeration by hand; it is new to
  this change.
- [low/medium] `shared/resources/security-probe.mjs:1592` — a caught crash is scored as a refusal. → document the limit,
  or pin it with a fixture. Advisory.

**Cleanups (1):**

- `shared/resources/security-probe.mjs:1553` — the two-branch `materialiseFixture` call collapses to one:
  `materialiseFixture(workDir, fixture?.controls ?? [], c.input, { writeInput: fixture !== null })`.

**Found while probing (advisory):** a `--argv` template cannot pass a literal `"{input}"` string to its
target, because there is no escape syntax. This surfaced when the engine could not be nested with an
inner template that carries its own `{input}`. The workaround used was to pass the inner template as
the outer `{input}`.

**Mutation proofs** (all run at develop, all against committed tests):

- mutation-proven: allow two `{input}` → parseArgvTemplate refusals + bad-argv combos → covered
- mutation-proven: interpolate an embedded slot → parseArgvTemplate refusals → covered
- mutation-proven: score non-zero as accepted → refusing CLI engages → covered
- mutation-proven: bare `sandboxEnv()` for the cli child → argv/sandbox echo + os.homedir escape → covered
- mutation-proven: drop the template from the control key → record carries the template → covered
- mutation-proven: fixture in `tmpdir()` → argv/sandbox echo → covered
- mutation-proven: ignore the crash footer → crasher is errored → covered
- mutation-proven: remove each of `main`'s three `--argv` guards → malformed --argv combos → covered (×3; the missing-`--argv` guard needed a per-rule message assertion first — it was shadowed by the parser)
- mutation-proven: ignore `expected` → `expected` is compared → covered
- mutation-proven: drop the extension check → non-.mjs/.js declined → covered
- mutation-proven: accept `argv` on a non-cli form → runProbeSpec declines bad-argv → covered

**Platform variance**: `TMPDIR=/tmp command node --test --test-name-pattern='cli entry' shared/resources/tests/security-probe.test.mjs` → 15/15, exit 0.

**Step 4b (runnable prose)**: this applies, because the change set modifies `SKILL.md` and
`shared/resources/*.md` files that contain fenced ```bash blocks. `finalise-dod-security-prompt.md`,
`security-review-prompt.md` and `probe-boundary-rule.md` each had 1 block classified `mutating`,
giving `no-executable-blocks` (information). `qa-task/SKILL.md` (17 blocks: 3 placeholder, 14 mutating)
and `qa-story/SKILL.md` (15: 4 placeholder, 11 mutating) both report `zero-blocks-executed`. That is
**pre-existing**: the diff adds no fenced block to either file (`git diff … | grep -c '^+```'` → 0),
so it is routed to `recommendations.future`. Shells: bash and zsh.

---

## Regression Testing

- Full fast gate: `npm run ci:fast` → 3961 pass, 0 fail (after one reword; see the implementation report)
- Existing JS, `shell:` and `shell-fn:` tests: unchanged and green
- `evals/shared/tests/probes-executed-population.test.mjs`: green
- `task.80 parity: no interpreter is on the snippet allow-list`: green

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
command node --test --test-name-pattern='cli entry' shared/resources/tests/security-probe.test.mjs
TMPDIR=/tmp command node --test --test-name-pattern='cli entry' shared/resources/tests/security-probe.test.mjs
command node shared/resources/security-probe.mjs --sink template-render --entry cli:shared/resources/security-probe.mjs --argv '[…]' --cases-file argv-cases.json --record task.144.qa.1.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
npm run bundle:check && npm run check:generated
```

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1: name `cli:` in `skills/review-security/SKILL.md` limit 3, and add the entry-form population test.

### Short-term Actions (Non-Blocking)

1. CR-2: document that only an uncaught error counts as `errored`.
2. CR-3: collapse the `materialiseFixture` ternary.
3. Name the no-escape `{input}` limit.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium enumeration finding (CR-1), with no HIGH findings and every NFR at PASS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.144.qa.1.probe-engine-cli-entry-form.md`
**Gate File**: co-located at `task.144.gate.1.probe-engine-cli-entry-form.yml`
**Next Steps**: `/qa-fix` for CR-1, then a cycle 2 re-review
