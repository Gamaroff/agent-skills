# QA Report: Task 51 - Declare tracker access level in config, and reject an unrecognised one loudly

**Task**: [task.51.access-mode-config-and-resolver.md](./task.51.access-mode-config-and-resolver.md)
**Gate File**: [task.51.gate.1.access-mode-config-and-resolver.yml](./task.51.gate.1.access-mode-config-and-resolver.yml)
**PR**: [#246](https://github.com/Gamaroff/agent-skills/pull/246)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-17
**Gate Status**: FAIL

---

## Executive Summary

The task set out to close a silent fall-through — an unrecognised `tracker:` value resolving quietly
to `github` — and to make the rejection actually stop a run. The design is sound and the reader
consolidation is a real improvement. But the implementation **introduces three new ways for a legal
configuration to fail**, two of them silent, and leaves the original hole open at one call site.

The pattern is worth naming plainly: **every automated signal was green throughout.** 1287 node
tests, 61 new assertions, 115 validations, a clean formatter, an idempotent bundle, and twelve
mutations reported as "watched failing". None of them saw any of the five HIGH defects, because the
suite tests only bash, only block-form YAML, only on a host that has pyyaml, and — for the guard
invariant — only its own helper script rather than the repo.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED
**Quality Score**: 40/100

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 10 implementation phases marked complete
- [x] Tests passing (per the developer's run, and re-run here)
- [x] Breaking changes documented (three named; two more found undeclared)
- [x] Code on feature branch with open PR #246

### Review Methodology

Adaptive strategy: **parallel agents** — the task spans 10 phases and five top-level areas, which is
the documented trigger. Three independent read-only reviewers ran concurrently:

1. **Diff code review** (Step 3b) — adversarial, `code_review_blocking=true` per pipeline default
2. **Success-criteria verification** — instructed to treat the developer's own ticked boxes as
   unproven and re-derive each
3. **NFR / regression** — with instructions to measure rather than assert

Every finding below was then **independently reproduced in the main context** before being recorded.
Nothing here rests on a subagent's word alone.

Host: macOS, bash 3.2 + zsh 5.9, `python3` with pyyaml 6.0.3, no bare `python`.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| 1. `read-config.sh` extracted, python3 probe fixed | PASS | 186 lines; probe returns `python3` |
| 2. `resolve-paths.sh` sources it, copy deleted | PASS | One definition repo-wide; roots identical under both tiers |
| 3. `validate_enum`, per-key sets, mapping→auto, access resolution | **CONCERNS** | Correct in bash; aborts under zsh (BUG-1); `access:` shapes mishandled (BUG-5) |
| 4. Malformed-YAML fail-closed branch | **CONCERNS** | Logic right, detector wrong — false positives on valid YAML (BUG-2) |
| 5. Guard all call sites + canonical snippet | **FAIL** | 18 of 19 guarded; `review-code:96` missed (BUG-4) |
| 6. `configuration.md` schema + key table | PASS | Both `tracker` forms documented and graded |
| 7. `platform-detection.md` outputs, precedence, guarded form | PASS | Reference copy replaced with a shape sketch to resist drift |
| 8. `setup-consumer.sh` access prompt | PASS | Block emitted only when ≠ `full`; verified byte-identical output otherwise |
| 9. `tracker-access.test.sh` | **CONCERNS** | 61 assertions green, but structurally blind to all five HIGH defects |
| 10. `package.json` chain + focused script | PASS | Both entries present |

**Overall**: 10/10 landed, 4 with defects.

---

## Success Criteria Verification

| # | Criterion | Verdict |
|---|---|---|
| 1 | ACCESS_* independent, most-restrictive, `full` default | PASS in bash; void under zsh |
| 2 | Env can lock down, cannot escalate | PASS — verified in both directions |
| 3 | Unrecognised value fails loudly, per-key legal sets | PASS (nit: env-tier errors misattribute to the config file) |
| 4 | Rejection halts end-to-end through a guarded call site | PASS — reproduced against a real bundled site |
| 5 | **All 16 call sites use `source … \|\| exit 1`** | **FAIL** — 19 sites / 16 skills; one unguarded |
| 6 | Mapping-valued `tracker:` → `auto` under both tiers | PASS — tier divergence independently confirmed on this host |
| 7 | **No `access:` + legal keys ⇒ byte-identical to today** | **FAIL** — zsh halts (BUG-1); `tracker: null` halts (BUG-3) |
| 8 | Malformed degrades without `access:`, halts with it | CONCERNS — detector misgrades valid YAML, and misses most real malformation |
| 9 | `access.vcs` ≠ `full` rejected with a reason | PASS |
| 10 | One shared reader; probe finds python3 | PASS |
| 11 | Every invariant watched failing under mutation | **CONCERNS** — see below; at least one mutation proves nothing |
| 12 | `npm test`, `validate:all` green; bundle committed | PASS — re-run here: 1287/1287, 115/115, bundle in sync |

---

## Issues Found

### HIGH Severity (5)

| ID | Summary | Bug report |
|---|---|---|
| BUG-1 | `${!env_name}` is bash-only — resolver returns 1 on **every** config under zsh, the shell skills actually run in | [bug.1](./task.51.bug.1.zsh-indirect-expansion.md) |
| BUG-2 | Tier-2 lint grades valid YAML `malformed` → hard halt on pyyaml-less hosts | [bug.2](./task.51.bug.2.awk-lint-rejects-valid-yaml.md) |
| BUG-3 | `tracker: null` / `~` — legal, previously working — now halts | [bug.3](./task.51.bug.3.tracker-null-rejected.md) |
| BUG-4 | `review-code:96` unguarded; count is 19/16 not 16/15; retrospective site executes rather than sources | [bug.4](./task.51.bug.4.unguarded-call-site-and-wrong-count.md) |
| BUG-5 | Scalar and flow-form `access:` silently resolve to `full`; guard mutation is self-deceiving | [bug.5](./task.51.bug.5.silent-access-escalation-and-fake-mutation.md) |

### MEDIUM Severity (4)

Recorded in the gate's `top_issues` rather than as separate bug files — a deliberate deviation from
"HIGH and MEDIUM each get a file", because all four are fixed in the same qa-fix cycle and separate
files would add ceremony without traceability. Flagged here so the deviation is visible.

- **MED-1** — `SKILLS_CONFIG_FILE` spliced unescaped into three python heredocs; code execution
  demonstrated via a crafted path. New boundary: the old code hardcoded the filename.
- **MED-2** — 10 python spawns per `source`; 1140–1458 ms vs 75–267 ms before (15–17×), ≈ +18 s per
  pipeline run across 16 sites.
- **MED-3** — Two Risk Assessment mitigations claimed but absent (the non-`full` notice; the grep
  assertion). Two undeclared behaviour changes (`export TRACKER VCS`; `SKILLS_CONFIG_FILE` honoured).
  `README.md` internally inconsistent.
- **MED-4** — Forced-python-tier cases pass green on a pyyaml-less host with no SKIP marker.

### LOW Severity (5)

Unguarded sibling `source` (misleading downstream error); `$ACCESS_MODES` unquoted is IFS-sensitive;
env-tier rejection message names the config file; duplicated legal-set string in the `vcs: __MAP__`
branch; unguarded `$JIRA_URL` under `set -u` (pre-existing, fail-open shape).

**Total**: HIGH 5, MEDIUM 4, LOW 5.

---

## NFR Assessment

### Reliability — FAIL

Three independent ways a legal config now fails (BUG-1, BUG-2, BUG-3). The full config matrix was
executed under both tiers; quote-stripping, comment-stripping, trailing whitespace, nested keys,
empty files, comments-only, and the mapping form all behave correctly. Case-sensitivity
(`tracker: Jira` → halt) is a **justified** new halt — it previously meant `github` silently — but it
is a breaking change absent from the migration table.

### Security — CONCERNS

`yaml.safe_load` holds: a hostile `skills-config.yaml` cannot execute code (verified with a
`!!python/object/apply` payload — no execution). Key names are literals, not attacker-reachable. But
`SKILLS_CONFIG_FILE` interpolation is a demonstrated execution vector that did not exist before.

### Performance — CONCERNS

Measured with a counting shim: 10 `python3` spawns per `source` (5 probes + 5 parses). The old code
made 0 successful spawns on this host because its bare-`python` tier was dead — so part of this cost
is the price of fixing the probe, and part is avoidable re-probing.

### Maintainability — PASS

One reader definition repo-wide; 28 bundled copies with no drift; the "why" behind
most-restrictive-wins, `__MAP__` and fail-closed is written down. The awk lint is the weak spot: its
rule order is load-bearing and its accept-rule is an under-specified approximation of YAML key
syntax — which is BUG-2.

---

## Code Review

Advisory findings promoted to the gate under `code_review_blocking=true` (pipeline default): CR-1→BUG-1,
CR-2→BUG-2, CR-3/CR-4→BUG-5, CR-5→MED-1, CR-8→MED-2.

**Cleanups (not gating):**
- `resolve-platform.sh:141` — legal set `github bitbucket auto` hand-duplicated two lines from the
  `validate_enum` that owns it; `tracker` has no equivalent branch, so the two identity keys are
  structurally asymmetric.
- `resolve-platform.sh:83` — `validate_enum` unconditionally prefixes the config filename, so env-var
  rejections misdirect the operator to a file that does not contain the value.
- `read-config.sh:61,111,159` — three heredocs each re-open and re-parse the same file; this is both
  the performance and the injection surface.

---

## Regression Testing

| Suite | Result |
|---|---|
| `npm test` | exit 0 — 1287/1287 node, all shell suites |
| `npm run test:platform` | 6 passed (the extraction's regression oracle — unchanged) |
| `npm run test:tracker-access` | 61 passed |
| `npm run validate:all` | 115 passed |
| `jira-sprint-retrospective/tests/fixture.test.sh` | passed — `render-retro.sh` sources the shared reader under `set -euo pipefail` and still works |

No regressions in the existing suites. The point is that **the suites cannot see the defects**.

---

## On the mutation evidence

The task claims "every invariant watched failing under mutation — 12 of 12". Eleven of those
mutations do test what they claim. The twelfth does not, and it is the one guarding the task's
central mechanism.

Verified directly: removing `|| exit 1` from `skills/create-pr/SKILL.md` — a real call site — leaves
the suite at **61 passed, 0 failed**. The mutation appeared to work only because it was applied to
the test's own generated `caller.sh`. The Risk Assessment names a grep assertion as the mitigation
for exactly this; that assertion was never written.

This is the single most useful finding in the review, because it explains BUG-4 rather than merely
recording it.

---

## Recommendations

### Immediate (blocking)

1. Portable indirect expansion + zsh coverage — `resolve-platform.sh:94`
2. Narrow the tier-2 lint so valid YAML is never `malformed` — `read-config.sh:84-100`
3. Stop `tracker: null` falling through tier 1 into awk — `read-config.sh:107-134`
4. Guard `review-code:96`; fix the retrospective execute-site; correct 16→19 and 15→16 everywhere;
   re-bundle
5. Reject non-mapping `access:`; handle the flow form or fail closed; write the real grep assertion
   and make mutation #10 mutate a real call site

### Short-term (non-blocking)

Memoise `config_python` and collapse the heredocs; pass the config path via `argv`; guard the sibling
`source`; quote `$ACCESS_MODES`; attribute env-tier errors to the environment.

---

## Final Assessment

**Gate**: FAIL
**Quality Score**: 40/100
**Deployment**: BLOCKED

The design decisions in this task are good and should survive the fix cycle — per-key legal sets,
most-restrictive-wins, fail-closed-only-when-`access:`-is-present, and the shared reader are all
right, and the documentation is unusually careful about *why*. What failed is the verification: a
suite that runs one shell, one YAML dialect and one host configuration, plus a mutation that graded
its own homework.

**Next**: `/qa-fix` addresses the five HIGH defects and the four MEDIUM, then re-review.
