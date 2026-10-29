// Every skill that reads a Wireloom wireframe links its nodes to components through one procedure
// and one engine (task.243). A hook that drifts out of a skill, or a skill that cites the procedure
// without the engine it runs, fails here rather than in a consumer's pipeline.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.match(
    read("shared/resources/develop-pipeline-step-3-develop-loop.md"),
    /WIREFRAME_TABLE/,
  );
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
