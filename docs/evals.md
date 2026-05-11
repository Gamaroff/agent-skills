# Evals — Runbook

Task-oriented guide for running the eval suite. Recipes first; reference tables at the bottom.

Suite catches drift between SKILL.md prose, deterministic helpers, and end-to-end behaviour for `create-task` / `create-story`.

---

## TL;DR

```bash
npm test                         # everything hermetic — no creds needed
npm run eval:create-task:sdk     # one live scenario via Claude SDK (needs ANTHROPIC_API_KEY)
```

If `npm test` is green, every push will stay green in CI. Live drivers are opt-in.

---

## Recipes

### 1. "I just want to know if anything is broken"

```bash
npm test
```

Runs platform resolver shell tests + L1 unit + L2 fixture + L3 protocol + L4 replay (~78 tests, no network, no creds). Same gate CI runs on every push. Takes seconds.

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

Loops all create-task + create-story scenarios. Scenario 03-tracker-live is skipped unless creds are present.

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
| Agent backend (Gemini, Goose, Aider, …) | `evals/shared/drivers/<name>.mjs` (see `evals/shared/README.md#adding-a-driver-for-another-agent`) |
| Structural assertion fn | `evals/shared/assertions.mjs` + register in `runner.mjs` switch + test in `evals/shared/tests/assertions.test.mjs` |

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
| **L3 Protocol checker** | `tests/skill-protocol.test.js` | SKILL.md ↔ template ↔ sub-skill drift; HALT/STOP terminator presence; mandatory-section counts | `npm run test:node` |
| **L4 End-to-end** | `evals/create-task/`, `evals/create-story/` | End-to-end artefact shape (frontmatter, sections, citations, tracker payload, halt logs) | `npm run eval:all` |

L1–L3 + L4 replay run on every push. Live drivers (`claude-sdk`, `claude-cli`) and the live-tracker scenario are `workflow_dispatch` only.

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

Each scenario is `scenario.json` + `answers.jsonl` + `env.json` + `replay/`.

### Scripts

```bash
npm test                         # platform resolver + L1 + L2 + L3 + L4 replay
npm run test:node                # L1 + L2 + L3 + assertion + driver tests
npm run test:platform            # resolve-platform.sh tests only
npm run eval:all                 # L4: all create-task + create-story scenarios, replay
npm run eval:create-task         # L4: create-task scenario 01, replay
npm run eval:create-task:all     # L4: all create-task scenarios, replay
npm run eval:create-task:cli     # L4: create-task scenario 01, DRIVER=claude-cli
npm run eval:create-task:sdk     # L4: create-task scenario 01, DRIVER=claude-sdk
npm run eval:create-story        # L4: create-story scenario 01, replay
npm run eval:create-story:all    # L4: all create-story scenarios, replay
npm run eval:create-story:cli    # L4: create-story scenario 01, DRIVER=claude-cli
npm run eval:create-story:sdk    # L4: create-story scenario 01, DRIVER=claude-sdk
```

### Canonical sources

This doc navigates. Authoritative details live next to the code:

- `evals/shared/README.md` — runner contract, driver-adding guide, sabotage-verify workflow
- `evals/create-task/README.md` — create-task scenario coverage and how to run
- `evals/create-story/README.md` — create-story scenario coverage and how to run
- `evals/create-task/scenarios/03-tracker-live/README.md` — live tracker env contract, receipt shape, safety notes
- `evals/shared/drivers/types.mjs` — `AgentDriver` JSDoc contract
- `.github/workflows/test.yml` — CI gating
