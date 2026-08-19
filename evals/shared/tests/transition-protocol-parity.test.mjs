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
  // Two CLIs take `--stage`, and their value domains differ on purpose.
  // gh-stage/jira-stage take a BOARD MOMENT; tracker-comment takes a COMMENT
  // IDENTITY, whose namespace is a superset — a QA cycle is worth commenting on
  // without being worth a column. Validating every literal against the board
  // set would force comment-only moments to invent columns nobody wants, so the
  // check resolves which CLI each literal belongs to first.
  const boardStages = new Set(lib.STAGE_NAMES);
  const commentCli = require(join(sharedDir, "tracker-comment.js"));
  const commentStages = new Set(commentCli.COMMENT_STAGES);
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
        // Which CLI is this literal an argument to? The nearest CLI filename in
        // the preceding window wins; absent one, assume a board stage, which
        // keeps the original strictness as the default rather than the
        // exception.
        // Attribution ignores blockquote lines. The boilerplate
        // "> Engine source: `…/tracker-comment.js` …" note sits immediately
        // above or below most stage invocations, so counting it would
        // misattribute a genuine BOARD call to the comment namespace whenever
        // the stage name happens to exist in both — a false pass on a call that
        // would exit 2 at runtime.
        const before = text
          .slice(Math.max(0, m.index - 240), m.index)
          .split("\n")
          .filter((l) => !l.trim().startsWith(">"))
          .join("\n");
        const lastComment = before.lastIndexOf("tracker-comment.js");
        const lastBoard = Math.max(
          before.lastIndexOf("gh-stage.js"),
          before.lastIndexOf("jira-stage.js"),
        );
        const isComment = lastComment > lastBoard;
        // `--stage qa-cycle-{N}` captures a trailing hyphen before the
        // placeholder; cycle-scoped stages are legitimately dynamic, because
        // cycle 2 must not be suppressed by cycle 1's marker.
        const name = m[1].replace(/-$/, "");
        const known = isComment ? commentStages : boardStages;
        if (!known.has(name)) {
          offenders.push(
            `${p}: --stage ${m[1]} (${isComment ? "comment" : "board"} stage)`,
          );
        }
      }
    }
  };
  scan(join(repoRoot, "shared", "resources"));
  scan(join(repoRoot, "skills"));
  assert.deepEqual(
    offenders,
    [],
    `Unknown stage name(s).\n  board: ${[...boardStages].join(", ")}\n  comment: ${[...commentStages].join(", ")}`,
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
  // Scoped to the FENCED BLOCK holding the mutation, not the whole file. A
  // file-wide check passes today only because step-0 happens to contain no bare
  // `"Status"` literal alongside the Priority mutation it legitimately retains —
  // prose added later would false-positive it. Same fragility, and same fix, as
  // the --allow-regress guard below.
  const offenders = [];
  for (const f of shippedMarkdown()) {
    const src = readFileSync(f, "utf-8");
    if (!src.includes("updateProjectV2ItemFieldValue")) continue;
    for (const block of src.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
      const code = block[1];
      if (!code.includes("updateProjectV2ItemFieldValue")) continue;
      // `"Status"` inside the mutating block is the tell: it selects the Status
      // single-select field. Priority/Estimate mutations legitimately remain
      // inline — a different concern gh-stage.js deliberately does not own.
      if (/"Status"/.test(code)) offenders.push(f);
    }
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
    ["develop-pipeline-step-5-6-qa-loop.md", "changes-requested"],
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

// ── task.41: the two moments wired last, and the QA-loop parity they complete ──

test("`pr-merged` fires from the orchestrators that merge, and from nowhere else", () => {
  // It cannot fire from a develop-* pipeline: those finish while the PR is still
  // open. Only /develop-next and /develop-batch reach a merged PR.
  for (const skill of ["develop-next", "develop-batch"]) {
    const src = readFileSync(
      join(repoRoot, "skills", skill, "SKILL.md"),
      "utf-8",
    );
    assert.match(
      src,
      /--stage pr-merged/,
      `skills/${skill}/SKILL.md must signal pr-merged after its merge`,
    );
  }
  for (const f of shippedMarkdown()) {
    const name = String(f);
    if (name.includes("develop-next") || name.includes("develop-batch"))
      continue;
    const src = readFileSync(f, "utf-8");
    // Prose may *discuss* the moment (the QA loop's ordering note does); only a
    // fenced invocation is a call site.
    for (const block of src.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
      assert.ok(
        !/--stage pr-merged/.test(block[1]),
        `${name} invokes --stage pr-merged, but only the merging orchestrators may`,
      );
    }
  }
});

test("`--stage pr-merged` sits INSIDE develop-batch's per-item merge loop", () => {
  // The Critical risk in task.41 §10: develop-batch merges serially in a loop.
  // Hoisting this call out of the loop moves whichever card was last in scope —
  // on a shared board, someone else's — and reports success either way.
  const src = readFileSync(
    join(repoRoot, "skills", "develop-batch", "SKILL.md"),
    "utf-8",
  );
  const loopStart = src.indexOf("merge one PR at a time");
  const loopEnd = src.indexOf("## Step 4 — Clean up worktrees");
  assert.ok(
    loopStart > -1 && loopEnd > loopStart,
    "per-item merge lane not found",
  );
  const body = src.slice(loopStart, loopEnd);
  assert.match(
    body,
    /--stage pr-merged/,
    "pr-merged must be invoked inside the per-item serial merge lane",
  );
  assert.match(
    body,
    /ITEM_TRACKER_ISSUE/,
    "the call must be keyed on THIS item's issue, never a batch-level variable",
  );
});

test("every pipeline with a verify/QA loop signals the same moments", () => {
  // The task.41 parity requirement. develop-bug's verify loop is the analogue of
  // the story/task QA loop — same entry, same passing exit — and signalled
  // nothing at all for a whole release because it is skill-native and nobody
  // noticed the shared step file had moved on without it.
  const loops = [
    join(sharedDir, "develop-pipeline-step-5-6-qa-loop.md"),
    join(
      repoRoot,
      "skills",
      "develop-bug",
      "references",
      "develop-bug-step-5-6-verify-loop.md",
    ),
  ];
  for (const f of loops) {
    const src = readFileSync(f, "utf-8");
    for (const stage of ["in-qa", "changes-requested", "ready-for-merge"]) {
      assert.match(
        src,
        new RegExp(`--stage ${stage}`),
        `${f} must signal ${stage} — every verify/QA loop signals the same moments, ` +
          "or states in prose why not",
      );
    }
  }
});

test("no pipeline step passes --allow-regress", () => {
  // The QA-start re-assert is the site that used to force-write "In Review"
  // over whatever column a card was on. `--allow-regress` there would restore
  // exactly that behaviour, and the positive per-site guard above would still
  // pass because the `--stage in-review` literal is unchanged. This asserts the
  // absence directly. --allow-regress is for a deliberate operator reset, never
  // for an automated step.
  // Scan FENCED CODE BLOCKS ONLY. Prose that *mentions* the flag is not just
  // allowed, it is required — step 5-6 explains why the flag is absent and when
  // an operator would use it. A naive proximity window matches that sentence and
  // fails on the very text that documents the correct behaviour, which is the
  // v0.33 guard failure inverted. The invocation lives in a ```bash block; the
  // explanation never does.
  const offenders = [];
  for (const f of shippedMarkdown()) {
    const src = readFileSync(f, "utf-8");
    for (const block of src.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
      const code = block[1];
      if (!code.includes("gh-stage.js")) continue;
      if (!/--allow-regress/.test(code)) continue;
      offenders.push(`${f}: ${code.trim().split("\n")[0].slice(0, 60)}…`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "A pipeline step invokes gh-stage.js with --allow-regress. That disables " +
      "the backward-move guard and reinstates the force-write behaviour task.40 " +
      "removed. The flag is for deliberate operator resets only.",
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
  assert.match(
    protocol,
    /MUST NOT\*\* perform more than one transition per invocation/,
  );
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

// ---------------------------------------------------------------------------
// Comment parity (task 55)
//
// The same guard shape as the board-mutation one above, for the same reason.
// Before task 55 every Jira comment was an `addCommentToJiraIssue` MCP call an
// agent made by following prose — roughly two dozen of them, hand-written and
// already drifted (one site used raw `curl` against REST v2 while the rest used
// MCP). Rewriting them once fixes nothing on its own: without a guard the next
// feature adds a comment the old way and the count climbs back one PR at a time.
//
// PAIRED, deliberately: absence alone is a vacuous guard, so this asserts both
// that no bare MCP comment call survives AND that the sites positively invoke
// the CLI.
// ---------------------------------------------------------------------------

// Prose files where naming the MCP tool is the POINT, not a regression.
const MCP_COMMENT_ALLOWLIST = [
  // Documents the fallback contract itself.
  "shared/resources/tracker-comment-contract.md",
  // Its own examples — the transition protocol references the comment path to
  // say the transition may be skipped while the comment still runs.
  "shared/resources/jira-transition-protocol.md",
];

function isAllowlisted(file) {
  const rel = file.slice(repoRoot.length + 1).split("\\").join("/");
  return MCP_COMMENT_ALLOWLIST.some(
    (a) => rel === a || rel.endsWith(`/references/${a.split("/").pop()}`),
  );
}

test("no shipped markdown calls addCommentToJiraIssue outside the two allowlisted docs", () => {
  // An ABSOLUTE prohibition, not a proximity heuristic — and that is the whole
  // point of this version.
  //
  // The first cut of this guard accepted a mention when the literal
  // `no-credentials` appeared within 12 lines above it. That read as a
  // structural check ("the MCP call is only reachable through the fallback
  // branch") but was not one: every rewritten site ends with a reason table
  // containing a `no-credentials` row, so the window was pre-satisfied at
  // roughly sixteen sites by construction. Re-inserting the verbatim pre-task
  // bare MCP block immediately after step-0's reason table produced ZERO
  // offenders — the guard passed on the exact regression it names.
  //
  // That is this repository's documented failure mode in its passive form: a
  // check satisfied by the very sentence that documents the correct behaviour.
  // The fix is not a cleverer window. It is to keep the fallback procedure in
  // ONE canonical file, so the rule becomes "the literal must not appear
  // anywhere else" — which nothing can satisfy by accident.
  const offenders = [];
  for (const f of shippedMarkdown()) {
    if (isAllowlisted(f)) continue;
    const lines = readFileSync(f, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("addCommentToJiraIssue")) {
        offenders.push(`${f.slice(repoRoot.length + 1)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `addCommentToJiraIssue outside the allowlist. Route the comment through ` +
      `tracker-comment.js; the MCP fallback is documented once, in ` +
      `tracker-comment-contract.md — do not restate it at the call site:\n  ${offenders.join("\n  ")}`,
  );
});

test("no shipped markdown posts a Jira comment with a raw curl", () => {
  // The site this replaces (skills/review-task/SKILL.md) used REST v2 with a
  // plain-string body, so it was invisible to BOTH interception layers — it
  // went through neither jira-sync.js's http() nor a `gh` call that
  // resolve-platform.sh's tracker_write could wrap.
  const offenders = [];
  for (const f of shippedMarkdown()) {
    if (isAllowlisted(f)) continue;
    const lines = readFileSync(f, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (!/rest\/api\/\d\/issue\/[^\s"']*\/comment/.test(line)) return;
      // A markdown TABLE ROW naming the endpoint is documentation, not a call —
      // tracker-access-record.md's roster has an "endpoint" column, and the
      // `jira.comment.add` row legitimately names this URL.
      //
      // But "starts with a pipe" alone was too broad: a table CELL is a
      // perfectly followable instruction for an agent, and this repo's step
      // docs routinely put commands in cells, so a real curl hidden in a row
      // slipped straight through. Skip a row only when it carries no invocation
      // verb — the roster row it protects contains none of these.
      const INVOCATION = /\bcurl\b|-X\s*POST|--data|-d\s/;
      if (line.trim().startsWith("|") && !INVOCATION.test(line)) return;
      offenders.push(`${f.slice(repoRoot.length + 1)}:${i + 1}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `Raw Jira comment REST call(s) — route through tracker-comment.js:\n  ${offenders.join("\n  ")}`,
  );
});

test("each pipeline comment site positively invokes tracker-comment.js", () => {
  // The positive half. Every step doc that had a comment site must still have
  // one — a rewrite that deleted the comment instead of routing it would pass
  // the two negative guards above and silently stop commenting.
  const REQUIRED = [
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
    "shared/resources/develop-pipeline-step-2-review.md",
    "shared/resources/develop-pipeline-step-3-develop-loop.md",
    "shared/resources/develop-pipeline-step-4-create-pr.md",
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    "shared/resources/develop-pipeline-step-7-finalise.md",
  ];
  const missing = REQUIRED.filter(
    (rel) => !readFileSync(join(repoRoot, rel), "utf-8").includes("tracker-comment.js"),
  );
  assert.deepEqual(missing, [], `step doc(s) no longer comment at all: ${missing.join(", ")}`);
});

test("tracker-comment.js is bundled wherever a skill invokes it", () => {
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
      const body = readFileSync(join(skillDir, rel), "utf-8");
      // A file under references/ is normally a BUNDLED copy and must not count
      // as an invocation. But some are authored there and have no
      // shared/resources/ twin — develop-bug's step docs are the live example,
      // and one of them was the 25th call site that three separate inventory
      // passes missed precisely because they excluded this directory. The
      // bundler's own AUTO-GENERATED banner is the discriminator: no banner
      // means the file is source.
      if (rel.split(/[\\/]/).includes("references") && body.includes("AUTO-GENERATED")) {
        return false;
      }
      return body.includes("tracker-comment.js");
    });
    if (!invokes) continue;
    const bundled = files.some(
      (rel) =>
        typeof rel === "string" &&
        rel.split(/[\\/]/).includes("references") &&
        rel.endsWith("tracker-comment.js"),
    );
    if (!bundled) missing.push(skill);
  }
  assert.deepEqual(
    missing,
    [],
    `skill(s) invoke tracker-comment.js without bundling it — run npm run bundle: ${missing.join(", ")}`,
  );
});

test("the comment marker prefix is identical in both modules that own one", () => {
  // tracker-comment.js duplicates the literal rather than requiring
  // jira-sync.js, because its GitHub branch must not load 4,800 lines of Jira.
  // A duplicated constant needs a check, or the two drift and every marker
  // search silently stops matching.
  const cli = require(join(sharedDir, "tracker-comment.js"));
  assert.equal(cli.COMMENT_MARKER_PREFIX, lib.COMMENT_MARKER_PREFIX);
});
