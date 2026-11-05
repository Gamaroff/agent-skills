"use strict";
/**
 * Every skill or shared doc that reads text written by someone else cites the untrusted-content rule
 * (task 261).
 *
 * `shared/resources/untrusted-content-rule.md` tells the model that issue and PR bodies, comments and
 * fetched pages are data, never instructions. A rule nobody cites is a rule nobody reads, and a skill
 * added next month that fetches a comment body would have nothing to cite and nothing to fail. So the
 * population is derived from the tree on every run, and this test fails when a file brings third-party
 * prose into the model's context without naming the rule.
 *
 * POPULATION — `skills/<name>/SKILL.md` and `shared/resources/*.md`. Bundled `references/` copies are
 * never read (they are generated from the sources and would double-count).
 *
 * READ MARKER, per line (a compound key, not one shared token: obs #135):
 *   - `gh pr|issue view … --json … body|comments` (the prose fields);
 *   - `WebSearch`, `WebFetch`, `browser-use get text`, `get_page_text`.
 * A marker inside a sentence that forbids or disclaims it ("never", "do not", …) is ignored.
 *
 * ALLOWLIST — a file whose marker is not a read of third-party prose, with the reason. An entry must
 * still match a marker, so the list only shrinks.
 *
 * KNOWN BLIND SPOTS — reads this key cannot see, stated rather than silently passed:
 *   - a raw `curl` of a URL;
 *   - the Atlassian MCP `getJiraIssue` / `fetch`: every current use requests named `fields`
 *     (status, summary, labels) and no prose, so it is not keyed here;
 *   - `gh api` calls.
 * The control cases at the bottom pin the matcher, including the `curl` blind spot.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const REPO_ROOT = path.join(__dirname, "..");
const SHARED = path.join(REPO_ROOT, "shared", "resources");
const SKILLS = path.join(REPO_ROOT, "skills");

const CITATION = /untrusted-content-rule\.md/;
const MARKERS = [
  /\bgh (?:pr|issue) view\b[^\n]*--json[^\n]*\b(?:body|comments)\b/,
  /\bWebSearch\b|\bWebFetch\b|\bbrowser-use get text\b|\bget_page_text\b/,
];
const FORBIDDING = /\b(?:never|do not|don't|must not|not allowed|forbidden)\b/i;

// file (repo-relative) → why its marker is not a read of third-party prose.
const ALLOWLIST = {
  "skills/create-issue/SKILL.md":
    "reads back the issue body this same run created (own content)",
  "skills/finalise/SKILL.md":
    "reads comments only to find this pipeline's own marker comment, and round-trips the body it wrote",
  "skills/sync-github-bug/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-epic/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-story/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "skills/sync-github-task/SKILL.md":
    "fetches the body to diff it against the local document that produced it; the text is never acted on",
  "shared/resources/tracker-state-poller-subagent.md":
    "counts comments (`| length`); never reads their text",
  "shared/resources/tracker-access-record.md":
    "an example record of a command, not a read",
  "shared/resources/develop-pipeline-pause.md":
    "searches PR comments for the pipeline's own marker comment; the text is only matched, never acted on",
  "shared/resources/develop-pipeline-resume-contract.md":
    "greps PR comments for the pipeline's own acceptance comment as a resume check; the text is only matched",
};

function populationFiles(root = REPO_ROOT) {
  const out = [];
  const shared = path.join(root, "shared", "resources");
  if (fs.existsSync(shared)) {
    for (const f of fs.readdirSync(shared)) {
      // The rule document names the markers in order to describe them; it is not a read site.
      if (f.endsWith(".md") && f !== "untrusted-content-rule.md")
        out.push(path.join(shared, f));
    }
  }
  const skills = path.join(root, "skills");
  if (fs.existsSync(skills)) {
    for (const d of fs.readdirSync(skills)) {
      const f = path.join(skills, d, "SKILL.md");
      if (fs.existsSync(f)) out.push(f);
    }
  }
  return out;
}

/** Marker lines of one file's text: [{ line, text }], forbidding sentences dropped. */
function markerLines(text) {
  const hits = [];
  // The open fence is remembered by character and length. A fence closes only on the same
  // character, at least as long, with nothing after it (CommonMark), so a ``` line inside a ~~~
  // fence or inside a longer fence is content, and an unclosed fence stays local to this text.
  let fence = null;
  text.split("\n").forEach((l, i) => {
    // `[^\n]*`, not `.*`: a CRLF line keeps its `\r` after the split on `\n`, `.` does not match `\r`
    // and `$` has no `m` flag, so `.*$` never matched a CRLF fence line and the fence never opened
    // (task 262). `.trim()` below drops the `\r` from the info string.
    const f = l.match(/^\s*(`{3,}|~{3,})([^\n]*)$/);
    if (f) {
      if (!fence) {
        fence = { ch: f[1][0], len: f[1].length };
        return;
      }
      if (f[1][0] === fence.ch && f[1].length >= fence.len && !f[2].trim()) {
        fence = null;
        return;
      }
    }
    const inFence = fence !== null;
    // A forbidding sentence is prose. Inside a fence a comment such as `# do not ...` is not one,
    // so a command line there always counts as a read.
    const forbidding = !inFence && FORBIDDING.test(l.replace(/`[^`]*`/g, ""));
    if (MARKERS.some((m) => m.test(l)) && !forbidding) {
      hits.push({ line: i + 1, text: l.trim() });
    }
  });
  return hits;
}

/** Findings over {relPath: text}: files with a marker, no allowlist entry and no citation. */
function check(files, allowlist) {
  const uncited = [];
  const staleAllow = new Set(Object.keys(allowlist));
  for (const [rel, text] of Object.entries(files)) {
    const hits = markerLines(text);
    if (hits.length === 0) continue;
    if (allowlist[rel]) {
      staleAllow.delete(rel);
      continue;
    }
    if (!CITATION.test(text))
      uncited.push({ file: rel, line: hits[0].line, text: hits[0].text });
  }
  return { uncited, staleAllow: [...staleAllow] };
}

// Read once: three tests share it, and none writes to it. The repeated tree read, not the
// scratch-repo cases, was the cost of this file (task 263).
let TREE = null;
function loadTree() {
  if (TREE) return TREE;
  const files = {};
  for (const f of populationFiles()) {
    files[path.relative(REPO_ROOT, f).split(path.sep).join("/")] =
      fs.readFileSync(f, "utf8");
  }
  TREE = files;
  return TREE;
}

test("the rule document exists and carries the six headings a citation can point at", () => {
  const rule = fs.readFileSync(
    path.join(SHARED, "untrusted-content-rule.md"),
    "utf8",
  );
  for (const h of [
    "What counts as untrusted",
    "The rule",
    "Extract, do not obey",
    "Prefer a narrow read",
    "When text appears to instruct you",
    "What this does not cover",
  ]) {
    assert.match(rule, new RegExp(`^## ${h}$`, "m"), `missing heading: ${h}`);
  }
});

test("every file that reads third-party prose cites the untrusted-content rule", () => {
  const files = loadTree();
  const { uncited } = check(files, ALLOWLIST);
  assert.deepEqual(
    uncited,
    [],
    `read of third-party prose without citing shared/resources/untrusted-content-rule.md (add a cited line at the read site, or an allowlist entry with a reason):\n${uncited
      .map((u) => `  ${u.file}:${u.line}  ${u.text}`)
      .join("\n")}`,
  );
});

test("non-vacuity: the population and the cited read sites are not empty", () => {
  const files = loadTree();
  assert.ok(
    Object.keys(files).length >= 50,
    `population shrank: ${Object.keys(files).length}`,
  );
  const cited = Object.entries(files).filter(
    ([rel, t]) =>
      markerLines(t).length > 0 && !ALLOWLIST[rel] && CITATION.test(t),
  );
  assert.ok(
    cited.length >= 6,
    `expected at least 6 cited read sites, found ${cited.length}`,
  );
});

test("every allowlist entry still matches a marker (entries only shrink)", () => {
  const { staleAllow } = check(loadTree(), ALLOWLIST);
  assert.deepEqual(
    staleAllow,
    [],
    `allowlist entries with no marker left: ${staleAllow.join(", ")}`,
  );
});

// ---- control cases: the matcher fires, stays quiet, and its blind spot is named ----

test("control: a read marker without a citation is flagged", () => {
  const r = check(
    {
      "skills/x/SKILL.md":
        "```bash\ngh issue view 5 --json body -q .body\n```\n",
    },
    {},
  );
  assert.equal(r.uncited.length, 1);
});

test("control: the same read with the citation passes", () => {
  const text =
    "```bash\ngh issue view 5 --json body -q .body\n```\nsee [untrusted-content-rule.md#the-rule](shared/resources/untrusted-content-rule.md#the-rule)\n";
  assert.equal(check({ "skills/x/SKILL.md": text }, {}).uncited.length, 0);
});

test("control: each marker shape fires", () => {
  for (const line of [
    "gh pr view 7 --json number,title,body",
    "gh issue view 7 --json comments",
    "use WebFetch to read the page",
    "browser-use get text 3",
    "call get_page_text",
  ]) {
    assert.equal(markerLines(line).length, 1, line);
  }
});

test("control: a metadata-only gh read does not fire", () => {
  assert.equal(markerLines("gh pr view 7 --json number,url,state").length, 0);
});

test("control: a marker inside a forbidding sentence is ignored", () => {
  assert.equal(markerLines("Never call WebFetch from this skill.").length, 0);
});

test("control: a fenced read with a trailing comment containing a forbidding word still fires", () => {
  for (const comment of ["no filter applied", "don't trim", "never cached"]) {
    const text = `\`\`\`bash\ngh issue view 5 --json body  # ${comment}\n\`\`\`\n`;
    assert.equal(markerLines(text).length, 1, comment);
    assert.equal(
      check({ "skills/x/SKILL.md": text }, {}).uncited.length,
      1,
      comment,
    );
  }
});

test("control: fence tracking survives nested, longer and unclosed fences", () => {
  const prose = "Never call WebFetch from this skill.";
  const read = "gh issue view 5 --json body";
  // A closed fence ends: prose after it is prose (forbidding, so ignored).
  assert.equal(markerLines(`\`\`\`\nx\n\`\`\`\n${prose}`).length, 0);
  // A ``` line inside a ~~~ fence is content, so the fence is still open and closes at ~~~.
  assert.equal(markerLines(`~~~\n\`\`\`\n~~~\n${prose}`).length, 0);
  // A four-backtick fence is not closed by a three-backtick line.
  assert.equal(
    markerLines(`\`\`\`\`\n\`\`\`\n${read}  # no filter\n\`\`\`\`\n${prose}`)
      .length,
    1,
  );
  // An unclosed fence stays inside its own text: the next text starts clean.
  markerLines(`\`\`\`bash\n${read}`);
  assert.equal(markerLines(prose).length, 0);
  // A fence line with an info string does not close an open fence.
  assert.equal(
    markerLines(`\`\`\`\n\`\`\`bash\n${read}  # no filter`).length,
    1,
  );
});

test("control: fence tracking is the same under CRLF and LF line endings (task 262)", () => {
  // A fenced read whose comment holds a forbidding word. Inside a tracked fence it counts as a read;
  // if the fence never opens, the line is judged as prose and the forbidding word drops it. The old
  // `(.*)$` regex never matched a CRLF fence line, so the CRLF text lost the hit.
  const lf = "```bash\ngh issue view 5 --json body  # never cached\n```\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.equal(markerLines(lf).length, 1, "LF control");
  assert.equal(markerLines(crlf).length, 1, "CRLF text must give the same hit");
  // And the fence still closes under CRLF: prose after it is prose again.
  const after = crlf + "Never call WebFetch from this skill.\r\n";
  assert.equal(markerLines(after).length, 1, "the CRLF fence closes");
});

test("control: a prose line using the bare word no is not treated as forbidding", () => {
  assert.equal(
    markerLines("There is no cache: run gh issue view 5 --json body").length,
    1,
  );
});

test("control: an allowlist entry that matches no marker is reported stale", () => {
  const r = check(
    { "skills/x/SKILL.md": "nothing here" },
    { "skills/x/SKILL.md": "reason" },
  );
  assert.deepEqual(r.staleAllow, ["skills/x/SKILL.md"]);
});

test("known blind spot: a raw curl read is not seen by the key", () => {
  // Stated, not silently passed: the rule doc and this header name it. A curl of a URL passes
  // uncited today; closing that needs a different key, not a looser one.
  const r = check(
    { "skills/x/SKILL.md": "curl -s https://example.com/page" },
    {},
  );
  assert.equal(r.uncited.length, 0);
});

// ---- the extraction bound: a path derived from an issue body must stay under docs/ ----

const { spawnSync } = require("node:child_process");

const BOUND_SITES = [
  "skills/review-task/SKILL.md",
  "skills/review-story/SKILL.md",
  "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
];

/** The `if [ -n "$LOCAL_PATH" ] … fi` bound, lifted from the fenced block that carries it. */
function boundBlock(text) {
  // The first bash fence under its own heading, so the probe engine's
  // `fence:<doc>#Bound the derived path` entry form reaches it the same way.
  const m = text.match(
    /\n#### Bound the derived path\n[\s\S]*?\n```bash\n([\s\S]*?\nfi)\n```\n/,
  );
  return m ? m[1] : null;
}
const BOUND_SLOT = "<derived-path>";

/** The one way a site's bound block is read; every test goes through it (task 262). */
function boundBlockFor(site) {
  return boundBlock(fs.readFileSync(path.join(REPO_ROOT, site), "utf8"));
}

/**
 * Runs a site's bound block on `localPath`. `cwd` defaults to the repository root (a real `docs/`);
 * `prdRoot` sets PRD_ROOT, and is otherwise removed from the environment so the default applies.
 */
function runBound(site, localPath, { cwd = REPO_ROOT, prdRoot } = {}) {
  const env = { ...process.env };
  delete env.PRD_ROOT;
  if (prdRoot) env.PRD_ROOT = prdRoot;
  const block = boundBlockFor(site);
  assert.ok(block, `${site}: no path bound block found`);
  assert.ok(block.includes(BOUND_SLOT), `${site}: bound block has no slot`);
  return spawnSync(
    "bash",
    [
      "-c",
      `${block.split(BOUND_SLOT).join("$1")}\necho "KEPT:$LOCAL_PATH"`,
      "x",
      localPath,
    ],
    {
      encoding: "utf8",
      cwd,
      env,
    },
  );
}

test("the path bound is the same block at every site", () => {
  const blocks = BOUND_SITES.map(boundBlockFor);
  assert.ok(blocks.every(Boolean), "every site carries a bound block");
  assert.equal(new Set(blocks).size, 1, "the three bound blocks differ");
});

for (const site of BOUND_SITES) {
  test(`${site}: a derived path under docs/ is kept`, () => {
    const r = runBound(site, "docs/tasks/task.261.x/task.261.x.md");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /KEPT:docs\/tasks\/task\.261\.x\/task\.261\.x\.md/);
  });

  test(`${site}: a derived path outside docs/, or climbing out of it, is a HALT`, () => {
    // Each row names the guard that must fire, so deleting one guard turns its own rows red
    // instead of being covered by the other (task 262).
    const OUTSIDE = /HALT: derived path .* is outside docs\//;
    const CLIMBS = /HALT: derived path .* climbs out with \.\./;
    for (const [bad, expected] of [
      ["../../etc/passwd", OUTSIDE],
      ["/etc/passwd", OUTSIDE],
      ["skills/x/SKILL.md", OUTSIDE],
      ["docsx/y.md", OUTSIDE],
      ["docs/../.ssh/id_rsa", CLIMBS],
      ["docs/..", CLIMBS],
      ["docs/a/../../x", CLIMBS],
      ["docs/a/..", CLIMBS],
    ]) {
      const r = runBound(site, bad);
      assert.equal(r.status, 1, `${bad} should HALT`);
      assert.match(r.stdout, expected, `${bad} should name its own guard`);
    }
  });

  test(`${site}: a name that merely contains two dots is kept`, () => {
    const r = runBound(site, "docs/a..b.md");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /KEPT:docs\/a\.\.b\.md/);
  });

  test(`${site}: an empty derived path passes through to the fallback`, () => {
    const r = runBound(site, "");
    assert.equal(r.status, 0);
  });
  // ---- task 262: the bound follows symlinks and the configured PRD root ----
  // Run at the first site only: "the path bound is the same block at every site" holds the three
  // blocks equal, so the behaviour is proved once. It also keeps this file under its 2 s bound.
  if (site !== BOUND_SITES[0]) continue;

  /** A scratch repo: docs/a (real), docs/link -> ../outside (leaves the tree), specs/prd (a PRD root). */
  function scratchRepo() {
    const t = fs.mkdtempSync(path.join(os.tmpdir(), "bound-"));
    fs.mkdirSync(path.join(t, "docs", "a"), { recursive: true });
    fs.mkdirSync(path.join(t, "outside"));
    fs.mkdirSync(path.join(t, "specs", "prd", "p"), { recursive: true });
    fs.symlinkSync(path.join(t, "outside"), path.join(t, "docs", "link"));
    fs.writeFileSync(path.join(t, "outside", "secret.md"), "x");
    fs.symlinkSync(
      path.join(t, "outside", "secret.md"),
      path.join(t, "docs", "a", "evil.md"),
    );
    // task 263: parents the bound cannot resolve. A link to nothing, and a regular file used as a
    // directory. (The mode-000 directory is made only in its own test: it needs a special cleanup.)
    fs.symlinkSync(
      path.join(t, "nonexistent"),
      path.join(t, "docs", "dangling"),
    );
    fs.mkdirSync(path.join(t, "docs", "sub"));
    fs.writeFileSync(path.join(t, "docs", "file.md"), "x");
    return t;
  }

  // task 263: each row names the guard that must fire, so deleting one guard turns its own row red.
  const UNRESOLVABLE =
    /HALT: derived path .* has a parent that cannot be resolved/;
  const LEAVES =
    /HALT: derived path .* resolves outside docs\/ and the PRD root/;
  for (const [label, bad, expected] of [
    ["a dangling directory link", "docs/dangling/x.md", UNRESOLVABLE],
    [
      "a path deeper under a dangling directory link",
      "docs/dangling/sub/x.md",
      UNRESOLVABLE,
    ],
    ["a regular file used as a directory", "docs/file.md/x.md", UNRESOLVABLE],
    [
      "a missing child under a link that leaves the tree",
      "docs/link/new/x.md",
      LEAVES,
    ],
  ]) {
    test(`${site}: ${label} is a HALT`, () => {
      const t = scratchRepo();
      try {
        const r = runBound(site, bad, { cwd: t });
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, expected);
      } finally {
        fs.rmSync(t, { recursive: true, force: true });
      }
    });
  }

  test(
    `${site}: a directory that cannot be entered (mode 000) is a HALT`,
    // Root enters a mode 000 directory, so the state cannot be built; skipped for uid 0.
    { skip: process.getuid?.() === 0 },
    () => {
      const t = scratchRepo();
      const locked = path.join(t, "docs", "locked");
      try {
        fs.mkdirSync(locked, { mode: 0o000 });
        const r = runBound(site, "docs/locked/x.md", { cwd: t });
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, UNRESOLVABLE);
      } finally {
        fs.chmodSync(locked, 0o755);
        fs.rmSync(t, { recursive: true, force: true });
      }
    },
  );

  test(`${site}: a missing parent under a real subdirectory of docs/ is kept (control)`, () => {
    const t = scratchRepo();
    try {
      for (const kept of ["docs/sub/new/x.md", "docs/sub/new/deeper/x.md"]) {
        const r = runBound(site, kept, { cwd: t });
        assert.equal(r.status, 0, `${kept}: ${r.stdout}`);
        assert.ok(r.stdout.includes(`KEPT:${kept}`));
      }
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });

  test(`${site}: a directory symlink inside docs/ that leaves the tree is a HALT`, () => {
    const t = scratchRepo();
    try {
      const r = runBound(site, "docs/link/secret.md", { cwd: t });
      assert.equal(r.status, 1, r.stdout);
      assert.match(r.stdout, /HALT: derived path .* resolves outside docs\//);
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });

  test(`${site}: a file symlink inside docs/ is a HALT`, () => {
    const t = scratchRepo();
    try {
      const r = runBound(site, "docs/a/evil.md", { cwd: t });
      assert.equal(r.status, 1, r.stdout);
      assert.match(r.stdout, /HALT: derived path .* is a symlink/);
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });

  test(`${site}: a real path under docs/ is kept in a repo that has symlinks`, () => {
    const t = scratchRepo();
    try {
      const r = runBound(site, "docs/a/real.md", { cwd: t });
      assert.equal(r.status, 0, r.stdout);
      assert.match(r.stdout, /KEPT:docs\/a\/real\.md/);
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });

  test(`${site}: a path under a configured PRD_ROOT outside docs/ is kept; without it, it is a HALT`, () => {
    const t = scratchRepo();
    try {
      const kept = runBound(site, "specs/prd/p/story.md", {
        cwd: t,
        prdRoot: "specs/prd",
      });
      assert.equal(kept.status, 0, kept.stdout);
      assert.match(kept.stdout, /KEPT:specs\/prd\/p\/story\.md/);
      const refused = runBound(site, "specs/prd/p/story.md", { cwd: t });
      assert.equal(refused.status, 1, refused.stdout);
      assert.match(refused.stdout, /HALT: derived path .* is outside docs\//);
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });

  test(`${site}: a path whose parent directory does not exist is kept, not a HALT`, () => {
    const t = scratchRepo();
    try {
      const r = runBound(site, "docs/missing/dir/x.md", { cwd: t });
      assert.equal(r.status, 0, r.stdout);
      assert.match(r.stdout, /KEPT:docs\/missing\/dir\/x\.md/);
    } finally {
      fs.rmSync(t, { recursive: true, force: true });
    }
  });
}
