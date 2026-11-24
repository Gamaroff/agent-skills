/**
 * security-probe.mjs, the `eslint:` entry form (task.319).
 *
 * The fixture is a repository with its own `node_modules/eslint`: a small stand-in that answers the
 * Node API calls the engine makes (isPathIgnored, calculateConfigForFile, lintText) from a
 * configuration file of its own. This repository installs no ESLint; the form was also run against
 * the real package, versions 8 and 9 — the implementation report of task 319 records it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkEslintRuntime,
  observationLimitsFor,
  resolveEntry,
  runProbeSpec,
} from "../security-probe.mjs";
import { spawnBudget } from "../spawn-budget.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = resolve(HERE, "..", "security-probe.mjs");
const BUDGET = spawnBudget("PROBE");

// Rules: `no-eval` reports a call to eval; `no-tabs` reports a tab. A `// eslint-disable` line
// suppresses, a `(((` does not parse, and a file under gen/ is ignored.
const FAKE_ESLINT = `
const fs = require("node:fs");
const path = require("node:path");
class ESLint {
  constructor({ cwd, fix, cache }) {
    if (fix || cache) throw new Error("the probe must neither fix nor cache");
    if (process.cwd() !== cwd) throw new Error("cwd is not the configuration's directory");
    this.cwd = cwd;
    this.config = JSON.parse(fs.readFileSync(path.join(cwd, "eslint.config.js"), "utf8").slice(3));
  }
  async isPathIgnored(f) { return f.includes(path.sep + "gen" + path.sep); }
  async calculateConfigForFile() { return { rules: this.config }; }
  async lintText(text, { filePath }) {
    console.log("a plugin that logs");
    if (text.includes("(((")) return [{ filePath, messages: [{ ruleId: null, fatal: true, message: "Parsing error", severity: 2 }] }];
    const messages = [];
    const on = (r) => this.config[r] && this.config[r][0];
    // what ESLint 8 does with a configured rule no plugin defines
    for (const r of Object.keys(this.config))
      if (r.startsWith("ghost/") && on(r)) messages.push({ ruleId: r, severity: 2, line: 1, message: "Definition for rule '" + r + "' not found." });
    if (!text.includes("eslint-disable")) {
      if (on("no-eval") && /\\beval\\(/.test(text)) messages.push({ ruleId: "no-eval", severity: on("no-eval"), line: 1 });
      if (on("@acme/lint/no-tabs") && text.includes("\\t")) messages.push({ ruleId: "@acme/lint/no-tabs", severity: 2, line: 1 });
    }
    return [{ filePath, messages }];
  }
}
module.exports = { ESLint, loadESLint: async () => ESLint };
`;

const CONFIG = {
  "no-eval": [2],
  "@acme/lint/no-tabs": [2],
  "no-alert": [0],
};

function repo(t, { eslint = true, config = CONFIG, configDir = "." } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "probe-eslint-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "pkg", "src"), { recursive: true });
  mkdirSync(join(dir, "gen"));
  for (const f of ["pkg/src/a.js", "gen/b.js"])
    writeFileSync(join(dir, f), "export const a = 1;\n");
  writeFileSync(
    join(dir, configDir, "eslint.config.js"),
    `// ${JSON.stringify(config)}`,
  );
  if (eslint) {
    const pkg = join(dir, "node_modules", "eslint");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(
      join(pkg, "package.json"),
      '{"name":"eslint","main":"i.js"}\n',
    );
    writeFileSync(join(pkg, "i.js"), FAKE_ESLINT);
  }
  return dir;
}

const CASES = [
  { id: "eval-call", direction: "hostile", input: "eval(x);\n" },
  { id: "eval-spaced", direction: "hostile", input: "void eval(`1`);\n" },
  { id: "plain", direction: "legitimate", input: "const evaluation = 1;\n" },
];
const probe = (dir, entry, cases = CASES, extra = {}) =>
  runProbeSpec({ sink: "shell-exec", entry, cases, repoRoot: dir, ...extra });
const outcomes = (r) =>
  Object.fromEntries(r.cases.map((c) => [c.id, c.outcome]));

test("a hostile case the rule reports is rejected, a legitimate one is accepted, and the rule engages", (t) => {
  const r = probe(repo(t), "eslint:pkg/src/a.js#no-eval");
  assert.equal(r.verdict, "engages", JSON.stringify(r));
  assert.deepEqual(outcomes(r), {
    "eval-call": "rejected",
    "eval-spaced": "rejected",
    plain: "accepted",
  });
  assert.match(r.cases[0].detail, /severity 2/);
});

test("control: a rule the fixtures never mention reports nothing, so the probe says absent", (t) => {
  const r = probe(repo(t), "eslint:pkg/src/a.js#@acme/lint/no-tabs");
  assert.equal(r.verdict, "absent", JSON.stringify(r));
  assert.deepEqual(new Set(Object.values(outcomes(r))), new Set(["accepted"]));
});

test("a rule the configuration turns off is scored absent; one it never names is declined, never scored", (t) => {
  const dir = repo(t);
  assert.equal(probe(dir, "eslint:pkg/src/a.js#no-alert").verdict, "absent");
  const r = probe(dir, "eslint:pkg/src/a.js#no-evil");
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "entry-not-probeable");
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /names the rule no-evil/);
});

test("a configured rule no plugin defines is declined, not scored as rejecting everything (T319-CR-8)", (t) => {
  const dir = repo(t, { config: { ...CONFIG, "ghost/rule": [2] } });
  const r = probe(dir, "eslint:pkg/src/a.js#ghost/rule");
  assert.equal(r.verdict, "unverifiable", JSON.stringify(r));
  assert.equal(r.executed, 0);
  assert.match(r.declined[0].detail, /no definition/);
  // a rule that is defined keeps its verdict beside one that is not
  assert.equal(probe(dir, "eslint:pkg/src/a.js#no-eval").verdict, "engages");
});

test("every document that lists the engine's entry forms names the eslint form (T319-CR-12)", () => {
  // Found by search, not listed: an authored document that tells an agent how to reach a fence: or
  // shell-argv: entry lists the forms, and a form it leaves out is a boundary recorded as unreachable.
  const ROOT = resolve(HERE, "..", "..", "..");
  const docs = execFileSync(
    "git",
    [
      "grep",
      "-l",
      "-e",
      "shell-argv:",
      "--",
      ":(glob)skills/*/SKILL.md",
      ":(glob)shared/resources/*.md",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    // a list names them all; review-task quotes two of them as a worked example
    .filter((f) => {
      const text = readFileSync(join(ROOT, f), "utf8");
      return ["fence:", "cli:", "shell-fn:"].every((x) => text.includes(x));
    });
  // the floor: the six that list the forms today; a seventh is found by the search and checked too
  for (const must of [
    "shared/resources/finalise-dod-security-prompt.md",
    "shared/resources/probe-boundary-rule.md",
    "shared/resources/security-review-prompt.md",
    "skills/qa-story/SKILL.md",
    "skills/qa-task/SKILL.md",
    "skills/review-security/SKILL.md",
  ])
    assert.ok(docs.includes(must), must);
  assert.deepEqual(
    docs.filter((f) => !/eslint:/.test(readFileSync(join(ROOT, f), "utf8"))),
    [],
  );
});

test("a disable directive in the input is what it is in the repository: not reported", (t) => {
  const r = probe(repo(t), "eslint:pkg/src/a.js#no-eval", [
    ...CASES,
    {
      id: "disabled",
      direction: "hostile",
      input: "eval(x); // eslint-disable-line\n",
    },
  ]);
  assert.equal(r.verdict, "present-but-inert");
  assert.deepEqual(r.reproduced, ["disabled"]);
});

test("a run that never reached the rule is declined: an ignored file, an input that does not parse", (t) => {
  const dir = repo(t);
  const ignored = probe(dir, "eslint:gen/b.js#no-eval");
  assert.equal(ignored.reason, "entry-not-probeable");
  assert.match(ignored.declined[0].detail, /does not lint/);
  const r = probe(dir, "eslint:pkg/src/a.js#no-eval", [
    ...CASES,
    { id: "broken", direction: "hostile", input: "eval(((\n" },
  ]);
  assert.equal(
    r.verdict,
    "engages",
    "the parsed cases still carry the verdict",
  );
  assert.equal(r.executed, 3);
  assert.deepEqual(
    r.declined.map((d) => d.id),
    ["broken"],
  );
});

test("the repository's own ESLint and configuration answer: the nearest package and config, never one above the root", (t) => {
  const dir = repo(t);
  assert.equal(
    checkEslintRuntime(dir, join(dir, "pkg", "src", "a.js")).cwd,
    dir,
  );
  const nested = repo(t, { configDir: "pkg" });
  assert.equal(
    checkEslintRuntime(nested, join(nested, "pkg", "src", "a.js")).cwd,
    join(nested, "pkg"),
  );
  // The package exists, but only above the stated root.
  const r = probe(join(dir, "pkg"), "eslint:src/a.js#no-eval");
  assert.equal(r.reason, "eslint-unavailable");
  assert.equal(r.verdict, "unverifiable");
  const none = probe(repo(t, { eslint: false }), "eslint:pkg/src/a.js#no-eval");
  assert.equal(none.reason, "eslint-unavailable");
});

test("nothing is written to the repository and the linted file keeps its content", (t) => {
  const dir = repo(t);
  const list = () => readdirSync(dir, { recursive: true }).sort();
  const before = list();
  const r = probe(dir, "eslint:pkg/src/a.js#no-eval");
  assert.equal(r.executed, 3);
  assert.deepEqual(list(), before);
  assert.equal(
    readFileSync(join(dir, "pkg/src/a.js"), "utf8"),
    "export const a = 1;\n",
  );
  assert.deepEqual(r.escapes, []);
});

test("a malformed entry, an escape from the root and a missing file are each declined by name", (t) => {
  const dir = repo(t);
  for (const bad of [
    "eslint:",
    "eslint:pkg/src/a.js",
    "eslint:#no-eval",
    "eslint:pkg/src/a.js#",
    "eslint:pkg/src/a.js#no eval",
    "eslint:pkg/src/a.js#--fix",
  ])
    assert.equal(resolveEntry(bad, dir).reason, "bad-entry", bad);
  assert.equal(
    resolveEntry("eslint:../x.js#no-eval", dir).reason,
    "outside-repo-root",
  );
  const out = mkdtempSync(join(tmpdir(), "probe-eslint-out-"));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  writeFileSync(join(out, "x.js"), "1;\n");
  symlinkSync(join(out, "x.js"), join(dir, "link.js"));
  assert.equal(
    resolveEntry("eslint:link.js#no-eval", dir).reason,
    "outside-repo-root",
  );
  const missing = probe(dir, "eslint:pkg/src/none.js#no-eval");
  assert.equal(missing.reason, "entry-not-probeable");
  assert.match(missing.declined[0].detail, /linted file/);
  assert.deepEqual(observationLimitsFor("eslint:a.js#no-eval"), [
    "effects-after-accept",
    "outside-sandbox-write",
  ]);
});

test("the route /finalise takes: a plan entry runs, records, and renders in the security_review block", (t) => {
  const dir = repo(t);
  const work = join(dir, "docs");
  mkdirSync(work);
  const plan = join(work, "plan.json");
  const record = join(work, "task.9.dod.1.security.run.json");
  const entry = "eslint:pkg/src/a.js#no-eval";
  writeFileSync(
    plan,
    JSON.stringify([
      {
        argv: ["--sink", "shell-exec", "--entry", entry, "--name", "no-eval"],
        cases: CASES,
      },
    ]),
  );
  const run = spawnSync(
    process.execPath,
    [
      resolve(HERE, "..", "security-probe-plan.mjs"),
      "--plan",
      plan,
      "--record",
      record,
      "--cases-base",
      join(work, "task.9.dod.1.security.cases"),
      "--repo-root",
      dir,
      "--json",
    ],
    { encoding: "utf8", timeout: BUDGET.timeoutMs * 4 },
  );
  const out = JSON.parse(run.stdout);
  assert.equal(out.reason, "ran", run.stdout);
  assert.equal(out.probes_executed, 3);
  assert.deepEqual(out.refusals, []);
  assert.deepEqual(out.probes, []);
  assert.equal(out.observation_limits.length, 2);
  const block = spawnSync(process.execPath, [ENGINE, "--emit-block", record], {
    encoding: "utf8",
    timeout: BUDGET.timeoutMs,
  }).stdout;
  assert.match(block, /probes_executed: 3/);
  assert.ok(block.includes(entry), block);
});

test("the options of other forms are refused, through the API and through the CLI", (t) => {
  const dir = repo(t);
  const entry = "eslint:pkg/src/a.js#no-eval";
  assert.equal(probe(dir, entry, CASES, { args: [1] }).reason, "bad-args");
  assert.equal(
    probe(dir, entry, CASES, { argv: ["{input}"] }).reason,
    "bad-argv",
  );
  assert.equal(probe(dir, entry, CASES, { slot: "x" }).reason, "bad-slot");
  assert.equal(
    probe(dir, entry, CASES, { fixtureCopy: ["pkg/src/a.js"] }).reason,
    "bad-fixture-copy",
  );
  const file = join(dir, "cases.json");
  writeFileSync(file, JSON.stringify(CASES));
  const cli = (...extra) =>
    spawnSync(
      process.execPath,
      [
        ENGINE,
        "--sink",
        "shell-exec",
        "--entry",
        entry,
        "--cases-file",
        file,
        "--repo-root",
        dir,
        "--json",
        ...extra,
      ],
      { encoding: "utf8", timeout: BUDGET.timeoutMs * 4 },
    );
  const ok = cli();
  assert.equal(JSON.parse(ok.stdout).verdict, "engages", ok.stderr);
  const bad = cli("--args-json", "[1]");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /bad-args/);
});
