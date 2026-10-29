#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/wireframe-map.js. Regenerate via `npm run bundle`.
/**
 * wireframe-map — link a work item's Wireloom wireframe nodes to the project's own UI components.
 *
 * A Wireloom wireframe keeps a screen's parts and their order. It does not keep which component
 * draws each part: a `button` may be any of several button variants, an `icon name="…"` stands for
 * whichever real icon the design used, and parts the drawing leaves out are not there at all. So a
 * fixed primitive-to-component table cannot work. This engine does the deterministic half: it lists
 * every node, matches each against the project's map of links already confirmed by a person, and
 * says which nodes are still open. The skill then asks about the open ones and records the answers
 * with `record`, so the next work item finds them resolved.
 *
 * Every path comes from the consumer's skills-config.yaml `ui:` block. Nothing here names a
 * project, a design system or a component library; with no `ui:` block every command answers
 * `unset` and changes nothing. `wireframeMap: false` (or `off`, any case) is a decline: every
 * command answers `declined` and changes nothing, and no skill offers setup again.
 *
 *   ui:
 *     componentCatalogue: docs/architecture/components.md   # markdown list of the components
 *     componentImport: '@scope/ui'                          # the module code must import them from
 *     componentBarrel: src/components/index.ts              # entry file whose exports are the components
 *     catalogueSection: '## Components'                     # heading the catalogue's rows sit under
 *     componentExclude: [ThemeProvider]                     # exports that are not drawn components
 *     wireframeMap: docs/architecture/wireframe-component-map.md
 *
 * Usage:
 *   wireframe-map.js detect                         [--root <dir>] [--json]
 *   wireframe-map.js configure --decline            [--root <dir>] [--json]
 *   wireframe-map.js configure --map <path> [--barrel <path>] [--import <module>]
 *                           [--catalogue <path>] [--section <heading>] [--exclude A,B]
 *                           [--root <dir>] [--json]
 *   wireframe-map.js ensure                         [--root <dir>] [--json]
 *   wireframe-map.js resolve <work-item.md>         [--root <dir>] [--json]
 *   wireframe-map.js record --signature <sig> --component <name> --by <who>
 *                           [--label <pattern>] [--variant <text>] [--hint <text>]
 *                           [--notes <text>] [--date YYYY-MM-DD] [--root <dir>] [--json]
 *
 * `detect` is read-only. It reports the config's `state` — configured | declined | partial (a `ui:`
 * key without a map path or a decline) | unset — and, for partial and unset, a `proposal`: each
 * missing `ui:` value with the evidence for it, found by reading only a fixed list of component
 * barrels, one level of `packages/*` and `libs/*`, `docs/` to depth 4, and the package.json and
 * tsconfig.json files on the barrel's path. `configure` is the only writer of skills-config.yaml:
 * it appends a `ui:` block, or inserts the keys a partial block lacks after its last line, keeps
 * every other byte, reads the file back and restores it when the read-back differs.
 *
 * `ensure` creates what is missing and never overwrites. A missing catalogue is seeded with one row
 * per component the barrel exports; an existing one gains a row only for an export it lacks, under
 * an `Added by wireframe-map` heading one level below `catalogueSection` (`###` under the default
 * `## Components`), at the end of that section. A missing map is created with its
 * header and an empty table. A file that exists but cannot be read as expected is left alone.
 *
 * Signatures. A node's signature is `parent>primitive[flag,flag]{key=value,…}`: its parent's
 * primitive, its own, its bare flags (`primary`, `muted`, `chevron`…) and its attributes
 * (`name=leader`, `kind=warning`…), each value percent-encoded outside an allow-list (`encodeValue`
 * below), so `value="1,500"` is `value=1%2C500`. A map row's signature is a pattern over that: `*` matches any
 * parent, and a row names only the flags and attributes it requires. The row's Label column, when
 * set, must match the node's quoted label: a plain string matches exactly, `/re/` is a regular
 * expression. The row with the most constraints wins; a tie goes to the earlier row.
 *
 * A row whose Component is `(layout)` resolves a node that draws nothing of its own, such as a
 * `row` that only lays its children out.
 *
 * Exit codes: 0 ok · 1 a guard tripped (the reasons below) · 2 usage error.
 *
 * `reason` vocabulary:
 *   ok            the command did what was asked (`ensure`: see `catalogue` and `map` for what)
 *   unset         no `ui:` block, or not the key this command needs; nothing was read or written
 *   declined      `ui.wireframeMap` is `false` or `off`; nothing was read or written (exit 0)
 *   nothing-found `detect`: no component barrel qualifies, so there is nothing to propose (exit 0)
 *   exists        `configure`: the map is already set or declined, a given key holds another
 *                 value, or `ui:` has a value on its own line; nothing was written (exit 1)
 *   write-failed  `configure`: the file did not read back as written and was restored (exit 1)
 *   no-blocks     `resolve`: the work item holds no ```wireloom block
 *   no-file       `resolve`: the work item does not exist
 *   unparseable   `record`: the map exists but has no table this engine can append to
 *   config-unreadable  skills-config.yaml exists and cannot be read (exit 1)
 *   usage         the invocation was wrong; always paired with exit 2
 *
 * `ensure` reports each file as created | updated | unchanged | unset | unreadable — `unreadable`
 * is a file that exists and could not be parsed. It is left exactly as it was, and the skill
 * reports it rather than halting.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parseYamlSubset } = require("./yaml-subset.js");

const MAP_HEADER = [
  "# Wireframe component map",
  "",
  "Links between Wireloom wireframe nodes and this project's UI components, each confirmed by a",
  "person. Skills that read a wireframe resolve a node from the first matching row and ask about",
  "the rest; the answers are added here. Edit rows freely: the most specific matching row wins.",
  "",
  "- **Signature** — `parent>primitive[flags]{key=value}`. `*` is any parent; name only the flags",
  "  and attributes the link depends on. Copy it as `resolve` prints it: a value is",
  "  percent-encoded except for letters, digits, `- _ . ! ~ * ' ( ) / : # @ + =` (`value=1%2C500`).",
  "- **Label** — empty for any label, a plain string to match it exactly, or `/regex/`.",
  "- **Component** — what the node is built from; `(layout)` for a node that draws nothing.",
  "- **Writing rows by hand** — examples, sibling context and icons: the guide in",
  "  `.agents/skills/create-story/references/wireframe-component-mapping.md`. Two example rows:",
  '  `footer>button[primary]` → `Button`, variant `variant="accent"`; `*>row` → `(layout)`.',
  "",
];
const MAP_COLUMNS = [
  "Signature",
  "Label",
  "Component",
  "Variant / props",
  "Source hint",
  "Notes",
  "Confirmed",
];
// One level below the configured section, so the added rows stay inside it: a heading at the
// section's own level would end the section, and the next run would not see the rows it added.
const addedHeading = (section) =>
  `${"#".repeat(headingLevel(section) + 1)} Added by wireframe-map`;
const LAYOUT = "(layout)";

class UsageError extends Error {}
// skills-config.yaml exists but cannot be read. Not `unset`: the feature may be on (CR12-2).
class ConfigError extends Error {}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG_FILE = "skills-config.yaml";

// The raw text, or null when the file is missing.
function readConfigText(root) {
  try {
    return fs.readFileSync(path.join(root, CONFIG_FILE), "utf8");
  } catch (e) {
    // Only a missing file means "no config". An unreadable one read as "feature off", and every
    // command answered `unset` for a project that had turned it on.
    if (e && e.code === "ENOENT") return null;
    throw new ConfigError(
      `${CONFIG_FILE} cannot be read: ${(e && e.message) || e}`,
    );
  }
}

// The `ui:` mapping as written, or null. An empty `ui:` reads as null here too.
const rawUiOf = (text) => {
  const cfg = parseYamlSubset(text);
  return cfg && typeof cfg.ui === "object" && cfg.ui ? cfg.ui : null;
};

// `false`, or `off` in any case: the project said no, which is not the same as never asked.
const isDecline = (v) =>
  v === false || (typeof v === "string" && v.trim().toLowerCase() === "off");

function readUiConfig(root) {
  const text = readConfigText(root);
  if (text === null) return null;
  const ui = rawUiOf(text);
  if (!ui) return null;
  if (isDecline(ui.wireframeMap)) return { declined: true };
  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    componentCatalogue: str(ui.componentCatalogue),
    componentImport: str(ui.componentImport),
    componentBarrel: str(ui.componentBarrel),
    catalogueSection: str(ui.catalogueSection) || "## Components",
    componentExclude: nameList(ui.componentExclude),
    wireframeMap: str(ui.wireframeMap),
  };
}

// A list of names, in any of the forms a config author writes: a block list, a one-line
// `[A, B]` (which yaml-subset reads as a string) or a single name.
function nameList(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v.trim()) return [];
  const flow = /^\[(.*)\]$/.exec(v.trim());
  return (flow ? flow[1].split(",") : [v])
    .map((s) => s.trim().replace(/^(["'])(.*)\1$/, "$2"))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Wireloom blocks and nodes
// ---------------------------------------------------------------------------

// The same fence rules as the wireframe skill's extractor: only a ```wireloom (or ~~~wireloom)
// fence collects a body, and any other fence is skipped whole, so an example nested inside a
// ````markdown fence is not read as a real block.
function extractBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!open) {
      const m = /^ {0,3}(`{3,}|~{3,})\s*(\S*)/.exec(line);
      if (m)
        open = {
          fence: m[1],
          body: /^wireloom\b/.test(m[2]) ? [] : null,
          line: i + 2,
        };
      continue;
    }
    const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
    if (
      close &&
      close[1][0] === open.fence[0] &&
      close[1].length >= open.fence.length
    ) {
      if (open.body)
        blocks.push({
          index: blocks.length + 1,
          line: open.line,
          lines: open.body,
        });
      open = null;
      continue;
    }
    if (open.body) open.body.push(line);
  }
  if (open && open.body)
    blocks.push({
      index: blocks.length + 1,
      line: open.line,
      lines: open.body,
    });
  return blocks;
}

// One Wireloom line: `primitive "label" flag key=value key="v w" …` with an optional trailing `:`.
// Wireloom comments are whole lines (`listNodes` skips them), so a `#` here is content.
// The `s` flags let `.` cross U+2028/U+2029, which split no line here: without them a line holding
// one yielded no node, and a quoted attribute holding one was dropped (PARSELINE-1).
function parseLine(raw) {
  const text = raw.replace(/:\s*$/, "");
  const m = /^(\s*)([A-Za-z][\w-]*)(.*)$/s.exec(text);
  if (!m) return null;
  const node = {
    indent: m[1].length,
    primitive: m[2],
    label: null,
    flags: [],
    attrs: {},
  };
  const tokens = m[3].match(/[\w-]+="[^"]*"|"[^"]*"|\S+/g) || [];
  for (const t of tokens) {
    if (t.startsWith('"')) {
      if (node.label === null) node.label = t.slice(1, -1);
      continue;
    }
    const kv = /^([\w-]+)=(.*)$/s.exec(t);
    if (kv) node.attrs[kv[1]] = kv[2].replace(/^"(.*)"$/s, "$1");
    else if (/^[A-Za-z][\w-]*$/.test(t)) node.flags.push(t);
  }
  return node;
}

// An attribute value in a signature is percent-encoded outside an allow-list: what
// encodeURIComponent leaves alone, plus `/ : # @ + =` for readability. A value can then never
// carry the list's own separators (`,` `}`), a table cell's (`|`, a backtick), whitespace the
// reader trims, or a line terminator, so every node's signature reads back to the node.
// parsePattern decodes leniently, so a hand-written value needs encoding only for `,`, `}`, a `%`
// before two hex digits, or whitespace at its end (list items are trimmed).
const READABLE = /%(?:2F|3A|23|40|2B|3D)/g;

function encodeValue(value) {
  return encodeURIComponent(value.toWellFormed()).replace(
    READABLE,
    decodeURIComponent,
  );
}

// Lenient: a `%` that does not start a valid escape run (`72%`, written by hand) stays as it is.
function decodeValue(value) {
  return value.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch (_) {
      return run;
    }
  });
}

function signatureOf(node, parent) {
  const flags = [...node.flags].sort();
  const attrs = Object.keys(node.attrs)
    .sort()
    .map((k) => `${k}=${encodeValue(node.attrs[k])}`);
  return (
    `${parent || "*"}>${node.primitive}` +
    (flags.length ? `[${flags.join(",")}]` : "") +
    (attrs.length ? `{${attrs.join(",")}}` : "")
  );
}

// Every node of every block, each with a stable path id (`b1/window/row.2/button`), its line in
// the work item, its parent's primitive and its signature.
function listNodes(blocks) {
  const nodes = [];
  for (const block of blocks) {
    const stack = [];
    const seen = new Map();
    block.lines.forEach((raw, i) => {
      if (!raw.trim() || raw.trim().startsWith("#")) return;
      const node = parseLine(raw);
      if (!node) return;
      while (stack.length && stack[stack.length - 1].indent >= node.indent)
        stack.pop();
      const parent = stack.length ? stack[stack.length - 1] : null;
      const base = parent ? parent.id : `b${block.index}`;
      const count = (seen.get(`${base}/${node.primitive}`) || 0) + 1;
      seen.set(`${base}/${node.primitive}`, count);
      node.id = `${base}/${node.primitive}${count > 1 ? `.${count}` : ""}`;
      node.line = block.line + i;
      node.parent = parent ? parent.primitive : null;
      node.signature = signatureOf(node, node.parent);
      stack.push(node);
      nodes.push(node);
    });
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Markdown tables
// ---------------------------------------------------------------------------

// The line ending a file already uses. Lines are split on CRLF or LF, so a write that joined with
// LF rewrote every line of a CRLF file to add one row (CR12-4). New files are LF.
const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

function splitRow(line) {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\" && body[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (c === "`") {
      inCode = !inCode;
      cur += c;
    } else if (c === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

const isTableLine = (l) => /^\s*\|/.test(l);
const isDivider = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
const unquote = (cell) => cell.replace(/^`(.*)`$/, "$1");
const cell = (v) => String(v || "").replace(/\|/g, "\\|");

// ---------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------

function readMap(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (l, i) =>
      isTableLine(l) &&
      /signature/i.test(splitRow(l)[0] || "") &&
      isDivider(lines[i + 1] || ""),
  );
  if (start === -1) return null;
  const head = splitRow(lines[start]).map((h) => h.toLowerCase());
  const col = (name) => head.findIndex((h) => h.startsWith(name));
  const at = {
    signature: col("signature"),
    label: col("label"),
    component: col("component"),
    variant: col("variant"),
    hint: col("source"),
    notes: col("notes"),
  };
  const rows = [];
  let end = start + 2;
  for (; end < lines.length && isTableLine(lines[end]); end++) {
    const c = splitRow(lines[end]);
    const get = (k) => (at[k] >= 0 ? unquote(c[at[k]] || "") : "");
    if (!get("signature")) continue;
    rows.push({
      signature: get("signature"),
      label: get("label"),
      component: get("component"),
      variant: get("variant"),
      hint: get("hint"),
      notes: get("notes"),
      line: end + 1,
    });
  }
  return { rows, headerLine: start, tableEnd: end, columns: head.length };
}

// ECMAScript's whole LineTerminator set. A value is one cell on one line: \r and \n split the
// row, and U+2028/U+2029 — which neither readMap nor Markdown ends a line at — stop unquote's
// `.` from crossing, so the cell reads back with its backticks and the row never matches.
const LINE_TERMINATOR = new RegExp(
  `[\\r\\n${String.fromCharCode(0x2028, 0x2029)}]`,
);

function parsePattern(sig) {
  // A signature is one table cell on one line. `record` writes it untrimmed, and the
  // flag and attribute lists below would match across a line terminator.
  if (LINE_TERMINATOR.test(sig)) return null;
  const m = /^(?:([\w*-]+)>)?([\w-]+)(?:\[([^\]]*)\])?(?:\{([^}]*)\})?$/.exec(
    sig.trim(),
  );
  if (!m) return null;
  const list = (s) =>
    (s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const attrs = {};
  for (const pair of list(m[4])) {
    const kv = /^([\w-]+)=(.*)$/.exec(pair);
    if (kv) attrs[kv[1]] = decodeValue(kv[2]);
  }
  return {
    parent: m[1] && m[1] !== "*" ? m[1] : null,
    primitive: m[2],
    // A repeated flag is one constraint: `score` counts these, and `signatureKey` compares them.
    flags: [...new Set(list(m[3]))],
    attrs,
  };
}

// What a signature means, as one string: two signatures with the same key match the same nodes
// (`v=é` and `v=%C3%A9`, `*>input` and `input`, flags in either order). null when it does not parse.
function signatureKey(sig) {
  const p = parsePattern(sig);
  if (!p) return null;
  return JSON.stringify([
    p.parent,
    p.primitive,
    [...p.flags].sort(),
    Object.entries(p.attrs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ]);
}

function labelMatches(pattern, label) {
  if (!pattern) return true;
  if (label === null) return false;
  const re = /^\/(.*)\/([a-z]*)$/.exec(pattern);
  if (re) {
    try {
      return new RegExp(re[1], re[2]).test(label);
    } catch (_) {
      return false;
    }
  }
  return pattern === label;
}

// The number of constraints a row places, or -1 when it does not match the node.
function score(row, node) {
  const p = parsePattern(row.signature);
  if (!p || p.primitive !== node.primitive) return -1;
  if (p.parent && p.parent !== node.parent) return -1;
  if (!p.flags.every((f) => node.flags.includes(f))) return -1;
  for (const [k, v] of Object.entries(p.attrs))
    if (node.attrs[k] !== v) return -1;
  if (!labelMatches(row.label, node.label)) return -1;
  return (
    1 +
    (p.parent ? 1 : 0) +
    p.flags.length +
    Object.keys(p.attrs).length +
    (row.label ? 2 : 0)
  );
}

function match(rows, node) {
  let best = null;
  let bestScore = -1;
  for (const row of rows) {
    const s = score(row, node);
    if (s > bestScore) {
      best = row;
      bestScore = s;
    }
  }
  return best;
}

// Rows for the same primitive that failed on a flag, an attribute, a parent or a label: the
// likeliest answers to offer when asking about an open node.
function nearMisses(rows, node) {
  return rows
    .filter((r) => {
      const p = parsePattern(r.signature);
      return p && p.primitive === node.primitive && score(r, node) === -1;
    })
    .map((r) => ({
      component: r.component,
      variant: r.variant,
      from: r.signature,
    }));
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

const headingLevel = (heading) =>
  (/^(#+)\s/.exec(heading.trim()) || [, "##"])[1].length;

function sectionBounds(lines, heading) {
  const start = lines.findIndex((l) => l.trim() === heading.trim());
  if (start === -1) return null;
  const level = headingLevel(heading);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const h = /^(#+)\s/.exec(lines[i]);
    if (h && h[1].length <= level) {
      end = i;
      break;
    }
  }
  return { start, end };
}

// A catalogue row's first cell: one backticked component name.
const CATALOGUE_NAME = /^`([A-Za-z][\w.]*)`$/;

// Each table row of the section whose first cell is a backticked component name: the name, and
// the row's other cells as one string, for a word match on what the component is for.
function catalogueEntries(text, heading) {
  const lines = text.split(/\r?\n/);
  const b = sectionBounds(lines, heading);
  if (!b) return null;
  const entries = [];
  for (let i = b.start; i < b.end; i++) {
    if (!isTableLine(lines[i]) || isDivider(lines[i])) continue;
    const cells = splitRow(lines[i]);
    const m = CATALOGUE_NAME.exec(cells[0] || "");
    if (m) entries.push({ name: m[1], text: cells.slice(1).join(" ") });
  }
  return entries;
}

// The component named in the first cell of each table row of the section.
function catalogued(text, heading) {
  const entries = catalogueEntries(text, heading);
  return entries && entries.map((e) => e.name);
}

// Up to five catalogue entries for an open node: those with a PascalCase name segment equal to
// the primitive (`button` → `Button`, `IconButton`, `ButtonGroup`; never `Rebutton`), then those
// whose other cells hold the primitive as a whole word. Proposals only; nothing is recorded.
const CATALOGUE_CANDIDATES = 5;

function catalogueCandidates(entries, node, seen) {
  const primitive = node.primitive.toLowerCase();
  // A primitive is `[A-Za-z][\w-]*` (parseLine), so `-` is the only character to escape.
  const word = new RegExp(`\\b${primitive.replace(/-/g, "\\-")}\\b`, "i");
  const segments = (name) => name.match(/[A-Z][a-z0-9]*/g) || [];
  const byName = [];
  const byPurpose = [];
  for (const e of entries) {
    if (seen.has(e.name)) continue;
    if (segments(e.name).some((s) => s.toLowerCase() === primitive))
      byName.push({ e, basis: "name" });
    else if (word.test(e.text)) byPurpose.push({ e, basis: "purpose" });
  }
  return [...byName, ...byPurpose]
    .slice(0, CATALOGUE_CANDIDATES)
    .map(({ e, basis }) => ({
      component: e.name,
      variant: "",
      from: "catalogue",
      source: "catalogue",
      basis,
    }));
}

function resolveModule(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((e) => base + e),
    ...["index.ts", "index.tsx", "index.js"].map((f) => path.join(base, f)),
  ];
  return (
    candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null
  );
}

// Doc comment immediately above `export function Name` / `export const Name` / `export class Name`.
function purposeOf(file, name) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (_) {
    return null;
  }
  // The body may not cross `*/`: otherwise a file's header comment is read as the component's.
  const re = new RegExp(
    `/\\*\\*((?:(?!\\*/)[\\s\\S])*?)\\*/\\s*export\\s+(?:default\\s+)?(?:function|const|class)\\s+${name}\\b`,
  );
  const m = re.exec(text);
  if (!m) return null;
  const body = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .filter((l) => l && !l.startsWith("@"))
    .join(" ");
  const first = /^(.*?[.!?])(\s|$)/.exec(body);
  return (first ? first[1] : body).slice(0, 200) || null;
}

function tierOf(root, file) {
  const parts = path.relative(root, file).split(path.sep);
  const i = parts.indexOf("components");
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  return parts.length > 1 ? parts[parts.length - 2] : "";
}

// PascalCase with at least one lowercase letter: `HStack` and `QRCode` are components, while
// `ICON_NAMES` and `URL` are constants.
const isComponentName = (name) =>
  /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

// Value exports of the barrel, followed through `export … from` and `export * from`, keeping
// PascalCase names only: types, hooks and constants are not drawn components.
function barrelExports(root, barrel, exclude) {
  const out = new Map();
  const visited = new Set();
  const walk = (file) => {
    if (!file || visited.has(file)) return;
    visited.add(file);
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (_) {
      return;
    }
    const named = /export\s*(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = named.exec(text))) {
      if (m[1]) continue;
      const target = resolveModule(file, m[3]);
      for (const raw of m[2].split(",")) {
        const item = raw.trim();
        if (!item || item.startsWith("type ")) continue;
        const name = item
          .split(/\s+as\s+/)
          .pop()
          .trim();
        if (isComponentName(name) && !out.has(name)) out.set(name, target);
      }
    }
    const star = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = star.exec(text))) walk(resolveModule(file, m[1]));
    const local =
      /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)\b/g;
    while ((m = local.exec(text)))
      if (isComponentName(m[1]) && !out.has(m[1])) out.set(m[1], file);
  };
  walk(path.resolve(root, barrel));
  for (const name of exclude) out.delete(name);
  return out;
}

function catalogueRow(root, name, file) {
  const purpose = (file && purposeOf(file, name)) || "_describe me_";
  return `| \`${name}\` | ${file ? tierOf(root, file) : ""} | ${cell(purpose)} |`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

// An empty map: its guidance and the table header. Callers check that the file is missing.
function createMap(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      ...MAP_HEADER,
      `| ${MAP_COLUMNS.join(" | ")} |`,
      `| ${MAP_COLUMNS.map(() => "---").join(" | ")} |`,
      "",
    ].join("\n"),
  );
}

function ensure(root) {
  const ui = readUiConfig(root);
  // Before the unset check, which would read a decline as a block with no keys.
  if (ui && ui.declined) return { reason: "declined" };
  const result = { reason: "ok", catalogue: "unset", map: "unset", added: [] };
  if (!ui || (!ui.componentCatalogue && !ui.wireframeMap))
    return { ...result, reason: "unset" };

  if (ui.componentCatalogue) {
    const file = path.resolve(root, ui.componentCatalogue);
    const exports = ui.componentBarrel
      ? barrelExports(root, ui.componentBarrel, ui.componentExclude)
      : new Map();
    if (!fs.existsSync(file)) {
      const rows = [...exports.keys()]
        .sort()
        .map((n) => catalogueRow(root, n, exports.get(n)));
      const text = [
        "# Component catalogue",
        "",
        `Every component exported from \`${ui.componentBarrel || "the component barrel"}\`, one row each.`,
        "Generated by a skill on first use; replace each `_describe me_` with what the component is for.",
        "",
        ui.catalogueSection,
        "",
        "| Component | Tier | Use it for |",
        "| --- | --- | --- |",
        ...rows,
        "",
      ].join("\n");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      result.catalogue = "created";
      result.added = [...exports.keys()].sort();
    } else {
      const text = fs.readFileSync(file, "utf8");
      const have = catalogued(text, ui.catalogueSection);
      if (have === null) result.catalogue = "unreadable";
      else {
        const missing = [...exports.keys()]
          .filter((n) => !have.includes(n))
          .sort();
        if (!missing.length) result.catalogue = "unchanged";
        else {
          const lines = text.split(/\r?\n/);
          const b = sectionBounds(lines, ui.catalogueSection);
          const rows = missing.map((n) =>
            catalogueRow(root, n, exports.get(n)),
          );
          const added = addedHeading(ui.catalogueSection);
          const sub = sectionBounds(lines.slice(0, b.end), added);
          let insert;
          if (sub && sub.start > b.start) {
            let at = sub.end;
            while (at > sub.start && !lines[at - 1].trim()) at--;
            insert = { at, lines: rows };
          } else {
            let at = b.end;
            while (at > b.start && !lines[at - 1].trim()) at--;
            insert = {
              at,
              lines: [
                "",
                added,
                "",
                "| Component | Tier | Use it for |",
                "| --- | --- | --- |",
                ...rows,
              ],
            };
          }
          lines.splice(insert.at, 0, ...insert.lines);
          fs.writeFileSync(file, lines.join(eolOf(text)));
          result.catalogue = "updated";
          result.added = missing;
        }
      }
    }
  }

  if (ui.wireframeMap) {
    const file = path.resolve(root, ui.wireframeMap);
    if (!fs.existsSync(file)) {
      createMap(file);
      result.map = "created";
    } else {
      result.map =
        readMap(fs.readFileSync(file, "utf8")) === null
          ? "unreadable"
          : "unchanged";
    }
  }
  return result;
}

function resolve(root, workItem) {
  const ui = readUiConfig(root);
  if (ui && ui.declined) return { reason: "declined" };
  if (!ui || !ui.wireframeMap) return { reason: "unset" };
  const file = path.resolve(root, workItem);
  if (!fs.existsSync(file)) return { reason: "no-file", workItem };
  const blocks = extractBlocks(fs.readFileSync(file, "utf8"));
  if (!blocks.length) return { reason: "no-blocks", workItem };

  const mapFile = path.resolve(root, ui.wireframeMap);
  const map = fs.existsSync(mapFile)
    ? readMap(fs.readFileSync(mapFile, "utf8"))
    : null;
  const rows = map ? map.rows : [];
  // The catalogue's names filter the candidates. A catalogue without its section is reported, not
  // read as an empty catalogue: both left the filter off, and the caller could not tell (CR12-3).
  let catalogue = null;
  let entries = [];
  let catalogueState = "unset";
  if (ui.componentCatalogue) {
    const catFile = path.resolve(root, ui.componentCatalogue);
    if (!fs.existsSync(catFile)) catalogueState = "missing";
    else {
      entries = catalogueEntries(
        fs.readFileSync(catFile, "utf8"),
        ui.catalogueSection,
      );
      catalogue = entries && entries.map((e) => e.name);
      catalogueState = entries === null ? "no-section" : "ok";
      entries = entries || [];
    }
  }
  // The component names a Component cell mentions, whole: `Button in ActionRow` names both, and
  // `ButtonGroup` names neither `Button` nor `Group` (a substring test passed it on `Button`).
  const namesIn = (component) =>
    (component.match(/[A-Za-z][\w.]*/g) || []).map((n) =>
      n.replace(/\.+$/, ""),
    );

  const resolved = [];
  const unresolved = [];
  for (const node of listNodes(blocks)) {
    const base = {
      node: node.id,
      line: node.line,
      signature: node.signature,
      label: node.label,
    };
    const row = match(rows, node);
    if (row)
      resolved.push({
        ...base,
        component: row.component,
        variant: row.variant,
        layout: row.component === LAYOUT,
        mapLine: row.line,
      });
    else {
      // Rows that nearly matched first, then the catalogue's own entries: on an empty map the
      // catalogue is the only source a first run has. Only a catalogue read whole offers any.
      const fromMap = nearMisses(rows, node)
        .filter(
          (c) =>
            c.component === LAYOUT ||
            !catalogue ||
            !catalogue.length ||
            namesIn(c.component).some((n) => catalogue.includes(n)),
        )
        .map((c) => ({ ...c, source: "map" }));
      const seen = new Set(fromMap.flatMap((c) => namesIn(c.component)));
      const fromCatalogue =
        catalogueState === "ok" ? catalogueCandidates(entries, node, seen) : [];
      unresolved.push({ ...base, candidates: [...fromMap, ...fromCatalogue] });
    }
  }
  return {
    reason: "ok",
    workItem,
    blocks: blocks.length,
    import: ui.componentImport,
    catalogue: ui.componentCatalogue,
    map: ui.wireframeMap,
    mapState: map ? "ok" : fs.existsSync(mapFile) ? "unreadable" : "missing",
    catalogueState,
    resolved,
    unresolved,
  };
}

function record(root, opts) {
  const ui = readUiConfig(root);
  if (ui && ui.declined) return { reason: "declined" };
  if (!ui || !ui.wireframeMap) return { reason: "unset" };
  if (!parsePattern(opts.signature))
    throw new UsageError(`--signature is not a signature: ${opts.signature}`);
  // Every value lands in one cell of one table line, and the row must read back as written.
  // Three rules, all checked before anything is read or written:
  //   - no line terminator in any value (LINE_TERMINATOR; parsePattern has refused one in the
  //     signature already);
  //   - no backtick in the signature or label, the two cells written inside backticks;
  //   - every other value must survive the reader itself: written as a cell with a cell after
  //     it, splitRow gives it back unchanged and the next cell is still there. An odd backtick
  //     count fails this, since splitRow stays in code mode and merges what follows. A cell of
  //     its own also goes through readMap's unquote, which strips a whole-cell backtick pair.
  //     --by and --date share the Confirmed cell, which readMap never reads, so it is not unquoted.
  //     The two are still checked for a cell after them: the row follows the map's own header
  //     order, so a hand-edited map can put a column after Confirmed.
  const ownCell = ["component", "variant", "hint", "notes"];
  const unquoted = [...ownCell, "by", "date"];
  for (const flag of ["label", ...unquoted])
    if (opts[flag] != null && LINE_TERMINATOR.test(String(opts[flag])))
      throw new UsageError(`--${flag} must be one line`);
  for (const flag of ["signature", "label"])
    if (opts[flag] && String(opts[flag]).includes("`"))
      throw new UsageError(`--${flag} may not contain a backtick`);
  for (const flag of unquoted) {
    if (opts[flag] == null) continue;
    const back = splitRow(`| ${cell(opts[flag])} | next |`);
    const read = ownCell.includes(flag) ? unquote(back[0]) : back[0];
    if (
      back.length !== 2 ||
      read !== String(opts[flag]).trim() ||
      back[1] !== "next"
    )
      throw new UsageError(
        `--${flag} would not read back from the map row: ${opts[flag]}`,
      );
  }
  const file = path.resolve(root, ui.wireframeMap);
  // Only the map: the catalogue is ensure's, which the procedure runs first (CR12-5).
  if (!fs.existsSync(file)) createMap(file);
  const text = fs.readFileSync(file, "utf8");
  const map = readMap(text);
  if (!map) return { reason: "unparseable", map: ui.wireframeMap };

  const lines = text.split(/\r?\n/);
  const confirmed = `${opts.date || new Date().toISOString().slice(0, 10)}, ${opts.by}`;
  const values = {
    signature: `\`${opts.signature}\``,
    label: opts.label ? `\`${opts.label}\`` : "",
    component: opts.component,
    variant: opts.variant || "",
    source: opts.hint || "",
    notes: opts.notes || "",
    confirmed,
  };
  const columns = splitRow(lines[map.headerLine]).map((h) => h.toLowerCase());
  const row = `| ${columns
    .map((h) => {
      const key = Object.keys(values).find((k) => h.startsWith(k));
      return cell(key ? values[key] : "");
    })
    .join(" | ")} |`;

  // The row to replace is the one that means the same thing, not the one spelled the same: a
  // hand-written `v=72%` and the node's own `v=72%25` are one value, and a second row would lose
  // the tie in match to the first.
  const key = signatureKey(opts.signature);
  const same = map.rows.find(
    (r) => signatureKey(r.signature) === key && r.label === (opts.label || ""),
  );
  if (same) {
    lines[same.line - 1] = row;
    fs.writeFileSync(file, lines.join(eolOf(text)));
    return {
      reason: "ok",
      action: "replaced",
      line: same.line,
      map: ui.wireframeMap,
    };
  }
  lines.splice(map.tableEnd, 0, row);
  fs.writeFileSync(file, lines.join(eolOf(text)));
  return {
    reason: "ok",
    action: "added",
    line: map.tableEnd + 1,
    map: ui.wireframeMap,
  };
}

// ---------------------------------------------------------------------------
// Setup: detect and configure
// ---------------------------------------------------------------------------

// The `ui:` keys, in the order configure writes them.
const UI_KEYS = [
  "componentCatalogue",
  "componentImport",
  "componentBarrel",
  "catalogueSection",
  "componentExclude",
  "wireframeMap",
];
const DEFAULT_CATALOGUE = "docs/architecture/components.md";
const DEFAULT_SECTION = "## Components";
const DEFAULT_MAP = "docs/architecture/wireframe-component-map.md";
// A top-level `ui` key. An indented `ui:` belongs to another block, and an empty `ui:` parses as
// null, so the text is what says a block is there.
const UI_KEY = /^ui\s*:/m;

// Everything detect reads, and nothing else: these barrels, one level of these workspace
// directories, and docs/ to this depth without these work-item trees.
const BARREL_FILES = [
  "src/components/index",
  "components/index",
  "src/ui/index",
  "app/components/index",
];
const BARREL_EXTS = ["ts", "tsx", "js", "jsx"];
const WORKSPACES = ["packages", "libs"];
const DOCS_DEPTH = 4;
const DOCS_SKIPPED = new Set(["tasks", "prd", "bugs"]);
const CATALOGUE_MIN = 3;

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
};
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// The keys a raw `ui:` mapping sets to a value: a non-empty string or list.
const presentKeys = (raw) =>
  raw
    ? UI_KEYS.filter((k) => {
        const v = raw[k];
        return (
          (typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length)
        );
      })
    : [];

// The barrel with the most component exports; on a tie, the earlier in the list.
function findBarrel(root) {
  const candidates = BARREL_FILES.flatMap((b) =>
    BARREL_EXTS.map((e) => `${b}.${e}`),
  );
  for (const ws of WORKSPACES) {
    let dirs = [];
    try {
      dirs = fs
        .readdirSync(path.join(root, ws), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .sort(byName);
    } catch (_) {
      continue;
    }
    for (const d of dirs)
      for (const e of BARREL_EXTS)
        candidates.push(`${ws}/${d.name}/src/index.${e}`);
  }
  let best = null;
  for (const rel of candidates) {
    if (!isFile(path.join(root, rel))) continue;
    const exports = barrelExports(root, rel, []);
    if (exports.size && (!best || exports.size > best.exports.size))
      best = { path: rel, exports };
  }
  return (
    best && {
      ...best,
      evidence: `exports ${best.exports.size} components (${best.path})`,
    }
  );
}

// A JSON file, or null. tsconfig.json allows comments, so those are stripped first.
function jsonFile(file, comments) {
  try {
    let text = fs.readFileSync(file, "utf8");
    if (comments)
      text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

// The module code imports the barrel's components from: the nearest package.json name above the
// barrel (not the repository's own), else a tsconfig.json path alias that lands on it.
function importOf(root, barrelRel) {
  const barrel = path.resolve(root, barrelRel);
  for (
    let dir = path.dirname(barrel);
    dir !== root && dir.startsWith(root + path.sep);
    dir = path.dirname(dir)
  ) {
    const pkg = jsonFile(path.join(dir, "package.json"));
    if (pkg && typeof pkg.name === "string" && pkg.name.trim())
      return {
        value: pkg.name.trim(),
        evidence: `name in ${path.relative(root, path.join(dir, "package.json"))}`,
      };
  }
  const ts = jsonFile(path.join(root, "tsconfig.json"), true);
  const options = ts && ts.compilerOptions;
  if (options && options.paths && typeof options.paths === "object") {
    const base = path.resolve(root, options.baseUrl || ".");
    const lands = [
      barrel,
      barrel.replace(/\.[jt]sx?$/, ""),
      path.dirname(barrel),
    ];
    for (const [alias, targets] of Object.entries(options.paths))
      for (const t of [].concat(targets)) {
        if (typeof t !== "string") continue;
        if (lands.includes(path.resolve(base, t.replace(/\/?\*$/, ""))))
          return {
            value: alias.replace(/\/?\*$/, ""),
            evidence: `tsconfig.json paths alias ${alias}`,
          };
      }
  }
  return {
    value: null,
    evidence: "no package name or path alias resolves to the barrel",
  };
}

// Markdown files under docs/, to DOCS_DEPTH directories below it, skipping the work-item trees.
function docsMarkdown(root) {
  const out = [];
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const e of entries.sort(byName)) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (
          depth < DOCS_DEPTH &&
          !e.name.startsWith(".") &&
          !(depth === 0 && DOCS_SKIPPED.has(e.name))
        )
          walk(rel, depth + 1);
      } else if (e.isFile() && e.name.endsWith(".md")) out.push(rel);
    }
  };
  walk("docs", 0);
  return out;
}

// The file and heading whose table lists the most of the barrel's exports, at least
// CATALOGUE_MIN of them. A heading counts only the rows before the next heading of any level, so
// the heading proposed is the one directly above the table, not a title that encloses the page.
function findCatalogue(root, exports, files) {
  let best = null;
  for (const rel of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8");
    } catch (_) {
      continue;
    }
    let heading = null;
    let names = new Set();
    const settle = () => {
      const count = [...names].filter((n) => exports.has(n)).length;
      if (heading && count >= CATALOGUE_MIN && (!best || count > best.count))
        best = { rel, heading, count };
    };
    for (const line of text.split(/\r?\n/)) {
      if (/^#{1,6}\s+\S/.test(line)) {
        settle();
        heading = line.trim();
        names = new Set();
      } else if (isTableLine(line) && !isDivider(line)) {
        const m = CATALOGUE_NAME.exec(splitRow(line)[0] || "");
        if (m) names.add(m[1]);
      }
    }
    settle();
  }
  return best;
}

// Read-only: what the config is, and for `unset` or `partial` the missing values to propose.
function detect(root) {
  const text = readConfigText(root);
  const ui = readUiConfig(root);
  if (ui && ui.declined) return { reason: "ok", state: "declined" };
  if (ui && ui.wireframeMap) return { reason: "ok", state: "configured" };
  const partial = text !== null && UI_KEY.test(text);
  const present = presentKeys(text === null ? null : rawUiOf(text));
  const has = (k) => present.includes(k);
  const head = partial ? { state: "partial", present } : { state: "unset" };

  let barrel;
  if (has("componentBarrel"))
    barrel = {
      path: ui.componentBarrel,
      exports: barrelExports(root, ui.componentBarrel, ui.componentExclude),
    };
  else {
    barrel = findBarrel(root);
    if (!barrel) return { reason: "nothing-found", ...head, proposal: null };
  }

  const proposal = {};
  if (!has("componentBarrel"))
    proposal.componentBarrel = {
      value: barrel.path,
      evidence: barrel.evidence,
    };
  if (!has("componentImport"))
    proposal.componentImport = importOf(root, barrel.path);
  if (!has("componentCatalogue") || !has("catalogueSection")) {
    const found = findCatalogue(
      root,
      barrel.exports,
      has("componentCatalogue") ? [ui.componentCatalogue] : docsMarkdown(root),
    );
    if (!has("componentCatalogue"))
      proposal.componentCatalogue = found
        ? {
            value: found.rel,
            evidence: `lists ${found.count} of ${barrel.exports.size} exports under '${found.heading}'`,
          }
        : {
            value: DEFAULT_CATALOGUE,
            evidence: "no existing catalogue found; ensure will create it",
          };
    if (!has("catalogueSection"))
      proposal.catalogueSection = found
        ? { value: found.heading, evidence: "the heading above that table" }
        : { value: DEFAULT_SECTION, evidence: "default" };
  }
  if (!has("componentExclude"))
    proposal.componentExclude = { value: [], evidence: "none detected" };
  proposal.wireframeMap = { value: DEFAULT_MAP, evidence: "default" };
  return { reason: "ok", ...head, proposal };
}

// `key: value` lines, each string quoted so `#`, `: ` and `@` read back as written.
const yamlLines = (key, value, indent) =>
  Array.isArray(value)
    ? [
        `${indent}${key}:`,
        ...value.map((v) => `${indent}  - ${JSON.stringify(v)}`),
      ]
    : [
        `${indent}${key}: ${typeof value === "string" ? JSON.stringify(value) : String(value)}`,
      ];

const sameValue = (key, a, b) =>
  key === "componentExclude"
    ? JSON.stringify(nameList(a)) === JSON.stringify(nameList(b))
    : (typeof a === "string" ? a.trim() : a) ===
      (typeof b === "string" ? b.trim() : b);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The file as written means what was asked and nothing else: every other top-level key and every
// `ui` key that was there reads back unchanged, every key written reads back as given, and the
// reader every skill uses sees the feature on (or declined).
function readsBack(root, before, written) {
  let cfg;
  let ui;
  try {
    cfg = parseYamlSubset(readConfigText(root) || "") || {};
    ui = readUiConfig(root);
  } catch (_) {
    return false;
  }
  const prev = (before !== null && parseYamlSubset(before)) || {};
  for (const k of new Set([...Object.keys(prev), ...Object.keys(cfg)]))
    if (k !== "ui" && !same(prev[k], cfg[k])) return false;
  const prevUi = prev.ui && typeof prev.ui === "object" ? prev.ui : {};
  const nowUi = cfg.ui && typeof cfg.ui === "object" ? cfg.ui : {};
  for (const k of Object.keys(prevUi))
    if (!same(prevUi[k], nowUi[k])) return false;
  for (const [k, v] of Object.entries(written))
    if (!sameValue(k, nowUi[k], v)) return false;
  return written.wireframeMap === false
    ? Boolean(ui && ui.declined)
    : Boolean(ui && ui.wireframeMap);
}

// The only writer of skills-config.yaml: a new `ui:` block, or the keys a partial one lacks.
function configure(root, opts) {
  const flags = {
    catalogue: "componentCatalogue",
    import: "componentImport",
    barrel: "componentBarrel",
    section: "catalogueSection",
    map: "wireframeMap",
  };
  for (const flag of [...Object.keys(flags), "exclude"])
    if (opts[flag] != null && LINE_TERMINATOR.test(String(opts[flag])))
      throw new UsageError(`--${flag} must be one line`);
  const given = {};
  if (opts.decline) given.wireframeMap = false;
  else
    for (const key of UI_KEYS) {
      if (key === "componentExclude") {
        const list = String(opts.exclude || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (list.length) given[key] = list;
        continue;
      }
      const flag = Object.keys(flags).find((f) => flags[f] === key);
      const v = opts[flag] == null ? "" : String(opts[flag]).trim();
      if (v) given[key] = v;
    }

  const file = path.join(root, CONFIG_FILE);
  const before = readConfigText(root);
  const out = (reason, extra) => ({ reason, file: CONFIG_FILE, ...extra });
  const raw = (before !== null && rawUiOf(before)) || {};
  if (
    !opts.decline &&
    !given.componentBarrel &&
    !presentKeys(raw).includes("componentBarrel")
  )
    throw new UsageError(
      "configure needs --barrel: the ui: block names no componentBarrel",
    );

  let text;
  let action;
  let written;
  if (before === null || !UI_KEY.test(before)) {
    const eol = before === null ? "\n" : eolOf(before);
    const block = [
      "ui:",
      ...Object.entries(given).flatMap(([k, v]) => yamlLines(k, v, "  ")),
    ];
    const sep = before && !before.endsWith("\n") ? eol : "";
    text = (before || "") + sep + block.join(eol) + eol;
    action = before === null ? "created" : "appended";
    written = given;
  } else {
    const ui = readUiConfig(root);
    if (ui && (ui.declined || ui.wireframeMap))
      return out("exists", { key: "wireframeMap" });
    // Split after each newline, so joining the pieces gives back every byte.
    const pieces = before.split(/(?<=\n)/);
    const at = pieces.findIndex((p) => /^ui\s*:/.test(p));
    const inline = pieces[at]
      .replace(/\r?\n$/, "")
      .replace(/^ui\s*:/, "")
      .replace(/(^|\s)#.*$/, "")
      .trim();
    if (inline) return out("exists", { key: "ui" });
    written = {};
    for (const [k, v] of Object.entries(given)) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) written[k] = v;
      else if (!sameValue(k, raw[k], v)) return out("exists", { key: k });
    }
    // The block ends at its last indented line before the next column-0 key. Blank lines and
    // column-0 comments inside it do not end it, and are not where it ends.
    let last = at;
    let indent = null;
    for (let j = at + 1; j < pieces.length; j++) {
      const line = pieces[j].replace(/\r?\n$/, "");
      if (!line.trim() || line.startsWith("#")) continue;
      if (!/^\s/.test(line)) break;
      last = j;
      if (indent === null) indent = /^\s*/.exec(line)[0];
    }
    const eol = eolOf(before);
    const lines = Object.entries(written).flatMap(([k, v]) =>
      yamlLines(k, v, indent || "  "),
    );
    const lead = pieces[last].endsWith("\n") ? "" : eol;
    pieces.splice(last + 1, 0, lead + lines.join(eol) + eol);
    text = pieces.join("");
    action = "inserted";
  }

  fs.writeFileSync(file, text);
  if (!readsBack(root, before, written)) {
    if (before === null) fs.rmSync(file, { force: true });
    else fs.writeFileSync(file, before);
    return out("write-failed");
  }
  return out("ok", {
    action,
    written: Object.keys(written),
    declined: Boolean(opts.decline),
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE =
  "usage: wireframe-map.js detect | configure (--decline | --map <path> [--barrel <path>] [--import <module>] [--catalogue <path>] [--section <heading>] [--exclude A,B]) | ensure | resolve <work-item.md> | record --signature <sig> --component <name> --by <who> [--label] [--variant] [--hint] [--notes] [--date] — each takes [--root <dir>] [--json]";

const CONFIGURE_VALUES = [
  "barrel",
  "import",
  "catalogue",
  "section",
  "map",
  "exclude",
];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, json: false, root: process.cwd(), positional: [] };
  const valued = new Set([
    "root",
    "signature",
    "component",
    "by",
    "label",
    "variant",
    "hint",
    "notes",
    "date",
    ...CONFIGURE_VALUES,
  ]);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--json") opts.json = true;
    else if (a === "--decline") opts.decline = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      if (!valued.has(key)) throw new UsageError(`unknown flag ${a}`);
      if (rest[i + 1] === undefined) throw new UsageError(`${a} needs a value`);
      opts[key] = rest[++i];
    } else opts.positional.push(a);
  }
  if (!["detect", "configure", "ensure", "resolve", "record"].includes(command))
    throw new UsageError(USAGE);
  if (opts.decline && command !== "configure")
    throw new UsageError("--decline is a configure flag");
  if (command === "configure") {
    const values = CONFIGURE_VALUES.filter((k) => opts[k] != null);
    if (opts.decline && values.length)
      throw new UsageError(`configure --decline takes no --${values[0]}`);
    if (!opts.decline && !opts.map)
      throw new UsageError("configure needs --map, or --decline");
  }
  if (command === "resolve" && opts.positional.length !== 1)
    throw new UsageError("resolve takes one work-item path");
  if (command === "record")
    for (const k of ["signature", "component", "by"])
      if (!opts[k]) throw new UsageError(`record needs --${k}`);
  if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date))
    throw new UsageError("--date is YYYY-MM-DD");
  return opts;
}

function runCli(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError)
      return { exitCode: 2, payload: { reason: "usage" }, error: err.message };
    throw err;
  }
  const root = path.resolve(opts.root);
  let payload;
  try {
    if (opts.command === "detect") payload = detect(root);
    else if (opts.command === "configure") payload = configure(root, opts);
    else if (opts.command === "ensure") payload = ensure(root);
    else if (opts.command === "resolve")
      payload = resolve(root, opts.positional[0]);
    else payload = record(root, opts);
  } catch (err) {
    if (err instanceof UsageError)
      return { exitCode: 2, payload: { reason: "usage" }, error: err.message };
    if (err instanceof ConfigError)
      return {
        exitCode: 1,
        payload: { reason: "config-unreadable", error: err.message },
        json: opts.json,
      };
    throw err;
  }
  // A decline and an empty detection are answers, not failures.
  const ok = ["ok", "unset", "declined", "nothing-found"].includes(
    payload.reason,
  );
  return { exitCode: ok ? 0 : 1, payload, json: opts.json };
}

function human(p) {
  if (p.state)
    return [
      `state: ${p.state}${p.present && p.present.length ? ` (set: ${p.present.join(", ")})` : ""}${p.reason === "nothing-found" ? " — no component barrel found" : ""}`,
      ...Object.entries(p.proposal || {}).map(
        ([k, v]) => `  ${k}: ${JSON.stringify(v.value)}  (${v.evidence})`,
      ),
    ].join("\n");
  if (p.file === CONFIG_FILE)
    return `${p.reason}${p.action ? `: ${p.action}` : ""}${p.key ? ` (${p.key})` : ""} — ${p.file}`;
  if (p.reason === "declined")
    return "wireframe-map: mapping declined (ui.wireframeMap: false) — nothing to do";
  if (p.reason === "unset")
    return "wireframe-map: no ui: block configured — nothing to do";
  if (p.reason === "config-unreadable") return `wireframe-map: ${p.error}`;
  if (p.resolved)
    return [
      `${p.resolved.length} node(s) resolved, ${p.unresolved.length} open (map: ${p.map})`,
      ...p.unresolved.map(
        (u) =>
          `  open  line ${u.line}  ${u.signature}${u.label ? ` "${u.label}"` : ""}`,
      ),
    ].join("\n");
  if (p.catalogue)
    return `catalogue: ${p.catalogue}${p.added.length ? ` (+${p.added.length})` : ""} · map: ${p.map}`;
  return `${p.reason}${p.action ? `: ${p.action} at line ${p.line}` : ""}`;
}

if (require.main === module) {
  const r = runCli(process.argv.slice(2));
  if (r.exitCode === 2) process.stderr.write(`wireframe-map: ${r.error}\n`);
  else
    process.stdout.write(
      (r.json ? JSON.stringify(r.payload) : human(r.payload)) + "\n",
    );
  process.exitCode = r.exitCode;
}

module.exports = {
  readUiConfig,
  extractBlocks,
  parseLine,
  listNodes,
  readMap,
  parsePattern,
  match,
  catalogued,
  catalogueEntries,
  barrelExports,
  detect,
  configure,
  ensure,
  resolve,
  record,
  runCli,
};
