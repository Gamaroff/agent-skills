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
  linkSync,
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
    [
      "core.ignorecase, a name in another case (T319-CR-801)",
      set("core.ignorecase", "true"),
      edit("src/A.js"),
      "src/A.js",
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
  // it writes nothing and keeps the file open: the engine returns with what the command printed
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
    // the block key is plain here, so nothing but the list key's own escape says it (task 320)
    [
      "another block's, with an escape",
      'notes:\n  "rerun\\x41tHead":\n    - echo a\n',
    ],
    [
      "another block's, with an escape, beside a plain one",
      `${LIST("echo a")}notes:\n  "rerun\\x41tHead":\n    - echo b\n`,
    ],
    ["an escaped block key with no list", '"finalis\\x65":\n  other: 1\n'],
    ["an escaped block key with nothing", 'finalise:\n"finalis\\u0065":\n'],
    // past a row at which the parse stops (task 320, DoD run 1)
    [
      "an escaped block key after a block scalar",
      'note: |\n  text\n"finalis\\x65":\n  deferralApprover: x\n',
    ],
    [
      "an escaped block key after a block scalar, beside a plain one",
      `${LIST("echo a")}note: |\n  text\n"finalis\\x65":\n  deferralApprover: x\n`,
    ],
    [
      "a near miss after a block scalar",
      "note: |\n  text\nFinalize:\n  deferralApprover: x\n",
    ],
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
    'note: |\n  "finalis\\x65":\n    x: 1\n',
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
    // what the security probe writes there: <key>.json, and nothing else
    "task.9.dod.2.security.run.json.d/bce9b609488e.json",
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

test("the reports and gates that wait for the acceptance commit are not code; a file named like one is (T319-CR-603)", (t) => {
  const at = dirname(DOC);
  const { dir, run } = fixture(t, {
    config: `${LIST("echo a")}ci:\n  docsOnly:\n    patterns:\n      - "README.md"\n`,
    criteria: ["`echo a` passes"],
  });
  const put = (name) => writeFileSync(join(dir, at, name), "x\n");
  mkdirSync(join(dir, at, "task.9.qa.2.x.security.run.json.d"));
  const records = [
    "task.9.bug.1.x.md",
    "task.9.dod.1.x.security.run.json",
    "task.9.gate.2.x.yml",
    "task.9.implementation.1.x.md",
    "task.9.pr-review.1.x.md",
    "task.9.qa.2.security.cases-held.json",
    "task.9.qa.2.security.cases.json",
    "task.9.qa.2.security.run.json",
    "task.9.qa.2.x.md",
    "task.9.qa.2.x.security.run.json",
    "task.9.qa.2.x.security.run.json.d/ab.json",
    "task.9.review.1.x.md",
  ];
  records.forEach(put);
  const r = run();
  assert.equal(r.rec.reason, "ran", r.rec.message);
  assert.deepEqual(
    r.rec.uncommitted_docs,
    records.map((n) => `${at}/${n}`),
  );
  for (const name of [
    "task.9.implementation.1.x.js",
    "task.9.implementation.x.md",
    "task.9.bug.1.x.sh",
    "task.9.qa.2.x.security.run.json.d/evil.js",
    "task.9.qa.2.x.json",
    "task.9.gate.2.x.md.yaml",
    "task.90.implementation.1.x.md",
    "notes.md",
  ]) {
    put(name);
    assert.equal(run().rec.reason, "dirty-tree", name);
    rmSync(join(dir, at, name));
  }
});

test("a submodule is never documentation: its commit, its entry and what is inside it (T319-CR-602)", (t) => {
  const { dir, sub, run } = everything(t, {
    config: 'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n',
  });
  git(
    dir,
    "-c",
    "protocol.file.allow=always",
    "submodule",
    "add",
    "-q",
    sub,
    "docs/theme",
  );
  git(dir, "commit", "-q", "-m", "theme");
  const theme = join(dir, "docs/theme");
  const pinned = git(theme, "rev-parse", "HEAD");
  assert.equal(run().rec.reason, "ran");
  const refused = (what) => {
    const r = run();
    assert.equal(r.rec.reason, "dirty-tree", what);
    assert.match(r.rec.message, /docs\/theme/, what);
  };
  git(theme, "commit", "-q", "--allow-empty", "-m", "moved");
  refused("another commit checked out");
  git(dir, "add", "docs/theme");
  refused("and staged");
  git(theme, "checkout", "-q", pinned);
  refused("staged, and the checkout back at the head's");
  git(dir, "reset", "-q");
  writeFileSync(join(theme, "count.txt"), "0 broken\n");
  refused("an edit inside");
  git(theme, "checkout", "-q", "--", ".");
  writeFileSync(join(theme, "new.md"), "x\n");
  refused("an untracked file inside");
  rmSync(join(theme, "new.md"));
  assert.equal(run().rec.reason, "ran", "back as it was");
  // an entry that only the head has
  git(dir, "update-index", "--force-remove", "docs/theme");
  refused("no longer in the index");
  git(dir, "reset", "-q");
  assert.equal(run().rec.reason, "ran", "back as it was");
  // an entry that only the index has
  git(
    dir,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${pinned},docs/theme2`,
  );
  refused("index only");
  git(dir, "reset", "-q");
  // control: an ordinary file beside it is documentation
  writeFileSync(join(dir, "docs/note.md"), "x\n");
  assert.deepEqual(run().rec.uncommitted_docs, ["docs/note.md"]);
  // removed, its entry too: no untracked directory is left to say so
  rmSync(theme, { recursive: true, force: true });
  git(dir, "update-index", "--force-remove", "docs/theme");
  refused("removed");
});

test("a command's output is saved whole when it exits with all of it just written (T319-CR-601)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("node big.js"),
    criteria: ["`node big.js` prints no ERROR"],
  });
  writeFileSync(
    join(dir, "big.js"),
    'for (const s of ["log", "error"]) { console[s]("x".repeat(2000000)); console[s]("ERROR"); }\nprocess.exit(0);\n',
  );
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "big");
  const [one] = run().rec.runs;
  assert.equal(one.exit_code, 0);
  assert.equal(one.output_capped, false);
  for (const f of [one.stdout, one.stderr]) {
    const text = readFileSync(f, "utf8");
    assert.equal(text.length, 2000007);
    assert.ok(text.endsWith("\nERROR\n"));
  }
});

test("a command that writes over its own output is recorded as having done so (T319-CR-601)", (t) => {
  const go = (script) => {
    const { dir, run } = fixture(t, {
      config: LIST("sh chk.sh"),
      criteria: ["`sh chk.sh` prints no ERROR"],
    });
    writeFileSync(join(dir, "chk.sh"), script);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chk");
    const { rec } = run();
    return {
      one: rec.runs[0],
      out: readFileSync(rec.runs[0].stdout, "utf8"),
      md: readFileSync(join(dirname(rec.runs[0].stdout), "run.md"), "utf8"),
    };
  };
  const long = "echo ERROR; echo ".concat("y".repeat(200), "; ");
  for (const [streams, script] of [
    [["stderr"], "echo ERROR >&2; echo done > /dev/stderr\n"],
    [
      ["stdout", "stderr"],
      "echo ERROR; echo x | tee /dev/stderr; : > /dev/stdout\n",
    ],
    [["stdout"], `${long}echo ok > /dev/stdout; ${long}\n`],
    [
      ["stdout"],
      "echo ERROR; printf clean | dd of=/dev/stdout conv=notrunc 2>/dev/null\n",
    ],
  ]) {
    const r = go(script);
    assert.deepEqual(r.one.output_overwritten, streams, script);
    assert.ok(
      r.md.includes(`its ${streams.join(" and ")} perhaps not whole`),
      script,
    );
  }
  // the other stream is not doubted for it (T319-CR-802)
  const whole = go('echo "0 broken"; echo warn > /dev/stderr\n');
  assert.deepEqual(whole.one.output_overwritten, ["stderr"]);
  assert.equal(whole.out, "0 broken\n");
  // control: appending to it, and writing to it in the ordinary way, keep every line in order
  const r = go("echo one; echo ERROR >> /dev/stdout; echo two; echo e >&2\n");
  assert.deepEqual(r.one.output_overwritten, []);
  assert.equal(r.out, "one\nERROR\ntwo\n");
  assert.doesNotMatch(r.md, /not whole/);
});

test("a listed command on an unindented line of a criterion is refused, not read past (T319-CR-605)", (t) => {
  const read = (section, config = LIST("echo a")) => {
    const { dir, run } = fixture(t, {
      config,
      criteria: ["`echo a` passes"],
    });
    writeFileSync(
      join(dir, DOC),
      `# T\n\n## Success Criteria\n\n${section}\n\n## Other\n\n- [ ] x\n\`echo a\`\n`,
    );
    return run().rec;
  };
  for (const [section, n] of [
    ["- [ ] the links are clean:\n`echo a` passes", 1],
    ["- [ ] first\n- [x] run `echo\na` first", 2],
    ["1. the links\n   are clean\n\n   and more:\n`echo a`", 1],
    ["- [ ] the links:\nthat is\n  `echo a`", 1],
    ["- [ ] `echo a` passes, and then\n`echo a` again", 1],
    // what looks like a block and cannot interrupt a paragraph (T319-CR-803)
    ["- [ ] fixes issue\n#936 and `echo a` passes", 1],
    ["- [ ] fixes issue\n####### `echo a`", 1],
    ["- [ ] fixes issue\n<b>and</b> `echo a`", 1],
    ["- [ ] fixes issue\n<header-x> `echo a`", 1],
    ["- [ ] fixes issue\n| and `echo a`", 1],
    ["- [ ] fixes issue\n``` x ``` and `echo a`", 1],
    ["- [ ] fixes issue\n===\n`echo a`", 1],
    ["- [ ] fixes issue\n--\n`echo a`", 1],
    ["- [ ] fixes issue\n-x `echo a`", 1],
    ["- [ ] fixes issue\n2.5 `echo a`", 1],
  ]) {
    const r = read(section);
    assert.equal(r.reason, "scan-broken", section);
    assert.match(r.message, new RegExp(`criterion #${n} names \`echo a\``));
  }
  // a line that starts a block of its own, or stands apart, is not part of the criterion
  for (const section of [
    "- [ ] `echo a` passes\nand so on",
    "- [ ] `echo a` passes\n\nRun `echo a` with the server up.",
    "Run `echo a` with the server up.\n\n- [ ] `echo a` passes",
    "- [ ] `echo a` passes\n- `echo a` is in the list",
    "- [ ] `echo a` passes\n### Notes on `echo a`",
    "- [ ] `echo a` passes\n> `echo a`",
    "- [ ] `echo a` passes\n---\nNote: `echo a`",
    "- [ ] `echo a` passes\n* * *\nNote: `echo a`",
    "- [ ] `echo a` passes\n#\nNote: `echo a`",
    "- [ ] `echo a` passes\n```sh\n`echo a`\n```",
    "- [ ] `echo a` passes\n~~~ `x`\n`echo a`\n~~~",
    "- [ ] `echo a` passes\n<DIV>\n`echo a`\n</DIV>",
    "- [ ] `echo a` passes\n<!-- `echo a` -->",
    "- [ ] `echo a` passes\n<pre>`echo a`</pre>",
    "- [ ] `echo a` passes\n-\nNote: `echo a`",
  ])
    assert.equal(read(section).reason, "ran", section);
});

// One repository, with `echo a` on the list, and the document rewritten for each reading.
function reader(t) {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  return (text) => {
    writeFileSync(join(dir, DOC), text);
    return run().rec;
  };
}

test("a section with no criterion the reader can find is read past when it names no listed command (T319-CR-805)", (t) => {
  const read = reader(t);
  for (const text of [
    "# T\n\nno criteria\n",
    "# T\n\n## Success Criteria\n\necho a, and `echo a b`\n",
    // a line in a fence ends no section, and outside one it does (T319-CR-1201)
    "# T\n\n## Success Criteria\n\nGiven x\nThen y\n\n```\n## x\n```\n\n## Other\n\n`echo a`\n",
    // the criteria stand in the section, in a shape the reader does not read (T320-CR-101)
    ...[
      "### AC1\n\nText.\n",
      "### 1. AC-2: a title\n\n**Text**.\n",
      "## AC1\n\nText.\n",
      "| AC | Text |\n| -- | ---- |\n",
      "Given x\nThen y\n",
      "**When** x\n**Then** y\n",
      "- Then x\n",
      "* x\n",
      "  - [ ] x\n",
      "  1. x\n",
      "- [x] \n\n- x\n",
      "```gherkin\nGiven x\nThen y\n```\n",
      "<!-- a -->\n\n- x\n\n<!-- b -->\n",
      "<!---->\n- x\n",
      "<!-->\n- x\n",
      // an opener in a fence or in a code span opens nothing (T320-CR-305)
      "```html\n<!-- x\n```\n\n- crit\n",
      "Write `<!--` or ``a ` <!--`` first.\n\n- crit\n",
      "A ``` and `<!--` too.\n\n- crit\n",
      "A \\\\`<!--` too.\n\n- crit\n",
      // a fence marker in a comment opens no fence (task 320, DoD run 1)
      "<!--\n```\n-->\n\n- crit\n",
      "- crit\n\n<!-- a\n~~~\n-->\n",
    ].map(
      (criteria) =>
        `# T\n\n## Acceptance Criteria\n\n${criteria}\n## Other\n\n\`echo a\`\n`,
    ),
    "# T\n\n## Success Criteria\n\n## Acceptance Criteria\n\n- x\n\n## Other\n\n`echo a`\n",
  ])
    assert.equal(read(text).reason, "none-named", text);
});

test("a section with no criterion the reader can find is refused when a listed command is named (T319-CR-805)", (t) => {
  const read = reader(t);
  for (const text of [
    "# T\n\n## Acceptance Criteria\n\n### AC1\n\nThen `echo a` passes\n",
    "# T\n\n## Criteria for success\n\n- [ ] `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\n### AC1\n\nPress the ` key.\n\nThen `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\n### AC1\n\nPress the ` key.\nThen `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\n### AC1\n\nThen `echo\n  a` passes\n",
    // under the other criteria heading, or past one with nothing under it (T319-CR-1003)
    "# T\n\n## Success Criteria\n\nSee below.\n\n## Acceptance Criteria\n\n- [ ] `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\n## AC1\n\nThen `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\nBelow.\n\n## AC1\n\nThen `echo a` passes\n",
    "# T\n\n## Acceptance Criteria\n\n### AC1\n\nPress the ` key, then `echo a` passes\n",
    // past a line in a fence, and beside a heading that only contains the word (T319-CR-1201)
    "# T\n\n## Success Criteria\n\n```\n## x\n```\n\nThen `echo a` passes\n",
    "# T\n\n## Success Criteria\r\n\r\n~~~\r\n## x\r\n~~~\r\n\r\nThen `echo a` passes\r\n",
    "# T\n\n## Success Criteria\n\n```\n# x\n```\n\nThen `echo a` passes\n",
    "# T\n\n## Done when\n\n- [ ] `echo a` passes\n\n## Rollback criteria\n\nNone.\n",
    "# T\n\n## Done when\n\n- [ ] `echo a` passes\n\n## Rollback\n\nNone.\n",
    // with AC headings, and no section the reader knows
    "# T\n\n## AC1\n\nGiven x\n\n## Done when\n\n- [ ] `echo a` passes\n",
    // beside one that holds none (T320-CR-101, T320-CR-202 to T320-CR-204)
    ...[
      "",
      "Below.\n\n",
      "### Functional\n\n",
      "Functional\n----------\n\n",
      "---\n\n",
      "* * *\n\n",
      "- [x]\n\n",
      "| | |\n|--|--|\n\n",
      "### AC1\n\n",
      "### AC1\n\n### Notes\n\nText.\n\n",
      "## AC1\n\n",
      '### AC1\n\n<a id="ac"></a>\n\n```js\n```\n\n',
      "<!-- to be written -->\n\n",
      "<!--\n- x\n-->\n\n",
      "<!--\n- x\n## old\n-->\n\n",
      "```gherkin\n```\n\n",
      '<a id="ac"></a>\n\n',
      "## Notes on AC-1\n\n- x\n\n",
      // a heading in a comment is none, and a comment starts no line anew (T320-CR-301)
      "<!--\n## AC1\n\n- x\n-->\n\n",
      "<!--\n## Acceptance Criteria\n\n- x\n-->\n\n",
      "<!--\n```\n-->\n\n<!--\n- x\n-->\n\n<!--\n```\n-->\n\n",
      "<!-- a -->## AC1\n\n<!--\n-->- x\n\n",
      "<!-- a -->| x |\n\n",
      "+ [x] <!-- a -->\n\n",
      "\\`<!-- \\`\n- x\n-->\n\n",
      "### A\n\nWhen this is done.\n\n### B\n\nThen go on.\n\n",
      // an introduction is no criterion, whatever its first word (T320-CR-304)
      "When the list below passes, this is done.\n\n",
      "Then this is done.\n\nGiven that, go on.\n\n",
    ].map(
      (none) =>
        `# T\n\n## Success Criteria\n\n${none}## Done when\n\n- [ ] \`echo a\` passes\n\n## Rollback criteria\n\nNone.\n`,
    ),
    "# T\n\n## Success Criteria\n\n## Acceptance Criteria\n\n## Done when\n\n- [ ] `echo a` passes\n\n## Rollback criteria\n\nNone.\n",
    "# T\n\n<!--\n## Acceptance Criteria\n\n- x\n-->\n\n## Success Criteria\n\n## Done when\n\n- [ ] `echo a` passes\n",
    // an opener that is never closed hides no command, and a line in a fence ends no section there either
    "# T\r\n\r\n## Success Criteria\r\n\r\n- x\r\n\r\nUse <!-- here\r\n\r\n```\r\n## y\r\n```\r\n\r\n- `echo a` passes\r\n\r\n## Other\r\n\r\nNone.\r\n",
    "# T\n\n## Success Criteria\n\n- x\n\n<!-- a --> Use <!-- here\n\n```\n## y\n```\n\n- `echo a` passes\n\n## Other\n\nNone.\n",
    // and neither does a heading in a comment end the section it stands in (T320-CR-301)
    "# T\n\n## Success Criteria\n\n- x\n\n<!--\n## old\n-->\n\n- `echo a` passes\n\n## Other\n\nNone.\n",
  ]) {
    const r = read(text);
    assert.equal(r.reason, "scan-broken", text);
    assert.match(r.message, /names `echo a` and has no criteria/);
  }
  // a comment that is not closed is read once, however many there are: read once for each, these do not
  // end within the time the run has (T320-CR-205)
  const many = read(`# T\n\n## Success Criteria\n\n${"<!--\n".repeat(400000)}`);
  assert.equal(many.reason, "none-named");
});

test("a backtick with no partner hides a command of a criterion, and that is refused, unless it is escaped (T319-CR-1005)", (t) => {
  const read = reader(t);
  for (const [criterion, reason] of [
    ["Press the ` key\n\n  Then `echo a` passes", "scan-broken"],
    ["Press the ` key\n  - then `echo a` passes", "scan-broken"],
    ["Press the key\n\n  Then `echo a` passes", "ran"],
    ["Press the ` key, then `echo a` passes", "scan-broken"],
    ["Press \\` then `echo a` passes", "ran"],
    ["In C:\\\\`echo a` passes", "ran"],
    ["``Press the ` key``\n\n  Then `echo a` passes", "ran"],
    // and on an unindented line, which is read as part of it here alone (T319-CR-1202)
    ["Press the ` key\nthen `echo a` passes", "scan-broken"],
    ["Press the ` key, and\nthen `echo a` passes\n- [ ] other", "scan-broken"],
    ["Press the ` key\n\nThen `echo a` passes", "none-named"],
    // in a span with a space inside it, or two backticks (T320-CR-103)
    ["Press the ` key, and\nthen ` echo a ` passes", "scan-broken"],
    ["Press the `` key, and\nthen ``echo a`` passes", "scan-broken"],
    ["Press the ` key\n\n  Then `echo\na` passes", "scan-broken"],
    ["Press the ` key, and\nthen ` echo a b ` passes", "none-named"],
  ]) {
    const r = read(`# T\n\n## Success Criteria\n\n- [ ] ${criterion}\n`);
    assert.equal(r.reason, reason, criterion);
    if (reason === "scan-broken")
      assert.match(r.message, /#1 names `echo a` after a backtick/);
  }
  // without the stray backtick the unindented line is the one that is named
  for (const criterion of [
    "Press the key\nthen `echo a` passes",
    "Press the key\nthen `echo\na` passes",
  ]) {
    const lazy = read(`# T\n\n## Success Criteria\n\n- [ ] ${criterion}\n`);
    assert.equal(lazy.reason, "scan-broken");
    assert.match(lazy.message, /#1 names `echo a` on an unindented line/);
  }
});

// git takes an untracked SUB/x.js for a file inside the submodule `sub` under core.ignorecase, and lists it
// nowhere (T319-CR-1203). A commit records the submodule; nothing needs to be cloned into it.
test("a file beside a submodule, in a directory that differs from it only in case, is not the submodule's (T319-CR-1203)", (t) => {
  for (const [what, file, reason, sub = "sub"] of [
    ["beside it", "SUB/x.js", "dirty-tree"],
    ["deeper beside it", "SUB/in/x.js", "dirty-tree"],
    ["beside one that is deeper", "lib/SUB/x.js", "dirty-tree", "lib/sub"],
    ["under another name", "SUB2/x.js", "dirty-tree"],
    ["a repository beside it", "SUB/.git/x", "dirty-tree"],
    ["nothing beside it", null, "ran"],
    // what the repository ignores is not compared, by its own rule for case (T320-CR-105)
    ["an ignored one beside it", "SUB/x.log", "ran"],
    ["ignored by its directory", "SUB/out/x.js", "ran"],
    ["ignored, with a newline in its name", "SUB/a\nb.log", "ran"],
    ["not the ignored one", "SUB/x.logs", "dirty-tree"],
  ]) {
    const { dir, run } = fixture(t, {
      config: LIST("echo a"),
      criteria: ["`echo a` passes"],
    });
    const at = join(dir, sub);
    mkdirSync(at, { recursive: true });
    git(at, "init", "-q", ".");
    writeFileSync(join(at, "in.js"), "in\n");
    git(at, "add", "-A");
    git(at, "commit", "-q", "-m", "sub");
    git(
      dir,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${git(at, "rev-parse", "HEAD")},${sub}`,
    );
    writeFileSync(join(dir, ".gitignore"), ".claude/\n/sub/*.log\n/sub/out/\n");
    git(dir, "add", ".gitignore");
    git(dir, "commit", "-q", "-m", "sub");
    git(dir, "config", "core.ignorecase", "true");
    if (existsSync(join(dir, "SUB"))) return; // a disk that folds names: SUB is sub
    if (file) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      if (file.includes(".git/")) {
        git(join(dir, "SUB"), "init", "-q", ".");
        git(join(dir, "SUB"), "commit", "-q", "--allow-empty", "-m", "own");
      } else writeFileSync(join(dir, file), "x\n");
    }
    const { rec } = run();
    assert.equal(rec.reason, reason, `${what}: ${rec.message}`);
    if (reason === "dirty-tree")
      assert.ok(rec.message.includes(file.split("/")[0]), rec.message);
  }
});

// Where the disk folds names, both spellings are one directory. As for T319-CR-1002, a link above it stands
// in for that disk, and git's listing is added to.
test("a second spelling of a submodule's directory is the submodule (T319-CR-1203)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  const at = join(dir, "a/sub");
  mkdirSync(at, { recursive: true });
  git(at, "init", "-q", ".");
  writeFileSync(join(at, "in.js"), "in\n");
  git(at, "add", "-A");
  git(at, "commit", "-q", "-m", "sub");
  writeFileSync(join(dir, ".gitignore"), ".claude/\n/A\n");
  git(dir, "add", ".gitignore");
  git(
    dir,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${git(at, "rev-parse", "HEAD")},a/sub`,
  );
  git(dir, "commit", "-q", "-m", "sub");
  if (existsSync(join(dir, "A"))) return; // a disk that folds names
  symlinkSync("a", join(dir, "A"));
  assert.equal(withListed(t, "A/sub/in.js", run).rec.reason, "ran");
});

test("what the repository ignores in any case is not compared, and what it does not ignore is (T319-CR-801)", (t) => {
  for (const [other, reason] of [
    [null, "ran"],
    ["other.js", "dirty-tree"],
  ]) {
    const { dir, run } = fixture(t, {
      config: LIST("echo a"),
      criteria: ["`echo a` passes"],
    });
    writeFileSync(join(dir, ".gitignore"), "Build/\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "ignore");
    git(dir, "config", "core.ignorecase", "true");
    mkdirSync(join(dir, "build"));
    writeFileSync(join(dir, "build/o"), "o\n");
    if (other) writeFileSync(join(dir, other), "x\n");
    const { rec } = run();
    assert.equal(rec.reason, reason, rec.message);
    if (other) assert.match(rec.message, /the head: other\.js$/);
  }
});

test("what git status shows as untracked is never left out by case (T319-CR-1001, CR-1004)", (t) => {
  for (const [ignore, file] of [
    ["*.gen.js\n!Keep.gen.js\n", "keep.gen.js"],
    ["/build/\n", ":/build/o.js"],
  ]) {
    const { dir, run } = fixture(t, {
      config: LIST("echo a"),
      criteria: ["`echo a` passes"],
    });
    writeFileSync(join(dir, ".gitignore"), `.claude/\n${ignore}`);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "ignore");
    git(dir, "config", "core.ignorecase", "true");
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), "x\n");
    assert.ok(git(dir, "status", "--porcelain", "-uall").includes(file));
    const { rec } = run();
    assert.equal(rec.reason, "dirty-tree", file);
    assert.ok(rec.message.endsWith(`the head: ${file}`), rec.message);
  }
});

/** `run()` where git's case-sensitive listing of what is untracked names `file` too. */
function withListed(t, file, run) {
  const bin = mkdtempSync(join(tmpdir(), "rerun-at-head-bin-"));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  const real = execFileSync("sh", ["-c", "command -v git"], {
    encoding: "utf8",
  }).trim();
  writeFileSync(
    join(bin, "git"),
    `#!/bin/sh\n"${real}" "$@" || exit $?\ncase "$*" in *ignorecase=false*--others*) printf '${file}\\0' ;; esac\n`,
  );
  chmodSync(join(bin, "git"), 0o755);
  const path = process.env.PATH;
  ENV.PATH = `${bin}:${path}`;
  try {
    return run();
  } finally {
    ENV.PATH = path;
  }
}

// What a disk that folds names gives the engine: the case-sensitive listing names a tracked file again, and
// both names are one file. Here one directory of the second name is a link to the first, and git's listing
// is added to, because this disk does not fold.
test("a second spelling of a tracked file is not a file of its own, and a second file is (T319-CR-1002)", (t) => {
  for (const [what, make, reason] of [
    ["one file", (d) => symlinkSync("src", join(d, "SRC")), "ran"],
    [
      "another file",
      (d) => {
        mkdirSync(join(d, "SRC"));
        writeFileSync(join(d, "SRC/a.js"), "a\n");
      },
      "dirty-tree",
    ],
    [
      "a second hard link",
      (d) => {
        mkdirSync(join(d, "SRC"));
        linkSync(join(d, "src/a.js"), join(d, "SRC/a.js"));
      },
      "dirty-tree",
    ],
  ]) {
    const { dir, run } = fixture(t, {
      config: LIST("echo a"),
      criteria: ["`echo a` passes"],
    });
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src/a.js"), "a\n");
    writeFileSync(join(dir, ".gitignore"), ".claude/\n/SRC\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "src");
    if (existsSync(join(dir, "SRC"))) return; // a disk that folds names cannot hold the other two
    make(dir);
    assert.equal(git(dir, "status", "--porcelain"), "", what);
    const { rec } = withListed(t, "SRC/a.js", run);
    assert.equal(rec.reason, reason, `${what}: ${rec.message}`);
  }
});

test("the list is the head's own, whatever a replacement says (T319-CR-804)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes", "`cat count.txt` passes"],
  });
  const other = join(dir, ".claude-other");
  writeFileSync(other, LIST("cat count.txt"));
  const blob = git(dir, "hash-object", "-w", other);
  rmSync(other);
  git(dir, "replace", git(dir, "rev-parse", "HEAD:skills-config.yaml"), blob);
  assert.equal(
    git(dir, "show", "HEAD:skills-config.yaml"),
    LIST("cat count.txt").trim(),
    "the replacement is in force",
  );
  const { rec } = run();
  assert.equal(rec.reason, "ran", rec.message);
  assert.deepEqual(
    rec.runs.map((r) => r.command),
    ["echo a"],
  );
});

test("CRLF line endings do not hide the criteria (T319-CR-606)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  const doc = join(dir, DOC);
  writeFileSync(doc, readFileSync(doc, "utf8").replaceAll("\n", "\r\n"));
  const { rec } = run();
  assert.equal(rec.reason, "ran", rec.message);
  assert.deepEqual(rec.runs[0].criteria, [
    { index: 1, text: "`echo a` passes" },
  ]);
});

test("a file whose name is not UTF-8 is read by its bytes (T319-CR-607)", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  const odd = Buffer.concat([
    Buffer.from(`${dir}/caf`),
    Buffer.from([0xe9]),
    Buffer.from(".js"),
  ]);
  try {
    writeFileSync(odd, "1\n");
  } catch {
    t.skip("this filesystem takes UTF-8 names only");
    return;
  }
  writeFileSync(join(dir, "café.js"), "1\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "odd");
  assert.equal(run().rec.reason, "ran");
  writeFileSync(odd, "2\n");
  assert.match(run().rec.message, /: caf.\.js$/);
  writeFileSync(odd, "1\n");
  writeFileSync(join(dir, "café.js"), "2\n");
  assert.match(run().rec.message, /: café\.js$/);
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

test("a document that is missing is scan-broken", (t) => {
  const { dir, run } = fixture(t, {
    config: LIST("echo a"),
    criteria: ["`echo a` passes"],
  });
  rmSync(join(dir, DOC));
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
