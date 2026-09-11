---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: '2026-09-12'
updated: '2026-09-12'
related: 'none — cross-cutting (observation-log engine; observe-work Session Start Protocol; the opt-in SessionStart hook)'
description: "observation-log.js doctor's activation-configured check reads <process.cwd()>/AGENTS.md, so at the invocation observe-work's own SKILL.md documents (cd into the skill, run references/observation-log.js) it reports 'no agent-instruction file mentions the observation log' for a repo whose AGENTS.md does — silently, with reason: ok and exit 0."
---

**Bug ID**: bug.15
**Related**: none — cross-cutting (`shared/resources/observation-log.js` `doctor`; `skills/observe-work/SKILL.md` Session Start step 1; `shared/resources/observe-work-session-start.sh`)
**Status**: 🆕 New
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-09-12
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

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file]

**Testing**: [How the fix was tested]

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

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
