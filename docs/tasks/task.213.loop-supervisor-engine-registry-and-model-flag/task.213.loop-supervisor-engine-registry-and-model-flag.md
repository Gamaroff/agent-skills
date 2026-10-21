---
id: task.213
title: "loop-supervisor: an engine registry (claude, agy) and a --model flag"
type: task
description: "Make loop-supervisor engine- and model-agnostic by moving the claude-specific binary, argv, result envelope and transcript path into an engine registry, then adding --engine, --model and --effort."
tags: [loop-supervisor, engines, agy, model-selection]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-18
updated: 2026-10-21
estimated_effort_hours: 16
github_issue: 715
---

# Technical Task: loop-supervisor: an engine registry (claude, agy) and a --model flag

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.213.review.1.loop-supervisor-engine-registry-and-model-flag.md` implemented 2026-10-21
**GitHub Issue**: [#715](https://github.com/Gamaroff/agent-skills/issues/715)

---

## 1. Overview

`loop-supervisor` spawns one `claude -p` process per iteration and reads the result envelope that process prints. Every part of that is hardcoded to the `claude` CLI, and there is no way to choose a model. This task moves the engine-specific parts behind a registry (`references/engines.js`), registers the Antigravity CLI (`agy`) beside `claude`, and adds `--engine`, `--model` and `--effort` flags with matching `skills-config.yaml` keys.

**Scope**: the argv, binary, permission model, session identity, result envelope, transcript path and unsupported-flag handling per engine, the three new flags and config keys, and the documentation that says "one `claude -p` per iteration". The probe-path default in `adapters.js` is a separate task ([task.214](../task.214.loop-supervisor-probe-script-resolution/task.214.loop-supervisor-probe-script-resolution.md)).

**Key deliverables**:

1. `references/engines.js`: an engine table keyed by name, so a third engine is one new entry and no new branch in `run-loop.mjs`.
2. `--engine <claude|agy>`, `--model <id>`, `--effort <level>` on `run` and `dry-run`, with `loopSupervisor.engine`, `.model` and `.effort` config keys. A CLI flag wins over config.
3. One normalised result envelope, so `classify.js`, the ledger and the budget read the same shape from either engine.

**Direction.** The stated later goal is support for all models. That is out of scope here, and it constrains the design: `--model` is passed through unvalidated (no hardcoded model list; `agy models` is the source of truth), and engine behaviour lives in table entries.

---

## 2. Motivation

### Current Problems

1. **One engine is hardcoded.** `resolveBinary("claude")` is called unconditionally in `run-loop.mjs` (`claudeBin = resolveBinary("claude");`, in `main`), and `buildClaudeArgs` emits `--permission-mode`, `--session-id`, `--settings`, `--verbose` and `--include-partial-messages`, none of which `agy` has.
2. **No model choice.** `grep -n -- '--model' skills/loop-supervisor/scripts/run-loop.mjs` returns no hit, and `applyConfig` reads no model key. An operator cannot run an overnight loop on a cheaper or different model.
3. **The result envelope drives classification, not only cost.** `run-loop.mjs` keeps the stream line where `obj.type === "result"` (`if (obj.type === "result") envelope = obj;`) and passes `env.subtype` and `env.is_error` into `classify()`, which treats `error_max_turns` and `error_during_execution` as a child failure (`ERROR_SUBTYPES` in `references/classify.js`). An engine whose envelope is never read is classified as if it had no error signal at all.
4. **Two engine-specific assumptions are not about argv.** `transcriptPathFor` builds `~/.claude/projects/<slug>/<sessionId>.jsonl`, and `supervisor-settings.json` pins an allow/deny list through `claude --settings`. Neither has an `agy` counterpart.

### Benefits

1. A model can be chosen per run or per repo.
2. `agy` is a gateway to several model families (`agy models` lists Gemini, Claude and GPT-OSS ids), so one engine entry opens many models.
3. A failing `agy` iteration is classified as an error instead of as an idle one.
4. Flags an engine cannot honour fail loudly instead of being dropped.

---

## 3. Technical Background

### Current Architecture

- Arg parsing: `parseArgs` in `skills/loop-supervisor/scripts/run-loop.mjs`, with a `KEY_OF` table that records which flags were explicitly supplied. `applyConfig` fills unset keys from `loopSupervisor.*` and never overrides an explicit flag.
- argv: `buildClaudeArgs({ prompt, sessionId, settingsPath, maxTurns })` (`run-loop.mjs`, exported, printed by `dry-run`).
- Spawn: `spawn(claudeBin, args, { cwd, env: childEnvFor() })` in the iteration loop. The stream listener sets `envelope` from the `result` line and `renderStreamLine` formats it for the human log.
- Totals and ledger read `env.total_cost_usd` and `env.num_turns`; `classify()` reads `env.subtype` and `env.is_error`.
- `transcriptPathFor(cwd, sessionId)` is written to every ledger row.

### Verified facts about `agy` (installed at `~/.local/bin/agy`, `agy --help` read on 2026-10-18)

| Capability | `claude` today | `agy` |
| --- | --- | --- |
| Print mode | `-p <prompt>` | `-p` / `--print` |
| Stream format | `--output-format stream-json` + `--verbose` | `--output-format stream-json`, no verbose flag |
| Model | none wired (`claude` 2.1.306 accepts `--model <model>`) | `--model` |
| Effort | none wired (`claude` 2.1.306 accepts `--effort <level>`) | `--effort low\|medium\|high\|xhigh\|max` |
| Permissions | `--permission-mode acceptEdits` + `--settings` allow/deny file | `--mode accept-edits\|auto\|plan`; `--dangerously-skip-permissions`; `--sandbox`; no settings file |
| Session identity | `--session-id <uuid>` pins a **new** id | `--conversation <id>` **resumes an existing** conversation |
| Turn cap | `--max-turns` | none |
| Cost in result | `total_cost_usd` | not in the envelope the handoff describes (`usage` only) |

Model ids on `agy` embed an effort level (`claude-sonnet-5-5-high`, `gemini-3.8-flash-low`), so `--model` and `--effort` can disagree.

### Not yet verified (Phase 0 must settle each before code is written)

- The real `agy` result line. The handoff describes `{"event":"result","result":{"status":"SUCCESS","num_turns":N,"usage":{…}}}`. It is a description, not a capture. Phase 0 records one real stream as a fixture.
- Which `status` values exist besides `SUCCESS`, and whether an `agy` iteration that fails exits non-zero.
- What `--mode accept-edits` does in print mode when the agent wants to run a shell command: prompt and hang, deny, or allow.
- Whether `--conversation <fresh-uuid>` starts a new conversation or errors, and where the conversation id is reported in the stream.

### Target Architecture

`references/engines.js` exports `ENGINES`, one entry per engine:

```
{ name, binary, buildArgs(ctx), parseResult(obj) -> null | envelope,
  renderLine(obj) -> string | null,            // optional; human-log formatting
  transcriptPath(cwd, sessionId) -> string | null,
  supports: { maxTurns, cost, pinnedSession, settingsFile, effort, skipPermissions } }
```

`parseResult` returns the normalised envelope `{ subtype, isError, numTurns, costUsd, sessionId? }` or `null` for a non-result line. `run-loop.mjs` calls the engine and never branches on its name. `claude`'s entry reproduces today's behaviour exactly when `model` and `effort` are unset; it supports `--model` and `--effort` (both accepted by `claude` 2.1.306) and does **not** support `skipPermissions`.

**Ledger identity for an engine without a pinned session.** Today every ledger row's `sessionId` is the uuid passed to `--session-id`. The ledger writes that uuid when `supports.pinnedSession` is `true`; otherwise the `sessionId` the engine's `parseResult` reports from the stream, else `null` — never a supervisor uuid the engine never saw. `transcriptPath` is `null` whenever the engine's `transcriptPath` returns `null`.

---

## 4. Scope

### In Scope

✅ `references/engines.js` with `claude` and `agy` entries.
✅ `--engine`, `--model`, `--effort`; `loopSupervisor.engine`, `.model`, `.effort`; CLI-over-config precedence through `KEY_OF`.
✅ Normalised result parsing for both engines, feeding `classify()`, the totals and the ledger.
✅ A decision, written into the code and the docs, for each engine-unsupported flag: `--max-turns` and `--max-cost` on `agy`, `--effort` on any engine whose `supports.effort` is `false` (none today — `claude` accepts it), and `--dangerously-skip-permissions` on `claude`.
✅ The permission-model decision for `agy` (see Risk Assessment, High 1): an operator-only `--dangerously-skip-permissions` flag.
✅ Documentation sweep: `skills/loop-supervisor/README.md`, `SKILL.md`, `docs/reference/configuration.md`, `docs/reference/commands.md`, `docs/runbooks/unattended-overnight-runs.md`, `skills/develop-next/SKILL.md` (the "spawns one `claude -p`" note), `skills/develop-next/README.md`, the `run-loop.mjs` header comment.

### Out of Scope

❌ Support for further engines or "all models". The registry is the preparation; the entries come later.
❌ A model allow-list or validation against `agy models`. A wrong id is the engine's error to report.
❌ The `probeScript` default (task.214).
❌ Making `--max-cost` work on `agy` by estimating cost from `usage` tokens. That needs a price table, which is the "all models" problem.

---

## 5. Breaking Changes

### Breaking Change 1: `buildClaudeArgs` is replaced by the engine's `buildArgs`

- **Before:** `buildClaudeArgs({ prompt, sessionId, settingsPath, maxTurns })` is exported from `run-loop.mjs`.
- **After:** `ENGINES.claude.buildArgs(ctx)` produces the same array. `buildClaudeArgs` stays exported as a thin delegate, so `evals/loop-supervisor/unit/run-loop.test.mjs` and any consumer import keep working.
- **Impact:** none for a caller that uses the delegate. A direct caller that wants a model passes `model`.
- **Migration path:** none required. The delegate is removed in a later task, not this one.

### Breaking Change 2: `--max-cost` and `--max-turns` can now be refused

- **Before:** both flags are accepted with any engine.
- **After:** with an engine whose `supports.cost` or `supports.maxTurns` is `false`, the flag exits 1 with a message naming the engine and the flag. `claude` is unaffected.
- **Impact:** only a run that combines `--engine agy` with one of those flags, which is new.
- **Migration path:** drop the flag, or use a different ceiling (`--max-iterations`, `--max-duration`).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.213.plan.loop-supervisor-engine-registry-and-model-flag.md](task.213.plan.loop-supervisor-engine-registry-and-model-flag.md)

### Phase 0: Verify `agy` and decide the open points

**Risk:** Low. **Dependencies:** none.

- [x] Run one tiny `agy -p "reply with ok" --output-format stream-json --model <cheapest id from agy models>` and save the stream as `evals/loop-supervisor/unit/fixtures/agy-result.ndjson`.
- [x] Record the `status` values, the exit code on failure, where the conversation id appears, and whether `--conversation <fresh-uuid>` is accepted.
- [x] Run one print-mode `agy --mode accept-edits` prompt that asks for a shell command, and record what happens without `--dangerously-skip-permissions`.
- [x] Put the findings in the plan file's "Verified facts" section. If a fact contradicts this document, fix the document first.

### Phase 1: The engine registry, with `claude` only

**Risk:** Medium. **Dependencies:** Phase 0.

- [x] Create `skills/loop-supervisor/references/engines.js` with the `claude` entry, lifted from `buildClaudeArgs`, the `type === "result"` parse and `transcriptPathFor`.
- [x] Route `main` and the iteration loop through the registry. Behaviour unchanged.
- [x] Add a characterisation test that pins the `claude` argv byte for byte against the current output before the refactor is applied. The dry-run `argv` carries a fresh sample session uuid on every run and machine paths in `argv[0]` and `resolved.*`, so the test normalises the value after `--session-id` and compares `argv.slice(1)` and the key set of `resolved`, not their text.

### Phase 2: `--engine`, `--model`, `--effort`, config keys, unsupported-flag handling

**Risk:** Medium. **Dependencies:** Phase 1.

- [x] Add the three flags to `parseArgs` and `KEY_OF`; add `engine`, `model` and `effort` to `applyConfig`.
- [x] Unknown engine name: exit 1, listing the known engines.
- [x] `resolveBinary(engine.binary)`; the dry-run JSON gains `engine`, `model`, `effort` and `permissions`, and `resolved.<binary>` carries the path. `resolved.settings` is printed only when `supports.settingsFile`.
- [x] Refuse `--max-turns`/`--max-cost`/`--effort` where the engine cannot honour them.
- [x] Add `--dangerously-skip-permissions` to `parseArgs` and `KEY_OF` — **flag only, never a config key**: `skills-config.yaml` is committed, and a committed file must not silently grant an unattended loop no approval boundary (the same reasoning that keeps the dashboard token out of config). Refused (exit 1, naming the flag and the engine) where `supports.skipPermissions` is `false`, which is `claude`'s case — `supervisor-settings.json` records why. `dry-run` prints `permissions: "engine default"` or `"skipped (operator flag)"`.

### Phase 3: The `agy` entry

**Risk:** High. **Dependencies:** Phase 2, and the Phase 0 findings.

- [x] `buildArgs` per the Phase 0 findings: `-p`, `--output-format stream-json`, `--mode accept-edits`, the conversation flag only if Phase 0 shows it is valid for a new id, `--model`, `--effort`.
- [x] `parseResult` maps `event === "result"` to the envelope. A `status` other than `SUCCESS`, and an unknown `status`, set `isError: true` (fail closed).
- [x] Apply the permission decision from Risk Assessment, High 1: emit `--dangerously-skip-permissions` only when the operator passed it; `--sandbox` is recorded by Phase 0 and not emitted by default.
- [x] `transcriptPath` returns `null` when `agy` has no transcript path the supervisor can name, and the ledger and `render.js` tolerate it.
- [x] The ledger `sessionId` follows the rule under Target Architecture: the conversation id from the stream (per Phase 0), else `null`.

### Phase 4: Tests and the documentation sweep

**Risk:** Low. **Dependencies:** Phases 1 to 3.

- [x] Unit tests for the table, both parsers (against the Phase 0 fixture), the flag precedence and every refusal.
- [x] Update every document in Scope; `npm run generate-catalog` if the skill description changes.
- [x] `npm run validate -- skills/loop-supervisor/` and the loop-supervisor unit suite.

---

## 7. Files Summary

The count of call sites to change is measured, not recalled: `grep -rn 'buildClaudeArgs\|claudeBin\|transcriptPathFor\|total_cost_usd' skills/loop-supervisor evals/loop-supervisor` from the repository root. The test asserts the number; this document does not.

### Files to Modify (Core Implementation)

1. `skills/loop-supervisor/scripts/run-loop.mjs`: flags, config, routing through the registry, header comment.
2. `skills/loop-supervisor/references/engines.js`: **new**.
3. `skills/loop-supervisor/references/render.js`: show a missing cost or transcript as unknown, not `$NaN`. It already prints `money()` for null; confirm and cover with a test.

### Files to Modify (Tests)

4. `evals/loop-supervisor/unit/run-loop.test.mjs`: argv characterisation, flag precedence, refusals.
5. `evals/loop-supervisor/unit/engines.test.mjs`: **new**. Picked up by the existing `evals/loop-supervisor/unit/*.test.mjs` glob in `package.json`, so no `package.json` edit.
6. `evals/loop-supervisor/unit/fixtures/agy-result.ndjson`: **new**, a real capture.

### Files to Modify (Documentation)

7. `skills/loop-supervisor/README.md`, `skills/loop-supervisor/SKILL.md`
8. `docs/reference/configuration.md`: three `loopSupervisor.*` rows and the example block.
9. `docs/reference/commands.md` (the dry-run row says "the exact `claude` argv"), `docs/runbooks/unattended-overnight-runs.md`
10. `skills/develop-next/SKILL.md` (§ Continuous mode note) and `skills/develop-next/README.md` — both say `loop-supervisor` "spawns one `claude -p`".

The sweep's population is a search, not this list: `git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks`. `CHANGELOG.md` (history) and `evals/loop-supervisor/unit/classify.test.mjs:341` (a comment naming where a fixture was captured) are excluded by name.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `engines.js`, `parseArgs`, `applyConfig`, the iteration's use of `parseResult`.
- **Command:** `command node --test 'evals/loop-supervisor/unit/*.test.mjs'`.
- **Behaviour, not source text:** call `buildArgs` and `parseResult` and assert on what they return. Do not grep the source for flag names.
- **Mutation-prove each guard:** revert the `isError` mapping and confirm the non-`SUCCESS` test goes red; revert the refusal and confirm its test goes red.

### Integration Tests

- `command node skills/loop-supervisor/scripts/run-loop.mjs dry-run --engine agy --model <id>` prints the expected `agy` argv and resolves `agy` to an absolute path.
- `dry-run --engine claude` prints an `argv` identical to the one captured before Phase 1.
- A fake engine binary (a script that prints a canned stream and exits) drives one full `run` iteration through each parser, with no network and no model call.

### Control case (the example this task quotes)

The `agy` result line in this document comes from the handoff, so a parser that only passes the handoff's example proves little. The control is an `agy` result with a `status` the handoff never mentions, which must classify as an error, plus one real `SUCCESS` capture that must not.

---

## 9. Success Criteria

### Functional

- [x] `dry-run --engine claude` prints an `argv` array identical to the pre-change output once the sample `--session-id` value is normalised, and a `resolved` object with the same keys. New dry-run keys are additive. Held by the Phase 1 characterisation test.
- [x] `dry-run --engine agy --model <id>` prints an argv that contains the model and matches the Phase 0 findings.
- [x] A non-`SUCCESS` or unknown `agy` status yields `isError: true` and the iteration classifies as `error`.
- [x] `--engine agy` with `--max-cost` or `--max-turns` exits 1 naming the flag and the engine.
- [x] `--engine claude --dangerously-skip-permissions` exits 1 naming the flag and the engine; with `--engine agy` the flag reaches the argv, and without it the `agy` argv carries no skip flag.
- [x] `--engine claude --effort <level>` puts `--effort <level>` in the argv (it is not refused).
- [x] CLI flags win over `loopSupervisor.engine|model|effort`, including a value equal to the default.

### Performance

- [x] The registry adds no measurable cost to the existing tests: the five pre-existing files (`adapters`, `classify`, `dashboard`, `render`, `run-loop` `.test.mjs`) run within 10% of their base-branch wall time, measured on base and head with `uptime; time command node --test evals/loop-supervisor/unit/{adapters,classify,dashboard,render,run-loop}.test.mjs`; on head add `--test-skip-pattern='^t213:'` so the tests this task adds to `run-loop.test.mjs` do not count. Figures are committed in the implementation report with the load line.
- [x] `dry-run` never executes the engine binary: held by a test that puts a fake `claude` and a fake `agy` on `PATH`, each of which writes a marker file when executed, and asserts no marker after `dry-run`.

### Code Quality

- [x] No `if (engine === …)` in `run-loop.mjs`; engine behaviour is read from the table.
- [x] The full `npm test` passes, including `evals/loop-supervisor/unit`.
- [x] `npm run validate -- skills/loop-supervisor/` passes.

### Migration

- [x] Every document in Scope is updated and none still says every iteration is `claude -p`: `git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks` returns only lines that name `claude -p` as the default engine, not the only one.
- [x] `docs/reference/configuration.md` documents the three keys and their CLI flags.

---

## 10. Risk Assessment

### High Risk Areas

1. **`agy` has no allow/deny file, and the handoff's argv skips permissions entirely.**
   - Risk: `supervisor-settings.json` records that `--dangerously-skip-permissions` was rejected on purpose, because an unattended loop with no approval boundary is not a trade worth making. The handoff proposes it for `agy`.
   - Probability: High that it is copied in unexamined.
   - Impact: Critical. An overnight loop runs any command with no boundary.
   - Mitigation: Phase 0 measures what `accept-edits` does alone in print mode. **Decision (review 1, 2026-10-21 — the recommended default, auto-answered in an unattended run):** the supervisor never emits the skip flag on its own authority. An operator-only `--dangerously-skip-permissions` on `run-loop.mjs` passes it through for an engine with `supports.skipPermissions` (`agy`), is refused on `claude`, is never a config key, and `dry-run` prints the posture. `--sandbox` is recorded by Phase 0 and not emitted by default. If Phase 0 shows `accept-edits` cannot run a shell command in print mode, the docs say so: an `agy` loop then needs the operator flag to run a pipeline at all.
   - Rollback: remove the `agy` entry; `claude` is unaffected.
2. **Result parsing written against a description, not a capture.**
   - Risk: a wrong field name makes every `agy` iteration look successful.
   - Probability: Medium. Impact: High, because it hides failures overnight.
   - Mitigation: Phase 0 fixture, fail-closed on unknown status, the control case above.

### Medium Risk Areas

1. **`--conversation` resumes; it does not pin a new id.** A fresh-context loop that resumes a prior conversation loses its premise. Mitigation: Phase 0 check; if a fresh id is rejected, omit the flag and take the id from the stream.
2. **`--model` and `--effort` disagree** (`...-high` model with `--effort low`). Mitigation: pass both through and document that the model id's suffix is the engine's concern; no validation.
3. **A budget ceiling silently inert.** Mitigation: the refusal in Phase 2.

### Low Risk Areas

1. Documentation drift across the five documents. Mitigation: the sweep checklist in Phase 4 and the existing docs-link check.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The `claude` dry-run argv differs from the pre-change capture.
- A live `claude` loop misclassifies an iteration it classified correctly before.

**Steps**:
1. `git revert` the merge commit on `develop`.
2. Re-run `command node --test 'evals/loop-supervisor/unit/*.test.mjs'`.
3. Confirm `dry-run` prints the old argv.

**Verification**: the pre-change dry-run capture and the current output are byte-identical.

### Partial Rollback (1-2 hours)

**When to Use**: the registry is sound and the `agy` entry is not.

**Steps**:
1. Delete the `agy` entry and its tests; keep Phases 1 and 2.
2. `--engine agy` then exits 1 with "unknown engine".

### Forward Fix (< 4 hours)

**When to Use**: a wrong `agy` status mapping, a documentation gap, or a refusal message.

**Approach**: fix the table entry and add the case to the fixture suite.

### Rollback Triggers

**Critical (Immediate Rollback)**:
- Any change to the `claude` argv or to `claude` result handling.
- An `agy` run that skips permissions without an explicit operator flag.

**Non-Critical (Forward Fix)**:
- Doc wording, an unclear refusal message, a missing fixture case.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-21
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.213.qa.1.loop-supervisor-engine-registry-and-model-flag.md](./task.213.qa.1.loop-supervisor-engine-registry-and-model-flag.md)
- **Gate File**: [task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml](./task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml)

### Test Coverage Summary
- **Tests Executed**: 31 new (21 engines, 10 `t213:`), 6,122 repository-wide passing
- **Phases Verified**: 5/5 (Phase 4 with concerns)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- There is one MEDIUM finding (TASK-213-BUG-1). Three `claude -p` lines fail the Migration criterion's own line-level search, because the qualifier is only in the next sentence.
- Every behaviour criterion is held by a committed test. Mutation: 10 of 10 covered.
- `resolveEngine` probe: 12 executed, 0 escaped, verdict `engages`.
- Advisory: CR-1 (agy `init` conversation id fallback), CR-2 (`dryRun` spawn timeout), and a stale comment at `run-loop.mjs:1093`.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-18 | 1.0 | Initial draft | create-task |
| 2026-10-21 | 1.1 | Review passed (8/10) — `claude` accepts `--effort` (not refused); one `supports` shape with `effort`/`skipPermissions` and a `renderLine` hook; Risk 1 decided (operator-only `--dangerously-skip-permissions`); ledger `sessionId` rule; normalised characterisation; performance criteria re-stated; develop-next docs added to the sweep with its search; GitHub issue #715 linked | review-task |
| 2026-10-21 |  | Status → ready-for-development | review-task |
| 2026-10-21 |  | Implemented — 13 files, 31 tests (21 in engines.test.mjs, 10 `t213:` in run-loop.test.mjs) | develop |
| 2026-10-21 |  | Status → ready-for-review | develop |
| 2026-10-21 |  | QA gate CONCERNS (90/100) — 1 finding (TASK-213-BUG-1) | qa-task |
| 2026-10-21 |  | QA findings fixed — TASK-213-BUG-1 plus 2 advisories (CR-2, stale comment), 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 0: Verify `agy` and decide the open points
- [x] Phase 1: The engine registry, with `claude` only
- [x] Phase 2: Flags, config keys, unsupported-flag handling
- [x] Phase 3: The `agy` entry
- [x] Phase 4: Tests and the documentation sweep

## References

- Handoff that prompted this task: pasted into the session on 2026-10-18 (no durable copy).
- [task.62](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md): the runner this task generalises.
- `skills/loop-supervisor/assets/supervisor-settings.json` (`$comment`): the permission decision this task must not undo.

## Notes

QA artifacts for this task land beside this file: `task.213.qa.[N].*.md`, `task.213.bug.[N].*.md`, `task.213.gate.[N].*.yml`.
