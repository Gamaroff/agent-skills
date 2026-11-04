// finalise-record-preflight — task 259. Before /finalise dispatches the DoD agents, list every
// success criterion that demands a record and say whether a committed place exists for it.
//
// Every case that reads git builds a REAL temporary repository: the engine reads `git ls-files`
// and `git status`, and a fake listing would only test the fake.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = join(__dirname, "..", "finalise-record-preflight.js");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const eng = require(ENGINE_PATH);
const CLI_BUDGET = spawnBudget("RECORD_PREFLIGHT");

// Task 257's criterion 14, verbatim from the committed document
// (git show 95f58307^:docs/tasks/task.257.fix-and-recheck-reads-what-it-claims/
//  task.257.fix-and-recheck-reads-what-it-claims.md, line 302). It names the QA report.
const CRITERION_257_14 =
  "Every mutation in § 8 turns a test red, recorded in the QA report.";

const GIT = [
  "-c",
  "user.name=t",
  "-c",
  "user.email=t@t",
  "-c",
  "commit.gpgsign=false",
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" });

const DIR = "docs/tasks/task.9.sample";
const DOC = `${DIR}/task.9.sample.md`;

function docBody(criteria) {
  return `---\nid: task.9\n---\n\n# Sample\n\n## 9. Success Criteria\n\n### Functional\n\n${criteria
    .map((c) => `- [ ] ${c}`)
    .join("\n")}\n\n## 10. Risk Assessment\n\nNone.\n`;
}

/** A scratch repository holding a task directory with `files` committed. */
function repo(criteria, files = []) {
  const dir = mkdtempSync(join(tmpdir(), "record-preflight-"));
  git(dir, "init", "-q");
  mkdirSync(join(dir, DIR), { recursive: true });
  writeFileSync(join(dir, DOC), docBody(criteria));
  for (const f of files) writeFileSync(join(dir, DIR, f), "x\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "A");
  return dir;
}

const run = (dir) => {
  const r = spawnSync(
    process.execPath,
    [ENGINE_PATH, "check", "--doc", DOC, "--json"],
    {
      cwd: dir,
      encoding: "utf8",
      ...CLI_BUDGET,
    },
  );
  if (neverRan(r)) assert.fail(`CLI never ran: ${r.error}`);
  return { ...JSON.parse(r.stdout), status: r.status };
};

const QA = "task.9.qa.1.sample.md";
const IMPL = "task.9.implementation.1.sample-initial-run.md";
const GATE = "task.9.gate.1.sample.yml";

// ── Phase 1: the cases ────────────────────────────────────────────────────

test("task 257 criterion 14, verbatim, lists with the committed QA report as its artifact", () => {
  // The engine does not read the file: `ok` means a committed place exists, not that the
  // record is in it. That reading is Step 3a's confirm step.
  const dir = repo([CRITERION_257_14], [QA, IMPL]);
  try {
    const r = run(dir);
    assert.equal(r.reason, "ok");
    assert.equal(r.listed.length, 1);
    assert.equal(r.listed[0].state, "ok");
    assert.deepEqual(r.listed[0].artifacts, [`${DIR}/${QA}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a criterion naming only the implementation report reads implementation-report-only", () => {
  const dir = repo(
    ["The six mutations are recorded in the implementation report."],
    [IMPL],
  );
  try {
    const r = run(dir);
    assert.equal(r.reason, "findings");
    assert.equal(r.listed[0].state, "implementation-report-only");
    assert.deepEqual(r.listed[0].artifacts, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a record criterion that names no place reads no-location", () => {
  const dir = repo(["The measurement is logged."], [QA]);
  try {
    assert.equal(run(dir).listed[0].state, "no-location");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a numeric bound is a record criterion, and reads no-location without a named place", () => {
  const dir = repo(["The check finishes in under 5 seconds."], [QA]);
  try {
    assert.equal(run(dir).listed[0].state, "no-location");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("controls: a record named in the QA report, the gate or the DoD reads ok", () => {
  const dir = repo(
    [
      "The result is recorded in the QA report.",
      "The score is logged in the QA gate file.",
      "The figure is documented in the DoD.",
    ],
    [QA, GATE],
  );
  try {
    const r = run(dir);
    assert.equal(r.reason, "ok");
    assert.deepEqual(
      r.listed.map((e) => e.state),
      ["ok", "ok", "ok"],
    );
    assert.deepEqual(r.listed[1].artifacts, [`${DIR}/${GATE}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a named QA report that is untracked reads location-uncommitted", () => {
  const dir = repo(["The result is recorded in the QA report."], []);
  try {
    writeFileSync(join(dir, DIR, QA), "x\n");
    assert.equal(run(dir).listed[0].state, "location-uncommitted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a named QA report with uncommitted edits reads location-uncommitted", () => {
  const dir = repo(["The result is recorded in the QA report."], [QA]);
  try {
    writeFileSync(join(dir, DIR, QA), "x\nthe new record\n");
    assert.equal(run(dir).listed[0].state, "location-uncommitted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a named QA report that does not exist reads location-absent", () => {
  const dir = repo(["The result is recorded in the QA report."], [IMPL]);
  try {
    assert.equal(run(dir).listed[0].state, "location-absent");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a criterion with no trigger word is not listed", () => {
  const dir = repo(["The engine returns a reason on every path."], [QA]);
  try {
    const r = run(dir);
    assert.equal(r.reason, "ok");
    assert.deepEqual(r.listed, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty criteria list answers empty, which is not scan-broken", () => {
  const dir = repo([], [QA]);
  try {
    const r = run(dir);
    assert.equal(r.reason, "empty");
    assert.equal(r.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scan-broken: git cannot list the directory, and the document is missing from the listing", () => {
  const plain = mkdtempSync(join(tmpdir(), "record-preflight-nogit-"));
  const dir = repo(["The result is recorded in the QA report."], [QA]);
  try {
    mkdirSync(join(plain, DIR), { recursive: true });
    writeFileSync(join(plain, DOC), docBody(["Recorded in the QA report."]));
    const noGit = run(plain);
    assert.equal(noGit.reason, "scan-broken");
    assert.equal(noGit.status, 1);
    // A repository whose listing does not contain the document is not reading the work item.
    git(dir, "rm", "-q", "--cached", DOC);
    git(dir, "commit", "-q", "-m", "untrack doc");
    writeFileSync(join(dir, ".gitignore"), `${DOC}\n`);
    const hidden = run(dir);
    assert.equal(hidden.reason, "scan-broken");
  } finally {
    rmSync(plain, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage: a missing --doc and an unknown command exit 2", () => {
  for (const args of [["check"], ["scan", "--doc", DOC]]) {
    const r = spawnSync(process.execPath, [ENGINE_PATH, ...args, "--json"], {
      encoding: "utf8",
      ...CLI_BUDGET,
    });
    if (neverRan(r)) assert.fail(`CLI never ran: ${r.error}`);
    assert.equal(r.status, 2);
    assert.equal(JSON.parse(r.stdout).reason, "usage");
  }
});

test("every documented state and reason is reachable", () => {
  const seen = new Set();
  const dir = repo(
    [
      "A is recorded in the QA report.",
      "B is logged.",
      "C is recorded in the implementation report.",
      "D is documented in the QA gate file.",
    ],
    [QA, IMPL],
  );
  try {
    const r = run(dir);
    r.listed.forEach((e) => seen.add(e.state));
    assert.deepEqual(
      [...seen].sort(),
      [
        "location-absent",
        "no-location",
        "implementation-report-only",
        "ok",
      ].sort(),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const s of eng.STATES) assert.ok(typeof s === "string");
  assert.equal(eng.STATES.length, 5);
});

// ── Performance: the engine is pure ───────────────────────────────────────

test("check() is pure: it answers from its arguments with child_process stubbed to throw", () => {
  const script = `
    const cp = require("child_process");
    for (const k of ["execFileSync", "execSync", "spawnSync", "spawn", "exec", "execFile"])
      cp[k] = () => { throw new Error("spawned " + k); };
    const e = require(${JSON.stringify(ENGINE_PATH)});
    const r = e.check(["Recorded in the QA report."], { tracked: ["d/t.qa.1.x.md"], changed: [] });
    process.stdout.write(JSON.stringify(r));
  `;
  const r = spawnSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    ...CLI_BUDGET,
  });
  if (neverRan(r)) assert.fail(`never ran: ${r.error}`);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).listed[0].state, "ok");
});

// ── Phase 3: one definition of "demands a record" ─────────────────────────

test("the engine's trigger words are exactly review-task check 22's", () => {
  const skill = readFileSync(
    join(REPO_ROOT, "skills", "review-task", "SKILL.md"),
    "utf8",
  ).split("\n");
  const head = skill.findIndex((l) =>
    /A criterion that demands a record names where it lives/.test(l),
  );
  assert.ok(head >= 0, "check 22 must exist in review-task/SKILL.md");
  const start = skill.findIndex((l, i) => i > head && /^\s+- Trigger:/.test(l));
  assert.ok(
    start > head && start < head + 4,
    "check 22 must carry a Trigger bullet",
  );
  // The bullet wraps: take its continuation lines, up to the next bullet.
  let end = start + 1;
  while (end < skill.length && /^\s{6}\S/.test(skill[end])) end++;
  const trigger = skill.slice(start, end).join(" ");
  const quoted = [...trigger.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...quoted].sort(), [...eng.RECORD_WORDS].sort());
  assert.match(trigger, /numeric bound/);
});

// ── Phase 2: Step 3a runs the check, before the dispatch ──────────────────

function bashFences(text) {
  const out = [];
  let open = null;
  text.split("\n").forEach((line, i) => {
    if (!open) {
      const m = /^\s*(`{3,})(\S*)\s*$/.exec(line);
      if (m) open = { tick: m[1].length, lang: m[2], body: [], at: i };
    } else if (new RegExp(`^\\s*\`{${open.tick},}\\s*$`).test(line)) {
      if (open.lang === "bash")
        out.push({ body: open.body.join("\n"), at: open.at });
      open = null;
    } else open.body.push(line);
  });
  return out;
}

test("Step 3a's fenced block calls the engine, precedes Step 3b, and runs", () => {
  const text = readFileSync(
    join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
    "utf8",
  );
  const hits = bashFences(text).filter((f) =>
    f.body.includes("finalise-record-preflight.js check"),
  );
  assert.equal(hits.length, 1, "exactly one bash fence calls the engine");
  const lines = text.split("\n");
  const step3a = lines.findIndex((l) => /^#### Step 3a:/.test(l));
  const step3b = lines.findIndex((l) => /^#### Step 3b:/.test(l));
  assert.ok(step3a >= 0 && step3b > step3a, "Step 3a and 3b headings exist");
  assert.ok(
    hits[0].at > step3a && hits[0].at < step3b,
    "the block sits inside Step 3a, before Step 3b",
  );

  // Run it the way an agent does: substituted, in a repository that has the bundled copy.
  const dir = repo(["The result is recorded in the QA report."], [QA]);
  try {
    mkdirSync(join(dir, ".agents", "skills", "finalise"), { recursive: true });
    execFileSync("ln", [
      "-s",
      join(REPO_ROOT, "skills", "finalise", "references"),
      join(dir, ".agents", "skills", "finalise", "references"),
    ]);
    const script = hits[0].body.replaceAll("{document-path}", DOC);
    const r = spawnSync("bash", ["-c", script], {
      cwd: dir,
      encoding: "utf8",
      ...CLI_BUDGET,
    });
    if (neverRan(r)) assert.fail(`never ran: ${r.error}`);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /record criteria: ok/);
    assert.match(r.stdout, /\[ok\] The result is recorded in the QA report/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Step 3a states the action for every state", () => {
  const text = readFileSync(
    join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
    "utf8",
  );
  for (const s of eng.STATES)
    assert.ok(text.includes(`| \`${s}\` |`), `Step 3a has a row for ${s}`);
});
