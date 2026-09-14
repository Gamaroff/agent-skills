"use strict";
/**
 * session-handoff — handoff-verify.mjs behavioural tests.
 *
 * The verifier's one job is to say, per figure, whether a recorded value still
 * holds — and to say `unverifiable` rather than `confirmed` whenever it could
 * not check. Every verdict and every `reason` value the header documents is
 * reached below through the INJECTED runner, so no test executes a real
 * command; the runner stub throws on any argv it was not told to expect, which
 * is what proves the whitelist gate sits in front of execution rather than
 * beside it.
 *
 * The regression case is the historical 2026-09-10 handoff (fixture, annotated
 * — see the comment at its top) verified against the measurements the
 * 2026-09-12 session actually took. Both named claims must read `stale`.
 *
 * Mutation-proved by hand at task.110 Step 3 (see the implementation report):
 * forcing `compareFigure` to always hold turns the regression test red by name.
 *
 * Run: node --test 'skills/session-handoff/tests/*.test.js'
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_DIR = path.join(__dirname, "..");
const SCRIPT = path.join(SKILL_DIR, "scripts", "handoff-verify.mjs");
const TEMPLATE = path.join(SKILL_DIR, "assets", "handoff.template.md");
// `.txt`, not `.md`: the bundler scans every .md/.js under a skill for
// mentions of the shared-resources tree, and the historical handoff is full of them.
// The verifier does not care about the extension. Same reason the path below
// is assembled from parts rather than written as one literal.
const FIXTURE_2026_09_10 = path.join(
  __dirname,
  "fixtures",
  "handoff-2026-09-10.txt",
);
const CHANGE_LOG_JS = ["shared", "resources", "change-log.js"].join("/");

let mod;
test.before(async () => {
  mod = await import(pathToFileURL(SCRIPT).href);
});

/**
 * A runner that answers from a table keyed on the joined argv, and THROWS on
 * anything else — an unexpected exec is the failure this stub exists to catch.
 */
function stubRunner(table) {
  const calls = [];
  const runner = (argv) => {
    const key = argv.join(" ");
    calls.push(key);
    if (!(key in table)) throw new Error(`unexpected exec: ${key}`);
    const v = table[key];
    return {
      status: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
      error: null,
      ...v,
    };
  };
  runner.calls = calls;
  return runner;
}

const TABLE_HEADER = "| Check | Command | Result |\n| --- | --- | --- |\n";

// ---------------------------------------------------------------------------
// parseHandoff
// ---------------------------------------------------------------------------

test("parse: first backticked span in the Command cell is the command; bold spans are the figures", () => {
  const doc =
    TABLE_HEADER +
    "| Suite | `command npm test` then read the tail | **exit 0** — 12 tests, **0 failures** |\n";
  const [f] = mod.parseHandoff(doc);
  assert.equal(f.source, "table");
  assert.equal(f.check, "Suite");
  assert.equal(f.command, "command npm test");
  assert.deepEqual(f.figures, ["exit 0", "0 failures"]);
  assert.equal(f.line, 3);
});

test("parse: a Command cell with no backticked span yields command=null (never executed)", () => {
  const doc =
    TABLE_HEADER +
    "| Catalog | inspect docs/reference/skill-catalog.md | 126 rows |\n";
  const [f] = mod.parseHandoff(doc);
  assert.equal(f.command, null);
  assert.deepEqual(
    f.figures,
    ["126 rows"],
    "no bold → the whole cell is the figure",
  );
});

test("parse: a prose line with a trailing cmd comment; expect: overrides the bold spans", () => {
  const doc = [
    "The frontier is **not** empty. <!-- cmd: command node x.mjs; expect: selected -->",
    "Touched **since**. <!-- cmd: git log -1 -- a.js; expect: /2026-09-(0[8-9]|[1-3][0-9])/ -->",
    "Plain bold **figure** here. <!-- cmd: git rev-parse HEAD -->",
  ].join("\n");
  const fs3 = mod.parseHandoff(doc);
  assert.equal(fs3.length, 3);
  assert.equal(fs3[0].source, "comment");
  assert.equal(fs3[0].command, "command node x.mjs");
  assert.deepEqual(fs3[0].figures, ["selected"]);
  assert.ok(
    fs3[1].figures[0].regex instanceof RegExp,
    "/…/ expect becomes a RegExp",
  );
  assert.equal(fs3[2].command, "git rev-parse HEAD");
  assert.deepEqual(
    fs3[2].figures,
    ["figure"],
    "no expect → bold spans on the line",
  );
});

test("parse: fenced code blocks are skipped even when they contain a table or a cmd comment", () => {
  const doc =
    "```\n" +
    TABLE_HEADER +
    "| Fake | `rm -rf /` | **gone** |\n" +
    "fake <!-- cmd: rm -rf / -->\n" +
    "```\n" +
    "real **x** <!-- cmd: git status -->\n";
  const out = mod.parseHandoff(doc);
  assert.equal(out.length, 1);
  assert.equal(out[0].command, "git status");
});

// ---------------------------------------------------------------------------
// isAllowed — the whitelist is fail-closed
// ---------------------------------------------------------------------------

test("whitelist: read-only shapes pass; the `command ` prefix is stripped", () => {
  for (const cmd of [
    "git log -1 --format=%ci -- src/change-log.js",
    "command node skills/develop-next/scripts/select-next.mjs --lint",
    "command npm test",
    "command npm run bundle -- --check",
    "command npx prettier --check .",
    "gh pr list --state open",
    "gh api repos/x/y/milestones",
    "grep -c no-transition some/file.js",
    "shellcheck --severity=warning a.sh",
  ]) {
    const r = mod.isAllowed(cmd);
    assert.equal(r.ok, true, `${cmd} should be allowed: ${r.detail}`);
    assert.notEqual(r.argv[0], "command");
  }
});

test("whitelist: mutating shapes, unknown binaries and shell operators are refused", () => {
  const refused = {
    "git push origin develop": /not on whitelist/,
    "git commit -am x": /not on whitelist/,
    "rm -rf /": /not on whitelist/,
    "npm run bundle": /not on whitelist/,
    "npm run generate-catalog": /not on whitelist/,
    "npm install left-pad": /not on whitelist/,
    "npx prettier --write .": /not on whitelist/,
    "gh pr merge 1": /not on whitelist/,
    "gh api -X POST repos/x/y/issues": /not on whitelist/,
    "find . -name x -delete": /not on whitelist/,
    "git log | head": /shell operator/,
    "git status && rm x": /shell operator/,
    "echo $(whoami)": /shell operator/,
    "git status > out.txt": /shell operator/,
    "": /no command/,
    "   ": /no command/,
  };
  for (const [cmd, why] of Object.entries(refused)) {
    const r = mod.isAllowed(cmd);
    assert.equal(r.ok, false, `${JSON.stringify(cmd)} must be refused`);
    assert.match(r.detail, why, cmd);
  }
});

// ---------------------------------------------------------------------------
// verify — every verdict through the injected runner
// ---------------------------------------------------------------------------

test("verify: confirmed when every figure's tokens appear in the output; stale when one moved", () => {
  const doc =
    TABLE_HEADER +
    "| Frontier | `command node select-next.mjs` | **selected B13** |\n" +
    "| Lint | `command node select-next.mjs --lint` | **0 errors, 0 warnings** |\n";
  const runner = stubRunner({
    "node select-next.mjs": {
      stdout: '{"status":"selected","item":{"id":"T110"}}',
    },
    "node select-next.mjs --lint": { stdout: '{"errors":0,"warnings":0}' },
  });
  const r = mod.verify(mod.parseHandoff(doc), { runner });
  assert.equal(r.lines[0].verdict, "stale");
  assert.match(r.lines[0].detail, /selected B13/);
  assert.match(
    r.lines[0].measured,
    /item\.id: T110/,
    "the new value is reported",
  );
  assert.equal(r.lines[1].verdict, "confirmed");
  assert.deepEqual(r.counts, { confirmed: 1, stale: 1, unverifiable: 0 });
  assert.equal(r.reason, "stale");
  assert.equal(r.exitCode, 0, "stale is information, not failure");
});

test("verify: token match is whole-token — `b13` is not satisfied by `b130`", () => {
  const doc = TABLE_HEADER + "| Frontier | `git status` | **B13** |\n";
  const r = mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "selected B130" } }),
  });
  assert.equal(r.lines[0].verdict, "stale");
});

test("verify: an `exit N` figure is compared against the exit code, not the text", () => {
  const doc = TABLE_HEADER + "| Suite | `command npm test` | **exit 0** |\n";
  const ok = mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "npm test": { status: 0, stdout: "garbage" } }),
  });
  assert.equal(ok.lines[0].verdict, "confirmed");
  const bad = mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "npm test": { status: 1, stdout: "exit 0" } }),
  });
  assert.equal(bad.lines[0].verdict, "stale");
  assert.equal(bad.lines[0].measured, "exit 1");
});

test("verify: every unverifiable detail is reachable, and none of them calls the runner", () => {
  const doc =
    TABLE_HEADER +
    "| No command | inspect the catalog | 126 rows |\n" +
    "| Refused | `rm -rf /` | **gone** |\n" +
    "| Operator | `git log \\| head` | **x** |\n" +
    "| Timeout | `command npm test` | **exit 0** |\n" +
    "| Failed | `git log -1` | **abc123** |\n" +
    "| Threw | `git status` | **clean** |\n" +
    "no figure on this line <!-- cmd: git rev-parse HEAD -->\n";
  const runner = stubRunner({
    "npm test": { timedOut: true, status: null },
    "git log -1": { status: 128, stderr: "fatal: not a git repository" },
  });
  const throwing = (argv, o) => {
    if (argv[0] === "git" && argv[1] === "status") throw new Error("ENOENT");
    return runner(argv, o);
  };
  const r = mod.verify(mod.parseHandoff(doc), {
    runner: throwing,
    timeoutSeconds: 7,
  });
  const details = r.lines.map((l) => [l.verdict, l.detail]);
  assert.deepEqual(details, [
    ["unverifiable", "no command"],
    ["unverifiable", "not on whitelist: rm"],
    ["unverifiable", "shell operator"],
    ["unverifiable", "timeout (7s)"],
    ["unverifiable", "command failed (exit 128)"],
    ["unverifiable", "could not run: ENOENT"],
    ["unverifiable", "no figure"],
  ]);
  assert.deepEqual(
    runner.calls,
    ["npm test", "git log -1"],
    "refused rows never reach the runner",
  );
  assert.equal(r.reason, "unverifiable");
  assert.equal(
    r.exitCode,
    1,
    "NOTHING could be checked — that is a claim about the instrument",
  );
});

test("verify: unverifiable alongside confirmed is reason=unverifiable with exit 0; stale outranks it", () => {
  const doc =
    TABLE_HEADER + "| A | `git status` | **clean** |\n| B | prose only | x |\n";
  const r = mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "clean" } }),
  });
  assert.equal(r.reason, "unverifiable");
  assert.equal(r.exitCode, 0);
  const r2 = mod.verify(mod.parseHandoff(doc), {
    runner: stubRunner({ "git status": { stdout: "dirty" } }),
  });
  assert.equal(r2.reason, "stale");
});

test("verify: an empty document is no-figures, exit 1", () => {
  const r = mod.verify(mod.parseHandoff("# nothing here\n"), {
    runner: stubRunner({}),
  });
  assert.equal(r.reason, "no-figures");
  assert.equal(r.exitCode, 1);
});

// ---------------------------------------------------------------------------
// Regression — the 2026-09-10 handoff against the 2026-09-12 measurements
// ---------------------------------------------------------------------------

test("regression: the 2026-09-10 handoff reads stale on the frontier line and the change-log.js 'touched since' claim", () => {
  const text = fs.readFileSync(FIXTURE_2026_09_10, "utf8");
  const figures = mod.parseHandoff(text);
  // What the 2026-09-12 session measured (its handoff §1 and §3a), injected so
  // the test is hermetic and does not depend on today's frontier or git log.
  const runner = stubRunner({
    "node skills/develop-next/scripts/select-next.mjs": {
      stdout: '{"status":"stop","stopReason":"roadmap-complete","item":null}',
    },
    [`git log -1 --format=%ci -- ${CHANGE_LOG_JS}`]: {
      stdout: "2026-08-17 10:21:44 +0100\n",
    },
    "npm test": {
      status: 0,
      stdout: "505 bash assertions, 3155 node tests, 0 failures, 1 skipped",
    },
    "npm run eval:all": {
      status: 0,
      stdout: "51 replay scenarios, all assertions passed",
    },
    "npm run bundle -- --check": {
      status: 0,
      stdout: "126 skills checked, 0 problems",
    },
    "npx prettier --check .": {
      status: 0,
      stdout: "All matched files use Prettier code style!",
    },
  });
  const r = mod.verify(figures, { runner });
  const byCheck = Object.fromEntries(r.lines.map((l) => [l.check, l]));

  const frontier = r.lines.find((l) => /frontier is not empty/i.test(l.check));
  assert.ok(frontier, "the annotated frontier line was parsed");
  assert.equal(frontier.verdict, "stale");
  assert.match(frontier.measured, /roadmap-complete/);

  const touched = r.lines.find((l) => /touched since/i.test(l.check));
  assert.ok(touched, "the annotated 'touched since' line was parsed");
  assert.equal(touched.verdict, "stale");
  assert.match(touched.measured, /2026-08-17/);

  assert.equal(r.reason, "stale");
  assert.ok(
    r.counts.stale >= 2,
    `at least two stale lines, got ${r.counts.stale}`,
  );
  // The rows the fixture cannot measure here say so rather than passing.
  assert.equal(
    byCheck["Skill catalog"].verdict,
    "unverifiable",
    "npm run generate-catalog writes → refused",
  );
  assert.equal(byCheck["Dependency graph"].verdict, "unverifiable");
  assert.equal(byCheck["Hermetic suite"].verdict, "confirmed");
});

// ---------------------------------------------------------------------------
// CLI contract — spawn the real script on fixtures whose commands are cheap
// ---------------------------------------------------------------------------

function runCli(args, cwd) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("cli: --json emits one object with reason/counts/lines/exitCode and mirrors it in the exit code", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-verify-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(
    path.join(dir, "handoff.md"),
    TABLE_HEADER +
      "| In a repo | `git rev-parse --is-inside-work-tree` | **true** |\n" +
      "| Catalog | inspect the catalog | 126 rows |\n",
  );
  const r = runCli(["handoff.md", "--json"], dir);
  assert.equal(r.status, 0, r.stderr);
  const obj = JSON.parse(r.stdout);
  assert.equal(obj.reason, "unverifiable");
  assert.deepEqual(obj.counts, { confirmed: 1, stale: 0, unverifiable: 1 });
  assert.equal(obj.lines[0].verdict, "confirmed");
  assert.equal(obj.exitCode, r.status);
  assert.equal("json" in obj, false, "the internal flag is not emitted");
  // Table form on the same file.
  const t = runCli(["handoff.md"], dir);
  assert.match(t.stdout, /✓ confirmed .*In a repo/);
  assert.match(
    t.stdout,
    /1 confirmed · 0 stale · 1 unverifiable → unverifiable/,
  );
});

test("cli: missing file → reason=missing exit 1; unknown flag → usage exit 2; --help exit 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-verify-"));
  const missing = runCli(["nope.md", "--json"], dir);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).reason, "missing");
  const usage = runCli(["--bogus"], dir);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /unknown flag/);
  const help = runCli(["--help"], dir);
  assert.equal(help.status, 0);
  assert.match(help.stderr, /usage: handoff-verify/);
});

test("cli: the default runner strips `command ` and executes through bash, and a timeout is reported not thrown", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-verify-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(
    path.join(dir, "handoff.md"),
    TABLE_HEADER +
      '| Slow | `command node -e "setTimeout(function(){},5000)"` | **done** |\n',
  );
  const r = runCli(["handoff.md", "--json", "--timeout", "1"], dir);
  const obj = JSON.parse(r.stdout);
  assert.equal(obj.lines[0].verdict, "unverifiable");
  assert.match(obj.lines[0].detail, /timeout \(1s\)/);
});

// ---------------------------------------------------------------------------
// Write mode — the template
// ---------------------------------------------------------------------------

test("template: fixed section order, half-life labels, and the traps section is a pointer only", () => {
  const t = fs.readFileSync(TEMPLATE, "utf8");
  const headings = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const expected = [
    "1. What to pick up",
    "2. Standing decisions",
    "3. Carried follow-ups",
    "4. Tolerated drift",
    "5. Traps",
    "6. Where the artifacts are",
  ];
  expected.forEach((h, i) =>
    assert.match(
      headings[i] ?? "",
      new RegExp(`^${h.replace(".", "\\.")}`),
      `section ${i + 1}`,
    ),
  );
  assert.match(
    t,
    /\| Check \| Command \| Result \|/,
    "the header table is the state section",
  );
  assert.match(t, /half-life/i);
  const traps = t.split(/^## 5\. Traps.*$/m)[1].split(/^## 6\./m)[0];
  assert.match(
    traps,
    /traps\.md/,
    "the traps section points at the durable home",
  );
  assert.doesNotMatch(traps, /^### /m, "no trap content lives in the handoff");
  assert.ok(
    mod.parseHandoff(t).every((f) => f.source === "table"),
    "the template's own placeholder rows parse",
  );
});
