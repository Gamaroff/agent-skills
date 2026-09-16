---
name: authoring-card-preflight
description: The offline tracker-card preflight run by create-task, create-story and create-epic on the document they just wrote. Advisory at authoring; review-* remains the blocking gate. Explains why the check runs here, what its findings mean, and why the section spec must never be restated in an authoring skill.
---

# Authoring-Time Card Preflight

## The call

Run this on the document just written, **before** telling the user the skill is done:

```bash
node references/card-preflight.js --file "{document-path}"
```

`--kind` is inferred from the filename (`task.` / `story.` / `epic.` / `bug.`). Pass it explicitly
only when the file is named something the inference cannot read; a wrong kind checks the document
against the wrong spec and reports confident findings about sections it was never meant to have.

Add `--json` for `{ok, findings, blocks, scope}` when a caller needs the result rather than the
display. `scope` is the same sentence the clean display ends with — read it before reading `ok`.

## What to do with the output

**Exit code is 0 whether or not there are findings.** That is deliberate — see *Advisory* below.
Branch on the printed result, not on the exit status:

| Result | Action |
| :--- | :--- |
| `No problems found. N card blocks resolve — …` | Say nothing about it. A clean preflight is not news. **It is also not an all-clear**: the line names its own scope because it checks the handful of headings the card is built from and nothing else — `task.103` passed it and reached review with ten of eleven mandatory sections. Template completeness is the reviewer's, not this check's. |
| One or more findings | Print the tool's output verbatim, unedited, and tell the user the check is advisory. Each finding already carries its own `Fix:` line naming the exact heading to add or rename. |

Do **not** paraphrase a finding, and do **not** re-derive the fix. The `Fix:` line is generated from
the same spec the sync will use; a paraphrase is a second statement of the rule that can disagree
with the first.

## Advisory here, blocking at review

The `create-*` skills advise. The `review-*` skills gate. That split already exists across this
family and this check does not change it:

- A document is legitimately incomplete while it is being written. A gate at authoring pushes the
  author toward writing filler to satisfy it, and **filler is worse than a thin card** — a thin card
  looks like an omission, filler looks like a decision.
- `review-task` / `review-story` / `review-epic` run the same check via
  `sync-jira-*  --check-card` and raise a `missing`, `empty`, `heading-only` or `no-body` finding
  as **Critical**. That is where the document stops being allowed through.

**The finding vocabulary is `missing` / `empty` / `heading-only` / `no-body`**, and the third one is
the one a reader can miss: it means *present and useless*. A section that holds a bold label
(`**Functional**:`) or a sub-heading with nothing under it is neither missing nor empty, and before
task.117 it passed — 29 of 120 task documents (2026-09-17, measured by the corpus test
`card-preflight-corpus.test.mjs` beside the engine, which is where the figure lives) published a
bold label as their entire Success Criteria or Breaking Changes block because the summariser took
the label as the section's prose and stopped in front of the list.
The summariser now drops bold-label lines the way it drops `###` lines, so a label *with* a list
under it renders the list; a label with nothing under it is `heading-only`.

`--strict` exists for a caller that genuinely wants a non-zero exit (CI, a batch linter). No
`create-*` skill passes it.

## Why the check is here at all

The checker is free — offline, no auth, no network, no writes — and it was already running one step
*after* the moment the defect is introduced. A document filed but not yet reviewed reached CI
unchecked; that is how `task.99` shipped without a `## Success Criteria` block and was first caught
by a zero-tolerance corpus assertion on a pull request. The whole cost of catching it at authoring
is this one call.

**The failure it catches is silent by construction.** A heading the spec does not recognise does not
raise an error: the sync succeeds, reports success, and publishes a thin or empty card. Without a
preflight there is nothing for an author to notice — the document looks complete.

## Never restate the section spec in an authoring skill

The lists of required sections live in exactly one place: `CARD_SECTIONS_BY_KIND` in
`references/jira-sync.js`, beside `checkCardSections`, which consumes them. `card-preflight.js`
defines none of its own and neither may any skill.

Two definitions of "what sections a card needs" drift, and the drift is **silent in the worst
direction**: the authoring check passes a document the sync then publishes thin, which is the exact
failure the authoring check exists to prevent, reintroduced one layer earlier and harder to see.
This is the enumeration class recorded in `docs/reference/anti-patterns.md` §*Never fix N call sites
without a population check*.

If a section requirement should change, change the spec. Do not add a second opinion about it here.
