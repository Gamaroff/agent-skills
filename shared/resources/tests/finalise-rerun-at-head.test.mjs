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

test("the pipeline's own state directory is not code, ignored by git or not; a file beside it is", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  writeFileSync(join(dir, ".gitignore"), "");
  git(dir, "commit", "-q", "-am", "nothing is ignored");
  // the caller's redirect target and the pipeline lock, untracked
  mkdirSync(join(dir, ".claude", "state"), { recursive: true });
  writeFileSync(join(dir, ".claude", "state", "develop-pipeline.lock"), "{}");
  assert.equal(run().rec.reason, "ran");
  assert.equal(run().rec.reason, "ran");
  writeFileSync(join(dir, ".claude", "hook.sh"), "x\n");
  assert.equal(run().rec.reason, "dirty-tree");
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

test("a list the reader cannot read whole is refused, never read as shorter or absent (T319-CR-1)", (t) => {
  const bad = {
    "a list at the key's own indent": "finalise:\n  rerunAtHead:\n  - echo a\n",
    "a list at column 0": "finalise:\nrerunAtHead:\n- echo a\n",
    "finalise as a list": "finalise:\n- echo a\n",
    "a key with nothing under it": "finalise:\n  rerunAtHead:\n",
    "a block with nothing under it": "finalise:\n",
    "a file that is not a mapping": "- finalise\n- echo a\n",
    "a duplicate block":
      "finalise:\n  rerunAtHead:\n    - echo a\nfinalise:\n  deferralApprover: Pat\n",
    "a duplicate key":
      "finalise:\n  rerunAtHead:\n    - echo a\n  rerunAtHead:\n    - echo b\n",
    "a row at another indent":
      "finalise:\n  rerunAtHead:\n    - echo a\n   - echo b\n",
    "a # inside a word": "finalise:\n  rerunAtHead:\n    - echo a#b\n",
    "a # inside a partial quote":
      'finalise:\n  rerunAtHead:\n    - echo "a # b"\n',
    "a partial quote": 'finalise:\n  rerunAtHead:\n    - "echo" a\n',
    "an escape": 'finalise:\n  rerunAtHead:\n    - "echo \\"a\\""\n',
    "a block scalar": "finalise:\n  rerunAtHead:\n    - >-\n      echo a\n",
    "a flow list": "finalise:\n  rerunAtHead: [echo a]\n",
    "a flow entry": "finalise:\n  rerunAtHead:\n    - [ echo a ]\n",
  };
  for (const [name, config] of Object.entries(bad))
    assert.throws(
      () => eng.parseRerunList(config),
      (e) => e.constructor.name === "UsageError",
      name,
    );
  // the reproduced case, end to end
  const { run } = fixture(t, {
    config: bad["a list at the key's own indent"],
    criteria: ["`echo a` passes"],
  });
  const r = run();
  assert.equal(r.code, 2);
  assert.equal(r.rec.reason, "usage");
  assert.match(r.rec.message, /one level deeper/);
  // and the shapes that are whole stay read
  for (const [config, want] of [
    ["", []],
    ["other: 1\n", []],
    ["finalise:\n  rerunAtHead: []\n", []],
    ["finalise:\n  deferralApprover: Pat\n", []],
    [LIST("echo a  # why"), ["echo a"]],
    [LIST('"echo a#b"  # why', "'echo # c'"), ["echo a#b", "echo # c"]],
    [LIST("echo it's"), ["echo it's"]],
    [`finalise:\r\n  rerunAtHead:\r\n    - echo a\r\n`, ["echo a"]],
    [`${LIST("echo a")}  deferralApprover: Pat\nci:\n  x: 1\n`, ["echo a"]],
  ])
    assert.deepEqual(eng.parseRerunList(config), want, config);
});

test("a command that writes code, or moves the head, refuses the record; one that writes documentation does not (T319-CR-3)", (t) => {
  for (const cmd of ["touch new.js", "git commit -q --allow-empty -m moved"]) {
    // the dirtying command first: the next one must not run on its tree
    const two = fixture(t, {
      config: LIST(cmd, "echo second"),
      criteria: [`\`${cmd}\` and \`echo second\` pass`],
    });
    const r = two.run();
    assert.equal(r.rec.reason, "dirty-tree", cmd);
    assert.equal(r.code, 1);
    assert.match(r.rec.message, /before `echo second`/);
    assert.ok(!existsSync(join(two.out, "2.stdout")), "the second one ran");
    assert.ok(!existsSync(join(two.out, "run.json")));
    // alone, it is caught by the check after the last command
    const one = fixture(t, {
      config: LIST(cmd),
      criteria: [`\`${cmd}\` passes`],
    });
    const last = one.run();
    assert.equal(last.rec.reason, "dirty-tree", cmd);
    assert.match(last.rec.message, /^after /);
    assert.ok(!existsSync(join(one.out, "run.json")));
  }
  const docs = fixture(t, {
    config: LIST("touch docs/report.md"),
    criteria: ["`touch docs/report.md` passes"],
  });
  assert.equal(docs.run().rec.reason, "ran");
});

test("the record lists the uncommitted documentation a command could read, and not the engine's own output (T319-CR-4)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  writeFileSync(join(dir, ".gitignore"), "");
  git(dir, "commit", "-q", "-am", "nothing is ignored");
  mkdirSync(join(dir, ".claude", "state"), { recursive: true });
  writeFileSync(join(dir, ".claude", "state", "comment-body.md"), "x\n");
  assert.deepEqual(run().rec.uncommitted_docs, []);
  writeFileSync(join(dir, "docs", "note.md"), "x\n");
  const r = run("--out-dir", "elsewhere");
  assert.deepEqual(r.rec.uncommitted_docs, ["docs/note.md"]);
  assert.match(
    readFileSync(join(dir, "elsewhere", "run.md"), "utf8"),
    /Uncommitted documentation the commands could read: `docs\/note\.md`/,
  );
});

test("a command's output is bounded: it is stopped, has no status, and the excerpt reads only the tail (T319-CR-6)", (t) => {
  const { out, run } = fixture(t, {
    // a shell loop and not `yes`: between two polls it writes megabytes, not a gigabyte
    config: LIST("sh -c 'while :; do printf %01000d 0; done'"),
    criteria: ["`sh -c 'while :; do printf %01000d 0; done'` ends"],
  });
  const r = run("--max-output-bytes", "100000", "--timeout-seconds", "60");
  assert.equal(r.rec.reason, "ran", r.err);
  const [one] = r.rec.runs;
  assert.equal(one.output_capped, true);
  assert.equal(one.stopped_for_size, true);
  assert.equal(one.timed_out, false);
  assert.equal(one.exit_code, null);
  assert.equal(readFileSync(one.stdout).length, 100000);
  const md = readFileSync(join(out, "run.md"), "utf8");
  assert.match(md, /\*\*stopped: its output passed the bound\*\*/);
  assert.ok(md.length < 6000);
  // one that finished by itself keeps its status, whatever it printed
  const big = fixture(t, {
    config: LIST("head -c 300000 /dev/zero"),
    criteria: ["`head -c 300000 /dev/zero` ends"],
  });
  const done = big.run("--max-output-bytes", "400000");
  assert.equal(done.rec.runs[0].exit_code, 0);
  assert.equal(done.rec.runs[0].output_capped, false);
});

test("the engine's own failure is `failed`, not a usage error (T319-CR-6)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  mkdirSync(join(dir, ".claude", "state"), { recursive: true });
  writeFileSync(join(dir, ".claude", "state", "rerun"), "a file\n");
  const r = run();
  assert.equal(r.rec.reason, "failed");
  assert.equal(r.code, 1);
});

test("the time bound is the whole run's: a command past it is recorded as not started (T319-CR-10)", (t) => {
  const { dir, out, run } = fixture(t, {
    config: LIST("sleep 30", "touch docs/started.md"),
    criteria: ["`sleep 30` then `touch docs/started.md`"],
  });
  const r = run("--timeout-seconds", "1");
  assert.equal(r.rec.reason, "ran");
  assert.deepEqual(
    r.rec.runs.map((x) => [x.timed_out, x.not_started, x.exit_code]),
    [
      [true, false, null],
      [false, true, null],
    ],
  );
  assert.ok(!existsSync(join(dir, "docs", "started.md")));
  assert.match(readFileSync(join(out, "run.md"), "utf8"), /\*\*not started/);
});

test("a block whose key is quoted is the same block: a second copy in any spelling is refused, a lone one is read (T319-CR-201)", (t) => {
  for (const second of ['"finalise"', "'finalise'", "finalise "]) {
    assert.throws(
      () =>
        eng.parseRerunList(
          `${LIST("echo a")}${second}:\n  rerunAtHead:\n    - echo b#c\n`,
        ),
      (e) => e.constructor.name === "UsageError",
      second,
    );
    assert.deepEqual(
      eng.parseRerunList(`${second}:\n  rerunAtHead:\n    - echo b\n`),
      ["echo b"],
      second,
    );
    // and an entry inside it is checked as it is inside a bare one
    assert.throws(
      () => eng.parseRerunList(`${second}:\n  rerunAtHead:\n    - echo b#c\n`),
      (e) => /entry 1 \(echo b#c\)/.test(e.message),
      second,
    );
  }
  const { run } = fixture(t, {
    config: `${LIST("echo a")}"finalise":\n  rerunAtHead:\n    - echo b\n`,
    criteria: ["`echo b` passes"],
  });
  assert.equal(run().rec.reason, "usage");
});

test("a list under a key nobody reads is refused by name, not read as absent (T319-CR-208)", () => {
  for (const [config, why] of [
    ["finalize:\n  rerunAtHead:\n    - echo a\n", /^finalize looks like/],
    ["rerunAtHead:\n  - echo a\n", /^rerunAtHead is at the top level/],
    ["rerun-at-head:\n  - echo a\n", /^rerun-at-head is at the top level/],
    ["finalise:\n  rerunAtHeads:\n    - echo a\n", /^finalise\.rerunAtHeads /],
    [
      "finalise:\n  rerun_at_head:\n    - echo a\n",
      /^finalise\.rerun_at_head /,
    ],
    ["finalise:\n  other: 1\n", /deferralApprover, rerunAtHead/],
  ])
    assert.throws(
      () => eng.parseRerunList(config),
      (e) => e.constructor.name === "UsageError" && why.test(e.message),
      config,
    );
});

test("the work item's own DoD records are not code, whatever the documentation patterns are; another's are (T319-CR-203)", (t) => {
  const { dir, run } = fixture(t, {
    config: `${LIST("echo a")}ci:\n  docsOnly:\n    patterns:\n      - "**/*.md"\n`,
    criteria: ["`echo a` passes"],
  });
  const at = dirname(DOC);
  writeFileSync(join(dir, at, "task.9.dod.1.ac.json"), "{}\n");
  writeFileSync(join(dir, at, "task.9.dod.1.security.run.json"), "{}\n");
  const r = run();
  assert.equal(r.rec.reason, "ran", r.err);
  assert.deepEqual(r.rec.uncommitted_docs, [
    `${at}/task.9.dod.1.ac.json`,
    `${at}/task.9.dod.1.security.run.json`,
  ]);
  for (const other of [
    `${at}/task.90.dod.1.ac.json`,
    `${at}/task.9.gate.1.json`,
    "docs/tasks/task.9.dod.1.ac.json",
    `${at}/deep/task.9.dod.1.ac.json`,
  ]) {
    mkdirSync(dirname(join(dir, other)), { recursive: true });
    writeFileSync(join(dir, other), "{}\n");
    const bad = run();
    assert.equal(bad.rec.reason, "dirty-tree", other);
    assert.ok(bad.rec.message.includes(other), bad.rec.message);
    rmSync(join(dir, other));
  }
});

test("an edit git status is told not to see is seen: skip-worktree and assume-unchanged (T319-CR-204)", (t) => {
  for (const flag of ["--skip-worktree", "--assume-unchanged"]) {
    const { dir, run } = fixture(t, {
      config: LIST("cat count.txt"),
      criteria: ["`cat count.txt` prints 3 broken"],
    });
    git(dir, "update-index", flag, "count.txt");
    assert.equal(run().rec.reason, "ran", `${flag}: the head's own content`);
    writeFileSync(join(dir, "count.txt"), "0 broken\n");
    assert.equal(git(dir, "status", "--porcelain"), "", `${flag}: hidden`);
    const r = run();
    assert.equal(r.rec.reason, "dirty-tree", flag);
    assert.match(r.rec.message, /count\.txt/);
    assert.equal(r.rec.runs.length, 0);
    // a sparse checkout leaves the file out; an assume-unchanged file that is gone was deleted
    rmSync(join(dir, "count.txt"));
    assert.equal(
      run().rec.reason,
      flag === "--skip-worktree" ? "ran" : "dirty-tree",
      flag,
    );
  }
  // hidden documentation is listed, as visible documentation is
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  git(dir, "update-index", "--assume-unchanged", DOC);
  writeFileSync(join(dir, DOC), `${readFileSync(join(dir, DOC), "utf8")}\n`);
  assert.deepEqual(run().rec.uncommitted_docs, [DOC]);
});

test("a command that ends by itself over the bound keeps its status and has its output cut (T319-CR-209)", (t) => {
  const { out, run } = fixture(t, {
    config: LIST("head -c 300000 /dev/zero"),
    criteria: ["`head -c 300000 /dev/zero` ends"],
  });
  const [r] = run("--max-output-bytes", "1000").rec.runs;
  assert.equal(r.output_capped, true);
  assert.equal(readFileSync(r.stdout).length, 1000);
  // whichever came first, the record says which
  assert.equal(r.stopped_for_size, r.exit_code === null);
  if (!r.stopped_for_size)
    assert.match(
      readFileSync(join(out, "run.md"), "utf8"),
      /\*\*exit 0, its output cut at the bound\*\*/,
    );
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
