// doc-links.js — a document's relative Markdown links resolve from its OWN
// location, against the tracked tree (task.139, obs #154). Fixture tests prove
// the extractor and the resolver — each named after the QA cycle 3 finding it
// pins — and the corpus guard at the end keeps every work-item document in
// the repository clean, with the pre-existing dead links pinned in KNOWN so
// the guard only ever tightens.
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
const { extractRelativeLinks, checkDocument, repoRoot, trackedSet } = require(
  ENGINE,
);

const targets = (text) => extractRelativeLinks(text).map((l) => l.target);

// A fixture directory that git will NOT see as inside this repository, even
// when TMPDIR itself sits inside a worktree (CR-8): GIT_CEILING_DIRECTORIES
// stops discovery at the fixture's parent.
function withNonRepoFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-"));
  const prev = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(dir);
  try {
    assert.equal(
      repoRoot(dir),
      null,
      "fixture must not be inside a repository",
    );
    return fn(dir);
  } finally {
    if (prev === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function withRepoFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-git-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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

test("extractor (CR-1): a line-initial backtick run with a backtick in its info string is a code span, not a fence", () => {
  // task.42's document, line 315: a four-backtick span quoting a three-backtick fence.
  const text = [
    "```` ``` ```` or `~~~` fenced block. Then [after](after.md).",
    "",
    "Later [still-seen](later.md).",
  ].join("\n");
  const r = extractRelativeLinks(text);
  assert.deepEqual(
    r.map((l) => l.target),
    ["after.md", "later.md"],
  );
  assert.equal(r.unterminatedFence, null);
});

test("extractor (CR-1): a fence still open at EOF is reported, not silently skipped past", () => {
  const text = "[seen](a.md)\n```\n[unscanned](b.md)\n";
  const r = extractRelativeLinks(text);
  assert.deepEqual(
    r.map((l) => l.target),
    ["a.md"],
  );
  assert.equal(r.unterminatedFence, 2);
});

test("extractor: fence closers must be the same character, at least as long, and bare", () => {
  const text = [
    "~~~~",
    "[in](a.md)",
    "~~~", // shorter — does not close
    "[still-in](b.md)",
    "~~~~ trailing", // not bare — does not close
    "[still-in-2](c.md)",
    "````", // wrong character — does not close
    "[still-in-3](d.md)",
    "~~~~~",
    "[out](e.md)",
  ].join("\n");
  assert.deepEqual(targets(text), ["e.md"]);
});

test("extractor (CR-7): a backticked quotation wrapped across a line break is still code; an unmatched run is literal and bounded by its paragraph", () => {
  const wrapped = "a `[wrapped](w.md) still\ncode` then [real](r.md)\n";
  assert.deepEqual(targets(wrapped), ["r.md"]);
  // The shape task.139's own document has at line 85: an escaped backtick
  // leaves a `` run with no closer; it must not pair with a run in a later
  // paragraph and blank every link in between.
  const odd =
    "`through \\`x\\``, phrase [x](x.md)\n\nnext paragraph [y](y.md) `` tail\n";
  assert.deepEqual(targets(odd), ["x.md", "y.md"]);
});

test("extractor (C4-CR-1): CRLF input — fences open, paragraphs split, and an open fence is still reported", () => {
  assert.deepEqual(
    targets("`open [x](x.md)\r\n\r\nnext [y](y.md) ` tail\r\n[z](z.md)"),
    ["x.md", "y.md", "z.md"],
  );
  assert.deepEqual(targets("```\r\n[in](a.md)\r\n```\r\n[out](b.md)\r\n"), [
    "b.md",
  ]);
  assert.equal(
    extractRelativeLinks("```\r\n[in](a.md)\r\n").unterminatedFence,
    1,
  );
});

test("extractor (C4-CR-3): a failed code-span match does not retry from inside a backtick run", () => {
  assert.deepEqual(targets("``[x](a.md)` then [y](b.md)"), ["a.md", "b.md"]);
});

test("extractor (C4-CR-4): a fence indented inside a list item is a fence", () => {
  assert.deepEqual(
    targets(
      "- item\n\n    ```\n    [in](a.md)\n\n    [in2](b.md)\n    ```\n[out](c.md)",
    ),
    ["c.md"],
  );
});

test("extractor (C4-CR-5): a prose line shaped like a reference definition is not one; an escaped bracket is not a link", () => {
  assert.deepEqual(
    targets("[Note]: see below\n[ref]: refs/x.md\n\\[not\\](a.md) [yes](b.md)"),
    ["refs/x.md", "b.md"],
  );
});

test("extractor (CR-6): reference definitions, HTML href/src, nested brackets, <spaced targets>, titles and parenthesised targets", () => {
  const text = [
    "[ref]: references/ref.md",
    '[r2]: <refs/with space.md> "title"',
    '<a href="html/a.md">a</a> <img src="img/b.png">',
    "[see [x]](nested.md) and [t](title.md 'single') and [p](paren.md (title))",
    "[sp](<spaced target.md>) and [pp](a(b).md)",
    '[abs](http://x/y.md) <a href="https://x/y">no</a>',
  ].join("\n");
  assert.deepEqual(targets(text), [
    "references/ref.md",
    "refs/with space.md",
    "html/a.md",
    "img/b.png",
    "nested.md",
    "title.md",
    "paren.md",
    "spaced target.md",
    "a(b).md",
  ]);
});

test("resolver: resolves against the DOCUMENT's directory, not the cwd, and reports line + resolved path", () => {
  withNonRepoFixture((dir) => {
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
    const r = checkDocument("docs/tasks/task.1.x/task.1.x.md", { root: dir });
    assert.equal(r.tracked, false);
    assert.equal(r.links, 3);
    assert.deepEqual(
      r.broken.map((b) => [b.line, b.target, b.resolved]),
      [[1, "references/x.md", "docs/tasks/task.1.x/references/x.md"]],
    );
  });
});

test("resolver: against a git repo it is the TRACKED tree — an untracked file on disk does not resolve", () => {
  withRepoFixture((dir) => {
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
  });
});

test("resolver (CR-2): the answer does not depend on the cwd — launched from a subdirectory, links that escape it still resolve", () => {
  withRepoFixture((dir) => {
    fs.mkdirSync(path.join(dir, "docs", "tasks", "t"), { recursive: true });
    fs.mkdirSync(path.join(dir, "skills", "s", "references"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(dir, "shared.md"), "# shared\n");
    fs.writeFileSync(
      path.join(dir, "docs", "tasks", "t", "t.md"),
      "[up](../../../shared.md) [dead](nope.md)\n",
    );
    fs.writeFileSync(
      path.join(dir, "skills", "s", "references", "doc-links.js"),
      fs.readFileSync(ENGINE),
    );
    execFileSync("git", ["add", "-A"], { cwd: dir });
    // Library call from a subdirectory root.
    const r = checkDocument("../../docs/tasks/t/t.md", {
      root: path.join(dir, "skills", "s"),
    });
    assert.equal(r.file, "docs/tasks/t/t.md");
    assert.deepEqual(
      r.broken.map((b) => b.target),
      ["nope.md"],
    );
    // CLI launched from the skill directory, addressing the engine bare.
    let out;
    try {
      execFileSync(
        "node",
        ["references/doc-links.js", "--file", "../../docs/tasks/t/t.md"],
        {
          cwd: path.join(dir, "skills", "s"),
          encoding: "utf8",
        },
      );
      assert.fail("expected exit 1");
    } catch (e) {
      out = e.stdout;
      assert.equal(e.status, 1);
    }
    assert.match(out, /^✖ docs\/tasks\/t\/t\.md:1 → nope\.md/m);
    assert.doesNotMatch(out, /shared\.md/);
  });
});

test("CLI (TQ-1, CR-9): exit 1 with ✖ lines and a FAIL summary on a dead link or an open fence (the red markers the fix-and-recheck evaluator reads); exit 0 clean; exit 2 usage — and exitCode, not exit()", () => {
  withNonRepoFixture((dir) => {
    fs.writeFileSync(path.join(dir, "bad.md"), "[dead](nope.md)\n");
    fs.writeFileSync(path.join(dir, "fence.md"), "[ok](fence.md)\n```\n");
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
    assert.match(bad.out, /^FAIL doc-links: 1 finding\(s\) in bad\.md$/m);
    const fence = run(["--file", "fence.md"]);
    assert.equal(fence.code, 1);
    assert.match(fence.out, /^✖ fence\.md:2 → fence opened here never closes/m);
    const json = JSON.parse(run(["--file", "bad.md", "--json"]).out);
    assert.equal(json.reason, "broken");
    assert.equal(json.exitCode, 1);
    assert.equal(run(["--file", "good.md"]).code, 0);
    assert.equal(run([]).code, 2);
    assert.equal(run(["--root"]).code, 2);
    assert.equal(run(["--file"]).code, 2);
    assert.equal(run(["--file", "missing.md"]).code, 2);
    // C4-CR-8: a missing --root names --root, not the file.
    const rootErr = run(["--root", "/nope", "--file", "a.md", "--json"]);
    assert.equal(rootErr.code, 2);
    assert.match(JSON.parse(rootErr.out).error, /^--root /);
  });
  const src = fs.readFileSync(ENGINE, "utf8");
  assert.doesNotMatch(
    src,
    /process\.exit\([^)]/,
    "exit() after a stdout write truncates the write when piped (bug.3)",
  );
});

// ---------------------------------------------------------------------------
// Corpus guard: every work-item document (task, story, epic) resolves its
// relative links from its own directory. The two below were dead before this
// guard existed and are pinned by file:target (CR-10 — not by line, which an
// unrelated edit above moves); a pinned entry that is no longer dead must be
// deleted from KNOWN with its fix. The ratchet only tightens.
const KNOWN = new Set([
  "docs/tasks/task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.md → ./task.14.qa.1.implementation-report-stash-hardening.md",
  "docs/tasks/task.28.develop-task-loop-iteration-audit-subagent/task.28.develop-task-loop-iteration-audit-subagent.md → ../../../../shared/resources/develop-pipeline-step-3-develop-loop.md",
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

test("corpus: every work-item document's relative links resolve and every fence closes (KNOWN pinned by file:target, ratchet only tightens)", () => {
  const docs = workItemDocs();
  assert.ok(
    docs.length >= 100,
    `only ${docs.length} work-item documents walked — the walk is broken, not the corpus clean`,
  );
  const repo = repoRoot(REPO_ROOT);
  const tracked = trackedSet(REPO_ROOT);
  assert.ok(
    tracked && tracked.size > 1000,
    "git ls-files returned nothing — the resolver would be answering the wrong question",
  );
  const dead = [];
  const openFences = [];
  let links = 0;
  for (const f of docs) {
    const r = checkDocument(f, { root: REPO_ROOT, tracked, repo });
    links += r.links;
    for (const b of r.broken) dead.push(`${f} → ${b.target}`);
    if (r.unterminatedFence) openFences.push(`${f}:${r.unterminatedFence}`);
  }
  assert.ok(
    links >= 200,
    `only ${links} relative links parsed across ${docs.length} documents — the extractor is blind, not the corpus link-free`,
  );
  const newDead = dead.filter((d) => !KNOWN.has(d));
  const healed = [...KNOWN].filter((k) => !dead.includes(k));
  assert.deepEqual(
    openFences,
    [],
    `fence opened and never closed — links after it were not scanned:\n  ${openFences.join("\n  ")}`,
  );
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

test("state (task.149, obs #164): a broken link says whether the target is untracked on disk or missing, and the red markers are unchanged", () => {
  withRepoFixture((dir) => {
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "docs", "a.md"),
      "[report](report.md) [gate](gate.yml) [ok](b.md)\n",
    );
    fs.writeFileSync(path.join(dir, "docs", "b.md"), "# b\n");
    fs.writeFileSync(
      path.join(dir, "docs", "report.md"),
      "# written, not committed\n",
    );
    execFileSync("git", ["add", "docs/a.md", "docs/b.md"], { cwd: dir });

    const r = checkDocument("docs/a.md", { root: dir });
    assert.deepEqual(
      r.broken.map((b) => [b.target, b.state]),
      [
        ["report.md", "untracked"],
        ["gate.yml", "missing"],
      ],
    );

    let out;
    try {
      execFileSync("node", [ENGINE, "--file", "docs/a.md"], {
        cwd: dir,
        encoding: "utf8",
      });
    } catch (e) {
      out = e.stdout;
    }
    assert.match(out, /^✖ docs\/a\.md:1 → report\.md .*\[untracked\]$/m);
    assert.match(out, /^✖ docs\/a\.md:1 → gate\.yml .*\[missing\]$/m);
    assert.match(out, /^FAIL doc-links: 2 finding\(s\) in docs\/a\.md$/m);
  });
});

test("state (task.149): outside a repository the disk was already read, so a broken link can only be missing", () => {
  withNonRepoFixture((dir) => {
    fs.writeFileSync(path.join(dir, "a.md"), "[x](x.md)\n");
    const r = checkDocument("a.md", { root: dir });
    assert.equal(r.tracked, false);
    assert.deepEqual(
      r.broken.map((b) => b.state),
      ["missing"],
    );
  });
});

test("state (task.149 CR-2): a gitignored target on disk is ignored, not untracked — it can never be committed", () => {
  withRepoFixture((dir) => {
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitignore"), "*.log\n");
    fs.writeFileSync(
      path.join(dir, "docs", "a.md"),
      "[log](run.log) [new](new.md)\n",
    );
    fs.writeFileSync(path.join(dir, "docs", "run.log"), "x\n");
    fs.writeFileSync(path.join(dir, "docs", "new.md"), "# new\n");
    execFileSync("git", ["add", ".gitignore", "docs/a.md"], { cwd: dir });
    const r = checkDocument("docs/a.md", { root: dir });
    assert.deepEqual(
      r.broken.map((b) => [b.target, b.state]),
      [
        ["run.log", "ignored"],
        ["new.md", "untracked"],
      ],
    );
  });
});

test("state (TASK-149-BUG-4): a case-mismatched link is missing on every filesystem, and a link above the repository is outside-repo — never untracked", () => {
  withRepoFixture((dir) => {
    fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "docs", "a.md"),
      "[r](Report.md) [d](../Docs/b.md) [o](../../outside.md) [ok](new.md)\n",
    );
    fs.writeFileSync(path.join(dir, "docs", "report.md"), "# r\n");
    fs.writeFileSync(path.join(dir, "docs", "b.md"), "# b\n");
    fs.writeFileSync(path.join(dir, "docs", "new.md"), "# new\n");
    fs.writeFileSync(path.join(path.dirname(dir), "outside.md"), "# o\n");
    try {
      execFileSync("git", ["add", "docs/a.md"], { cwd: dir });
      const r = checkDocument("docs/a.md", { root: dir });
      assert.deepEqual(
        r.broken.map((b) => [b.target, b.state]),
        [
          ["Report.md", "missing"],
          ["../Docs/b.md", "missing"],
          ["../../outside.md", "outside-repo"],
          ["new.md", "untracked"],
        ],
      );
    } finally {
      fs.rmSync(path.join(path.dirname(dir), "outside.md"), { force: true });
    }
  });
});
