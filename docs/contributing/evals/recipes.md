# Evals — Recipes

> **Audience:** contributors running specific eval workflows.

Task-oriented recipes. For the high-level overview see [README](./README.md); for architecture see [reference](./reference.md).

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

