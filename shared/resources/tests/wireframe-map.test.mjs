// wireframe-map.js — wireframe nodes resolved against a consumer's confirmed links, and the
// catalogue and map seeded when missing (task.243).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "wireframe-map.js");
const {
  listNodes,
  extractBlocks,
  parseLine,
  ensure,
  resolve,
  record,
  readMap,
  parsePattern,
  match,
  detect,
  configure,
  readUiConfig,
  runCli,
} = require(SCRIPT);

// U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR, built rather than written: a literal
// one is invisible in an editor.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

const CONFIG = [
  "ui:",
  "  componentCatalogue: docs/components.md",
  "  componentImport: '@acme/ui'",
  "  componentBarrel: src/index.ts",
  "  catalogueSection: '## Components'",
  "  componentExclude:",
  "    - Provider",
  "  wireframeMap: docs/wireframe-map.md",
  "",
].join("\n");

const STORY = [
  "# Story",
  "",
  "````markdown",
  "```wireloom",
  "window:",
  '  text "an example, not a real block"',
  "```",
  "````",
  "",
  "```wireloom",
  "window:",
  "  row:",
  '    backbutton "Back"',
  '    text "Settings" bold',
  '  section "Account":',
  "    row:",
  "      icon name=leader",
  '      text "Family"',
  '  slot "Profile":',
  '    text "Keep it fresh" muted',
  '  text "1 of 3" muted',
  "  footer:",
  '    button "Done" primary',
  "```",
  "",
].join("\n");

function consumer({ config = CONFIG, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "wfmap-"));
  const write = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  if (config !== null) write("skills-config.yaml", config);
  write(
    "src/index.ts",
    [
      "export { Button, type ButtonProps } from './components/atoms/button/button';",
      "export * from './components/molecules/rows';",
      "export { Provider } from './provider';",
      "export { useTheme, ICON_NAMES } from './theme';",
      "",
    ].join("\n"),
  );
  write(
    "src/components/atoms/button/button.tsx",
    "/** A call to action. Has variants. */\nexport function Button() {}\n",
  );
  write(
    "src/components/molecules/rows.ts",
    "export { Row } from './row/row';\n",
  );
  write("src/components/molecules/row/row.tsx", "export function Row() {}\n");
  write("src/provider.tsx", "export function Provider() {}\n");
  write(
    "src/theme.ts",
    "export const useTheme = 1; export const ICON_NAMES = [];\n",
  );
  write("docs/story.md", STORY);
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  return root;
}

const cleanup = (root) => rmSync(root, { recursive: true, force: true });

test("extractBlocks skips a wireloom fence nested inside another fence", () => {
  const blocks = extractBlocks(STORY);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].line, 11);
});

test("parseLine reads the primitive, label, flags and attributes", () => {
  assert.deepEqual(
    parseLine('    button "Show the code" primary icon="x y":'),
    {
      indent: 4,
      primitive: "button",
      label: "Show the code",
      flags: ["primary"],
      attrs: { icon: "x y" },
    },
  );
});

test("parseLine keeps a # inside a quoted label: Wireloom comments are whole lines", () => {
  assert.equal(parseLine('  text "Order #1234" muted').label, "Order #1234");
  assert.deepEqual(parseLine('  text "Order #1234" muted').flags, ["muted"]);
  const nodes = listNodes(
    extractBlocks(
      [
        "```wireloom",
        "window:",
        "  # a comment line",
        '  text "Issue #7"',
        "```",
        "",
      ].join("\n"),
    ),
  );
  assert.deepEqual(
    nodes.map((n) => [n.primitive, n.label]),
    [
      ["window", null],
      ["text", "Issue #7"],
    ],
  );
});

test("listNodes gives each node a path id, its file line and a signature", () => {
  const nodes = listNodes(extractBlocks(STORY));
  const button = nodes.find((n) => n.primitive === "button");
  assert.equal(button.id, "b1/window/footer/button");
  assert.equal(button.line, 23);
  assert.equal(button.signature, "footer>button[primary]");
  const icon = nodes.find((n) => n.primitive === "icon");
  assert.equal(icon.signature, "row>icon{name=leader}");
  const rows = nodes.filter((n) => n.primitive === "row").map((n) => n.id);
  assert.deepEqual(rows, ["b1/window/row", "b1/window/section/row"]);
});

// U+2028/U+2029 split no line in a wireloom block, so a node holding one is still a node, and its
// signature reads back to it (PARSELINE-1: the line used to yield no node at all).
test("listNodes keeps a node whose label or attribute holds U+2028 or U+2029", () => {
  for (const sep of [LS, PS]) {
    const block = {
      index: 1,
      line: 1,
      lines: [`window:`, `  button "Save${sep}now" primary tip="a${sep}b":`],
    };
    const button = listNodes([block]).find((n) => n.primitive === "button");
    assert.ok(button, `${sep.charCodeAt(0).toString(16)}: no node`);
    assert.equal(button.label, `Save${sep}now`);
    assert.deepEqual(button.flags, ["primary"]);
    assert.equal(button.attrs.tip, `a${sep}b`);
    const p = parsePattern(button.signature);
    assert.deepEqual(p.attrs, { tip: `a${sep}b` });
    assert.equal(p.parent, "window");
  }
});

test("ensure is a no-op without a ui: block", () => {
  const root = consumer({ config: "tracker: jira\n" });
  try {
    assert.equal(ensure(root).reason, "unset");
    assert.equal(existsSync(join(root, "docs/components.md")), false);
    assert.equal(existsSync(join(root, "docs/wireframe-map.md")), false);
  } finally {
    cleanup(root);
  }
});

test("resolve is a no-op without a ui: block or a wireframeMap", () => {
  // The story holds a wireloom block, so only the unset gate stops resolve here.
  const noMapKey = CONFIG.replace(/^ {2}wireframeMap: .*\n/m, "");
  assert.ok(!noMapKey.includes("wireframeMap"), "fixture still names a map");
  for (const config of ["tracker: jira\n", noMapKey]) {
    const root = consumer({ config });
    try {
      // No file assertions: resolve has no write path, so they could not fail (CR8-1). The
      // "writes nothing" half of SC-1 is ensure's, held by the test above.
      assert.deepEqual(resolve(root, "docs/story.md"), { reason: "unset" });
    } finally {
      cleanup(root);
    }
  }
});

test("ensure seeds the catalogue from the barrel and an empty map", () => {
  const root = consumer();
  try {
    const r = ensure(root);
    assert.equal(r.catalogue, "created");
    assert.equal(r.map, "created");
    // Types, hooks, constants and excluded exports are not components.
    assert.deepEqual(r.added, ["Button", "Row"]);
    const cat = readFileSync(join(root, "docs/components.md"), "utf8");
    assert.match(cat, /^\| `Button` \| atoms \| A call to action\. \|$/m);
    assert.match(cat, /^\| `Row` \| molecules \| _describe me_ \|$/m);
    assert.match(
      readFileSync(join(root, "docs/wireframe-map.md"), "utf8"),
      /^\| Signature \| Label \| Component \|/m,
    );
    // A second run changes nothing.
    const again = ensure(root);
    assert.deepEqual([again.catalogue, again.map], ["unchanged", "unchanged"]);
  } finally {
    cleanup(root);
  }
});

test("ensure adds only a new export to an existing catalogue, under its own heading", () => {
  const existing = [
    "# Ours",
    "",
    "## Components",
    "",
    "### Atoms",
    "",
    "| Component | Tier | Use it for |",
    "| --- | --- | --- |",
    "| `Button` | atoms | Our own words |",
    "",
    "## Something else",
    "",
    "| `Row` | not in the section |",
    "",
  ].join("\n");
  const root = consumer({ files: { "docs/components.md": existing } });
  try {
    const r = ensure(root);
    assert.equal(r.catalogue, "updated");
    assert.deepEqual(r.added, ["Row"]);
    const text = readFileSync(join(root, "docs/components.md"), "utf8");
    assert.match(text, /\| `Button` \| atoms \| Our own words \|/);
    const added = text.indexOf("### Added by wireframe-map");
    assert.ok(added > 0 && added < text.indexOf("## Something else"));
    assert.equal(ensure(root).catalogue, "unchanged");
  } finally {
    cleanup(root);
  }
});

// record creates a missing map and nothing else: it used to call all of ensure, which also wrote
// the component catalogue (CR12-5). The catalogue is ensure's, run first by the procedure.
test("record creates a missing map, and leaves the catalogue to ensure", () => {
  const root = consumer();
  try {
    const r = record(root, {
      signature: "*>chip",
      component: "Chip",
      by: "a developer",
      date: "2026-10-29",
    });
    assert.equal(r.action, "added");
    assert.ok(existsSync(join(root, "docs/wireframe-map.md")));
    assert.equal(existsSync(join(root, "docs/components.md")), false);
    assert.equal(ensure(root).catalogue, "created");
  } finally {
    cleanup(root);
  }
});

// A CRLF file keeps CRLF: joining with LF rewrote every line of it to add one row (CR12-4).
test("ensure and record keep a CRLF file's line endings", () => {
  const crlf = (lines) => lines.join("\r\n");
  const onlyCrlf = (text) =>
    text
      .split("\n")
      .every((l, i, all) => i === all.length - 1 || l.endsWith("\r"));
  const catalogue = crlf([
    "## Components",
    "",
    "| Component | Tier | Use it for |",
    "| --- | --- | --- |",
    "| `Button` | atoms | Ours |",
    "",
  ]);
  const map = crlf([
    "| Signature | Label | Component | Variant / props | Source hint | Notes | Confirmed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "",
  ]);
  const root = consumer({
    files: { "docs/components.md": catalogue, "docs/wireframe-map.md": map },
  });
  try {
    assert.equal(ensure(root).catalogue, "updated");
    const cat = readFileSync(join(root, "docs/components.md"), "utf8");
    assert.ok(onlyCrlf(cat), "the catalogue lost CRLF");
    const opts = { component: "Chip", by: "a developer", date: "2026-10-29" };
    const mapFile = join(root, "docs/wireframe-map.md");
    const before = readFileSync(mapFile, "utf8").split("\n").length;
    assert.equal(
      record(root, { ...opts, signature: "*>chip" }).action,
      "added",
    );
    assert.equal(
      record(root, { ...opts, signature: "*>chip" }).action,
      "replaced",
    );
    const after = readFileSync(mapFile, "utf8");
    assert.ok(onlyCrlf(after), "the map lost CRLF");
    assert.equal(after.split("\n").length, before + 1);
  } finally {
    cleanup(root);
  }
});

test("ensure under a level-3 section nests its heading below it, and a second run writes nothing", () => {
  const config = CONFIG.replace("'## Components'", "'### Components'");
  const existing = [
    "# Ours",
    "",
    "### Components",
    "",
    "| Component | Tier | Use it for |",
    "| --- | --- | --- |",
    "| `Other` | atoms | Ours |",
    "",
    "### Something else",
    "",
  ].join("\n");
  const root = consumer({ config, files: { "docs/components.md": existing } });
  try {
    const file = join(root, "docs/components.md");
    assert.equal(ensure(root).catalogue, "updated");
    const once = readFileSync(file, "utf8");
    assert.equal(
      (once.match(/^#### Added by wireframe-map$/gm) || []).length,
      1,
    );
    assert.ok(once.indexOf("#### Added") < once.indexOf("### Something else"));
    // Write N and write N+1 are byte-identical: the rows added are seen as catalogued.
    for (let run = 2; run <= 3; run++) {
      assert.equal(ensure(root).catalogue, "unchanged", `run ${run}`);
      assert.equal(
        readFileSync(file, "utf8"),
        once,
        `run ${run} changed the file`,
      );
    }
  } finally {
    cleanup(root);
  }
});

test("componentExclude accepts a one-line [A, B] list and a single name", () => {
  for (const form of ["[Provider]", "['Provider', Row]", "Provider"]) {
    const config = CONFIG.replace(
      "  componentExclude:\n    - Provider\n",
      `  componentExclude: ${form}\n`,
    );
    assert.notEqual(
      config,
      CONFIG,
      "the fixture's exclude block was not replaced",
    );
    const root = consumer({ config });
    try {
      const added = ensure(root).added;
      assert.ok(
        !added.includes("Provider"),
        `${form}: Provider was catalogued`,
      );
      assert.ok(added.includes("Button"), `${form}: Button was dropped`);
    } finally {
      cleanup(root);
    }
  }
});

test("barrel names with two leading capitals are components; all-caps constants are not", () => {
  const root = consumer({
    files: {
      "src/index.ts": [
        "export { Button } from './components/atoms/button/button';",
        "export { QRCode } from './components/atoms/qr/qr';",
        "export * from './layout';",
        "",
      ].join("\n"),
      "src/components/atoms/qr/qr.tsx": "export function QRCode() {}\n",
      "src/layout.ts":
        "export function HStack() {}\nexport const URL = 'x';\nexport const ICON_NAMES = [];\n",
    },
  });
  try {
    assert.deepEqual(ensure(root).added, ["Button", "HStack", "QRCode"]);
  } finally {
    cleanup(root);
  }
});

test("a component's purpose is its own doc comment, not the file's header comment", () => {
  const root = consumer({
    files: {
      "src/components/atoms/button/button.tsx": [
        "/** Module header: everything about buttons. */",
        "import x from 'x';",
        "/** A call to action. */",
        "export function Button() {}",
        "",
      ].join("\n"),
      "src/components/molecules/row/row.tsx":
        "/** Module header for rows. */\nimport y from 'y';\nexport function Row() {}\n",
    },
  });
  try {
    ensure(root);
    const cat = readFileSync(join(root, "docs/components.md"), "utf8");
    assert.match(cat, /^\| `Button` \| atoms \| A call to action\. \|$/m);
    assert.match(cat, /^\| `Row` \| molecules \| _describe me_ \|$/m);
  } finally {
    cleanup(root);
  }
});

test("ensure leaves a catalogue without the configured section alone", () => {
  const root = consumer({ files: { "docs/components.md": "# No section\n" } });
  try {
    assert.equal(ensure(root).catalogue, "unreadable");
    assert.equal(
      readFileSync(join(root, "docs/components.md"), "utf8"),
      "# No section\n",
    );
  } finally {
    cleanup(root);
  }
});

const MAP = [
  "# Map",
  "",
  "| Signature | Label | Component | Variant / props | Source hint | Notes | Confirmed |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  "| `button` |  | Button |  |  |  | 2026-10-29, a |",
  "| `footer>button[primary]` |  | Button in ActionRow | variant from the CTA class |  |  | 2026-10-29, a |",
  "| `text` | `/^\\d+ of \\d+$/` | Carousel | all slides |  |  | 2026-10-29, a |",
  "| `*>row` |  | (layout) |  |  |  | 2026-10-29, a |",
  "| `icon{name=lock}` |  | Icon | lock |  |  | 2026-10-29, a |",
  "| `text[bold]` |  | Heading |  |  |  | 2026-10-29, a |",
  "",
].join("\n");

// The catalogue filters candidates by whole component name, and a catalogue without its section is
// reported rather than read as empty (CR12-3: `ButtonGroup` passed on `Button` by substring).
test("resolve filters candidates by whole catalogue names and reports the catalogue's state", () => {
  const map = [
    "| Signature | Label | Component | Variant / props | Source hint | Notes | Confirmed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| `icon{name=lock}` |  | ButtonGroup |  |  |  | 2026-10-29, a |",
    "| `icon{name=star}` |  | Button in ActionRow |  |  |  | 2026-10-29, a |",
    "| `icon{name=heart}` |  | Button. |  |  |  | 2026-10-29, a |",
    "",
  ].join("\n");
  const catalogue = (section) =>
    [
      section,
      "",
      "| Component | Tier | Use it for |",
      "| --- | --- | --- |",
      "| `Button` | atoms | A call to action |",
      "",
    ].join("\n");
  const open = (root) => {
    const r = resolve(root, "docs/story.md");
    const icon = r.unresolved.find(
      (n) => n.signature === "row>icon{name=leader}",
    );
    return { r, from: icon.candidates.map((c) => c.from) };
  };
  const cases = [
    [catalogue("## Components"), "ok", ["icon{name=star}", "icon{name=heart}"]],
    [
      catalogue("## Something else"),
      "no-section",
      ["icon{name=lock}", "icon{name=star}", "icon{name=heart}"],
    ],
    [
      null,
      "missing",
      ["icon{name=lock}", "icon{name=star}", "icon{name=heart}"],
    ],
  ];
  for (const [text, state, from] of cases) {
    const files = { "docs/wireframe-map.md": map };
    if (text !== null) files["docs/components.md"] = text;
    const root = consumer({ files });
    try {
      const got = open(root);
      assert.equal(got.r.catalogueState, state);
      assert.deepEqual(got.from, from, state);
    } finally {
      cleanup(root);
    }
  }
  const noKey = consumer({
    config: CONFIG.replace(/^ {2}componentCatalogue: .*\n/m, ""),
    files: { "docs/wireframe-map.md": map },
  });
  try {
    assert.equal(open(noKey).r.catalogueState, "unset");
  } finally {
    cleanup(noKey);
  }
});

test("resolve picks the most specific matching row and lists the open nodes", () => {
  const root = consumer({ files: { "docs/wireframe-map.md": MAP } });
  try {
    const r = resolve(root, "docs/story.md");
    assert.equal(r.reason, "ok");
    const by = (sig, label) =>
      [...r.resolved, ...r.unresolved].find(
        (n) =>
          n.signature === sig && (label === undefined || n.label === label),
      );
    assert.equal(by("footer>button[primary]").component, "Button in ActionRow");
    assert.equal(by("window>text[muted]", "1 of 3").component, "Carousel");
    assert.equal(by("window>row").layout, true);
    // A row that requires a flag the node lacks does not match it.
    assert.equal(by("row>text[bold]", "Settings").component, "Heading");
    assert.ok(
      r.unresolved.some((n) => n.label === "Keep it fresh"),
      "a muted text is not a [bold] heading",
    );
    // A label pattern the node fails is not a match either.
    assert.ok(r.unresolved.some((n) => n.label === "Family"));
    // The icon's attribute does not match the lock row: open, with that row offered.
    const icon = r.unresolved.find(
      (n) => n.signature === "row>icon{name=leader}",
    );
    assert.ok(icon, "icon name=leader is open");
    assert.deepEqual(
      icon.candidates.map((c) => c.from),
      ["icon{name=lock}"],
    );
    assert.ok(r.unresolved.some((n) => n.signature === "row>backbutton"));
  } finally {
    cleanup(root);
  }
});

// A repeated flag is one constraint, so it must not make a row look more specific than it is
// (gate 14, CR14-1): `input[a,a,a]` means `input[a]` and loses to `input[a,b]`.
test("match counts a repeated flag once when ranking rows", () => {
  const node = {
    parent: null,
    primitive: "input",
    label: null,
    flags: ["a", "b"],
    attrs: {},
  };
  const rows = [
    { signature: "input[a,a,a]", label: "", component: "Repeated" },
    { signature: "input[a,b]", label: "", component: "Specific" },
  ];
  assert.equal(match(rows, node).component, "Specific");
  assert.equal(match([...rows].reverse(), node).component, "Specific");
});

test("resolve without a map file treats every node as open", () => {
  const root = consumer();
  try {
    const r = resolve(root, "docs/story.md");
    assert.equal(r.mapState, "missing");
    assert.equal(r.resolved.length, 0);
    assert.ok(r.unresolved.length > 5);
  } finally {
    cleanup(root);
  }
});

test("record adds a row, then replaces it for the same signature and label", () => {
  const root = consumer();
  try {
    ensure(root);
    const first = record(root, {
      signature: "row>icon{name=leader}",
      component: "Icon",
      variant: "the name from the source",
      by: "a developer",
      date: "2026-10-29",
    });
    assert.equal(first.action, "added");
    assert.equal(
      resolve(root, "docs/story.md").resolved.find(
        (n) => n.signature === "row>icon{name=leader}",
      ).component,
      "Icon",
    );
    const second = record(root, {
      signature: "row>icon{name=leader}",
      component: "Glyph",
      by: "a developer",
      date: "2026-10-30",
    });
    assert.equal(second.action, "replaced");
    const text = readFileSync(join(root, "docs/wireframe-map.md"), "utf8");
    assert.equal((text.match(/name=leader/g) || []).length, 1);
    assert.match(text, /\| Glyph \|.*\| 2026-10-30, a developer \|/);
  } finally {
    cleanup(root);
  }
});

// Attribute values holding the signature's own separators, a table cell's, whitespace the reader
// trims, or a non-ASCII character (gate 12, CR12-1: `value="1,500"` read back as `value: "1"`).
// `1` and `100%` sit beside `1,500` and `100%25`: a reader that split on the comma, or a writer that
// left `%` unencoded, would merge each pair (gate 13, CR13-2).
const AWKWARD = [
  "1,500",
  "1",
  "a}b",
  "72%",
  "100%25",
  "100%",
  "a|b",
  "x`y",
  " pad ",
  "t\tb",
  "/home",
  "a=b",
  "é",
];

test("every node's signature reads back to the node, and record then resolve settles it", () => {
  const story = [
    "```wireloom",
    "window:",
    // One key for every value, so a row can only tell two nodes apart by the value itself.
    ...AWKWARD.map((v) => `  input k="${v}"`),
    "```",
    "",
  ].join("\n");
  const nodes = listNodes(extractBlocks(story)).filter(
    (n) => n.primitive === "input",
  );
  assert.equal(nodes.length, AWKWARD.length);
  for (const node of nodes) {
    const row = { signature: node.signature, label: "" };
    assert.equal(match([row], node), row, `self-match: ${node.signature}`);
    // and no other awkward value's node matches it: the encoding does not merge values
    for (const other of nodes)
      if (other !== node)
        assert.equal(
          match([row], other),
          null,
          `${node.signature} matched ${other.signature}`,
        );
  }
  const root = consumer({ files: { "docs/story.md": story } });
  try {
    ensure(root);
    nodes.forEach((node, i) =>
      record(root, {
        signature: node.signature,
        component: `Field${i}`,
        by: "a developer",
        date: "2026-10-29",
      }),
    );
    const r = resolve(root, "docs/story.md");
    nodes.forEach((node, i) =>
      assert.equal(
        r.resolved.find((n) => n.signature === node.signature)?.component,
        `Field${i}`,
        `resolved: ${node.signature}`,
      ),
    );
  } finally {
    cleanup(root);
  }
  // A hand-written row needs no encoding, and a `%` that starts no escape stays literal.
  assert.deepEqual(parsePattern("*>input{v=72%,w=/home}").attrs, {
    v: "72%",
    w: "/home",
  });
  assert.deepEqual(parsePattern("*>input{v=1%2C500}").attrs, { v: "1,500" });
  // An escape run that is not UTF-8 is kept as written rather than thrown on.
  assert.deepEqual(parsePattern("*>input{v=%E2%80}").attrs, { v: "%E2%80" });
});

// Gate 13, CR13-1: record replaces the row that means the same thing, however it is spelled, and
// still adds a row for one that means something else.
test("record replaces a row spelled differently that means the same, and only that", () => {
  const cases = [
    // [first, second, the second record's action]
    ["window>input{v=é}", "window>input{v=%C3%A9}", "replaced"],
    ["window>input{v=72%}", "window>input{v=72%25}", "replaced"],
    ["*>input{v=x}", "input{v=x}", "replaced"],
    ["input[a,b]", "input[b,a]", "replaced"],
    ["input{a=1,b=2}", "input{b=2,a=1}", "replaced"],
    ["window>input{v=1}", "window>input{v=1%2C500}", "added"],
    ["window>input{v=100%}", "window>input{v=100%2525}", "added"],
    ["window>input{v=x}", "input{v=x}", "added"],
    ["input[a]", "input[a,b]", "added"],
  ];
  for (const [first, second, action] of cases) {
    const root = consumer();
    try {
      ensure(root);
      const opts = { by: "a developer", date: "2026-10-29" };
      record(root, { ...opts, signature: first, component: "Old" });
      const map = join(root, "docs/wireframe-map.md");
      const before = readFileSync(map, "utf8");
      const r = record(root, { ...opts, signature: second, component: "New" });
      assert.equal(r.action, action, `${first} then ${second}`);
      const after = readFileSync(map, "utf8");
      assert.equal(
        after.split("\n").length,
        before.split("\n").length + (action === "added" ? 1 : 0),
        `${first} then ${second}: row count`,
      );
      if (action === "replaced") {
        assert.ok(!after.includes("| Old |"), `${first} then ${second}`);
        assert.ok(after.includes(`\`${second}\``), `${first} then ${second}`);
      } else {
        assert.ok(after.includes(`\`${first}\``), `${first} then ${second}`);
        assert.ok(after.includes("| Old |"), `${first} then ${second}`);
      }
    } finally {
      cleanup(root);
    }
  }
});

// The row to replace is found by meaning AND label: the same signature under another label is
// another row (gate 14, CR14-2). Each case records three rows, then re-records one of them.
test("record keeps rows with the same signature and different labels apart", () => {
  const cases = [
    // [the re-recorded label, the action, the component left on each original row]
    ["Save", "replaced", { "": "Plain", Save: "New" }],
    ["", "replaced", { "": "New", Save: "Saver" }],
    ["Cancel", "added", { "": "Plain", Save: "Saver" }],
    ["save", "added", { "": "Plain", Save: "Saver" }],
    ["/Save/", "added", { "": "Plain", Save: "Saver" }],
  ];
  for (const [label, action, left] of cases) {
    const root = consumer();
    try {
      ensure(root);
      const opts = { by: "a developer", date: "2026-10-29" };
      record(root, {
        ...opts,
        signature: "button[primary]",
        component: "Plain",
      });
      record(root, {
        ...opts,
        signature: "button[primary]",
        label: "Save",
        component: "Saver",
      });
      const r = record(root, {
        ...opts,
        // An equivalent spelling, so the label is the only term that can tell the rows apart.
        signature: "*>button[primary,primary]",
        label,
        component: "New",
      });
      assert.equal(r.action, action, `label ${JSON.stringify(label)}`);
      const rows = readMap(
        readFileSync(join(root, "docs/wireframe-map.md"), "utf8"),
      ).rows;
      assert.equal(
        rows.length,
        action === "added" ? 3 : 2,
        `label ${JSON.stringify(label)}: row count`,
      );
      for (const [l, component] of Object.entries(left))
        assert.equal(
          rows.find((x) => (x.label || "") === l).component,
          component,
          `label ${JSON.stringify(label)}: the ${JSON.stringify(l)} row`,
        );
    } finally {
      cleanup(root);
    }
  }
});

test("record refuses a signature with a line break and leaves the map unchanged", () => {
  const root = consumer();
  try {
    ensure(root);
    record(root, {
      signature: "*>chip",
      component: "Chip",
      by: "a developer",
      date: "2026-10-29",
    });
    const map = join(root, "docs/wireframe-map.md");
    const before = readFileSync(map, "utf8");
    for (const signature of [
      "*>button[primary\n| `*>input` | | Evil |]",
      "*>icon{name=a\nb}",
      "button\n",
      "\nbutton",
      "button\r\n",
      // U+2028/U+2029 keep the row on one line but stop the cell reading back (DoD run 3).
      `*>chip${LS}`,
      `${LS}*>chip`,
      `*>chip[a${PS}b]`,
      `*>icon{name=a${LS}b}`,
    ]) {
      assert.throws(
        () =>
          record(root, {
            signature,
            component: "X",
            by: "a developer",
            date: "2026-10-29",
          }),
        /--signature is not a signature/,
        JSON.stringify(signature),
      );
    }
    assert.equal(readFileSync(map, "utf8"), before);
  } finally {
    cleanup(root);
  }
});

// Why --by and --date are checked although readMap never reads Confirmed (CR11-1): the row follows
// the map's own header order, so a hand-edited map can put Notes after Confirmed, and an odd backtick
// in Confirmed would swallow it.
test("a column after Confirmed reads back, and an odd backtick in Confirmed would swallow it", () => {
  const head =
    "| Signature | Label | Component | Variant | Source hint | Confirmed | Notes |\n" +
    "| --- | --- | --- | --- | --- | --- | --- |\n";
  const root = consumer({ files: { "docs/wireframe-map.md": head } });
  try {
    record(root, {
      signature: "*>chip",
      component: "Chip",
      notes: "keep",
      by: "a developer",
      date: "2026-10-29",
    });
    const text = readFileSync(join(root, "docs/wireframe-map.md"), "utf8");
    assert.equal(readMap(text).rows[0].notes, "keep");
    const odd = text.replace("a developer", "a `developer");
    assert.notEqual(readMap(odd).rows[0].notes, "keep");
  } finally {
    cleanup(root);
  }
});

test("record refuses a line break in any written field, and a backtick in a code cell", () => {
  const root = consumer();
  try {
    ensure(root);
    const base = {
      signature: "*>chip",
      component: "Chip",
      by: "a developer",
      date: "2026-10-29",
    };
    record(root, base);
    const map = join(root, "docs/wireframe-map.md");
    const before = readFileSync(map, "utf8");
    for (const flag of [
      "label",
      "component",
      "variant",
      "hint",
      "notes",
      "by",
      "date",
    ]) {
      for (const v of [
        "a\nb",
        "\nab",
        "ab\n",
        "a\r\nb",
        "a\rb",
        `a${LS}b`,
        `ab${PS}`,
        `${LS}ab`,
      ]) {
        assert.throws(
          () => record(root, { ...base, [flag]: v }),
          new RegExp(`--${flag} must be one line`),
          `${flag} ${JSON.stringify(v)}`,
        );
      }
    }
    for (const [flag, v] of [
      ["signature", "button[a`b]"],
      ["signature", "*>icon{name=`x}"],
      ["label", "*>tab`"],
      ["label", "`*>tab`"],
    ]) {
      assert.throws(
        () => record(root, { ...base, [flag]: v }),
        new RegExp(`--${flag} may not contain a backtick`),
        `${flag} ${JSON.stringify(v)}`,
      );
    }
    // An odd backtick count in a cell not written inside backticks leaves splitRow in code mode,
    // so the cells after it merge into it. Each position: trailing, leading, middle, three.
    for (const flag of [
      "component",
      "variant",
      "hint",
      "notes",
      "by",
      "date",
    ]) {
      for (const v of ["Chip`", "`Chip", "see `Tabs", "a ` b ` c `"]) {
        assert.throws(
          () => record(root, { ...base, [flag]: v }),
          new RegExp(`--${flag} would not read back from the map row`),
          `${flag} ${JSON.stringify(v)}`,
        );
      }
    }
    // A cell of its own that is wholly one code span loses that pair to readMap's unquote.
    for (const flag of ["component", "variant", "hint", "notes"]) {
      for (const v of ["`Tabs`", "``.btn``"]) {
        assert.throws(
          () => record(root, { ...base, [flag]: v }),
          new RegExp(`--${flag} would not read back from the map row`),
          `${flag} ${JSON.stringify(v)}`,
        );
      }
    }
    assert.equal(readFileSync(map, "utf8"), before);

    // Not refused, and read back intact: a balanced backtick pair inside a cell, a pipe
    // anywhere, an escaped pipe the writer must not double-unescape, and a code span that
    // closes the Confirmed cell (which readMap never reads, so it is never unquoted).
    record(root, {
      ...base,
      signature: "*>tab",
      label: "*>tab[active]",
      component: "Tab `x` | y",
      variant: "a\\|b",
      hint: ".btn `x`",
      notes: "wraps `Tabs` | one per row",
      by: "`dev`",
    });
    const text = readFileSync(map, "utf8");
    const row = readMap(text).rows.find((r) => r.signature === "*>tab");
    assert.equal(row.label, "*>tab[active]");
    assert.equal(row.component, "Tab `x` | y");
    assert.equal(row.variant, "a\\|b");
    assert.equal(row.hint, ".btn `x`");
    assert.equal(row.notes, "wraps `Tabs` | one per row");
    assert.match(text.split("\n")[row.line - 1], /\| 2026-10-29, `dev` \|$/);
  } finally {
    cleanup(root);
  }
});

test("CLI: usage errors exit 2, an unknown flag is refused, a missing work item exits 1", () => {
  const root = consumer();
  try {
    const run = (...args) =>
      spawnSync(process.execPath, [SCRIPT, ...args, "--root", root], {
        encoding: "utf8",
      });
    assert.equal(run("nonsense").status, 2);
    assert.equal(run("ensure", "--bogus", "x").status, 2);
    assert.equal(run("record", "--signature", "button").status, 2);
    const missing = run("resolve", "docs/nope.md", "--json");
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).reason, "no-file");
    const ok = run("ensure", "--json");
    assert.equal(ok.status, 0);
    assert.equal(JSON.parse(ok.stdout).catalogue, "created");
  } finally {
    cleanup(root);
  }
});

// A config that exists and cannot be read is not "feature off" (CR12-2): it used to answer `unset`,
// exit 0, for a project that had turned the feature on. A missing config is still `unset`.
test("CLI: an unreadable skills-config.yaml exits 1 as config-unreadable, a missing one is unset", () => {
  const unreadable = consumer({ config: null });
  const missing = consumer({ config: null });
  try {
    mkdirSync(join(unreadable, "skills-config.yaml"));
    for (const command of [
      ["ensure"],
      ["resolve", "docs/story.md"],
      ["record", "--signature", "*>chip", "--component", "Chip", "--by", "t"],
    ]) {
      const run = (root) =>
        spawnSync(
          process.execPath,
          [SCRIPT, ...command, "--root", root, "--json"],
          { encoding: "utf8" },
        );
      const bad = run(unreadable);
      assert.equal(bad.status, 1, `${command[0]}: ${bad.stdout}${bad.stderr}`);
      const out = JSON.parse(bad.stdout);
      assert.equal(out.reason, "config-unreadable", command[0]);
      assert.match(out.error, /skills-config\.yaml cannot be read/);
      const none = run(missing);
      assert.equal(none.status, 0, command[0]);
      assert.equal(JSON.parse(none.stdout).reason, "unset", command[0]);
    }
    assert.equal(existsSync(join(unreadable, "docs/wireframe-map.md")), false);
  } finally {
    cleanup(unreadable);
    cleanup(missing);
  }
});

// ---------------------------------------------------------------------------
// task.246: the decline state, detect, configure and catalogue candidates
// ---------------------------------------------------------------------------

// A bare project: only the files given, no config unless one is passed.
function project(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "wfsetup-"));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

// Every file under root and its bytes: equal snapshots mean nothing was written.
function snapshot(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) walk(rel);
      else out[rel] = readFileSync(join(root, rel), "utf8");
    }
  };
  walk("");
  return out;
}

const config = (root) => readFileSync(join(root, "skills-config.yaml"), "utf8");
const { parseYamlSubset: parseConfig } = require(
  join(HERE, "..", "yaml-subset.js"),
);
const readUiConfigRaw = (text) => parseConfig(text).ui || {};
const flagsOf = (opts) =>
  Object.entries(opts).flatMap(([k, v]) => [`--${k}`, v]);

// The text `after` adds to `before` at one place, or null when it is not one insertion.
function inserted(before, after) {
  let i = 0;
  while (i < before.length && before[i] === after[i]) i++;
  const len = after.length - before.length;
  return len > 0 && after.slice(0, i) + after.slice(i + len) === before
    ? after.slice(i, i + len)
    : null;
}

const BARREL = [
  "export { Pill } from './pill';",
  "export { PillGroup, type PillProps } from './pill-group';",
  "export { Card } from './card';",
  "export const ICON_NAMES = [];",
  "",
].join("\n");

const CONFIGURED_FILES = {
  "src/components/index.ts": BARREL,
  "src/components/pill.tsx": "export function Pill() {}\n",
};

test("a decline (false, off, OFF) makes ensure, resolve and record answer declined and write nothing", () => {
  for (const value of [
    "false",
    "False",
    "FALSE",
    '"false"',
    "off",
    "OFF",
    "'Off'",
  ]) {
    const root = consumer({
      config: CONFIG.replace(/wireframeMap: .*$/m, `wireframeMap: ${value}`),
    });
    try {
      const before = snapshot(root);
      assert.deepEqual(readUiConfig(root), { declined: true }, value);
      assert.equal(ensure(root).reason, "declined", value);
      assert.equal(resolve(root, "docs/story.md").reason, "declined", value);
      assert.equal(
        record(root, { signature: "*>chip", component: "Pill", by: "t" })
          .reason,
        "declined",
        value,
      );
      const cli = runCli([
        "resolve",
        "docs/story.md",
        "--root",
        root,
        "--json",
      ]);
      assert.equal(cli.exitCode, 0, value);
      assert.deepEqual(snapshot(root), before, `${value}: nothing written`);
    } finally {
      cleanup(root);
    }
  }
  // Control: a map path that merely starts with "off" is a path, not a decline.
  const path = consumer({
    config: CONFIG.replace(/wireframeMap: .*$/m, "wireframeMap: offline.md"),
  });
  try {
    assert.equal(readUiConfig(path).wireframeMap, "offline.md");
    assert.equal(resolve(path, "docs/story.md").reason, "ok");
  } finally {
    cleanup(path);
  }
});

test("detect proposes a src/components barrel, and reports configured and declined", () => {
  const root = project(CONFIGURED_FILES);
  try {
    const r = detect(root);
    assert.equal(r.reason, "ok");
    assert.equal(r.state, "unset");
    assert.equal(r.present, undefined);
    assert.equal(r.proposal.componentBarrel.value, "src/components/index.ts");
    assert.match(r.proposal.componentBarrel.evidence, /exports 3 components/);
    assert.equal(r.proposal.componentImport.value, null);
    assert.equal(
      r.proposal.componentCatalogue.value,
      "docs/architecture/components.md",
    );
    assert.equal(r.proposal.catalogueSection.value, "## Components");
    assert.deepEqual(r.proposal.componentExclude.value, []);
    assert.equal(
      r.proposal.wireframeMap.value,
      "docs/architecture/wireframe-component-map.md",
    );
    writeFileSync(
      join(root, "skills-config.yaml"),
      "ui:\n  wireframeMap: docs/map.md\n",
    );
    assert.deepEqual(detect(root), { reason: "ok", state: "configured" });
    writeFileSync(
      join(root, "skills-config.yaml"),
      "ui:\n  wireframeMap: off\n",
    );
    assert.deepEqual(detect(root), { reason: "ok", state: "declined" });
  } finally {
    cleanup(root);
  }
});

test("detect prefers the workspace package with most components and takes its package name", () => {
  const root = project({
    ...CONFIGURED_FILES,
    "package.json": JSON.stringify({ name: "the-repo" }),
    "packages/ui/package.json": JSON.stringify({ name: "@acme/pills" }),
    "packages/ui/src/index.ts": BARREL + "export { Tag } from './tag';\n",
    "packages/empty/src/index.ts": "export const x = 1;\n",
  });
  try {
    const r = detect(root);
    assert.equal(r.proposal.componentBarrel.value, "packages/ui/src/index.ts");
    assert.deepEqual(r.proposal.componentImport, {
      value: "@acme/pills",
      evidence: "name in packages/ui/package.json",
    });
  } finally {
    cleanup(root);
  }
});

test("detect reads a tsconfig path alias that lands on the barrel", () => {
  const root = project({
    ...CONFIGURED_FILES,
    "package.json": JSON.stringify({ name: "the-repo" }),
    "tsconfig.json": [
      "{",
      "  // comments are allowed here",
      '  "compilerOptions": {',
      '    "baseUrl": ".",',
      '    "paths": { "@app/components": ["src/components/index.ts"] }',
      "  }",
      "}",
    ].join("\n"),
  });
  try {
    assert.equal(
      detect(root).proposal.componentImport.value,
      "@app/components",
    );
  } finally {
    cleanup(root);
  }
});

test("detect reads tsconfig.json as JSONC: a /* alias, a ** glob, comments and trailing commas", () => {
  const tsconfig = (alias, extra = "") =>
    [
      "{",
      "  /* block comment */",
      '  "compilerOptions": {',
      '    "baseUrl": ".", // line comment',
      `    "paths": { "${alias}": ["src/components/index.ts"], "@x/*": ["lib/*"], },`,
      "  },",
      `  "include": ["src/**/*.ts", "a // not a comment", "b, }"]${extra}`,
      "}",
    ].join("\n");
  const cases = [
    // [tsconfig text, the import detect must propose]
    [tsconfig("@app/components"), "@app/components"],
    [tsconfig("@app/components", ","), "@app/components"],
    // The control: plain JSON, no comment and no trailing comma.
    [
      JSON.stringify({
        compilerOptions: {
          paths: { "@app/components": ["src/components/index.ts"] },
        },
      }),
      "@app/components",
    ],
  ];
  for (const [text, want] of cases) {
    const root = project({
      ...CONFIGURED_FILES,
      "package.json": JSON.stringify({ name: "the-repo" }),
      "tsconfig.json": text,
    });
    try {
      assert.equal(detect(root).proposal.componentImport.value, want, text);
    } finally {
      cleanup(root);
    }
  }
});

test("detect proposes only an exact tsconfig alias; a wildcard one is named in the evidence, not proposed", () => {
  const cases = [
    // [paths, the value detect proposes, a word the evidence holds]
    [{ "@ui/*": ["src/components/*"] }, null, "@ui/*"],
    [{ "@ui/*": ["src/components/index.ts"] }, null, "@ui/*"],
    // An exact alias wins over a wildcard that also lands, in either order.
    [
      { "@ui/*": ["src/components/*"], "@ui": ["src/components"] },
      "@ui",
      "@ui",
    ],
    [
      { "@ui": ["src/components/index.ts"], "@ui/*": ["src/components/*"] },
      "@ui",
      "@ui",
    ],
    // A wildcard that lands elsewhere says nothing.
    [{ "@/*": ["src/*"] }, null, "no package name"],
  ];
  for (const [paths, want, says] of cases) {
    const root = project({
      ...CONFIGURED_FILES,
      "package.json": JSON.stringify({ name: "the-repo" }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { paths } }),
    });
    try {
      const got = detect(root).proposal.componentImport;
      assert.equal(got.value, want, JSON.stringify(paths));
      assert.ok(
        got.evidence.includes(says),
        `${JSON.stringify(paths)}: ${got.evidence}`,
      );
    } finally {
      cleanup(root);
    }
  }
});

test("configure refuses a --map that reads as a decline, in any case, and writes nothing", () => {
  for (const map of ["false", "False", "OFF", " off "]) {
    const root = project({ "skills-config.yaml": "x: 1\n" });
    try {
      const cli = runCli([
        "configure",
        ...flagsOf({ ...SETUP, map }),
        "--root",
        root,
      ]);
      assert.equal(cli.exitCode, 2, JSON.stringify(map));
      assert.match(cli.error, /reads as a decline: use --decline/);
      assert.equal(config(root), "x: 1\n");
    } finally {
      cleanup(root);
    }
  }
  // Control: a path that only starts with the word is a path.
  const root = project();
  try {
    assert.equal(configure(root, { ...SETUP, map: "offline.md" }).reason, "ok");
  } finally {
    cleanup(root);
  }
});

test("a list under a path key is no value: detect reads partial, configure needs --barrel and replaces the list", () => {
  const before =
    "ui:\n  componentBarrel:\n    - src/components/index.ts\n  componentCatalogue: docs/c.md\nother: 1\n";
  const root = project({ ...CONFIGURED_FILES, "skills-config.yaml": before });
  try {
    const d = detect(root);
    assert.equal(d.state, "partial");
    assert.ok(!d.present.includes("componentBarrel"));
    assert.equal(d.proposal.componentBarrel.value, "src/components/index.ts");
    const none = runCli(["configure", "--map", "m.md", "--root", root]);
    assert.equal(none.exitCode, 2);
    assert.equal(config(root), before);
    const r = configure(root, {
      barrel: "src/components/index.ts",
      map: "m.md",
    });
    assert.equal(r.reason, "ok");
    assert.equal(
      config(root),
      'ui:\n  componentBarrel: "src/components/index.ts"\n  componentCatalogue: docs/c.md\n  wireframeMap: "m.md"\nother: 1\n',
    );
    assert.equal(detect(root).state, "configured");
    assert.equal(readUiConfig(root).componentBarrel, "src/components/index.ts");
  } finally {
    cleanup(root);
  }
  // A list for componentExclude is a value, and is kept.
  const kept = project({
    "skills-config.yaml":
      "ui:\n  componentBarrel: b.ts\n  componentExclude:\n    - Provider\n",
  });
  try {
    assert.deepEqual(detect(kept).present, [
      "componentBarrel",
      "componentExclude",
    ]);
    assert.equal(configure(kept, { map: "m.md" }).reason, "ok");
    assert.deepEqual(readUiConfig(kept).componentExclude, ["Provider"]);
  } finally {
    cleanup(kept);
  }
});

test("configure removes the list under a blank key past blank lines and comments, and keeps them", () => {
  const cases = [
    // [before, after]: the barrel is filled, the map inserted after the block's last key line.
    [
      "ui:\n  componentBarrel:\n\n    - src/x.ts\n  componentCatalogue: c.md\nother: 1\n",
      'ui:\n  componentBarrel: "b.ts"\n\n  componentCatalogue: c.md\n  wireframeMap: "m.md"\nother: 1\n',
    ],
    [
      "ui:\n  componentBarrel:\n  # note\n    - src/x.ts\n  componentCatalogue: c.md\n",
      'ui:\n  componentBarrel: "b.ts"\n  # note\n  componentCatalogue: c.md\n  wireframeMap: "m.md"\n',
    ],
    [
      "ui:\n  componentBarrel:\n    # set me later\n  componentCatalogue: c.md\n",
      'ui:\n  componentBarrel: "b.ts"\n    # set me later\n  componentCatalogue: c.md\n  wireframeMap: "m.md"\n',
    ],
    [
      "ui:\r\n  componentBarrel:\r\n    - a.ts\r\n    # mid\r\n    - b.ts\r\n  componentCatalogue: c.md\r\n",
      'ui:\r\n  componentBarrel: "b.ts"\r\n    # mid\r\n  componentCatalogue: c.md\r\n  wireframeMap: "m.md"\r\n',
    ],
  ];
  for (const [before, after] of cases) {
    const root = project({ "skills-config.yaml": before });
    try {
      assert.equal(detect(root).state, "partial", JSON.stringify(before));
      const r = configure(root, { barrel: "b.ts", map: "m.md" });
      assert.equal(r.reason, "ok", JSON.stringify(before));
      assert.equal(config(root), after);
      assert.equal(detect(root).state, "configured");
    } finally {
      cleanup(root);
    }
  }
  // A list on the file's last line, with no newline: the file still ends without one, and a key
  // inserted after a filled one follows it directly.
  const lastLines = [
    [
      { map: "m.md" },
      "ui:\n  componentBarrel: b.ts\n  wireframeMap:\n    - m.md",
      'ui:\n  componentBarrel: b.ts\n  wireframeMap: "m.md"',
    ],
    [
      { barrel: "b.ts", map: "m.md" },
      "ui:\n  componentCatalogue: c.md\n  componentBarrel:\n    - src/x.ts",
      'ui:\n  componentCatalogue: c.md\n  componentBarrel: "b.ts"\n  wireframeMap: "m.md"\n',
    ],
  ];
  for (const [opts, before, after] of lastLines) {
    const root = project({ "skills-config.yaml": before });
    try {
      assert.equal(configure(root, opts).reason, "ok", JSON.stringify(before));
      assert.equal(config(root), after);
    } finally {
      cleanup(root);
    }
  }
});

test("detect and configure find a ui: key quoted or after a byte-order mark, as yaml-subset does", () => {
  for (const before of [
    `${String.fromCharCode(0xfeff)}ui:\n  componentBarrel: b.ts\n`,
    "'ui':\n  componentBarrel: b.ts\n",
    'develop:\r\n  x: 1\r\n"ui":\r\n  componentBarrel: b.ts\r\n',
  ]) {
    const root = project({ "skills-config.yaml": before });
    try {
      assert.equal(detect(root).state, "partial", JSON.stringify(before));
      const r = configure(root, { map: "m.md" });
      assert.equal(r.reason, "ok", JSON.stringify(before));
      assert.equal(r.action, "inserted");
      const eol = before.includes("\r\n") ? "\r\n" : "\n";
      assert.equal(config(root), `${before}  wireframeMap: "m.md"${eol}`);
      assert.equal(detect(root).state, "configured");
    } finally {
      cleanup(root);
    }
  }
});

test("configure takes the block indent from its first key line, never a comment", () => {
  const cases = [
    // [before, after]
    [
      "ui:\n    # note\n  componentBarrel: b.ts\n  wireframeMap:\n",
      'ui:\n    # note\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n',
    ],
    [
      "ui:\n    # note\n  componentBarrel: b.ts\n",
      'ui:\n    # note\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n',
    ],
    [
      "ui:\n  componentBarrel: b.ts\n      # deep trailing note\nother: 1\n",
      'ui:\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n      # deep trailing note\nother: 1\n',
    ],
  ];
  for (const [before, after] of cases) {
    const root = project({ "skills-config.yaml": before });
    try {
      assert.equal(configure(root, { map: "m.md" }).reason, "ok", before);
      assert.equal(config(root), after, before);
    } finally {
      cleanup(root);
    }
  }
});

test("record accepts NEL in a cell, which only a config value refuses", () => {
  const root = consumer();
  try {
    const r = record(root, {
      signature: "*>chip",
      component: "Pill",
      label: "Save\u0085now",
      by: "t",
    });
    assert.equal(r.reason, "ok");
    const text = readFileSync(
      join(root, readUiConfig(root).wireframeMap),
      "utf8",
    );
    assert.ok(readMap(text).rows.some((row) => row.label === "Save\u0085now"));
    // The config value keeps refusing it.
    assert.equal(
      runCli([
        "configure",
        ...flagsOf({ ...SETUP, map: "m\u0085.md" }),
        "--root",
        root,
      ]).exitCode,
      2,
    );
  } finally {
    cleanup(root);
  }
});

test("detect proposes an existing catalogue table that lists three or more exports, with its heading", () => {
  const table = (names) =>
    [
      "| Name | Purpose |",
      "| --- | --- |",
      ...names.map((n) => `| \`${n}\` | something |`),
      "",
    ].join("\n");
  const root = project({
    ...CONFIGURED_FILES,
    "docs/architecture/ui.md": [
      "# UI",
      "",
      "## Two only",
      "",
      table(["Pill", "Card"]),
      "## Our components",
      "",
      table(["Pill", "PillGroup", "Card", "NotExported"]),
    ].join("\n"),
  });
  try {
    const p = detect(root).proposal;
    assert.equal(p.componentCatalogue.value, "docs/architecture/ui.md");
    assert.equal(p.catalogueSection.value, "## Our components");
    assert.match(p.componentCatalogue.evidence, /lists 3 of 3 exports/);
  } finally {
    cleanup(root);
  }
});

test("detect on a project with no component barrel answers nothing-found and proposes nothing", () => {
  const root = project({ "src/index.ts": BARREL, "README.md": "# x\n" });
  try {
    assert.deepEqual(detect(root), {
      reason: "nothing-found",
      state: "unset",
      proposal: null,
    });
    const cli = runCli(["detect", "--root", root, "--json"]);
    assert.equal(cli.exitCode, 0);
  } finally {
    cleanup(root);
  }
});

test("detect reads a ui: block without wireframeMap as partial, and proposes only the missing keys", () => {
  const cases = [
    ["ui:\n  componentCatalogue: docs/c.md\n", ["componentCatalogue"]],
    ["ui:\n", []],
    ["ui:\nother: 1\n", []],
  ];
  for (const [text, present] of cases) {
    const root = project({ ...CONFIGURED_FILES, "skills-config.yaml": text });
    try {
      const r = detect(root);
      assert.equal(r.state, "partial", text);
      assert.deepEqual(r.present, present, text);
      for (const k of present)
        assert.equal(r.proposal[k], undefined, `${text}: ${k} is not proposed`);
      assert.equal(r.proposal.componentBarrel.value, "src/components/index.ts");
      assert.ok(r.proposal.wireframeMap, text);
    } finally {
      cleanup(root);
    }
  }
});

test("detect writes nothing, in any state", () => {
  const configs = [
    null,
    "ui:\n",
    "ui:\n  componentCatalogue: docs/c.md\n",
    "ui:\n  wireframeMap: false\n",
    "ui:\n  wireframeMap: docs/map.md\n",
  ];
  for (const text of configs) {
    const files = { ...CONFIGURED_FILES };
    if (text !== null) files["skills-config.yaml"] = text;
    const root = project(files);
    try {
      const before = snapshot(root);
      detect(root);
      runCli(["detect", "--root", root, "--json"]);
      assert.deepEqual(snapshot(root), before, String(text));
    } finally {
      cleanup(root);
    }
  }
});

test("detect reads only its bounded set: one level of packages/, docs/ to depth 4", () => {
  const deep = project({ "packages/a/b/src/index.ts": BARREL });
  const shallow = project({ "packages/a/src/index.ts": BARREL });
  const catalogue = (rel) =>
    project({
      ...CONFIGURED_FILES,
      [rel]: [
        "## Components",
        "",
        "| Name | Purpose |",
        "| --- | --- |",
        "| `Pill` | x |",
        "| `PillGroup` | x |",
        "| `Card` | x |",
        "",
      ].join("\n"),
    });
  const deepDocs = catalogue("docs/a/b/c/d/e/x.md");
  const depth4 = catalogue("docs/a/b/c/d/x.md");
  const tasks = catalogue("docs/tasks/x.md");
  try {
    assert.equal(detect(deep).reason, "nothing-found", "two levels down");
    // Control: one level down is found, so the miss above is the bound and not a broken scan.
    assert.equal(
      detect(shallow).proposal.componentBarrel.value,
      "packages/a/src/index.ts",
    );
    assert.equal(
      detect(deepDocs).proposal.componentCatalogue.value,
      "docs/architecture/components.md",
      "depth 5 is not read",
    );
    assert.equal(
      detect(depth4).proposal.componentCatalogue.value,
      "docs/a/b/c/d/x.md",
      "depth 4 is read",
    );
    assert.equal(
      detect(tasks).proposal.componentCatalogue.value,
      "docs/architecture/components.md",
      "docs/tasks is not read",
    );
  } finally {
    for (const r of [deep, shallow, deepDocs, depth4, tasks]) cleanup(r);
  }
});

const SETUP = {
  barrel: "src/components/index.ts",
  import: "@acme/ui",
  catalogue: "docs/architecture/components.md",
  section: "## Components",
  map: "docs/architecture/wireframe-component-map.md",
};

test("configure appends a ui: block, keeps every existing byte, and reads back configured", () => {
  const before = "develop:\n  defaultMode: standard\n# trailing comment";
  const root = project({ "skills-config.yaml": before });
  try {
    const r = configure(root, { ...SETUP, exclude: "Provider, Theme" });
    assert.equal(r.reason, "ok");
    assert.equal(r.action, "appended");
    const after = config(root);
    assert.ok(after.startsWith(before), "existing bytes kept");
    const ui = readUiConfig(root);
    assert.equal(ui.componentBarrel, SETUP.barrel);
    assert.equal(ui.componentImport, "@acme/ui");
    assert.equal(ui.catalogueSection, "## Components");
    assert.deepEqual(ui.componentExclude, ["Provider", "Theme"]);
    assert.equal(ui.wireframeMap, SETUP.map);
    assert.equal(detect(root).state, "configured");
  } finally {
    cleanup(root);
  }
});

test("configure keeps a CRLF file's line endings, and creates a missing file", () => {
  const crlf = project({ "skills-config.yaml": "develop:\r\n  x: 1\r\n" });
  const none = project();
  try {
    assert.equal(configure(crlf, SETUP).reason, "ok");
    const text = config(crlf);
    assert.equal(text.replace(/\r\n/g, "").includes("\n"), false, "no bare LF");
    assert.equal(readUiConfig(crlf).wireframeMap, SETUP.map);
    const r = configure(none, SETUP);
    assert.equal(r.action, "created");
    assert.equal(readUiConfig(none).componentBarrel, SETUP.barrel);
  } finally {
    cleanup(crlf);
    cleanup(none);
  }
});

test("configure refuses exists, writing nothing, when the map is set or declined, a key conflicts, or ui: is one line", () => {
  const decline = ["--decline"];
  const cases = [
    ["ui:\n  wireframeMap: docs/map.md\n", "wireframeMap"],
    ["ui:\n  wireframeMap: false\n", "wireframeMap"],
    // The same value again is still a set map: not a key to insert a second time.
    [`ui:\n  wireframeMap: ${SETUP.map}\n`, "wireframeMap"],
    ["ui:\n  wireframeMap: off\n", "wireframeMap", decline],
    ["ui:\n  wireframeMap: docs/map.md\n", "wireframeMap", decline],
    ["ui:\n  componentImport: '@other/ui'\n", "componentImport"],
    ["ui: {componentCatalogue: docs/c.md}\n", "ui"],
  ];
  for (const [text, key, flags = flagsOf(SETUP)] of cases) {
    const root = project({ "skills-config.yaml": text });
    try {
      const cli = runCli(["configure", ...flags, "--root", root, "--json"]);
      assert.equal(cli.exitCode, 1, text);
      assert.deepEqual(
        cli.payload,
        { reason: "exists", file: "skills-config.yaml", key },
        text,
      );
      assert.equal(config(root), text, `${text}: unchanged`);
    } finally {
      cleanup(root);
    }
  }
});

test("configure inserts only the missing keys inside a partial block, keeping every other byte", () => {
  const cases = [
    "develop:\n  x: 1\nui:\n  componentCatalogue: docs/architecture/components.md\n\n# note\nother: 1\n",
    "ui:\n",
    "ui:\nother: 1\n",
    'ui:   # set up later\n    componentImport: "@acme/ui"\nother:\n  - a\n',
  ];
  for (const before of cases) {
    const root = project({ "skills-config.yaml": before });
    try {
      const r = configure(root, SETUP);
      assert.equal(r.reason, "ok", before);
      assert.equal(r.action, "inserted", before);
      const after = config(root);
      const added = inserted(before, after);
      assert.ok(added, `${before}: one insertion, every other byte kept`);
      for (const line of added.split("\n").filter(Boolean))
        assert.match(
          line,
          /^\s+\S/,
          `${before}: inserted line is inside the block`,
        );
      for (const k of Object.keys(readUiConfigRaw(before)))
        assert.ok(!r.written.includes(k), `${before}: ${k} was already there`);
      assert.equal(detect(root).state, "configured", before);
      const cfg = parseConfig(after);
      if ("other" in parseConfig(before))
        assert.deepEqual(cfg.other, parseConfig(before).other, before);
      assert.equal(
        cfg.ui.other,
        undefined,
        `${before}: other stays outside ui`,
      );
    } finally {
      cleanup(root);
    }
  }
});

test("configure keeps a present key that matches, and needs a barrel only when the block has none", () => {
  const root = project({
    "skills-config.yaml": "ui:\n  componentBarrel: src/components/index.ts\n",
  });
  const empty = project();
  try {
    const r = configure(root, { map: SETUP.map });
    assert.equal(r.reason, "ok");
    assert.deepEqual(r.written, ["wireframeMap"]);
    const none = runCli(["configure", "--map", SETUP.map, "--root", empty]);
    assert.equal(none.exitCode, 2);
    assert.equal(existsSync(join(empty, "skills-config.yaml")), false);
  } finally {
    cleanup(root);
    cleanup(empty);
  }
});

test("configure fills a key written with no value where it stands, so detect then reads configured", () => {
  const cases = [
    // [before, the flags configure is given]
    ["ui:\n  componentBarrel: b.ts\n  wireframeMap:\n", { map: "m.md" }],
    [
      'ui:\n  componentBarrel: b.ts\n  wireframeMap: ""\nother: 1\n',
      { map: "m.md" },
    ],
    [
      "ui:\n  componentImport:\n  componentBarrel: b.ts\n",
      { map: "m.md", import: "@x/ui" },
    ],
    [
      "ui:\r\n  componentBarrel: b.ts\r\n  wireframeMap:   # todo\r\n",
      { map: "m.md" },
    ],
    ["ui:\n  componentBarrel: b.ts\n  wireframeMap:", { map: "m.md" }],
  ];
  for (const [before, opts] of cases) {
    const root = project({ "skills-config.yaml": before });
    try {
      const d = detect(root);
      assert.equal(d.state, "partial", before);
      const r = configure(root, opts);
      assert.equal(r.reason, "ok", before);
      assert.equal(detect(root).state, "configured", before);
      const after = config(root);
      // One line per key: the blank line was replaced, not shadowed by a second one.
      for (const k of r.written)
        assert.equal(
          after
            .split(/\r?\n/)
            .filter((l) => new RegExp(`^\\s*${k}\\s*:`).test(l)).length,
          1,
          `${before}: ${k} appears once`,
        );
      const cfg = parseConfig(after);
      assert.equal(cfg.ui.wireframeMap, "m.md", before);
      if (opts.import) assert.equal(cfg.ui.componentImport, "@x/ui", before);
      if ("other" in parseConfig(before)) assert.equal(cfg.other, 1, before);
      // Every line that was not a blank key is kept, in order.
      const kept = (t) =>
        t
          .split(/\r?\n/)
          .filter((l) => !/^\s*(wireframeMap|componentImport)\s*:/.test(l));
      assert.deepEqual(kept(after), kept(before), before);
      if (before.includes("\r\n"))
        assert.ok(!/[^\r]\n/.test(after), "CRLF kept");
    } finally {
      cleanup(root);
    }
  }
  const declined = project({
    "skills-config.yaml": "ui:\n  componentBarrel: b.ts\n  wireframeMap:\n",
  });
  try {
    assert.equal(configure(declined, { decline: true }).reason, "ok");
    assert.equal(detect(declined).state, "declined");
    assert.equal(
      config(declined),
      "ui:\n  componentBarrel: b.ts\n  wireframeMap: false\n",
    );
  } finally {
    cleanup(declined);
  }
});

test("configure refuses a character skills-config.yaml cannot read back, naming it, and writes nothing", () => {
  const bad = [
    ["import", '@acme/"ui"', "U+0022"],
    ["barrel", "src\\components\\index.ts", "U+005C"],
    ["section", "## A\tB", "U+0009"],
    ["exclude", "A,B\u0000", "U+0000"],
    ["catalogue", "docs/c\ud800.md", "U+D800"],
  ];
  for (const [flag, value, code] of bad) {
    const root = project({ "skills-config.yaml": "x: 1\n" });
    try {
      const cli = runCli([
        "configure",
        ...flagsOf({ ...SETUP, [flag]: value }),
        "--root",
        root,
        "--json",
      ]);
      assert.equal(cli.exitCode, 2, `${flag}=${JSON.stringify(value)}`);
      assert.equal(cli.payload.reason, "usage");
      assert.ok(
        cli.error.includes(`--${flag} cannot hold ${code}:`),
        cli.error,
      );
      assert.equal(config(root), "x: 1\n");
    } finally {
      cleanup(root);
    }
  }
  // A non-ASCII character JSON.stringify keeps as itself is stored and read back.
  const root = project();
  try {
    assert.equal(
      configure(root, { ...SETUP, section: "## Composants — UI 😀" }).reason,
      "ok",
    );
  } finally {
    cleanup(root);
  }
});

test("CLI: configure needs a non-blank --map, and its flags belong to configure alone", () => {
  const root = project({ "skills-config.yaml": "x: 1\n" });
  try {
    for (const map of ["", "   "]) {
      const cli = runCli([
        "configure",
        "--barrel",
        "b.ts",
        "--map",
        map,
        "--root",
        root,
      ]);
      assert.equal(cli.exitCode, 2, JSON.stringify(map));
    }
    for (const argv of [
      ["ensure", "--map", "m.md"],
      ["detect", "--barrel", "b.ts"],
      [
        "record",
        "--signature",
        "button",
        "--component",
        "B",
        "--by",
        "me",
        "--exclude",
        "A",
      ],
    ]) {
      const cli = runCli([...argv, "--root", root]);
      assert.equal(cli.exitCode, 2, argv.join(" "));
      assert.match(cli.error, /is a configure flag/);
    }
    assert.equal(config(root), "x: 1\n");
  } finally {
    cleanup(root);
  }
});

test("configure refuses a value holding a line terminator, and writes nothing", () => {
  for (const bad of ["a\nb", "a\rb", `a${LS}b`, "a\u0085b"]) {
    const root = project({ "skills-config.yaml": "x: 1\n" });
    try {
      const cli = runCli([
        "configure",
        ...flagsOf({ ...SETUP, import: bad }),
        "--root",
        root,
      ]);
      assert.equal(cli.exitCode, 2, JSON.stringify(bad));
      assert.equal(config(root), "x: 1\n");
    } finally {
      cleanup(root);
    }
  }
});

test("configure --decline round-trips to declined, from no block and from a partial one", () => {
  for (const before of [
    null,
    "x: 1\n",
    "ui:\n  componentCatalogue: docs/c.md\n",
  ]) {
    const root = project(
      before === null ? {} : { "skills-config.yaml": before },
    );
    try {
      const r = configure(root, { decline: true });
      assert.equal(r.reason, "ok", String(before));
      assert.equal(r.declined, true);
      assert.equal(detect(root).state, "declined", String(before));
      assert.equal(ensure(root).reason, "declined");
      if (before !== null)
        assert.ok(inserted(before, config(root)), String(before));
    } finally {
      cleanup(root);
    }
  }
});

test("configure restores the original bytes when the file does not read back as written", () => {
  // Two top-level ui: blocks: configure fills the first, yaml-subset reads the last, so the
  // keys written do not read back. Every value that cannot be stored is now a usage error before
  // the write, so an ambiguous file is the input left that reaches the restore.
  const cases = [
    "ui:\n  componentBarrel: b.ts\nother: 1\nui:\n  componentExclude: Provider\n",
    "develop:\r\n  x: 1\r\nui:\r\n  componentBarrel: b.ts\r\nui:\r\n  componentExclude: Provider\r\n",
  ];
  for (const before of cases) {
    const root = project({ "skills-config.yaml": before });
    try {
      const cli = runCli([
        "configure",
        ...flagsOf({ ...SETUP }),
        "--root",
        root,
        "--json",
      ]);
      assert.equal(cli.exitCode, 1, JSON.stringify(before));
      assert.equal(cli.payload.reason, "write-failed");
      assert.equal(config(root), before);
      assert.equal(configure(root, { decline: true }).reason, "write-failed");
      assert.equal(config(root), before);
    } finally {
      cleanup(root);
    }
  }
});

test("CLI: configure usage — --decline takes no value flags, and needs --map otherwise", () => {
  const root = project();
  try {
    assert.equal(runCli(["configure", "--root", root]).exitCode, 2);
    assert.equal(
      runCli(["configure", "--decline", "--map", "m.md", "--root", root])
        .exitCode,
      2,
    );
    assert.equal(runCli(["detect", "--decline", "--root", root]).exitCode, 2);
    assert.equal(existsSync(join(root, "skills-config.yaml")), false);
  } finally {
    cleanup(root);
  }
});

const CANDIDATE_STORY = [
  "# Story",
  "",
  "```wireloom",
  "window:",
  '  chip "Tag"',
  '  button "Go"',
  "```",
  "",
].join("\n");

const catalogueOf = (rows, section = "## Components") =>
  [
    section,
    "",
    "| Component | Tier | Use it for |",
    "| --- | --- | --- |",
    ...rows.map(([n, purpose]) => `| \`${n}\` | atoms | ${purpose} |`),
    "",
  ].join("\n");

function candidatesFor(rows, { map = null, section } = {}) {
  const files = {
    "docs/story.md": CANDIDATE_STORY,
    "docs/components.md": catalogueOf(rows, section),
  };
  if (map) files["docs/wireframe-map.md"] = map;
  const root = consumer({ files });
  try {
    const r = resolve(root, "docs/story.md");
    const of = (p) => r.unresolved.find((n) => n.signature === `window>${p}`);
    return { r, chip: of("chip").candidates, button: of("button").candidates };
  } finally {
    cleanup(root);
  }
}

test("resolve offers catalogue candidates on an empty map: name segments, then purpose words", () => {
  const { r, chip, button } = candidatesFor([
    ["Card", "A surface"],
    ["Pill", "A removable chip"],
    ["PillGroup", "Groups pills"],
    ["ChipRow", "Lays chips out"],
    // Control: the primitive inside a segment, and nowhere in the purpose, is not a match.
    ["Rechip", "Something else entirely"],
    ["Button", "A call to action"],
    ["IconButton", "An icon you press"],
    ["ButtonGroup", "Buttons side by side"],
    ["Rebutton", "A call to action, again"],
  ]);
  assert.equal(r.mapState, "missing");
  assert.equal(r.catalogueState, "ok");
  assert.deepEqual(
    chip.map((c) => [c.component, c.basis]),
    [
      ["ChipRow", "name"],
      ["Pill", "purpose"],
    ],
  );
  assert.deepEqual(
    button.map((c) => c.component),
    ["Button", "IconButton", "ButtonGroup"],
  );
  for (const c of [...chip, ...button]) {
    assert.equal(c.source, "catalogue");
    assert.equal(c.from, "catalogue");
    assert.equal(c.variant, "");
  }
});

test("resolve offers at most five catalogue candidates", () => {
  const names = ["A", "B", "C", "D", "E", "F", "G"].map((x) => [
    `${x}aChip`,
    "x",
  ]);
  const { chip } = candidatesFor(names);
  assert.equal(chip.length, 5);
});

test("near-miss candidates come first, keep their old shape, and are not repeated from the catalogue", () => {
  const map = [
    "| Signature | Label | Component | Variant / props | Source hint | Notes | Confirmed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| `chip{kind=x}` |  | ChipRow | dense |  |  | 2026-10-29, a |",
    "",
  ].join("\n");
  const { chip } = candidatesFor(
    [
      ["ChipRow", "Lays chips out"],
      ["Pill", "A removable chip"],
    ],
    { map },
  );
  assert.deepEqual(chip, [
    {
      component: "ChipRow",
      variant: "dense",
      from: "chip{kind=x}",
      source: "map",
    },
    {
      component: "Pill",
      variant: "",
      from: "catalogue",
      source: "catalogue",
      basis: "purpose",
    },
  ]);
});

test("near-miss output is unchanged apart from source, and a catalogue without its section offers none", () => {
  const root = consumer({ files: { "docs/wireframe-map.md": MAP } });
  try {
    const r = resolve(root, "docs/story.md");
    const strip = (n) =>
      n.candidates.map(({ source, ...rest }) => {
        assert.equal(source, "map");
        return rest;
      });
    const by = (label) => r.unresolved.find((n) => n.label === label);
    assert.deepEqual(
      strip(r.unresolved.find((n) => n.signature === "row>icon{name=leader}")),
      [{ component: "Icon", variant: "lock", from: "icon{name=lock}" }],
    );
    assert.deepEqual(strip(by("Family")), [
      { component: "Carousel", variant: "all slides", from: "text" },
      { component: "Heading", variant: "", from: "text[bold]" },
    ]);
  } finally {
    cleanup(root);
  }
  const { r, chip } = candidatesFor([["ChipRow", "x"]], {
    section: "## Something else",
  });
  assert.equal(r.catalogueState, "no-section");
  assert.deepEqual(chip, []);
});
