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
// installFakeGh refuses without jq (task.186 A5), so a test that installs the fake skips on a host
// without it rather than erroring (QA cycle 1, CR-3). The launcher-refusal test installs nothing
// and runs everywhere.
const jqTest = (name, fn) =>
  test(
    name,
    { skip: !hasJq && "jq not installed — installFakeGh refuses without it" },
    fn,
  );

jqTest(
  "install writes the launcher, the fixtures, an EMPTY call log and an empty gh-config",
  () => {
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
      JSON.parse(
        fs.readFileSync(path.join(evalDir, "gh-fixtures.json"), "utf8"),
      ),
      FIXTURES,
    );
  },
);

jqTest("read commands are served from the fixtures and logged", () => {
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

jqTest(
  "a known kind with a missing key answers like gh: exit 1, Could not resolve, notFound",
  () => {
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
  },
);

jqTest("every write is refused, exits 1 and is logged refused: true", () => {
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
jqTest(
  "a glued short value flag is still a write, even on a path a fixture serves",
  () => {
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
  },
);

// pflag also reads a CLUSTER of short flags in one token: booleans first, then one value flag.
// `gh api -iXPOST` is `-i -X POST` (`-i` is --include). Splitting only a token that STARTS with a
// value flag left these served as reads (task.185 QA cycle 5, TASK-185-BUG-5).
jqTest(
  "a short-flag cluster is read as gh reads it: a value flag inside it is still a write",
  () => {
    const route = "repos/eval/widgets/issues/12/comments";
    const { gh, calls } = sandbox({ ...FIXTURES, api: { [route]: [] } });
    // The floor: clusters that only read are served.
    const reads = [
      ["api", "-i", route],
      ["api", "-iXGET", route],
    ];
    for (const args of reads) {
      const r = gh(...args);
      assert.equal(r.status, 0, args.join(" "));
      assert.equal(r.stdout.trim(), "[]");
    }
    const writes = [
      ["api", "-iXPOST", route],
      ["api", "-iX", "POST", route],
      ["api", "-ifb=x", route],
      ["api", "-if", "b=x", route],
    ];
    for (const args of writes) {
      const r = gh(...args);
      assert.equal(r.status, 1, args.join(" "));
      assert.match(r.stderr, /refused write/, args.join(" "));
    }
    const log = calls();
    assert.equal(log.length, reads.length + writes.length);
    assert.ok(
      log.slice(0, reads.length).every((c) => !c.refused && !c.unhandled),
    );
    assert.ok(log.slice(reads.length).every((c) => c.refused === true));
  },
);

// `api` is decided by ALLOW-list (task.185 QA cycle 6, TASK-185-BUG-6): served only when every flag
// is a known read flag and every method given is GET. Listing write spellings missed one per cycle —
// glued, clustered, then `-X GET --method POST`, where pflag's last-wins made it a POST.
jqTest(
  "api is served only by the read allow-list: any other flag or method is refused",
  () => {
    const route = "repos/eval/widgets/issues/12/comments";
    const { gh, calls } = sandbox({ ...FIXTURES, api: { [route]: [] } });
    // Reads the allow-list must keep serving, including the value flags bug 7 found missing.
    const reads = [
      ["api", "--hostname", "github.com", route],
      ["api", "-p", "corsair", route],
      ["api", "--cache", "1h", route],
      ["api", "-X", "GET", "--method", "get", route],
      ["api", "-H", "Accept: x", "--paginate", route],
    ];
    for (const args of reads) {
      const r = gh(...args);
      assert.equal(r.status, 0, args.join(" "));
      assert.equal(r.stdout.trim(), "[]", args.join(" "));
    }
    const writes = [
      ["api", "-X", "GET", "--method", "POST", route], // pflag: the last one wins → POST
      ["api", "-XGET", "--method=DELETE", route],
      ["api", "--method", "POST", "-X", "GET", route], // a GET to gh, refused: any non-GET fails closed
      ["api", "--unknown-flag", route],
      ["api", "-z", route], // a cluster character the parser has no name for
      ["pr", "new"],
      ["issue", "new"],
    ];
    for (const args of writes) {
      const r = gh(...args);
      assert.equal(r.status, 1, args.join(" "));
      assert.match(r.stderr, /refused write/, args.join(" "));
    }
    const log = calls();
    assert.equal(log.length, reads.length + writes.length);
    assert.ok(
      log.slice(0, reads.length).every((c) => !c.refused && !c.unhandled),
    );
    assert.ok(log.slice(reads.length).every((c) => c.refused === true));
  },
);

jqTest(
  "a served read kind with no fixture table is unhandled: exit 1, logged unhandled: true",
  () => {
    const { gh, calls } = sandbox();
    const r = gh("api", "repos/eval/widgets/pulls/901");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no "api" fixture/);
    // A floor, or `every` passes over an empty log (C8-CR-3).
    assert.equal(calls().length, 1);
    assert.ok(calls().every((c) => c.unhandled === true && !c.refused));
  },
);

// Outside `api`, a command is served only as a read in a shape cobra cannot read another way: a
// served read kind, nothing but -R/--repo before the group, the subcommand directly after it.
// Cobra strips flags first and an unknown flag takes the next token, so `gh pr --edit-last view
// comment` is `pr comment` — read by position it came back notFound (task.185 DoD run 2).
jqTest(
  "pr/issue are served only in an unambiguous read shape; anything else is refused",
  () => {
    const { gh, calls } = sandbox();
    const reads = [
      ["-R", "eval/widgets", "pr", "view", "901"],
      ["--repo=eval/widgets", "pr", "view", "901", "--json", "number"],
      ["issue", "view", "12"],
      ["repo", "view", "--json", "name"],
    ];
    for (const args of reads) {
      const r = gh(...args);
      assert.equal(r.status, 0, args.join(" "));
    }
    const refusals = [
      ["pr", "--edit-last", "view", "comment", "--body", "x"], // cobra: pr comment
      ["pr", "-s", "view", "merge"], // cobra: pr merge
      ["pr", "--squash", "901", "merge"],
      ["issue", "--edit-last", "12", "comment", "--body", "x"],
      ["--hostname", "h", "pr", "view", "901"], // only -R/--repo may precede the group
      ["pr", "revert", "901"], // a write no list names
      ["label", "create", "bug"],
      ["release", "list"], // not a served read kind
    ];
    for (const args of refusals) {
      const r = gh(...args);
      assert.equal(r.status, 1, args.join(" "));
      assert.match(r.stderr, /refused/, args.join(" "));
    }
    const log = calls();
    assert.equal(log.length, reads.length + refusals.length);
    assert.ok(
      log.slice(0, reads.length).every((c) => !c.refused && !c.unhandled),
    );
    assert.ok(log.slice(reads.length).every((c) => c.refused === true));
  },
);

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

jqTest(
  "gh --version and gh version answer without touching the fixtures",
  () => {
    const { gh, calls } = sandbox();
    for (const args of [["--version"], ["version"]]) {
      const r = gh(...args);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^gh version .*fake-gh/);
    }
    assert.ok(calls().every((c) => !c.unhandled && !c.refused));
  },
);

// task.186 B: a refusal says why, so a failed "never posts" assertion can tell a write attempt from
// an unmodelled read.
jqTest(
  "every refused entry carries refusal: write or not-a-served-read",
  () => {
    const { gh, calls } = sandbox();
    const writes = [
      ["pr", "comment", "901", "--body", "b"],
      ["api", "-X", "POST", "repos/eval/widgets/issues/12/comments"],
    ];
    const unserved = [
      ["pr", "checks", "901"],
      ["pr", "--edit-last", "view", "comment"],
    ];
    for (const args of [...writes, ...unserved])
      assert.equal(gh(...args).status, 1, args.join(" "));
    const log = calls();
    assert.equal(log.length, writes.length + unserved.length);
    assert.ok(
      log.every((c) => c.refused === true),
      "all refused",
    );
    assert.deepEqual(
      log.map((c) => c.refusal),
      [
        ...writes.map(() => "write"),
        ...unserved.map(() => "not-a-served-read"),
      ],
    );
  },
);

// task.186 B: `version` is answered only as the whole command. `gh version issue close 5` exited 0
// as a version probe — a write that passed — and `gh --version pr view 901` was a version too.
jqTest("--version / version are answered only as a one-element argv", () => {
  const { gh, calls } = sandbox();
  for (const args of [
    ["version", "issue", "close", "5"],
    ["--version", "pr", "view", "901"],
    ["version", "--json", "x"],
  ]) {
    const r = gh(...args);
    assert.equal(r.status, 1, args.join(" "));
    assert.doesNotMatch(r.stdout, /gh version/, args.join(" "));
  }
  assert.equal(calls().length, 3);
  assert.ok(calls().every((c) => c.refused === true));
});

// task.186 B: real `gh api` rejects -R/--repo, so the fake must not serve it as a read.
jqTest("api with -R/--repo is refused, wherever the flag sits", () => {
  const route = "repos/eval/widgets/issues/12/comments";
  const { gh, calls } = sandbox({ ...FIXTURES, api: { [route]: [] } });
  for (const args of [
    ["api", "-R", "eval/widgets", route],
    ["api", "--repo=eval/widgets", route],
    ["-R", "eval/widgets", "api", route],
  ]) {
    const r = gh(...args);
    assert.equal(r.status, 1, args.join(" "));
  }
  assert.equal(calls().length, 3);
  assert.ok(calls().every((c) => c.refused === true && c.refusal === "write"));
  // -R stays a served shape for pr/issue.
  assert.equal(gh("-R", "eval/widgets", "pr", "view", "901").status, 0);
});

// task.186 B: a requested --json field the fixture lacks is a fixture gap, not an answer without it.
jqTest("a --json field the fixture lacks is unhandled and named", () => {
  const { gh, calls } = sandbox();
  const r = gh("pr", "view", "901", "--json", "number,mergeable,title");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /lacks requested --json field\(s\) mergeable:/);
  const list = gh("pr", "list", "--json", "number,author");
  assert.equal(list.status, 1, list.stdout);
  assert.match(list.stderr, /field\(s\) author:/);
  assert.equal(calls().length, 2);
  assert.ok(calls().every((c) => c.unhandled === true && !c.refused));
  // Every requested field present: served as before.
  assert.equal(gh("pr", "view", "901", "--json", "number,title").status, 0);
});

// task.186 B: fixture lookup reads own keys only — `constructor` is not a PR.
jqTest("fixture lookup ignores prototype keys", () => {
  const { gh, calls } = sandbox();
  for (const key of ["constructor", "toString", "__proto__"]) {
    const r = gh("pr", "diff", key);
    assert.equal(r.status, 1, `${key}: ${r.stdout}`);
    assert.match(r.stderr, /Could not resolve/, key);
  }
  assert.equal(calls().length, 3);
  assert.ok(calls().every((c) => c.notFound === true));
});

// task.186 QA cycle 1, CR-3: installFakeGh refuses without jq (A5), so every test that installs it
// must skip — not error — on a host without jq. Run this file's own suite on a PATH holding only
// `node` and require no failure. FAKE_GH_SUITE_NO_JQ stops the child from recursing into this test.
test(
  "the suite skips, never fails, on a host without jq (CR-3)",
  {
    skip:
      process.env.FAKE_GH_SUITE_NO_JQ === "1" && "running as the no-jq child",
  },
  () => {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), "fake-gh-nojq-"));
    fs.symlinkSync(process.execPath, path.join(bin, "node"));
    const self = new URL(import.meta.url).pathname;
    // NODE_TEST_CONTEXT is removed: inherited from this runner, it makes the child report to a
    // parent instead of printing, and its stdout comes back empty.
    const env = { ...process.env, PATH: bin, FAKE_GH_SUITE_NO_JQ: "1" };
    delete env.NODE_TEST_CONTEXT;
    const r = spawnSync(
      process.execPath,
      ["--test", "--test-reporter=tap", self],
      { encoding: "utf8", env },
    );
    assert.equal(r.status, 0, r.stdout.slice(-2000));
    assert.match(r.stdout, /^# fail 0$/m);
    assert.match(
      r.stdout,
      /^# skipped [1-9]/m,
      "the jq-dependent tests were skipped",
    );
  },
);
