---
name: wireloom
description: 'Author low-fidelity UI wireframes in the Wireloom DSL and render them to SVG. Use when the user asks to mock up, wireframe, sketch or draw the layout of a screen, dialog, settings page, form, dashboard, toolbar, split view or mobile list/detail flow, wants a low-fidelity or monochrome outline of a layout or a mobile prototype from a brief, wants an existing HTML screen or hi-fi mockup turned into a wireframe, asks "what would this look like?", or wants a mockup with callouts pointing at its parts. Also the wireframe step create-story and review-story call for UI stories. Writes a ```wireloom source block, checks it with the bundled renderer, and embeds a co-located SVG beside it so the picture shows on GitHub. Adapted from StardockCorp/Wireloom (MIT). Not for flowcharts, sequence, state or ER diagrams (mermaid-architect), or anything the user needs to click (write the real component).'
---

# Wireloom

> **Adapted from [StardockCorp/Wireloom](https://github.com/StardockCorp/Wireloom)**
> (`.claude/skills/wireloom.md` and `AGENTS.md`), © 2026 Brad Wardell, MIT License — full text in
> [`references/LICENSE-wireloom.txt`](references/LICENSE-wireloom.txt). **Changes were made**:
> the grammar is bundled here and brought up to v0.7.0, and the skill renders and validates
> through `scripts/wireloom.js` rather than leaving the block unrendered. The links are for the human
> reader; running this skill never requires fetching them.

Wireloom is a small indented text language for **static** UI wireframes. The `wireloom` npm package
turns a source into a monochrome, sketch-style SVG. The output reads as a mockup, not a finished
design. Use it whenever you are about to describe a UI's layout in prose: a paragraph saying "a
title bar with a search box on the left, then…" should be a wireframe instead.

## When not to use it

| The user wants | Use instead |
|---|---|
| A flowchart, sequence, class, ER or state diagram | `mermaid-architect` |
| Something they can click through, or a working form or tool | Write the real component |
| A chart of real data | A charting library in real code (`chart` is a placeholder shape) |
| A freeform concept or architecture map | Mermaid, or a whiteboard tool |

## Working from a brief

Most wireframes start from a brief, a story's acceptance criteria or a spec. The wireframe is what the
user approves **before** any UI code is written, so it has to show their screen, not a generic one:

- **Derive the structure from the brief.** Every region of the wireframe should trace back to a
  requirement. Don't reach for a stock layout (sidebar + content, card grid, standard split view)
  unless the brief calls for one. If the brief names something unusual, such as a floating
  navigation pill, a streak widget or an inline media strip, draw that.
- **Keep it low-fidelity.** Wireloom is monochrome by default; use `accent=` only where the brief
  gives colour a meaning (danger, success, a status). Use `image` placeholders, not described
  pictures, and named icons only where they carry meaning.
- **Mobile briefs get mobile structure.** Use the mobile patterns in the grammar: `navbar`, a
  `header large:` title, `tabbar`, `sheet` and `segmented`. Put primary actions where a thumb
  reaches: the `tabbar`, a `navbar` trailing slot, or a full-width button at the bottom of the
  content. Wireloom cannot fix a viewport width, so when the size matters, say so in the caption
  (for example "375 px phone").
- **Check it against the brief before handing it over.** Is every required element present? Is
  anything drawn that the brief didn't ask for? Would a primary action on a phone be a comfortable
  touch target (at least 44 × 44 px) once built?
- **Get the wireframe agreed before implementation.** When it goes into a story or task, the
  implementation work is a separate task that points back at it.

## Working from an existing UI

Sometimes the screen already exists, for example as a hi-fi HTML mockup, and the user wants its
low-fidelity outline. The source of truth is then the page, not a brief, and the rules change with
it: nothing is derived, everything is transcribed.

**1. Pick the format profile.** A profile maps one format's markup to Wireloom primitives. Match the
file against each profile's detection markers and load the one that fits before reading further:

| Profile | Detect by | Load |
|---|---|---|
| Rebirth hi-fi phone screens | `<body class="phone rbt-theme …">` and `s5-*` classes | [`references/html-formats/rbt-hifi.md`](references/html-formats/rbt-hifi.md) |

If no profile matches, use the rules below on their own, and say in the hand-over that no profile
matched. A format you will convert more than once deserves its own profile: copy the shape of an
existing one into `references/html-formats/` and add a row here.

**2. Read the body, not the file.** Skip `<head>`, `<script>`, `<style>` and inline SVG sprite sheets.
They are often most of the file and carry no layout. The profile names the format's own noise.

**3. Apply these rules while transcribing:**

- **Draw what the page shows, not what it implies.** Every element in the wireframe traces back to an
  element on the page. Add nothing. Don't upgrade a static display into a different control: a
  read-only "On" pill is a status, not a `toggle`. Borderline cases are the profile's call.
- **Drop decoration.** Leave out anything marked `aria-hidden="true"` or `alt=""`, background art,
  animation, and wrapper elements that hold no content of their own. Keep a meaningful image (an
  avatar, a brand mark) as an `avatar` or `image` placeholder.
- **Copy the text verbatim.** Use the page's own headings, labels and copy, never paraphrase or lorem
  ipsum. The one change allowed is a line break (next rule).
- **Keep it phone-width.** Wireloom does not wrap text: the window grows to its widest line. A
  long `text` line, or a `row` of several cards, turns a phone screen into a wide desktop one. Split
  copy longer than about 42 characters across consecutive `text` lines at word boundaries, and show
  a horizontal carousel as its first card plus a `text "1 of N" muted`.
- **One state per wireframe.** Draw the default visible state. Anything hidden until a tap (a sheet,
  a modal, an inactive tab pane) is a further block: the full base screen again, plus the overlay or
  the other pane. A `sheet` is clipped to its window's height, so it needs the whole base screen
  underneath it.
- **Use an untitled `window:` when the page has a top bar.** `window "Title":` draws its own title
  band. Put the title where the page has it (in the `navbar`, or as a large `text`).
- **Caption the source.** The caption or the sentence above the picture names the source file and
  its viewport width, which `<meta name="viewport">` gives you. For example: "Derived from
  `parent/app-family-settings.html`, 393 px phone".

**4. Check it against the page before handing it over.** Each visible element is either in the
wireframe or was dropped under a rule above, and nothing in the wireframe is missing from the page.
The process below still applies in full: load the grammar before writing a line, then `check`,
`render` and embed.

## Process

**1. Load the grammar.** Read [`references/grammar.md`](references/grammar.md) before writing a
line. It has the primitive tables, attribute rules, mobile patterns and parse-error fixes. Do not
write Wireloom from memory: the vocabulary is small but strict, and an unknown attribute is a parse
error.

**2. Write the source.** The rules that cause most failures:

- **One `window` root.** Start with `window:` or `window "Title":`. Annotations are siblings of
  `window` at indent 0, never children of it.
- **Indent with 2 or 4 spaces and keep the same unit for the whole file.** A tab is a parse error.
- **A line ending in `:` has children; a line without one is a leaf.**
- **Use the real primitive.** Settings use `toggle`, `checkbox` or `radio`, not `kv` rows. A file
  hierarchy uses `tree`/`node`, not nested `list`/`item`. Mobile chrome uses `navbar`, `tabbar` or
  `sheet`, not a hand-rolled `footer` + `row`. Two clusters at opposite ends of a row use a
  `spacer`.
- **`navbar` and `header` cannot both appear in a window**, and neither can `tabbar` and `footer`.
- **Add annotations only when asked** for callouts, annotations or labels. Put `id="…"` only on the
  elements a callout targets.

**3. Check it.** From the repository root:

```bash
command node .agents/skills/wireloom/scripts/wireloom.js check docs/path/to/doc.md
```

`check` parses every ```` ```wireloom ```` block in the file and reports each error at the
**file's** line number. It also accepts a raw source file whose first line is `window`, or `-` for
stdin. Fix each error and re-run until it reports `ok`. Never hand over a block that fails `check`.

**4. Render it.** For a wireframe that goes into a file in the repository (a story, task, PRD, spec,
README or design doc), render an SVG next to that document:

```bash
command node .agents/skills/wireloom/scripts/wireloom.js render docs/path/to/doc.md --out docs/path/to/doc.wireframe.svg
```

A file with several blocks gets one SVG per block: `doc.wireframe.1.svg`, `doc.wireframe.2.svg`,
and so on. `--block N` renders just one. `--theme dark` uses the dark palette.

**5. Embed it.** GitHub does not render a ```` ```wireloom ```` block, so put the picture first and
keep the source under it. The source is what a later edit changes; re-render after every edit.

````markdown
![Settings dialog wireframe](doc.wireframe.svg)

<details><summary>Wireloom source</summary>

```wireloom
window "Settings":
  …
```

</details>
````

**In a chat reply** with no document to write into, the fenced block on its own is the answer. Still
run it through `check` (pipe it to `-`) before showing it.

## The renderer: `npm install wireloom`

The `wireloom` package has no CLI; `scripts/wireloom.js` is the CLI. It finds the package in this
order, and the first match wins:

1. `WIRELOOM_MODULE`: a path to a package directory or entry file.
2. The project's own `node_modules/wireloom`.
3. A user cache at `${XDG_CACHE_HOME:-~/.cache}/agent-skills/wireloom/0.7.0`.
4. If none of those has it, the script runs `npm install wireloom@0.7.0` into that cache once,
   with no install scripts.

It **never** changes the project's `package.json` or lockfile. The first run on a machine needs
network access. To install up front, or to see which copy will be used:

```bash
command node .agents/skills/wireloom/scripts/wireloom.js ensure
```

`--no-install` (or `WIRELOOM_NO_INSTALL=1`) turns step 4 off. When the project pins a different
Wireloom version, the script uses it and reports its version. The grammar reference documents 0.7.0,
so an older copy may reject newer primitives.

**Read `reason`, not just the exit code** (`--json` puts the full result on stdout):

| `reason` | Exit | Meaning | Do this |
|---|---|---|---|
| `ok` | 0 | Every block parsed; for `render`, every SVG was written | Carry on |
| `parse-error` | 1 | One or more blocks failed, and nothing was written | Fix the reported lines, then re-run |
| `no-blocks` | 1 | No ```` ```wireloom ```` fence, and the input is not raw source | Check you passed the right file |
| `unavailable` | 1 | The package could not be found or installed; `error` says why | Report it. Do not hand over an unchecked block as if it had been checked |
| `usage` | 2 | The invocation was wrong | Fix the command |

## Delegating to a subagent

Agents fall back to prose or ASCII art unless told otherwise. When a subagent is to sketch a UI, say
so explicitly:

> "Emit a ```` ```wireloom ```` fenced block following `.agents/skills/wireloom/references/grammar.md`,
> and run it through `.agents/skills/wireloom/scripts/wireloom.js check` until it reports `ok`.
> Do not describe the layout in prose, draw it in ASCII art, or use Mermaid for it."
