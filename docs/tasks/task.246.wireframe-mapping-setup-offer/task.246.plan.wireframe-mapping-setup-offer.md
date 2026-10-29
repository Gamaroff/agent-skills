---
id: task.246.plan
title: "Implementation Plan: Wireframe mapping setup offer and first-run candidates"
type: plan
task-ref: task.246.wireframe-mapping-setup-offer.md
---

# Implementation Plan: Wireframe mapping setup offer and first-run candidates

> Requirements and success criteria: [task.246.wireframe-mapping-setup-offer.md](task.246.wireframe-mapping-setup-offer.md)

## Overview

All engine work is in `shared/resources/wireframe-map.js`, following its existing shape:
- each command is a pure function `(root, opts) → payload` with a `reason`;
- `runCli` maps the payload to an exit code;
- tests build a temporary project directory.

The skills change only their step 3 prose and their Allowed writes lists. Phases 1 and 2 are
independent; 3 needs 1, and 4 needs 2.

## Phase-by-Phase Implementation Guide

### Phase 1: decline state, `detect`, `configure`

**`readUiConfig` (`:107`).** Before building the return object:

```js
const off = (v) => v === false || (typeof v === "string" && v.trim().toLowerCase() === "off");
if (off(ui.wireframeMap)) return { declined: true };
```

Then guard each command right after it reads the config:
- `ensure` (`:620`), `resolve` (`:713`), `record` (`:792`):
  `if (ui && ui.declined) return { reason: "declined" };`

Do this **before** the existing `unset` checks, which read `ui.wireframeMap` and would otherwise
treat `{declined:true}` as unset. `human()` prints `wireframe mapping declined
(ui.wireframeMap: false)`.

**`detect(root)`.** It is read-only, so use no `fs.write*`, `mkdirSync` or `createMap`.

```js
function detect(root) {
  const ui = readUiConfig(root);              // may throw ConfigError → config-unreadable, as today
  if (ui && ui.declined) return { reason: "ok", state: "declined" };
  if (ui && ui.wireframeMap) return { reason: "ok", state: "configured", ui };
  const barrel = findBarrel(root);            // { path, exports: Map, evidence } | null
  if (!barrel) return { reason: "nothing-found", state: "unset", proposal: null };
  return { reason: "ok", state: "unset", proposal: {
    componentBarrel:   { value: barrel.path, evidence: barrel.evidence },
    componentImport:   importOf(root, barrel.path),     // { value|null, evidence }
    ...catalogueOf(root, barrel.exports),               // componentCatalogue + catalogueSection
    componentExclude:  { value: [], evidence: "none detected" },
    wireframeMap:      { value: "docs/architecture/wireframe-component-map.md", evidence: "default" },
  }};
}
```

`ui` holding only other keys (no `wireframeMap`) is `unset`. That is the case of a project that
wrote a catalogue but never turned mapping on.

**`findBarrel(root)`** collects candidates in this order, keeping the ones whose
`barrelExports(root, rel, []).size >= 1`:

1. the fixed list: `src/components/index.{ts,tsx,js,jsx}`, `components/index.*`,
   `src/ui/index.*`, `app/components/index.*`;
2. `packages/*/src/index.*` and `libs/*/src/index.*`, via `fs.readdirSync`, one level only.

Pick the one with the most component exports; on a tie, take the earlier position in the order
above. The evidence string reads like `"exports 99 components (src/components/index.ts)"`.
Reuse `barrelExports`; do not write a second export scanner.

**`importOf(root, barrelRel)`**:
- Walk up from the barrel's directory to `root`. The first `package.json` with a `name` that is
  not the root's own `package.json` gives `{ value: name, evidence: "package.json name" }`.
- Otherwise read `tsconfig.json` with `JSON.parse` after stripping `//` line comments; on a
  failure the value is `null`. Find a `compilerOptions.paths` key whose target, with `baseUrl`
  and the `*` removed, resolves to the barrel or its directory.
- Otherwise `{ value: null, evidence: "no package name or path alias resolves to the barrel" }`.

**`catalogueOf(root, exports)`**:
- Scan `docs/**/*.md`, depth at most 4, skipping `docs/tasks`, `docs/prd` and `docs/bugs`.
- For each file, find each heading followed by a table, and count the first-column backticked
  names (the `catalogued` regex) that are keys of `exports`.
- Keep the best file and heading with a count of at least 3.
- Return `componentCatalogue` and `catalogueSection` with evidence like
  `"lists 99 of 99 exports under '## Components'"`. Otherwise use the defaults, with evidence
  `"no existing catalogue found; ensure will create it"`.

**`configure(root, opts)`.**

```js
function configure(root, opts) {
  const file = path.join(root, "skills-config.yaml");
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (before !== null && /^ui\s*:/m.test(before)) return { reason: "exists", file: "skills-config.yaml" };
  // values: refuse LINE_TERMINATOR (reuse the existing regex at :367), quote each with JSON.stringify
  const eol = before ? eolOf(before) : "\n";
  const lines = opts.decline
    ? ["ui:", "  wireframeMap: false"]
    : ["ui:", `  componentCatalogue: ${q(opts.catalogue)}`, /* … each key given … */];
  const sep = before && !before.endsWith("\n") ? eol : "";
  fs.writeFileSync(file, (before || "") + sep + lines.join(eol) + eol);
  const back = readUiConfig(root);
  if (!roundTrips(back, opts)) {
    before === null ? fs.unlinkSync(file) : fs.writeFileSync(file, before);
    return { reason: "write-failed", file: "skills-config.yaml" };
  }
  return { reason: "ok", file: "skills-config.yaml", created: before === null, declined: !!opts.decline };
}
```

- `/^ui\s*:/m` matches a top-level key only, because an indented `ui:` does not start at column 0.
- Quote values with `JSON.stringify`. Check first that `yaml-subset` reads double-quoted strings
  back verbatim (`command node -e` on a value holding `#`, `: ` and `@`); if it does not, that is
  exactly the case the read-back exists for, so add a test for it.
- `componentExclude` is written as a block list (`  componentExclude:` followed by
  `    - Name`), which `nameList` already reads.

**CLI (`:886`–`:956`).**
- `USAGE` gains `detect | configure (--decline | --barrel <p> --map <p> [--import] [--catalogue] [--section] [--exclude a,b])`.
- `parseArgs` takes the new flags.
- In `runCli`:
  - `exists` and `write-failed` exit 1;
  - `nothing-found` and `declined` exit 0;
  - `configure` without `--decline` and without both `--barrel` and `--map` is a `UsageError`
    (exit 2).

### Phase 2: catalogue candidates

**`catalogueEntries(text, heading)`** goes beside `catalogued` (`:494`), using the same
`sectionBounds` and row walk. It returns `{ name, text }`, where `text` is
`splitRow(line).slice(1).join(" ")`. Leave `catalogued` unchanged, since `ensure` uses it at
`:653`.

**In `resolve` (`:712`)**:
- Read the entries once, beside the existing `catalogue` read.
- Then, for an unresolved node:

```js
const segs = (name) => name.match(/[A-Z][a-z0-9]*/g) || [];
const word = (p) => new RegExp(`\\b${p}\\b`, "i");
const fromMap = nearMisses(rows, node).filter(/* existing filter */).map((c) => ({ ...c, source: "map" }));
const seen = new Set(fromMap.map((c) => c.component));
const fromCatalogue = catalogueState !== "ok" ? [] : entries
  .map((e) => segs(e.name).some((s) => s.toLowerCase() === node.primitive) ? { e, basis: "name" }
            : word(node.primitive).test(e.text) ? { e, basis: "purpose" } : null)
  .filter((x) => x && !seen.has(x.e.name))
  .sort((a, b) => (a.basis === b.basis ? 0 : a.basis === "name" ? -1 : 1))
  .slice(0, 5)
  .map(({ e, basis }) => ({ component: e.name, variant: "", from: "catalogue", source: "catalogue", basis }));
candidates: [...fromMap, ...fromCatalogue]
```

`node.primitive` is lowercase Wireloom (the `parseLine` regex captures `[A-Za-z][\w-]*`). Lowercase
it before comparing, and escape it for the `RegExp`: primitives may hold `-`.

### Phase 3: the skills

**`skills/create-story/SKILL.md:762` and `skills/create-task/SKILL.md:511`.** Replace "(only when
`skills-config.yaml` sets `ui.wireframeMap`; otherwise skip silently)" with a lead step:

> Run `command node .agents/skills/{skill}/references/wireframe-map.js detect --json` and branch on
> `state`:
> - `configured`: follow the procedure, as before;
> - `declined`: skip silently;
> - `unset`: ask one `AskUserQuestion` (header `Components`). The question shows each proposed
>   value and its evidence. The options are:
>   - Set up with these values (Recommended);
>   - Adjust (the author gives values in "Other");
>   - Not now;
>   - Never for this repo.
>
>   On Set up or Adjust, run `configure` with the values, then follow the procedure. On Never, run
>   `configure --decline`. On Not now, skip. On `nothing-found`, drop the first option.
>
> Read `reason`: `exists` means a `ui:` block appeared since `detect`, so re-run `detect`.
> `write-failed` means the file was restored, so report it and skip.

Name the procedure section for the details rather than restating them in both skills.

**Allowed writes.** Add one line to each list (`create-story:50`, `create-task:88`):

> ✅ *(only in the wireframe mapping step)* the `ui:` block appended to `skills-config.yaml` by
> `configure`, and the catalogue and map files `ensure` and `record` write

**Procedure.** Rewrite `wireframe-component-mapping.md` *Off unless configured* (`:7`) as a
three-state rule:
- `unset`: only the authoring skills offer setup; every other skill skips;
- `declined`: everything skips silently;
- `configured`: run the procedure.

Add a short "### 0. Set up (authoring skills only)" step describing the offer once. Both skills
then cite it.

### Phase 4: documentation

**"Writing map rows by hand"** is a new `##` section in the procedure, after "The procedure",
before "Where each skill runs it". Worked example table, in the map's own columns:

| Signature | Label | Component | Variant / props | Source hint | Notes | Confirmed |
| --- | --- | --- | --- | --- | --- | --- |
| `footer>button[primary]` | | `Button` | `variant="accent"` | `.btn--accent` | Footer CTA is the accent variant | 2026-10-29 by A. Author |
| `row>text[bold]` | `/^(Wallet\|Settings\|Profile)$/` | `PageTitle` | | `.page-title` | Bold text in a row is a title only beside a back button; the label pattern narrows it | … |
| `*>icon{name=leader}` | | `Icon` | name from the design source | `use href="#bell"` | One glyph stands for several icons; record the component only | … |
| `*>row` | | `(layout)` | | | Lays out its children | … |

Rules, one short paragraph each:
- **Narrowest true signature.** A parent and a flag beat a bare primitive. Each flag or attribute
  added makes the row win over broader ones.
- **Sibling context cannot be expressed.** A signature sees a node and its parent only. When the
  difference lies in a sibling, use a label pattern, or leave the node unmapped so it is asked
  about each time.
- **Icon glyphs.** Wireloom has a few glyphs for many design icons. Record the component, and read
  the icon name from the design source at build time; never record one icon name for a glyph.
- **Encoding.** Copy signatures as `resolve` prints them. The by-hand rule is already stated at
  step 6; link to it rather than repeating it.

**`configuration.md` § "UI — wireframes and components" (`:337`).** Add one paragraph:
- the authoring skills offer setup;
- `wireframeMap: false` (or `off`) declines;
- a link to the guide.

Also add `false` to the key table's `ui.wireframeMap` row if the table has one; check with
`grep -n 'ui.wireframeMap' docs/reference/configuration.md`.

**`MAP_HEADER` (`:70`).** After the Component bullet, add:
- one bullet: "**Writing rows by hand** — see the guide in the project's
  `wireframe-component-mapping.md` (examples, sibling context, icons)";
- two example lines in a fenced block or as bullets: the `footer>button[primary]` row and the
  `*>row` `(layout)` row.

Keep it short: the header is read on every map open.

### Phase 5: bundle and verify

```bash
npm run bundle && npm run bundle:check
./node_modules/.bin/prettier --check shared/resources/wireframe-map.js shared/resources/tests/wireframe-map.test.mjs
command node .agents/skills/finalise/references/doc-links.js --file shared/resources/wireframe-component-mapping.md
command node .agents/skills/finalise/references/doc-links.js --file docs/reference/configuration.md
npm run ci:fast > "$SCRATCH/ci-fast.log" 2>&1; echo "ci:fast rc=$?"
```

## Key Patterns and References

- **Command shape:** `ensure` (`:619`) and `record` (`:791`) are the model: read the config,
  return a payload with `reason`, and never `process.exit` inside a command.
- **Line endings:** `eolOf` (`:293`), from CR12-4. Use it in `configure`.
- **Line terminators:** `LINE_TERMINATOR` (`:367`). Reuse it to refuse values.
- **Config errors:** `ConfigError` (`:101`) maps to `config-unreadable`. `detect` inherits it by
  calling `readUiConfig`.
- **Commit history:** the last six commits to this file (`git log --oneline -8 --
  shared/resources/wireframe-map.js`) are task 243's follow-up fixes. Each landed with a
  mutation-proven test, and this task keeps that standard.

## Testing Approach

Add the tests to `shared/resources/tests/wireframe-map.test.mjs`, reusing its existing temporary
project helper (find it with `grep -n 'mkdtemp' shared/resources/tests/wireframe-map.test.mjs`).
Each Phase 1 and 2 bullet in the task's § 8 is one test.

Mutation proofs:
1. **Decline guard:** remove it from `resolve`, and the decline test goes red.
2. **`detect` is read-only:** add a `createMap` call to it, and the snapshot test goes red.
3. **`configure` refuses an existing block:** drop the `exists` check, and the test goes red.
4. **`configure` restores on a failed read-back:** skip the restore, and the test goes red.
5. **Segment match:** switch it to a substring match, and the `Rebutton` control goes red.
6. **Candidate cap:** remove it, and the cap test goes red.
