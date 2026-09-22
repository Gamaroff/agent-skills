// doc-links.js — a document's relative Markdown links resolve from its OWN
// location, against the tracked tree (task.139, obs #154). Fixture tests prove
// the extractor and the resolver; the corpus guard at the end keeps every
// work-item document in the repository clean, with the pre-existing dead links
// pinned in KNOWN so the guard only ever tightens.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const ENGINE = path.join(REPO_ROOT, "shared", "resources", "doc-links.js");
const { extractRelativeLinks, checkDocument, trackedSet } = require(ENGINE);

test("extractor: a quoted relative link in prose IS a link; inside a code span or fence it is not", () => {
  const text = [
    'Quoting a skill: "the one-liner is in [x § y](references/x.md)". Also `[not](a.md)`.',
    "```bash",
    "[in-fence](b.md)",
    "```",
    "See [#anchor](#only-anchor) and [abs](https://example.com/z.md) and [mail](mailto:a@b).",
    "![img](./img/pic.png) and [dir](../sibling/)",
  ].join("\n");
  assert.deepEqual(
    extractRelativeLinks(text).map((l) => `${l.line}:${l.target}`),
    ["1:references/x.md", "6:./img/pic.png", "6:../sibling/"],
  );
});

test("resolver: resolves against the DOCUMENT's directory, not the cwd, and reports line + resolved path", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-"));
  try {
    fs.mkdirSync(path.join(dir, "docs", "tasks", "task.1.x"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(dir, "skills", "s", "references"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(dir, "skills", "s", "references", "x.md"),
      "# x\n",
    );
    fs.writeFileSync(
      path.join(dir, "docs", "tasks", "task.1.x", "task.1.x.md"),
      "Quote: [x](references/x.md). Real: [self](./task.1.x.md). Up: [s](../../../skills/s/references/x.md).\n",
    );
    // Not a git repo → disk resolution, reported as tracked: false.
    const r = checkDocument("docs/tasks/task.1.x/task.1.x.md", { root: dir });
    assert.equal(r.tracked, false);
    assert.equal(r.links, 3);
    assert.deepEqual(
      r.broken.map((b) => [b.line, b.target, b.resolved]),
      [[1, "references/x.md", "docs/tasks/task.1.x/references/x.md"]],
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolver: against a git repo it is the TRACKED tree — an untracked file on disk does not resolve", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-git-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs", "a.md"), "[b](b.md) [c](c.md)\n");
    fs.writeFileSync(path.join(dir, "docs", "b.md"), "# b\n");
    fs.writeFileSync(
      path.join(dir, "docs", "c.md"),
      "# c — on disk, untracked\n",
    );
    execFileSync("git", ["add", "docs/a.md", "docs/b.md"], { cwd: dir });
    const r = checkDocument("docs/a.md", { root: dir });
    assert.equal(r.tracked, true);
    assert.deepEqual(
      r.broken.map((b) => b.target),
      ["c.md"],
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: exit 1 with ✖ lines and a FAIL summary on a dead link (the red markers the fix-and-recheck evaluator reads); exit 0 clean; exit 2 usage", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-cli-"));
  try {
    fs.writeFileSync(path.join(dir, "bad.md"), "[dead](nope.md)\n");
    fs.writeFileSync(path.join(dir, "good.md"), "[self](good.md)\n");
    const run = (args) => {
      try {
        return {
          code: 0,
          out: execFileSync("node", [ENGINE, ...args], {
            cwd: dir,
            encoding: "utf8",
          }),
        };
      } catch (e) {
        return { code: e.status, out: e.stdout };
      }
    };
    const bad = run(["--file", "bad.md"]);
    assert.equal(bad.code, 1);
    assert.match(bad.out, /^✖ bad\.md:1 → nope\.md/m);
    assert.match(bad.out, /^FAIL doc-links: 1 dead link\(s\) in bad\.md$/m);
    const json = JSON.parse(run(["--file", "bad.md", "--json"]).out);
    assert.equal(json.reason, "broken");
    assert.equal(json.exitCode, 1);
    assert.equal(run(["--file", "good.md"]).code, 0);
    assert.equal(run([]).code, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Corpus guard: every work-item document (task, story, epic) resolves its
// relative links from its own directory. The two below were dead before this
// guard existed and are pinned, not fixed here: the ratchet only tightens — a
// pinned entry that is no longer dead must be deleted from KNOWN with its fix.
const KNOWN = new Set([
  "docs/tasks/task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.md:199",
  "docs/tasks/task.28.develop-task-loop-iteration-audit-subagent/task.28.develop-task-loop-iteration-audit-subagent.md:162",
]);
const WORK_ITEM_RE = /(^|\/)(task\.\d+|story\.\d+\.\d+|epic\.\d+)\.[^/]+\.md$/;
const ARTIFACT_RE =
  /\.(qa|gate|bug|implementation|review|dod|plan|handover|pr-review|risk|test-design|sprint-review-summary)\./;

function workItemDocs() {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--", "docs/tasks", "docs/prd", "docs/development"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter((f) => f && WORK_ITEM_RE.test(f) && !ARTIFACT_RE.test(f));
}

test("corpus: every work-item document's relative links resolve (KNOWN pinned, ratchet only tightens)", () => {
  const docs = workItemDocs();
  assert.ok(
    docs.length >= 100,
    `only ${docs.length} work-item documents walked — the walk is broken, not the corpus clean`,
  );
  const tracked = trackedSet(REPO_ROOT);
  assert.ok(
    tracked && tracked.size > 1000,
    "git ls-files returned nothing — the resolver would be answering the wrong question",
  );
  const dead = [];
  for (const f of docs) {
    for (const b of checkDocument(f, { root: REPO_ROOT, tracked }).broken)
      dead.push(`${f}:${b.line}`);
  }
  const newDead = dead.filter((d) => !KNOWN.has(d));
  const healed = [...KNOWN].filter((k) => !dead.includes(k));
  assert.deepEqual(
    newDead,
    [],
    `dead relative link(s) in work-item documents — a quoted skill link is still a link:\n  ${newDead.join("\n  ")}`,
  );
  assert.deepEqual(
    healed,
    [],
    `KNOWN entries no longer dead — delete them so the ratchet tightens:\n  ${healed.join("\n  ")}`,
  );
});
