# Sprint Review Summary: Task 283

**Task:** Authoring and fix steps state the rules they keep missing
**PR:** [#922](https://github.com/Gamaroff/agent-skills/pull/922)
**Accepted:** 2026-11-20
**QA gate:** PASS (95/100) after six gates

## What was delivered

Four missing rules, each from one observation:

- **CHANGELOG placement (obs #30):** `review-task` checks a plan's "under `[Unreleased]`" claim against the file, and a fenced block in the Step 3 develop-loop doc HALTs when a new entry lands below the first release heading. It is held by 44 tests under bash and zsh.
- **Multi-task path (obs #34):** `create-task` documents what to do when its split step yields N tasks, backed by a renderer (`render-task-issue-body.js`) that `ensure-task-github-issue` calls on its create path only.
- **Importer audit (obs #36):** `develop-bug` and `qa-fix` list the importers of a widened shared parser before shipping.
- **Wrapper trap (obs #146):** `docs/contributing/traps.md` says `command node` fails under `timeout`, `xargs` and `env` (exit 127).

## Evidence

- Full CI-parity run green; all six PR checks green on `ce81da05e`.
- Wall time within the bound: median +1.7% against a 10% limit, on the LAN server (five alternating pairs).
- Security probe on the CHANGELOG guard: 4 cases executed, none reproduced.

## Known limits and follow-up

- The wall-time figure predates the last doc/test-only commits; accepted by the owner as an override.
- Five sibling `printf | grep -c .` sites (step-0 doc ×2, `create-epic`, `ensure-task-github-issue`, `review-epic`) have the same `set -e` hazard and sit outside this task.
- The CHANGELOG guard does not see an offsetting removal, and a release cut HALTs it by design (override goes in the Decisions Log).
- Advisory T283-QA-13: message-only gaps in the HALT text.
