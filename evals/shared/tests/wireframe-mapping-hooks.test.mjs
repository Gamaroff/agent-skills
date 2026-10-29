// Every skill that reads a Wireloom wireframe links its nodes to components through one procedure
// and one engine (task.243). A hook that drifts out of a skill, or a skill that cites the procedure
// without the engine it runs, fails here rather than in a consumer's pipeline.
import test from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// The skill and the phrase that marks its hook. Each phrase is the step's own wording, so the
// test fails when the step is removed, not when it is reworded around the anchor.
const HOOKS = [
  ["create-story", "Link the wireframe's nodes to components"],
  ["create-task", "Link the wireframe's nodes to components"],
  ["review-story", "Check the wireframe's nodes are linked to components"],
  ["review-task", "Step 6.6: Wireframe Component Links"],
  ["qa-story", "Wireframe conformance"],
  ["qa-task", "Wireframe conformance"],
  ["develop-story", "0c-wire resolves its nodes to components"],
  ["develop-task", "0c-wire resolves its nodes to components"],
];

for (const [skill, phrase] of HOOKS) {
  test(`${skill} carries its wireframe-mapping hook and the files it runs`, () => {
    const body = read(`skills/${skill}/SKILL.md`);
    assert.ok(body.includes(phrase), `${skill}/SKILL.md lost "${phrase}"`);
    for (const file of [
      "wireframe-map.js",
      "wireframe-component-mapping.md",
      "yaml-subset.js",
    ])
      assert.ok(
        existsSync(join(ROOT, "skills", skill, "references", file)),
        `${skill} cites the procedure but references/${file} is not bundled`,
      );
  });
}

test("the hooks are off unless ui.wireframeMap is set", () => {
  for (const [skill] of HOOKS) {
    const body = read(`skills/${skill}/SKILL.md`);
    assert.match(
      body,
      /ui\.wireframeMap/,
      `${skill} does not gate on ui.wireframeMap`,
    );
  }
});

test("develop Phase 0 resolves in 0c-wire and asks in 0d", () => {
  const step0 = read(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  const wire = step0.indexOf("## 0c-wire.");
  const ask = step0.indexOf("## 0d.");
  assert.ok(wire > 0 && wire < ask, "0c-wire must come before 0d");
  assert.match(step0.slice(ask), /\*\*Wireframe questions\*\*/);
  assert.match(
    read("shared/resources/develop-pipeline-autonomous-defaults.md"),
    /Wireframe node with no confirmed component/,
  );
  // The answers are written at Step 1, before Step 2's review reads the document (QA cycle 3,
  // CR3-2); Step 3 builds from the table they completed.
  const step1 = read(
    "shared/resources/develop-pipeline-step-1-create-branch.md",
  );
  const writes = step1.indexOf("## Wireframe writes");
  assert.ok(
    writes > 0 && writes < step1.indexOf("## Post-Branch Steps"),
    "Step 1 writes the held answers before it is marked done",
  );
  assert.match(
    read("shared/resources/develop-pipeline-step-3-develop-loop.md"),
    /document's component table, which Step 1 completed/,
  );
});

// The bash block under a step doc's heading, placeholders filled, as a consumer would run it.
const stepBlock = (rel, from, to) => {
  const doc = read(rel);
  const start = doc.indexOf(from);
  assert.ok(start >= 0, `${rel} lost "${from}"`);
  const end = to ? doc.indexOf(to, start) : doc.length;
  const fence = /```bash\n([\s\S]*?)\n```/.exec(doc.slice(start, end));
  assert.ok(fence, `${from} has no bash block`);
  const block = fence[1]
    .replaceAll("{develop-story|develop-task}", "develop-task")
    .replaceAll("{document-file}", "docs/story.md");
  assert.ok(!/\{[\w|-]+\}/.test(block), `unfilled placeholder in:\n${block}`);
  return block;
};

// A consumer that has turned the feature on and has no catalogue or map yet: the case where
// `ensure` would create both.
const consumer = () => {
  const dir = mkdtempSync(join(tmpdir(), "wf-develop-"));
  const refs = join(dir, ".agents/skills/develop-task/references");
  mkdirSync(refs, { recursive: true });
  for (const f of ["wireframe-map.js", "yaml-subset.js"])
    copyFileSync(join(ROOT, "shared/resources", f), join(refs, f));
  mkdirSync(join(dir, "docs"));
  mkdirSync(join(dir, "src"));
  writeFileSync(
    join(dir, "skills-config.yaml"),
    "ui:\n  componentCatalogue: docs/components.md\n  componentBarrel: src/index.ts\n" +
      "  wireframeMap: docs/wireframe-map.md\n",
  );
  writeFileSync(
    join(dir, "src/index.ts"),
    "export const Button = () => null;\n",
  );
  writeFileSync(
    join(dir, "docs/story.md"),
    '# Story\n\n```wireloom\nwindow:\n  button "Done" primary\n```\n',
  );
  return dir;
};

// Every file a commit could pick up: all of the checkout except the ignored pipeline state.
const trackable = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((p) => !p.startsWith(".claude") && !p.startsWith(".agents"))
    .sort();

const run = (dir, block) => {
  const r = spawnSync("bash", ["-c", block], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
};

// The 0c-wire block runs as delivered in a consumer checkout with no .claude/state directory, and
// writes nothing a commit could pick up: Step 1's /create-branch halts on any such file, and the
// branch does not exist yet (QA cycle 2, CR2-1).
test("the 0c-wire block runs in a fresh checkout and writes no tracked file", () => {
  const block = stepBlock(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "## 0c-wire.",
    "## 0d.",
  );
  const dir = consumer();
  try {
    const before = trackable(dir);
    assert.equal(existsSync(join(dir, ".claude/state")), false);
    run(dir, block);
    const out = JSON.parse(
      readFileSync(join(dir, ".claude/state/wireframe-map.json"), "utf8"),
    );
    assert.equal(out.reason, "ok");
    assert.ok(
      out.unresolved.some((n) => n.signature === "window>button[primary]"),
      JSON.stringify(out.unresolved),
    );
    assert.deepEqual(trackable(dir), before, "Phase 0 wrote a tracked file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const HELD = ".claude/state/wireframe-answers.json";
const hold = (dir, document) => {
  mkdirSync(join(dir, ".claude/state"), { recursive: true });
  writeFileSync(
    join(dir, HELD),
    JSON.stringify({
      document,
      answers: [{ signature: "*>button", component: "Button" }],
    }),
  );
};

// A fresh run starts with no held answers: a file left by a run that never reached Step 1 would
// otherwise be written into this run's document (QA cycle 3, CR3-3).
test("a fresh 0c-wire discards a held answers file left by an earlier run", () => {
  const block = stepBlock(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "## 0c-wire.",
    "## 0d.",
  );
  const dir = consumer();
  try {
    hold(dir, "docs/other.md");
    run(dir, block);
    assert.equal(existsSync(join(dir, HELD)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const step1Block = () =>
  stepBlock(
    "shared/resources/develop-pipeline-step-1-create-branch.md",
    "## Wireframe writes",
    "## Post-Branch Steps",
  );

// The writes Phase 0 defers happen at Step 1, on the branch. They are gated on the held file, not on
// 0c-wire having run in this session, so a resumed run (which skips Phase 0) still makes them
// (QA cycle 3, CR3-1): this run has no Phase 0 at all.
test("Step 1's wireframe writes create the catalogue and map, and keep this document's answers", () => {
  const dir = consumer();
  try {
    hold(dir, "docs/story.md");
    run(dir, step1Block());
    assert.match(
      readFileSync(join(dir, "docs/components.md"), "utf8"),
      /Button/,
    );
    assert.ok(existsSync(join(dir, "docs/wireframe-map.md")));
    assert.ok(
      existsSync(join(dir, HELD)),
      "this document's answers were discarded",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Step 1's wireframe writes discard another document's held answers", () => {
  const dir = consumer();
  try {
    hold(dir, "docs/other.md");
    run(dir, step1Block());
    assert.equal(existsSync(join(dir, HELD)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unattended assumption is flagged, never recorded as confirmed", () => {
  const proc = read("shared/resources/wireframe-component-mapping.md");
  assert.match(
    proc,
    /Do not record it in the map: an assumption is not a confirmation/,
  );
  // A Decisions Log subsection, not a report section: report-lint holds the sections to the template.
  assert.doesNotMatch(
    read("shared/resources/implementation-report-template.md"),
    /Wireframe mapping assumptions/,
  );
  for (const rel of [
    "shared/resources/develop-pipeline-autonomous-defaults.md",
    "shared/resources/pr-conformance-prompt.md",
    "skills/qa-story/SKILL.md",
    "skills/qa-task/SKILL.md",
  ])
    assert.match(read(rel), /`### Wireframe mapping assumptions`/, rel);
});

test("the configuration reference documents every ui key the engine reads", () => {
  const doc = read("docs/reference/configuration.md");
  const engine = read("shared/resources/wireframe-map.js");
  const keys = [...engine.matchAll(/\bui\.(\w+)/g)].map((m) => m[1]);
  assert.ok(keys.length >= 6, "engine names its ui keys");
  for (const key of new Set(keys))
    assert.ok(
      doc.includes(`\`ui.${key}\``),
      `configuration.md does not document ui.${key}`,
    );
});
