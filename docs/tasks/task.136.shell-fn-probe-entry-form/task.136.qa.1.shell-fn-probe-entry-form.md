# QA Report: Task 136 - A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Task**: [Link to task document](./task.136.shell-fn-probe-entry-form.md)
**Gate File**: [task.136.gate.1.shell-fn-probe-entry-form.yml](./task.136.gate.1.shell-fn-probe-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Full review of PR #462 (`031a3e66`, 16 source files, +1122/−75, bundled copies excluded): all four phases verified against the diff, every success criterion met, the fast gate green (3878/3879, 0 fail), and the security axis **measured** — 41 probes executed, the new `shell-fn:` form `engages` on the live `gh-labels.sh#gh_labels_filter` boundary under bash and zsh, and the `shell-fn:` containment/name gate refuses every hostile path and every hostile function name. The diff code review found one high-confidence correctness bug (CR-1): `--fake-gh` is validated and **recorded** for a JS-form entry the JS runner never puts on `PATH`, so a record can claim a fixture answered when the real `gh` did. Under `code_review_blocking=true` that is a MEDIUM in `top_issues[]` → **CONCERNS**.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-136-BUG-1 and re-review

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 `[x]`)
- [x] Tests passing (`npm run ci:fast` re-run by QA: 3878/3879, 0 fail)
- [x] Breaking changes documented (None — additive; record gains `fakeGh`/`fake_gh`, null for other forms)
- [x] Code on feature branch with open PR (#462, base `develop`, head `031a3e66`)

### Testing Approach

- [x] Automated Testing (unit: `security-probe.test.mjs` 57/57 incl. 12 new rows; `probe-boundary-signals.test.mjs` 10/10; full `ci:fast`)
- [x] Regression Testing (every pre-existing `shell:` and JS row unchanged and green; `evals/shared/tests` 502/502)
- [x] Security Review (probe engine executed — 41 probes, record beside this report)
- [x] Code Review (Step 3b — read-only Explore reviewer over the scoped diff, 4 findings)
- [x] Mutation-proof spot check (Step 3c — 4 mutants by QA, independent of develop's 5)
- [ ] Manual Testing (not applicable)
- [ ] Performance Testing (timing observed, no benchmark — see NFR)

### Review Methodology

Direct tools plus the Step 3b reviewer subagent (first review; 4 phases across engine, fixtures, tests and four prose files — "default: direct tools first"). First review, so no re-review scope. Step 4b: fired (five prose files carry fenced bash) — see below. Adaptive strategy override: none (standard mode).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: fixtures and red rows | PASS | Verified | `tests/fixtures/fake-gh/gh` mode 100755 (`git ls-files --stage`); answers `-q` one-per-line and JSON; refuses without `FAKE_GH=1` (row asserts all three). `gh-labels.cases.json` 10 cases / 7 hostile, `expected` is the function's contract. `echo-unfiltered.sh` red library. 12 rows added; the develop log records 10 red before Phase 2. `syntax-error.sh` written at test time (a tracked broken `.sh` would fail the ShellCheck lane) — Files Summary says so. |
| Phase 2: entry resolution and runner | CONCERNS | Verified | `SHELL_FN_PREFIX`, name regex, third `resolveEntry` branch with the same containment; `runShellCase` argv branch with no-rc flags, `PATH` prepend + `FAKE_GH=1`, exits 97/98 → named decline; `fake_gh` on the record; CLI `--fake-gh`. **CR-1**: the JS runner ignores `fakeGh` while the result/record carry it (TASK-136-BUG-1). |
| Phase 3: rule and prompts | PASS | Verified | `probe-boundary-rule.md` §5 states the signal once; `finalise-dod-security-prompt.md` (3 sites), `security-review-prompt.md` (2 — the fourth site the extended pin found), qa-task/qa-story Step 3b cite it. Pin extended to `shell-fn:` + `--fake-gh`; reverting one site reds it (develop log; re-confirmed by reading the test). |
| Phase 4: bundle, evidence, CHANGELOG | PASS | Verified | `bundle:check` 0 problems (10 bundled copies); CHANGELOG [Unreleased] entry; evidence run recorded in the implementation report and re-run by QA (below). |

**Overall Phase Completion**: 4/4 phases complete; 1 with a finding.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `shell-fn:…#gh_labels_filter` + cases file + `--fake-gh` → `engages`; without `--fake-gh` names the mismatch, no hang | engages / named | engages (20/20, bash+zsh); without: exit 1 in 1.6 s, `present-but-inert`, first detail `stdout "$(touch pwned).label\n" ≠ ""`, 1 sentinel escape | PASS | QA re-ran both |
| echo library → `absent`; syntax-error library → `unverifiable` with exit 97 every case | as stated | `absent` / `entry-not-probeable`, 20/20 cases `errored` with `exit 97` | PASS | rows green |
| Every existing `security-probe.test.mjs` row unchanged and green | 45 | 45 pre-existing rows green, unchanged | PASS | |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `shell-fn:` run over the corpus under both shells inside the default timeout | < timeout | ~0.9 s for 10 × 2 | PASS | |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Both mutation proofs recorded; `ci:fast`, `bundle:check`, Prettier, shellcheck on the fixture green | all | 5 develop mutants + 4 QA mutants recorded; ci:fast 0 fail; bundle:check 0; prettier clean; `shellcheck --severity=warning tests/fixtures/fake-gh/gh` clean | PASS | |

**Migration**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Header signal stated once; prompts + Step 3b cite it; CHANGELOG | once | once in `probe-boundary-rule.md` §5; 4 citing sites; CHANGELOG | PASS | |
| Obs #138 `actioned`; task.125 DoD override cited | — | task.125 DoD § Step 5 cited in the implementation report; obs #138 status is a finalise-time write | PASS (deferred to finalise) | |

---

## Breaking Changes Validation

None declared, and none found: both existing entry spellings resolve as before (45 pre-existing rows green), `--fake-gh` is optional, and a run without it produces the same result shape plus `fakeGh: null`. Record consumers (`qa-gate-security-evidence.md`) read `verdict`/`reason`/`totals` and ignore unknown keys — `readRecord`'s `validControl` accepts the extra `fake_gh` key (verified by the CLI + record row).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: `--fake-gh` recorded on a JS-form entry the runner never puts it on PATH for**
- **Severity**: MEDIUM
- **Category**: Functional (record truthfulness)
- **Bug Report**: [task.136.bug.1.fake-gh-recorded-on-js-entry.md](./task.136.bug.1.fake-gh-recorded-on-js-entry.md)
- **Observation**: `runProbeSpec({ entry: "…engaging-control.mjs#validateHost", fakeGh: "tests/fixtures/fake-gh" })` → `engages`, `fakeGh: <dir>`; the JS runner spawns with `sandboxEnv({ cwd: workDir })` (`security-probe.mjs:714`) — no `PATH` prepend, no `FAKE_GH`.
- **Impact**: a record can say a fixture answered when the network did — the misreport the field exists to prevent.
- **Recommendation**: decline `--fake-gh` on `kind: "js"` with `bad-fake-gh` (only the shell forms consult `PATH`), plus a row.
- **Priority**: P2

### LOW Severity Issues (3, advisory — recorded here, not in the gate)

- **CR-2** `security-probe.mjs:388` — a function that itself exits 97/98 on a hostile input is indistinguishable from the reserved sentinels and is declined rather than scored. Documented as reserved; a stderr token or an in-body remap would make the codes harness-only.
- **CR-3** `security-probe.mjs:~1028` — the `filename` materialiser declines any input carrying `/`, so a real label such as `area/backend` cannot be a `shell-fn:` case (reproduced: `unverifiable no-hostile-evidence`, `cannot materialise "area/backend"`). Skip the per-case file write when `fnName` is set.
- **CR-4** `tests/fixtures/fake-gh/gh:39` — `issue create` reads `FAKE_GH_LOG` that nothing binds and no row exercises; the engine builds the child env from scratch, so the default is the only reachable path.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
`shell-fn:` over 10 cases × 2 shells ≈ 0.9 s; the 57-row suite 28 s; no new work on the JS or `shell:` arms.

### Reliability — PASS
Reserved exits fold into one named decline; `--fake-gh` validated before anything spawns; no hang without the fake (exit 1 in 1.6 s). CR-2 noted as advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 41 (record `task.136.qa.1.security.run.json`, `totals.executed` 41)
- `gh-labels-shell-fn` — `shell-fn:shared/resources/gh-labels.sh#gh_labels_filter` `--cases-file tests/fixtures/shell-fn/gh-labels.cases.json` `--fake-gh tests/fixtures/fake-gh` `--sink filename`: **engages**, shells `[bash, zsh]`, executed 20, reproduced 0, overblocked 0, escapes 0.
- `containsShellFnEntry` — `resolveEntry` through a QA wrapper (`.claude/state/t136-probe-wrapper.mjs`, maps `ok:false` → `false`), 21 cases: 8 path-containment hostile mirrored from task.128's set (`../`, deep `../`, absolute, `%2f`-encoded, symlink-shaped, NUL, prefix-not-boundary, empty), 7 function-name hostile (`$(id)`, backtick, `;`-chain, space, `/bin/sh`, empty, leading digit), 6 legitimate: **present-but-inert** — every case handled except `shellfn.symlink-escape`. **Provenance**: reproduced identically on `origin/develop` (`shell:uploads/link-to-etc/passwd` → `ok: true`), containment block byte-identical to base, and task.128 gate 5 carries the same limit as `future` → **pre-existing**, routed to `recommendations.future`, not `top_issues[]`.
- QA mutation spot check (Step 3c, `cp` snapshot / restore, `cmp` clean): `mutation-proven: SHELL_FN_NAME regex removed → "name no shell accepts" row → covered`; `mutation-proven: FAKE_GH=1 not set in env → "gh_labels_filter engages" row → covered`; `mutation-proven: fake_gh dropped from toRecordEntry → "records fake_gh" row → covered`; `mutation-proven: shell-fn readability pre-check skipped → (no row red; a missing library still declines via exit 97, cases.length 20 vs 0) → absorbed` (future: pin the pre-spawn decline).

### Maintainability — PASS
One branch, not a copy; one statement of the signal with four citing sites under a mutation-proved pin. CR-3/CR-4 advisory.

---

## Code Review

From Step 3b (read-only Explore reviewer, scoped diff of 17 files / 1640 lines, bundled copies excluded; verified by the reviewer against the tree and re-verified by QA by execution). `code_review_blocking=true` (pipeline run-level override; no per-doc `false`) → `CR_BLOCKING=true`.

**Correctness bugs (2):**
- [medium/high] `shared/resources/security-probe.mjs:644` — `fakeGh` validated and recorded for every entry kind but only `runShellCase` prepends it; the JS runner (`:714`) spawns with `sandboxEnv({ cwd: workDir })`, so a JS entry probed with `--fake-gh` reports `fake_gh: <dir>` while a real `gh` answered → decline `--fake-gh` on `kind: "js"` (or prepend in the JS env) and add a row. **Promoted to gate `top_issues[]` as TASK-136-BUG-1.**
- [low/medium] `shared/resources/security-probe.mjs:388` — a function's own exit 97/98 collides with the reserved sentinels (two states, one value) → stderr token or in-body remap. Advisory.

**Cleanups (2):**
- `shared/resources/security-probe.mjs:1028` — the `filename` materialiser's separator check declines slash-bearing labels for the `shell-fn:` form → skip the per-case file write when `fnName !== null`.
- `tests/fixtures/fake-gh/gh:39` — `FAKE_GH_LOG` is a constant wearing a variable's name: nothing binds it and no row exercises `issue create` → add the row or drop the branch.

**Boundary rule**: fired (the change set delivers two boundaries — the `shell-fn:` branch of `resolveEntry`, and the form's whole purpose is the `gh_labels_filter` boundary) — executed, `probes_executed: 41`, see NFR § Security.

**Step 4b (documented commands)**: fired — five changed files carry fenced bash. `finalise-dod-security-prompt.md` (1 block, `mutating`: write-redirection), `probe-boundary-rule.md` (1, `mutating`), `security-review-prompt.md` (1, `mutating`: `node` fail-closed) → `no-executable-blocks` (information). `skills/qa-task/SKILL.md` (17 blocks: 3 placeholder, 14 mutating) and `skills/qa-story/SKILL.md` (15: 4 placeholder, 11 mutating) → `zero-blocks-executed` (placeholder > 0: unbound `TASK_DIR`/`STORY_DIR`, `PR_JSON`, `TRACKER`/`GITHUB_ISSUE_QA` — every one a pipeline-bound input). **Provenance**: this diff touched no fenced block in either file (`git diff` shows 0 fence lines), so the finding is not attributable to this change; recorded as information, not gated. Shells: bash + zsh ran.

**Platform variance**: no environment-derived value is passed to a validating consumer by this diff (`fakeGh` is caller-supplied and resolved against the repo root; the sandbox `HOME`/`TMPDIR` are engine-created inside the sandbox root, unchanged from task.128). Not applicable.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shell:` arm (task.128 rows: BUG-2/3/5/7/8/9/11/12/13, CR-3/5/6) | PASS — all unchanged and green |
| JS arm (verdict/state-separation rows, key-set row incl. the new `fakeGh` key) | PASS |
| `probe-boundary-signals.test.mjs` (4 sites now under the extended pin) | PASS 10/10 |
| `tests/bundled-links.test.js` (the incidental qa-next template fix) | PASS — was red on `develop` at `c11d1f49` |
| `evals/shared/tests` (502) incl. prompt-contract parity | PASS |
| ShellCheck lane (`npm run lint:shell`, 74 sources incl. `echo-unfiltered.sh`) | clean |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/tests/probe-boundary-signals.test.mjs`, `tests/fixtures/fake-gh/gh`, `tests/fixtures/shell-fn/{gh-labels.cases.json,echo-unfiltered.sh}`, `shared/resources/{probe-boundary-rule,finalise-dod-security-prompt,security-review-prompt}.md`, `skills/{qa-task,qa-story}/SKILL.md`, `skills/qa-next/assets/run.template.md`, `CHANGELOG.md`, the task document, plan, review report and implementation report.

### Test Commands Executed
```bash
npm run ci:fast                                   # 3878/3879, 0 fail (log .claude/state/t136-qa-testlog.txt)
command node --test shared/resources/tests/security-probe.test.mjs        # 57/57
command node shared/resources/security-probe.mjs --entry .claude/state/t136-probe-wrapper.mjs#containsShellFnEntry --cases-file .claude/state/t136-probe-cases.json --record docs/tasks/task.136.shell-fn-probe-entry-form/task.136.qa.1.security.run.json --name containsShellFnEntry --json
command node shared/resources/security-probe.mjs --sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --record <same> --name gh-labels-shell-fn --json
command node shared/resources/security-probe.mjs --emit-block <record>      # probes_executed: 41, evidence: measured
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
```

### Coverage Report
Not instrumented in this repository (`node --test` without `--experimental-test-coverage`); every new branch has a row (resolution ×3, green, task.125 shape, red, source failure, undefined function, bad-fake-gh ×4 + outside-root, fake standalone, CLI + record, missing operand).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-136-BUG-1 (CR-1): decline `--fake-gh` on a `kind: "js"` entry with `bad-fake-gh`, plus the asserting row — P2.

### Short-term Actions (Non-Blocking)
1. CR-2: harness-only sentinel exits.
2. CR-3: no per-case file write for `shell-fn:` cases so slash-bearing labels can be probed.
3. CR-4: bind `FAKE_GH_LOG` in a row or drop the `issue create` branch.
4. Pin the pre-spawn decline for a missing `shell-fn:` library (`cases.length === 0`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM correctness finding (high confidence, reproduced) promoted under `code_review_blocking`; no HIGH, no NFR below PASS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-136-BUG-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.136.qa.1.shell-fn-probe-entry-form.md`
**Gate File**: co-located at `task.136.gate.1.shell-fn-probe-entry-form.yml`
**Next Steps**: `/qa-fix` on the gate; re-review (cycle 2 is a full refute pass).
