# QA Report: Task 94 - Add the observe-work meta-skill

**Task**: [task.94.observe-work-skill.md](./task.94.observe-work-skill.md)
**Gate File**: [task.94.gate.1.observe-work-skill.yml](./task.94.gate.1.observe-work-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

All six implementation phases are complete, every registration gate passes, and `npm run ci:fast` is green at 2883/0. The task's own headline criteria are met and were verified rather than taken on trust — the 256-line body, the mutation-proved test glob, the shellcheck-clean hook with all four date branches exercised.

The gate is nonetheless **FAIL**, on one finding that no document-anchored check could have caught: **the Session Start Protocol branches on a `doctor` field the engine never populates**, so the log is never created — and the next step then reports it as cleanly empty. That is the skill's first action in every session, and it fails silently in exactly the way the observation-log contract's own design warns about.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed — 119/119 checkboxes, 0 unchecked
- [x] Tests passing — `npm run ci:fast` exit 0
- [x] Breaking changes documented (2, both additive)
- [x] Code on feature branch with open PR #354

### Testing Approach

- [x] Automated testing (unit + repo-level suites)
- [x] Code review of the branch diff
- [x] **Behavioural probing of the documented protocol against the real engine**
- [x] Regression testing
- [x] Security review
- [ ] Performance testing — N/A; the performance criterion here is context size, measured directly

### Review Methodology

**Direct tools throughout — no subagents dispatched.** The invoking session's operating instructions bar subagent dispatch unless the user asks for it, so Step 3b's Explore-subagent code review was performed inline instead. This is a deviation from the skill's default and is recorded here rather than left implicit: the code review happened, by a different mechanism, over the same `origin/develop...HEAD` diff.

Adaptive strategy: direct tools (first review, 23-file diff, single module).

**The decisive technique was executing the documented protocol, not reading it.** Every check that only reads the prose — template compliance, phase checkboxes, the 20 structural assertions, `quick_validate`, the repo-level suites — passes. TASK-94-001 is invisible to all of them, because the prose is internally consistent and self-describing; it is only wrong about something outside itself. Ten `observation-log.js` invocations against a real workspace found it in the first two.

### Step 4b — Execute the Documented Commands

Fires: the change set adds `skills/observe-work/SKILL.md` with fenced bash blocks.

```
node qa-execute-snippets.mjs --file skills/observe-work/SKILL.md --json
→ blocks: 5 | runnable: 0 | placeholder: 0 | mutating: 5
→ notes[]: no-executable-blocks
→ refusals: unrecognised-command: command (fail-closed) ×4
            unrecognised-command: source (fail-closed) ×1
→ shells: bash, zsh (both available)
→ findings: []
```

Per the skill's rule this is the **`no-executable-blocks`** case — information in `notes[]`, exit 0, `placeholder === 0` — **not** a finding, and not `zero-blocks-executed`. Recorded and continued.

Worth naming for a future task, though it is **not** a defect in task 94: all four `command`-prefixed refusals are of `command node`, which this repository *mandates* (a bare `node` on a machine where `node` is an nvm shell function prints nvm's help to stdout and corrupts any captured `--json`). The snippet engine's allow-list does not recognise `command`, so **Step 4b can never execute a block from any skill that follows the repo's own rule**. Logged in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1. Scaffold and frontmatter | PASS | `quick_validate` ✓ | Three placeholders deleted; `invokes: [create-skill]` inline flow, verified against `generate-skill-dependencies.mjs`, which rejects block form |
| 2. The lean core | **CONCERNS** | 20/20 structural | Body 256 lines / 13.1 KB. Attribution complete. **Session Start step 1 is wrong** — TASK-94-001 |
| 3. References | PASS | assertions ✓ | Five files, each opening `> **Load when**`, each with its own pointer-table row. None exceeds 300 lines; `review-cycle.md` carries a TOC regardless |
| 4. Tests | PASS | 20/20; glob proven | Mutation proof re-verified independently this cycle — see below |
| 5. Registration | PASS | regeneration clean | Catalog 126 skills under *Skill Tooling*, not "Other". `generate-catalog`, `generate-skill-deps` and `bundle` all re-run during QA: **no diff** |
| 6. Activation | **CONCERNS** | hook branches ✓ | Hook correct on dates and JSON; **undercounts open observations** — TASK-94-002 |

**Overall Phase Completion**: 6/6 complete, 2 carrying findings.

---

## Code Review

Performed inline over `git diff origin/develop...HEAD` (23 files, +4372/−127).

**Correctness bugs (2):**

- **[high/high]** `skills/observe-work/SKILL.md` § Session Start Protocol step 1 — branches on `doctor`'s `reason` for a condition the engine reports through `healthy` and `checks[]`. → Branch on `healthy` + `checks[].workspace-exists.ok`. (TASK-94-001)
- **[medium/high]** `shared/resources/observe-work-session-start.sh:47` — `grep -l '^status: open$'` matches neither `status: open ` nor the statusless fallback. → `grep -lE '^status:[[:space:]]*open[[:space:]]*$'`. (TASK-94-002)

**Cleanups (2):**

- `shared/resources/observation-log-contract.md:29,30,320,343,400,401` — six relative sibling links that dangle once bundled. (TASK-94-003)
- `skills/observe-work/tests/observe-work.test.js` — the two `matchAll` scans over `BODY` for write snippets use a `{0,300}` bounded lookahead. Correct for the current file; a longer future snippet would silently fall outside the window and the assertion would pass vacuously. Advisory only.

**What the review deliberately re-examined.** The `readOutside()` ENOENT-tolerance pattern is a real vacuity risk — every cross-file assertion degrades to a silent skip when the sibling is absent. The suite closes it with a dedicated in-repo guard that asserts the siblings *were* readable whenever `package.json` is present, so the degradation cannot apply here and leave a green suite. That is the correct shape and it is doing its job.

### mutation-proven

| Fixed defect / claimed invariant | mutation-proven |
|---|---|
| `package.json` glob actually runs the new suite | **yes** — assertion inverted → exit 1, 1 fail; reverted → exit 0, 20 pass. Glob string read out of `package.json` itself |
| "every authored reference has a pointer row" | **yes** — pointer row deleted while the reference's name was left in body prose (precisely the case the earlier substring form could not detect) → red |
| Hook's review-nag branches | **yes** — four fixtures: `never` and 30-days both nag; 2-days-fresh emits no nag; 2-days-fresh with an empty queue is entirely silent |
| Hook counts `status: open`, not the directory | **yes** — reported `2 open of 5` against a 5-file log |
| Remaining 18 assertions | **no** — not individually reverted this cycle |

Stated precisely because the task's own Code Quality criterion demands the glob be proven rather than assumed: four invariants were reverted and observed red, not all twenty.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `quick_validate.py` passes | pass | pass | PASS |
| `/observe-work` + `--review` documented | both | both, in `commands.md` | PASS |
| Session Start resolves via the resolver, never cwd | yes | yes, guarded `\|\| exit 1` at both sites | PASS |
| Every observation write is one engine call | yes | yes; no hand-rolled id/sweep/parse | PASS |
| Stages updates, never edits a live skill file | yes | stated in body + reference | PASS |
| Three scaffold placeholders deleted | yes | yes | PASS |
| `AGENTS.md` demands the protocol **by name** + backstop | yes | yes — and the engine's own `activation-configured` check independently reports "referenced in AGENTS.md" | PASS |
| Hook emits valid JSON; three date branches proven | yes | valid JSON parsed; **four** branches proven | PASS |
| Hook counts `status: open`, never a raw count | yes | intent correct, **implementation undercounts** | **CONCERNS** |

**Performance**

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Body under 500 lines | <500 | **256** | PASS |
| References over ~300 lines carry a TOC | yes | none exceed 300; `review-cycle.md` (215) has one anyway | PASS |
| Bundle size materially below ~214 KB | yes | **49.1 KB authored** (4.4×) | PASS |

**Code Quality**

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `npm test` passes with the glob, proven red | proven | RED exit 1 → GREEN exit 0 | PASS |
| `generate-catalog` / `generate-skill-deps` clean | clean | re-run in QA: no diff | PASS |
| `npm run bundle` clean | clean | re-run in QA: "in sync" | PASS |
| No hand-edited bundled reference | none | none | PASS |
| `skill-doc-coverage` without `UNDOCUMENTED_AT_ADOPTION` | yes | yes | PASS |

**Migration**

| Criterion | Actual | Status |
|---|---|---|
| `CHANGELOG.md` updated | yes | PASS |
| Catalog row under a real category | *Skill Tooling* | PASS |
| `shellcheck --severity=warning` on the hook — run | run, clean | PASS |
| Install reported as activation unverified | yes, in CHANGELOG, `environments.md` and the PR | PASS |

---

## Breaking Changes Validation

### Breaking Change 1: `package.json` test script gains a glob
Documented: Yes · Migration path: N/A (additive) · Tested: **Yes — mutation-proved** · Consumer code updated: N/A

### Breaking Change 2: generated files gain entries
Documented: Yes · Migration path: Yes (`npm run generate-catalog` / `generate-skill-deps`, never hand-edit) · Tested: Yes — both re-run during QA, clean diff · Consumer code updated: N/A

**Overall**: PASS

---

## Issues Found

### HIGH Severity (1)

**Session Start step 1 branches on a `doctor` reason the engine never emits**
- **Category**: Functional
- **Bug Report**: [task.94.bug.1.doctor-reason-branch.md](./task.94.bug.1.doctor-reason-branch.md)
- **Observation**: `doctor` on an uninitialised workspace returns `reason: "ok"`, `healthy: false`, `checks[].workspace-exists.ok: false`, exit 0. The table's "workspace missing" row keys on `reason` and never matches.
- **Impact**: `init` never runs; step 2's `scan` then answers `empty` for a workspace that does not exist. Two silent failures compounding into a reassuring one, in the skill's first action of every session.
- **Priority**: P1

### MEDIUM Severity (2)

**Hook undercounts open observations** — [bug.2](./task.94.bug.2.hook-status-whitespace.md). Hook said 1 open; engine said 2. P2.

**Bundled contract ships six dangling links** — [bug.3](./task.94.bug.3.bundled-contract-dangling-links.md). Invisible to CI, which link-checks `docs/**` only. P2.

### LOW Severity (1)

The two `matchAll` write-snippet scans in the test file use a `{0,300}` bounded window; a longer future snippet would fall outside it and pass vacuously. Advisory — no action required this cycle.

**Total**: HIGH 1, MEDIUM 2, LOW 1.

---

## NFR Assessment

### Security — PASS
No credentials, no network, no untrusted input. The hook reads two paths and writes only stdout; its single JSON interpolation escapes backslash and quote. `shellcheck --severity=warning` clean. The engine's ephemeral-anchor refusal was **observed firing** during this review when a probe was attempted under `/private/tmp` — the guard engages, it is not merely present.

### Performance — PASS
The performance criterion here is context cost, and it is met with margin: 256 lines against a 500 ceiling, 49.1 KB authored against ~214 KB upstream. The hook is two greps and a sort over one directory.

### Reliability — CONCERNS
The startup path does not do what it documents, and fails **silently** — the worst available direction for a capture feature whose absence looks identical to a quiet log. The hook's count diverges from the engine's on a reachable input. Against that: the date-fallback ladder is sound, and its pathological branch (`cutoff` → `9999-12-31`) fails toward nagging rather than toward silence, which is the right direction.

### Maintainability — PASS
Dense but every rule states why it exists. Authoring guidance is cross-referenced rather than restated — the one property that keeps it from drifting against `create-skill`. The pointer assertion was strengthened mid-implementation after the repo's own relationship-assertion lint rejected a substring form, and the replacement was mutation-proved.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite (2884 tests) | PASS — 2883 pass, 0 fail, 1 skipped |
| `create-skill` (gains an inbound `invokes:` edge) | PASS |
| `relationship-assertion-lint` | PASS 31/31 — was red mid-implementation on this task's own test; fixed structurally with a `Set`, not suppressed |
| `skill-frontmatter` / `skill-doc-coverage` / `executable-instructions` | PASS 12/12 |
| Generated-file drift | PASS — all three generators re-run, no diff |

No regressions.

---

## Test Artifacts

```bash
npm run ci:fast                                             # exit 0 — 2883 pass / 0 fail
node --test 'skills/observe-work/tests/*.test.js'           # 20/20
node --test tests/relationship-assertion-lint.test.js       # 31/31
node references/qa-execute-snippets.mjs --file skills/observe-work/SKILL.md --json
shellcheck --severity=warning shared/resources/observe-work-session-start.sh
npm run generate-catalog && npm run generate-skill-deps && npm run bundle   # no diff
node skills/observe-work/references/observation-log.js {doctor,init,scan,queue,write,checkpoint}
git worktree add --detach /tmp/probe HEAD                   # link check in the TRACKED tree
```

Coverage: not applicable — the deliverable is prose plus one POSIX shell script. Coverage here is the count of structural invariants asserted (20) and of documented behaviours executed against the real engine (10).

---

## Recommendations

### Immediate (blocking)
1. **TASK-94-001** — branch step 1 on `healthy` + `checks[]`. Verify the corrected branch against a genuinely uninitialised workspace, not a pre-existing one.
2. **TASK-94-002** — tolerate surrounding whitespace in the open count.
3. **TASK-94-003** — remove the six dangling links from the contract **source**.

### Short-term (non-blocking)
1. `qa-execute-snippets` cannot execute `command node`, so Step 4b is structurally inert for any skill obeying this repo's own rule. Deserves its own task.
2. `docs-link-check` is path-filtered to `docs/**`; everything under `skills/**` ships unchecked. TASK-94-003 is the first symptom.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH correctness defect in the skill's per-session entry point, found by executing the documented protocol rather than reading it. Everything the document-anchored checks can see is green; that is precisely why this needed probing.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-94-001 fixed and the corrected branch verified against a genuinely uninitialised workspace.

---

**Next Steps**: `/qa-fix` addresses all three findings, then QA cycle 2 re-reviews (a refute pass, per the loop's cycle-2 rule).
