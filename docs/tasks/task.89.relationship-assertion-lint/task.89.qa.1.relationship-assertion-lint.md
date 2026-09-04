# QA Report: Task 89 — Lint for prose-matching assertions that claim a relationship but test only co-occurrence

**Task**: [task.89.relationship-assertion-lint.md](./task.89.relationship-assertion-lint.md)
**Gate File**: [task.89.gate.1.relationship-assertion-lint.yml](./task.89.gate.1.relationship-assertion-lint.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

The deliverable does what it claims, and — unusually — every numeric claim in it survives independent
re-derivation rather than merely being reproducible from the artifacts that assert it. The suite is
genuinely non-vacuous under three separate degeneracy attacks. One MEDIUM finding: the scanner
degrades **silently**, which in a lint built to catch silent under-detection is the one defect it
cannot ship with, even though it is costing no coverage today.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CY1-1 first

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (11 mandatory sections)
- [x] All 4 implementation phases marked complete
- [x] Tests passing — `npm run ci` exit 0
- [x] Breaking changes documented (none — additive)
- [x] Code on `feature/task.89.relationship-assertion-lint` with open PR #312

### Review Methodology

**Direct tools, adversarial.** Standard mode (not lite). The task's subject is test strength, so the
bar applied here is higher than the phase count alone would justify: every claim was re-derived, and
the deliverable was attacked by mutation rather than read.

> **Deviation from Step 3b, recorded rather than hidden.** The prescribed diff code review dispatches
> a read-only Explore subagent specifically so that the reviewer is not the author. This session
> operates under a standing instruction not to dispatch subagents unless the user asks, so the
> adversarial pass was performed inline by the same session that wrote the code. That is a genuine
> weakening of the review's independence and is the main limitation of this cycle. It was mitigated
> by attacking through execution — constructed inputs, mutation, and reachability sweeps — rather
> than by re-reading the diff, on the grounds that a constructed counter-example does not care who
> wrote the code. CY1-1 was found that way.

**Step 4b (runnable prose)**: not applicable — the change set adds **0** fenced bash blocks to any
`SKILL.md` or `shared/resources/*.md` (`mutation-proving.md` gained prose only).

---

## Claim Verification — every number re-derived, not read

| Claim | How it was checked | Result |
| --- | --- | --- |
| 2188 assertion call sites | Counted twice independently — a Node `fs` walk and a separate `grep -rhoE` sweep | **2188 / 2188** ✅ |
| 89 test files | Node walk and `find`, independently | **89 / 89** ✅ |
| 61 → 11 → 4 suppressed → 0 unsuppressed | Re-ran the analyser over the live corpus | 0 unsuppressed ✅ |
| Six mutation proofs | Re-ran all six, **verifying the mutation applied before reading the result** | 6/6 reproduce ✅ |
| No `package.json` change | `git diff develop...HEAD --name-only` | 0 changes ✅ |
| Runs via the existing glob | `'tests/*.test.js'` present in the `test` script | ✅ |

**The mutation-proof re-run deliberately checked that each edit landed before believing the result.**
The implementation's own record discloses that M5 first reported green because shell escaping had
swallowed the substitution — a false proof. Every proof here was re-run with a `diff` check first;
all six applied, and all six held.

| # | Mutation | Baseline 22/0 → | Verdict |
| - | --- | --- | --- |
| M1 | `ruleA` returns null | 18 pass / 4 fail | held |
| M2 | `ruleB` returns null | 20 / 2 | held |
| M3 | `ruleC` returns null | 20 / 2 | held |
| M4 | `ruleD` returns `[]` | 20 / 2 | held |
| M5 | Drop the `pr-merged` lookahead | 21 / 1 | held |
| M6 | Strip a suppression's reason | 21 / 1 | held |

## Non-vacuity attacks (added by this review)

The fixture tests assert `findings.length > 0`, which a degenerate always-flagging analyser would
satisfy. Three attacks confirm the suite cannot be fooled that way:

| # | Attack | Result |
| - | --- | --- |
| M7 | `analyze()` always returns a finding | **14 tests red** — the "stays quiet" units and both negative controls catch it |
| M8 | `liveSuiteFiles()` returns `[]` | **red** — the `>= 60` corpus guard fires |
| M9 | Delete `instance-4.fixture.js` | **red** — the corpus-completeness guard fires |
| M10 | Two adjacent findings, suppression on the first | Only the first is suppressed — suppressions do not leak to neighbours |

Also verified structurally:

- The lint's own test file **is** inside the corpus it scans, so it is held to its own rule.
- `tests/fixtures/` does **not** leak into the live scan (0 files), so the deliberately-defective
  fixtures cannot fail the gate.
- The `fixtures` directory exclusion in the walk touches 5 directories repo-wide; **none contains any
  test file**, so it creates no coverage gap. Checked rather than assumed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. The detector | PASS (with CY1-1) | 11 rule units green | 4 rules; rule D's addition is disclosed in §6 rather than folded in silently |
| 2. Historical fixture corpus | PASS | 8 fixture assertions green | All six reconstructed from named commits; both survivors clean |
| 3. False-positive triage | PASS | 0 unsuppressed | Reproduced independently |
| 4. CI + documentation | PASS | `npm run ci` exit 0 | `mutation-proving.md` shape 6 + bundles regenerated |

**Overall Phase Completion**: 4/4 — with one MEDIUM against Phase 1.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Flags all six historical instances | 6/6 | 6/6, each by its assigned rule | PASS |
| Does not flag the two survivors | 0 findings | 0 findings | PASS |
| FP rate measured and reported | measured | 0 unsuppressed / 2188, recorded in README | PASS |
| Each rule mutation-proved | 4/4 | 6 proofs, all re-verified | PASS |
| Runs in `npm run ci`, no `package.json` change | yes | yes | PASS |
| `npm run ci` exits 0 | 0 | 0 (2311 tests / 2310 pass / 0 fail / 1 skipped; `eval:all` 0) | PASS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**CY1-1 — the scanner goes blind silently**

- **Severity**: MEDIUM · **Category**: Reliability
- **File**: `tests/lib/relationship-assertion-lint.js` (`regexCanStartAfter`)
- **Observation**: the value-position set is `(,=:[!&|?{};+-*%~^` and omits `>`. The idiom
  `(l) => /re/.test(l)` therefore parses as division and the regex body is scanned as **code**. A
  quote inside it opens a phantom string; with an odd count it runs to EOF and every later assertion
  in the file is invisible to every rule.

  Reproduced by construction — each of these yields `NONE` where the assertion alone yields `A`:

  ```
  const f = (l) => /it's here/.test(l);      // apostrophe, after =>
  if (a > /don't/.test(b)) {}                 // apostrophe, after >
  const f = (l) => /a`b/.test(l);             // backtick, after =>
  const f = (l) => /a\/b'c/.test(l);          // escaped slash + apostrophe
  ```

- **Impact today: none.** A bait sweep — appending a known-defective assertion to each of the 89
  corpus files and asserting the analyser finds it — reports **0 blind files**. The two live
  `=> /…/` regexes that contain backticks (`tracker-workflow.test.mjs:278`,
  `pr-inline-comment.test.mjs:255`) carry them in *balanced pairs*, which re-syncs the mask. So the
  0% figure is measured over a fully-reachable corpus and stands.
- **Why it is still MEDIUM**: the mode of failure, not its current cost. A lint whose value is
  catching checks that cannot observe what they claim must not itself report "clean" when it has
  stopped looking. It will fire on the first apostrophe written into such a regex, and nothing will
  say so.
- **Recommendation**: accept `>` as a value position, **and** add a per-file reachability guard to
  the test suite — the bait sweep this review used, promoted into a permanent assertion. The
  one-character fix without the guard leaves the next desync exactly as silent.
- **Priority**: P2

### LOW Severity Issues (1)

- **`assert.strictEqual(x.includes(y), true, msg)` is not modelled.** It expresses the same
  co-occurrence claim rules A–D catch in other spellings. **0 occurrences** in the corpus today, and
  the README already discloses that the lint models the six shapes that happened. No action needed
  now; noted so the disclosure has a concrete example behind it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
~300ms for 89 files / 2188 call sites. No measurable effect on `ci:fast`.

### Reliability — CONCERNS
CY1-1: silent degradation. Everything else is robust — regexes containing commas, parens, escaped
slashes and double quotes all parse; `t.assert.match` is detected; assertions quoted in comments and
strings are correctly ignored (a real hazard in this repo, whose test files quote replaced assertions
constantly).

### Security — PASS
Pure file reads. No network, subprocess, `eval` or writes anywhere in the change set.

### Maintainability — PASS
Each rule is a named function documenting the historical instance it carries. The FP record states
the measurement, the narrowings, and the two analyser bugs found by measuring — including a false
mutation proof, disclosed rather than quietly re-run. That disclosure is the single strongest
maintainability signal in the change set.

---

## Code Review

**Correctness bugs (1):**

- [medium/high] `tests/lib/relationship-assertion-lint.js` (`regexCanStartAfter`) — value-position set
  omits `>`; regex after `=>` scanned as code; odd quote count swallows the rest of the file → accept
  `>` and add a reachability guard. **Promoted to gate `top_issues[]` as CY1-1.**

**Cleanups (2):**

- `tests/lib/relationship-assertion-lint.js` — `ruleD`'s 4000-character window is a magic number with
  its rationale in a comment. Correct as written and deliberately bounded; worth a named constant if
  the rule grows.
- `tests/relationship-assertion-lint.test.js` — `SUPPRESSION` accepts any non-space after `allow`, so
  a one-character "reason" passes. Tightening to a word count would be arbitrary; the review-time
  reader is the real gate. Noted, not recommended.

**Mutation-proven**: yes — all four rules, plus the live gate and the suppression contract (6 proofs,
each re-verified with the mutation confirmed applied). No fix from this cycle exists yet to prove.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`ci:fast`) | 2311 tests / 2310 pass / 0 fail / 1 skipped |
| Eval tier (`eval:all`) | exit 0 |
| The 6 modified assertion sites | All still green; each is strictly stronger than before |
| Bundled `mutation-proving.md` copies (4 skills) | In sync — `npm run bundle` reports no drift |
| Tree integrity after the mutation battery | `git status` clean apart from the implementation report |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Rationale**: one MEDIUM (CY1-1), no HIGH. Rule 2 of the deterministic gate rules and the
Reliability NFR both land on CONCERNS independently.

**Deployment Recommendation**: CONDITIONAL — merge once CY1-1 is closed.

---

**Next Steps**: `/qa-fix` closes CY1-1 — accept `>` as a regex value position and add the per-file
reachability guard, then mutation-prove the guard by reverting the `>` and confirming it goes red.
