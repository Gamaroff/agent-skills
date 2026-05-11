# Eval Strategy for `create-task` & `create-story`

## Context

`create-task` and `create-story` are mandatory-sequential, prompt-driven skills executed by an LLM agent. They ask the user questions, read context (git history, architecture docs, epic files, `core-config.yaml`), dispatch sub-skills (`documentation-standards-validator`, `mermaid-architect`, `execute-checklist`), and produce a directory containing a structured markdown doc + a co-located plan file, optionally creating a Jira/GitHub tracker issue (`create-task` only). Today **no automated tests exist** for either skill — regressions are caught only when a human runs the skill and notices. The goal: a layered eval suite that catches structural/protocol regressions on every push at near-zero cost, plus an opt-in full-flow smoke for behaviour that genuinely needs the LLM in the loop.

The strategy below is layered because most regressions live in deterministic glue (naming, frontmatter, citation format, sprint-status YAML merge, HALT triggers) — testing those at the LLM layer is the most expensive place to debug them.

---

## Recommended approach — 4 layers, ship L1+L2+L3 first

| Layer | Determinism | Cost | Catches |
|---|---|---|---|
| **L1 Unit** — pure helpers extracted from the skill | Deterministic | ms | filename regex, frontmatter parse, ID-uniqueness scan, source-citation regex, sprint-status YAML merge |
| **L2 Golden-fixture** — template population | Deterministic | ms | template drift; filled template == golden output for fixed JSON answers |
| **L3 Protocol checker** — static analysis of `SKILL.md` | Deterministic | sub-second | every HALT has a trigger; every sub-skill reference resolves; template placeholders match mandatory section count |
| **L4 Full-flow** — Claude Agent SDK + scripted answers | Fuzzy | ~$$ per scenario | end-to-end behaviour: did agent ask the 11 mandatory questions, halt on dup ID, emit `[Source: …]`, call tracker correctly |

Run L1+L2+L3 on every push (<30s, deterministic). Run L4 nightly + pre-release on ~6 scripted scenarios with `DRY_RUN=1`.

---

## Layer detail

### L1 / L2 — `skills/create-task/tests/` and `skills/create-story/tests/`

- **Framework**: `node:test` (no deps). Reuse pattern from `skills/sync-jira-story/tests/sync-jira-story.test.js` (704 lines, already in repo).
- **Extract deterministic logic** out of `SKILL.md` prose into `skills/create-task/scripts/lib.js` (mirroring `skills/sync-jira-story/scripts/`):
  - `validateFilename(name)` → enforces `task.{N}.{kebab-name}.md`
  - `parseFrontmatter(src)` → YAML extract
  - `assertUniqueIds(dir)` → scans existing tasks, throws on collision
  - `extractSourceCitations(md)` → finds all `[Source: doc#anchor]`
  - `populateTaskTemplate(answers)` → produces final markdown
  - `mergeSprintStatus(yaml, entry)` → appends without reordering
- **Fixtures**: `tests/fixtures/answers-happy.json`, `answers-missing-section.json`, `expected-task.<id>.md`, `expected-plan.md`, `expected-sprint-status.yaml`.
- **Example assertions**:
  - `validateFilename rejects "task.001.MyTask.md"` (capital, leading zero)
  - `populateTaskTemplate happy path matches golden byte-for-byte`
  - `assertUniqueIds HALTs when task.42 already exists`
  - `every architecture claim in golden output has [Source: doc#anchor]`
  - `mergeSprintStatus appends without reordering existing entries`

Same structure replicated for `create-story` in milestone 2.

### L3 — `tests/skill-protocol.test.js` (repo-level, both skills)

Reads `skills/create-task/SKILL.md` and `skills/create-story/SKILL.md`. Asserts:
- Every "HALT if X" clause has a decision step earlier in the protocol.
- Sub-skill names referenced (`documentation-standards-validator`, `mermaid-architect`, `execute-checklist`) exist under `skills/`.
- Mandatory section count matches template placeholders (11 for create-task; story sections per `story-template.yaml`).
- Frontmatter fields the protocol writes appear in `resources/*-template.*`.

### L4 — `evals/full-flow/` (later milestone)

- **Driver**: Claude Agent SDK (Node) running `claude` programmatically.
- **Scripted input**: hook `AskUserQuestion` (and any Bash `read`) via a `userInputProvider` that consumes `answers.jsonl` of `{matches: regex, reply: "..."}`. Assert queue is fully drained at end — catches "agent skipped a mandatory question". More robust than stdin piping because the protocol re-orders prompts.
- **Faking tracker APIs**: `DRY_RUN=1` env flag documented in `create-task`'s tracker step writes the intended request payload to `tracker-request.json` instead of calling Jira/GitHub. L4 asserts payload shape. For one nightly "real auth path" test: local `node:http` mock server on `JIRA_URL=http://localhost:PORT` with JSON fixtures under `tests/fixtures/tracker/`.
- **Fuzzy asserts**: structural, never prose equality. e.g. "Architecture Context section is non-empty AND contains ≥1 `[Source:` citation AND ≥3 bullets". Single retry on L4 to absorb LLM flakes.
- **Scenarios** (each a directory under `evals/full-flow/scenarios/`): happy-task, dup-id-halt, missing-architecture-halt, mermaid-diagram-emitted, happy-story-with-prev-story-insights, sprint-status-update.

---

## First-milestone scope (the minimum that's useful)

Ship L1+L2 for **`create-task` only**, plus L3 covering both skills. Proves out the pattern in ~1 day, catches the most common regressions, leaves L4 for later.

### Critical files to create

1. **`skills/create-task/scripts/lib.js`** — pure helpers extracted from the skill's deterministic logic. Mirrors `skills/sync-jira-story/scripts/sync-jira-story.js` shape.
2. **`skills/create-task/tests/create-task.test.js`** — L1/L2 `node:test` suite. Models on `skills/sync-jira-story/tests/sync-jira-story.test.js`.
3. **`tests/skill-protocol.test.js`** — L3 static checker, loops over both `SKILL.md`s.

### Reuse from existing repo

- Test framework: `node:test` (already used 3x in sync-jira-* skills).
- `npm test` already wired in `package.json` — extend to run new files via `node --test skills/*/tests/ tests/`.
- `npm run validate:all` (`quick_validate.py`) — keep running alongside; complementary (validates SKILL.md frontmatter structure).
- Bash test pattern in `shared/resources/resolve-platform.test.sh` — model for the `DRY_RUN` payload check.

### Later milestones

- M2: Replicate L1/L2 for `create-story` (more complex — multiple architecture-doc reads, story-template.yaml driven).
- M3: L4 full-flow harness in `evals/full-flow/runner.mjs` + 4–6 scenarios. Nightly CI.
- M4: Real tracker sandbox test (one Jira project, one GitHub repo, manual cron).

---

## CI integration

- **Every push** (extend existing GitHub Actions): `npm test` → runs `node --test`, `resolve-platform.test.sh`, `npm run validate:all`, L3 protocol checker. Target <30s.
- **Nightly** (new `evals.yml` cron): L4 full-flow scenarios with `DRY_RUN=1`. Budgeted ~$2/run. Posts summary to a tracking issue.
- **Manual / pre-release**: L4 against sandbox tracker.

---

## Pass/fail criteria summary

**Deterministic (must equal exactly)**: filename regex, frontmatter keys/values, sprint-status YAML structure, source-citation presence + format, HALT exit marker, tracker payload shape, sub-skill invocation order.

**Fuzzy (structural, never prose-equal)**: any LLM-generated prose — assert it exists, has expected sections, contains required citations or bullet counts. Optional Mermaid: assert block parses, not content.

---

## Verification (how to test the eval suite itself)

1. `npm test` from repo root — all L1/L2/L3 pass on clean main.
2. Deliberately break a helper (e.g., make `validateFilename` accept `Task.42.md`) → confirm L1 fails with a clear message.
3. Deliberately rename a sub-skill referenced in `create-task/SKILL.md` to a non-existent one → confirm L3 protocol checker fails.
4. Re-extract the golden fixture from a fresh manual `create-task` run; diff against committed fixture — should be byte-identical (proves no template drift).
5. Once L4 lands: run the happy-task scenario locally with `DRY_RUN=1`; inspect `tracker-request.json` matches fixture; rerun with one mandatory answer removed — confirm scenario fails on "queue not drained".
