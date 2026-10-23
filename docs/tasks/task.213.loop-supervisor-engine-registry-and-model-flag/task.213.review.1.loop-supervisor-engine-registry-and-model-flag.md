# Task Review Report: Task 213 - loop-supervisor: an engine registry (claude, agy) and a --model flag

**Reviewed:** 2026-10-21
**reviewed_blob:** b0de1866b4618dccfdcb183f7decc6214e83868d
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-10-21

---

## Executive Summary

The task is well-grounded: every code claim about `run-loop.mjs`, `classify.js` and `render.js` checks out against the tree, and the plan orders the work so the `claude` refactor is measured before it is trusted. The defects are design gaps rather than errors of fact, with one exception: `claude` 2.1.306 **does** accept `--effort`, so the planned refusal of `--effort` on `claude` would refuse a flag the engine honours. The open author decision (the `agy` permission model) was resolved with the task's own stated recommendation, since this review ran unattended.

**Critical Issues:** 0 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions, auto-answered (autonomous `/develop-next` run — each took the document's own recommendation)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside `/develop-next` → `/develop-task --defaults` with nobody present. Each question below was resolved with the option the document or the skill marks as recommended, and is recorded as an auto-answer.

### Question Point 1: Structure & Scope

**Q1: The task has no linked GitHub issue. Create and link one now?**
- **Auto-answer**: Sync to GitHub (Recommended).
- **Impact**: Issue [#715](https://github.com/Gamaroff/agent-skills/issues/715) created through `ensure-task-github-issue` (dedup search found none), added to the "Agent Skills" board, Priority P2. The board has no `Estimate` field, so the 16 h estimate was not mirrored.

### Question Point 2: Technical & Implementation

**Q2: Risk 1 — what does the `agy` entry do about permissions? ("Needs the author's decision.")**
- **Auto-answer**: the task's own recommended default. The supervisor never emits `--dangerously-skip-permissions` on its own authority. An explicit operator flag `--dangerously-skip-permissions` on `run-loop.mjs` passes it through, only for an engine whose `supports.skipPermissions` is `true` (`agy`); `claude` refuses it (exit 1), which keeps the `supervisor-settings.json` decision intact. It is **not** a config key — a committed file must not grant it silently, the same reasoning that keeps the dashboard token out of config. `dry-run` prints the permission posture. `--sandbox` is recorded by Phase 0 and not emitted by default.
- **Impact**: Risk 1 now states the decision; Phase 2 and Phase 3 carry the flag and its refusal; a success criterion holds it.

**Q3: Medium Risk 1 — `--conversation` resumes rather than pins.**
- **Auto-answer**: the document's mitigation — Phase 0 checks whether a fresh id is accepted; if it is rejected, omit the flag and take the id from the stream.
- **Impact**: none beyond the ledger rule in Important 4.

### Question Point 3: Completeness & Safety

No further questions — the remaining findings each had one evident fix.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (fixed)

- All 11 numbered sections, Progress Tracking and References are present; file name follows `task.{N}.{name}.md`.
- OKF: `type: task`, `description`, `tags` (list) present.
- No placeholders.
- Sign-off: `sign-off.enabled` absent in `skills-config.yaml` — not checked.
- Change Log: present, four columns; current for `planned`. This review appends its rows.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — 3 card blocks resolve (Summary +4 omitted, Success Criteria +7, Breaking Changes +5 lines).

#### Important
- **No tracker linkage** (`github_issue` absent). Fixed: #715 created and written back, body link added.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Verified against the tree (claims hold):
- `claudeBin = resolveBinary("claude")` in `main` (`run-loop.mjs:1092`), `buildClaudeArgs` (`:369`), `if (obj.type === "result") envelope = obj;` (`:1406`), `transcriptPathFor` (`:1560`), `KEY_OF` (`:207`), `applyConfig` (`:330`), `DEFAULTS` (`:87`).
- `classify()` receives `subtype` and `isError` (`run-loop.mjs:1452-1453`); `isChildError` reads `isError` first, then `ERROR_SUBTYPES` (`classify.js:29`, `:68-71`) — Step 3 check 21 holds.
- `render.js` documents "Absent fields render as `—`, never as `undefined` or `NaN`" and `money()` handles null (`render.js:56`, `:112`).
- `evals/loop-supervisor/unit/*.test.mjs` is in the `package.json` `test` glob — the new `engines.test.mjs` is reached (check 18).
- `supervisor-settings.json` `$comment` records the rejection of `--dangerously-skip-permissions`.
- `agy` 1.4.2 `--help`: `-p`/`--print`, `--output-format`, `--model`, `--effort low|medium|high|xhigh|max`, `--mode accept-edits|auto|plan`, `--conversation` ("Resume a previous conversation by ID"), `--sandbox`, `--dangerously-skip-permissions` — all as the task's table says. `agy models` lists 13 ids across Gemini, Claude and GPT-OSS.
- Relative links: `doc-links.js` — 3 links in the task, 1 in the plan, all resolve.

#### Important
1. **`claude` accepts `--effort`.** `claude --help` on 2.1.306 lists `--effort <level>` (and `--model <model>`). The task scoped "`--effort` on `claude`" as an engine-unsupported flag to refuse. Refusing it would refuse a flag the engine honours. Fixed: `claude`'s entry supports and emits `--effort`; the refusal applies to an engine whose `supports.effort` is `false` (none today).
2. **The `supports` shape disagrees between the task and the plan.** The task's Target Architecture lists `{ maxTurns, cost, pinnedSession, settingsFile }`; the plan's Phase 2 reads `engine.supports.effort`, and the plan's Phase 1 adds a `renderLine` hook the task never names. Fixed: Target Architecture now lists `supports: { maxTurns, cost, pinnedSession, settingsFile, effort, skipPermissions }` and the optional `renderLine(obj)` hook.

Population checks: check 14 (engine call sites) is not applicable — the task enumerates no call sites of the five tracker engines. Check 15 (removed literals): nothing is removed — `buildClaudeArgs` stays as a delegate and its tests (`run-loop.test.mjs:22`, `:117-177`) keep passing; the `claude -p` hit in `classify.test.mjs:341` is a comment. The task's own site count is a command, not a figure (Files Summary) — check 7 satisfied; it measures 31 today.

Pre-pass: Agents B and C were **not dispatched**; both axes were checked inline in this session (architecture: the skill's own `references/` CommonJS convention, `childEnvFor` credential boundary; codebase: no engine registry exists yet). Independence loss recorded.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important
3. **Permission decision missing (Risk 1).** Fixed per Q2: Phase 2 adds `--dangerously-skip-permissions` (operator-only, not config) with its refusal on `claude`; Phase 3 emits the engine flag only under it; `dry-run` prints `permissions`.
4. **Ledger `sessionId` is unspecified for an engine with no pinned session.** Today every ledger row's `sessionId` is the uuid passed to `--session-id`, and the README promises `claude --resume <sessionId>`. For `agy` the supervisor's uuid names nothing. Fixed: the ledger writes the pinned uuid when `supports.pinnedSession`, else the id the engine's stream reports (`parseResult`'s optional `sessionId`), else `null` — never an unused uuid — and `transcriptPath` is `null` likewise.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important
5. **"identical to the pre-change output" cannot hold literally.** The dry-run `argv` embeds a fresh sample session uuid on every run (`run-loop.mjs:1100-1106`), and `resolved.*` embeds machine paths. Fixed: the criterion and plan now compare `argv` with the `--session-id` value normalised, and paths compared by key, not text.
6. **Performance criteria held neither way.** "Wall time within 10%" is a wall-clock bound with no command or load record, and adding tests to the suite changes its wall time by construction. "No additional subprocess call" is a behaviour criterion with no planned test. Fixed: the first is now a measured bound over the five pre-existing test files with `uptime` beside `time`, on base and head; the second is re-scoped to "`dry-run` never executes the engine binary", held by the fake-binary test (a fake engine that writes a marker file when executed).
7. **Documentation sweep misses two documents, and the Migration criterion has no search.** `skills/develop-next/SKILL.md:677` and `skills/develop-next/README.md:31` both say `loop-supervisor` "spawns one `claude -p`". `docs/reference/commands.md:29` says dry-run prints "the exact `claude` argv". Fixed: both develop-next files added to Scope and Files Summary; the criterion now carries its search (`git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks`), with the historical `CHANGELOG.md` and the `classify.test.mjs` capture comment excluded by name.
8. **Tracker linkage** — see section 1 (counted once).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risk 1 now records its decision (Q2). The rollback triggers already name "an `agy` run that skips permissions without an explicit operator flag", which now matches a concrete flag.
- Risk 2 (parsing a description): mitigated by the Phase 0 capture and the fail-closed `isError: !ok`, with a control case in Testing Strategy — check 2 (control case) satisfied.

#### Optional
- O1. `dry-run`'s `resolved.settings` has no meaning for an engine without `supports.settingsFile`; state it is omitted there. (Applied — cheap and removes a guess.)
- O2. The model-id effort suffix (`…-high`) vs `--effort` disagreement is documented as passthrough; a one-line note in the README would save an operator the surprise. (Folded into the Phase 4 sweep.)
- O3. `estimated_effort_hours: 16` is consistent with 5 phases and 12 criteria at medium-high risk; no change.

No Mermaid diagram; none needed — the target architecture is one object shape, stated in prose.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 8 issues (all applied)

1. Link a GitHub issue (#715).
2. `claude` supports `--effort`; refuse only where `supports.effort` is false.
3. One `supports` shape (+ `effort`, `skipPermissions`) and the `renderLine` hook in Target Architecture.
4. Record the Risk 1 decision; add the operator flag and its refusal.
5. Specify the ledger `sessionId` / `transcriptPath` for engines without a pinned session.
6. Normalise the sample session uuid in the characterisation comparison.
7. Re-state both performance criteria (measured bound with load record; fake-binary test).
8. Add the two develop-next documents to the sweep and give the Migration criterion its search.

### Consider (Optional) - 3 items

1. Omit `resolved.settings` where the engine has no settings file (applied).
2. README note on model-suffix vs `--effort`.
3. Effort estimate — no change.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High — Phase 3 depends on a live `agy` capture that has not run yet; Phase 0 is first for that reason.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; every important finding had one evident fix and is applied; the remaining uncertainty is measured by Phase 0 by design.

---

## Next Steps

1. Phase 0 first: capture the `agy` stream and record the four facts in the plan before any `agy` code.
2. Write the `claude` characterisation test before the refactor.
3. Follow phases 1–4; mutation-prove each guard as Testing Strategy says.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous within develop-task Step 2)
- **Review Date:** 2026-10-21
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.loop-supervisor-engine-registry-and-model-flag.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md`, `source-tree.md` (always-load); the skill's own `references/` modules
- **Review Duration:** ~25 min
