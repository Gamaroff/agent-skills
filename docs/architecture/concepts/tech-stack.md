---
title: Tech stack (agent-skills)
status: draft
---

# Tech stack

> Actual runtimes, languages, and tooling in use in **this** repository. Loaded into every pipeline run.

## Runtimes

- **Node.js:** `>=22` (declared in `package.json` → `engines.node`). The test runner uses native `node --test`, which relies on glob-pattern expansion landed in Node 21+; eval scripts use `.mjs` ESM modules.
- **Python:** Python 3 (3.10+ in practice — `python3` shebangs). Used for skill packaging, bundling, validation, catalog generation. No `requirements.txt` — scripts use stdlib only (`pathlib`, `yaml`-from-pip-if-needed, `shutil`, etc.).
- **Bash:** POSIX `bash` for `shared/resources/resolve-platform.sh` and a few shell test scripts.

## Languages

- **Markdown** dominates: every `SKILL.md`, every doc, every reference under `shared/resources/`.
- **YAML** inside markdown frontmatter and inside templates (`skills/create-architecture-doc/resources/templates/*.yaml`, etc.).
- **JavaScript (CommonJS)** for skill libs that ship with skills (`skills/create-story/references/create-skills-lib.js`, etc.). `package.json` declares `"type": "commonjs"`. Eval harness uses `.mjs` ESM files explicitly.
- **Python** for build/validate/catalog tooling (`skills/create-skill/scripts/`).
- **Shell** for platform resolution and shell-level test helpers.

## Package management

- **npm** (not pnpm, not yarn) — `package-lock.json` is committed. Only one dev dependency: `@anthropic-ai/claude-agent-sdk` (used by the eval harness when `DRIVER=claude-sdk`).
- No production runtime dependencies. The skills are consumed as plain files; nothing is `npm install`-ed at consumer time.

## Distribution

- **In-tree (default — tarball install via `setup-consumer.sh`):** skills are copied verbatim from `skills/<name>/` in the tagged GitHub release tarball into a consumer's `.agents/skills/`. The bundler in `skills/create-skill/scripts/bundle_skill.py` makes each skill self-contained by copying `shared/resources/` deps into per-skill `references/` and rewriting paths.
- **Zip artefacts (legacy / alternative):** `python3 skills/create-skill/scripts/package_skill.py skills/<name>` produces `skills/<name>/<name>.zip` (gitignored — never commit). Same path rewriting as the in-tree bundler.
- **Catalog:** `python3 skills/create-skill/scripts/generate_catalog.py` regenerates `docs/reference/skill-catalog.md` from on-disk `SKILL.md` frontmatter. Run after any skill change.

## Test and eval harness

Four-layer eval suite — described in `docs/contributing/evals/README.md` and `evals/shared/README.md`. Quick map of layers in use today:

- **Unit:** per-skill `tests/*.test.js` under `node --test`. Hermetic, run in CI.
- **Fixture/protocol:** `evals/<skill>/protocol/*.test.mjs` and `evals/<skill>/scenarios/<n>-<name>/` step-isolation runs via `node evals/shared/runner.mjs <scenario>`. Hermetic in default mode.
- **Live driver modes:** opt-in. `DRIVER=claude-cli` uses the local Claude Code CLI; `DRIVER=claude-sdk` uses `@anthropic-ai/claude-agent-sdk`. Both are slower and not run in CI.

Common commands:

```bash
npm test                              # unit + platform tests + protocol tests
npm run eval:create-task              # one create-task scenario, hermetic
npm run eval:develop-story:smoke      # end-to-end develop-story dry run
npm run eval:all                      # all scenarios across skills
```

## Infrastructure and CI

- **CI:** GitHub Actions. Workflow lives at `.github/workflows/validate.yml` (badge in `README.md`). Runs `npm test` on every push to `main`.
- **Hosting:** none — this is a library repo. Consumer projects host themselves.
- **Tracker / VCS:** GitHub (`Gamaroff/agent-skills`). `project.yml` declares the GitHub project board (`Agent Skills`, board #1) for issue/PR automation in skills like `/finalise`.

## Skill-bundled assets

A handful of skills ship pre-built tooling that depends on specific external services. These are **opt-in per skill** and not part of the core tech stack:

- `use-railway/scripts/` — Python scripts that call Railway APIs.
- `mcp__*` skills — depend on MCP servers (Atlassian, Slack, Context7, Stitch, gcloud) being configured on the consumer machine.

## See also

- [Source tree](./source-tree.md) — where each of the above lives on disk
- [Coding standards](./coding-standards.md) — how to write within this stack
- [`docs/contributing/evals/README.md`](../../contributing/evals/README.md) — full eval-harness reference
