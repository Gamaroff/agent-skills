# QA Report: Task 108 - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: [Link to task document](./task.108.bundler-rewrites-relative-links.md)
**Gate File**: [task.108.gate.1.bundler-rewrites-relative-links.yml](./task.108.gate.1.bundler-rewrites-relative-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

Every phase and success criterion was re-verified independently of the developer's record: the new checker goes 845 → 0 over 606 files, `npm run bundle` is a no-op on its second run, `bundle --check --all` reports 0 problems across 126 skills, three freshly packaged skills extract with 0 broken links and no duplicate zip entries, all 31 distinct upstream URLs the pass emitted resolve, and CI on PR #396 is green on all five checks. Three QA-chosen mutants (in-skill branch disabled, bundled-set ignored, `<…>` placeholder dropped) were each caught by the new tests. The adversarial diff review found one high-confidence correctness bug — the new eval parity helper fails **open** when the bundler cannot run — which gates under `code_review_blocking` as MEDIUM, plus two low bugs and five cleanups (advisory).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 `[x]`)
- [x] Tests passing (`npm run ci:fast` 3,196/0 per dev; CI `test` job green on PR #396)
- [x] Breaking changes documented (none for consumers; in-repo churn labelled)
- [x] Code on feature branch with open PR (#396, OPEN, head `0e5e36b1`)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing (existing bundler suites, eval parity suites, `validate:all`)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b subagent + QA probes)
- [ ] Manual Testing — n/a (no UI)
- [ ] Performance Testing — not required; timings observed

### Review Methodology

Direct tools (3 phases, one module `create-skill/scripts` + `tests/`, medium risk, first review) plus one read-only Explore subagent for the Step 3b diff code review over the behaviour diff (`origin/develop...HEAD` excluding `skills/*/references/*` and `docs/tasks/*`; 1,292 lines, 12 files). Step 4b: **not applicable — no runnable prose in the change set** (no `SKILL.md` or `shared/resources/*.md` modified; the 205 `references/` copies are bundler output). Step 3c mutation spot-check: QA ran its own three mutants (below), separate from the developer's two.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: measure (checker + floor, baseline) | PASS | Verified | `tests/bundled-links.test.js` + `tests/lib/markdown-links.js`; baseline 845/215 recorded in the test header and implementation report; floor 200/1,000 mutation-proved (empty walk → red) |
| Phase 2: rewrite in the bundler | PASS | Verified | `rewrite_md_links()` one rule; `expected_bytes` takes the bundled population; `package_skill.py` imports the pass; idempotency proven twice (dev + QA) |
| Phase 3: guard + audit note | PASS | Verified | Runs under `npm test` (CI `test` job green); audit Theme F carries the close-out note; packaging.md, AGENTS.md, CHANGELOG updated |

**Overall Phase Completion**: 3/3 phases (5/5 checkboxes)

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. Checker 0 broken, ≥200 files / ≥1,000 links | 0 | 0 broken; 606 files, 1,985 parsed (855 relative) | PASS | QA re-ran |
| 2. `npm run bundle` idempotent | no diff | second run: status + diff hashes identical | PASS | QA re-ran |
| 3. Zip has no broken relative links | 0 | review-task, finalise, develop-story: 67 md, 101 links, 0 broken; 0 duplicate entries | PASS | QA packaged different skills from the dev's three |
| 4. Runs under `npm test` → ci / test.yml | yes | `tests/*.test.js` glob; CI `test` job pass 1m46s | PASS | |
| 5. Mutation proof recorded | yes | dev: 2 mutants; QA: 3 further mutants all caught | PASS | |
| 6. Audit note points at task | yes | Theme F close-out block | PASS | |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Formatting | prettier clean | `All matched files use Prettier code style!` | PASS | |
| Bundle freshness | 0 problems | 126 skills, 0 problems | PASS | |
| Skill validation | all pass | `validate:all` 126 passed | PASS | |
| Python compile | ok | 3 scripts compile | PASS | |
| Upstream URLs resolve | all | 31/31 distinct targets exist | PASS | |

---

## Breaking Changes Validation

### Breaking Change: 205 bundled `.md` copies rewritten in one commit
Documented: Yes (§5, CHANGELOG, PR body, commit `0e5e36b`)
Migration Path Provided: N/A — consumers gain working links; no action
Migration Tested: Yes — zip extraction and in-tree checks
Consumer Code Updated: N/A
Notes: `docs/templates/` is excluded from the `docs-link-check.yml` lane, so the `{ARCH_ROOT}`-style placeholder targets in the epic template cannot trip it — verified against the workflow's `grep -v '^docs/templates/'`.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CR-1 — eval parity helper fails open when the bundler cannot run**
- **Severity**: MEDIUM
- **Category**: Quality (test infrastructure correctness)
- **Bug Report**: none — tracked in the gate `top_issues[]` and this report (code-review finding, single-line fix)
- **Observation**: `isFreshBundledCopy()` in `evals/shared/lib/bundled-parity.mjs:93` returns `!problems.has(rel)` and never reads `ok`; when `execFileSync` throws (no `python3`, ENOENT) or the skill is unresolvable, `problems` is empty and every banner-carrying copy is certified fresh. `transition-protocol-parity.test.mjs` uses it to allowlist bundled copies, so that guard fails open in exactly the environment where it cannot look. `bundleCheck()`'s own docstring promises the opposite.
- **Impact**: a CI runner without `python3` would silently exempt every bundled `tracker-comment-contract.md` / `jira-transition-protocol.md` copy from the MCP-comment prohibition.
- **Recommendation**: `const { ok, problems } = bundleCheck(skillDir); return ok && !problems.has(rel);` plus a test that an unrunnable bundler yields `false`.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-2** `bundle_skill.py:266` — a root-absolute target (`/docs/x.md`) makes `os.path.join` discard `src_dir` and emits a `blob/develop//docs/…` URL, while the JS twin resolves it relative to the file; the twins disagree on this input. No such link exists in the corpus. → treat a leading `/` identically on both sides.
- **CR-3** `tests/bundled-links.test.js:88` — `decodeURIComponent` throws `URIError` on a literal `%` that is not a valid escape, aborting the scan instead of reporting the link. → try/catch falling back to the raw target.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Bundle of 126 skills and the 606-file checker each complete in seconds. CR-5 (corpus scanned twice, ~0.5 s each) and CR-6 (`find_repo_root` walk per bundled file) are avoidable work, advisory.

### Reliability — PASS
Idempotency proven; bundled-sibling decision drawn from `needed ∪ reconcilable` on both write and check paths; floor mutation-proved. CR-3 is a crash-instead-of-report on an input the corpus does not contain.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Build tooling only; one new subprocess with a fixed argv; no network, no secrets, no shell interpolation of document text. Verdict reached by reading.

### Maintainability — PASS
One rule and one constant; the JS/Python twin relationship is documented on both sides and the docs name it. `package_skill.py` imports instead of copying. CR-4/7/8 are hygiene.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `evals/shared/lib/bundled-parity.mjs:93` — `isFreshBundledCopy` ignores `ok`, failing open when the bundler cannot run → return `ok && !problems.has(rel)`. **Promoted to gate `top_issues[]` as CR-1 (code_review_blocking).**
- [low/medium] `skills/create-skill/scripts/bundle_skill.py:266` — root-absolute target produces a double-slash upstream URL and disagrees with the JS twin → treat leading `/` identically in both.
- [low/medium] `tests/bundled-links.test.js:88` — `decodeURIComponent` can throw and abort the scan → guard and fall back.

**Cleanups (5):**
- `tests/bundle-link-rewrite.test.js:68` — fixtures never removed; siblings use `t.after(rmSync)` → match them.
- `tests/bundled-links.test.js:157` — corpus scanned twice → memoise `scan()`.
- `skills/create-skill/scripts/bundle_skill.py:300` — `find_repo_root` re-walked per file → resolve once per caller.
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:747` — import sits 730 lines below the import block → move up.
- `skills/create-skill/scripts/package_skill.py:118` — comment overstates population parity; the real precondition is an up-to-date in-tree bundle → reword.

**QA mutation spot-check (Step 3c)** — three mutants chosen by QA, distinct from the developer's:
- in-skill branch of `_relocate_target` disabled → `bundle-link-rewrite.test.js` 2/4 red — mutation-proven: yes
- `bundled_names` ignored (every shared sibling treated as bundled) → 1/4 red — mutation-proven: yes
- `<…>` dropped from the placeholder pattern → `bundled-links.test.js` 2/6 red — mutation-proven: yes

---

## Regression Testing

| Area | Result |
| --- | --- |
| Existing bundler suites (`bundle-transitive`, `bundle-check-mode`, `bundle-mjs`) | PASS (127/127 with the new suites) |
| Eval parity suites (`finalise-dod-prompt-contract`, `transition-protocol-parity`) | PASS (59/59); tampering a bundled allowlisted copy is still flagged |
| `bundle --check --all` | PASS 126 skills, 0 problems |
| `validate:all` (quick_validate over every skill — `collect_shared_refs` changed) | PASS 126 |
| `docs-link-check` lane (changed docs) | PASS on PR #396 |
| Link grammar coverage of the corpus | 0 reference-style definitions, 0 `<…>` destinations, 0 `<a href>` — nothing outside the checker's grammar exists today |

---

## Test Artifacts

### Files Reviewed
`skills/create-skill/scripts/bundle_skill.py`, `package_skill.py`, `quick_validate.py`; `tests/lib/markdown-links.js`, `tests/bundled-links.test.js`, `tests/bundle-link-rewrite.test.js`; `evals/shared/lib/bundled-parity.mjs`, the two rewired eval tests; `docs/contributing/packaging.md`, audit note, `AGENTS.md`, `CHANGELOG.md`; the 10 source-side link repairs; sampled `references/` hunks.

### Test Commands Executed
```bash
node --test tests/bundled-links.test.js tests/bundle-link-rewrite.test.js tests/bundle-*.test.js evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/transition-protocol-parity.test.mjs
npx prettier --check .
python3 skills/create-skill/scripts/bundle_skill.py --check --all
npm run validate:all
python3 skills/create-skill/scripts/package_skill.py skills/{review-task,finalise,develop-story} <tmp>   # + unzip + link walk
gh pr view 396 --json statusCheckRollup   # SUCCESS
```

### Coverage Report
Not instrumented (node:test without coverage); 10 new tests, 4 QA + 2 dev mutants recorded above.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — fail closed in `isFreshBundledCopy()`; add the unrunnable-bundler test.

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3 — the two low bugs; cheap, same files.
2. CR-4..CR-8 — hygiene.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every success criterion holds under independent re-verification; one high-confidence MEDIUM correctness bug in new test infrastructure enters the gate under `code_review_blocking`.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and mutation-proved.

---

**QA Report**: co-located at `task.108.qa.1.bundler-rewrites-relative-links.md`
**Gate File**: co-located at `task.108.gate.1.bundler-rewrites-relative-links.yml`
**Next Steps**: `/qa-fix` on the gate; re-review.
