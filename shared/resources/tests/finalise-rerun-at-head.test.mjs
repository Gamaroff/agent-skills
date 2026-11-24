/**
 * finalise-rerun-at-head.js (task.319): a listed command a criterion names is run at the head, and
 * nothing else is ever run. Each test is a real repository and the real CLI.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, "..", "finalise-rerun-at-head.js");
const eng = createRequire(import.meta.url)("../finalise-rerun-at-head.js");
const BUDGET = spawnBudget("RERUN_AT_HEAD");
const DOC = "docs/tasks/task.9.x/task.9.x.md";

const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "maintenance.auto=false", "-c", "gc.auto=0", ...args],
    {
      cwd,
      env: ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();

const LIST = (...cmds) =>
  `finalise:\n  rerunAtHead:\n${cmds.map((c) => `    - ${c}\n`).join("")}`;

function fixture(t, { config, criteria }) {
  const dir = mkdtempSync(join(tmpdir(), "rerun-at-head-"));
  t.after(() =>
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }),
  );
  git(dir, "init", "-q", "-b", "feature/x", ".");
  mkdirSync(join(dir, dirname(DOC)), { recursive: true });
  writeFileSync(
    join(dir, DOC),
    `# T\n\n## 9. Success Criteria\n\n${criteria.map((c) => `- [ ] ${c}`).join("\n")}\n\n## 10. Other\n\n- [ ] \`touch ${dir}/outside\`\n`,
  );
  if (config !== undefined)
    writeFileSync(join(dir, "skills-config.yaml"), config);
  writeFileSync(join(dir, "count.txt"), "3 broken\n");
  writeFileSync(join(dir, ".gitignore"), ".claude/\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  const out = ".claude/state/rerun";
  const run = (...extra) => {
    let r;
    for (let i = 0; i <= BUDGET.retries; i += 1) {
      r = spawnSync(
        process.execPath,
        [CLI, "--doc", DOC, "--out-dir", out, "--json", ...extra],
        {
          cwd: dir,
          env: ENV,
          encoding: "utf8",
          timeout: BUDGET.timeoutMs,
        },
      );
      if (!neverRan(r)) break;
    }
    return {
      code: r.status,
      err: r.stderr,
      rec: JSON.parse(r.stdout),
    };
  };
  return { dir, out: join(dir, out), run };
}

test("a recorded run predates the head: the command runs again, and the saved output is the head's", (t) => {
  const { dir, out, run } = fixture(t, {
    config: LIST("cat count.txt"),
    criteria: [
      "`cat count.txt` prints 0 broken (QA recorded `0 broken`)",
      "unrelated",
    ],
  });
  const first = run();
  assert.equal(first.rec.reason, "ran");
  assert.equal(readFileSync(first.rec.runs[0].stdout, "utf8"), "3 broken\n");
  // the later commit the recorded run does not describe
  writeFileSync(join(dir, "count.txt"), "0 broken\n");
  git(dir, "commit", "-q", "-am", "fix");
  const r = run();
  assert.equal(r.code, 0, r.err);
  assert.equal(r.rec.head, git(dir, "rev-parse", "HEAD"));
  assert.equal(readFileSync(r.rec.runs[0].stdout, "utf8"), "0 broken\n");
  assert.equal(r.rec.runs[0].exit_code, 0);
  assert.deepEqual(
    r.rec.runs[0].criteria.map((c) => c.index),
    [1],
  );
  const saved = JSON.parse(readFileSync(join(out, "run.json"), "utf8"));
  assert.equal(saved.head, r.rec.head);
});

test("the command's own failure is data: exit 0 here, the status in the record and the DoD block", (t) => {
  const { out, run } = fixture(t, {
    config: LIST("sh -c 'echo bad >&2; exit 7'"),
    criteria: ["`sh -c 'echo bad >&2; exit 7'` is clean"],
  });
  const r = run();
  assert.equal(r.code, 0);
  assert.equal(r.rec.runs[0].exit_code, 7);
  assert.equal(readFileSync(r.rec.runs[0].stderr, "utf8"), "bad\n");
  const md = readFileSync(join(out, "run.md"), "utf8");
  assert.match(md, /### Commands re-run at the head/);
  assert.match(md, /criteria #1 — \*\*exit 7\*\*/);
  assert.match(md, /^bad$/m);
});

test("only a whole code span equal to a listed entry names a command: never a prefix, a suffix or prose", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: [
      "`echo a; touch owned` passes",
      "echo a works",
      "`touch owned` runs",
      "`xecho a` and `echo a b`",
    ],
  });
  const r = run();
  assert.equal(r.rec.reason, "none-named");
  assert.equal(r.rec.runs.length, 0);
  assert.ok(!existsSync(join(dir, "owned")));
  assert.ok(
    !existsSync(join(dir, "outside")),
    "a span outside the criteria section is never read",
  );
});

test("an unlisted command keeps today's rule: nothing runs without the key", (t) => {
  for (const config of [undefined, "finalise:\n  deferralApprover: Pat\n"]) {
    const { run } = fixture(t, { config, criteria: ["`echo a` passes"] });
    const r = run();
    assert.equal(r.rec.reason, "not-configured");
    assert.equal(r.code, 0);
  }
});

test("a command added to the configuration in the working tree only is not run", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`touch owned` passes"],
  });
  writeFileSync(join(dir, "skills-config.yaml"), LIST("echo a", "touch owned"));
  assert.equal(run().rec.reason, "none-named");
  assert.ok(!existsSync(join(dir, "owned")));
});

test("a working tree that is not the head refuses: staged, unstaged or untracked code; documentation passes", (t) => {
  for (const dirty of ["unstaged", "staged", "untracked"]) {
    const { dir, run } = fixture(t, {
      config: LIST("echo a"),
      criteria: ["`echo a` passes"],
    });
    if (dirty === "untracked") writeFileSync(join(dir, "new.js"), "x\n");
    else writeFileSync(join(dir, "count.txt"), "edited\n");
    if (dirty === "staged") git(dir, "add", "-A");
    const r = run();
    assert.equal(r.rec.reason, "dirty-tree", dirty);
    assert.equal(r.code, 1, dirty);
    assert.equal(r.rec.runs.length, 0, dirty);
  }
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  writeFileSync(join(dir, dirname(DOC), "task.9.dod.1.x.md"), "# DoD\n");
  assert.equal(run().rec.reason, "ran");
});

test("a command that outlives its bound is killed with what it started, and has no status", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("sh -c '(sleep 3; touch late) & sleep 30'"),
    criteria: ["`sh -c '(sleep 3; touch late) & sleep 30'` ends"],
  });
  const r = run("--timeout-seconds", "1");
  assert.equal(r.rec.runs[0].timed_out, true);
  assert.equal(r.rec.runs[0].exit_code, null);
  spawnSync("sleep", ["3"]);
  assert.ok(
    !existsSync(join(dir, "late")),
    "the command's own child was left running",
  );
});

test("a malformed list is a usage error with nothing run, and a stale record never survives a later run", (t) => {
  const bad = [
    "finalise:\n  rerunAtHead: echo a\n",
    "finalise:\n  rerunathead:\n    - echo a\n",
    "Finalise:\n  rerunAtHead:\n    - echo a\n",
    "finalise:\n  rerunAtHead:\n    - 3\n",
  ];
  for (const config of bad) {
    assert.throws(() => eng.parseRerunList(config), undefined, config);
    const { run } = fixture(t, { config, criteria: ["`echo a` passes"] });
    const r = run();
    assert.equal(r.code, 2, config);
    assert.equal(r.rec.reason, "usage", config);
  }
  const { dir, out, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  run();
  writeFileSync(join(out, "note.txt"), "not mine\n");
  writeFileSync(join(dir, "count.txt"), "edited\n");
  assert.equal(run().rec.reason, "dirty-tree");
  assert.deepEqual(readdirSync(out), ["note.txt"]);
});

test("a document without criteria, or missing, is scan-broken", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  writeFileSync(join(dir, DOC), "# T\n\nno criteria\n");
  const r = run();
  assert.equal(r.rec.reason, "scan-broken");
  assert.equal(r.code, 1);
});

test("the list is deduplicated, a criterion can name two commands, and one run serves every criterion naming it", () => {
  assert.deepEqual(eng.parseRerunList(LIST("a", "a", "b")), ["a", "b"]);
  assert.deepEqual(
    eng
      .namedCommands(["a", "b"], ["`a` then `b`", "only `b`"])
      .map((r) => [r.command, r.criteria.map((c) => c.index)]),
    [
      ["a", [1]],
      ["b", [1, 2]],
    ],
  );
  assert.deepEqual(eng.codeSpans("x ``a `b` c`` y `d`"), ["a `b` c", "d"]);
});
