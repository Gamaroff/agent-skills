"use strict";
/**
 * gh-labels.sh — the one definition of which labels may reach a gh mutation
 * (task.125: TASK-125-BUG-2, BUG-3, BUG-6; CR-7).
 *
 * Executed, not grepped: the helper runs under bash AND zsh with a fake `gh`
 * on PATH, and every rule it states is a case here. The population guard at
 * the end scans the GitHub call sites so a site that builds a label from a
 * document field cannot bypass the helper — the defect this task was filed
 * against was a rule written at one site and not the others.
 *
 * Mutation proofs: drop the -L flag → "limit" case red; drop the single-line
 * guard → "newline" case red; key the pass-through on the empty string instead
 * of the exit code → "zero-label repo" case red; drop the lowercase fallback →
 * "case" case red; re-add a verbatim `--label "priority:${x}"` at any site →
 * the population guard red.
 */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const HELPER = path.join(REPO_ROOT, "shared", "resources", "gh-labels.sh");

function zshAvailable() {
  return spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0;
}
const SHELLS = ["bash", ...(zshAvailable() ? ["zsh"] : [])];

const DIRS = [];
after(() => {
  for (const d of DIRS) fs.rmSync(d, { recursive: true, force: true });
});

/**
 * Run `gh_labels_filter` with CANDIDATES under SHELL. The fake gh answers
 * `label list` with LABELS — but only when the caller passed `-L`/`--limit`
 * (unless `ignoreLimit`), so a helper that forgets the flag sees nothing.
 * `listExit` non-zero makes the read fail.
 */
function run(shell, { labels, candidates, listExit = 0, ignoreLimit = false }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-labels-"));
  DIRS.push(dir);
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "gh"),
    [
      "#!/bin/sh",
      'if [ "$1 $2" = "label list" ]; then',
      `  [ ${listExit} -eq 0 ] || exit ${listExit}`,
      `  has_limit=${ignoreLimit ? 1 : 0}`,
      '  for a in "$@"; do case "$a" in -L|--limit) has_limit=1 ;; esac; done',
      '  [ "$has_limit" -eq 1 ] || exit 0',
      ...labels.map((l) => `  printf '%s\\n' ${JSON.stringify(l)}`),
      "  exit 0",
      "fi",
      "exit 1",
    ].join("\n"),
    { mode: 0o755 },
  );
  const script = `source ${JSON.stringify(HELPER)} || exit 9\ngh_labels_filter "$@"`;
  const r = spawnSync(shell, ["-c", script, "x", ...candidates], {
    encoding: "utf8",
    env: { PATH: `${bin}:/usr/bin:/bin`, HOME: dir },
  });
  return {
    status: r.status,
    out: r.stdout.split("\n").filter(Boolean),
    err: r.stderr,
  };
}

const REPO = [
  "bug",
  "priority:high",
  "priority:medium",
  "task",
  "story",
  "epic",
];

for (const shell of SHELLS) {
  test(`[${shell}] a defined label passes as given; a cased value falls back to lowercase; an undefined one is dropped with a warning`, () => {
    const r = run(shell, {
      labels: REPO,
      candidates: ["bug", "priority:High", "severity:Major"],
    });
    assert.equal(r.status, 0, r.err);
    assert.deepEqual(r.out, ["bug", "priority:high"]);
    assert.match(
      r.err,
      /label 'severity:Major' is not defined in this repository — skipped/,
    );
  });

  test(`[${shell}] the read carries an explicit limit — gh's default page of 30 is never relied on (BUG-2)`, () => {
    // The fake gh returns NOTHING unless -L/--limit was passed.
    const r = run(shell, { labels: REPO, candidates: ["priority:high"] });
    assert.deepEqual(
      r.out,
      ["priority:high"],
      "the label is found only because the limit flag was sent",
    );
  });

  test(`[${shell}] a candidate that is not a single line is refused, never matched by grep -F (BUG-6)`, () => {
    const r = run(shell, {
      labels: REPO,
      candidates: ["priority:high\nfoo", "priority:high"],
    });
    assert.deepEqual(r.out, ["priority:high"]);
    assert.match(r.err, /not a single line — skipped/);
  });

  test(`[${shell}] an empty field is no label and no warning`, () => {
    const r = run(shell, {
      labels: REPO,
      candidates: ["priority:", "severity:", "", "bug"],
    });
    assert.deepEqual(r.out, ["bug"]);
    assert.doesNotMatch(r.err, /skipped/);
  });

  test(`[${shell}] a FAILED read passes every candidate through unchecked (lowercased) — the create's own failure names the label`, () => {
    const r = run(shell, {
      labels: REPO,
      candidates: ["bug", "priority:High", "severity:Major"],
      listExit: 4,
    });
    assert.deepEqual(
      r.out,
      ["bug", "priority:high", "severity:major"],
      "unchecked, in the lowercase convention",
    );
  });

  test(`[${shell}] a ZERO-label repository is not a failed read — everything is dropped, with warnings (CR-7)`, () => {
    const r = run(shell, {
      labels: [],
      candidates: ["bug", "priority:high"],
      ignoreLimit: true,
    });
    assert.deepEqual(r.out, []);
    assert.equal(
      (r.err.match(/not defined in this repository/g) || []).length,
      2,
    );
  });

  test(`[${shell}] hostile shapes are inert: glob, leading dash, substitution, quote injection, traversal`, () => {
    const r = run(shell, {
      labels: REPO,
      candidates: [
        "priority:*",
        "-e",
        "priority:$(touch $HOME/pwned)",
        "priority:high'; echo INJ; '",
        "../../etc/passwd",
      ],
    });
    assert.deepEqual(
      r.out,
      [],
      "nothing reaches --label, and the substitution never ran (stdout is empty)",
    );
    // Every stderr line is a warning that QUOTES the value — none is the value executed.
    for (const line of r.err.split("\n").filter(Boolean))
      assert.match(line, /^⚠️  label '/, line);
    assert.equal((r.err.match(/skipped/g) || []).length, 5);
  });
}

// ── Population guard ─────────────────────────────────────────────────────────
//
// Every fenced bash block in a SKILL.md that passes a `--label` / `--add-label`
// built from a document field must route through the helper. The floor is the
// number of sites known today; a scan that finds fewer has stopped seeing them.

function fencedBash(text) {
  const out = [];
  let open = null;
  for (const l of text.split("\n")) {
    if (open === null) {
      if (/^\s*```bash\b/.test(l)) open = [];
    } else if (/^\s*```\s*$/.test(l)) {
      out.push(open.join("\n"));
      open = null;
    } else open.push(l);
  }
  return out;
}

test("every --label/--add-label in a block that calls tracker-issue.js routes through gh_labels_filter — fixed labels included", () => {
  const skillsDir = path.join(REPO_ROOT, "skills");
  const sharedDir = path.join(REPO_ROOT, "shared", "resources");
  const offenders = [];
  const routed = new Set();
  // Population: every SKILL.md plus every canonical shared/resources/*.md (the
  // bundled skills/*/references/*.md are copies of those, so the sources are
  // what is scanned) — cycle-3 CR-4.
  const files = [
    ...fs
      .readdirSync(skillsDir)
      .map((n) => [n, path.join(skillsDir, n, "SKILL.md")]),
    ...fs
      .readdirSync(sharedDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => [`shared/resources/${f}`, path.join(sharedDir, f)]),
  ];
  for (const [name, f] of files) {
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    for (const block of fencedBash(text)) {
      if (!/tracker-issue\.js/.test(block)) continue;
      // The population is EVERY label that reaches gh through tracker-issue.js —
      // a fixed `--label "epic"` fails a create on a repository without that
      // label by the same mechanism as a cased field (TASK-125-BUG-11). Any
      // `--label`/`--add-label` token, any quoting, any line — except the
      // helper's own `LABEL_ARGS+=(…)` collector line (cycle-3 CR-4).
      // Comments are not call sites: a `#` line quoting the old shape is the
      // explanation, not the defect.
      const argLines = block
        .split("\n")
        .filter((l) => !/LABEL_ARGS\+=/.test(l) && !/^\s*#/.test(l));
      if (argLines.some((l) => /(^|\s)--(add-)?label(\s|=)/.test(l))) {
        offenders.push(
          `${name}: a --label/--add-label reaches tracker-issue.js without gh_labels_filter`,
        );
      }
      if (/gh_labels_filter /.test(block)) routed.add(name);
    }
  }
  assert.deepEqual(offenders, []);
  // Non-vacuity floor: the nine sites that exist today.
  assert.ok(
    routed.size >= 9,
    `only ${routed.size} sites route through the helper — expected ≥ 9: ${[...routed].join(", ")}`,
  );
});

// The sync edits' --remove-label derivation, EXECUTED: the four blocks are
// textually identical after the helper call, so the sync-github-bug block
// stands for all four. A fake gh answers `label list` (repo labels) and
// `issue view` (the issue's current labels); a `node` shim records the argv.
// With frontmatter `High` and the issue at `priority:high`, the old
// "different" comparison added and removed the same label (TASK-125-BUG-10).
function editBlock() {
  const text = fs.readFileSync(
    path.join(REPO_ROOT, "skills", "sync-github-bug", "SKILL.md"),
    "utf8",
  );
  const b = fencedBash(text).find(
    (t) => t.includes("gh_labels_filter") && t.includes("--kind edit"),
  );
  assert.ok(b, "sync-github-bug carries the edit block");
  return b.slice(b.indexOf("source references/gh-labels.sh"));
}
function runEdit({ repoLabels, issueLabels, env }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-edit-"));
  DIRS.push(dir);
  const bin = path.join(dir, "bin");
  fs.mkdirSync(path.join(dir, "references"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".claude", "state"), { recursive: true });
  fs.mkdirSync(bin);
  fs.copyFileSync(HELPER, path.join(dir, "references", "gh-labels.sh"));
  fs.writeFileSync(path.join(dir, "references", "tracker-issue.js"), "");
  const q = (arr) => arr.map((l) => JSON.stringify(l)).join(" ");
  fs.writeFileSync(
    path.join(bin, "gh"),
    [
      "#!/bin/sh",
      'case "$1 $2" in',
      `  "label list") printf '%s\\n' ${q(repoLabels)}; exit 0 ;;`,
      `  "issue view") printf '%s\\n' ${q(issueLabels)}; exit 0 ;;`,
      "esac; exit 1",
    ].join("\n"),
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "node"),
    ["#!/bin/sh", `printf '%s\\n' "$@" > "${dir}/argv.log"`].join("\n"),
    { mode: 0o755 },
  );
  const r = spawnSync("bash", ["-c", editBlock()], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: `${bin}:/usr/bin:/bin`,
      ISSUE_NUM: "42",
      BUG_ID: "bug.9",
      BUG_TITLE: "t",
      NEW_BODY: "b",
      ...env,
    },
  });
  const argv = fs.existsSync(path.join(dir, "argv.log"))
    ? fs
        .readFileSync(path.join(dir, "argv.log"), "utf8")
        .split("\n")
        .filter(Boolean)
    : null;
  return { status: r.status, stderr: r.stderr, argv };
}
function flagValues(argv, flag) {
  const out = [];
  for (let i = 0; i < argv.length; i++)
    if (argv[i] === flag) out.push(argv[i + 1]);
  return out;
}

test("[remove-label] frontmatter High with the issue already at priority:high → the label is re-added, NOTHING is removed", () => {
  const r = runEdit({
    repoLabels: ["bug", "priority:high", "priority:medium"],
    issueLabels: ["bug", "priority:high"],
    env: { PRIORITY: "High", SEVERITY: "" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.argv, "tracker-issue.js was invoked");
  assert.deepEqual(flagValues(r.argv, "--add-label"), ["priority:high"]);
  assert.deepEqual(
    flagValues(r.argv, "--remove-label"),
    [],
    "the label just added must not be removed",
  );
});

test("[remove-label] a real priority change removes the OLD label and adds the new one", () => {
  const r = runEdit({
    repoLabels: ["bug", "priority:high", "priority:medium"],
    issueLabels: ["bug", "priority:medium"],
    env: { PRIORITY: "High", SEVERITY: "" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(flagValues(r.argv, "--add-label"), ["priority:high"]);
  assert.deepEqual(flagValues(r.argv, "--remove-label"), ["priority:medium"]);
});

test("[remove-label] when the helper drops the new priority label, nothing is removed either", () => {
  const r = runEdit({
    repoLabels: ["bug"],
    issueLabels: ["bug", "priority:medium"],
    env: { PRIORITY: "High", SEVERITY: "" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(flagValues(r.argv, "--add-label"), []);
  assert.deepEqual(
    flagValues(r.argv, "--remove-label"),
    [],
    "no new label → the old one stays; a strip is not a sync",
  );
});

test("the helper is bundled beside every skill whose prose sources it", () => {
  const skillsDir = path.join(REPO_ROOT, "skills");
  const missing = [];
  for (const name of fs.readdirSync(skillsDir)) {
    const f = path.join(skillsDir, name, "SKILL.md");
    if (!fs.existsSync(f)) continue;
    if (!/source references\/gh-labels\.sh/.test(fs.readFileSync(f, "utf8")))
      continue;
    if (
      !fs.existsSync(path.join(skillsDir, name, "references", "gh-labels.sh"))
    )
      missing.push(name);
  }
  assert.deepEqual(missing, []);
});
