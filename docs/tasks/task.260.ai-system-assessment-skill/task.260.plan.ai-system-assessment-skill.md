---
id: task.260.plan
title: "Implementation Plan: ai-system-assessment skill"
type: plan
task-ref: task.260.ai-system-assessment-skill.md
---

# Implementation Plan: ai-system-assessment skill

> Requirements and success criteria: [task.260.ai-system-assessment-skill.md](task.260.ai-system-assessment-skill.md)

## Overview

Build `skills/ai-system-assessment/` as a user-invoked, read-only skill: discover the target, decide its type, load only the applicable principle checklists, gather cited evidence, rate, and write a report with a roadmap. Scaffold with `python skills/create-skill/scripts/init_skill.py ai-system-assessment --path skills/`, then follow `skills/tech-debt-audit/SKILL.md` for structure.

## Phase-by-Phase Implementation Guide

### Phase 1: Rubric and target types

**Files to modify:**
- `skills/ai-system-assessment/references/rubric.md` — five ratings.
- `skills/ai-system-assessment/references/target-types.md` — four target types.

**Exact changes:**

Ratings and the evidence bar:

| Rating | Bar |
|---|---|
| Strong | Control present, enforced mechanically (test, CI gate, config), with a cited `path:line` |
| Partial | Control present but prose-only, or enforced for some paths only |
| Gap | Searched the plausible locations, found nothing; the report lists the searches |
| Not applicable | The principle cannot apply to this target type; a reason is given |
| Unverified | No search was possible, or the target was too large to cover; says what was not covered |

Target types and what the principles mean for each:

| Type | Principle 2 (grounding) means | Principle 4 (access) means |
|---|---|---|
| Prompt/skill library | how prompts obtain ground-truth context (shared docs, bundling) | what the agent is permitted to do (permissions, tracker access modes) |
| Deployed assistant | retrieval over owned documents | end-user identity passed into every tool call |
| Agent framework | the retrieval and memory interfaces it offers | the identity and permission hooks it offers |
| Product feature | the context the feature feeds the model | the feature's authorisation model |

### Phase 2: Eight principle checklists

Each checklist uses the same headings: **Failure it prevents**, **Evidence signals** (each with its command), **Thresholds**, **Common false positive**, **Closing artefact**. Signal seeds below come from the hand assessment of this repository; generalise the names before writing them.

- p1: instruction file (`CLAUDE.md`/`AGENTS.md`/system prompt location), frontmatter or schema checks, CODEOWNERS, required reviewers, branch protection. `ls CODEOWNERS .github/CODEOWNERS`.
- p2: single-source docs and copies kept in sync (`bundle:check`-style), drift tests, always-loaded context and its size budget.
- p3: wrapper CLIs or tool schemas with exit codes, idempotency keys or markers, journals of deferred writes, test fakes.
- p4: access modes, most-restrictive-wins resolution, credential redaction, per-tool allowlists.
- p5: secret scanning in CI, **a rule that tracker/PR/web text is untrusted data**, PII masking on output, input filters. `grep -rniE "prompt.injection|untrusted"`. Defer execution-level testing to `review-security`.
- p6: loop and cost limits, lite modes, model routing per step, caching strategy. `grep -rniE "cache_control|prompt caching|--model"`.
- p7: per-run state and logs, decision logs, cross-run metrics, trace export.
- p8: eval layers and which are hermetic; whether CI runs on prompt edits; whether any eval measures behaviour (pass rate against a baseline) as opposed to replaying recorded output; baselines and required checks.

### Phase 3: SKILL.md

**Workflow steps** to write into the body:

1. Identify the target (path or description); state the target type and why.
2. Load `references/rubric.md` and `references/target-types.md`.
3. For each applicable principle, load only that checklist, run its signals, record evidence as `path:line` or command.
4. Rate each principle; a `Gap` lists the searches run.
5. Build the roadmap, ordered by value per effort, each item naming its closing artefact.
6. Write the report from `assets/report.template.md`.

**Rules to state in the body:** read-only; absence of evidence is `Unverified` until a covering search is recorded; never run the target's code; do not duplicate `review-security`.

### Phase 4: Fixture and tests

Fixture target: a few files shaped like a minimal prompt library, with controls present for some principles and absent for others, and one control under a nonstandard name (the misleading signal). No script applies the rubric (the collector is out of scope), so the tests hold the signal layer, not the final rating. Each checklist declares its signals as a table (`Signal`, `Pattern` as an extended regex, `Paths` as a glob). The test extracts those rows, runs them over the fixture tree in plain Node (no shell-out to the target), and asserts which signals hit and which miss per principle. Do not grep `SKILL.md` for sentences. Also assert `SKILL.md` is at most 300 lines and that the fixture tree hashes identically before and after the run. The report goes to a user-named path, default `AI_SYSTEM_ASSESSMENT.md` in the working directory, never inside an assessed target that is another repository.

### Phase 5: Integration

`npm run bundle`, `npm run generate-catalog`, `npm run validate -- skills/ai-system-assessment/`, add the two reference-page entries, add the test glob to `package.json:27`, then `CI=true npm test`.

## Expected output: worked example (this repository, assessed 2026-11-04)

Use this as the expected-output fixture for the Consumer Test. Evidence paths were read from the repository, not executed.

| # | Principle | Rating | Evidence | Gap |
|---|---|---|---|---|
| 1 | System prompt and change control | Partial | `CLAUDE.md`; `tests/skill-frontmatter.test.js`; `tests/skill-protocol.test.js`; `GOVERNANCE.md`; `.github/workflows/branch-policy.yml` | No `CODEOWNERS` (searched `CODEOWNERS`, `.github/CODEOWNERS`); no required eval check on SKILL.md edits; trigger accuracy of `description` unmeasured |
| 2 | Grounding | Strong | `bundle:check`, `evals/shared/tests/bundled-parity.test.mjs`, registry-drift tests, `devLoadAlwaysFiles` | Doc drift found by a manual audit, not CI; no size budget on always-loaded files |
| 3 | Tools | Strong | `shared/resources/tracker-comment.js`, `defer-mutation.js`, idempotency markers, `fake-jira.js` | Raw curl and Atlassian MCP writes uncovered by design |
| 4 | Access control | Partial | `access.tracker` most-restrictive-wins in `docs/reference/configuration.md`; `resolve-platform.sh` | `access.vcs` is `full` only; no per-skill tool allowlist |
| 5 | Guardrails | Gap | gitleaks workflow `secret-scan.yml`; `review-security` | No rule treating tracker, PR or fetched text as untrusted (only `skills/tech-debt-audit/SKILL.md` mentions injection); no PII masking. Third-party prose reaches the model at five read sites: `skills/review-pr/SKILL.md:391` (PR body), `skills/review-task/SKILL.md:150` (issue body), `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:126` (issue body), `skills/browser-use/SKILL.md:78` (`get text`), `skills/explain-simply/SKILL.md:72` (`WebSearch`). Not read paths: `shared/resources/pr-read.sh` (metadata only), `skills/deep-research-prompt/SKILL.md` (no fetching). Tracked as task 261 |
| 6 | Cost and routing | Partial | `MAX_ITER=5`; loop-supervisor `--max-cost`; lite and fast modes; `context-pressure.mjs` | No per-step model routing; no caching strategy (`grep -rniE "prompt caching|cache_control"` found nothing in `shared/ skills/ docs/`) |
| 7 | Observability | Partial | co-located reports, `runs.jsonl`, `tracker-actions.jsonl`, observation log | No cross-run metrics or trace export; run state gitignored |
| 8 | Evals before change | Partial | `test.yml` runs hermetic replay on every PR; `ci-gate-parity`; mutation proving; `live.minPass` | Replay evals check wiring, not behaviour; `live.minPass` on four scenarios only; live evals not run in CI |

Roadmap seeds (value per effort): untrusted-content rule plus a lint test; CODEOWNERS and documented required checks; behavioural evals gating prompt edits; trigger evals for descriptions; model-routing and caching guidance.

Re-measure before using this table as a fixture: it was assembled by an exploration agent, with three claims spot-checked (no CODEOWNERS, no caching mention, injection guidance in one skill only).

## Key Patterns and References

- Structural model: `skills/tech-debt-audit/SKILL.md`.
- Adjacent: `skills/review-security/SKILL.md`.
- Mutation proving: `shared/resources/mutation-proving.md`.
- Test-glob trap: `package.json:27`.
- Findability guard: `tests/skill-doc-coverage.test.js`.

## Testing Approach

Fixture-driven rating tests in `skills/ai-system-assessment/tests/`, run with `node --test`; then `CI=true npm test`. Mutation-prove by removing one seeded control per principle.
