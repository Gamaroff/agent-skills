# Bug Report: Task 95 — the documented default workspace is unactionable, and its example points at the wrong tree

**Task**: [task.95.observe-work-docs-boundaries.md](./task.95.observe-work-docs-boundaries.md)
**Bug ID**: TASK-95-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-09

## Description

`docs/reference/configuration.md` gained an `## Observation workspace` section and an
`observations.workspace` key-reference row. Both describe the third resolver tier — the default — in
terms that do not name a path:

- Key reference `Default` column: `(project-identity path under the agent home)`
- Prose, resolver order item 3: `the project-identity default path under the agent home`

Neither tells a reader where the workspace actually is. Compounding it, the Full schema block's
example value is `~/.agents/skill-observations`, while the real default lives under `.claude/`.

## Steps to Reproduce

```bash
mkdir -p "$HOME/.probe" && cd "$HOME/.probe"
OBS_WORKSPACE= bash -c '. /path/to/shared/resources/resolve-observation-workspace.sh \
  && printf "%s\n" "$OBS_WORKSPACE"'
```

## Expected Behavior

A reader of `## Observation workspace` can determine where their observation log lives without
reading `resolve-observation-workspace.sh`.

## Actual Behavior

The default resolves to:

```
/Users/<user>/.claude/projects/-Users-<user>-.probe
```

That is `~/.claude/projects/` plus the absolute project path with every `/` replaced by `-`. None of
that — not `.claude`, not `projects`, not the encoding — appears in the documentation. A reader who
takes the schema block's `~/.agents/skill-observations` as indicative looks under `.agents/`, which
this repository's own agent-agnostic-paths convention makes the natural guess, and finds nothing.

## Impact

The section's entire purpose is to let a reader find and configure the observation workspace, so the
gap defeats the deliverable rather than merely thinning it.

The failure mode is **silent and self-confirming**: someone looking in `.agents/` finds no log and
concludes there are no observations. An empty backlog and a backlog you are not looking at are
byte-identical from the reader's side — the exact "an empty result is a claim about the instrument"
failure the observation-log contract is built to prevent, reintroduced at the documentation layer.

## Recommendation

1. Key reference `Default` column: give the shape — `~/.claude/projects/<project-path with / → ->`.
2. Prose resolver list, item 3: state the same, with one worked example line.
3. Schema block: one comment marking `~/.agents/skill-observations` as an override example, not the
   default.

Do not change the resolver. The behaviour is correct and task 93 owns it; only the documentation of
it is wrong. Any wording added here must keep the existing contract test passing — the documented
key set is asserted against the resolver's readers, so adding prose is safe but adding a new
`observations.*` key name is not.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-09
**Developer**: qa-fix

**Root Cause Analysis**

Not a code defect — the resolver's behaviour is correct and task 93 owns it. The defect is that the
documentation described the default tier by its *role* ("project-identity path") rather than by its
*value*, and role names are not actionable. The schema block then supplied the only concrete path in
the section, `~/.agents/skill-observations`, which is an override example. A reader with no other
source of truth reasonably reads the one concrete path as the default.

The `.agents/` vs `.claude/` collision is what makes it more than a thin spot. This repository's own
convention is that agent paths are written `.agents/`, never `.claude/` — so the wrong guess is also
the *convention-conforming* guess. The one place that rule does not apply is the agent home, which
is exactly where this default lives.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-09

**Fix Description**

Three edits, all in `docs/reference/configuration.md`, all documentation:

1. **Key reference row** — the `Default` column now carries the shape
   `~/.claude/projects/<project-path with / → ->` instead of the prose description, and the row body
   works a concrete example (`/Users/ada/Projects/app` → `~/.claude/projects/-Users-ada-Projects-app`)
   and states explicitly that this path is `.claude/` and not `.agents/`, naming why the repo
   convention does not reach it.
2. **Prose resolver list, item 3** — same path shape, same worked example, plus the second thing a
   reader guesses wrong: the project path is **encoded, not nested**, so it is one flat directory per
   project rather than a mirrored tree.
3. **Schema block** — the header comment now states the default explicitly, and the
   `~/.agents/skill-observations` value is labelled an **example override**, with the situation that
   calls for it (skills installed at user scope).

No `observations.*` key name was added, per the constraint: the contract test asserts every
documented key has a reader, and a new key name would fail it.

**Files Modified**

- `docs/reference/configuration.md` — the three edits above.

**Testing**

- `npm test` — full suite green.
- The existing contract test `resolver: every documented observations.* key has a reader` continues
  to pass, which is the check that the added prose introduced no phantom key. Its scan is confined to
  the schema block and the key-reference table, so the new prose mentioning `.claude/` and `.agents/`
  cannot be misread as a key.
- Verified against the resolver rather than against the edit: driving the default tier from a scratch
  project returns `~/.claude/projects/-Users-<user>-<encoded>`, matching the newly documented shape
  character for character.

**Verification Steps for QA**

1. Read the `Default` column of the `observations.workspace` row — it should give a path, not a role.
2. Drive the resolver's default tier from any directory and confirm the result matches the documented
   shape, including the `/` → `-` encoding.
3. Confirm `~/.agents/skill-observations` in the schema block is now marked as an override example.

---

## Status History

| Date       | Status       | Changed By | Notes                                              |
| ---------- | ------------ | ---------- | -------------------------------------------------- |
| 2026-09-09 | New          | qa-task    | Found during QA cycle 1                            |
| 2026-09-09 | In Progress  | qa-fix     | Investigation — documentation defect, not code     |
| 2026-09-09 | Ready for QA | qa-fix     | Three documentation edits; suite green             |

| 2026-09-09 | Closed       | qa-task    | Verified in QA cycle 2 — resolver driven, documented shape matches |

---

## QA Verification (Cycle 2)

**Verified**: 2026-09-09 · **Gate**: [task.95.gate.2](./task.95.gate.2.observe-work-docs-boundaries.yml) (PASS, 100/100)

The fix was checked against the **resolver**, not against the diff: driving the default tier from a
scratch project returns `~/.claude/projects/-Users-<user>-<encoded>`, which matches the newly
documented shape character-for-character, including the `/` → `-` encoding.

Also confirmed: the added prose introduced no phantom config key — the contract test
`resolver: every documented observations.* key has a reader` still passes, and its scan is confined
to the schema block and the key-reference table, so the new sentences naming `.claude/` and
`.agents/` cannot be misread as key names.

**One residual, recorded as a separate LOW rather than reopening this bug**: the documented formula
is silent about linked git worktrees, where the resolver anchors to the *main* worktree. That rule is
stated elsewhere in the same document, so the information is present rather than missing — which is
what distinguishes it from the defect this bug reports. Carried as a `future` recommendation on gate 2.

**Status**: Closed.
