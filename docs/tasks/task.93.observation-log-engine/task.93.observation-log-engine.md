---
id: task.93
title: "Observation-log engine, workspace resolver and contract"
type: task
description: "Build the pure Node engine, guarded shell resolver and canonical contract that the observe-work meta-skill will stand on, replacing upstream's prose-embedded shell snippets with code whose guards cannot be skipped."
tags: [observe-work, shared-resources, engine, resolver, meta-skill]
category: infrastructure
status: accepted
priority: High
created: 2026-09-07
updated: 2026-09-08
completed_date: 2026-09-08
pr_number: 353
assignee:
estimated_effort_hours: 8
github_issue: 339
---

# Technical Task: Observation-log engine, workspace resolver and contract

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.93.review.1.observation-log-engine.md` implemented 2026-09-08
**GitHub Issue**: [#339](https://github.com/Gamaroff/agent-skills/issues/339)

---

## 1. Overview

Build the three shared resources that the forthcoming `observe-work` meta-skill (task 94) depends on: a pure Node engine that owns every read and write of the observation log, a guarded shell resolver that answers "where is the workspace?" once instead of per session, and a canonical contract document that specifies the storage format for both.

This task ships the mechanism. It ships **no skill** — the engine is independently usable and independently testable, which is why it is separated from task 94.

**Scope**: `shared/resources/observation-log.js`, `shared/resources/resolve-observation-workspace.sh`, `shared/resources/observation-log-contract.md`, `shared/resources/tests/observation-log.test.mjs`, and one new `## Observation Log` section in `AGENTS.md`.

**Key deliverables**:

1. `observation-log.js` — ten subcommands, `--json` + `reason` contract, exit-code discipline transcribed from `tracker-comment.js`.
2. `resolve-observation-workspace.sh` — resolver-order script in the idiom of `resolve-platform.sh`, sourced as `source … || exit 1`.
3. `observation-log-contract.md` — the canonical storage spec, plus the CC BY 4.0 attribution for the upstream methodology.

**Expected outcome**: a developer (or agent) can run `command node shared/resources/observation-log.js init|write|scan|queue|set-status|next-id|archive|families|checkpoint|doctor` against a workspace and get correct, guarded behaviour, with the guards proven by mutation.

---

## 2. Motivation

### Current Problems

1. **The upstream methodology is carried entirely in prose.** `rebelytics/one-skill-to-rule-them-all` expresses its correctness guards as 20–40-line POSIX shell snippets embedded in `SKILL.md`, which the agent must retype correctly before **every single write**. A skipped snippet is silent: the log still looks healthy.
2. **Upstream ships a live arithmetic bug.** Its id derivation feeds zero-padded filename prefixes into shell arithmetic. `$(( 0105 + 1 ))` evaluates as octal and yields `70`; a prefix containing an `8` or `9` (e.g. `0108`) is an invalid octal constant and errors the whole derivation. Upstream mitigates with a `sed` that strips leading zeros — a mitigation that only works if it is retyped verbatim.
3. **The "empty result is a claim about the instrument" rule has no enforcement.** Upstream states — correctly, and from measured failures — that a scan returning nothing is reporting on two possibilities at once, only one of which is a finding. It then implements that rule as a `SCAN COMMAND BROKEN` / `ID COMMAND BROKEN` `echo` inside the snippet the agent must remember to include.
4. **Archival is coupled to id derivation by convention, not by construction.** Upstream folds the stale-file sweep into the id snippet precisely because a prose preamble ("on every write, first archive") under-fires. That coupling survives only as long as nobody simplifies the snippet.
5. **The workspace path is hand-substituted into roughly a dozen places.** Every runnable snippet in upstream's bundle carries a literal `[ABSOLUTE PATH]` placeholder that the installer must replace. A snippet run with a relative path does not fail — it reports an empty, clean backlog, which upstream itself names as "the one answer that never gets questioned".
6. **This repo already solved this class of problem and would be regressing by not applying it.** `tracker-comment.js`, `change-log.js`, `tracker-workflow.js` and `gh-stage.js` are pure engines with a shared `--json` `reason` vocabulary and exit-code contract; `resolve-platform.sh` is the guarded resolver pattern. Importing prose snippets into a repo that owns these engines would be a step backwards.

### Benefits

1. **Guards become unskippable.** The independent-count check, the noclobber create, the archival sweep and the octal-safe parse all live inside the code path rather than beside it in prose. There is no way to call `write` without them.
2. **The octal bug becomes structurally impossible.** JavaScript `parseInt(s, 10)` has no octal interpretation of a leading zero, so the entire class of defect disappears rather than being mitigated.
3. **The mechanism becomes testable.** Upstream ships no tests for its own snippets. This engine gets a suite where every guard is mutation-proven — revert the guard, watch a test go red — which is the standard this repo already holds itself to.
4. **`[ABSOLUTE PATH]` substitution disappears entirely.** One resolver, three sources (config → env → project identity), one answer.
5. **Two prose warnings become exit codes.** "Never anchor on an ephemeral checkout" and "before creating a log, search for an existing one" are currently paragraphs an agent may skim; here they are `reason: ephemeral-workspace` and `reason: fork-detected`.
6. **A step-doc author who has read one of this repo's engines has read this one.** Same flags, same `reason` field, same exit codes — no new dialect.

---

## 3. Technical Background

### Current Architecture

There is nothing in this repository to modify. The observation-log concept does not exist here; the closest neighbours are:

- `skills/remember-insight/` — writes durable memory files, but takes the insight as **input** rather than observing for it. Its project-identity path derivation (`~/.claude/projects/<encoded-project-path>/`) is the derivation this task reuses.
- `skills/loop-supervisor/` — writes a per-iteration ledger and classifies outcomes from filesystem post-conditions. The only existing thing that persistently logs agent runs, but scoped to loop runs alone.
- `shared/resources/tracker-comment.js` — the engine whose CLI shape, `reason` vocabulary and exit codes this file transcribes.
- `shared/resources/resolve-platform.sh` — the resolver whose order-and-guard idiom this file transcribes.

Upstream's current mechanism, for reference, is a snippet of this shape repeated in `SKILL.md` and `references/observation-log.md`:

```bash
d="[ABSOLUTE PATH]/skill-observations/observation-log"
hi=$( { ls "$d" "$d/archive" 2>/dev/null | grep -oE '^[0-9]+'; cat "$d/archive/.id-floor" 2>/dev/null; } \
     | sed 's/^0*\([0-9]\)/\1/' | sort -n | tail -1); : "${hi:=0}"
[ "$hi" -eq 0 ] && [ -n "$(find "$d" -maxdepth 1 -name '*.md')" ] && { echo "ID COMMAND BROKEN …"; exit 1; }
next_id=$(( hi + 1 )); echo "$next_id" > "$d/archive/.id-floor"
```

Every property that matters here — the `sed` that prevents octal, the `.id-floor` third input, the brokenness guard, the archival sweep that precedes it — is a line the agent must reproduce.

### Target Architecture

```
shared/resources/
├── observation-log.js                    # the engine: all reads and writes
├── resolve-observation-workspace.sh      # OBS_WORKSPACE / OBS_LOG_DIR / OBS_STAGING_DIR
├── observation-log-contract.md           # the canonical storage spec
└── tests/observation-log.test.mjs        # already covered by an existing test glob
```

Workspace layout the engine owns (created by `init`):

```
$OBS_WORKSPACE/skill-observations/
├── observation-log/
│   ├── 0001-short-slug.md                # one file per observation, YAML frontmatter + body
│   └── archive/
│       ├── .id-floor                     # highest id ever issued
│       └── 0002-resolved-slug.md
├── cross-cutting-principles.md
├── skill-families.md
├── last-review-date.txt                  # literal `never` until a review runs
└── checkpoints.log
```

**Subcommand surface:**

| Subcommand | Responsibility | Guard it makes structural |
|---|---|---|
| `init` | create the tree above | `last-review-date.txt` seeded to the literal `never`, never a date |
| `scan [--status open]` | frontmatter-only read of every entry | independent file count vs parsed count; `reason: scan-broken` when files exist and none parsed |
| `next-id` | archival sweep, then max(active, archive, `.id-floor`) + 1 | base-10 parse; `reason: id-broken` when the log is non-empty and no ids extracted |
| `write` | sweep → derive id → create → write | `wx` create; `EEXIST` → `reason: collision`, re-derive once. No `--id` flag exists, so a batch cannot pre-bake ids |
| `set-status` | mutate one file's lifecycle fields | only `status`/`parked_until`/`resolved`/`resolution` writable; rejects `parked` without `parked_until` and `actioned`/`declined` without `resolved` |
| `queue` | build the review work queue | queue = files − resolved − parked; asserts `count(files) == count(classified)` and names the statusless delta |
| `archive` | standalone stale sweep | resolved-status **and** a `resolved:` date strictly before today; `parked` is exempt |
| `families [--audit]` | read `skill-families.md`, grep members for shared rules | absence judged against the family's `Member-specific` column |
| `checkpoint` | append an acknowledgement marker | append-only; never rewrites |
| `doctor` | workspace health | exists / not ephemeral / no second workspace at another plausible anchor / activation configured |

**Resolver order** (mirrors `references/platform-detection.md`):

1. `skills-config.yaml` → `observations.workspace`
2. `OBS_WORKSPACE` environment variable
3. Default: the project-identity path `remember-insight` already derives

### Important Clarifications

- **This is not the `TRACKER`/`VCS` axis.** The observation log is local state with no remote. `resolve-observation-workspace.sh` is a sibling of `resolve-platform.sh` in *form* only; it must not import it or branch on tracker.
- **`parked` is not `resolved`.** It means "decided, but blocked on an external precondition". It leaves the work queue, requires `parked_until:`, and **never archives**. Getting this wrong tidies away live entries.
- **The archival grace period lives in the file, not in session memory.** A file resolved today stays until tomorrow, whichever session resolved it — that is what makes the rule hold across parallel sessions.
- **`skill:` is always a list**, even with one entry, so no consumer ever branches on string-vs-list.
- **Never `process.exit()` after an async stdout write.** `skills/develop-next/scripts/select-next.mjs:1629` documents this: stdio is asynchronous on a pipe and `process.exit()` truncates at ~64KB (`bug.3.stdout-truncation-on-exit`). Use `process.exitCode` and return. `scan --json` over a large log is exactly that shape.
- **Prose in this repo says `command node`, never bare `node`** — `node` is a shell function on the dev host that prints nvm help to stdout and corrupts captured JSON.

---

## 4. Scope

### In Scope

✅ **Engine**: `shared/resources/observation-log.js` with the ten subcommands above, `--json`/`--quiet`/`--dry-run` flags, and the `reason` vocabulary.
✅ **Resolver**: `shared/resources/resolve-observation-workspace.sh`, sourced-and-guarded, exporting `OBS_WORKSPACE`, `OBS_LOG_DIR`, `OBS_STAGING_DIR`.
✅ **Contract**: `shared/resources/observation-log-contract.md` — layout, frontmatter field table, id rules, archival gate, `parked` semantics, skill families and `siblings_checked`, the carrier pattern, version-control hazards, CC BY 4.0 attribution.
✅ **Tests**: `shared/resources/tests/observation-log.test.mjs`, every guard mutation-proven.
✅ **AGENTS.md**: one new `## Observation Log` section pointing at the contract, in the same shape as the existing contract sections.

### Out of Scope

❌ **The `observe-work` skill itself** — task 94. This task ships no `skills/` directory.
❌ **Boundary notes in `autoskill` / `remember-insight` / `double-check`** — task 95.
❌ **`skills-config.yaml` schema documentation for the `observations:` block** — task 95. The resolver reads the key; documenting it is task 95's job.
❌ **A `SessionStart` hook implementation** — documented in task 94's `references/environments.md`, not shipped as a file here.
❌ **Upstream's `migration.md` and `migrate-log.py`** — a one-time conversion of pre-3.0 single-file logs. No such log can exist in a fresh install.
❌ **Any port of upstream's `validate-skill-bundle.py`** — `quick_validate.py` and `package_skill.py` already own this repo's install contract.

---

## 5. Breaking Changes

**None — every file is new.**

The one file this task edits, `AGENTS.md`, gains a section and changes nothing existing. No skill sources the resolver yet, no skill calls the engine yet, and `shared/resources/tests/*.test.mjs` is already in the `npm test` glob, so the new suite runs without a `package.json` change.

The forward-compatibility commitment worth stating: **the `reason` vocabulary and exit codes are a contract from the first commit**, because task 94's step prose will branch on them. Adding a `reason` value later is additive; changing the meaning of one is a breaking change to every call site.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.93.plan.observation-log-engine.md](task.93.plan.observation-log-engine.md)

### Phase 1: Contract first

**Risk Level**: Low

**Files**:
- `shared/resources/observation-log-contract.md`

**Changes**:
- [x] Write the storage layout, the frontmatter field table, and the id/archival rules — the spec the engine is then written against, not a description written afterwards
- [x] Specify `parked` semantics explicitly, including that it is exempt from archival and requires `parked_until:`
- [x] Specify skill families, the `siblings_checked:` field and the no-registry fallback
- [x] Specify the carrier pattern for partially-actioned multi-skill observations
- [x] Record the version-control hazard: `git clean -fd` deletes untracked observation files, and a just-written observation is always untracked
- [x] Add the CC BY 4.0 attribution block: Eoghan Henn / rebelytics.com, the canonical repo URL, and an explicit statement that changes were made

**Dependencies**: None

---

### Phase 2: The resolver

**Risk Level**: Low

**Files**:
- `shared/resources/resolve-observation-workspace.sh`

**Changes**:
- [x] Implement the three-source resolver order: `skills-config.yaml` `observations.workspace` → `OBS_WORKSPACE` → project-identity default
- [x] Author the project-identity derivation in the resolver, following the `<encoded-project-path>` convention `remember-insight` **documents** (`<backup-root>/.claude/projects/<encoded-project-path>/`) — path separators become hyphens, the leading separator is preserved as a leading hyphen. **There is no existing encoder to reuse**: `skills/remember-insight/` is a single `SKILL.md` that names the convention as harness-supplied context, so this is the first implementation of it in this repo
- [x] Export `OBS_WORKSPACE`, `OBS_LOG_DIR`, `OBS_STAGING_DIR`
- [x] Return non-zero on an unrecognised value so a `source … || exit 1` call site actually halts
- [x] Refuse an ephemeral anchor — `.claude/worktrees/`, `/tmp/`, a git worktree — with a non-zero exit and a named reason
- [x] Run `shellcheck --severity=warning` against it and fix what it reports

**Dependencies**: Phase 1 (the contract names the paths)

---

### Phase 3: Engine — reads

**Risk Level**: Medium

**Files**:
- `shared/resources/observation-log.js`

**Changes**:
- [x] Argument parsing, `--json`/`--quiet`/`--dry-run`, and the exit-code table transcribed from `tracker-comment.js`
- [x] `init` — create the full tree; seed `last-review-date.txt` with the literal `never`
- [x] `scan` — frontmatter-only parse, with the independent count guard producing `reason: scan-broken`
- [x] `queue` — files minus resolved minus parked, with the reconciliation assertion and an explicit statusless delta
- [x] `doctor` — existence, ephemerality, second-workspace (fork) detection, activation presence
- [x] Output via `process.exitCode` + return; **never** `process.exit()` after a write

**Dependencies**: Phases 1–2

---

### Phase 4: Engine — writes

**Risk Level**: Medium

**Files**:
- `shared/resources/observation-log.js`

**Changes**:
- [x] `next-id` — archival sweep folded in, then base-10 max of active + archive + `.id-floor`, then `.id-floor` update
- [x] `write` — one call doing sweep → id → `wx` create → frontmatter + body; `EEXIST` yields `reason: collision` and one re-derivation
- [x] Deliberately provide **no** `--id` flag, so a batch cannot collapse N races into one stale read
- [x] `set-status` — re-read the single file, mutate only the four lifecycle fields, reject `parked` without `parked_until` and `actioned`/`declined` without `resolved`
- [x] `archive` — standalone sweep with the strictly-before-today date gate and the `parked` exemption
- [x] `checkpoint` — append-only marker
- [x] `families [--audit]` — read the registry, grep members for shared rules, judge absence against `Member-specific`

**Dependencies**: Phase 3

---

### Phase 5: Tests and registration

**Risk Level**: Low

**Files**:
- `shared/resources/tests/observation-log.test.mjs`
- `AGENTS.md`

**Changes**:
- [x] End-to-end smoke over a temp workspace: `init` → `write` ×3 → `scan` → `queue` → `set-status` → `next-id` → `doctor`
- [x] One test per guard, each mutation-proven against a deliberately reverted guard
- [x] The pipe-truncation test: `scan --json` over 500 synthetic observations through a real pipe, sized from the pipe buffer
- [x] Add the `## Observation Log` section to `AGENTS.md`, in the shape of the existing contract sections
- [x] `npm run format`, `npm test`, `shellcheck --severity=warning` on the new script

**Dependencies**: Phases 3–4

---

## 7. Files Summary

### Files to Create (Core Implementation)

1. ✅ `shared/resources/observation-log.js` — the engine; all reads and writes of the observation log
2. ✅ `shared/resources/resolve-observation-workspace.sh` — workspace resolver, sourced and guarded
3. ✅ `shared/resources/observation-log-contract.md` — canonical storage spec + CC BY 4.0 attribution

### Files to Create (Tests)

4. ✅ `shared/resources/tests/observation-log.test.mjs` — engine behaviour, every guard mutation-proven

### Files to Modify (Documentation)

5. ✅ `AGENTS.md` — new `## Observation Log` section pointing at the contract
6. ✅ `CHANGELOG.md` — `[Unreleased] → Added` entry
7. ✅ `shared/resources/read-config.sh` — registers `observations.workspace` in `_CONFIG_GUARDED_KEYS`. **Not foreseen when this task was written**, and required rather than incidental: the resolver's new call site widens the reader surface, and without the registration the key resolves silently empty on a python-less host, inverting the documented precedence. An existing repo guard (`tracker-access.test.sh` §44) fails until it is made.

### Files to Delete

None.

**Note on bundling**: no skill references the three **new** paths yet, so `npm run bundle` produces no `references/` copies *of them* in this task. Task 94 is what pulls them into `skills/observe-work/references/`.

> The PR nevertheless carries **48 changed `skills/*/references/read-config.sh` files**. Those follow from file 7 above: `read-config.sh` is an existing shared resource that ~48 skills already reference, so editing it requires `npm run bundle` and the refreshed copies ship with it. Stated explicitly because the sentence above, read as a check against the PR's file list, otherwise gives the wrong answer about 48 files.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each subcommand's behaviour and each guard's failure mode, over temp workspaces.

**Actions**:
- [x] `init` seeds `last-review-date.txt` with the literal `never`, not a date
- [x] `scan` returns frontmatter only, never bodies
- [x] `next-id` over a log containing `0108` returns `109` — the octal regression, asserted directly
- [x] `next-id` reads all three inputs: highest active, highest archived, `.id-floor`
- [x] `.id-floor` prevents the counter restarting at 1 when the active directory is empty
- [x] `set-status --status parked` without `--parked-until` is rejected
- [x] `set-status --status actioned` writes `resolved` and refuses to write any non-lifecycle field
- [x] `archive` moves a file resolved yesterday, leaves one resolved today, and leaves a `parked` entry regardless of age
- [x] `queue` over a log containing a statusless file puts that file in the OPEN set **and** names it in the reconciliation delta
- [x] `write` never accepts a caller-supplied id

**Command**: `npm test` (the `shared/resources/tests/*.test.mjs` glob already exists)

**Target**: every `reason` value in the vocabulary is reachable from at least one test.

---

### Integration Tests

**Scope**: the resolver and the engine together, and the sequences that matter.

**Actions**:
- [x] `source resolve-observation-workspace.sh || exit 1` then `command node observation-log.js doctor --json` resolves and reports healthy
- [x] Config key beats env var; env var beats the project-identity default
- [x] A resolved path under `.claude/worktrees/` is refused with a non-zero exit
- [x] `doctor` detects a second `skill-observations/` at another plausible anchor and reports `fork-detected`
- [x] Full smoke: `init` → `write` ×3 → `scan` → `queue` → `set-status actioned` → `next-id` — and the assertion that matters, that `next-id` **archived the resolved file as a side effect** without being asked to

---

### Contract Tests

**Scope**: the CLI surface task 94's prose will depend on.

**Actions**:
- [x] Exit codes match the `tracker-comment.js` table (0 for the success family, 2 for usage errors)
- [x] `--json` always emits a `reason` field
- [x] An unknown flag is a usage error, not a silent no-op

---

### Performance Tests

**Scope**: the property the per-file layout exists to provide.

**Metrics to Measure**: wall-clock of `scan` over 1, 100 and 1000 observations.

**Baseline**: none exists — this is a new component. Record the three numbers as the baseline for future work.

**Expectation**: `scan` reads frontmatter only, so cost grows with file count and not with body size. Assert the property directly (bodies are never read) rather than asserting a wall-clock threshold, which would be flaky under load — this repo has already been bitten by load-sensitive timing assertions.

---

### Consumer Tests

**Scope**: nothing consumes the engine yet. The first consumer is task 94, and `tests/executable-instructions.test.js` will assert at that point that every command its prose tells a reader to run resolves to a shipped file.

---

## 9. Success Criteria

### Functional

- [x] All ten subcommands implemented and reachable
- [x] `command node shared/resources/observation-log.js doctor --json` returns valid JSON with a `reason` field on a fresh temp workspace
- [x] `next-id` over a log containing `0108` returns `109`
- [x] `next-id` performs the archival sweep as a side effect, proven by a test that never calls `archive`
- [x] `write` exposes no way to supply an id
- [x] `set-status` rejects `parked` without `parked_until`
- [x] `queue` surfaces statusless files as OPEN and names them in the delta
- [x] The resolver refuses an ephemeral anchor with a non-zero exit
- [x] The resolver's three-source precedence is asserted in that order

### Performance

- [x] `scan` never reads an observation body — asserted structurally, not by timing
- [x] `scan --json` over 500 observations through a pipe emits complete, parseable JSON
- [x] Baseline scan timings recorded for 1 / 100 / 1000 observations

### Code Quality

- [x] Every guard is mutation-proven: the guard is reverted, a named test goes red, the guard is restored
- [x] `npm test` passes
- [x] `npm run format` clean (JavaScript only)
- [x] `shellcheck --severity=warning` clean on `resolve-observation-workspace.sh` — **run**, not assumed unrunnable
- [x] The engine takes no dependency on `resolve-platform.sh` or any tracker module
- [x] No `process.exit()` anywhere after an output write

### Migration

- [x] `AGENTS.md` carries the `## Observation Log` section
- [x] The contract document carries the CC BY 4.0 attribution and states that changes were made
- [x] `CHANGELOG.md` updated

---

## 10. Risk Assessment

### High Risk Areas

None. Every file is new, nothing consumes them yet, and the blast radius of a defect is confined to a component with no callers.

### Medium Risk Areas

**1. The guards get written but not proven**

- **Risk**: a guard is implemented, a test asserts the happy path, and nobody checks the guard actually fires. This is precisely the failure upstream documents — a check that is correctly silent and a check that never fires look identical from a passing run.
- **Probability**: Medium — it is the default outcome without a deliberate step.
- **Impact**: Major. An unproven guard is worse than none: it manufactures confidence.
- **Mitigation**: mutation-prove every guard. Revert the behaviour, confirm the named test goes red, restore. This is a Success Criterion, not a nicety.
- **Rollback**: none needed — the finding is caught before merge.

**2. `parked` is treated as a resolved state somewhere in the code**

- **Risk**: `parked` satisfies neither half of the archival gate (not in the resolved set, carries no `resolved:` date). A reasonable-looking simplification — "it has left the work queue, so archive it" — silently removes live entries from view.
- **Probability**: Medium. The state is genuinely counter-intuitive.
- **Impact**: Major. A parked entry that archives never gets its `parked_until:` condition re-checked, so it is lost rather than deferred.
- **Mitigation**: an explicit test that `archive` leaves a `parked` entry in place regardless of age, plus an explicit paragraph in the contract.
- **Rollback**: `git mv` the files back out of `archive/`; nothing is destroyed, only misfiled.

**3. The pipe-truncation bug is reintroduced**

- **Risk**: `process.exit(code)` at the end of the CLI is the idiomatic thing to write, and `tracker-comment.js:831` does exactly that. Copying its tail verbatim reintroduces the truncation `select-next.mjs` was fixed for.
- **Probability**: Medium — the wrong pattern exists in the file being transcribed.
- **Impact**: Major, and self-concealing: a file redirect hides it, so it only fails on a pipe.
- **Mitigation**: the pipe test, with the payload sized from the pipe buffer rather than a fixed constant; plus a comment at the call site naming `bug.3.stdout-truncation-on-exit`.
- **Rollback**: one-line change to `process.exitCode`.

### Low Risk Areas

**1. The resolver's project-identity default diverges from the documented convention**

- **Risk**: two derivations of the same path that drift, producing two workspaces.
- **Probability**: Low, provided the derivation is written once, in the resolver, and asserted.
- **Impact**: Minor initially, Major if it ships — it is exactly the silent-fork failure `doctor` exists to catch.
- **Mitigation**: assert the resolver's output against the **documented** `<encoded-project-path>` convention in a test, with the expected string written out literally rather than recomputed by the test.

  > ⚠️ **Corrected during review (2026-09-08).** This entry previously read *"reuse, and assert equality against `remember-insight`'s derivation in a test"*, and Phase 2 said to reuse rather than reimplement. **There is nothing to reuse.** `skills/remember-insight/` contains exactly one file, `SKILL.md`, which states the path pattern and says the directory *"is defined in your system context (auto-memory section)"* — a Claude Code harness convention, not repo-owned code. A repo-wide grep for `encoded-project-path` returns only that line and tasks 93/95's own planning docs. The mitigation as written could not be executed, which left the risk it names unguarded: an implementer looking for an encoder either stalls, or invents one while believing they reused something. A test that recomputes the expectation the same way the resolver does would reintroduce the same hole, which is why the expected string must be literal.

**2. Contract and engine drift during Phases 3–4**

- **Risk**: the spec is written first and then quietly contradicted by the implementation.
- **Probability**: Low over a single task.
- **Impact**: Minor now, Major later — task 94's prose is written against the contract, not the code.
- **Mitigation**: Phase 5 re-reads the contract against the finished engine before the AGENTS.md section is written.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `npm test` fails on an existing suite (the new files should be inert to everything else)
- The bundle-freshness or catalog CI check fails unexpectedly

**Steps**:
1. `git revert` the merge commit, or delete the three new `shared/resources/` files and the test
2. Revert the `AGENTS.md` section
3. Re-run `npm test` and the CI validate workflow

**Verification**: `git status` clean, `npm test` green, no `observation-log` references remain outside `docs/tasks/task.93.*`.

---

### Partial Rollback (1–2 hours)

**When to Use**: the engine is sound but the resolver is wrong (or vice versa) — they are independent.

**Steps**:
1. Keep `observation-log.js` and its tests; revert `resolve-observation-workspace.sh` alone
2. Task 94 then blocks on the resolver only, and can still be scoped against `OBS_WORKSPACE` passed explicitly

---

### Forward Fix (< 4 hours)

**When to Use**: a guard is wrong or a `reason` value is missing. Nothing consumes the engine yet, so the cost of changing the contract is at its lifetime minimum.

**Approach**: fix forward. Add the `reason`, fix the guard, add the mutation proof. Only after task 94 lands does a `reason` change become a breaking change to call sites.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The new test suite is flaky under load — this repo has two prior load-flake incidents and will not accept a third
- `shellcheck` cannot be made clean without suppressions that hide real findings

**Non-Critical (Forward Fix)**:
- A missing `reason` value
- `doctor` producing a false-positive fork warning
- Baseline timings not recorded

---

## Dev Agent Record

### QA Fix Cycle 3 — 2026-09-08

One finding, and the first draft of its fix was itself wrong in the way the finding warned about.

**TASK-93-007 (MEDIUM)** — the cycle-2 fix created `encodeProjectPath()` in JavaScript alongside the
existing `_ow_encode_project_path` in the shell resolver. Two implementations of the same encoding,
answering for different consumers: the shell one decides where the workspace **is**, the JS one
decides where `doctor` **looks** for forks. They agreed, but nothing kept them in step — and the
task's own Low Risk Areas §1 had predicted exactly this and prescribed a test.

**The first attempt at that test proved nothing, and the reason is worth keeping.** It tried to
`source` the resolver and call `_ow_encode_project_path` directly. The resolver `unset -f`s its
helpers on the way out — a deliberate, separately-tested property — so the function never survived
the source, and the test silently fell through to a bash one-liner **written for the test**. That is
a *third* encoder. It passed while exercising neither shipped path, which is precisely the failure
the finding was about, reproduced inside its own fix.

Replaced with an **end-to-end** assertion: run the real resolver in a real temp git repository under
an isolated `HOME`, and check the workspace it exports equals what the JS encoder predicts for that
repository. Both shipped implementations, through their real consumers, no reimplementation.

One incidental detail the end-to-end form forced: `ws()` builds under the OS temp dir, which on macOS
is `/var` → `/private/var`. Git reports the resolved path, so the prediction resolves too —
otherwise the test compares a path to its own symlink and fails for a reason unrelated to encoders.

**Mutation proofs — 2/2, one per shipped encoder**

| Mutation | Result |
|---|---|
| JS `encodeProjectPath` joins with `_` instead of `-` | RED |
| Shell `_ow_encode_project_path` substitutes `_` instead of `-` | RED |

Both directions matter: a test that only caught a JS change would leave the shell side unguarded,
and it is the shell side that decides where data is actually written.

**File list**

- `shared/resources/tests/observation-log.test.mjs` — encoder-parity test added (47 → 48)

---

### QA Fix Cycle 2 — 2026-09-08

Three findings fixed. Two came from the cycle-2 refute pass; the third came from the **operator
stopping an unsafe verification script**, which is worth recording as the way it was found.

**Completion notes**

- **TASK-93-004 (HIGH)** — the cycle-1 fork fix swept *every* directory under `~/.claude/projects`,
  which holds one entry per project on the machine. Any other project's legitimate workspace read as
  a fork of this one, so the moment a second project adopted the log `doctor` would fail in both,
  permanently. Narrowed to **this repository's own worktree encodings**, derived by a new
  `repoWorktrees()` that reads `.git` directly — pure `fs`, no shell-out, keeping the engine's
  no-subprocess property intact. That candidate set is exactly the fork TASK-93-001 used to create.
- **TASK-93-005 (MEDIUM)** — `sweepResolved()` archived with `fs.renameSync`, which silently
  clobbers an existing destination. Now checks first and reports
  `skipped: [{ file, why: "collision" }]`, leaving both files in place. `write` already used `wx` so
  a create could never truncate; the one operation that *moves* files did not hold the same line.
- **TASK-93-006 (HIGH)** — the cycle-1 test suite wrote into, and read from, the developer's real
  `~/.claude`. Every `doctor` invocation now runs against a **temp `HOME`**, using this repo's
  existing env allow-list shape with the temp home substituted. No production-code change was
  needed: `cli(args, opts)` already spread `opts` into `spawnSync`.

**How TASK-93-006 was found.** The operator rejected a verification script this pipeline had
written, which contained `rm -rf "$PJ/$ENC"` where `$ENC` came from a command substitution — had
that call failed, it would have deleted every session transcript and the memory directory under
`~/.claude/projects`. Asking why that script needed to touch the real home at all is what exposed
that the **already-committed tests did too**. The narrow lesson is to guard variables in `rm -rf`;
the useful one is that a test suite reaching into `$HOME` is a defect even when it cleans up after
itself, because it is also *reading* state it does not control.

**Isolation is by redirection, not by careful paths.** A temp home is discarded wholesale, so there
is no cleanup step to get wrong and no `rm -rf` whose argument could be empty. The verification
routine now brackets the suite with a `find ~/.claude` diff, which is cheap and would have caught
this on the day cycle 1 was written.

**Mutation proofs — 4/4**

| Fix | Mutation | Result |
|---|---|---|
| TASK-93-004 | restore the unrestricted `readdirSync(projects)` sweep | RED |
| TASK-93-005 | drop the `fs.existsSync(dest)` check | RED |
| TASK-93-006 | remove `env: isolatedEnv(home)` from the fork test | RED |
| TASK-93-002 | remove the project-path sweep (re-proved against the rewritten test) | RED |

The TASK-93-006 mutation is safe to run: the planted directory still goes to the temp home, so only
the CLI's *view* reverts to the real one. It goes red without writing anything outside the temp tree.

**A note on the fork tests.** They assert **both** directions — this project's own duplicate
encoding *is* a fork, another project's workspace is *not* — because either alone passes against a
broken implementation. Return everything and the first passes while the second fails; return nothing
and the reverse. That symmetry is why cycle 1's single-direction test let TASK-93-004 through.

**File list**

- `shared/resources/observation-log.js` — modified (`repoWorktrees`, `encodeProjectPath`, narrowed
  `forkCandidates`, archive collision guard)
- `shared/resources/tests/observation-log.test.mjs` — temp-`HOME` isolation across 5 `doctor` tests,
  planted-fork test rewritten, 3 tests added (44 → 47), stale `OBS_TEST_ALLOW_TMP` comment removed

---

### QA Fix Cycle 1 — 2026-09-08

All three gate findings fixed, each verified by reproducing the defect first and confirming the
remedy second, then mutation-proven.

**Completion notes**

- **TASK-93-001 (HIGH)** — `_ow_project_root` now derives from
  `git rev-parse --path-format=absolute --git-common-dir`, whose parent is the **main** worktree and
  is shared by every linked worktree of the repository. `--show-toplevel` was the wrong call: inside
  a linked worktree it returns the worktree, so one project resolved two workspaces. Guarded against
  a bare repository (`root != "/"`, and the path must be a directory) with the old `--show-toplevel`
  call kept as the fallback. Verified: main checkout and a real linked worktree now resolve the same
  workspace, and a subdirectory of the main checkout still resolves it too.
- **TASK-93-002 (MEDIUM)** — `forkCandidates()` now sweeps `~/.claude/projects/*/skill-observations`,
  excluding the resolved workspace's own path. That directory is where the project-identity default
  actually writes, so it is where a fork actually lands; the three pre-existing candidates only
  covered hand-configured anchors. A missing `~/.claude/projects` is caught and yields an empty list
  rather than throwing.
- **TASK-93-003 (MEDIUM)** — `readFrontmatterBounded()` now accumulates through a `StringDecoder`,
  which holds an incomplete multi-byte sequence back until the next chunk completes it, with
  `decoder.end()` flushed on the EOF path. `decoder.end()` is deliberately **not** called on the
  early-return path: the closing `---` was found among complete lines, so the whole header is
  already decoded and anything still held belongs to the body, which this function never returns.

**Adversarial pass over the fixes** (all four transitions probed, nothing found): the file descriptor
close remains in `finally`; the decoder's early-return path loses nothing; `forkCandidates` degrades
to `[]` on a missing directory rather than throwing; and the three fixes do not interact — one is
bash, the other two are in unrelated JavaScript functions.

**Mutation proofs — 3/3**

| Fix | Mutation | Result |
|---|---|---|
| TASK-93-001 | `--git-common-dir` → `--show-toplevel` | ✅ RED |
| TASK-93-002 | `~/.claude/projects/*` sweep removed | ✅ RED |
| TASK-93-003 | `decoder.write(...)` → `buf.toString("utf8", ...)` | ✅ RED |

**One thing worth recording about the test for TASK-93-001.** It creates a **real linked worktree**
and fails the assertion outright if it cannot. A cheaper test that merely changes directory passes
against the broken code, so it would have proven nothing — and the same shape applies to
TASK-93-003, whose test sweeps eight byte alignments because the first single-offset probe of that
defect passed by luck.

**File list**

- `shared/resources/resolve-observation-workspace.sh` — modified (TASK-93-001)
- `shared/resources/observation-log.js` — modified (TASK-93-002, TASK-93-003)
- `shared/resources/tests/observation-log.test.mjs` — 3 regression tests added (41 → 44)

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Final Gate**: `task.93.gate.4.observation-log-engine.yml` — ✅ **PASS**, 96/100, `top_issues: []`
**QA Cycles**: 4 · **Findings**: 7 raised, 7 closed · **HIGH by cycle**: 1, 2, 0, 0 (converging)
**PR Review (Step 5c)**: ⚠️ CONCERNS — 4 findings, all applied before acceptance

All Definition of Done criteria verified:

✅ **Acceptance Criteria** — 21/21 traced to evidence in the shipped files, each citing a named test or a live-executed result
✅ **Tests** — 48 in this suite; `npm run ci:fast` green (2863/2864, 1 skipped) and 448 shell assertions
✅ **CI** — ✅ SUCCESS on head `40101977`: `test`, `validate`, `shellcheck`, `link-check`, branch policy
✅ **PR** — [#353](https://github.com/Gamaroff/agent-skills/pull/353), reviewed at Step 5c, findings applied
✅ **Documentation** — `AGENTS.md` section, `CHANGELOG.md` entry, 401-line contract; all relative links resolve in the **tracked** tree
✅ **Security** — no shell-out, no `eval`, no network; sole local require asserted by a test. **Probe mode fired**: the resolver is an allow/deny predicate, 11 candidates executed, **0 reproduced** — including near-miss negatives (`/tmpfoo`, `worktreesX`) a naive prefix match would wrongly refuse
✅ **Compliance** — CC BY 4.0 attribution complete: author, licence link, canonical source, and an explicit statement that changes were made
✅ **Mutation discipline** — 23 proofs across 4 cycles; every guard reverted, its named test confirmed red, then restored

### What the CI gate caught

The first rollup sample was **FAILURE**: 30 tests red in CI on a suite passing 48/48 locally, at a
point where every prior step had green local evidence. Cause: `os.tmpdir()` is `/tmp` on Linux and
`/var/folders/…` on macOS, so every test workspace was refused by the engine's **own** ephemeral
guard on Linux only. Fixed by moving scratch to a repo-local durable base, with an import-time
assertion using the engine's own predicate so it can never silently become platform-dependent again.
`eval:all` runs only in CI and at the merge gate, so this was genuinely the first place it could
surface.

**Detailed Verification Log:** see [`task.93.dod.1.observation-log-engine.md`](./task.93.dod.1.observation-log-engine.md).

**Task marked as ACCEPTED on:** 2026-09-08

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-08
**Quality Score**: 96/100
**Gate Decision**: PASS (cycle 4 of 5)

### QA Reports

| Cycle | Gate | Score | Report |
|---|---|---|---|
| 1 | FAIL | 70 | [qa.1](./task.93.qa.1.observation-log-engine.md) · [gate.1](./task.93.gate.1.observation-log-engine.yml) |
| 2 | FAIL | 70 | [qa.2](./task.93.qa.2.observation-log-engine.md) · [gate.2](./task.93.gate.2.observation-log-engine.yml) |
| 3 | CONCERNS | 90 | [qa.3](./task.93.qa.3.observation-log-engine.md) · [gate.3](./task.93.gate.3.observation-log-engine.yml) |
| 4 | **PASS** | **96** | [qa.4](./task.93.qa.4.observation-log-engine.md) · [gate.4](./task.93.gate.4.observation-log-engine.yml) |

### Test Coverage Summary

- **Tests Executed**: 48 (this suite) / 2,863 repo-wide + 448 shell assertions
- **Phases Verified**: 5/5
- **Findings**: 7 raised, 7 closed, 0 remaining
- **HIGH by cycle**: 1, 2, 0, 0 — converging
- **NFR Status**: Security PASS, Performance PASS, Reliability PASS, Maintainability PASS

### Key Findings

All seven closed and mutation-proven. Three concerned the boundary between the process and the world
outside it (which checkout am I in, where does a buffer end, whose home directory is this); three
were introduced by fixes to earlier findings; one was found only because the operator stopped an
unsafe verification script.

The pattern that held across every cycle: **the cheap version of a check reports success.** A
single-offset UTF-8 probe passed. A `cd`-based worktree test would have passed. A one-directional
fork test did pass, and let a HIGH through. A test that cleaned up after itself still wrote into the
user's home directory. The first encoder-parity test passed while exercising neither shipped
encoder — the finding reproduced inside its own fix.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
| 2026-09-08 | 1.1     | Review passed (9/10) — corrected the `remember-insight` reuse instruction in Phase 2, Low Risk Areas §1, Progress Tracking and References: the cited derivation does not exist as code, so the resolver authors it against the documented convention | review-task |
| 2026-09-08 |         | Status → ready-for-development | review-task |
| 2026-09-08 |         | Implemented — 4 files created, 1 modified (AGENTS.md), 40 tests, 18 guards mutation-proven | develop |
| 2026-09-08 |         | Status → ready-for-review | develop |
| 2026-09-08 |         | QA gate FAIL (70/100) — 3 findings: worktree-dependent workspace (HIGH), doctor blind to project-path forks, UTF-8 chunk-boundary corruption | qa-task |
| 2026-09-08 |         | Status → in-progress (QA FAIL) | qa-task |
| 2026-09-08 |         | QA findings fixed — 3 findings (1 HIGH, 2 MEDIUM), 1 iteration; all mutation-proven | qa-fix |
| 2026-09-08 |         | Status → ready-for-review | qa-fix |
| 2026-09-08 |         | QA cycle 2 (refute pass) FAIL (70/100) — all 3 cycle-1 findings verified fixed; 3 new: fork sweep false-positives across projects (HIGH), test suite writes into the real ~/.claude (HIGH), archive overwrites via renameSync | qa-task |
| 2026-09-08 |         | Status → in-progress (QA FAIL) | qa-task |
| 2026-09-08 |         | QA cycle 2 findings fixed — narrowed fork sweep, archive collision guard, temp-HOME test isolation; 4 mutation proofs | qa-fix |
| 2026-09-08 |         | Status → ready-for-review | qa-fix |
| 2026-09-08 |         | QA cycle 3 CONCERNS (90/100) — 3 cycle-2 findings verified fixed, 0 HIGH (converging 1,2,0); 1 new: two path encoders with no cross-check | qa-task |
| 2026-09-08 |         | QA cycle 3 finding fixed — end-to-end encoder-parity test, both shipped encoders mutation-proven | qa-fix |
| 2026-09-08 |         | QA cycle 4 gate PASS (96/100) — all 7 findings closed, 0 remaining | qa-task |
| 2026-09-08 |         | PR review (5c) CONCERNS — 4 findings, all applied | review-pr |
| 2026-09-08 |         | CI red on Linux — test scratch sat under an ephemeral anchor; scratch base moved, import-time guard added | qa-fix |
| 2026-09-08 | 1.2     | DoD passed — accepted (PR #353) | finalise |

---

## Progress Tracking

### Phase 1: Contract first
- [x] Storage layout, frontmatter field table, id/archival rules
- [x] `parked` semantics, including the archival exemption
- [x] Skill families, `siblings_checked:`, no-registry fallback
- [x] Carrier pattern
- [x] Version-control hazards
- [x] CC BY 4.0 attribution block

### Phase 2: The resolver
- [x] Three-source resolver order
- [x] Author the project-identity derivation against the documented `<encoded-project-path>` convention
- [x] Export the three variables
- [x] Non-zero exit on unrecognised values
- [x] Ephemeral-anchor refusal
- [x] `shellcheck --severity=warning` clean

### Phase 3: Engine — reads
- [x] Arg parsing, flags, exit-code table
- [x] `init`
- [x] `scan` with the independent count guard
- [x] `queue` with the reconciliation assertion
- [x] `doctor`
- [x] `process.exitCode` discipline

### Phase 4: Engine — writes
- [x] `next-id` with the folded archival sweep
- [x] `write` with `wx` create and collision handling
- [x] No `--id` flag
- [x] `set-status` with lifecycle validation
- [x] `archive` with the date gate and `parked` exemption
- [x] `checkpoint`
- [x] `families [--audit]`

### Phase 5: Tests and registration
- [x] End-to-end smoke
- [x] Mutation-proven guard tests
- [x] Pipe-truncation test
- [x] `AGENTS.md` section
- [x] Format, test, shellcheck

---

## References

- **Upstream methodology**: [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) — CC BY 4.0, Eoghan Henn / rebelytics.com. This task adapts the methodology; the mechanism is a rewrite.
- **Engine idiom**: `shared/resources/tracker-comment.js` — exit codes, `--json` `reason` contract
- **Resolver idiom**: `shared/resources/resolve-platform.sh`, `shared/resources/platform-detection.md`
- **Contract-doc idiom**: `shared/resources/tracker-comment-contract.md`
- **Path convention to follow** (documented there, *not* implemented — this task writes the first implementation): `skills/remember-insight/SKILL.md`
- **Pipe-truncation precedent**: `skills/develop-next/scripts/select-next.mjs:1629`, `bug.3.stdout-truncation-on-exit`
- **Follow-on tasks**: task 94 (the `observe-work` skill), task 95 (docs and boundaries)
- **Source plan**: [task.93.plan.observation-log-engine.md](task.93.plan.observation-log-engine.md)

---

## Notes

### Important Reminders

- **Write the contract before the engine.** The contract is what task 94's prose is written against; a spec reverse-engineered from code inherits the code's accidents.
- **`command node`, never bare `node`** in any prose or test helper — the shell function pollutes stdout.
- **Do not hand-edit anything under `skills/*/references/`.** These files have no bundled copies yet, but the moment task 94 references them, the only editable source is `shared/resources/`.
- **A guard without a mutation proof is not done.** This is the repo standard and the single most important line in this document.
- **"Unrunnable" is a claim.** If `shellcheck` appears unavailable, verify that before writing the criterion off — it has been written off three times here and found a real defect the moment it actually ran.

### Known Issues

**Open** (Non-blocking):
- ⚠️ The `observations:` block in `skills-config.yaml` is read by the resolver in this task but documented in task 95. Anyone reading the resolver before 95 lands has no schema reference — acceptable, since nothing consumes the resolver until task 94.

### Future Improvements

- Upstream's `validate-skill-bundle.py` carries edit-residue checks this repo lacks — merge-conflict markers, unresolved `{{template slots}}`, literal regex backreferences left in prose. Folding those into `quick_validate.py` is a genuinely good idea and a separate, small task.
- A `SessionStart` hook that computes open-observation count and last-review date and injects them as `additionalContext` is the only *enforced* activation tier. Task 94 documents it; shipping it as a repo hook is a candidate follow-up.

---

**Status:** Accepted

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.93.qa.[number].observation-log-engine.md`
   - Bug Reports (if needed): `task.93.bug.[N].[name].md`
   - Quality Gate: `task.93.gate.[number].observation-log-engine.yml` (co-located in task directory)
