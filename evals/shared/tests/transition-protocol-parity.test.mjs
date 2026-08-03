"use strict";
/**
 * Asserts that the prose transition protocol and the JS implementation agree.
 *
 * `jira-transition-protocol.md` has always claimed "the two must stay in step —
 * same order, same rules, same refusals", and until now NOTHING checked it. The
 * prose is the fallback path taken when jira-stage.js reports no-credentials,
 * so a drift here means two consumers of the same board resolve a stage
 * differently depending on whether an API token happens to be present — the
 * hardest class of bug to reproduce, because it depends on the environment
 * rather than the input.
 *
 * The candidate lists are the part that drifts. They are literals in the prose
 * and frozen constants in the JS, edited by different people at different
 * times, and a wrong ORDER is as harmful as a wrong name: destination matching
 * walks candidates in sequence, so reordering silently changes which column a
 * card lands in on any board that has two of them.
 *
 * Also asserts every `--stage <name>` literal in the pipeline step markdown
 * names a stage that actually exists. A typo there is invisible — the CLI exits
 * 2, the pipeline shrugs, and the card simply never moves.
 *
 * Run: node --test evals/shared/tests/transition-protocol-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const sharedDir = join(repoRoot, "shared", "resources");

const lib = require(join(sharedDir, "jira-sync.js"));
const protocol = readFileSync(
  join(sharedDir, "jira-transition-protocol.md"),
  "utf-8",
);

/** Pull the `["A", "B"]` literal that follows a given bullet label. */
function candidatesAfter(label) {
  const line = protocol
    .split("\n")
    .find((l) => l.includes(label) && l.includes("["));
  assert.ok(line, `no candidate line found for "${label}"`);
  const raw = line.slice(line.indexOf("["), line.lastIndexOf("]") + 1);
  return JSON.parse(raw);
}

const PAIRS = [
  ["Signal Work Started →", "work-started"],
  ["PR opened →", "in-review"],
  ["Finalise →", "done"],
];

for (const [label, stage] of PAIRS) {
  test(`prose candidates for "${label}" match stage ${stage} exactly, in order`, () => {
    const fromProse = candidatesAfter(label);
    const fromCode = lib.resolveStage({ stage }).candidates;
    assert.deepEqual(
      fromProse,
      [...fromCode],
      `jira-transition-protocol.md and DEFAULT_STAGE_MAP.${stage} have drifted. ` +
        `Order matters: destination matching walks candidates in sequence.`,
    );
  });
}

test("every --stage literal in shipped markdown names a real stage", () => {
  const known = new Set(lib.STAGE_NAMES);
  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        scan(p);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const text = readFileSync(p, "utf-8");
      for (const m of text.matchAll(/--stage\s+([a-z][a-z-]*)/g)) {
        if (!known.has(m[1])) offenders.push(`${p}: --stage ${m[1]}`);
      }
    }
  };
  scan(join(repoRoot, "shared", "resources"));
  scan(join(repoRoot, "skills"));
  assert.deepEqual(
    offenders,
    [],
    `Unknown stage name(s). Known: ${[...known].join(", ")}`,
  );
});

test("the protocol still declares itself the fallback, not the primary path", () => {
  // If someone re-promotes this document, the CLI stops being authoritative and
  // the determinism it buys is quietly lost.
  assert.match(protocol, /fallback path, not the primary one/i);
  assert.match(protocol, /no-credentials/);
});
