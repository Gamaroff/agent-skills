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

## Contents

- [Recipes](./recipes.md) — task-oriented "I want to…" recipes
- [Token sources](./token-sources.md) — where to obtain tokens for live drivers
- [Reference](./reference.md) — four-layer architecture, drivers, scenarios, scripts

## See also

- `evals/shared/README.md` in the repo
- [Authoring skills](../authoring-skills.md)
- [Packaging](../packaging.md)
