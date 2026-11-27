# QA Report: Task 332 - The AC merge closes task 331's follow-ups

**Task**: [task.332.ac-merge-closes-task-331-follow-ups.md](./task.332.ac-merge-closes-task-331-follow-ups.md)
**Gate File**: [task.332.gate.1.ac-merge-closes-task-331-follow-ups.yml](./task.332.gate.1.ac-merge-closes-task-331-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Testing Completed**: 2026-11-27
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are in place, the 96 task tests pass, and the full suite is green apart from one load-only timing failure. Two of the new HALT remedies cannot be cleared when the AC agent itself wrote a bad or missing `story_file`. QA reproduced both by running the merge CLI. The CHANGELOG entry also splits `(task 332)` across two lines, so `/finalise` 6d would HALT.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (12/12 boxes)
- [x] Tests passing
- [x] Breaking changes documented (§ 5, CHANGELOG)
- [x] Code on feature branch with open PR (#964)

### Testing Approach

- [x] Automated Testing (unit, eval blocks under bash and zsh)
- [x] Regression Testing (full `ci:fast` on the LAN server)
- [x] Security Review (reasoned; see NFR)
- [x] Code Review (Step 3b, one Explore reviewer)

### Review Methodology

Direct tools plus one code-review subagent. The task is low risk and changes 4 phases in one module family, so the Adaptive Review Strategy default applies.

Diff review: code review (the change set includes `.js` and `.mjs`). Reviewer dispatched 2026-11-27T22:09Z; its completion notice reported `duration_ms` 73813.

CI on 239beaaedda8: pending

Step 4b: `skills/finalise/SKILL.md` has 52 bash blocks. 3 changed blocks: 0 runnable, 0 placeholder, 3 mutating, 0 executed. Over the file: 0 runnable, 2 placeholder, 50 mutating. The engine reported `zero-blocks-executed` and `changed-blocks-not-executed`. The 3 changed blocks (Step 3a, the extract, Step 3c) write `.claude/state/` files by design, so the allow-list refuses them, and no `--slot` or `--bind` can change that. They are executed instead by the committed `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, which substitutes and runs them under bash and zsh: 16/16 pass. The 2 placeholder blocks are unchanged by this diff. Shells: bash, zsh. `shared/resources/finalise-dod-ac-prompt.md` has no bash blocks.

Standards validation: `npm run validate -- skills/finalise/` passes (✓ finalise).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Stem-keyed scope and extract files | PASS | Verified | `SKILL.md:637`, `:1025`, `:1060`, `:1062`; `git grep -c 'finalise-\(rerun-scope\|ac-extract\)-\${DOD_N}'` reads 0 |
| Phase 2: The engine's refusals | CONCERNS | Verified | Refusals present and tested; T332-CR-1 is the nonexistent-file reason |
| Phase 3: Step 3c arms and the exact-path rule | CONCERNS | Verified | Arms present; T332-CR-2 is the unnamed remedy |
| Phase 4: Tests, CHANGELOG, bundle | CONCERNS | Verified | Symlink and nonexistent tests present; T332-QA-1 CHANGELOG citation |

**Overall Phase Completion**: 4/4 delivered, with 3 findings.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every § 8 row held in `finalise-rerun-scope.test.mjs` | 9 rows | 9 tests | PASS | no `--doc`; unnamed; unparseable (`:1868`); root fallback; nonexistent; scope missing; scope other doc ("must differ"); symlink; hash first with an unnamed result |
| Step 3c reads the stem-keyed paths | held by blocks test | `[bash]`/`[zsh]` "Step 3c refuses another document's scope at this item's stem-keyed path" | PASS | asserts no `finalise-rerun-scope-1.json` is written |
| `git grep -c` for the old paths reads 0 | 0 | 0 | PASS | run at 239beaaed |

**Performance:** not applicable, because no bound is claimed.

**Code Quality:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every § 8 mutation recorded with the test it turned red | 7 | 7 | PASS | table below |
| `npm run test:remote` and `bundle:check` pass | green | 8,972/8,976; bundle 0 problems | PASS | the 1 failure is load-only, see Regression Testing |

**Migration:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Step 3c arms for unnamed and scope-missing HALT with remedies | present | present | CONCERNS | T332-CR-2: the unnamed remedy misses the agent-omitted case |
| CHANGELOG names the three changes and every resume point | present | present | CONCERNS | T332-QA-1: `changelog-cites.sh` answers `missing (task 332)` |

### Mutation record (criterion "recorded in the QA report")

Proved at develop Step 3 (2026-11-27). Each mutation was applied by hand to the source file, run, and then reverted, after which the suite was green again: 96/96 on the two files.

```
mutation-proven: --doc made optional (opts.doc === "" only) → "merge with no --doc is a usage error, exit 2, and nothing is recorded (CLI, task 332)" → covered
mutation-proven: result-document-unnamed refusal disabled → "merge: a result with no story_file is refused as result-document-unnamed and nothing is recorded (CLI, task 332)" → covered
mutation-proven: root story_file fallback removed from storyFileOf → "merge: a root story_file beside an ac_traceability block that lacks one is checked (CLI, task 332)" → covered
mutation-proven: scope-document-missing reason folded into scope-document-mismatch → "merge --doc: a scope with no document is scope-document-missing, not another document's scope (CLI, task 332)" → covered
mutation-proven: realpath branch of sameDocument disabled → "merge: story_file naming the document through a symlink merges (CLI, task 332)" → covered
mutation-proven: Step 3a scope path reverted to finalise-rerun-scope-${DOD_N}.json → 10 eval cases red (bash and zsh), incl. "Step 3c refuses another document's scope at this item's stem-keyed path …" → covered
mutation-proven: unnamed check run on every parsed result (not only one with an acs list) → "merge: unparseable output writes no record (CLI)" → covered
```

7 of 7 § 8 mutations are proven, each by a committed test.

**CHANGELOG citation:** `changelog-cites.sh task.332` → exit 1, `missing (task 332)`. This is T332-QA-1.

**Criteria drift:** `criteria-drift.js` → `clean` (base: review-commit), no changed criteria.

---

## Breaking Changes Validation

### Breaking Change: `merge` requires `--doc`
Documented: Yes · Migration Path Provided: Yes (Step 3c passes it) · Migration Tested: Yes (blocks test) · Consumer Code Updated: Yes (every test CLI call passes `--doc`)

### Breaking Change: a result naming no document is refused
Documented: Yes · Migration Path Provided: Yes (the AC prompt asks for `story_file`) · Migration Tested: Yes · Consumer Code Updated: Yes (eval fixtures use `AGENT_NAMED`). The remedy has a gap: T332-CR-2.

### Breaking Change: scope and extract state paths are stem-keyed
Documented: Yes · Migration Path Provided: Yes (the CHANGELOG resume sentence) · Migration Tested: Yes (mutation 6) · Consumer Code Updated: Yes

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue T332-QA-1: the CHANGELOG entry does not cite the task on one line**
- **Severity**: MEDIUM · **Category**: Quality
- **Observation**: `CHANGELOG.md:20-21` wraps `(task` / `332)` onto two lines. `changelog-cites.sh` reads lines one at a time, so it answers `missing (task 332)`. The entry also says "no state file of the AC merge is shared by two items". That is not true of `finalise-rerun-at-head-${DOD_N}` (CR-3).
- **Impact**: `/finalise` 6d HALTs.
- **Recommendation**: rewrap so `(task 332)` sits on one line, and narrow the claim to the scope and extract files.

**Issue T332-CR-1: a nonexistent `story_file` shares a reason and remedy with another document's answer**
- **Severity**: MEDIUM · **Category**: Reliability · origin: code-review, reproduced by QA
- **Observation**: run in a scratch repo, `merge --doc docs/tasks/task.9.demo/task.9.demo.md` with `story_file: "task.9.demo.md"` answered `result-document-mismatch: --result names task.9.demo.md, which does not exist …`. Step 3c's arm for that reason prints "re-run the extract above, or hand-copy THIS item's AC agent answer to the result path, then re-run this block; never merge it". When the agent wrote the basename, re-extracting returns the same basename, so the HALT cannot be cleared. Control: `story_file: "docs/tasks/task.8.other/task.8.other.md"` (a real other document) answered "it is another document's answer", and that remedy, copying this item's answer, is correct there.
- **Provenance**: on `origin/develop` a basename was also refused as "another document's answer". The case is in scope, because the task's § 8 row "a `story_file` naming a file that does not exist" and the exact-path rule (G2-4) name it. So the finding stays in `top_issues`.
- **Recommendation**: give the case its own reason, plus a Step 3c arm whose remedy is to re-run the AC agent with the exact `<STORY_FILE>` path.

**Issue T332-CR-2: the `result-document-unnamed` remedy misses the agent-omitted case**
- **Severity**: MEDIUM · **Category**: Reliability · origin: code-review, reproduced by QA
- **Observation**: the same scratch run with no `story_file` answered `result-document-unnamed`. Step 3c's remedy (`SKILL.md:1078`) is "re-run the extract above, or hand-copy THIS item's full AC agent answer …". When the agent's own answer omits `story_file`, both routes bring back the same refusal. Control: a truncated hand copy of an answer that did name the document is cleared by that remedy.
- **Provenance**: new in this diff. `result-document-unnamed` did not exist on the base.
- **Recommendation**: name re-running the AC agent in the remedy for that case, and hold the wording in the blocks test.

### LOW Severity Issues (1)

- **CR-3** (pre-existing, out of scope): `finalise-rerun-at-head-${DOD_N}.json` and `.d` are still keyed by `DOD_N` alone. The paths are identical on `origin/develop`, and the task names only the scope and extract files (G3-1). This is routed to `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
Each merge adds one `existsSync` and parses the YAML twice (CR-4, advisory).

### Reliability — CONCERNS
T332-CR-1 and T332-CR-2: two HALTs cannot be cleared when the AC agent is the source of the bad `story_file`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, the same decision as task 331's gate 4. `sameDocument` and the new refusals read only artefacts the pipeline writes: the extracted AC YAML, Step 3a's scope JSON, and the substituted `--doc`. No corpus sink models those inputs, and the refusals exit 0 with a reason, so the `cli:` form has no exit-status verdict to score. `boundary_signals: []`, because `probe-boundary-signals.mjs` matched no phrase in the criteria. Every new branch refuses and writes nothing.

### Maintainability — PASS
One shared `readAnswer` predicate, a test per refusal, and 7 mutations proven.

---

## Code Review

**Correctness bugs (3):**
- [medium/medium] `shared/resources/finalise-rerun-scope.js:1276`: a nonexistent `story_file` and a real other document's answer share `result-document-mismatch`, and the remedy cannot clear the first → give it its own reason and arm. **Promoted: T332-CR-1** (reproduced by QA, 5d).
- [medium/medium] `skills/finalise/SKILL.md:1078`: the `result-document-unnamed` remedy covers a truncated hand copy only → add re-running the AC agent. **Promoted: T332-CR-2** (reproduced by QA, 5d).
- [low/medium] `skills/finalise/SKILL.md:641`: enumeration risk, because `finalise-rerun-at-head-${DOD_N}` is still shared → stem-key it or name it out of scope. Pre-existing on base and out of scope, so it goes to `recommendations.future`.

**Cleanups (1):**
- `shared/resources/finalise-rerun-scope.js:1265`: the CLI parses the answer with `readAnswer`, then `merge()` parses it again → pass the read answer in.

The reviewer's confidence is recorded unchanged. Every anchor checked `ok` (`finding-anchors.js`, rev 239beaaed).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run test:remote` on the LAN server (`CI=true`) | 8,972 pass / 1 fail / 8,976, in 1,806 s. The failure was `call-sites.test.mjs:771` AC4, 2,876 ms against a 2,000 ms bound, self-flagged LOAD-SENSITIVE, run while the server was under load from a game. Re-run alone on the idle server with the runner's docker flags, 3 times: 32/32 each. PASS |
| finalise blocks under bash and zsh | 16/16 PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-rerun-scope.js`, `shared/resources/tests/finalise-rerun-scope.test.mjs`, `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-ac-prompt.md`, `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs
CI=true TEST_REMOTE_TIMEOUT_MIN=90 npm run test:remote
npm run validate -- skills/finalise/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/changelog-cites.sh task.332
node shared/resources/finalise-rerun-scope.js merge … (scratch repo: basename / other document / no story_file)
```

### Coverage Report
Not measured. The suite has no coverage instrumentation.

---

## Recommendations

### Immediate Actions (Blocking)
1. T332-QA-1: rewrap the CHANGELOG citation and narrow the claim.
2. T332-CR-1: add a separate reason and arm for a nonexistent `story_file`.
3. T332-CR-2: add the re-run-the-agent remedy for an unnamed answer.

### Short-term Actions (Non-Blocking)
1. CR-3: stem-key the rerun-at-head paths (follow-up).
2. CR-4: parse the answer once.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three medium findings, no high ones. Reliability is CONCERNS.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T332-QA-1, T332-CR-1 and T332-CR-2 fixed.

---

**QA Report**: co-located at `task.332.qa.1.ac-merge-closes-task-331-follow-ups.md`
**Gate File**: co-located at `task.332.gate.1.ac-merge-closes-task-331-follow-ups.yml`
**Next Steps**: `/qa-fix` on gate 1, then QA cycle 2.
