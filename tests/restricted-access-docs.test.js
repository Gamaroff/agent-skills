"use strict";
/**
 * Restricted-access documentation drift guard.
 *
 * Motivation: ten consumer documents already restate pipeline behaviour
 * independently and have drifted silently. This sequence adds a concept page,
 * a decision guide, a runbook, and vocabulary that must stay aligned with
 * the five access modes the resolver actually accepts — not with a list
 * copied into this test.
 *
 * Scope is deliberately mechanical. A guard that grades style gets disabled.
 * It asserts:
 *   - every ACCESS_MODES entry in defer-mutation.js appears in the concept
 *     doc and in configuration.md;
 *   - yaml fences marked as access-model examples parse and use only those
 *     modes;
 *   - the page set is linked from the docs indexes;
 *   - `/tracker-reconcile` is registered honestly (live skill vs not shipped);
 *   - glossary carries the vocabulary the sequence introduced;
 *   - `deferred` is documented where reason codes are enumerated;
 *   - mermaid fences exist on the concept and decision pages.
 *
 * Mutation-prove: add a sixth mode in ACCESS_MODES without mentioning it in
 * the concept doc → red. Rename deferred on one side only → red. Drop a new
 * page from docs/README.md → red. Put `access.tracker: extra` in an example
 * → red.
 *
 * Deterministic and offline. Runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/restricted-access-docs.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const { ACCESS_MODES } = require("../shared/resources/defer-mutation.js");
const { parseYamlSubset } = require("../shared/resources/yaml-subset.js");

const CONCEPT = "docs/concepts/restricted-access.md";
const DECISION = "docs/concepts/which-access.md";
const RUNBOOK = "docs/runbooks/restricted-access.md";
const CONFIG = "docs/reference/configuration.md";
const COMMANDS = "docs/reference/commands.md";
const PHRASES = "docs/reference/activation-phrases.md";
const GLOSSARY = "docs/reference/glossary.md";
const TROUBLE = "docs/reference/troubleshooting.md";
const CATALOG = "docs/reference/skill-catalog.md";
const DOCS_INDEX = "docs/README.md";
const CONCEPTS_INDEX = "docs/concepts/README.md";
const RUNBOOKS_INDEX = "docs/runbooks/README.md";
const SKILL = "skills/tracker-reconcile/SKILL.md";

const VOCABULARY = [
  "access model",
  "handover",
  "deferred",
  "divergent",
  "unverifiable",
  "retry_of",
  "UNRECORDED",
  "tracker-reconcile",
];

const SEQUENCE_REASONS = ["deferred"];

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function fencedYaml(md, marker) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const a = md.indexOf(start);
  const b = md.indexOf(end);
  assert.ok(a !== -1, `${marker}:start marker missing`);
  assert.ok(b !== -1 && b > a, `${marker}:end marker missing`);
  const slice = md.slice(a + start.length, b);
  const blocks = [];
  const re = /```yaml\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(slice))) blocks.push(m[1]);
  return blocks;
}

test("ACCESS_MODES from code appear in the concept doc and configuration.md", () => {
  assert.ok(ACCESS_MODES.length >= 5, "resolver still ships the five modes");
  const concept = read(CONCEPT);
  const config = read(CONFIG);
  for (const mode of ACCESS_MODES) {
    assert.match(
      concept,
      new RegExp("`" + mode + "`"),
      `${CONCEPT} must mention access mode \`${mode}\``,
    );
    assert.match(
      config,
      new RegExp("`" + mode + "`|" + mode),
      `${CONFIG} must mention access mode ${mode}`,
    );
  }
});

test("access-model yaml examples parse and only use resolver modes", () => {
  const blocks = fencedYaml(read(CONFIG), "access-model-examples");
  assert.ok(blocks.length >= ACCESS_MODES.length, "one example per mode");
  const seen = new Set();
  for (const raw of blocks) {
    const obj = parseYamlSubset(raw);
    assert.ok(obj && obj.access, "example must have an access: block");
    const mode = obj.access.tracker;
    assert.ok(
      ACCESS_MODES.includes(mode),
      `example access.tracker: ${mode} is not a resolver mode`,
    );
    seen.add(mode);
  }
  for (const mode of ACCESS_MODES) {
    assert.ok(seen.has(mode), `no config example for access.tracker: ${mode}`);
  }
});

test("new pages are reachable from the docs indexes", () => {
  const docs = read(DOCS_INDEX);
  const concepts = read(CONCEPTS_INDEX);
  const runbooks = read(RUNBOOKS_INDEX);
  assert.match(docs, /restricted-access\.md/);
  assert.match(docs, /which-access\.md/);
  assert.match(docs, /runbooks\/restricted-access\.md/);
  assert.match(concepts, /restricted-access\.md/);
  assert.match(concepts, /which-access\.md/);
  assert.match(runbooks, /restricted-access\.md/);
  assert.ok(exists(CONCEPT));
  assert.ok(exists(DECISION));
  assert.ok(exists(RUNBOOK));
});

test("tracker-reconcile is registered honestly", () => {
  const commands = read(COMMANDS);
  const phrases = read(PHRASES);
  const catalog = exists(CATALOG) ? read(CATALOG) : "";
  const concept = read(CONCEPT);
  const runbook = read(RUNBOOK);
  assert.match(commands, /tracker-reconcile/);
  assert.match(phrases, /tracker-reconcile/);
  assert.match(concept, /tracker-reconcile/);
  assert.match(runbook, /tracker-reconcile/);
  if (exists(SKILL)) {
    assert.match(
      catalog,
      /tracker-reconcile/,
      "live skill must appear in the generated catalog",
    );
    assert.doesNotMatch(
      commands,
      /not shipped/i,
      "live /tracker-reconcile must not be labelled not shipped",
    );
  } else {
    assert.match(
      commands,
      /not shipped|task\.57/i,
      "absent skill must be labelled not shipped (task.57) in commands.md",
    );
    assert.doesNotMatch(
      catalog,
      /tracker-reconcile/,
      "catalog must not list a skill that does not exist",
    );
  }
});

test("glossary carries the restricted-access vocabulary", () => {
  const glossary = read(GLOSSARY).toLowerCase();
  for (const term of VOCABULARY) {
    assert.ok(
      glossary.includes(term.toLowerCase()),
      `glossary.md missing term: ${term}`,
    );
  }
});

test("sequence reason codes are enumerated in troubleshooting.md", () => {
  const trouble = read(TROUBLE);
  for (const reason of SEQUENCE_REASONS) {
    assert.match(
      trouble,
      new RegExp("`" + reason + "`|" + reason),
      `troubleshooting.md must document reason ${reason}`,
    );
  }
});

test("concept and decision pages include a mermaid diagram", () => {
  assert.match(read(CONCEPT), /```mermaid/);
  assert.match(read(DECISION), /```mermaid/);
  assert.match(read(RUNBOOK), /```mermaid/);
});