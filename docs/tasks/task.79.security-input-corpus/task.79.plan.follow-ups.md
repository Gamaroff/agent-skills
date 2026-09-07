---
name: task.79.plan.follow-ups
description: Handover for the two non-blocking follow-ups left by task.79 — executing the three corpus claims that are currently cited rather than measured, and adding an isFile() guard to the derived BUNDLED_REFS list. Written to be actioned from a cold start.
type: plan
status: ready-for-development
created: 2026-09-07
updated: 2026-09-07
parent: task.79.security-input-corpus
---

# Task 79 — follow-up handover

**Written for a fresh context.** Everything needed to start is below; you should not have to read
the task.79 QA reports unless you want the history.

**Baseline**: `develop` at `679c50d3` or later. Both follow-ups are non-blocking — task.79 is
`accepted` and merged (PR #332). Nothing is broken. These are two known-imperfect edges, recorded
deliberately rather than papered over.

---

## Context in one paragraph

Task 79 shipped `shared/resources/security-input-corpus.{md,mjs}` — 73 adversarial input cases across
five sinks (`url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`). Each case carries
`input`, `why` it is dangerous, and `correct` — what a right implementation does to it. **The
`correct` field is the point**: it is what lets a probe engine compute a verdict instead of asking an
agent to judge one. `task.80` is the engine that will consume this corpus as an oracle, so the
accuracy of `why`/`correct` is load-bearing, not decorative.

Read `shared/resources/security-input-corpus.md` first — the "What a sink is" and "The method
ordering" sections are short and they frame both follow-ups.

---

## Follow-up 1 — three claims are cited, not measured

**Why this matters.** The corpus's own method ordering ranks *execute the property against a hostile
input* first and *grep* last, on the grounds that presence is what misleads. Three cases currently sit
below that bar: their `why` is sourced from documentation and reasoning rather than from a run. They
are correctly **qualified** — each names the configuration in which it holds — so nothing is stated
falsely. But a corpus that argues for execution should hold itself to it, and `task.80` will treat
these strings as an oracle.

Each was flagged in QA cycle 2 at `confidence: medium` precisely because this environment could not
reproduce them: no template engine and no Windows codepage were available.

### 1a. `template-render.mustache-interpolation` — `shared/resources/security-input-corpus.mjs:642`

- **Input**: `{{constructor.constructor('return process')()}}`
- **Claim to test**: that this executes in an *expression-evaluating* renderer (Angular, Vue,
  Jinja-style) but renders **empty** in logic-less Mustache and Handlebars, which resolve `{{a.b}}`
  as a lookup path.
- **How to settle it**: install `handlebars` and `mustache` in a scratch directory (NOT as repo
  dependencies — this repo has no production deps and should keep none), compile a template with the
  payload as *data* and again as *template source*, and record what each renders.
- **Then**: if the claim holds, replace the citation with the measured result. If Handlebars turns
  out to evaluate it, the case's `id` is wrong and it should be renamed to the family it actually
  exploits.

### 1b. `sql-orm.homoglyph-quote` — `shared/resources/security-input-corpus.mjs:216`

- **Input**: `＇` (U+FF07 FULLWIDTH APOSTROPHE)
- **Claim to test**: that Windows **best-fit codepage mapping** folds it to U+0027, while Node's
  latin1 conversion yields `0x07` and MySQL's `utf8mb4→latin1` substitutes `?`.
- **Already measured** (in this repo, during QA cycle 2): the Node latin1 and MySQL halves.
- **Not measured**: the best-fit mapping half — the only one that escalates the case from
  *deny-list defeated* to *injection*. It needs a Windows host or a deliberate best-fit conversion.
- **Then**: either measure it, or drop the folding sentence entirely. **The case survives without
  it** — "a character deny-list cannot enumerate Unicode, parameterisation does not need to" stands
  on its own, and is the argument that actually matters. Dropping is a legitimate outcome here, not
  a retreat.

### 1c. `template-render.attribute-breakout` — `shared/resources/security-input-corpus.mjs:626`

- **Input**: `" autofocus onfocus=alert(1) x="`
- **Claim to test**: that a full escaper encoding `"` → `&quot;` (lodash `_.escape`, `he`,
  Handlebars) neutralises this inside a **quoted** attribute, and that it breaks out only against an
  **unquoted** attribute or a `<`/`>`/`&`-only escaper.
- **How to settle it**: run the payload through `he.escape` and `lodash.escape` in a scratch
  directory, render it into both a quoted and an unquoted attribute, and record which combinations
  break out.

### Definition of done for follow-up 1

- Each of the three `why` fields either (a) states a **measured** result, with the command that
  produced it recorded in the commit message, or (b) has the unverifiable sentence removed.
- `node -e 'import("./shared/resources/security-input-corpus.mjs").then(m => process.stdout.write(m.renderCorpusTables()))'`
  run from `shared/resources` and the output pasted back into the document's `## The cases` section
  — **see the "Regenerating the document" gotcha below, it is not optional**.
- `npm run ci:fast` green.

---

## Follow-up 2 — `BUNDLED_REFS` has no type guard

**Location**: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:770-772`

```js
const bundledDir = join(repoRoot, "skills", "finalise", "references");
const BUNDLED_REFS = readdirSync(bundledDir).filter((f) =>
  existsSync(join(repoRoot, "shared", "resources", f)),
);
```

Two tests consume `BUNDLED_REFS` (`:788`, `:813`) and both `readFileSync` each entry. If the bundler
ever emits a **directory** under `skills/finalise/references/` whose name also exists under
`shared/resources/`, `readFileSync` throws `EISDIR` and the parity test fails with a message that
blames staleness rather than naming the real cause.

**Verified benign today**: 29 entries in the bundled directory, **0 subdirectories**, and 0 of the 27
matched refs is a directory on the source side. This is a robustness fix, not a live bug.

**The fix** — one line:

```js
const BUNDLED_REFS = readdirSync(bundledDir).filter(
  (f) =>
    statSync(join(bundledDir, f)).isFile() &&
    existsSync(join(repoRoot, "shared", "resources", f)),
);
```

Add `statSync` to the `node:fs` import on line 19.

### Definition of done for follow-up 2

- The guard is in place and `BUNDLED_REFS` still resolves to **27** entries (it should not shrink —
  if it does, something else is wrong).
- Mutation-prove it: `mkdir skills/finalise/references/change-log.js.d` (a directory whose name
  collides with a real source file), confirm the parity test goes red **without** the guard and stays
  green **with** it, then remove the directory. Record the proof in the commit message.

---

## How to run this

Both follow-ups are small and independent. Suggested shape:

- **One branch, one PR** — they are two edges of the same task and together are well under an hour.
  `bugfix/task.79-follow-ups` off `develop` is fine; neither is a behaviour change.
- If you prefer the full pipeline, `/create-task` them as one task rather than two — splitting a
  one-line guard into its own task document costs more than it returns.

---

## Gotchas that will bite you (all learned the hard way on task.79)

**Regenerating the corpus document.** The `## The cases` section of `security-input-corpus.md` is
**generated** — it is the verbatim output of `renderCorpusTables()`. Edit a `why` or `correct` field
and the doc-parity test goes red until you regenerate. The command must be run from
`shared/resources` (a `shared/resources/...` path inside the command would be rewritten by the
bundler):

```sh
cd shared/resources
node -e 'import("./security-input-corpus.mjs").then((m) => process.stdout.write(m.renderCorpusTables()))'
```

Paste the output over everything between `### \`url-authority\`` and the `---` that precedes
`## Using the corpus`.

**`npm run bundle` after any `shared/resources/` edit, and commit its output.** The corpus is
transitively bundled into `skills/finalise/references/` (four artefacts). `validate.yml` gates bundle
freshness in CI, but `npm run ci:fast` does **not** run the bundler — so a stale bundle passes
locally and fails in CI.

**Never edit `skills/*/references/` directly.** Those are generated; `npm run bundle` silently
reverts you. Edit `shared/resources/` sources.

**Prettier covers `shared/resources/*.mjs`.** `.prettierignore` excludes `*.md`, `*.yml`, `*.json`
and `skills/*/references/`, but not the module. `npm run ci:fast` runs `prettier --check .` before
the tests. Run `npx prettier --write` on anything you touch.

**Mutation-prove every fix, and confirm the mutation landed.** Copy the file first, make the edit,
`diff` to confirm it applied, re-run, confirm the *named* test goes red, restore, confirm green.
Procedure: `shared/resources/mutation-proving.md`. On task.79 a proof passed while the thing it
proved was still broken — because the mutation asked the easy question. Pick the mutation that
matches the real failure shape.

**The doc-parity test cannot catch a renderer bug.** It compares the document against
`renderCorpusTables()`, so a bug in the renderer makes both sides equally wrong and they compare
equal. That is why `every rendered row is a well-formed four-column table row` exists as a separate
*structural* assertion. If you change `renderInput`/`renderRow`, lean on that one.

**Explore subagents hung four times during task.79** (both `/review-pr` lenses, and two of the four
DoD agents), each time sitting at their first step for ~30 minutes. Two others in the same session
worked fine. If one stalls past ~5–10 minutes, stop it, do the check in-line, and **record that the
independent review did not run** — do not let a hung agent become a silent gap.

---

## Verification (all of it)

```bash
node --test shared/resources/tests/security-input-corpus.test.mjs        # expect 19/19
node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs     # expect 32/32
npm run bundle                                                           # must be idempotent, no warnings
npx prettier --check .
npm run ci:fast                                                          # expect 0 fail
```

---

## What NOT to do

- **Do not add a runtime dependency** to test follow-up 1. This repo has zero production deps and one
  dev dep. Use a scratch directory outside the repo.
- **Do not soften the three claims into vagueness** to make them true. Either measure them or remove
  the unmeasured sentence. A hedge that cannot be falsified is worse than a dropped claim.
- **Do not "fix" `BUNDLED_REFS` by going back to a hand-written list.** It was hand-maintained until
  QA cycle 2 and that was the defect — the bundler walks references transitively, so a hand list goes
  stale silently. Deriving it from disk is correct; it just needs the type guard.

---

## Related

- Task: [`task.79.security-input-corpus.md`](./task.79.security-input-corpus.md) (accepted, PR #332)
- DoD record: [`task.79.dod.1.security-input-corpus.md`](./task.79.dod.1.security-input-corpus.md)
- Where these were raised: [`task.79.qa.2`](./task.79.qa.2.security-input-corpus.md) (C2-5),
  [`task.79.pr-review.1`](./task.79.pr-review.1.security-input-corpus.md) (PC-1, CR-1)
- Downstream consumers: `task.80` (probe engine), `task.81` (`/review-security`), `task.82` (gate
  evidence field)
