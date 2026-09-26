// qa-read-back.js — the QA read-back, executed against real git repositories
// (task.149; TASK-149-BUG-2, -3, -5, -6, -7).
//
// Each case builds a scratch repository holding one work item — task-shaped or
// story-shaped — with its gate, QA report, bug report and a Change Log row, then
// breaks exactly one thing and asserts the verdict and the named problem. The
// script is what qa-task Step 12b and qa-story item 3e run; these cases are the
// behaviour those steps promise.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, "..", "qa-read-back.js");
const { readBack } = require(ENGINE);

const SHAPES = {
  task: { dir: "docs/tasks/task.9.x", stem: "task.9" },
  story: { dir: "docs/prd/p/epics/e/stories/story.9.1.x", stem: "story.9.1" },
};

function repo(shape = "task", mutate) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "qa-read-back-")),
  );
  const git = (...a) =>
    execFileSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", ...a], {
      cwd: root,
      stdio: "ignore",
    });
  git("init", "-q");
  fs.writeFileSync(path.join(root, ".gitignore"), "*.log\n");
  git("add", ".gitignore");
  git("commit", "-qm", "init");
  const { dir: d, stem } = SHAPES[shape];
  const dir = path.join(root, d);
  fs.mkdirSync(dir, { recursive: true });
  const doc = path.join(dir, `${path.basename(d)}.md`);
  fs.writeFileSync(
    doc,
    [
      "---",
      "type: task",
      "updated: 2026-09-26",
      "---",
      "# W",
      "",
      `- [r](./${stem}.qa.1.x.md) [g](./${stem}.gate.1.x.yml) [b](./${stem}.bug.1.y.md)`,
      "",
      "## Change Log",
      "",
      "| Date | Version | Description | Author |",
      "| -- | -- | -- | -- |",
      "| 2026-09-26 | | x | a |",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(dir, `${stem}.gate.1.x.yml`), "gate: FAIL\n");
  fs.writeFileSync(path.join(dir, `${stem}.qa.1.x.md`), "# r\n");
  fs.writeFileSync(path.join(dir, `${stem}.bug.1.y.md`), "# b\n");
  if (mutate) mutate({ root, dir, doc, stem });
  return {
    root,
    dir,
    doc,
    stem,
    done: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const append = (f, s) => fs.appendFileSync(f, s);
const edit = (f, from, to) =>
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(from, to));

function verdict(shape, mutate) {
  const w = repo(shape, mutate);
  try {
    return { ...readBack(w.doc), root: w.root };
  } finally {
    w.done();
  }
}

for (const shape of Object.keys(SHAPES)) {
  test(`${shape}: a complete cycle reads clean, and staging brings every linked artifact into the index`, () => {
    const w = repo(shape);
    try {
      const r = readBack(w.doc);
      assert.equal(r.exitCode, 0, JSON.stringify(r.problems));
      assert.equal(r.cycle, "1");
      const indexed = execFileSync("git", ["ls-files"], {
        cwd: w.root,
        encoding: "utf8",
      });
      assert.match(
        indexed,
        new RegExp(`${w.stem}\\.bug\\.1\\.y\\.md`),
        "pass 1 stages the linked bug report",
      );
    } finally {
      w.done();
    }
  });
}

const HALTS = [
  [
    "a linked artifact that was never written",
    ({ dir, stem }) => fs.rmSync(path.join(dir, `${stem}.bug.1.y.md`)),
    /bug\.1\.y\.md.*is missing/,
  ],
  [
    "a gitignored link target",
    ({ dir, doc }) => {
      append(doc, "[l](./run.log)\n");
      fs.writeFileSync(path.join(dir, "run.log"), "x\n");
    },
    /run\.log.*is ignored/,
  ],
  [
    "a case-mismatched link",
    ({ doc, stem }) =>
      append(doc, `[c](./${stem.replace("t", "T")}.qa.1.x.md)\n`),
    /is missing/,
  ],
  [
    "a stale updated:",
    ({ doc }) => edit(doc, "updated: 2026-09-26", "updated: 2026-09-25"),
    /dated after updated: 2026-09-25/,
  ],
  [
    "no QA report",
    ({ dir, doc, stem }) => {
      fs.rmSync(path.join(dir, `${stem}.qa.1.x.md`));
      edit(doc, `[r](./${stem}.qa.1.x.md) `, "");
    },
    /no QA report for cycle 1/,
  ],
  [
    "no gate",
    ({ dir, doc, stem }) => {
      fs.rmSync(path.join(dir, `${stem}.gate.1.x.yml`));
      edit(doc, `[g](./${stem}.gate.1.x.yml) `, "");
    },
    /no numbered gate/,
  ],
  [
    "no Change Log row",
    ({ doc }) => edit(doc, /## Change Log[\s\S]*$/, ""),
    /no Change Log row/,
  ],
  [
    "a stage that fails",
    ({ root }) => fs.writeFileSync(path.join(root, ".git", "index.lock"), ""),
    /could not stage/,
  ],
  // TASK-149-BUG-7 — staging stays inside the work item.
  [
    "an untracked link target outside the work item",
    ({ root, doc }) => {
      fs.writeFileSync(path.join(root, "wip.md"), "# someone else's work\n");
      append(
        doc,
        `[w](${path.relative(path.dirname(doc), path.join(root, "wip.md"))})\n`,
      );
    },
    /wip\.md.*untracked and outside/,
  ],
  [
    "an untracked directory link inside the work item",
    ({ dir, doc }) => {
      fs.mkdirSync(path.join(dir, "notes"));
      fs.writeFileSync(path.join(dir, "notes", "n.md"), "# n\n");
      append(doc, "[n](./notes/)\n");
    },
    /notes\/ .*untracked and outside .* \(or not a regular file\)/,
  ],
];

for (const [name, mutate, says] of HALTS) {
  test(`halts on ${name}`, () => {
    const r = verdict("task", mutate);
    assert.equal(r.exitCode, 1, JSON.stringify(r));
    assert.match(r.problems.join("\n"), says);
  });
}

test("a linked untracked file inside the work item is staged, and nothing outside it is", () => {
  const w = repo("task", ({ root, dir, doc }) => {
    fs.writeFileSync(path.join(dir, "notes.md"), "# n\n");
    append(doc, "[n](./notes.md)\n");
    fs.writeFileSync(path.join(root, "unrelated.md"), "# not linked\n");
  });
  try {
    const r = readBack(w.doc);
    assert.equal(r.exitCode, 0, JSON.stringify(r.problems));
    const indexed = execFileSync("git", ["ls-files"], {
      cwd: w.root,
      encoding: "utf8",
    });
    assert.match(indexed, /notes\.md/);
    assert.doesNotMatch(indexed, /unrelated\.md/);
  } finally {
    w.done();
  }
});

test("the CLI: exit 0 / 1 / 2, and an unsubstituted placeholder or a missing sibling engine is 'could not look', never a pass", () => {
  const w = repo("task");
  const lonely = fs.mkdtempSync(path.join(os.tmpdir(), "qa-read-back-lonely-"));
  try {
    const run = (script, args) =>
      spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.equal(run(ENGINE, ["--doc", w.doc]).status, 0);
    edit(w.doc, "updated: 2026-09-26", "updated: 2026-09-25");
    const halt = run(ENGINE, ["--doc", w.doc]);
    assert.equal(halt.status, 1);
    assert.match(halt.stdout, /^HALT qa-read-back:/m);
    assert.equal(run(ENGINE, ["--doc", "{task-file}"]).status, 2);
    assert.equal(run(ENGINE, []).status, 2);
    const copy = path.join(lonely, "qa-read-back.js");
    fs.copyFileSync(ENGINE, copy);
    const alone = run(copy, ["--doc", w.doc]);
    assert.equal(alone.status, 2, alone.stderr);
    assert.match(alone.stderr, /could not look/);
  } finally {
    w.done();
    fs.rmSync(lonely, { recursive: true, force: true });
  }
});
