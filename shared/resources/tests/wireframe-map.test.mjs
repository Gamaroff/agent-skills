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
