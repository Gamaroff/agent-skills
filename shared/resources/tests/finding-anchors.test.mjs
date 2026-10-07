/**
 * Behavioural tests for `finding-anchors.js` (task.194).
 *
 * The pure checker is driven with an injected `readFile`; the CLI is spawned against
 * real files and a throwaway git repository. The motivating incident is PR #594, where
 * the code reviewer reported `scripts/smoke/slugify.js:77` for an 11-line file — that
 * shape is out-of-range and easy. The case it does NOT show is the dangerous one: on a
 * long file a patch line number lands on a real line, and only the quoted `line_text`
 * can tell the line is wrong. The long-file control below is that case.
 *
 * Run via: node --test shared/resources/tests/finding-anchors.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(__dirname, "..", "finding-anchors.js");
const { checkAnchors, anchorOf, makeReader } = createRequire(import.meta.url)(
  ENGINE,
);

// The PR #594 fixture file: 11 lines, the real line of the defect is 8.
const SLUGIFY =
  [
    "'use strict';",
    "",
    "// Turn a title into a URL slug.",
    "function slugify(title) {",
    "  return String(title)",
    "    .toLowerCase()",
    "    .trim()",
    "    .replace(/[^a-z0-9]+/g, '-');",
    "}",
    "",
    "module.exports = { slugify };",
  ].join("\n") + "\n";

// A 120-line file whose every line is distinct, so a wrong line is in range.
const LONG =
  Array.from(
    { length: 120 },
    (_, i) => `const value${i + 1} = compute(${i + 1});`,
  ).join("\n") + "\n";

const files = { "scripts/smoke/slugify.js": SLUGIFY, "src/long.js": LONG };
const reader = () => {
  const calls = [];
  const readFile = (p) => {
    calls.push(p);
    return Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null;
  };
  return { readFile, calls };
};
const verdictOf = (finding) => checkAnchors([finding], reader())[0].verdict;

test("PR #594 shape: a patch line number past the end of an 11-line file is out-of-range", () => {
  const [r] = checkAnchors(
    [{ id: "CR-1", file_line: "scripts/smoke/slugify.js:77" }],
    reader(),
  );
  assert.equal(r.verdict, "out-of-range");
  assert.equal(r.lineCount, 11);
});

test("long-file control: an in-range wrong line is caught by line_text, the right line is ok", () => {
  const quoted = "const value8 = compute(8);";
  assert.equal(
    verdictOf({ file_line: "src/long.js:77", line_text: quoted }),
    "text-mismatch",
  );
  assert.equal(
    verdictOf({ file_line: "src/long.js:8", line_text: quoted }),
    "ok",
  );
});

test("text-mismatch reports what was expected and what the line says", () => {
  const [r] = checkAnchors(
    [
      {
        id: "CR-2",
        file_line: "src/long.js:77",
        line_text: "const value8 = compute(8);",
      },
    ],
    reader(),
  );
  assert.equal(r.expected, "const value8 = compute(8);");
  assert.equal(r.actual, "const value77 = compute(77);");
});

test("no line_text: the range is checked and the verdict says the text was not", () => {
  assert.equal(
    verdictOf({ file_line: "scripts/smoke/slugify.js:8" }),
    "unchecked-text",
  );
  assert.equal(
    verdictOf({ file_line: "scripts/smoke/slugify.js:8", line_text: "   " }),
    "unchecked-text",
  );
});

test("no-such-file for a path that does not exist", () => {
  assert.equal(verdictOf({ file_line: "src/missing.js:3" }), "no-such-file");
});

test("line 0 and a negative line are out-of-range; the last line is in range", () => {
  assert.equal(
    verdictOf({ file_line: "scripts/smoke/slugify.js:0" }),
    "out-of-range",
  );
  assert.equal(
    verdictOf({ file_line: "scripts/smoke/slugify.js:-2" }),
    "out-of-range",
  );
  assert.equal(
    verdictOf({
      file_line: "scripts/smoke/slugify.js:11",
      line_text: "module.exports = { slugify };",
    }),
    "ok",
  );
  assert.equal(
    verdictOf({ file_line: "scripts/smoke/slugify.js:12" }),
    "out-of-range",
  );
});

test("no-line: an AC id, a bare path, a range and a compound conformance ref", () => {
  assert.equal(verdictOf({ ref: "AC-3" }), "no-line");
  assert.equal(verdictOf({ ref: "docs/tasks/task.9/task.9.md" }), "no-line");
  assert.equal(verdictOf({ file_line: "src/long.js:42-58" }), "no-line");
  // What the conformance lens actually emitted on PR #594. A lazy `^(.+?):` parsed this as a
  // path called "AC-3 / scripts/smoke/slugify.js" and reported no-such-file (task.194 review 1).
  assert.equal(
    verdictOf({ ref: "AC-3 / scripts/smoke/slugify.js:8" }),
    "no-line",
  );
  assert.equal(anchorOf({ ref: "AC-3 / scripts/smoke/slugify.js:8" }), null);
});

test("a conformance ref of the path:line form is checked like a file_line", () => {
  assert.equal(
    verdictOf({
      ref: "scripts/smoke/slugify.js:8",
      line_text: ".replace(/[^a-z0-9]+/g, '-');",
    }),
    "ok",
  );
  assert.equal(
    verdictOf({ ref: "scripts/smoke/slugify.js:77" }),
    "out-of-range",
  );
});

test("whitespace: indentation and internal spacing differ, both sides are collapsed", () => {
  assert.equal(
    verdictOf({
      file_line: "scripts/smoke/slugify.js:5",
      line_text: "return String(title)",
    }),
    "ok",
  );
  assert.equal(
    verdictOf({
      file_line: "scripts/smoke/slugify.js:5",
      line_text: "\treturn   String(title)  ",
    }),
    "ok",
  );
});

test("a line_text that is a substring of the line matches", () => {
  assert.equal(
    verdictOf({
      file_line: "scripts/smoke/slugify.js:8",
      line_text: "/[^a-z0-9]+/g",
    }),
    "ok",
  );
});

test("CRLF line endings do not turn a match into a mismatch", () => {
  const crlf = { "w.js": "one\r\ntwo\r\n" };
  const [r] = checkAnchors([{ file_line: "w.js:2", line_text: "two" }], {
    readFile: (p) => crlf[p] ?? null,
  });
  assert.equal(r.verdict, "ok");
});

test("SC-7: each distinct path is read once per run", () => {
  const { readFile, calls } = reader();
  checkAnchors(
    [
      { file_line: "src/long.js:1" },
      { file_line: "src/long.js:2" },
      { file_line: "scripts/smoke/slugify.js:3" },
      { ref: "AC-1" },
    ],
    { readFile },
  );
  assert.deepEqual(calls.sort(), ["scripts/smoke/slugify.js", "src/long.js"]);
});

// ---------------------------------------------------------------- CLI

function cli(args, cwd) {
  const r = spawnSync(process.execPath, [ENGINE, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    code: r.status,
    out: r.stdout,
    err: r.stderr,
    json: () => JSON.parse(r.stdout),
  };
}

function scratch() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "finding-anchors-"));
  mkdirSync(path.join(dir, "scripts", "smoke"), { recursive: true });
  writeFileSync(path.join(dir, "scripts", "smoke", "slugify.js"), SLUGIFY);
  return dir;
}

test("CLI exits 0 with reason ok when every anchor is clean", () => {
  const dir = scratch();
  try {
    const f = path.join(dir, "findings.json");
    writeFileSync(
      f,
      JSON.stringify({
        code_review: {
          findings: [
            {
              id: "CR-1",
              file_line: "scripts/smoke/slugify.js:8",
              line_text: ".replace(/[^a-z0-9]+/g, '-');",
            },
          ],
        },
        pr_conformance: { findings: [{ id: "PC-1", ref: "AC-3" }] },
      }),
    );
    const r = cli(["--findings-file", f, "--root", dir, "--json"], dir);
    assert.equal(r.code, 0, r.err);
    const out = r.json();
    assert.equal(out.reason, "ok");
    assert.deepEqual(
      out.results.map((x) => [x.id, x.verdict]),
      [
        ["CR-1", "ok"],
        ["PC-1", "no-line"],
      ],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI exits 1 with reason malformed-anchors on the PR #594 shape, one verdict per finding", () => {
  const dir = scratch();
  try {
    const f = path.join(dir, "findings.json");
    writeFileSync(
      f,
      JSON.stringify([
        { id: "CR-1", file_line: "scripts/smoke/slugify.js:77" },
        { id: "CR-2", file_line: "scripts/smoke/slugify.js:8" },
      ]),
    );
    const r = cli(["--findings-file", f, "--root", dir, "--json"], dir);
    assert.equal(r.code, 1);
    const out = r.json();
    assert.equal(out.reason, "malformed-anchors");
    assert.deepEqual(
      out.results.map((x) => x.verdict),
      ["out-of-range", "unchecked-text"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI exits 2 with reason usage when --findings-file is missing", () => {
  const r = cli(["--json"], os.tmpdir());
  assert.equal(r.code, 2);
  assert.equal(r.json().reason, "usage");
  const bare = cli([], os.tmpdir());
  assert.equal(bare.code, 2);
  assert.match(bare.err, /--findings-file is required/);
});

test("CLI exits 2 on a findings file with no findings array", () => {
  const dir = scratch();
  try {
    const f = path.join(dir, "findings.json");
    writeFileSync(f, JSON.stringify({ something: [] }));
    const r = cli(["--findings-file", f, "--json"], dir);
    assert.equal(r.code, 2);
    assert.equal(r.json().reason, "usage");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI refuses a path that climbs out of --root as no-such-file", () => {
  const dir = scratch();
  try {
    const f = path.join(dir, "findings.json");
    writeFileSync(f, JSON.stringify([{ file_line: "../outside.js:1" }]));
    writeFileSync(path.join(path.dirname(dir), "outside.js"), "x\n");
    const r = cli(["--findings-file", f, "--root", dir, "--json"], dir);
    assert.equal(r.json().results[0].verdict, "no-such-file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(path.join(path.dirname(dir), "outside.js"), { force: true });
  }
});

test("--annotate writes the input back with anchor_check on every finding", () => {
  const dir = scratch();
  try {
    const f = path.join(dir, "findings.json");
    writeFileSync(
      f,
      JSON.stringify({
        code_review: {
          reviewed: "1 file",
          findings: [{ id: "CR-1", file_line: "scripts/smoke/slugify.js:77" }],
          truncated_count: 0,
        },
        pr_conformance: { findings: [{ id: "PC-1", ref: "AC-3" }] },
      }),
    );
    const r = cli(
      ["--findings-file", f, "--root", dir, "--annotate", f, "--json"],
      dir,
    );
    assert.equal(r.code, 1);
    const doc = JSON.parse(readFileSync(f, "utf8"));
    assert.equal(
      doc.code_review.reviewed,
      "1 file",
      "the rest of the document is kept",
    );
    assert.equal(doc.code_review.findings[0].anchor_check, "out-of-range");
    assert.equal(doc.pr_conformance.findings[0].anchor_check, "no-line");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--rev reads the committed file through git, not the working tree", () => {
  const dir = scratch();
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
    git("init", "-q");
    git("-c", "user.email=t@t", "-c", "user.name=t", "add", ".");
    git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "c");
    // The working tree now disagrees with HEAD: line 8 is gone.
    writeFileSync(path.join(dir, "scripts", "smoke", "slugify.js"), "x\n");
    const f = path.join(os.tmpdir(), `fa-${process.pid}-${Date.now()}.json`);
    writeFileSync(
      f,
      JSON.stringify([
        {
          id: "CR-1",
          file_line: "scripts/smoke/slugify.js:8",
          line_text: "-');",
        },
      ]),
    );
    try {
      const atHead = cli(
        ["--findings-file", f, "--root", dir, "--rev", "HEAD", "--json"],
        dir,
      );
      assert.equal(atHead.code, 0, atHead.err);
      assert.equal(atHead.json().results[0].verdict, "ok");
      const onDisk = cli(["--findings-file", f, "--root", dir, "--json"], dir);
      assert.equal(onDisk.json().results[0].verdict, "out-of-range");
      const noRev = cli(
        ["--findings-file", f, "--root", dir, "--rev", "no-such-rev", "--json"],
        dir,
      );
      // An unresolvable rev is "could not look": exit 2, reason bad-rev, no verdicts —
      // never no-such-file on every finding (task.194 QA cycle 1, CR-1).
      assert.equal(noRev.code, 2);
      assert.equal(noRev.json().reason, "bad-rev");
      assert.equal(noRev.json().results, undefined);
      const annotated = cli(
        [
          "--findings-file",
          f,
          "--root",
          dir,
          "--rev",
          "no-such-rev",
          "--annotate",
          f,
          "--json",
        ],
        dir,
      );
      assert.equal(annotated.code, 2);
      assert.equal(
        JSON.parse(readFileSync(f, "utf8"))[0].anchor_check,
        undefined,
        "a bad rev must not annotate findings with verdicts it could not reach",
      );
    } finally {
      rmSync(f, { force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// task.194 QA cycle 1, SEC-1: the working-tree reader judged containment on the lexical path and
// then followed a symlink, so `uploads/link-to-etc/passwd` read /etc/passwd. Both directions:
// a link that escapes is refused; a link that stays inside the root still reads.
test("the working-tree reader refuses a symlink that escapes --root and keeps one that stays inside", () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "finding-anchors-link-"));
  try {
    const root = path.join(base, "root");
    const outside = path.join(base, "outside");
    mkdirSync(path.join(root, "src"), { recursive: true });
    mkdirSync(outside);
    writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET\n");
    writeFileSync(path.join(root, "src", "real.js"), "const a = 1;\n");
    symlinkSync(outside, path.join(root, "escape"));
    symlinkSync(path.join(root, "src"), path.join(root, "inside"));
    const read = makeReader({ root });
    assert.equal(
      read("escape/secret.txt"),
      null,
      "a link out of the root must not be read",
    );
    assert.equal(
      read("inside/real.js"),
      "const a = 1;\n",
      "a link within the root still reads",
    );
    assert.equal(read("src/real.js"), "const a = 1;\n");
    const [r] = checkAnchors(
      [{ file_line: "escape/secret.txt:1", line_text: "nope" }],
      { readFile: read },
    );
    assert.equal(r.verdict, "no-such-file");
    assert.equal(
      r.actual,
      undefined,
      "nothing from outside the root reaches the output",
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// task.194 QA cycle 2. Three defects of one shape — the two read routes did not agree on what a
// path means, and "could not look" still blamed the reviewer for --root (CR2-1, CR2-2, CR2-4).
function gitRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "finding-anchors-tree-"));
  mkdirSync(path.join(dir, "pkg", "sub"), { recursive: true });
  writeFileSync(path.join(dir, "pkg", "sub", "a.js"), "first\nsecond\n");
  writeFileSync(path.join(dir, "top.js"), "top\n");
  const git = (...a) =>
    execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], {
      cwd: dir,
      stdio: "ignore",
    });
  git("init", "-q");
  git("add", ".");
  git("commit", "-q", "-m", "c");
  return dir;
}

test("both routes resolve an anchor against --root, including a --root below the top level", () => {
  const dir = gitRepo();
  try {
    const f = path.join(dir, "f.json");
    writeFileSync(
      f,
      JSON.stringify([
        { id: "in", file_line: "sub/a.js:2", line_text: "second" },
        { id: "top-relative", file_line: "pkg/sub/a.js:2" },
      ]),
    );
    const root = path.join(dir, "pkg");
    for (const extra of [[], ["--rev", "HEAD"]]) {
      const r = cli(
        ["--findings-file", f, "--root", root, ...extra, "--json"],
        dir,
      );
      const v = Object.fromEntries(
        r.json().results.map((x) => [x.id, x.verdict]),
      );
      const route = extra.length ? "--rev" : "working tree";
      assert.equal(v.in, "ok", `${route}: a path relative to --root reads`);
      assert.equal(
        v["top-relative"],
        "no-such-file",
        `${route}: a top-level path is not under --root`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory anchor is no-such-file on both routes, never a listing read as text", () => {
  const dir = gitRepo();
  try {
    const f = path.join(dir, "f.json");
    writeFileSync(
      f,
      JSON.stringify([
        { id: "d", file_line: "pkg:1" },
        { id: "d2", file_line: "pkg/sub:1", line_text: "a.js" },
      ]),
    );
    for (const extra of [[], ["--rev", "HEAD"]]) {
      const r = cli(
        ["--findings-file", f, "--root", dir, ...extra, "--json"],
        dir,
      );
      assert.deepEqual(
        r.json().results.map((x) => x.verdict),
        ["no-such-file", "no-such-file"],
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a --root that is not a directory exits 2 bad-root and annotates nothing, before --rev is read", () => {
  const dir = gitRepo();
  try {
    const f = path.join(dir, "f.json");
    writeFileSync(f, JSON.stringify([{ id: "x", file_line: "top.js:1" }]));
    for (const root of [path.join(dir, "missing"), path.join(dir, "top.js")]) {
      for (const extra of [[], ["--rev", "HEAD"], ["--rev", "no-such-rev"]]) {
        const r = cli(
          [
            "--findings-file",
            f,
            "--root",
            root,
            ...extra,
            "--annotate",
            f,
            "--json",
          ],
          dir,
        );
        assert.equal(r.code, 2, `${root} ${extra.join(" ")}`);
        assert.equal(r.json().reason, "bad-root");
        assert.equal(r.json().results, undefined);
      }
    }
    assert.equal(
      JSON.parse(readFileSync(f, "utf8"))[0].anchor_check,
      undefined,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
