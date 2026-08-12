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

/**
 * Collect every shipped markdown file under shared/resources/ and skills/.
 * Bundled `references/` copies are included deliberately: a consumer installs
 * those, not the source, so a stale bundle is exactly the failure this catches.
 */
function shippedMarkdown() {
  const out = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        scan(p);
        continue;
      }
      if (entry.name.endsWith(".md")) out.push(p);
    }
  };
  scan(join(repoRoot, "shared", "resources"));
  scan(join(repoRoot, "skills"));
  return out;
}

// Absence alone is a bad guard — v0.33 records one that passed vacuously and
// flagged the very sentence that got it right. So this is PAIRED: no inline
// board Status mutation anywhere, AND each site positively invokes the CLI.
test("no shipped markdown carries an inline board Status mutation", () => {
  const offenders = [];
  for (const f of shippedMarkdown()) {
    const src = readFileSync(f, "utf-8");
    if (!src.includes("updateProjectV2ItemFieldValue")) continue;
    // `"Status"` is the tell: the mutation is selecting the Status single-select
    // field. Mutations of Priority/Estimate legitimately remain inline — they
    // are a different concern and gh-stage.js deliberately does not own them.
    if (/"Status"/.test(src)) offenders.push(f);
  }
  assert.deepEqual(
    offenders,
    [],
    "Inline board Status mutation found. Board moves go through gh-stage.js " +
      "(--stage <moment>) so the consumer's tracker-workflow.yaml resolves the " +
      "column. Priority/Estimate mutations may stay inline.",
  );
});

test("each pipeline site positively invokes gh-stage.js for its moment", () => {
  const sites = [
    ["develop-pipeline-step-0-resolve-and-prepare.md", "work-started"],
    ["develop-pipeline-step-4-create-pr.md", "in-review"],
    ["develop-pipeline-step-5-6-qa-loop.md", "in-review"],
    ["develop-pipeline-step-7-finalise.md", "done"],
  ];
  for (const [file, stage] of sites) {
    const src = readFileSync(join(sharedDir, file), "utf-8");
    assert.match(
      src,
      new RegExp(`gh-stage\\.js[\\s\\S]{0,160}--stage ${stage}`),
      `${file} must invoke gh-stage.js --stage ${stage}`,
    );
  }
  // finalise is skill-native, not a shared step file, and uses its own
  // `.agents/skills/finalise/references/` path — the brace form the step files
  // use does not cover it.
  const finalise = readFileSync(
    join(repoRoot, "skills", "finalise", "SKILL.md"),
    "utf-8",
  );
  assert.match(
    finalise,
    /gh-stage\.js[\s\S]{0,160}--stage done/,
    "skills/finalise/SKILL.md must invoke gh-stage.js --stage done",
  );
  assert.match(
    finalise,
    /\.agents\/skills\/finalise\/references\/gh-stage\.js/,
    "finalise must reference its own bundled copy, not the develop-* brace path",
  );
});

test("the step-4 hand-edit instruction is gone", () => {
  // The clearest statement of the problem this task fixed: it told readers to
  // hand-edit a jq selector to match their board's column name. Its removal is
  // the acceptance criterion.
  for (const f of shippedMarkdown()) {
    const src = readFileSync(f, "utf-8");
    assert.ok(
      !src.includes('select(.name == "In Review")'),
      `${f} still tells the reader to hand-edit an option-name selector`,
    );
  }
});

test("gh-stage.js is bundled wherever a skill invokes it", () => {
  const missing = [];
  for (const skill of readdirSync(join(repoRoot, "skills"))) {
    const skillDir = join(repoRoot, "skills", skill);
    let files;
    try {
      files = readdirSync(skillDir, { recursive: true });
    } catch {
      continue;
    }
    const invokes = files.some((rel) => {
      if (typeof rel !== "string" || !rel.endsWith(".md")) return false;
      if (rel.split(/[\\/]/).includes("references")) return false;
      return readFileSync(join(skillDir, rel), "utf-8").includes(
        "gh-stage.js --",
      );
    });
    if (!invokes) continue;
    try {
      readFileSync(join(skillDir, "references", "gh-stage.js"));
    } catch {
      missing.push(skill);
    }
  }
  assert.deepEqual(
    missing,
    [],
    "Skill invokes gh-stage.js but has no bundled references/gh-stage.js. " +
      "The bundler only follows `shared/resources/X` paths, so a step file must " +
      "name `shared/resources/gh-stage.js` somewhere for it to be copied.",
  );
});

test("the protocol still declares itself the fallback, not the primary path", () => {
  // If someone re-promotes this document, the CLI stops being authoritative and
  // the determinism it buys is quietly lost.
  assert.match(protocol, /fallback path, not the primary one/i);
  assert.match(protocol, /no-credentials/);
});

// --- --print-plan parity ---------------------------------------------------
//
// The prose now tells the fallback to take its candidates from
// `jira-stage.js --print-plan` rather than from the literals below it, keeping
// the literals only as the no-file default. That makes the CLI's DEFAULT output
// the thing that must match the prose — a second drift surface, and the one a
// reader following the document actually consumes.

const cli = require(join(sharedDir, "jira-stage.js"));
const tw = require(join(sharedDir, "tracker-workflow.js"));
const { parseYamlSubset } = require(join(sharedDir, "yaml-subset.js"));

/**
 * A workflow built from an EMPTY document — the built-in default ladder.
 *
 * Deliberately not `loadWorkflow({})`: this repo dogfoods its own
 * tracker-workflow.yaml, so loading from disk would test this board's three
 * columns rather than the defaults the prose documents.
 */
const defaultWorkflow = tw.buildWorkflow(parseYamlSubset(""), {
  source: "default",
  path: "<default>",
});

for (const [label, stage] of PAIRS) {
  test(`--print-plan default targets for "${label}" match the prose literal`, () => {
    const { spec } = cli.resolveMomentSpec({
      stage,
      issueType: "",
      record: {},
      workflow: defaultWorkflow,
    });
    assert.deepEqual(
      candidatesAfter(label),
      [...spec.candidates],
      `The prose literal and what --print-plan would print for stage ${stage} have drifted. ` +
        `A reader following the document would feed different candidates than the CLI resolves.`,
    );
  });
}

test("--print-plan without --from reports the target rung alone", () => {
  // planMove has no starting point, so there is nothing to span. The output must
  // say so via spansFrom rather than letting a one-element plan read as "this
  // moment is one hop from where the card is".
  const { spec } = cli.resolveMomentSpec({
    stage: "done",
    issueType: "",
    record: {},
    workflow: defaultWorkflow,
  });
  const hops = cli.planHops({
    from: "",
    targets: spec.candidates,
    workflow: defaultWorkflow,
    issueType: "",
  });
  assert.equal(hops.length, 1, "the target rung, and nothing else");
  assert.deepEqual(hops[0], [...spec.candidates]);
});

test("--print-plan with --from spans the real ladder distance", () => {
  const wf = tw.buildWorkflow(
    parseYamlSubset(`
statuses:
  - Backlog
  - In Progress
  - Ready for Showcase
  - Waiting for Review
  - Done

pipeline:
  in-review: Waiting for Review
`),
    { source: "file", path: "<test>" },
  );
  const { spec } = cli.resolveMomentSpec({
    stage: "in-review",
    issueType: "",
    record: {},
    workflow: wf,
  });

  const spanned = cli.planHops({
    from: "In Progress",
    targets: spec.candidates,
    workflow: wf,
    issueType: "",
  });
  assert.deepEqual(
    spanned,
    [["Ready for Showcase"], ["Waiting for Review"]],
    "the gate, then the target",
  );

  // Same moment, same board, no --from: one hop. This is the pair the prose's
  // "--from is not optional" rule exists for — without it the multi-hop check
  // reads a two-hop walk as a one-hop move and the fallback fires blind.
  const unspanned = cli.planHops({
    from: "",
    targets: spec.candidates,
    workflow: wf,
    issueType: "",
  });
  assert.equal(unspanned.length, 1);
});

test("the prose states the one-hop limit and the terminal override", () => {
  // Both are rules a model can only follow if they are actually written down.
  assert.match(protocol, /multi-hop walk the MCP fallback cannot perform/);
  assert.match(protocol, /MUST NOT\*\* perform more than one transition per invocation/);
  assert.match(protocol, /isLastRung/);
  assert.match(protocol, /--print-plan/);
  assert.match(protocol, /--from/);
});

test("the prose tells the fallback to pass --issue-type, and to honour enabled:false", () => {
  // Both are load-bearing against the SAME unrecoverable outcome the CLI path
  // guards. Drop --issue-type and no byIssueType overlay applies: a moment
  // retargeted for one issue type resolves to the base answer with
  // `terminal: true`, and rule 5 fires the board's real Done on an issue whose
  // author deliberately routed it elsewhere. Ignore `enabled: false` and a
  // moment the consumer switched off fires from the default lists.
  assert.match(protocol, /--issue-type/);
  assert.match(protocol, /`--issue-type` is not optional/);
  assert.match(protocol, /enabled: false/);
  // The command the model is told to run must itself carry both flags — a rule
  // stated in prose but absent from the copy-pasteable command is a rule that
  // will not be followed. The invocation is line-wrapped, so match the block.
  const at = protocol.indexOf("jira-stage.js --stage");
  assert.notEqual(at, -1, "no --print-plan invocation found in the protocol");
  const block = protocol.slice(at, at + 220);
  assert.match(block, /--print-plan/);
  assert.match(block, /--from/);
  assert.match(block, /--issue-type/);
});
