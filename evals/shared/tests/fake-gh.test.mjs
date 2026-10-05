"use strict";
// task.185 — the fake `gh`: reads served from fixtures, every write refused and logged, a
// read with no fixture kind reported as unhandled. Every call goes through the installed
// launcher, so what is tested is what a skill running in the sandbox would hit.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { installFakeGh } from "../lib/fake-gh.mjs";

const FIXTURES = {
  "pr view": {
    901: {
      number: 901,
      title: "Age gate",
      headRefName: "feature/task.901.widget-age-gate",
      state: "OPEN",
    },
    "feature/task.901.widget-age-gate": "@same:901",
  },
  "pr diff": { 901: "@file:pr-901.diff" },
  "pr list": [
    {
      number: 901,
      headRefName: "feature/task.901.widget-age-gate",
      state: "OPEN",
    },
    { number: 7, headRefName: "chore/tidy", state: "MERGED" },
  ],
  "repo view": { owner: { login: "eval" }, name: "widgets" },
  "issue view": {
    12: { number: 12, title: "An issue", closedByPullRequestsReferences: [] },
  },
};

function sandbox(fixtures = FIXTURES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-gh-"));
  const { PATH } = installFakeGh(dir, fixtures);
  fs.writeFileSync(
    path.join(dir, ".eval", "pr-901.diff"),
    "diff --git a/src/age.js b/src/age.js\n",
  );
  const gh = (...args) =>
    spawnSync("gh", args, {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${PATH}${path.delimiter}${process.env.PATH}`,
      },
    });
  const calls = () =>
    fs
      .readFileSync(path.join(dir, ".eval", "gh-calls.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  return { dir, gh, calls };
}

const hasJq = spawnSync("jq", ["--version"]).status === 0;

test("install writes the launcher, the fixtures, an EMPTY call log and an empty gh-config", () => {
  const { dir } = sandbox();
  const evalDir = path.join(dir, ".eval");
  assert.ok(
    fs.statSync(path.join(evalDir, "bin", "gh")).mode & 0o111,
    "launcher is executable",
  );
  assert.equal(
    fs.readFileSync(path.join(evalDir, "gh-calls.jsonl"), "utf8"),
    "",
  );
  assert.deepEqual(fs.readdirSync(path.join(evalDir, "gh-config")), []);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(evalDir, "gh-fixtures.json"), "utf8")),
    FIXTURES,
  );
});

test("read commands are served from the fixtures and logged", () => {
  const { gh, calls } = sandbox();
  let r = gh("pr", "view", "901", "--json", "number,title");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { number: 901, title: "Age gate" });

  r = gh("pr", "view", "feature/task.901.widget-age-gate", "--json", "number");
  assert.deepEqual(
    JSON.parse(r.stdout),
    { number: 901 },
    "@same: aliases a branch to a number",
  );

  r = gh("pr", "diff", "901");
  assert.equal(
    r.stdout,
    "diff --git a/src/age.js b/src/age.js\n",
    "@file: serves a file's bytes",
  );

  r = gh(
    "pr",
    "list",
    "--state",
    "all",
    "--limit",
    "1000",
    "--json",
    "number,headRefName",
  );
  assert.equal(JSON.parse(r.stdout).length, 2);
  r = gh("pr", "list", "--head", "chore/tidy", "--json", "number");
  assert.deepEqual(JSON.parse(r.stdout), [{ number: 7 }], "--head filters");

  r = gh("issue", "view", "12", "--json", "closedByPullRequestsReferences");
  assert.deepEqual(JSON.parse(r.stdout), {
    closedByPullRequestsReferences: [],
  });

  assert.equal(calls().length, 6);
  assert.ok(calls().every((c) => !c.refused && !c.unhandled && !c.notFound));
  assert.deepEqual(calls()[0].argv, [
    "pr",
    "view",
    "901",
    "--json",
    "number,title",
  ]);
});

test(
  "-q / --jq goes through the real jq",
  { skip: !hasJq && "jq not installed" },
  () => {
    const { gh } = sandbox();
    const r = gh("repo", "view", "--json", "owner", "-q", ".owner.login");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "eval\n");
  },
);

test("a known kind with a missing key answers like gh: exit 1, Could not resolve, notFound", () => {
  const { gh, calls } = sandbox();
  for (const args of [
    ["pr", "view", "12", "--json", "number"],
    ["issue", "view", "999", "--json", "number"],
  ]) {
    const r = gh(...args);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^GraphQL: Could not resolve to/);
  }
  assert.ok(calls().every((c) => c.notFound && !c.unhandled && !c.refused));
});

test("every write is refused, exits 1 and is logged refused: true", () => {
  const { gh, calls } = sandbox();
  const writes = [
    ["pr", "comment", "901", "--body-file", "x.md"],
    ["pr", "review", "901", "--approve"],
    ["pr", "edit", "901", "--title", "t"],
    ["pr", "merge", "901"],
    ["issue", "comment", "12", "--body", "b"],
    [
      "api",
      "-X",
      "PATCH",
      "repos/eval/widgets/issues/comments/1",
      "-f",
      "body=x",
    ],
    ["api", "--method=POST", "repos/eval/widgets/issues/12/comments"],
    ["api", "repos/eval/widgets/issues/12/comments", "-f", "body=x"],
  ];
  for (const args of writes) {
    const r = gh(...args);
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stderr, /refused write/);
  }
  const log = calls();
  assert.equal(log.length, writes.length);
  assert.ok(log.every((c) => c.refused === true));
});

// A glued short value flag is how gh's own parser accepts `-X POST` and `-f body=x` too. The path
// here IS served, so a write the parser mis-read would come back exit 0 as a read — no `refused`,
// no `unhandled`, and the scenario's "never posts" assertion would pass (task.185 finalise DoD).
test("a glued short value flag is still a write, even on a path a fixture serves", () => {
  const route = "repos/eval/widgets/issues/12/comments";
  const { gh, calls } = sandbox({ ...FIXTURES, api: { [route]: [] } });
  // The floor: the path is served, so a refusal below is the write rule, not a missing fixture.
  for (const read of [
    ["api", route],
    ["api", "-XGET", route],
  ]) {
    const r = gh(...read);
    assert.equal(r.status, 0, read.join(" "));
    assert.equal(r.stdout.trim(), "[]");
  }
  const writes = [
    ["api", "-XPOST", route],
    ["api", "-X=PATCH", route],
    ["api", route, "-fbody=x"],
    ["api", route, "-Fbody=@x.md"],
  ];
  for (const args of writes) {
    const r = gh(...args);
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stderr, /refused write/, args.join(" "));
  }
  const log = calls();
  assert.equal(log.length, 2 + writes.length);
  assert.ok(log.slice(0, 2).every((c) => !c.refused && !c.unhandled));
  assert.ok(log.slice(2).every((c) => c.refused === true));
});

test("a command with no fixture kind is unhandled: exit 1, logged unhandled: true", () => {
  const { gh, calls } = sandbox();
  for (const args of [
    ["release", "list"],
    ["api", "repos/eval/widgets/pulls/901"],
  ]) {
    const r = gh(...args);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unhandled command|no "api" fixture/);
  }
  assert.ok(calls().every((c) => c.unhandled === true && !c.refused));
});

test("the program refuses to run outside its launcher (no EVAL_GH_DIR)", () => {
  const prog = new URL("../lib/fake-gh.mjs", import.meta.url).pathname;
  const env = { ...process.env };
  delete env.EVAL_GH_DIR;
  const r = spawnSync(process.execPath, [prog, "pr", "view", "1"], {
    encoding: "utf8",
    env,
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /EVAL_GH_DIR is not set/);
});

test("gh --version and gh version answer without touching the fixtures", () => {
  const { gh, calls } = sandbox();
  for (const args of [["--version"], ["version"]]) {
    const r = gh(...args);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^gh version .*fake-gh/);
  }
  assert.ok(calls().every((c) => !c.unhandled && !c.refused));
});
