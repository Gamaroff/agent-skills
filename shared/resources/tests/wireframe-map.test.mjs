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
} = require(SCRIPT);

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
