# Evals

> **Audience:** contributors authoring or maintaining skills in this repo.

Task-oriented guide for running the eval suite. Recipes first; reference tables at the bottom.

Suite catches drift between SKILL.md prose, deterministic helpers, and end-to-end behaviour for `create-task` / `create-story` / `develop-task` / `develop-story`.

---

## TL;DR

```bash
npm test                         # everything hermetic — no creds needed
npm run eval:create-task:sdk     # one live scenario via Claude SDK (needs ANTHROPIC_API_KEY)
npm run eval:develop-task        # develop-task protocol + step-isolation (no creds)
npm run eval:develop-task:smoke  # full end-to-end smoke (needs ANTHROPIC_API_KEY)
npm run eval:develop-story       # develop-story protocol + step-isolation (no creds)
npm run eval:develop-story:smoke # develop-story full smoke (needs ANTHROPIC_API_KEY)
```

If `npm test` is green, every push will stay green in CI. Live drivers are opt-in.

---

## Recipes

### 1. "I just want to know if anything is broken"

```bash
npm test
```

Runs platform resolver shell tests + L1 unit + L2 fixture + L3 protocol + L4 replay (~90 tests, no network, no creds). Same gate CI runs on every push. Takes seconds.

### 2. "I changed a SKILL.md or a script — re-run the fast loop"

```bash
npm run test:node
```

Skips the bash platform-resolver test. Use while iterating on a skill.

### 3. "I want to run one skill's scenarios in replay mode"

```bash
npm run eval:create-task                   # create-task scenario 01-happy
npm run eval:create-story                  # create-story scenario 01-happy
node evals/shared/runner.mjs evals/create-task/scenarios/02-id-collision
```

Replay copies fixture artefacts into a sandbox tmpdir and runs structural assertions. Deterministic. No model calls.

### 4. "I want to run all scenarios in replay mode"

```bash
npm run eval:all
```

Loops all create-task + create-story + develop-task step-isolation scenarios. Scenario 03-tracker-live is skipped unless creds are present.

### 5. "I want to hit the real model — Claude SDK"

One-time setup:

```bash
# add to ~/.zshrc
export ANTHROPIC_API_KEY="sk-ant-…"
```

Reload your shell, then run:

```bash
npm run eval:create-task:sdk               # create-task scenario 01 against live model
DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-story/scenarios/01-happy
```

**If you exported the key after launching Claude Code:** Claude Code's bash subprocess won't see it (env is captured at launch). Either restart Claude Code, or prefix one-off runs with `source ~/.zshrc &&`.

Verify the key is loaded:

```bash
[ -n "$ANTHROPIC_API_KEY" ] && echo "loaded, length=${#ANTHROPIC_API_KEY}"
```

When the key is missing, the driver prints `[claude-sdk] skipped: ANTHROPIC_API_KEY not set` and exits 0 — never a hard failure.

### 6. "I want to run via the Claude CLI instead of the SDK"

```bash
npm run eval:create-task:cli
```

Requires `claude` binary on PATH. Auth uses the CLI's own config — no `ANTHROPIC_API_KEY` env var needed.

### 7. "I want to run the live tracker scenario — real Jira / GitHub round-trip"

This is the only scenario that creates real tracker issues. Use a dedicated sandbox project — never production.

```bash
# add to ~/.zshrc (only the platform you want to test)
export ANTHROPIC_API_KEY="sk-ant-…"

# GitHub:
export GH_TOKEN="github_pat_…"           # fine-grained PAT, Issues: R/W
export GH_REPO="your-handle/eval-sandbox"

# Jira:
export JIRA_URL="https://your-org.atlassian.net"
export JIRA_USER="automation@your-org.com"
export JIRA_TOKEN="…"
export JIRA_PROJECT="EVAL"
```

Run:

```bash
DRIVER=claude-sdk node evals/shared/runner.mjs evals/create-task/scenarios/03-tracker-live
```

Cleanup runs unconditionally (`EVAL_CLEANUP=1` is baked into the scenario's `env.json`) — failed assertions never leak issues. Jira issues are deleted; GitHub issues are closed + locked (GH doesn't allow deletion).

### 8. "I want to run live evals in CI"

The `live-tracker` job in `.github/workflows/test.yml` is `workflow_dispatch` only (manual trigger). Set repo secrets:

```bash
gh secret set ANTHROPIC_API_KEY
gh secret set GH_TOKEN
gh secret set GH_REPO
# or for Jira:
gh secret set JIRA_URL
gh secret set JIRA_USER
gh secret set JIRA_TOKEN
gh secret set JIRA_PROJECT
```

Trigger from the Actions tab → workflow → "Run workflow". The job no-ops if neither `JIRA_TOKEN` nor `GH_TOKEN` is set.

You don't need both local and CI live setups — pick one.

### 9. "I added a new helper / scenario / driver — where does it go?"

| Want to add… | Where |
| --- | --- |
| Unit-level helper | `skills/<skill>/scripts/lib.js` + `skills/<skill>/tests/*.test.js` |
| Protocol assertion | `tests/skill-protocol.test.js` |
| create-task scenario | `evals/create-task/scenarios/<name>/` (see `evals/create-task/README.md#adding-a-scenario`) |
| create-story scenario | `evals/create-story/scenarios/<name>/` (see `evals/create-story/README.md#adding-a-scenario`) |
| develop-task step-isolation scenario | `evals/develop-task/step-isolation/<name>/` (see `evals/develop-task/README.md#adding-a-scenario`) |
| develop-task protocol test | `evals/develop-task/protocol/*.test.mjs` |
| develop-story step-isolation scenario | `evals/develop-story/step-isolation/<name>/` (see `evals/develop-story/README.md#adding-a-scenario`) |
| develop-story protocol test | `evals/develop-story/protocol/*.test.mjs` |
| Agent backend (Gemini, Goose, Aider, …) | `evals/shared/drivers/<name>.mjs` (see `evals/shared/README.md#adding-a-driver-for-another-agent`) |
| Structural assertion fn | `evals/shared/assertions.mjs` + register in `runner.mjs` switch + test in `evals/shared/tests/assertions.test.mjs` |

### 11. "I want to run the develop-task evals"

```bash
npm run eval:develop-task
```

Runs all protocol tests (`evals/develop-task/protocol/*.test.mjs`) then all step-isolation scenarios in replay mode. Deterministic — no model calls, no creds needed.

### 13. "I want to run the develop-story evals"

```bash
npm run eval:develop-story
```

Runs all protocol tests (`evals/develop-story/protocol/*.test.mjs`) then all 10 step-isolation scenarios in replay mode. Includes story-specific checks: epic branch creation (`create-epic-branch`), only-if-missing semantics, PR targets epic branch (`prTargetsEpicBranch`), and the 9-step sub-skill ordering. Deterministic — no model calls, no creds needed.

### 14. "I want to run the develop-story smoke test"

Full 8-step pipeline for a story with git-sandbox + optional gh-sandbox:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-story:smoke
```

Full — with real GitHub PR targeting the epic branch:

```bash
ANTHROPIC_API_KEY=sk-ant-... GH_TOKEN=ghp_... GH_REPO=your-handle/eval-sandbox npm run eval:develop-story:smoke
```

Key assertion: `prTargetsEpicBranch` verifies the PR base is `feature/epic.5.example`, not `develop`. This is the primary regression guard for story pipeline drift.

Resume test (requires `EVAL_MODE=1` + kill support in driver):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-story:resume
```

### 12. "I want to run the develop-task smoke test"

The smoke test exercises the full 8-step pipeline with a live model against a sandboxed git repo.

Minimum — no PR creation:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-task:smoke
```

Full — with real GitHub PR (created and cleaned up):

```bash
ANTHROPIC_API_KEY=sk-ant-... GH_TOKEN=ghp_... GH_REPO=your-handle/eval-sandbox npm run eval:develop-task:smoke
```

When `GH_TOKEN` is absent, the `prCreated` assertion is a no-op (skipped, not failed). `KEEP_SANDBOX=1` is baked in — on failure the sandbox tmpdir is preserved for investigation.

The `develop-task-smoke` job in `.github/workflows/test.yml` is `workflow_dispatch` only. Set `ANTHROPIC_API_KEY` (and optionally `GH_TOKEN` + `GH_REPO`) as repo secrets, then trigger from the Actions tab.

### 10. "An eval failed — where do I look?"

- **L1/L2/L3 failure:** node test output names the file + line.
- **L4 replay failure:** runner prints the sandbox tmpdir path. `cd` in to inspect generated artefacts vs `replay/` fixtures.
- **L4 live failure:** runner keeps the sandbox + prints the agent transcript path. Live tracker issues are still cleaned up.

---

## Token sources

| Token | URL |
| --- | --- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `GH_TOKEN` (fine-grained) | https://github.com/settings/personal-access-tokens/new |
| `JIRA_TOKEN` | https://id.atlassian.com/manage-profile/security/api-tokens |

SSH git auth is independent — `git push/clone` uses SSH, but `gh` cli and the GitHub API need a token.

### Safer than plaintext in `~/.zshrc`

```bash
# 1Password cli:
export ANTHROPIC_API_KEY="$(op read 'op://Personal/anthropic/key')"

# macOS keychain:
security add-generic-password -a "$USER" -s anthropic-api-key -w 'sk-ant-…'
export ANTHROPIC_API_KEY="$(security find-generic-password -a "$USER" -s anthropic-api-key -w)"
```

---

## Reference

### The four layers

| Layer | Location | What it catches | Runs via |
| --- | --- | --- | --- |
| **L1 Unit** | `skills/*/tests/*.test.js` | Pure helpers — filename regex, id allocators, sprint-status merges, template-section detection | `npm run test:node` |
| **L2 Golden fixture** | embedded in L1 | Template substitution + sprint-status merge against known inputs | `npm run test:node` |
| **L3 Protocol checker** | `tests/skill-protocol.test.js`, `evals/develop-task/protocol/` | SKILL.md ↔ template ↔ sub-skill drift; HALT/STOP terminator presence; mandatory-section counts; pipeline shape and step contracts | `npm run test:node` |
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
npm test                         # platform resolver + L1 + L2 + L3 + L4 replay
npm run test:node                 # L1 + L2 + L3 + assertion + driver tests (incl. develop-task + develop-story protocol)
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
