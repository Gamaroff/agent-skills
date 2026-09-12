---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (observation-log engine; observe-work Session Start Protocol; the opt-in SessionStart hook)'
description: "observation-log.js doctor's activation-configured check reads <process.cwd()>/AGENTS.md, so at the invocation observe-work's own SKILL.md documents (cd into the skill, run references/observation-log.js) it reports 'no agent-instruction file mentions the observation log' for a repo whose AGENTS.md does — silently, with reason: ok and exit 0."
github_issue: 393
---

**Bug ID**: bug.15
**Related**: none — cross-cutting (`shared/resources/observation-log.js` `doctor`; `skills/observe-work/SKILL.md` Session Start step 1; `shared/resources/observe-work-session-start.sh`)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-09-12
**GitHub**: [#393](https://github.com/Gamaroff/agent-skills/issues/393)
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `doctor`'s `activation-configured` check resolves the agent-instruction file against
`process.cwd()` (`args.auditRoot || process.cwd()`), not against the repo root or the resolved
workspace anchor. `observe-work/SKILL.md` invokes every engine command as
`command node references/observation-log.js …` — a path that is only valid from inside the skill
directory — so the documented invocation runs with `cwd = skills/observe-work/`, where no
`AGENTS.md` exists, and the check false-negatives.

**Expected Behavior**: the check finds the project's `AGENTS.md` / `CLAUDE.md` regardless of where
the engine is invoked from — anchored at the repo root (`git rev-parse --show-toplevel`, or the
`repoWorktrees()` walk the engine already has) — and reports `configured` for this repo, whose
AGENTS.md contains "observation log" (lines 132-134).

**Actual Behavior**:

```
$ (cd skills/observe-work && source references/resolve-observation-workspace.sh \
     && command node references/observation-log.js doctor --json)
  "reason": "ok", "exitCode": 0, …
  { "check": "activation-configured", "ok": false,
    "detail": "no agent-instruction file mentions the observation log" }

$ (source shared/resources/resolve-observation-workspace.sh \
     && command node shared/resources/observation-log.js doctor --json)
  { "check": "activation-configured", "ok": true, "detail": "referenced in AGENTS.md" }
```

Same repo, same engine, opposite answers; the difference is the working directory.

**Impact**: the Session Start Protocol reads this check and, on `ok: false`, moves to step 4
("suggest adding an activation instruction") in a project that already has one — every session, in
the reference repo itself. `healthy` is `false` for the whole run, which trains the reader to ignore
`healthy`. The failure is silent: `reason` stays `ok` and the exit code `0`, so nothing downstream can
tell a real missing instruction from a wrong cwd. Logged as obs #14 on 2026-09-09; a staged fix
(`agentInstructionRoot()`, `state: configured | not-configured | no-agent-file`) exists in the
2026-09-08 `skill-updates/shared-resources/observation-log.js` but pre-dates task.94/95 and must be
re-derived against the live engine, not installed.

---

## Reproduction Steps

**Environment**: this repo, `develop` @ `6ce3280e`; `command node` v26.

**Steps to Reproduce**:

1. `cd skills/observe-work`
2. `source references/resolve-observation-workspace.sh || exit 1`
3. `command node references/observation-log.js doctor --json`
4. Read `checks[].check == "activation-configured"` → `ok: false`.
5. `cd ../..` and repeat with `shared/resources/observation-log.js` → `ok: true`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

Measured 2026-09-12 — see the two transcripts under *Actual Behavior*.

**Second site, found 2026-09-12 during the observation review**: `families --audit` anchors the same
way (`const root = args.auditRoot || process.cwd()`, ≈957) and looks for
`<root>/skills/<member>/SKILL.md`. From `skills/observe-work/` it reports **every** member of the
meta-skills family as `member-not-found`, with `reason: ok` — a family audit that cannot find its
members and does not say the instrument is wrong. From the repo root: `gaps: []`. So the fix is a
population check over every `process.cwd()` anchor in the engine, not one edit:

```
$ grep -n 'auditRoot || process.cwd()' shared/resources/observation-log.js
```

**Related Files**:

- `shared/resources/observation-log.js` ≈1119 (`const cwd = args.auditRoot || process.cwd()`),
  ≈957 (`families --audit`, same anchor),
  ≈1149-1159 (`["AGENTS.md","CLAUDE.md"].map(f => path.join(cwd, f))`, `/observation log/i`)
- `skills/observe-work/SKILL.md` — Session Start step 1 and the `activation-configured` row
- `shared/resources/observe-work-session-start.sh` — the opt-in hook takes its count from the same
  engine; check whether it is affected by the same cwd assumption
- `shared/resources/tests/observation-log.test.mjs` — no test runs `doctor` from a subdirectory

---

## Scope & Impact

**Reference**: `skills/observe-work/SKILL.md` §Session Start Protocol step 1 ("Act on the check,
never on `healthy` alone"); `shared/resources/observation-log-contract.md`.

**How It Failed**: the engine resolves the *workspace* through a resolver that explicitly refuses to
derive from the cwd, then resolves the *agent-instruction file* from the cwd anyway. Cross-cutting
because the engine, the skill's documented invocation and the SessionStart hook all share the
assumption.

---

## Recommendation

1. Anchor the agent-file lookup at the repo root (walk up from `cwd` to the first `.git`, or reuse
   `repoWorktrees()`); keep `--audit-root` as the override.
2. Emit a `state` field (`configured` / `not-configured` / `no-agent-file`) so the SKILL.md row can
   branch on it rather than on `ok`.
3. Add a test that runs `doctor` **and** `families --audit` from a subdirectory of a fixture repo whose root `AGENTS.md` mentions
   the observation log, and asserts `ok: true`; mutation-prove by reverting the anchor.
4. Close obs #14 with the resolution.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-12
**Developer**: Claude (develop-bug, autonomous run from `/develop-next`)

**Reproduction**: the report's five steps, verbatim, on `develop` @ `ce472992`:
`(cd skills/observe-work && source references/resolve-observation-workspace.sh && command node references/observation-log.js doctor --json)` →
`activation-configured: ok: false, "no agent-instruction file mentions the observation log"`, `reason: ok`, exit 0. The same command with `shared/resources/observation-log.js` from the repo root → `ok: true`. `families --audit` from `skills/observe-work/` → every meta-skills member `member-not-found`, `reason: ok`. Then encoded as four tests in `shared/resources/tests/observation-log.test.mjs` (§"project-root anchoring (bug 15)"), which failed 4/4 on the unfixed engine (48/52).

**Root Cause Analysis**: two independent `args.auditRoot || process.cwd()` anchors — `cmdFamilies` (≈957) and `cmdDoctor` (≈1119, feeding the `["AGENTS.md","CLAUDE.md"].map(f => path.join(cwd, f))` lookup at ≈1149). The engine already refuses to derive the *workspace* from the cwd (`resolve-observation-workspace.sh`) and already has a pure-`fs` upward `.git` walk (`repoWorktrees`), but the two *project* lookups never used it. A failed lookup also collapsed two situations into one `ok: false` — "file present, no mention" and "no file at this path" — so a wrong root was indistinguishable from an un-set-up project, and nothing reported which root had been used. The opt-in `SessionStart` hook is **not** affected: it calls only `queue`, which is workspace-anchored.

**Proposed Fix**: one `projectRoot(args)` — `--audit-root` verbatim, else nearest enclosing repo root, else cwd — used by both sites; report `root`; add `state` to the activation check; regression tests from a nested cwd, mutation-proved.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-12

**Root Cause**: `doctor` and `families --audit` anchored the project lookups at `process.cwd()` instead of the repository root, and the activation check could not say which of two different failures it was reporting.

**Fix Description**:
- Factored the upward `.git` walk out of `repoWorktrees()` into `nearestGitEntry(from)` (pure `fs`, no shell-out — the engine's standing rule) and added `projectRoot(args)`: `--audit-root` taken verbatim (an instruction, not a hint — a wrong one is not rescued by the walk), otherwise the nearest enclosing repository root, otherwise the cwd. Both `cmdDoctor` and `cmdFamilies --audit` now anchor there, so the documented cd-into-the-skill invocation answers the same as one from the repo root.
- `doctor` and `families --audit` both report the `root` they resolved, so a wrong answer is checkable rather than merely believable.
- The `activation-configured` check gains `state: configured | not-configured | no-agent-file` and a detail that names the root; `ok` is unchanged, so every existing reader keeps working. `forkCandidates` now receives the same resolved root (its `<dir>/skill-observations` candidate was cwd-relative for the same reason).
- `observation-log-contract.md` §"Resolving the workspace" gains a sub-section on project-root resolution and the `state` table; `observe-work/SKILL.md` step 1's `activation-configured` row branches on `state` and a callout records why the lookup is root-anchored. Bundled copies regenerated with `npm run bundle`.

**Files Modified**:
- `shared/resources/observation-log.js` — `nearestGitEntry()`, `projectRoot()`; `cmdFamilies` and `cmdDoctor` anchor at the project root and report `root`; activation `state`
- `shared/resources/tests/observation-log.test.mjs` — added regression tests: `doctor finds AGENTS.md at the repo root when run from a subdirectory`, `doctor's activation check names WHICH way it failed`, `families --audit finds skills/<member>/SKILL.md from a subdirectory`, `--audit-root is still the override, taken verbatim`
- `shared/resources/observation-log-contract.md` — §"The project root is resolved the same way"
- `skills/observe-work/SKILL.md` — step 1 `activation-configured` row + root-anchoring callout
- `skills/observe-work/references/observation-log.js`, `skills/observe-work/references/observation-log-contract.md` — bundled copies (mechanical)

**Testing**:
- The four regression tests fail on the pre-fix engine (48/52) and pass after the fix (52/52).
- **Mutation-proved**: restoring `args.auditRoot || process.cwd()` inside `projectRoot()` turns three of them red (the `--audit-root` override test stays green, as it guards a different property); restoring the fix returns 52/52.
- The report's exact reproduction (bundled path, cwd `skills/observe-work/`) now returns `ok: true, state: configured, detail: "referenced in AGENTS.md (<repo root>)"`; `families --audit` from the same cwd returns `gaps: []` with the repo root in `root`.
- `npm run ci:fast` (format check + full test suite) — see QA Verification.

**Verification Steps for QA**:
1. `cd skills/observe-work && source references/resolve-observation-workspace.sh && command node references/observation-log.js doctor --json` → `activation-configured` has `ok: true`, `state: "configured"`, and `root` is the repository root.
2. Same cwd, `command node references/observation-log.js families --audit --json` → `gaps: []`, `root` is the repository root.
3. `command node --test shared/resources/tests/observation-log.test.mjs` → 52 pass, including the four under "project-root anchoring (bug 15)".
4. `grep -n 'process.cwd()' shared/resources/observation-log.js` → exactly one hit, inside `projectRoot()`.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By          | Notes                                              |
| ---------- | ------ | ------------------- | -------------------------------------------------- |
| 2026-09-12 | New    | repo sweep (Claude) | Filed from the 2026-09-12 sweep; obs #14 (2026-09-09) |
| 2026-09-12 | new | ensure-bug-github-issue | GitHub issue created (#393) |
| 2026-09-12 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-12 | Ready for QA | develop-bug | Fix implemented + regression test (4 tests, mutation-proved) |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
