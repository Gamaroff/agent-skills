# Wireframe → component mapping

The procedure every skill follows when a story or task carries a ` ```wireloom ` block and the
project has configured its components. It links each wireframe node to the component that draws it,
asks a person about the links the project has not confirmed yet, and remembers the answers.

**Off unless configured.** Everything here applies only when `skills-config.yaml` has a `ui:` block
naming `wireframeMap` ([configuration reference](../../docs/reference/configuration.md#ui--wireframes-and-components)).
Without one, skip this procedure entirely and say nothing about it.

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

Read `reason` from every call. `unset` means the feature is off: stop here. From `ensure`, a file
reported `created` or `updated` is a change to commit with the work item, and `unreadable` is a file
left alone that a person should look at: log both, and never halt on them.

## The procedure

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
or `layout: true` for a node that draws nothing) and `unresolved[]` (each with `candidates[]` from
map rows that nearly matched).

### 4. Propose an answer for each open node

For each `unresolved` node, work out the likeliest component before asking anyone:

1. **The design source**, when there is one: find the node's element in it, and read the element's
   class, modifier classes and icon reference. A modifier usually picks the variant; the icon
   reference is the real icon name the glyph stands for.
2. **The catalogue** (`ui.componentCatalogue`): the components whose purpose fits that element.
3. **The candidates** the engine returned.

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

## Where each skill runs it

| Skill                              | When                                 | People present                                                                                                            |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `create-story`, `create-task`      | after the wireframe is embedded      | yes — the author answers                                                                                                  |
| `develop-story`, `develop-task`    | Phase 0 (`0c-wire` resolves, 0d asks); `ensure` and the writes at the start of Step 2, once the branch and lock exist | unless `--defaults`                                                                                                       |
| `review-story`, `review-task`      | as a review axis                     | a node with no table row is an **Important** finding                                                                      |
| `qa-story`, `qa-task`, `review-pr` | conformance                          | each mapped component is imported from `ui.componentImport`; each flagged assumption is checked against the design source |
