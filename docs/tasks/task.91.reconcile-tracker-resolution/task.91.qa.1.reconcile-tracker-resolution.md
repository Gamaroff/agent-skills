# QA Report: Task 91 - Reconcile install-time and run-time tracker resolution

**Task**: [task.91.reconcile-tracker-resolution.md](./task.91.reconcile-tracker-resolution.md)
**Gate File**: [task.91.gate.1.reconcile-tracker-resolution.yml](./task.91.gate.1.reconcile-tracker-resolution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-05
**Gate Status**: FAIL

---

## Executive Summary

The task's stated goal is met and I verified it independently: **all 12 config shapes I tested now
resolve identically at install time and run time**, including the three the task was filed to close.
The design decision that got there — do A *and* B, because they fix different rows — is correct and
well reasoned.

The gate fails on something the change acquired rather than something it set out to do. Delegating to
`resolve-platform.sh` imported that resolver's **entire failure surface**, and the installer maps all
of it onto one message: *"skills-config.yaml declares a tracker the resolver refuses — Fix the
`tracker:` key"*. A repo with a perfectly valid `tracker: github` and a restricted `access.vcs` now
**cannot install at all**, and is told to fix a key that is already correct. That is an install-blocking
regression, reproduced end to end.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases completed and ticked
- [x] Tests passing
- [x] Breaking change documented with a migration note
- [x] Code on feature branch with open PR #320

### Testing Approach

- [x] Automated Testing (`npm run ci` — full)
- [x] Behavioural Testing (the divergence table, run directly against both resolvers)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (Step 3b — adversarial Explore subagent)
- [x] Runnable-prose execution (Step 4b)

### Review Methodology

Direct tools for the document-anchored checks, plus **one adversarial Explore subagent** for the Step 3b
diff review, scoped to the two executable files (`setup-consumer.sh`, `resolve-platform.sh`) — 289 diff
lines rather than the full 5,084, because the other 4,795 are the 76 bundled duplicates plus markdown.

Parallel agents were **not** used for the document checks. The task's surface is two shell files and one
test file; the adaptive strategy's "large task / multiple modules" trigger is nominally met by file
count, but the reviewable logic is small and concentrated, and the risk here is behavioural rather than
architectural. The single adversarial pass on the executable diff is where the value was — and it is
what found every finding below.

**Every high-severity claim from the subagent was independently re-verified by execution before it
reached this gate.** Two of its findings I could not reproduce as stated and are not recorded.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Decide the approach | PASS | Verified | Reachability established by running the paths and downloading the real v0.45.0 archive (38 resolver copies confirmed present). Decision and rationale recorded in §3 *before* the code, as the plan required. |
| Phase 2: Unify or synchronise | CONCERNS | Partial | The unification works. The error contract it introduced does not — TASK-91-001, -003, -005. |
| Phase 3: Grade malformed input | CONCERNS | Partial | An unrecognised scalar is now refused at both ends ✅. But the refusal path cannot distinguish *which* key was refused — TASK-91-001. |
| Phase 4: Tests and documentation | PASS | Verified | Parity table extended, integration test added, 4 mutation proofs, docs and CHANGELOG updated. |

**Overall Phase Completion**: 2/4 clean, 2/4 with concerns.

---

## Success Criteria Verification

### Functional

Re-verified by running both resolvers over each shape, comparing them against **each other**:

| Shape | Runtime | Install | Agree |
| --- | --- | --- | --- |
| `tracker: jira` | jira | jira | ✅ |
| `tracker: "jira"` (double-quoted) | jira | jira | ✅ |
| `tracker: 'jira'` (single-quoted) | jira | jira | ✅ |
| CRLF line ending | jira | jira | ✅ |
| `tracker: auto` | github | github | ✅ |
| **no key, JIRA_URL in `.env`** | jira | jira | ✅ *(was jira→github)* |
| **`tracker: bitbucket`** | refused | refused | ✅ *(was github→refused)* |
| **`tracker:<TAB>jira`** | github | github | ✅ *(was jira→github)* |
| map form | github | github | ✅ |
| `access.tracker` only | github | github | ✅ |
| explicit `tracker: github` + stale `.env` | github | github | ✅ |
| empty `JIRA_URL=` in `.env` | github | github | ✅ |

All six functional success criteria are **met**. The three target rows are closed and no previously
passing shape regressed.

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm run ci` green | pass | **2429 tests, 0 failures**, exit 0 | PASS |
| `shellcheck` no new warnings | 0 new | branch **1**, baseline **1**, same pre-existing SC2209 | PASS |
| Every behaviour change mutation-proven | all | 4 proofs, each reverting the specific behaviour | PASS |
| `npm run bundle` run and committed | yes | 38 skills updated; pre-commit hook re-verified in sync | PASS |

`shellcheck` was run for real via `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable`,
against both the branch and a checkout of `origin/develop`. The daemon was down at first and was
started rather than recording the criterion unrunnable.

### Migration

| Criterion | Status |
| --- | --- |
| CHANGELOG names affected repos and the opt-out | PASS — names the exact shape, the opt-out, and why the wizard-generated case cannot reach it |
| The `DELIBERATE asymmetry` test updated or removed | PASS — inverted, with the history preserved in a comment |

---

## Breaking Changes Validation

### Breaking Change: `resolve-platform.sh` reads `.env` for `TRACKER`

- **Documented**: Yes — task §5, CHANGELOG, `platform-detection.md`
- **Migration Path Provided**: Yes — set an explicit `tracker: github`
- **Migration Tested**: **Yes** — verified that `tracker: github` + a stale `.env` resolves `github` on
  both sides, and that an empty `JIRA_URL=` does not trigger the probe
- **Consumer Code Updated**: N/A
- **Blast radius**: correctly bounded. The rung fires only when the config declares nothing, and the
  wizard has always written a `tracker:` key since task 83 — so no wizard-generated config can reach it.

**Assessment**: PASS. This is the change the task flagged as HIGH RISK, and it is the part that was
handled most carefully.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: rc 2 conflates every resolver refusal with a bad `tracker:` value**

- **Severity**: HIGH
- **Category**: Functional / Reliability
- **Bug Report**: [task.91.bug.1.rc2-conflates-every-resolver-refusal.md](./task.91.bug.1.rc2-conflates-every-resolver-refusal.md)
- **Observation**: `resolve-platform.sh` returns non-zero from at least five places unrelated to
  `tracker:` — the `access.vcs != full` guard, `validate_access_mode`, the `access:`-as-scalar guard, an
  unreadable `SKILLS_CONFIG_FILE` redirect, and the fail-closed unparseable-with-access branch. All
  become rc 2.
- **Reproduced**: a `tracker: github` config with `AGENT_SKILLS_ACCESS_VCS=read-only` returns `rc=2`;
  the installer aborts with *"Fix the `tracker:` key (legal values: jira, github, auto)"* while the
  resolver's own stderr says `❌ access.vcs: "read-only" is accepted as a key but not supported as a value.`
- **Impact**: install-blocking **regression**. The old implementation never sourced the resolver, so
  such a repo installed fine. The operator's most likely next action — editing a `tracker:` key that is
  already correct — cannot fix it.
- **Priority**: P0

### MEDIUM Severity Issues (4)

**Issue: the `.env` probe misses `export` and false-positives on CRLF** —
[bug.2](./task.91.bug.2.env-probe-spelling-and-crlf.md). Verified: `export JIRA_URL=…` → `github`
(should be `jira`); `JIRA_URL=` + CRLF → `jira` (should be `github`); `JIRA_URL=""` → `jira` (should be
`github`). The `export` miss reproduces the original bug class; the CRLF false-positive reintroduces
the exact spelling task 83 existed to fix, on the other side of the same decision. The third also
contradicts the comment shipped directly above the code.

**Issue: `--dry-run` previews with the previously-installed resolver** —
[bug.3](./task.91.bug.3.dry-run-previews-with-installed-resolver.md). Verified: `_locate_resolver`
returns `.agents/skills/create-epic/references/resolve-platform.sh` when `_tmpdir` is unset. Preview and
real run can still disagree — the bug class relocated, not removed. Also falsifies the new comment
asserting rc 3 is the expected dry-run outcome.

**Issue: rc 3 prints an unfiltered profile count** —
[bug.4](./task.91.bug.4.dry-run-unfiltered-profile-count.md). "tracker NOT RESOLVED" is immediately
followed by a count that applied no tracker filter, overstating the install by 11 or 6 skills.

**Issue: an empty-but-successful resolution aborts with no message** —
[bug.5](./task.91.bug.5.empty-tracker-reports-no-message.md). The error re-run only reprints stderr when
the resolver actually failed, so this path emits "see the message above" with nothing above it.

### LOW Severity Issues (5) — report only

1. With `_tmpdir` unset the first glob is **root-anchored** (`/skills/*/references/…`). The readability
   test correctly rejects an unmatched glob (no `nullglob`/`failglob`/`noglob` is set anywhere —
   verified), but a host that happens to have such a path would source a file from outside the repo.
2. Under `curl … | bash`, `BASH_SOURCE[0]` is the literal string `bash`, so `dirname` yields `.` and the
   third candidate becomes `../shared/resources/resolve-platform.sh` — the **parent of the consumer
   repo**. The `bash <(curl …)` form is harmless. The file already has an existence test for `_dry_cli`
   that could be reused here.
3. The success path swallows the resolver's stderr twice, so a *degraded* parse (`⚠️ could not be
   parsed — falling back to platform detection`, which still returns 0) is invisible at install time.
4. `setup-consumer.sh` never exports `JIRA_URL`, and `bash -c` only inherits exported variables — so the
   subshell cannot see the wizard's own in-process answer. Currently masked because
   `write_skills_config` runs first and always emits a `tracker:` key, but the masking is incidental.
5. `platform-detection.md`'s resolver **shape** omits the `[ -r .env ]` readability test the real code
   has. The section is explicitly labelled "shape, not a copy", so this is a fidelity note only.

**Total Issues**: HIGH: 1, MEDIUM: 4, LOW: 5

---

## NFR Assessment

### Security — PASS

No new vulnerabilities. `.env` is **grepped, never sourced** — the right call, and the code comment
reasons about it explicitly rather than leaving it to chance. The subshell delegation contains the
resolver rather than executing it in the installer's shell, which also contains its `return 1`. LOW-1
above is the only note.

### Performance — PASS

The resolver is sourced twice on any failure path (a `python3`/pyyaml spawn plus a `git remote` call
each time). Install-time only, once per run. Recorded as a cleanup, not a blocker.

### Reliability — FAIL

TASK-91-001 is an install-blocking regression on a config that is valid today, and TASK-91-005 adds a
failure path that prints no diagnosis at all.

Worth stating plainly, because it is the lesson rather than the line: **blast radius was named as a
first-class concern for this review, and it did not land where anyone was looking.** The `.env`
behaviour change — the thing the task, the CHANGELOG and the risk assessment all treat as the dangerous
part — is correctly gated behind config-key-wins, opt-out-able, and unreachable from any
wizard-generated config. The damage is in the **error contract** of the delegation, which nobody flagged
as risky because it reads like plumbing.

### Maintainability — CONCERNS

The change genuinely removes a duplicated decision, and the commentary is unusually good — it records
*why* the rejected options were rejected and pre-empts the two retries a future reader would attempt.
Against that:

- Two comments now describe deleted code: `_config_skills_profile` still says *"Config-first, exactly
  like `_resolve_install_tracker`"* (which no longer reads the config), and *"Normalise the way
  `_resolve_install_tracker` does: CRLF checkouts leave a carriage return"* (that normalisation is gone).
- `_locate_resolver` reads `_tmpdir` purely by **dynamic scope** from a caller's `local`. That
  undeclared coupling is exactly what makes TASK-91-003 invisible on inspection.

---

## Code Review

From Step 3b. Findings are advisory by default; this task did not set `code_review_blocking`, but the
HIGH finding is recorded in `top_issues` on its own merits as a functional defect, not via that route.

**Correctness bugs (5)** — all listed above as TASK-91-001 through -005, each reproduced by execution.

**Cleanups (8):**

- `setup-consumer.sh:885-887` — the tarball ships the canonical `shared/resources/` tree, and the file
  already reads two other tools from it. `${_tmpdir}/shared/resources/resolve-platform.sh` is one
  deterministic path; the current glob picks whichever of 38 bundled duplicates sorts first. Identical
  today by checksum — but that is a sync invariant, not a guarantee.
- `setup-consumer.sh:887` — `$(dirname "${BASH_SOURCE[0]}")` forks a subprocess inside the loop's word
  list on every call; hoist it.
- `setup-consumer.sh:901-909` — the resolver is sourced twice on failure; source once and capture stderr
  on a separate fd.
- `setup-consumer.sh` (both call sites) — the rc-2 error text and `record_step` wording are duplicated;
  fold into one helper so the two paths cannot drift apart the way the parsers did.
- `resolve-platform.sh:457-469` — `_rp_dotenv_has_jira` is defined and unset for one line of use. It is
  **safe as written** (no `return` between definition and `unset -f`, and the `_rp_` prefix makes a
  caller collision implausible) but it is three lines of caller-shell mutation for one `grep`.
- `setup-consumer.sh:938, 963` — the two stale comments named under Maintainability.
- `setup-consumer.sh:944-971` — `_config_skills_profile` / `_config_skills_list` are still hand-rolled
  awk YAML parsers with their own quote/CRLF normalisation: the same mirror-the-reader pattern this
  change just removed for `tracker:`, with the same failure modes waiting.
- `setup-consumer.sh:830-838` — `SKILLS_JIRA_ONLY` / `SKILLS_GITHUB_ONLY` remain mirrored in
  `resolve-skill-set-cli.mjs`, whose own comment admits it. One duplicated decision was removed; this
  one is still there.

### Claims checked and found sound

Recording these so a later cycle does not re-litigate them:

- The redirection order at the rc-2 re-run (`2>&1 >/dev/null`) is **correct** — it puts stderr, and only
  stderr, on the pipe.
- `_rc` is reliably set on both branches of the `&&`/`||` chain; no precedence trap.
- The `head -5` SIGPIPE is absorbed by the trailing `|| true`.
- `rm -rf "$_tmpdir"` cannot see an empty value — the assignment above it is bare under `set -e`.
- `unset -f` is reached on every path that reaches the definition.
- No `nullglob`/`failglob`/`noglob` is set anywhere in the script, so `[[ -r ]]` is the right guard for
  an unmatched glob.

---

## Step 3c: Mutation-Proof Spot Check

The four proofs claimed by the develop step were re-run and reproduce:

| Mutation | Tests red | Includes |
| --- | --- | --- |
| `.env` probe reverted | 2 | `install and run time agree on a .env-only JIRA_URL` |
| malformed-scalar refusal reverted | 2 | `install and run time agree on unrecognised scalar` |
| whole-resolution delegation → `read_config_key` only | 10 | `install and run time agree on tab separator` |
| `.env` probe reverted vs the new integration test | 3 | `a .env-only JIRA_URL installs the set its skills will actually resolve` |

`mutation-proven: yes` for all four behaviour changes shipped in this cycle. No vacuous guards found.

**A gap worth naming**: none of the five defects above is caught by any test in the suite. The parity
table pins *agreement between the resolvers*, which is exactly what the change achieves; it says nothing
about the installer's behaviour when the resolver refuses for a reason that is not about `tracker:`.
The tests are well-shaped for the property the task set out to guarantee and blind to the one it
accidentally changed.

---

## Step 4b: Documented Command Execution

Fires — the diff modifies `shared/resources/platform-detection.md`, a shared resource containing fenced
bash blocks.

Engine run with the working directory seeded from the repo
(`qa-execute-snippets.mjs --file shared/resources/platform-detection.md --copy .`):

- **Blocks found**: 5 — 1 `runnable`, 0 `placeholder`, 4 `mutating`
- **Executed**: 1 (line 520), exit 0
- **Findings**: 0
- **Shells**: bash and zsh both available and used

**Every skipped block, with its reason** (the silent-skip rule):

| Line | Class | Reason |
| --- | --- | --- |
| 11 | mutating | `unrecognised-command: source` (fail-closed) |
| 187 | mutating | `deny-list: gh issue` |
| **381** | mutating | `unrecognised-command: config_bulk, <unparseable>, validate_enum, git remote, resolve_access` (fail-closed) |
| 459 | mutating | `unrecognised-command: source, curl` (fail-closed) |

Line 381 is **the block this change edited**, and it was skipped. That is correct behaviour — the
section is titled "Resolver (shape, not a copy)" and calls resolver-internal functions the engine
cannot recognise — but it means the engine did not verify my edit. I checked that block against the
real code by hand instead; it is faithful apart from the omitted `[ -r .env ]` test recorded as LOW-5.

An initial run without `--copy` reported two `execution-failure` findings at line 520. Those are an
artifact of an unseeded temp directory, not defects: the block greps `skills/*/SKILL.md`, which does not
exist in an empty tree. Recorded rather than silently dropped.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci`) | PASS — 2429 tests, 0 failures, exit 0 |
| `resolve-platform.test.sh` (exercises the runtime resolver directly) | PASS |
| `tracker-access.test.sh` (the `access.*` axis this change now touches indirectly) | PASS — but see below |
| `setup-consumer-skill-exclusion.test.mjs` | PASS — 40/40, incl. 2 new tests and 1 new integration test |
| Bundle drift | PASS — pre-commit hook re-ran the bundler; all 38 in sync |

`tracker-access.test.sh` passing is worth a caveat: it exercises `resolve-platform.sh` directly, which
is unchanged on the access axis. It cannot see TASK-91-001, because that defect lives in how
`setup-consumer.sh` *interprets* the resolver's exit status. A green access suite is not evidence
against that finding.

---

## Test Artifacts

### Test Commands Executed

```
npm run ci                                              # 2429 tests, 0 failures, exit 0
node --test shared/resources/tests/setup-consumer-skill-exclusion.test.mjs   # 40/40
docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable scripts/setup-consumer.sh
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/platform-detection.md --copy . --json
```

Plus a 12-row divergence harness run directly against both resolvers, and four mutation runs.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-91-001 (P0)** — stop conflating a non-tracker resolver refusal with a bad `tracker:` value.
2. **TASK-91-002 (P1)** — fix the `.env` probe spellings and correct the comment that overstates them.
3. **TASK-91-003 (P1)** — stop the dry run previewing with a previously-installed resolver, or say so.
4. **TASK-91-004 (P2)** — do not print an unfiltered count under a "NOT RESOLVED" banner.
5. **TASK-91-005 (P2)** — give the empty-`TRACKER` case its own message.

### Short-term Actions (Non-Blocking)

The eight cleanups above, and specifically: pass `_tmpdir` as an argument rather than by dynamic scope,
and re-anchor the two stale comments.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Rationale**: One HIGH finding (an install-blocking regression on a currently-valid config, with a
misleading diagnosis) and a Reliability NFR of FAIL. Rule 1 of the deterministic gate applies.

The failure should not be read as a verdict on the approach. The core decision — that A and B fix
different rows and both are needed — is right, the empirical Phase 1 is a model of how to make that
call, and every functional success criterion is met and independently verified. What the change is
missing is the recognition that delegating to a validator means inheriting its **whole** failure
surface, not just the branch you wanted.

**Next Steps**: `/qa-fix` on the five findings, then re-review.
