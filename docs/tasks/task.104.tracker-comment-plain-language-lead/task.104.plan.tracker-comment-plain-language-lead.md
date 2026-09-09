---
id: task.104.plan
title: "Implementation Plan: the plain-language lead, as an engine primitive"
type: plan
task-ref: task.104.tracker-comment-plain-language-lead.md
---

# Implementation Plan: the plain-language lead, as an engine primitive

> Requirements and success criteria: [task.104.tracker-comment-plain-language-lead.md](task.104.tracker-comment-plain-language-lead.md)

## Overview

Add a pure catalogue module keyed by the `--stage` value `tracker-comment.js` already validates, and
have the engine prepend its rendered paragraph between the marker and the caller's body. No call site
changes. The catalogue is the deliverable that matters — the engine wiring is about forty lines.

---

## Phase-by-Phase Implementation Guide

### Phase 1: `shared/resources/stakeholder-summary.md`

Follow the shape of `shared/resources/tracker-comment-contract.md`: YAML frontmatter with `name` and
`description`, then the rule, then the catalogue, then the worked examples.

**The rule, stated once:**

> A tracker comment opens with a paragraph a reader with no technical background can understand on
> its own. It answers three questions in order — **what happened**, **what that means**, **what
> happens next** — in two to four sentences, and it is followed by a `---` and then everything the
> comment used to say, unchanged.

**The writing rules** (each needs a one-line "because"):

| Rule | Because |
| :--- | :--- |
| No file paths, no command names, no branch names in the prose | They are the single strongest signal to a non-technical reader that a paragraph is not for them |
| No step numbers (`Step 5/8`) | The pipeline's internal shape is not a fact about the work |
| No score on an unexplained scale (`78/100`, `7/10`) | A number with no scale is worse than no number |
| No unexpanded acronym: `PR`, `AC`, `DoD`, `QA`, `CI`, `NFR` | Expand on first use, then use the plain phrase throughout the lead |
| No emoji | The bodies below already use them as section markers; repeating them in the lead makes it read as another heading |
| Present tense, active voice, no hedging | "This has been checked and works" not "It is believed that this may be functioning" |

**The dumb-it-down rule** — this is the part the user asked for explicitly, so give it its own
section and a worked example:

> Some facts have no non-technical equivalent. **Never omit them and never leave them raw.** State
> the *consequence* in the lead and leave the *mechanism* in the body below.
>
> ❌ Omitted: "QA found issues." *(true, useless — which issues, how bad?)*
> ❌ Raw: "Two P0 findings in the auth middleware's token refresh path."
> ✅ Consequence: "Testing found two serious problems that would affect people signing in. They are
> being fixed now, and this work is not finished until they are. The technical detail is below."

### Phase 2: `shared/resources/stakeholder-summary.js`

Pure module. Model it on the frozen-constant style already in `tracker-comment.js` (`Object.freeze`,
JSDoc block above each export explaining *why*, not *what*).

```js
/**
 * Every template must return a complete, grammatical paragraph when called with
 * `{}`. That is the path that ships first — task.104 supplies no slots at all —
 * and a template that only reads well when fully populated would go live in its
 * worst form.
 */
const LEAD_TEMPLATES = Object.freeze({
  "work-started": (s) =>
    `A developer has started work on this item${s.title ? ` — ${s.title}` : ""}. ` +
    `Nothing has changed yet in the live product; this is the point at which the ` +
    `work begins. The next update here will say what was built.`,

  "review": (s) =>
    `Before any code was written, this item's written description was checked to make ` +
    `sure it is clear, complete and possible to build${s.outcome ? ` — the result was ${s.outcome}` : ""}. ` +
    `${s.blocking ? "Some things need answering before work can start; they are listed below. " : "Nothing is blocking the work from starting. "}` +
    `The detail below is for the team doing the building.`,

  "review-story": /* same shape, "story" wording */,
  "review-task":  /* same shape, "piece of technical work" wording */,
  "review-bug":   /* "this reported problem was checked to see whether it can be fixed as written" */,

  "develop-complete": (s) =>
    `The building is finished. Everything this item asked for has been written${s.count ? ` (${s.count} separate pieces of work)` : ""}, ` +
    `and it now goes for checking. It is not yet live, and it may still change if the ` +
    `checks find problems.`,

  "in-review": (s) =>
    `The finished work has been submitted for review${s.pr ? ` (${s.pr})` : ""}. ` +
    `Other people now read it and test it before it can be added to the product. ` +
    `Expect either an approval or a list of changes.`,

  "qa-gate": (s) => /* see below */,
  "qa-cycle": (s) => /* see below */,
  "qa-fix": (s) =>
    `The problems found in testing have been fixed${s.cycle ? ` (round ${s.cycle})` : ""}. ` +
    `The work now goes back for testing again to confirm the fixes hold and that ` +
    `nothing else broke.`,

  "done": (s) =>
    `This work is finished and has been accepted. Everything it set out to do was ` +
    `checked and confirmed working, and the change is now part of the product` +
    `${s.pr ? ` (${s.pr})` : ""}. No further action is needed on this item.`,
});
```

`qa-gate` and `qa-cycle` are the two that must carry a verdict, and the verdict is the one place a
raw token would leak. Map it, do not pass it through:

```js
/**
 * The gate verdict is the single most-read fact in a QA comment and the single
 * most opaque token. PASS/CONCERNS/FAIL are internal vocabulary; a reader
 * outside the pipeline cannot tell whether CONCERNS is bad. Map to a sentence.
 */
const GATE_MEANING = Object.freeze({
  PASS: "The checks found no problems.",
  CONCERNS: "The checks found some problems that are worth knowing about but do not stop the work.",
  FAIL: "The checks found problems serious enough that the work is not finished.",
  WAIVED: "Some checks were deliberately skipped, with a reason recorded below.",
});
```

Then:

```js
const CYCLE_SUFFIX = /-\d+$/;

function renderLead(stage, slots = {}) {
  if (typeof stage !== "string" || stage === "") return null;
  const key = stage.replace(CYCLE_SUFFIX, "");   // qa-cycle-3 → qa-cycle
  const t = LEAD_TEMPLATES[key];
  return t ? t(slots) : null;
}
```

`renderLead` returns `null` rather than throwing: the caller (`tracker-comment.js`) already owns the
exit-2 decision and its error message, and a module that exits on the caller's behalf cannot be
tested without spawning a process.

### Phase 3: `shared/resources/tracker-comment.js`

**Argument parsing** — extend the existing `switch` at `L~341` (same shape as `--body-file`):

```js
case "--summary-file":
case "-S":
  opts.summaryFile = value(++i, "--summary-file");
  break;
case "--slot":
  { const kv = value(++i, "--slot");
    const eq = kv.indexOf("=");
    if (eq < 1) { output.err(`Error: --slot expects k=v, got "${kv}"`); return 2; }
    (opts.slots ||= {})[kv.slice(0, eq)] = kv.slice(eq + 1); }
  break;
```

`--slot` is repeatable and `k=v`-shaped rather than a JSON blob, because a slot value is a short
human string and a JSON argument would reintroduce the quoting problem `--body-file` exists to avoid.

**Composition** — the GitHub arm at `L656` becomes:

```js
const finalBody = lead
  ? `${marker}\n${lead}\n\n---\n\n${body}`
  : `${marker}\n${body}`;
```

The `lead ? … : …` is not dead code even though the guard makes `lead` non-null on every reachable
path: `--summary-file` may be an empty file, and an empty lead must not emit a bare `---`.

**The guard**, immediately after `--stage` validation at `L~501`:

```js
const lead = args.summaryFile
  ? readBodyFile(args.summaryFile, "--summary-file")
  : renderLead(args.stage, args.slots || {});

if (lead === null) {
  output.err(
    `Error: no plain-language summary for --stage "${args.stage || "(omitted)"}". ` +
    `Either pass a --stage with a template (${LEAD_STAGES.join(", ")}) ` +
    `or pass --summary-file with a hand-written one. ` +
    `See shared/resources/stakeholder-summary.md.`
  );
  return 2;
}
```

Naming **both** routes matters: the reader who hits this is almost always someone who omitted
`--stage` deliberately for a repeat-every-run comment, and a message that only says "missing summary"
sends them looking for a flag they have never seen.

**Jira arm** (`L764–777`): do **not** concatenate. Pass the lead through to
`jira-sync.js addComment()` as a separate argument and have `buildCommentAdf()` (`L5090–5099`) unshift
a `{ type: "paragraph", content: [{ type: "text", text: lead }] }` node plus a `{ type: "rule" }`
above the converted body. A markdown string appended into an ADF document renders as literal text.

**`--json`**: add `lead: args.summaryFile ? "summary-file" : "template"` to the success payload so a
call site can assert which route fired without parsing the body.

### Phase 4: contract, `AGENTS.md`, bundle

- `tracker-comment-contract.md`: new `## The plain-language lead` section between `## The call` and
  `## Reading reason`. State the composition order (marker, lead, rule, body) explicitly — it is the
  thing a reader will get wrong.
- `AGENTS.md`: a `## Stakeholder Summaries` section in the register of the existing Tracker Comments
  section — canonical spec, engine, TL;DR, and the one load-bearing property (*the engine renders it,
  so a call site cannot skip it*).
- `npm run bundle`, then `git status` to confirm only `references/` copies changed.

---

## Key Patterns and References

- **Frozen constants + a JSDoc that explains why**: `COMMENT_STAGES` / `CYCLE_SCOPED_STAGES` at
  `tracker-comment.js:95–112`. Match it.
- **Reading a file argument**: reuse the existing `--body-file` reader rather than a second
  `readFileSync` — it already produces the right exit-2 message shape for an unreadable path.
- **The cycle-suffix strip** already exists in
  `evals/shared/tests/transition-protocol-parity.test.mjs:72–133`, which strips a trailing `-` when
  matching `qa-cycle-{N}`. Keep the two consistent.
- **Never hand-edit `skills/*/references/`** — `npm run bundle` reverts it silently
  (`project_bundle_drift_step_docs`).
- **`command node`, never bare `node`**, in any snippet a human will paste.

## Testing Approach

New file `shared/resources/tests/stakeholder-summary.test.mjs`, `node:test` style matching
`tracker-comment.test.mjs`.

```js
import { COMMENT_STAGES } from "../tracker-comment.js";
import { LEAD_TEMPLATES, renderLead } from "../stakeholder-summary.js";

// Imported, never restated: adding a stage to COMMENT_STAGES must fail here
// until it has a lead, which is the whole enforcement.
for (const stage of COMMENT_STAGES) {
  test(`${stage} has a lead that renders with no slots`, () => {
    const lead = renderLead(stage, {});
    assert.ok(lead && lead.trim().length > 40);
  });
}

const JARGON = [/\bPR\b/, /\bAC\b/, /\bDoD\b/, /\bCI\b/, /\bNFR\b/, /\bgate\b/i,
                /\bregression\b/i, /\bcommit\b/i, /`/, /\//];
```

The `/\//` entry catches file paths and is deliberately blunt — no lead has a legitimate reason to
contain a slash, and a blunt rule that holds beats a precise one that needs maintaining.

Integration additions in `tracker-comment.test.mjs`:

- Capture stdin, assert `body.startsWith(marker)` **and** `body.includes(lead)` **and**
  `body.indexOf(lead) < body.indexOf(callerFirstLine)`.
- Jira: walk the ADF `content` array and assert `content[0].type === "paragraph"` with the lead text —
  not a string match on a serialised document.
- Guard: spawn with no `--stage`, assert exit 2 **and** that the fake transport recorded zero calls.
  Asserting only the exit code would pass on a build that posts and then exits 2.

Mutation proofs to run and record in the implementation report:

| Mutation | Test that must go red |
| :--- | :--- |
| Delete `"done"` from `LEAD_TEMPLATES` | `done has a lead that renders with no slots` |
| Change the guard's `return 2` to `return 0` | the zero-transport-calls assertion |
| Move the lead above the marker in `finalBody` | the marker-position assertion |
