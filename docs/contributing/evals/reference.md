# Evals — Reference

> **Audience:** contributors understanding the eval architecture, drivers, and scenario layout.

Architecture and contracts for the eval suite. For recipes see [recipes](./recipes.md); for setup see [README](./README.md).


### The four layers

| Layer | Location | What it catches | Runs via |
| --- | --- | --- | --- |
| **L1 Unit** | `skills/*/tests/*.test.js` | Pure helpers — filename regex, id allocators, sprint-status merges, template-section detection | `npm test` |
| **L2 Golden fixture** | embedded in L1 | Template substitution + sprint-status merge against known inputs | `npm test` |
| **L3 Protocol checker** | `tests/skill-protocol.test.js`, `evals/develop-task/protocol/` | SKILL.md ↔ template ↔ sub-skill drift; HALT/STOP terminator presence; mandatory-section counts; pipeline shape and step contracts | `npm test` |
| **L4 End-to-end** | `evals/create-task/`, `evals/create-story/`, `evals/develop-task/step-isolation/` | End-to-end artefact shape; pipeline step contracts; branch/lock/PR/QA artefact assertions | `npm run eval:all` + `npm run eval:develop-task` |
| **L5 Smoke** | `evals/develop-task/smoke/` | Full pipeline live run against real git sandbox; GH PR optional | `npm run eval:develop-task:smoke` |

L1–L4 replay run on every push. Live drivers (`claude-sdk`, `claude-cli`), the live-tracker scenario, and the smoke test are `workflow_dispatch` only.

### Drivers

| Driver | Requires | Use case |
| --- | --- | --- |
| `replay` (default) | nothing | CI gate — copies fixture artefacts into a sandbox, runs assertions |
| `claude-cli` | `claude` binary on PATH | Local live runs without SDK dep; CLI handles auth |
| `claude-sdk` | `@anthropic-ai/claude-agent-sdk` + `ANTHROPIC_API_KEY` | Programmatic invocation; richer Q&A interception |

Add a driver: drop `evals/shared/drivers/<name>.mjs` implementing the contract in `evals/shared/drivers/types.mjs`. No scenario/assertion changes needed.

### Scenarios

| Scenario | Skill | Path | Covers |
| --- | --- | --- | --- |
| `01-happy` | create-task | `evals/create-task/scenarios/01-happy/` | All 11 mandatory sections, ≥2 citations, frontmatter, tracker payload shape |
| `02-id-collision` | create-task | `evals/create-task/scenarios/02-id-collision/` | HALT — pre-existing task.42 untouched, no new file, halt.log emitted |
| `03-tracker-live` | create-task | `evals/create-task/scenarios/03-tracker-live/` | **Live** Jira/GitHub round-trip; needs live driver + creds; cleans up after itself |
| `01-happy` | create-story | `evals/create-story/scenarios/01-happy/` | Required template sections, ≥2 citations, sprint-status merge |
| `02-missing-core-config` | create-story | `evals/create-story/scenarios/02-missing-core-config/` | HALT — no core-config.yaml → no story file, halt.log emitted |
| `01-create-branch` | develop-task | `evals/develop-task/step-isolation/01-create-branch/` | Feature branch created, pipeline lock written |
| `02-review-task` | develop-task | `evals/develop-task/step-isolation/02-review-task/` | Review report produced |
| `03-develop` | develop-task | `evals/develop-task/step-isolation/03-develop/` | Task status progressed to ready-for-review |
| `04-create-pr` | develop-task | `evals/develop-task/step-isolation/04-create-pr/` | PR created (or skipped) with correct base |
| `05-qa-task` | develop-task | `evals/develop-task/step-isolation/05-qa-task/` | QA report + gate file produced with PASS/CONCERNS |
| `06-qa-fix-loop` | develop-task | `evals/develop-task/step-isolation/06-qa-fix-loop/` | qa-fix loop is bounded (≤5 iterations) |
| `07-finalise` | develop-task | `evals/develop-task/step-isolation/07-finalise/` | DoD file produced, task accepted |
| `08-commit-changes` | develop-task | `evals/develop-task/step-isolation/08-commit-changes/` | No lock files left, implementation report present |
| `01-end-to-end-dry` | develop-task | `evals/develop-task/smoke/01-end-to-end-dry/` | **Live** full 8-step pipeline; GH PR optional via `GH_TOKEN` |
| `00-create-epic-branch-fresh` | develop-story | `evals/develop-story/step-isolation/00-create-epic-branch-fresh/` | Epic branch created from develop (no pre-existing branch) |
| `00-create-epic-branch-exists` | develop-story | `evals/develop-story/step-isolation/00-create-epic-branch-exists/` | Epic branch already exists — only-if-missing no-op |
| `01-create-story-branch` | develop-story | `evals/develop-story/step-isolation/01-create-story-branch/` | Story branch created from epic branch, not develop |
| `02-review-story` | develop-story | `evals/develop-story/step-isolation/02-review-story/` | Review report produced |
| `03-develop-loop` | develop-story | `evals/develop-story/step-isolation/03-develop-loop/` | Story status progressed to ready-for-review |
| `04-create-pr` | develop-story | `evals/develop-story/step-isolation/04-create-pr/` | PR targets epic branch (`prTargetsEpicBranch` regression guard) |
| `05-qa-story` | develop-story | `evals/develop-story/step-isolation/05-qa-story/` | QA report + gate file produced with PASS |
| `06-qa-fix` | develop-story | `evals/develop-story/step-isolation/06-qa-fix/` | qa-fix loop bounded (≤5 iterations) |
| `07-finalise` | develop-story | `evals/develop-story/step-isolation/07-finalise/` | DoD file produced, story accepted |
| `08-commit-changes` | develop-story | `evals/develop-story/step-isolation/08-commit-changes/` | No lock files left, implementation report present |
| `01-end-to-end-dry` | develop-story | `evals/develop-story/smoke/01-end-to-end-dry/` | **Live** full pipeline; epic branch + PR-base assertions |
| `02-resume-mid-loop` | develop-story | `evals/develop-story/smoke/02-resume-mid-loop/` | **Live** pipeline killed mid qa-fix, resumed; verifies `resumeRehydrated` |

Each scenario is `scenario.json` + `answers.jsonl` + `env.json` + `replay/`.

### Scripts

```bash
npm test                         # platform resolver + L1 + L2 + L3 + L4 replay (the hermetic CI gate)
npm run test:platform             # resolve-platform.sh tests only
npm run eval:all                  # L4: all create-task + create-story + develop-task + develop-story step-isolation, replay
npm run eval:create-task          # L4: create-task scenario 01, replay
npm run eval:create-task:all      # L4: all create-task scenarios, replay
npm run eval:create-task:cli      # L4: create-task scenario 01, DRIVER=claude-cli
npm run eval:create-task:sdk      # L4: create-task scenario 01, DRIVER=claude-sdk
npm run eval:create-story         # L4: create-story scenario 01, replay
npm run eval:create-story:all     # L4: all create-story scenarios, replay
npm run eval:create-story:cli     # L4: create-story scenario 01, DRIVER=claude-cli
npm run eval:create-story:sdk     # L4: create-story scenario 01, DRIVER=claude-sdk
npm run eval:develop-task         # L3+L4: develop-task protocol tests + step-isolation scenarios, replay
npm run eval:develop-task:smoke   # L5: develop-task full smoke (needs ANTHROPIC_API_KEY)
npm run eval:develop-story        # L3+L4: develop-story protocol tests + step-isolation scenarios, replay
npm run eval:develop-story:smoke  # L5: develop-story full smoke (needs ANTHROPIC_API_KEY)
npm run eval:develop-story:resume # L5: develop-story resume-mid-loop (needs ANTHROPIC_API_KEY + EVAL_MODE=1)
```

### Canonical sources

This doc navigates. Authoritative details live next to the code:

- `evals/shared/README.md` — runner contract, driver-adding guide, sabotage-verify workflow, new lib helpers (git-sandbox, gh-sandbox, pipeline-recorder)
- `evals/create-task/README.md` — create-task scenario coverage and how to run
- `evals/create-story/README.md` — create-story scenario coverage and how to run
- `evals/develop-task/README.md` — develop-task eval layers, smoke test usage, adding new scenarios
- `evals/develop-story/README.md` — develop-story eval layers, epic-branch assertions, resume scenario
- `evals/create-task/scenarios/03-tracker-live/README.md` — live tracker env contract, receipt shape, safety notes
- `evals/develop-task/smoke/01-end-to-end-dry/README.md` — smoke test env contract, failure investigation, cleanup
- `evals/develop-story/smoke/01-end-to-end-dry/README.md` — develop-story smoke env contract, PR-base assertion
- `evals/shared/drivers/types.mjs` — `AgentDriver` JSDoc contract
- `.github/workflows/test.yml` — CI gating
