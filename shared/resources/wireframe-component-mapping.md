# Wireframe → component mapping

The procedure every skill follows when a story or task carries a ` ```wireloom ` block and the
project has configured its components. It links each wireframe node to the component that draws it,
asks a person about the links the project has not confirmed yet, and remembers the answers.

**Off unless configured.** Everything here applies only when `skills-config.yaml` **sets
`ui.wireframeMap`** ([configuration reference](../../docs/reference/configuration.md#ui--wireframes-and-components)).
That phrase, wherever a skill gates on it, means one thing: `wireframeMap` names a map path.
`false` or `off` (any case) is a decline, not a setting. The engine's `detect` command reads the
config as one of four states:

| `state`      | What the config holds                                         | What happens                                                                                   |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `configured` | `wireframeMap` names a map path                               | Run the procedure below                                                                        |
| `declined`   | `wireframeMap: false` or `off`                                | Every skill skips silently; nobody offers setup again                                          |
| `partial`    | a `ui:` block without a map path (a catalogue only, or empty) | The authoring skills offer setup for the missing keys ([step 0](#0-set-up-authoring-skills-only)); every other skill skips silently |
| `unset`      | no `ui:` block                                                | The authoring skills offer setup ([step 0](#0-set-up-authoring-skills-only)); every other skill skips silently |

Only `create-story` and `create-task` offer setup, because only they have an author present and may
write. The develop pipelines never call `detect` or `configure`: their Phase 0 must leave the tree
clean, and a `--defaults` run has nobody to ask.

## Why a fixed table cannot do this

A Wireloom wireframe records a screen's parts and their order. It does not record which component
draws each part, and it loses information on purpose:

- a `button … primary` can be any of several button variants, because colour is not a role;
- an `icon name="…"` is one of a few generic glyphs standing for whichever icon the design used;
- parts the drawing cannot express (background art, photos, later carousel slides) are not there at
  all, and a wireframe made from a design source lists them in its _Conversion notes_.

So the same primitive maps to different components on different screens. The project's map file
holds the links people have confirmed, keyed on the node's context; the engine applies them, and the
rest are asked about.

## The engine

`wireframe-map.js` does the deterministic part. Always call it; never match nodes by eye.

```bash
# Read-only: the config's state and, for unset or partial, a proposal for each missing key.
command node .agents/skills/{skill}/references/wireframe-map.js detect --json
# The only writer of skills-config.yaml: a new ui: block, or the keys a partial one lacks.
command node .agents/skills/{skill}/references/wireframe-map.js configure \
  --barrel "{path}" --import "{module}" --catalogue "{path}" --section "{heading}" \
  --map "{path}" [--exclude "A,B"] --json
command node .agents/skills/{skill}/references/wireframe-map.js configure --decline --json
# Create a missing catalogue or map, and add catalogue rows for new exports. Never overwrites.
command node .agents/skills/{skill}/references/wireframe-map.js ensure --json
# Every node of every wireloom block in the work item: resolved by the map, or open.
command node .agents/skills/{skill}/references/wireframe-map.js resolve {work-item.md} --json
# Remember one confirmed link.
command node .agents/skills/{skill}/references/wireframe-map.js record \
  --signature "{signature}" --component "{component}" --variant "{variant}" \
  [--label "{label pattern}"] [--hint "{source class or element}"] [--notes "{why}"] \
  --by "$(git config user.name)" --json
```

> Engine source: `wireframe-map.js` (bundled into each skill that runs it as `references/wireframe-map.js`).

Read `reason` from every call. `unset` and `declined` mean the feature is off: stop here. `config-unreadable`
(exit 1) means `skills-config.yaml` exists but cannot be read: report its `error`, and never treat
the feature as off. From `ensure`, a file
reported `created` or `updated` is a change to commit with the work item, and `unreadable` is a file
left alone that a person should look at: log both, and never halt on them.

## The procedure

### 0. Set up (authoring skills only)

`create-story` and `create-task` run `detect --json` first, right after they embed a wireframe, and
branch on `state`:

- `configured`: go on to step 1.
- `declined`: skip this procedure and say nothing about it.
- `unset` or `partial`: ask **one** `AskUserQuestion` (header `Components`). The question shows each
  proposed value with its `evidence`, and on `partial` the keys already in the block (`present`),
  which are not asked about again. Options, in order:
  1. "Set up with these values" **(Recommended)**: run `configure` with the proposal's values;
  2. "Adjust": the author gives other values in "Other"; run `configure` with those;
  3. "Not now": write nothing and skip this procedure. The next wireframe asks again;
  4. "Never for this repo": run `configure --decline` and skip this procedure.

  When `detect` answers `reason: nothing-found` (no component barrel), there is nothing to set up
  with: drop the first option, and "Adjust" needs at least the barrel and the map from the author.

Pass `--import` only when the proposal's `componentImport.value` is not `null`; when it is, say so
in the question, because the qa skills check imports against it. After `configure` answers `ok`, go
on to step 1. Read its `reason`:

| `reason`       | Meaning                                                              | Do this                                                                 |
| -------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ok`           | the block was written and read back                                  | continue; `skills-config.yaml` is a change to commit with the work item |
| `exists`       | the file changed since `detect`, or `key` already holds another value | re-run `detect` once; if `configure` refuses again, report `key` and skip |
| `write-failed` | the file did not read back as written and was restored               | report it and skip; nothing changed                                     |
| `usage` (exit 2) | a value the file cannot hold — a line break, a `"`, a `\` or another control character — a `--map` of `false` or `off` (that is `--decline`), or no `--map`/`--barrel`; the error names the flag | nothing was written; ask for that value again ("Adjust"), or skip |

### 1. Ensure

Run `ensure` first, every time. A consumer that has never run this gets its catalogue (one row per
component its barrel exports) and an empty map without anyone writing them. The develop pipelines
are the one exception to "first": their Phase 0 runs before the branch exists and must leave the
tree clean, so they `resolve` there (a missing map reads as no confirmed links) and run `ensure`, with the
answers' writes, at the start of Step 2 once the branch and lock exist. Log what it reports in
the work item's Decisions Log, or in the authoring skill's summary.

### 2. Use the source's own wireframe

When the screen was designed elsewhere and the wireframe skill made a wireframe document from that
design (`<stem>.wireframe.md` beside the design file — `wireframe.js status <source>` answers
`fresh`), **copy its blocks verbatim and link the file** instead of drawing from a brief. Its
_Conversion notes_ say what the drawing leaves out; a fresh drawing loses them. Draw from a brief
only when no such document exists.

### 3. Resolve

Run `resolve` on the work item. It returns `resolved[]` (each with its `component` and `variant`,
or `layout: true` for a node that draws nothing) and `unresolved[]`, each with `candidates[]`. Every
candidate carries a `source`:

- `map`: a map row that nearly matched, with `from` set to its signature. These come first. They
  are kept only when their Component names a catalogued component exactly.
- `catalogue`: up to five catalogue entries not already offered, with `from: "catalogue"` and a
  `basis`. `name` means a PascalCase segment of the name equals the primitive (`button` →
  `Button`, `IconButton`, `ButtonGroup`). `purpose` means the row's other cells hold the primitive
  as a whole word. On an empty map these are the only candidates a first run has.

`catalogueState` says whether the catalogue was read: `ok` means it was, so the filter ran and
catalogue candidates are offered. `no-section` means the catalogue has no `ui.catalogueSection`
heading, so nothing was filtered and no catalogue candidates are offered: say so when you offer the
candidates. `missing` and `unset` mean there is no catalogue to filter by or draw from.

### 4. Propose an answer for each open node

For each `unresolved` node, work out the likeliest component before asking anyone:

1. **The design source**, when there is one: find the node's element in it, and read the element's
   class, modifier classes and icon reference. A modifier usually picks the variant; the icon
   reference is the real icon name the glyph stands for.
2. **The catalogue** (`ui.componentCatalogue`): the components whose purpose fits that element.
3. **The candidates** the engine returned: `source: map` ones first. A `source: catalogue`
   candidate with `basis: name` is a hint about the name, not a role: a `text` node is offered
   `TextField`, because `Text` is one of its segments, and a text field is an input. Check each
   against the design source before proposing it.

Group nodes that share a signature and label pattern: one answer settles all of them.

### 5. Ask, or assume and flag

**A person is present** (an authoring skill, or a develop run without `--defaults`): ask with
`AskUserQuestion`, at most four questions per call. Each question names the node — its line, its
signature and its label — and what the design source shows. Options, in order:

1. the proposed component and variant **(Recommended)**;
2. up to two other candidates;
3. "Build a new component" — the node needs one, so the work item gains that work;
4. "Not a component" — the node only lays its children out (records `(layout)`).

"Other" is always available for a free answer.

**Nobody is present** (`--defaults`, or an unattended loop): take the Recommended proposal for every
open node. Do not record it in the map: an assumption is not a confirmation. Log each one in the
Decisions Log as `Wireframe mapping assumed: {signature} "{label}" → {component} {variant} —
{evidence}`, all of them under one `### Wireframe mapping assumptions` heading there, where QA
checks each one. It is a Decisions Log subsection, not a report section of its own: the report's
sections are fixed by `implementation-report-template.md`.

### 6. Record

- **In the work item:** the component table in its Dev Notes (the project's own conventions name
  the heading and columns; when they do not, use `Wireframe node | Component | Variant / props |
Decision | Why`). Every node and every part the _Conversion notes_ list as dropped gets a row.
- **In the map:** one `record` call per confirmed answer, with the narrowest signature that is
  still true of the other nodes it should cover. Prefer `parent>primitive[flag]` over a bare
  primitive, and add a label pattern only when the label is what decides it. Copy the signature
  exactly as `resolve` prints it. An attribute value there is percent-encoded except for letters,
  digits, `- _ . ! ~ * ' ( )` and `/ : # @ + =` (`value=1%2C500`), and the map reads it back
  decoded. A value written by hand needs encoding only for `,`, `}`, a `%` followed by two hex
  digits, or whitespace at its end.

## Writing map rows by hand

The map is meant to be edited. A row written by hand works exactly like one `record` wrote, so long
as it follows the rules below. Worked examples, in the map's own columns:

| Signature                | Label                            | Component  | Variant / props             | Source hint        | Notes                                                                 | Confirmed            |
| ------------------------ | -------------------------------- | ---------- | --------------------------- | ------------------ | --------------------------------------------------------------------- | -------------------- |
| `footer>button[primary]` |                                  | `Button`   | `variant="accent"`          | `.btn--accent`     | A footer call to action is the accent variant                         | 2026-10-29, A. Author |
| `row>text[bold]`         | `/^(Wallet\|Settings\|Profile)$/` | `PageTitle` |                             | `.page-title`      | Bold text in a row is a title only beside a back button; the label narrows it | 2026-10-29, A. Author |
| `*>icon{name=leader}`    |                                  | `Icon`     | name from the design source | `use href="#bell"` | One glyph stands for several icons: record the component only        | 2026-10-29, A. Author |
| `*>row`                  |                                  | `(layout)` |                             |                    | Lays out its children and draws nothing                               | 2026-10-29, A. Author |

- **Use the narrowest signature that is still true.** A parent and a flag beat a bare primitive:
  `footer>button[primary]` says more than `button`. Each flag, attribute, parent or label a row
  adds makes it win over a broader row, so a broad row is a safe default and a narrow row overrides
  it where it applies.
- **A signature cannot see a sibling.** It describes a node and its parent only. When what decides
  the component is a sibling (`row>text[bold]` is a page title only beside a `backbutton`), the
  signature cannot say so. Use a label pattern that names the labels it applies to, as the second
  row does, or leave the node unmapped so that it is asked about each time.
- **An icon glyph is not an icon name.** Wireloom has a few generic glyphs for the many icons a
  design uses, so one glyph stands for several icons. Record the component (`Icon`), and read the
  icon name from the design source when the screen is built. Never record one icon name for a
  glyph: it would be wrong for every other icon drawn with it.
- **Copy signatures as `resolve` prints them.** Attribute values are percent-encoded; the rules for
  a value written by hand are in [step 6](#6-record).
- **A catalogue candidate is a hint.** `resolve` offers catalogue entries by name and purpose
  ([step 3](#3-resolve)). A `basis: name` candidate shares a word with the primitive and may still
  be the wrong kind of component (`text` → `TextField`). A row records what the node is, so confirm
  it against the design source first.

## Where each skill runs it

| Skill                              | When                                 | People present                                                                                                            |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `create-story`, `create-task`      | after the wireframe is embedded; `detect` first, offering setup on `unset` or `partial` ([step 0](#0-set-up-authoring-skills-only)) | yes — the author answers                                                                                                  |
| `develop-story`, `develop-task`    | Phase 0 (`0c-wire` resolves, 0d asks); `ensure` and the writes at the start of Step 2, once the branch and lock exist | unless `--defaults`                                                                                                       |
| `review-story`, `review-task`      | as a review axis                     | a node with no table row is an **Important** finding                                                                      |
| `qa-story`, `qa-task`, `review-pr` | conformance                          | each mapped component is imported from `ui.componentImport`; each flagged assumption is checked against the design source |
