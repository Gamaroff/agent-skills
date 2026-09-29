---
id: task.156
title: "[Task 156] session-handoff continue mode: a continuation file a fresh context resumes from"
type: task
description: "Add a `continue` write mode to session-handoff that writes a focused continuation file (goal, re-measurable state, next step, decisions, ruled-out approaches, file paths) co-located with the active work item, and prints a paste-ready resume prompt that runs the existing verifier first, so work can move to a fresh context without carrying the old one."
tags: [session-handoff, context, handoff, continuation]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-25
updated: 2026-09-25
assignee:
estimated_effort_hours: 16
github_issue: 490
---

# Technical Task: session-handoff continue mode — a continuation file a fresh context resumes from

**Status:** Planned

**GitHub Issue**: [#490](https://github.com/Gamaroff/agent-skills/issues/490)

---

## 1. Overview

Give `session-handoff` a third mode, `continue`, that hands **one piece of in-flight work** to a
fresh context. It writes a short continuation file next to the work item, covering the goal, the
state (every figure with the command that measured it), the exact next step, the decisions taken,
the approaches ruled out, and the file paths that matter. It then prints a paste-ready prompt that
tells the new session to re-measure the file with the existing verifier before trusting any of it.

**Scope**: the `continue` procedure and template in `session-handoff`, one deterministic helper
script that decides where the file goes and builds the resume prompt, the file-naming rows for the
new artifact, and tests. The automatic trigger that *recommends* running this mode when the context
fills is task.157, which depends on this task.

**Key deliverables**:

1. `continue` mode in `skills/session-handoff/SKILL.md` plus `assets/continuation.template.md`.
2. `skills/session-handoff/scripts/continuation.mjs`, which resolves the co-located path and the verifier path, and emits the resume prompt.
3. `handoff` artifact rows in `docs/standards/file-naming.md` for tasks and stories.

**Expected outcome**: a user or agent who sees the context filling can run one mode, get one file
and one prompt, open a fresh session, paste the prompt, and continue. The new session knows what is
still true (verifier verdicts), what was decided, and what not to try again.

---

## 2. Motivation

### Current Problems

1. **Long sessions degrade and nothing hands the work on.** As the context window fills, output
   quality drops, and auto-compaction then replaces the detail with a lossy summary the agent did
   not choose. No mode exists to move *this task* to a fresh context deliberately, before that
   happens.
2. **`session-handoff` answers a different question.** Its write mode records *project* state for
   whoever picks up the repo next: frontier, branch tip, suite health, standing decisions and
   tolerated drift. It is one file (`.agents/handoff.md`) per repo. It has no place for "I was
   halfway through step 3 of task.147, tried X, rejected it because Y, the next edit is Z".
3. **What compaction loses first is what a restart most needs.** The approaches already ruled out and
   the reason each decision was taken are exactly what a summariser drops. A fresh session without
   them re-explores dead ends. Nothing in the pipeline records them deliberately.
4. **A hand-written "continue from here" note decays silently.** It has the same failure the
   `session-handoff` rationale documents for `.agents/handoff.md` (§ "Why this exists", the
   2026-09-10 T107 incident): a snapshot with no re-measure step reads as current after it has gone
   stale.
5. **The develop pipelines' own resume path does not cover ad-hoc work.** `develop-pipeline-on-precompact.sh`
   writes `develop-pipeline.last-halt.json` only when a `/develop-task` or `/develop-story` lock is
   held. Work done outside those pipelines has no resume artifact at all.

### Benefits of a continue mode

1. **Deliberate handoff instead of lossy compaction.** The agent chooses what the next context gets,
   while its own context is still good enough to choose well.
2. **Verified, not trusted, on arrival.** Continuation files use the same `| Check | Command | Result |`
   and `<!-- cmd: … -->` format as `.agents/handoff.md`, so `handoff-verify.mjs` re-measures them
   with no change to the verifier.
3. **No repeated dead ends.** A mandatory "Ruled out" section carries rejected approaches and why.
4. **One call decides the location.** A script, not prose, derives the co-located path from the
   branch, so the file lands beside the work item every time. A deterministic job does not depend
   on the agent remembering a rule under context pressure.
5. **Usable alone, and the target for task.157.** A user can run it by hand today. task.157's
   trigger then has a concrete action to recommend.

---

## 3. Technical Background

### Current Architecture

`skills/session-handoff/` (task.110) has two modes:

- **Write** (`SKILL.md` § "Write — the fixed section order"): the agent fills
  `assets/handoff.template.md` into `.agents/handoff.md`. It has six fixed sections split by
  half-life, and every figure is a bold token with the command that produced it.
- **Read** (`SKILL.md` § "Read — re-measure before trusting"):
  `scripts/handoff-verify.mjs [path] [--json] [--timeout N]` parses the header table (first
  backticked span in `Command` = command; bold spans in `Result` = figures) and prose lines carrying
  `<!-- cmd: …; expect: … -->`. It skips fenced code blocks and re-runs each command through a
  per-binary read-only whitelist with no shell. It reports `confirmed` / `stale` / `unverifiable`.
  **It already accepts an explicit path**, so it can verify any file in this format, not just
  `.agents/handoff.md`.

Other resume mechanisms, which this task does **not** replace:

- `shared/resources/develop-pipeline-on-precompact.sh` writes
  `.claude/state/develop-pipeline.last-halt.json` (`SNAPSHOT="$(dirname "$LOCK")/develop-pipeline.last-halt.json"`)
  when a develop pipeline lock is held at compaction, and the pipeline's Phase 0b resume detector
  reads it.
- Implementation reports (`task.{n}.implementation.{n}.{name}.md`) record a pipeline run's
  decisions.

File naming (`docs/standards/file-naming.md`) has co-located artifact rows for plan, QA, bug,
review, PR review and implementation reports. It has no row for a handoff.

Branch names follow `feature/task.<id>.<name>` and `feature/story.<epic>.<story>.<name>`
(`skills/create-branch/SKILL.md`).

### Target Architecture

- **`continue` mode** in `SKILL.md`, sitting beside Write and Read. It has its own section order
  (below), its own template, and the same figure discipline as Write. It **reuses Read unchanged**
  to prove the file before handing it over, and the resume prompt makes the new session run Read
  first.
- **`assets/continuation.template.md`**, with sections in this fixed order:

  | Section | Rule |
  | --- | --- |
  | Header: goal + work item | 1–3 sentences. A link to the work item doc when there is one |
  | State table `\| Check \| Command \| Result \|` | branch, HEAD, dirty-file count, the targeted test(s). Same verifier format, and **only commands on its whitelist**: a targeted test is named with `node --test --test-name-pattern=…`, since the whitelist refuses a positional after `--test` |
  | 1. Next step | **one** concrete action, plus how to tell it is done |
  | 2. Done this session | commits by short SHA, not narrative |
  | 3. Decisions taken | decision, why, where recorded |
  | 4. Ruled out | approach, why rejected. **Mandatory**: write `none` if nothing was ruled out, never omit |
  | 5. Files that matter | paths plus a one-line role. **Never file contents** |
  | 6. Open questions | for the user, or `none` |
  | Pipeline pointer (conditional) | when a develop pipeline lock or `last-halt.json` exists: point at it and at `/develop-task` / `/develop-story` resume. Do not restate pipeline step state |
  | Resume prompt | fenced block (the verifier skips fenced blocks), emitted by the script |

- **`scripts/continuation.mjs`** (pure resolution plus a thin CLI; no writes of its own):
  - `--json` → `{ path, workItem, verifier, resumePrompt, reason }`.
  - **Path**: branch `feature/task.N.slug` → `docs/tasks/task.N.slug/task.N.handoff.{k}.slug.md`.
    Branch `feature/story.E.S.slug` → the story's directory (located by searching `${PRD_ROOT}`
    for `story.E.S.*.md`) → `story.E.S.handoff.{k}.slug.md`. Anything else (another branch,
    detached HEAD, no work-item dir on disk) → `.agents/handoffs/{YYYY-MM-DD}-{slug}.md`, where
    `slug` comes from `--slug` or the branch name. `{k}` = the highest existing index + 1, parsed
    base 10.
  - **Verifier**: the first that exists of `<repo>/.agents/skills/session-handoff/scripts/handoff-verify.mjs`,
    `~/.agents/skills/session-handoff/scripts/handoff-verify.mjs` and
    `~/.claude/skills/session-handoff/scripts/handoff-verify.mjs`. A repo-local path is emitted
    relative, a user-level one absolute. None found → `reason: no-verifier`, and the prompt tells
    the reader to verify the state table by hand. It never silently omits the step.
  - **Resume prompt**: fixed text naming the file, the verifier command, and the instruction to
    treat `stale` and `unverifiable` lines as unknown and to start at §1.
- **`docs/standards/file-naming.md`**: rows `task.{n}.handoff.{n}.{name}.md` and
  `story.{epic}.{story}.handoff.{n}.{name}.md`.

```mermaid
flowchart TD
  A[continue mode invoked] --> B[continuation.mjs --json]
  B --> C{branch shape?}
  C -- feature/task.N.slug + dir exists --> D[docs/tasks/task.N.slug/task.N.handoff.k.slug.md]
  C -- feature/story.E.S.slug + story found --> E[story dir/story.E.S.handoff.k.slug.md]
  C -- other / detached / no dir --> F[.agents/handoffs/DATE-slug.md]
  D & E & F --> G[agent fills continuation.template.md, measuring every figure]
  G --> H[handoff-verify.mjs on the new file]
  H -- all confirmed or accepted unverifiable --> I[print resume prompt]
  H -- stale --> G
```

### Important Clarifications

- **This is not a second verifier.** `handoff-verify.mjs` is used as it is. If a continuation
  section needs a figure form the verifier cannot read, change the template, not the verifier.
- **This is not a replacement for Write.** `.agents/handoff.md` stays the project-level file.
  `continue` writes one file per handoff, per work item.
- **It does not commit.** Committing the continuation file is the caller's decision, since a
  mid-task file may belong in the task's next commit. The SKILL states this.
- **Agent-agnostic.** Nothing in this task depends on Claude Code. The Claude-Code-specific trigger
  is task.157.

---

## 4. Scope

### In Scope

✅ **Procedure**: a `## Continue — hand in-flight work to a fresh context` section in
`skills/session-handoff/SKILL.md`, and a `description` update so the skill triggers on "hand off to
a fresh session", "context is getting full", "continue in a new context".
✅ **Template**: `skills/session-handoff/assets/continuation.template.md`.
✅ **Helper**: `skills/session-handoff/scripts/continuation.mjs`, covering path, verifier resolution
and the resume prompt.
✅ **Naming**: two rows in `docs/standards/file-naming.md`.
✅ **User-level install note** in `SKILL.md`: how to make the skill available in every repo
(`~/.agents/skills/` and `~/.claude/skills/`), and why the verifier path is resolved rather than
hard-coded.
✅ **Tests**: `skills/session-handoff/tests/continuation.test.js`.
✅ **Catalog + CHANGELOG**.

### Out of Scope

❌ **The automatic trigger** (status-line reading, `UserPromptSubmit` hook, installer): task.157.
❌ **Changing `handoff-verify.mjs`** or its whitelist. If the template needs it, that is a design
error here.
❌ **Bug-report directories** as a co-location target. Bug work runs through `/develop-bug`, which has
its own resume. Such sessions fall to `.agents/handoffs/`.
❌ **Auto-committing** or auto-opening a new session. Neither is possible from a skill, and both are
the user's call.
❌ **Pruning old continuation files.** They are small, dated and co-located; revisit if they pile up.

---

## 5. Breaking Changes

None. The mode is additive. Write and Read behave exactly as before, and `.agents/handoff.md` is
untouched.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.156.plan.session-handoff-continue-mode.md](task.156.plan.session-handoff-continue-mode.md)

### Phase 1: `continuation.mjs` — path, verifier and prompt resolution

**Risk Level**: Low

**Files**:
- `skills/session-handoff/scripts/continuation.mjs` (new)
- `skills/session-handoff/tests/continuation.test.js` (new)

**Changes**:
- [ ] Pure `resolveContinuation({ repoRoot, branch, prdRoot, home, today, slug, exists, list })`, with the filesystem injected so it can be tested without a real repo
- [ ] Task, story and fallback path rules as in § 3, with `{k}` = highest existing index + 1 (base 10)
- [ ] Verifier resolution order (repo `.agents` → `~/.agents` → `~/.claude`); `reason: no-verifier` when none is found
- [ ] `resumePrompt` built from `path` + `verifier`
- [ ] Thin CLI: `--json`, `--slug`, `--repo`; exit 0 for `ok` / `no-verifier`, exit 2 for a usage error; emit with `process.exitCode = n; return`, never `process.exit()`, the convention `handoff-verify.mjs` already states in its header, so a piped `--json` is never truncated

**Dependencies**: none

---

### Phase 2: Template and `continue` procedure

**Risk Level**: Low

**Files**:
- `skills/session-handoff/assets/continuation.template.md` (new)
- `skills/session-handoff/SKILL.md`

**Changes**:
- [ ] Template with the fixed section order in § 3, "Ruled out" and "Open questions" mandatory (`none` allowed), resume prompt in a fenced block
- [ ] `## Continue` section: steps are (1) run `continuation.mjs --json`, (2) if a develop-pipeline lock or `last-halt.json` exists, add the pipeline pointer, (3) measure and fill, (4) run Read on the new file and fix every `stale` row, (5) print the resume prompt verbatim and state that the file is not committed
- [ ] Update `description` (trigger phrases) and the mode summary at the top
- [ ] User-level install note

**Dependencies**: Phase 1

---

### Phase 3: Naming, catalog, changelog

**Risk Level**: Low

**Files**:
- `docs/standards/file-naming.md`
- `docs/reference/skill-catalog.md` (generated)
- `CHANGELOG.md`

**Changes**:
- [ ] Add the task and story `handoff` rows
- [ ] `npm run generate-catalog`
- [ ] CHANGELOG `[Unreleased]` entry

**Dependencies**: Phase 2

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/session-handoff/SKILL.md` - `continue` mode, description, install note
2. ✅ `skills/session-handoff/scripts/continuation.mjs` - new: path, verifier and prompt resolution
3. ✅ `skills/session-handoff/assets/continuation.template.md` - new: continuation template

### Files to Modify (Tests)

4. ✅ `skills/session-handoff/tests/continuation.test.js` - new. Already inside the `skills/session-handoff/tests/*.test.js` glob in `package.json`, so no glob edit is needed

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

5. ✅ `docs/standards/file-naming.md` - `handoff` artifact rows
6. ✅ `docs/reference/skill-catalog.md` - regenerated
7. ✅ `CHANGELOG.md` - `[Unreleased]` entry

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `resolveContinuation` with an injected filesystem.

**Actions**:
- [ ] `feature/task.147.develop-pipeline-step-mechanics` with the dir present → `docs/tasks/task.147.…/task.147.handoff.1.develop-pipeline-step-mechanics.md`
- [ ] Same with `handoff.1` and `handoff.9` already present → `handoff.10` (base-10 parse, not lexical)
- [ ] Task branch whose dir is absent → fallback `.agents/handoffs/`
- [ ] `feature/story.2.3.slug` with a story found under `prdRoot` → the story's dir; story not found → fallback
- [ ] Detached HEAD / `develop` → fallback, slug from `--slug` or the branch
- [ ] Verifier resolution: each of the three locations wins when it is the first present; none present → `reason: no-verifier` **and** the prompt contains the manual-verify instruction
- [ ] A slug carrying `/`, `..` or spaces is normalised to kebab-case and cannot escape the target dir

**Command**: `command node --test skills/session-handoff/tests/continuation.test.js`

---

### Integration Tests

**Scope**: the template is verifiable as written, which tests behaviour, not source text.

**Actions**:
- [ ] Fill the template into a temp git repo with real figures (`git rev-parse --short HEAD`, `git status --porcelain` count), run `handoff-verify.mjs <file> --json`, and assert that every state row is `confirmed`
- [ ] Mutate one figure → that row reads `stale` (proves the file is actually measured, per the mutation-proof rule)
- [ ] The CLI's `--json` output parses when piped (not only when redirected to a file)

**Command**: `command node --test skills/session-handoff/tests/*.test.js`

---

### Contract Tests

**Scope**: nothing existing changes.

**Actions**:
- [ ] The existing `handoff-verify.test.js` passes unchanged
- [ ] `quick_validate.py skills/session-handoff` passes

---

### Performance Tests

Not applicable. The helper does a handful of `stat`/`readdir` calls.

---

### Consumer Tests

**Scope**: installs that copy a skill directory verbatim.

**Actions**:
- [ ] `npm run bundle -- --check` reports 0 problems (the new script and asset live inside the skill; nothing new under `shared/resources/`)

---

## 9. Success Criteria

### Functional

- [ ] `continuation.mjs --json` on a `feature/task.N.slug` branch whose dir exists returns `reason: "ok"` and a `path` inside that dir named `task.N.handoff.{k}.slug.md` (Phase 1)
- [ ] On any branch without a matching work-item dir it returns a path under `.agents/handoffs/` (Phase 1)
- [ ] With no verifier installed it returns `reason: "no-verifier"`, and `resumePrompt` contains the manual-verify instruction rather than a verifier command (Phase 1)
- [ ] A continuation file filled from the template in a temp repo verifies all-`confirmed` with the **unchanged** `handoff-verify.mjs` (Phase 2)
- [ ] `SKILL.md` `continue` procedure runs Read on the new file before printing the prompt, and says the file is not committed (Phase 2)

### Performance

- [ ] `continuation.mjs` completes in under 1 s on this repo (measured with `time`, not asserted in CI)
- [ ] No change to `handoff-verify.mjs` run time (it is not modified)

### Code Quality

- [ ] `command npm test` passes, with the new tests counted in the run
- [ ] `npm run bundle -- --check`: 0 problems
- [ ] `quick_validate.py skills/session-handoff` passes
- [ ] Every new test mutation-proven: reverting the behaviour it covers turns it red

### Migration

- [ ] CHANGELOG `[Unreleased]` entry
- [ ] `file-naming.md` carries both `handoff` rows
- [ ] Skill catalog regenerated
- [ ] User-level install note present in `SKILL.md`

---

## 10. Risk Assessment

### High Risk Areas

None identified. The change is additive and touches no existing mode.

### Medium Risk Areas

**1. Continuation files carry unmeasured prose that reads as fact**
- **Risk**: under context pressure an agent fills §2–§4 with confident narrative and no figures, and the next session trusts it.
- **Probability**: Medium
- **Impact**: Major. It is the failure this whole skill exists to prevent.
- **Mitigation**: state-bearing claims go in the table or carry `<!-- cmd: … -->`. The procedure runs Read before handing over. The resume prompt tells the reader that anything unverified is unknown.
- **Rollback**: none needed. Tighten the template.

**2. Wrong co-location when branch and directory disagree**
- **Risk**: a branch named for task N while the dir is renamed or absent writes into the wrong place.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: co-locate only when the dir exists; otherwise use the fallback. Tested.
- **Rollback**: move the file.

### Low Risk Areas

**1. Verifier path differs between repo-local and user-level installs**
- **Risk**: the prompt cites a path that does not exist in the new session's cwd.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: resolved at write time. A user-level path is absolute.
- **Rollback**: n/a

**2. Skill description growth dilutes auto-activation**
- **Risk**: new trigger phrases make the description long or vague.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: keep the description under ~100 words and name the three modes explicitly.
- **Rollback**: revert the description.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `npm test` or `bundle:check` red on `develop` after merge
- Write or Read mode behaviour changed

**Steps**:
1. `git revert <merge-sha>`
2. `command npm test`
3. Push the revert

**Verification**: `handoff-verify.test.js` green, and `.agents/handoff.md` verifies as before.

---

### Partial Rollback (1-2 hours)

**When to Use**: the helper misbehaves but the template and procedure are sound.

**Steps**:
1. Revert only `continuation.mjs` and its tests
2. Change the procedure to state the path rules in prose until the helper is fixed

---

### Forward Fix (< 4 hours)

**When to Use**: a path edge case, prompt wording, or a template section order issue.

**Approach**: fix and add the regression case to `continuation.test.js`.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- Any change in Write or Read mode behaviour
- `handoff-verify.mjs` modified

**Non-Critical (Forward Fix)**:
- A path edge case, prompt wording, template ordering

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-25 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: `continuation.mjs`
- [ ] Pure resolver + injected fs
- [ ] CLI + stdout drain
- [ ] Unit tests

### Phase 2: Template and procedure
- [ ] `continuation.template.md`
- [ ] `## Continue` section + description + install note
- [ ] Integration test through the unchanged verifier

### Phase 3: Naming, catalog, changelog
- [ ] `file-naming.md` rows
- [ ] Catalog regenerated
- [ ] CHANGELOG

---

## References

- **Related Skill**: `skills/session-handoff/` (task.110)
- **Depends on this task**: task.157, the context-pressure trigger
- **Related**: `shared/resources/develop-pipeline-on-precompact.sh` (pipeline-only resume snapshot)
- **Standards**: `docs/standards/file-naming.md`, `docs/standards/plan-file-locations.md`

---

## Notes

### Important Reminders

- `command node`, never bare `node`, in every documented invocation.
- Do not touch `handoff-verify.mjs`. If a section cannot be verified, the template is wrong.
- A continuation file is state for **one** work item. Durable lessons go to `docs/contributing/traps.md`
  or the observation log, not here.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Claude Code auto-compaction's threshold is undocumented, so "run this before compaction" is
  guidance only. task.157 provides the measured trigger.

### Future Improvements

- Prune or archive continuation files once their work item reaches `accepted`.
- Let `/develop-task` resume read a continuation file alongside `last-halt.json`.

---

**Status:** Planned

**Next Steps**:
1. Implement according to the implementation plan (`/develop-task`)
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.156.qa.[n].[name].md`
   - Bug Reports (if needed): `task.156.bug.[N].[name].md`
   - Quality Gate: `task.156.gate.[n].[name].yml` (co-located in task directory)
