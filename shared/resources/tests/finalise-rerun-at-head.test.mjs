/**
 * finalise-rerun-at-head.js (task.319): a listed command a criterion names is run at the head, and
 * nothing else is ever run. Each test is a real repository and the real CLI.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
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
    // a file that is gone is not the head's, whatever git was told (T319-CR-402)
    rmSync(join(dir, "count.txt"));
    assert.equal(run().rec.reason, "dirty-tree", flag);
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

/** A repository with one of everything the comparison reads, and a checked-out submodule at lib/. */
function everything(t, { config = "" } = {}) {
  const f = fixture(t, {
    config: `${LIST("cat lib/count.txt")}${config}`,
    criteria: ["`cat lib/count.txt` prints 3 broken"],
  });
  const sub = mkdtempSync(join(tmpdir(), "rerun-at-head-sub-"));
  t.after(() => rmSync(sub, { recursive: true, force: true, maxRetries: 5 }));
  git(sub, "init", "-q", "-b", "main", ".");
  writeFileSync(join(sub, "count.txt"), "3 broken\n");
  git(sub, "add", "-A");
  git(sub, "commit", "-q", "-m", "sub");
  const { dir } = f;
  git(
    dir,
    "-c",
    "protocol.file.allow=always",
    "submodule",
    "add",
    "-q",
    sub,
    "lib",
  );
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/a.js"), "1\n");
  writeFileSync(join(dir, "run.sh"), "#!/bin/sh\n");
  chmodSync(join(dir, "run.sh"), 0o755);
  symlinkSync("src/a.js", join(dir, "link"));
  symlinkSync("nowhere", join(dir, "dangling"));
  for (const odd of ['"q".js', "a\nb.js", "sp ace.js", "é.js", "back\\.js"])
    writeFileSync(join(dir, odd), `${odd}\n`);
  writeFileSync(join(dir, "eol.txt"), "x\r\ny\r\n");
  writeFileSync(join(dir, "up.flt"), "stored\n");
  writeFileSync(
    join(dir, ".gitattributes"),
    "eol.txt text eol=crlf\n*.flt filter=up\n",
  );
  git(dir, "config", "filter.up.clean", "tr A-Z a-z");
  writeFileSync(join(dir, "up.flt"), "STORED\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "everything");
  return { ...f, sub };
}

test("a checkout of the head answers ran: links, modes, filters, line endings, odd names, submodules (T319-CR-410)", (t) => {
  const { dir, run } = everything(t);
  const clean = run();
  assert.equal(clean.rec.reason, "ran", clean.rec.message);
  assert.deepEqual(clean.rec.uncommitted_docs, []);
  assert.equal(readFileSync(clean.rec.runs[0].stdout, "utf8"), "3 broken\n");
  // told not to look, at files that are the head's, with settings that make a bare diff disagree
  for (const f of ["eol.txt", "up.flt", "link", "run.sh", '"q".js'])
    git(dir, "update-index", "--skip-worktree", "--", f);
  for (const [k, v] of [
    ["diff.autoRefreshIndex", "false"],
    ["diff.ignoreSubmodules", "all"],
    ["core.safecrlf", "true"],
  ])
    git(dir, "config", k, v);
  assert.equal(run().rec.reason, "ran");
  // a submodule that is not checked out is not an edit; a file put where it would be is
  git(dir, "submodule", "deinit", "-q", "-f", "lib");
  assert.equal(run().rec.reason, "ran");
  writeFileSync(join(dir, "lib/count.txt"), "0 broken\n");
  assert.equal(run().rec.reason, "dirty-tree");

  // a file committed with CRLF, under core.autocrlf: git reads it as unchanged, and it is
  const crlf = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  writeFileSync(join(crlf.dir, "w.txt"), "a\r\n");
  git(crlf.dir, "add", "-A");
  git(crlf.dir, "commit", "-q", "-m", "crlf");
  git(crlf.dir, "config", "core.autocrlf", "true");
  assert.equal(crlf.run().rec.reason, "ran");
});

test("no setting, flag or index state makes an edited tree answer ran (T319-CR-401, CR-402, CR-403)", (t) => {
  const edit =
    (f, text = "0 broken\n") =>
    (d) =>
      writeFileSync(join(d, f), text);
  const submodule =
    (...a) =>
    (d) =>
      git(join(d, "lib"), ...a);
  const set = (k, v) => (d) => git(d, "config", k, v);
  const hook = (d) => {
    const file = join(d, ".git/fsmonitor");
    writeFileSync(file, "#!/bin/sh\nprintf 'token\\0'\n");
    chmodSync(file, 0o755);
    git(d, "config", "core.fsmonitor", file);
    git(d, "status");
    git(d, "status");
  };
  // [what, the edit, what hides it, the path the refusal names]
  const cases = [
    [
      "a submodule's skip-worktree",
      submodule("update-index", "--skip-worktree", "count.txt"),
      edit("lib/count.txt"),
      "lib/count.txt",
    ],
    [
      "submodule.lib.ignore=all",
      set("submodule.lib.ignore", "all"),
      edit("lib/count.txt"),
      "lib/count.txt",
    ],
    [
      "submodule.lib.ignore=dirty",
      set("submodule.lib.ignore", "dirty"),
      edit("lib/new.js"),
      "lib/new.js",
    ],
    [
      "a submodule at another commit",
      set("submodule.lib.ignore", "all"),
      submodule("commit", "-q", "--allow-empty", "-m", "moved"),
      "lib",
    ],
    [
      "core.fileMode=false",
      set("core.fileMode", "false"),
      (d) => chmodSync(join(d, "src/a.js"), 0o755),
      "src/a.js",
    ],
    [
      "core.fileMode=false, the bit dropped",
      set("core.fileMode", "false"),
      (d) => chmodSync(join(d, "run.sh"), 0o644),
      "run.sh",
    ],
    ["an fsmonitor that reports nothing", hook, edit("src/a.js"), "src/a.js"],
    [
      "a deleted skip-worktree file",
      (d) => git(d, "update-index", "--skip-worktree", "src/a.js"),
      (d) => rmSync(join(d, "src/a.js")),
      "src/a.js",
    ],
    [
      "a sparse checkout",
      () => {},
      (d) =>
        git(
          d,
          "sparse-checkout",
          "set",
          "--no-cone",
          "/docs/",
          "/skills-config.yaml",
          "/lib/",
        ),
      ".gitignore",
    ],
    [
      "an intent-to-add file",
      edit("new.js"),
      (d) => git(d, "add", "-N", "new.js"),
      "new.js",
    ],
    [
      "a file only the index lost",
      (d) => writeFileSync(join(d, ".git/info/exclude"), "src\n"),
      (d) => git(d, "rm", "-q", "--cached", "src/a.js"),
      "src/a.js",
    ],
    [
      "an edit only the index holds",
      (d) => {
        edit("src/a.js")(d);
        git(d, "add", "src/a.js");
      },
      edit("src/a.js", "1\n"),
      "src/a.js",
    ],
    [
      "a link to another file",
      () => {},
      (d) => {
        rmSync(join(d, "link"));
        symlinkSync("run.sh", join(d, "link"));
      },
      "link",
    ],
    [
      "a link turned into what it named",
      () => {},
      (d) => {
        rmSync(join(d, "link"));
        writeFileSync(join(d, "link"), "1\n");
      },
      "link",
    ],
    [
      "a directory turned into a link to its copy",
      (d) => writeFileSync(join(d, ".git/info/exclude"), "src\ncopy\n"),
      (d) => {
        renameSync(join(d, "src"), join(d, "copy"));
        symlinkSync("copy", join(d, "src"));
      },
      "src/a.js",
    ],
    [
      "a replaced commit",
      edit("src/a.js"),
      (d) => {
        const head = git(d, "rev-parse", "HEAD");
        git(d, "commit", "-q", "-a", "-m", "edited");
        const edited = git(d, "rev-parse", "HEAD");
        git(d, "reset", "-q", "--hard", head);
        git(d, "replace", head, edited);
        edit("src/a.js")(d);
        git(d, "add", "src/a.js");
      },
      "src/a.js",
    ],
  ];
  const control = everything(t);
  edit("src/a.js")(control.dir);
  assert.equal(control.run().rec.reason, "dirty-tree", "control");
  for (const [what, first, then, file] of cases) {
    const { dir, run } = everything(t);
    first(dir);
    then(dir);
    const r = run();
    assert.equal(r.rec.reason, "dirty-tree", what);
    assert.equal(r.rec.runs.length, 0, what);
    const named = r.rec.message.replace(/^.*not the head: /, "").split(", ");
    assert.ok(named.includes(file), `${what}: ${r.rec.message}`);
  }
});

test("a mode is compared where the filesystem keeps one (T319-CR-403)", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "rerun-at-head-mode-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(eng.keepsModes(dir), true);
  assert.deepEqual(readdirSync(dir), [], "the probe is removed");
  for (const mode of [0o777, 0o644]) {
    const io = {
      writeFileSync: () => {},
      chmodSync: () => {},
      rmSync: () => {},
      statSync: () => ({ mode }),
    };
    assert.equal(eng.keepsModes(dir, io), false, `every file reads ${mode}`);
  }
});

test("what a command leaves running cannot grow the saved output, or hold the engine (T319-CR-404, CR-405)", (t) => {
  const leave = (body) => {
    const f = fixture(t, {
      config: LIST("node leave.js"),
      criteria: ["`node leave.js` ends"],
    });
    const pid = join(f.dir, "..", `${f.dir.split("/").pop()}.pid`);
    t.after(() => {
      try {
        process.kill(Number(readFileSync(pid, "utf8")), "SIGKILL");
      } catch {
        /* it ended by itself */
      }
      rmSync(pid, { force: true });
    });
    writeFileSync(
      join(f.dir, "leave.js"),
      `const c = require("child_process").spawn("sh", ["-c", ${JSON.stringify(body)}], { detached: true, stdio: ["ignore", "inherit", "inherit"] });
require("fs").writeFileSync(${JSON.stringify(pid)}, String(c.pid));
console.log("started");
c.unref();
`,
    );
    git(f.dir, "add", "-A");
    git(f.dir, "commit", "-q", "-m", "leave");
    return { ...f, pid };
  };
  // it writes for ever: the bound holds at the return, and afterwards
  const loud = leave("while :; do printf %01000d 0; done");
  const [one] = loud.run("--max-output-bytes", "5000").rec.runs;
  assert.equal(one.output_capped, true);
  assert.equal(statSync(one.stdout).size, 5000);
  spawnSync("sleep", ["1"]);
  assert.equal(statSync(one.stdout).size, 5000);
  // it writes nothing and keeps the pipe: the engine returns with what the command printed
  const quiet = leave("exec sleep 600");
  const [two] = quiet.run().rec.runs;
  assert.doesNotThrow(
    () => process.kill(Number(readFileSync(quiet.pid, "utf8")), 0),
    "it is still running, so the engine did not wait for it",
  );
  assert.equal(two.exit_code, 0);
  assert.equal(readFileSync(two.stdout, "utf8"), "started\n");
});

test("a list the parse ends early, or under a key spelt with an escape, is refused (T319-CR-406)", () => {
  const list = "  rerunAtHead:\n    - echo a\n";
  for (const [what, config] of [
    ["a list row at column 0", `finalise:\n${list}- echo b\n`],
    ["a word at column 0", `finalise:\n${list}foo\n    - echo b\n`],
    ["an escaped block key alone", `"fin\\x61lise":\n${list}`],
    [
      "an escaped block key beside a plain one",
      `${LIST("echo a")}"fin\\u0061lise":\n${list}`,
    ],
    ["a long escape", `"fin\\U00000061lise":\n${list}`],
    [
      "both keys escaped",
      '"fin\\x61lise":\n  "rerun\\x41tHead":\n    - echo a\n',
    ],
    [
      "an explicit key",
      `tracker: github\n? finalise\n: rerunAtHead:\n    - echo a\n`,
    ],
    ["a tagged key", `!!str finalise:\n${list}`],
    ["another block's", `notes:\n${list}`],
  ])
    assert.throws(
      () => eng.parseRerunList(config),
      (e) => e.constructor.name === "UsageError",
      what,
    );
  // other blocks keep their shapes, at column 0 included
  for (const config of [
    "workflows:\n- name: x\n- y\n",
    `workflows:\n- name: x\n${LIST("echo a")}my key: 1\n`,
    '"acc\\x65ss":\n  tracker: full\n',
  ])
    assert.doesNotThrow(() => eng.parseRerunList(config), config);
});

test("only a file /finalise writes is a DoD record: code named like one is code (T319-CR-408)", (t) => {
  const at = dirname(DOC);
  const { dir, run } = fixture(t, {
    config: `${LIST("echo a")}ci:\n  docsOnly:\n    patterns:\n      - "**/*.md"\n`,
    criteria: ["`echo a` passes"],
  });
  const put = (name) => {
    mkdirSync(dirname(join(dir, at, name)), { recursive: true });
    writeFileSync(join(dir, at, name), "{}\n");
  };
  for (const name of [
    "task.9.dod.1.ac.json",
    "task.9.dod.2.security.plan.json",
    "task.9.dod.2.security.cases.json",
    "task.9.dod.2.security.cases.3.json",
    "task.9.dod.2.security.run.json",
    "task.9.dod.2.security.run.json.d/1.stdout",
  ])
    put(name);
  assert.equal(run().rec.reason, "ran");
  for (const name of [
    "task.9.dod.1.check.js",
    "task.9.dod.x.ac.json",
    "task.9.dod.1.ac.json.js",
    "task.9.dod.1.security.run.json.d/deep/1.js",
  ]) {
    put(name);
    assert.equal(run().rec.reason, "dirty-tree", name);
    rmSync(join(dir, at, name));
  }
  symlinkSync("../../../count.txt", join(dir, at, "task.9.dod.3.ac.json"));
  assert.equal(run().rec.reason, "dirty-tree", "a link");
});

test("a tracked file under the pipeline's state directory is the head's, and its edit is not let through", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  mkdirSync(join(dir, ".claude/state"), { recursive: true });
  writeFileSync(join(dir, ".claude/state/tool.js"), "1\n");
  git(dir, "add", "-f", ".claude/state/tool.js");
  git(dir, "commit", "-q", "-m", "tracked");
  assert.equal(run().rec.reason, "ran");
  writeFileSync(join(dir, ".claude/state/tool.js"), "2\n");
  assert.equal(run().rec.reason, "dirty-tree");
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
