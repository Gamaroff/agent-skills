# QA Report: Task 79 — Write down the inputs that defeat each sink, once

**Task**: [task.79.security-input-corpus.md](./task.79.security-input-corpus.md)
**Gate File**: [task.79.gate.1.security-input-corpus.yml](./task.79.gate.1.security-input-corpus.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-06
**Testing Completed**: 2026-09-06
**Gate Status**: FAIL

---

## Executive Summary

Every one of the task's eight success criteria verifies empirically, all five CI checks are green on
the head commit, and the corpus itself is well-built: 73 frozen cases across five sinks, both
directions everywhere, `corpusFor` throwing on every unknown key including `__proto__`.

The gate fails on one finding, and it is the one that matters most: **the non-restatement guard —
the single mechanism Phase 4 exists to install — does not detect the restatement it is named for.**
Run against `origin/develop`'s prompt, the axis table this change deletes, it reports zero findings
and passes. Six further medium issues follow: four `why` fields that describe behaviour the
reference URL parser does not exhibit, a documented import that cannot resolve, and two missing
assertions.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED (staging CONDITIONAL)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases completed and checkboxes marked
- [x] Tests passing (`npm run ci` green — both tiers)
- [x] Breaking changes: none claimed, none found
- [x] Code on feature branch `feature/task.79.security-input-corpus` with open PR #332

### Testing Approach

- [x] Automated Testing (the new suite, the contract suite, `npm run ci:fast`, `eval:all`)
- [x] Regression Testing (CI on a clean checkout of the tracked tree)
- [x] Security Review (the deliverable is a security artefact — its claims were fact-checked by execution)
- [x] Code Review (adversarial diff review — Step 3b)
- [x] Mutation-proof spot check (Step 3c — two independent mutations, neither one the develop run claimed)
- [ ] Performance Testing (not applicable — pure data module, 2ms import)

### Review Methodology

**Direct tools + one Explore subagent for the Step 3b diff code review.** The task is 4 phases across
`shared/resources/`, `evals/` and generated `skills/finalise/references/` — above the "small task"
threshold for direct-tools-only, below the "large/high-risk" threshold for a full parallel fan-out.
A traceability mapper ran as a second subagent (Step 5 pre-step).

First review — no prior gate, so the whole branch diff was reviewed (`origin/develop...HEAD`,
3,565 lines). `SAFETY_REPROBE=false` (no prior gate to have failed), `REFUTE_PASS=false`.

**Method note.** Findings in this report were reached by *executing* the claims rather than reading
them — which is the method ordering the deliverable itself argues for, applied to the deliverable.
CR-1, CR-2, CR-3, CR-4, CR-6, CR-7, CR-8 and CR-16 were each independently reproduced by QA before
being written down; the reproduction is quoted in each finding. Two findings the code reviewer
returned at `medium` confidence (CR-5, CR-9) were **not** independently reproduced and are recorded
as advisory rather than promoted to the gate.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Sink definition and prose | PASS | Verified | `security-input-corpus.md` (300 lines) defines sink (three-part definition), states the method ordering strongest-first with grep last, and carries per-sink case tables |
| Phase 2: Machine-readable module | PASS | Verified | `SINKS` (5), `corpusFor`, `allCases`, `CASE_FIELDS`, `DIRECTIONS`; 73 frozen cases; seeded from the two measured corpora |
| Phase 3: Tests | CONCERNS | Partial | 17 tests, all green and confirmed run in CI — but the SC7 purity criterion has no assertion (TASK79-001), two tests are vacuous or subsumed (CR-13/14, advisory), and doc parity does not bind a row to its section (CR-9, advisory) |
| Phase 4: Fold the prompt's table | CONCERNS | Partial | The fold is correct and all five axis names survive — but the guard installed to hold it is vacuous (CR-1), the fenced example does not resolve (CR-6), and the transitively-bundled artefacts have no parity test (CR-8) |

**Overall Phase Completion**: 4/4 completed, 2/4 with issues.

Bundling verified by running it: `npm run bundle` is idempotent on re-run, and pulled **three**
transitive outputs (`security-input-corpus.md`, `security-input-corpus.mjs`, `mutation-proving.md`)
— one more than the review predicted. §7 of the task was corrected during development to name all
three; that correction is accurate.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status | Notes |
|---|---|---|---|---|
| Five sinks, each with hostile **and** legitimate | 5 | 5 | PASS | url-authority 9+3, sql-orm 7+3, shell-exec 27+4, path 8+3, template-render 6+3 |
| Every case states why + correct | 73/73 | 73/73 | PASS | 0 cases with an empty or missing field |
| Importable and frozen; typo'd sink throws | — | — | PASS | Deeply frozen (SINKS, per-sink arrays, case objects); a caller cannot mutate a case; throws on `shell-exe`, `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `""` |
| Prompt references the corpus, does not restate | — | — | **CONCERNS** | The prompt does reference it and restates 0 inputs — but the *guard* that enforces this is vacuous (CR-1), so the criterion is met by the current text and not held for the next edit |

### Regression

| Criterion | Target | Actual | Status | Notes |
|---|---|---|---|---|
| `security_review` YAML shape unchanged | unchanged | unchanged | PASS | 26/26 contract tests green, including the SKILL.md render branches |
| `npm run ci` green; new suite confirmed to have **run** | green + run | green + run | PASS | See below — verified against CI, not the local run |

**The "confirmed to have run" criterion was verified independently, not taken from the report.**
CI run `34060063507` on head SHA `d28f9e61` (== branch HEAD) is green on all five checks, and its
log carries `ok 565 - probe mode sources its candidates from the shared corpus`,
`ok 566 - probe mode does not restate the corpus's inputs`,
`ok 1358 - every sink carries at least one legitimate case`,
`ok 1363 - corpusFor throws on an unknown sink rather than returning []`,
`ok 1366 - the prose peer renders every case in the module`. A clean-checkout run of the tracked
tree is stronger evidence than the local run the implementation report cited.

### Safety

| Criterion | Target | Actual | Status | Notes |
|---|---|---|---|---|
| Inputs only — no execution, no side effects on import | none | none | **CONCERNS** | True today (zero import/require; 2ms import; no new exit listeners; the only `process.` is inside a case's input string) but **nothing asserts it** — TASK79-001 |
| Every hostile case names its sink | 73/73 | 73/73 | PASS | `sinkCases` stamps `sink` and namespaces the id mechanically; 0 mismatches |

---

## Breaking Changes Validation

The task claims none. **Confirmed** — two new files, one prompt edit that replaces a restated table
with a reference to the same content, and two additive test guards. The `security_review` YAML shape
is unchanged and its contract tests are green. No migration path is required because nothing consumes
the corpus yet: `task.80` is the first consumer and is unbuilt.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity (1)

**CR-1 — The non-restatement guard does not detect the restatement it is named for**

- **Severity**: HIGH · **Category**: Quality (vacuous guard)
- **File**: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:170`
- **Observation**: The guard filters corpus inputs to `length >= 8` and asserts none appears
  whitespace-flattened in the prompt. QA ran it against `origin/develop`'s prompt — the axis table
  this change deletes, the exact artefact the guard exists to forbid — and it reported **0
  restatements**. The restatement that actually existed was *fragmentary*: `g\h`, `g"h"`, `-o`,
  `--output`, `a; b`, `a && b` are all present there and all are substrings of corpus inputs, so
  full-string containment matches none of them.
- **Why the develop-run mutation proof did not catch this**: that proof re-added two corpus inputs
  **in full** (`sort --output=/tmp/x file.txt`, `evil.example.com/x`). Full re-insertion is not the
  shape restatement takes, so the proof demonstrated the guard's easy case and left its real one
  untested. The proof was honest and the mutation genuinely landed; it simply asked the wrong
  question.
- **Impact**: Phase 4's stated purpose — "the non-restatement guard is a test", the mitigation for
  the task's own top-ranked Medium risk — is not delivered. The prompt is clean *today* because the
  edit was made carefully, not because anything holds it that way. This is the same shape
  `AGENTS.md` records for the `addCommentToJiraIssue` parity guard: *"it passed on the exact
  regression it named."*
- **Recommendation**: assert on distinctive fragments or a token-overlap threshold, and **seed the
  guard with the deleted axis-table text as a fixture that must fail**. Mutation-prove against that
  fixture, not against a full-input re-insertion.
- **Priority**: P1

### MEDIUM Severity (7)

**CR-2 / CR-3 / CR-4 — three `url-authority` `why` fields are falsified by the reference parser**

- **File**: `shared/resources/security-input-corpus.mjs:105, :112, :142`
- **Observation** (each reproduced by QA):
  - `userinfo-delimiter` claims `p@ss` "re-points the connection at a host named after the
    password's tail". `new URL("postgres://u:p@ss@h/db")` → password `p%40ss`, host `h`. WHATWG
    splits at the **last** `@`.
  - `port-delimiter` says `pa:ss` is "silently truncated at the colon" *either way*. In the password
    position it is preserved: `.password === "pa%3Ass"`.
  - `empty-host` says `scheme://:5432/db` "parses, and several drivers read as localhost".
    `new URL("postgres://:5432/db")` throws `ERR_INVALID_URL`.
- **Impact**: the corpus's value proposition is that `why` and `correct` are accurate enough to serve
  as an **oracle** — the field that lets an engine compute a verdict instead of asking an agent to
  judge one. A probe comparing "expected: silently truncated" against "actual: threw" reports a false
  finding, and the engine that will consume this (`task.80`) is exactly what would do so.
- **What is *not* wrong**: the *inputs* are right and the *`correct`* advice (percent-encode; build
  with the URL API) is right in every case. The defect is confined to the failure-mode narration.
- **Recommendation**: say which parser each claim is about. These stories are true of naive
  first-`@`-splitting DSN parsers and hand-rolled concatenation; they are false of a spec-compliant
  WHATWG parser, and the corpus currently states them unconditionally.

**CR-6 — the documented import specifier cannot resolve**

- **Files**: `shared/resources/finalise-dod-security-prompt.md:116`, `shared/resources/security-input-corpus.md:258`
- **Observation**: both fenced examples use the bare specifier
  `"shared/resources/security-input-corpus.mjs"`. QA ran both: `ERR_MODULE_NOT_FOUND`. The bundler's
  rewrite to `"references/security-input-corpus.mjs"` is equally unresolvable, and the prompt's own
  step 3 directs the agent to run its script *from a temporary directory*, where neither form has a
  chance.
- **Impact**: an agent following the prompt writes a script that throws before testing anything. For
  a corpus whose method ordering puts *execute the property* first and *grep* last, shipping an
  example that does not execute is the failure it argues against.
- **Recommendation**: QA verified that a sibling-relative `./security-input-corpus.mjs` resolves
  against **both** `shared/resources/` and `skills/finalise/references/`, and survives the bundler
  rewrite untouched (the rewrite targets the literal `shared/resources/` prefix). For the temp-dir
  case, show an absolute path built from the repo root.

**CR-7 — the bundled copy ships two broken links**

- **File**: `shared/resources/security-input-corpus.md:158` (fix belongs in the source)
- **Observation**: the source's `../../docs/tasks/...` and `../../docs/bugs/...` provenance links
  resolve, from `skills/finalise/references/`, to `skills/docs/...`. QA confirmed both targets are
  absent. The bundler rewrites `shared/resources/` but not `../../docs`, and CI's link-check did not
  catch it.
- **Recommendation**: name the two documents without linking them — the same file already refers to
  `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` that way — so no depth-sensitive
  link survives bundling.

**CR-8 — three transitively-bundled artefacts have no parity test**

- **File**: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:542`
- **Observation**: only `finalise-dod-security-prompt.md` has a bundled-copy-in-step test.
  `security-input-corpus.{md,mjs}` and `mutation-proving.md` now ship under
  `skills/finalise/references/` with none, and `npm run ci:fast` never runs the bundler.
- **Impact**: a source edit that is not re-bundled ships a **stale corpus** to the agent — precisely
  the drift the corpus was built to eliminate, reintroduced one directory over. `validate.yml` gates
  bundle freshness in CI, which is a real backstop, but the local fast gate does not.

**TASK79-001 — the Safety success criterion has no assertion**

- **File**: `shared/resources/tests/security-input-corpus.test.mjs`
- **Observation**: "the corpus contains inputs only — no execution, no side effects on import" is a
  stated Safety criterion. QA verified it holds today (zero `import`/`require`; 2ms import; no new
  exit listeners; the sole `process.` occurrence is inside a case's `input` string literal) — but it
  is enforced only incidentally, by two successful imports. An edit adding `node:child_process` or a
  top-level side effect would pass every existing test.
- **Recommendation**: assert the module's own source carries no import/require and no
  side-effecting builtin reference outside string literals.

### LOW Severity (2)

- **CR-10** — the doc row-count regex matches any line starting with a code span, so a future
  non-case table in the same document inflates the count and fails blaming the corpus.
- **CR-11** — the `length >= 8` filter exempts 14 cases (including `p@ss`, `[::1]`, `a/b+c=d`,
  `O'Brien`), not the "ordinary punctuation" its comment names, while admitting generic strings
  (`cat README.md`, `.gitkeep`, `Tom & Jerry`) that a future incidental prompt example would trip as
  a false failure.

**Total Issues**: HIGH: 1, MEDIUM: 7, LOW: 2 (10 promoted to the gate; 6 further advisory below).

---

## NFR Assessment

### Security — CONCERNS

The deliverable *is* a security artefact, so the accuracy of its `why` fields is itself a security
property. Four url-authority cases describe failure modes the reference parser does not exhibit
(CR-2/3/4 promoted, CR-5 advisory). The module itself is inert: no imports, nothing executes on
import, no executable payload, and `corpusFor` refuses every prototype key. The hostile inputs are
data and stay data.

### Performance — PASS

Pure data. 2ms import, 73 frozen cases, 717 lines. `allCases()` rebuilds and re-freezes per call
(CR-16, advisory) — immaterial at this size, but it means the freeze protects nothing shared.

### Reliability — PASS

The §11 rollback verification command is green. The two new files are inert until `task.80` consumes
them, so the only real revert is the prompt edit. `corpusFor` throws — rather than returning `[]` —
on every unknown key tested, including the five prototype-pollution probes.

### Maintainability — CONCERNS

The guard installed to stop drift does not detect the drift it names (CR-1). Three
transitively-bundled artefacts have no parity test (CR-8). The doc's tables were produced by an
uncommitted generator whose renderer is duplicated in the test (CR-15, advisory), so regenerating
after adding a case means re-deriving it by reading the test. Two tests are vacuous or subsumed
(CR-13/14, advisory).

---

## Code Review

From Step 3b — one adversarial Explore pass over the full branch diff (3,565 lines, 9 files).
`code_review_blocking=true` was passed by the pipeline, so `category: bug` + `confidence: high`
findings were promoted to the gate.

**Correctness bugs (12):**

- [high/high] `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:170` — non-restatement guard vacuous against fragmentary restatement → assert on fragments; seed with the deleted axis table as a must-fail fixture. **Promoted (CR-1).**
- [medium/high] `shared/resources/security-input-corpus.mjs:105` — `userinfo-delimiter` why wrong for WHATWG (last-`@` split) → qualify to naive DSN parsers. **Promoted (CR-2).**
- [medium/high] `shared/resources/security-input-corpus.mjs:112` — `port-delimiter` "either way" false in the password position → name the position. **Promoted (CR-3).**
- [medium/high] `shared/resources/security-input-corpus.mjs:142` — `empty-host` "parses" false; it throws → name the drivers that accept it. **Promoted (CR-4).**
- [medium/**medium**] `shared/resources/security-input-corpus.mjs:126` — `ipv6-brackets`: `[::1]` *is* a valid loopback literal and parses cleanly, so the stated hazard ("a bracketed value that is not an address") does not apply to this case's own input; the real hazard (loopback re-pointing / SSRF) is never stated → change the input or rewrite the why. **Advisory — not independently reproduced.**
- [medium/high] `shared/resources/finalise-dod-security-prompt.md:116` — bare import specifier throws → show a resolvable form. **Promoted (CR-6).**
- [medium/high] `skills/finalise/references/security-input-corpus.md:158` — `../../docs` links broken in the bundled copy → make the source's provenance references path-free. **Promoted (CR-7).**
- [medium/high] `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:542` — no bundled-parity test for the three new artefacts → extend it. **Promoted (CR-8).**
- [medium/**medium**] `shared/resources/tests/security-input-corpus.test.mjs:271` — doc parity is row-text only; nothing binds a row to its sink section or direction table, so a hostile case rendered under "Legitimate" passes both parity tests, and the doc's hand-written count sentences are asserted by nothing → slice by heading. **Advisory.**
- [low/high] `shared/resources/tests/security-input-corpus.test.mjs:290` — row-count regex over-broad. **Promoted (CR-10).**
- [low/high] `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:173` — `length >= 8` exemptions are unnamed and over-broad. **Promoted (CR-11).**
- [low/**medium**] `shared/resources/security-input-corpus.md:167` — the doc's Input column renders JSON-escaped strings (`t\\ouch`, `to\"u\"ch`, `safe.txt .png`), so row 167's own `why` ("`\o` is just `o`") contradicts the doubled backslash beside it and a reader copying from the table sends different bytes than the module supplies. **Advisory.**

**Cleanups (4), all advisory:**

- `shared/resources/tests/security-input-corpus.test.mjs:247` — *simplification*: "allCases covers every sink and nothing else" is vacuous; both assertions restate `allCases()`'s own body and can never fail. **Confirmed by inspection.**
- `shared/resources/tests/security-input-corpus.test.mjs:203` — *simplification*: the shell shrink-guard re-asserts `FLOORS["shell-exec"]` and passes iff the floors test passes; the two "at least one hostile/legitimate" tests are subsumed by floors that are all ≥ 3. Three places hold the same numbers and can disagree.
- `shared/resources/tests/security-input-corpus.test.mjs:266` — *reuse*: `showInput`/`row` are a second implementation of the uncommitted generator that produced the doc, reconcilable only by trial and error → export the renderer or commit the generator.
- `shared/resources/security-input-corpus.mjs:713` — *efficiency*: `allCases()` is not memoised (`allCases() !== allCases()`, confirmed), so the freeze protects nothing shared and the parity test pays three flatMaps in one assertion.

---

## Mutation-Proof Spot Check (Step 3c)

The develop run recorded three proofs. QA re-ran **two different mutations**, deliberately not the
ones claimed, to test the assertions most at risk of vacuity. Each used a pre-mutation copy and a
`diff` confirming the edit landed before the re-run, per `shared/resources/mutation-proving.md`.

| Mutation | Target assertion | Result |
|---|---|---|
| Drop the per-case `Object.freeze` in `sinkCases` | `every case satisfies the frozen shape` | **RED** (1 fail / 16 pass) — held |
| Delete `url-authority.whitespace` from the module | `the prose peer carries no case the module does not have` | **RED** (1 fail / 16 pass) — held |

Source restored byte-identical after each (`git diff --stat` empty). Both held.

**But a held proof is evidence about a test that exists.** CR-1 is precisely the case
`mutation-proving.md` warns about: nine proofs held on `task.67` while thirteen fail-open routes sat
in the shipped classifier. The develop run's proof 3 held *and* the guard it proved is vacuous
against the real defect, because the mutation asked the easy question. `mutation-proven: yes` is
recorded per fixed defect below, and it is not a substitute for the fixture CR-1 asks for.

---

## Regression Testing

| Area | Result |
|---|---|
| `finalise` contract (26 tests) | PASS — including the SKILL.md render branches and the `security_review` YAML shape |
| Full hermetic suite | PASS — 2530 tests, 2529 pass, 0 fail, 1 skipped |
| `eval:all` (slow tier) | PASS — exit 0 |
| Bundle freshness | PASS — `npm run bundle` idempotent; `validate.yml` green |
| Formatting | PASS — `prettier --check .` clean |
| Link resolution **against the tracked tree** | PASS for the source docs (probed via a detached worktree at HEAD); **FAIL for the bundled copy** — see CR-7 |

No regressions found. The one link failure is new breakage introduced by this change, not a
regression in existing behaviour.

---

## Test Artifacts

### Files Reviewed

`shared/resources/security-input-corpus.md`, `shared/resources/security-input-corpus.mjs`,
`shared/resources/tests/security-input-corpus.test.mjs`,
`shared/resources/finalise-dod-security-prompt.md`,
`evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `CHANGELOG.md`, and the four bundled
copies under `skills/finalise/references/`.

### Test Commands Executed

```bash
node --test shared/resources/tests/security-input-corpus.test.mjs        # 17/17
node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs     # 26/26
npm run ci:fast                                                          # 2529 pass / 0 fail
npm run eval:all                                                         # exit 0
npx prettier --check .                                                   # clean
npm run bundle                                                           # idempotent on re-run
gh run view 34060063507 --log                                            # CI ran the new suites
git worktree add --detach /tmp/qa79-probe HEAD                           # link check vs tracked tree
```

### Coverage Report

Not applicable — this repository has no coverage instrumentation. Coverage was assessed by
traceability instead: see `.summaries/qa-traceability-matrix.md` (8 SCs — 7 `full`, 1 `partial`).

### Step 4b — Execute the Documented Commands

**Not applicable — no runnable prose in the change set.** The two changed/added `.md` files under
`shared/resources/` contain zero fenced ```bash blocks (`finalise-dod-security-prompt.md` has one
```js and one ```yaml; `security-input-corpus.md` has one ```js). The detection rule in
`references/qa-runnable-prose-detection.md` does not fire.

Recorded because a silent skip here is the failure that step exists to prevent — and note that CR-6
is a *manual* instance of exactly what Step 4b would have caught had the fence been `bash`: a
documented snippet that does not run.

---

## Recommendations

### Immediate Actions (Blocking)

1. **CR-1** — rewrite the non-restatement guard to catch fragmentary restatement, and mutation-prove
   it against the deleted axis table as a fixture. P1.
2. **CR-2/3/4** — correct the four url-authority `why` fields the reference parser falsifies. P1.
3. **CR-6** — make the documented import resolvable from both locations. P1.
4. **CR-7** — remove the depth-sensitive `../../docs` links that break in the bundled copy. P2.
5. **CR-8 + TASK79-001** — add bundled-parity coverage for the three transitive artefacts, and a
   purity assertion for the corpus module. P2.

### Short-term Actions (Non-Blocking)

1. CR-9 — bind doc-parity rows to their sink and direction sections; derive the doc's count sentences
   from the module.
2. CR-12 — render the doc's Input column literally rather than JSON-escaped.
3. CR-13/14 — drop or replace the vacuous and subsumed count tests.
4. CR-15 — export the row renderer (or commit the generator) so doc and test share one implementation.
5. CR-16 — memoise `allCases()`.
6. CR-5 — either change the `ipv6-brackets` input to a genuinely non-address value or rewrite its
   `why` around loopback re-pointing.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 80/100

> Score computed from NFR statuses per the documented formula `100 − (20 × FAILs) − (10 × CONCERNS)`
> — 0 NFR FAIL, 2 NFR CONCERNS (Security, Maintainability). The **gate** is FAIL by deterministic
> rule 1 (a high-severity `top_issue`), independent of the score. The two numbers disagreeing is
> expected here: the deliverable is largely sound, and one specific guard is not.

**Rationale**: The corpus is well-built and every success criterion verifies under execution rather
than inspection. It fails on the one thing Phase 4 was for. The task's own Risk Assessment names
"the corpus becomes a third copy of knowledge rather than the single one" as its top Medium risk and
answers it with "*the non-restatement guard is a test*". That test exists, is green, and does not
detect the restatement it is named for — verified by running it against the very document the task
deleted. Shipping it would leave the risk unmitigated while the artefact trail claims otherwise,
which is worse than leaving the risk openly unaddressed.

**Deployment Recommendation**: BLOCKED (staging CONDITIONAL)
**Conditions**: CR-1 fixed and mutation-proved against the deleted axis table; CR-2/3/4 corrected;
CR-6 fixed.

---

**QA Report**: co-located at `task.79.qa.1.security-input-corpus.md`
**Gate File**: co-located at `task.79.gate.1.security-input-corpus.yml`
**Next Steps**: `/qa-fix` against the gate — 5 immediate actions, 10 promoted issues.
