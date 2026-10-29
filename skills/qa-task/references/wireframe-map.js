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
 * `unset` and changes nothing.
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
 *   wireframe-map.js ensure                         [--root <dir>] [--json]
 *   wireframe-map.js resolve <work-item.md>         [--root <dir>] [--json]
 *   wireframe-map.js record --signature <sig> --component <name> --by <who>
 *                           [--label <pattern>] [--variant <text>] [--hint <text>]
 *                           [--notes <text>] [--date YYYY-MM-DD] [--root <dir>] [--json]
 *
 * `ensure` creates what is missing and never overwrites. A missing catalogue is seeded with one row
 * per component the barrel exports; an existing one gains a row only for an export it lacks, under
 * an `Added by wireframe-map` heading one level below `catalogueSection` (`###` under the default
 * `## Components`), at the end of that section. A missing map is created with its
 * header and an empty table. A file that exists but cannot be read as expected is left alone.
 *
 * Signatures. A node's signature is `parent>primitive[flag,flag]{key=value,…}`: its parent's
 * primitive, its own, its bare flags (`primary`, `muted`, `chevron`…) and its attributes
 * (`name=leader`, `kind=warning`…). A map row's signature is a pattern over that: `*` matches any
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
 *   no-blocks     `resolve`: the work item holds no ```wireloom block
 *   no-file       `resolve`: the work item does not exist
 *   unparseable   `record`: the map exists but has no table this engine can append to
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
  "  and attributes the link depends on.",
  "- **Label** — empty for any label, a plain string to match it exactly, or `/regex/`.",
  "- **Component** — what the node is built from; `(layout)` for a node that draws nothing.",
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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function readUiConfig(root) {
  let cfg;
  try {
    cfg = parseYamlSubset(
      fs.readFileSync(path.join(root, "skills-config.yaml"), "utf8"),
    );
  } catch (_) {
    return null;
  }
  const ui = cfg && typeof cfg.ui === "object" && cfg.ui ? cfg.ui : null;
  if (!ui) return null;
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
function parseLine(raw) {
  const text = raw.replace(/:\s*$/, "");
  const m = /^(\s*)([A-Za-z][\w-]*)(.*)$/.exec(text);
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
    const kv = /^([\w-]+)=(.*)$/.exec(t);
    if (kv) node.attrs[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
    else if (/^[A-Za-z][\w-]*$/.test(t)) node.flags.push(t);
  }
  return node;
}

function signatureOf(node, parent) {
  const flags = [...node.flags].sort();
  const attrs = Object.keys(node.attrs)
    .sort()
    .map((k) => `${k}=${node.attrs[k]}`);
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
  return { rows, tableEnd: end, columns: head.length };
}

function parsePattern(sig) {
  // A signature is one table cell on one line. `record` writes it untrimmed, and the
  // flag and attribute lists below would match across a line break, so a newline
  // anywhere would split the map row and end the table early.
  if (/[\r\n]/.test(sig)) return null;
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
    if (kv) attrs[kv[1]] = kv[2];
  }
  return {
    parent: m[1] && m[1] !== "*" ? m[1] : null,
    primitive: m[2],
    flags: list(m[3]),
    attrs,
  };
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

// The component named in the first cell of each table row of the section.
function catalogued(text, heading) {
  const lines = text.split(/\r?\n/);
  const b = sectionBounds(lines, heading);
  if (!b) return null;
  const names = [];
  for (let i = b.start; i < b.end; i++) {
    if (!isTableLine(lines[i]) || isDivider(lines[i])) continue;
    const m = /^`([A-Za-z][\w.]*)`$/.exec(splitRow(lines[i])[0] || "");
    if (m) names.push(m[1]);
  }
  return names;
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

function ensure(root) {
  const ui = readUiConfig(root);
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
          fs.writeFileSync(file, lines.join("\n"));
          result.catalogue = "updated";
          result.added = missing;
        }
      }
    }
  }

  if (ui.wireframeMap) {
    const file = path.resolve(root, ui.wireframeMap);
    if (!fs.existsSync(file)) {
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
  const catalogue =
    ui.componentCatalogue &&
    fs.existsSync(path.resolve(root, ui.componentCatalogue))
      ? catalogued(
          fs.readFileSync(path.resolve(root, ui.componentCatalogue), "utf8"),
          ui.catalogueSection,
        ) || []
      : [];

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
    else
      unresolved.push({
        ...base,
        candidates: nearMisses(rows, node).filter(
          (c) =>
            c.component === LAYOUT ||
            !catalogue.length ||
            catalogue.some((n) => c.component.includes(n)),
        ),
      });
  }
  return {
    reason: "ok",
    workItem,
    blocks: blocks.length,
    import: ui.componentImport,
    catalogue: ui.componentCatalogue,
    map: ui.wireframeMap,
    mapState: map ? "ok" : fs.existsSync(mapFile) ? "unreadable" : "missing",
    resolved,
    unresolved,
  };
}

function record(root, opts) {
  const ui = readUiConfig(root);
  if (!ui || !ui.wireframeMap) return { reason: "unset" };
  if (!parsePattern(opts.signature))
    throw new UsageError(`--signature is not a signature: ${opts.signature}`);
  const file = path.resolve(root, ui.wireframeMap);
  if (!fs.existsSync(file)) ensure(root);
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
  const headerLine = lines.findIndex(
    (l, i) =>
      isTableLine(l) &&
      /signature/i.test(splitRow(l)[0] || "") &&
      isDivider(lines[i + 1] || ""),
  );
  const columns = splitRow(lines[headerLine]).map((h) => h.toLowerCase());
  const row = `| ${columns
    .map((h) => {
      const key = Object.keys(values).find((k) => h.startsWith(k));
      return cell(key ? values[key] : "");
    })
    .join(" | ")} |`;

  const same = map.rows.find(
    (r) => r.signature === opts.signature && r.label === (opts.label || ""),
  );
  if (same) {
    lines[same.line - 1] = row;
    fs.writeFileSync(file, lines.join("\n"));
    return {
      reason: "ok",
      action: "replaced",
      line: same.line,
      map: ui.wireframeMap,
    };
  }
  lines.splice(map.tableEnd, 0, row);
  fs.writeFileSync(file, lines.join("\n"));
  return {
    reason: "ok",
    action: "added",
    line: map.tableEnd + 1,
    map: ui.wireframeMap,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE =
  "usage: wireframe-map.js ensure | resolve <work-item.md> | record --signature <sig> --component <name> --by <who> [--label] [--variant] [--hint] [--notes] [--date] — each takes [--root <dir>] [--json]";

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
  ]);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--json") opts.json = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      if (!valued.has(key)) throw new UsageError(`unknown flag ${a}`);
      if (rest[i + 1] === undefined) throw new UsageError(`${a} needs a value`);
      opts[key] = rest[++i];
    } else opts.positional.push(a);
  }
  if (!["ensure", "resolve", "record"].includes(command))
    throw new UsageError(USAGE);
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
    if (opts.command === "ensure") payload = ensure(root);
    else if (opts.command === "resolve")
      payload = resolve(root, opts.positional[0]);
    else payload = record(root, opts);
  } catch (err) {
    if (err instanceof UsageError)
      return { exitCode: 2, payload: { reason: "usage" }, error: err.message };
    throw err;
  }
  const ok = payload.reason === "ok" || payload.reason === "unset";
  return { exitCode: ok ? 0 : 1, payload, json: opts.json };
}

function human(p) {
  if (p.reason === "unset")
    return "wireframe-map: no ui: block configured — nothing to do";
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
  barrelExports,
  ensure,
  resolve,
  record,
  runCli,
};
