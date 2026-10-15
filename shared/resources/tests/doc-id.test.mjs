/**
 * Tests for doc-id.js — the hierarchical document-id engine (task 202).
 *
 * Three things are held here:
 *
 * 1. THE GRAMMAR. Every kind, the sub-story suffix, canonical and non-canonical
 *    artifacts, and the rejection reasons — with a round-trip property over a
 *    generated name set, and the two control cases the task names.
 *
 * 2. ONE VOCABULARY. Until task 206 makes finalise-fix-and-recheck.mjs re-export
 *    doc-id's artifact list, the two are pinned equal, and parse()'s artifact
 *    verdict is checked against WORK_ITEM_ARTIFACT_RE over every tracked task and
 *    bug filename — with a non-vacuity floor, so an empty scan fails.
 *
 * 3. THE CHECKS. checkCorpus over a fixture tree reports exactly one finding per
 *    seeded defect, each under its named reason, and `ok` on the valid chain.
 *
 * Run: node --test shared/resources/tests/doc-id.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadSensitive, spawnBudget } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const CLI = join(repoRoot, "shared/resources/doc-id.js");
const FIXTURES = join(__dirname, "fixtures", "doc-id");
const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("DOC_ID");

const d = require(CLI);
const { WORK_ITEM_ARTIFACT_RE, isWorkItemDocument } = await import(
  pathToFileURL(join(repoRoot, "shared/resources/finalise-fix-and-recheck.mjs"))
    .href
);

function runCli(args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    cwd: opts.cwd || repoRoot,
    timeout: SPAWN_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const json = (args, opts) => {
  const r = runCli([...args, "--json"], opts);
  return { code: r.code, body: JSON.parse(r.stdout) };
};

// ---------------------------------------------------------------------------
// 1. Grammar
// ---------------------------------------------------------------------------

test("parse: every kind's document shape", () => {
  const cases = [
    ["prd.1.onboarding", { kind: "prd", prd: 1, id: "prd.1" }],
    ["epic.1.2.hero-banner", { kind: "epic", prd: 1, epic: 2, id: "epic.1.2" }],
    [
      "story.1.2.3.anim",
      {
        kind: "story",
        prd: 1,
        epic: 2,
        story: 3,
        sub: null,
        id: "story.1.2.3",
      },
    ],
    ["task.202.doc-id-engine", { kind: "task", n: 202, id: "task.202" }],
    ["bug.18.login-timeout", { kind: "bug", n: 18, id: "bug.18" }],
    // task / bug keep today's looser slug: a leading digit is legal there
    ["task.5.2fa-reset", { kind: "task", n: 5, slug: "2fa-reset" }],
  ];
  for (const [name, want] of cases) {
    const p = d.parse(name);
    assert.equal(p.ok, true, name);
    assert.equal(p.artifact, null, name);
    for (const [k, v] of Object.entries(want))
      assert.equal(p[k], v, `${name}.${k}`);
  }
});

test("parse: the two control cases — story.1.2.3.4x rejected, story.1.2.3A.hero accepted", () => {
  const bad = d.parse("story.1.2.3.4x");
  assert.equal(bad.ok, false);
  assert.equal(
    bad.reason,
    "bad-slug",
    "a hierarchical slug must begin with a letter",
  );
  const sub = d.parse("story.1.2.3A.hero");
  assert.equal(sub.ok, true);
  assert.equal(sub.sub, "A");
  assert.equal(sub.story, 3);
  assert.equal(sub.id, "story.1.2.3A");
});

test("parse: rejection reasons", () => {
  const cases = [
    ["sprint-review-summary.md", "unknown-kind"],
    ["foo.1.x", "unknown-kind"],
    ["", "unknown-kind"],
    ["epic.01.2.x", "bad-number"],
    ["story.1.0.3.x", "bad-number"],
    ["story.1.2.x", "bad-number"], // the legacy two-number story
    ["epic.1.quickstart", "bad-number"], // the legacy epic
    ["prd.onboarding", "bad-number"], // the legacy prd
    ["epic.1.2.Hero", "bad-slug"],
    ["epic.1.2", "bad-slug"],
    ["prd.1.home.notes.v2", "bad-artifact"],
  ];
  for (const [name, reason] of cases) {
    const p = d.parse(name);
    assert.equal(p.ok, false, name);
    assert.equal(p.reason, reason, name);
  }
});

test("parse: directory and extension are stripped", () => {
  for (const name of [
    "docs/prd/web/prd.1.home/prd.1.home.md",
    "prd.1.home.yml",
    "prd.1.home.json",
  ]) {
    const p = d.parse(name);
    assert.equal(p.ok, true, name);
    assert.equal(p.slug, "home", name);
  }
});

test("parse: canonical artifacts, the seq-less plan, and a bug report as a task artifact", () => {
  const qa = d.parse("story.1.2.3.qa.4.anim.md");
  assert.deepEqual(
    [qa.artifact, qa.seq, qa.slug, qa.canonical],
    ["qa", 4, "anim", true],
  );
  const plan = d.parse("epic.1.2.plan.hero.md");
  assert.deepEqual(
    [plan.artifact, plan.seq, plan.canonical],
    ["plan", null, true],
  );
  const bug = d.parse("task.110.bug.1.whitelist-admits-mutating-shapes.md");
  assert.deepEqual(
    [bug.kind, bug.n, bug.artifact, bug.seq],
    ["task", 110, "bug", 1],
  );
});

test("parse: non-canonical artifacts in today's tree are artifacts, never documents", () => {
  for (const name of [
    "task.12.review.2026-05-06.md", // dated
    "task.11.review-task-tracker-dedup.review.2026-05-06.md", // slug before keyword
    "task.133.dod.security.by-hand-probe.md", // seq-less DoD sidecar
    "task.125.dod.security.run.json",
  ]) {
    const p = d.parse(name);
    assert.equal(p.ok, true, name);
    assert.ok(p.artifact, name);
    assert.equal(p.seq, null, name);
    assert.equal(p.canonical, false, name);
    assert.throws(
      () => d.format(p),
      TypeError,
      `${name}: no format for a non-canonical name`,
    );
  }
});

test("validate report is a non-canonical artifact — review-story's standalone validate output (task 203, review C1)", () => {
  // review-story writes `.validate.{date}.md`; seven sit under docs/prd. Outside the
  // vocabulary, checkCorpus walked each as a document and reported bad-shape.
  for (const name of [
    "story.1.1.1.validate.2026-05-12.md", // short-id form
    "story.1.3.1.before-you-start-anchor-runbooks.validate.2026-05-13.md", // full-stem form
  ]) {
    const p = d.parse(name);
    assert.equal(p.ok, true, name);
    assert.equal(p.artifact, "validate", name);
    assert.equal(p.canonical, false, name);
    assert.ok(WORK_ITEM_ARTIFACT_RE.test(name), `${name}: finalise agrees`);
  }
  // The legacy name is an artifact too, so the migration reads it as one.
  const legacy = d.parseLegacy("story.1.1.validate.2026-05-12.md");
  assert.equal(legacy.ok, true);
  assert.equal(legacy.artifact, "validate");
  // And checkCorpus never walks one as a document.
  const io = {
    exists: () => true,
    readFile: () => null,
    readDir: (p) =>
      p === "R"
        ? [{ name: "story.1.1.1.validate.2026-05-12.md", dir: false }]
        : [],
  };
  assert.equal(d.checkCorpus("R", { io }).reason, "empty");
});

test("appendPrdRow: bootstraps an empty registry, appends, moves the counter forward only, refuses a duplicate (task 203)", () => {
  const row = (n) => ({
    n,
    title: `PRD ${n}`,
    href: `d/prd.${n}.x/prd.${n}.x.md`,
    folder: "d",
    status: "draft",
    created: "2026-10-15",
  });
  const one = d.appendPrdRow(null, row(1));
  assert.equal(d.frontmatterField(one, "type"), "registry");
  assert.deepEqual(d.registryNumbers(one), [1]);
  assert.equal(d.next("prd", [], one).next, 2);
  // A row numbered past the counter carries the counter past it.
  const five = d.appendPrdRow(one, row(5));
  assert.deepEqual(d.registryNumbers(five), [1, 5]);
  assert.equal(d.next("prd", [], five).next, 6);
  // A lower row never moves the counter backwards.
  const three = d.appendPrdRow(five, row(3));
  assert.equal(d.next("prd", [], three).next, 6);
  assert.throws(
    () => d.appendPrdRow(three, row(5)),
    (e) => e.reason === "duplicate-row",
  );
  assert.throws(
    () => d.appendPrdRow("# PRD Registry\n", row(1)),
    (e) => e.reason === "registry-invalid",
  );
  assert.throws(
    () => d.appendPrdRow(null, { ...row(1), title: "a | b" }),
    (e) => e.reason === "bad-row",
  );
});

test("parse: a single-segment remainder is always the slug, even an artifact word", () => {
  const p = d.parse("story.1.2.3.plan.md");
  assert.equal(p.ok, true);
  assert.equal(p.artifact, null);
  assert.equal(p.slug, "plan");
});

test("format/parse round-trip over a generated name set", () => {
  const ids = [
    { kind: "prd", prd: 7 },
    { kind: "epic", prd: 7, epic: 12 },
    { kind: "story", prd: 7, epic: 12, story: 3 },
    { kind: "story", prd: 7, epic: 12, story: 3, sub: "B" },
    { kind: "task", n: 202 },
    { kind: "bug", n: 18 },
  ];
  const shapes = [
    { artifact: null, seq: null },
    { artifact: "plan", seq: null },
    ...d.ARTIFACTS.filter(
      (a) => a !== "plan" && a !== "sprint-review-summary",
    ).map((a) => ({ artifact: a, seq: 2 })),
    { artifact: "sprint-review-summary", seq: null, slug: null },
    { artifact: "review", seq: 3, docSlug: "doc-name" },
  ];
  let n = 0;
  for (const id of ids) {
    for (const shape of shapes) {
      const name = d.format({ ...id, slug: "some-slug", ...shape });
      const p = d.parse(name);
      assert.equal(p.ok, true, name);
      assert.equal(d.format(p), name, `format(parse(${name}))`);
      assert.deepEqual(d.parse(d.format(p)), p, `parse(format(${name}))`);
      n++;
    }
  }
  assert.equal(
    n,
    ids.length * (d.ARTIFACTS.length + 2),
    "non-vacuity: every kind × shape",
  );
});

test("parseLegacy reads the three old shapes, for task 203 only", () => {
  const prd = d.parseLegacy("prd.onboarding.md");
  assert.deepEqual(
    [prd.ok, prd.legacy, prd.kind, prd.slug],
    [true, true, "prd", "onboarding"],
  );
  const epic = d.parseLegacy("epic.4.first-week-guided-learning-path");
  assert.deepEqual(
    [epic.kind, epic.epic, epic.slug],
    ["epic", 4, "first-week-guided-learning-path"],
  );
  const story = d.parseLegacy("story.2.3A.capture-story-messy-path.md");
  assert.deepEqual(
    [story.kind, story.epic, story.story, story.sub],
    ["story", 2, 3, "A"],
  );
  const art = d.parseLegacy("story.1.1.qa.2.first-task-in-10-minutes.md");
  assert.deepEqual([art.artifact, art.seq], ["qa", 2]);
  assert.equal(
    d.parseLegacy("task.5.x").ok,
    false,
    "task and bug have no legacy shape",
  );
});

test("matchesEpic: P is required, and neither epic.12.1 nor epic.1.21 is claimed by (1, 2)", () => {
  assert.equal(d.matchesEpic("epic.1.2.x", 1, 2), true);
  assert.equal(d.matchesEpic("story.1.2.5.y", 1, 2), true);
  assert.equal(
    d.matchesEpic("story.1.2.5.qa.1.y.md", 1, 2),
    true,
    "an artifact beneath it",
  );
  assert.equal(d.matchesEpic("epic.12.1.y", 1, 2), false);
  assert.equal(d.matchesEpic("epic.1.21.z", 1, 2), false);
  assert.equal(d.matchesEpic("epic.1.1.x", 1, 2), false);
  assert.equal(d.matchesEpic("prd.1.home", 1, 2), false);
  assert.equal(
    d.matchesEpic("epic.2.x", 1, 2),
    false,
    "a legacy epic is not matched",
  );
  assert.throws(() => d.matchesEpic("epic.1.2.x", undefined, 2), TypeError);
  assert.throws(() => d.matchesEpic("epic.1.2.x", 1), TypeError);
  assert.throws(() => d.matchesEpic("epic.1.2.x", 0, 2), TypeError);
});

test("nextNumber: highest + 1 — a deleted number is never reused (unlike nextStoryId)", () => {
  assert.equal(d.nextNumber("story", ["story.1.1.1.a", "story.1.1.3.b"]), 4);
  const { nextStoryId } = require(
    join(repoRoot, "skills/create-story/scripts/lib.js"),
  );
  assert.equal(
    nextStoryId(["story.1.1.a.md", "story.1.3.b.md"], 1),
    2,
    "the contrast: create-story fills the gap",
  );
  assert.equal(
    d.nextNumber("epic", ["epic.1.1.a", "epic.1.4.b", "epic.1.2.qa.9.x"]),
    5,
  );
  assert.equal(d.nextNumber("epic", []), 1);
  assert.equal(
    d.nextNumber("story", ["story.1.1.3A.a", "story.1.1.2.b"]),
    4,
    "a sub-story counts its S",
  );
});

test("nextNumber prd: the registry counter is authoritative, guarded against a stale one", () => {
  const reg = (n, rows = "") =>
    `# PRD Registry\n\n**Next Available PRD Number:** **${n}**\n\n| PRD # | Title |\n|---|---|\n${rows}`;
  assert.equal(
    d.nextNumber("prd", ["prd.1.home"], reg(3, "| 1 | [H](x) |\n")),
    3,
  );
  assert.equal(d.next("prd", ["prd.3.app"], reg(3)).reason, "registry-behind");
  assert.equal(
    d.next("prd", [], reg(2, "| 2 | [A](x) |\n")).reason,
    "registry-behind",
  );
  assert.equal(
    d.next("prd", [], "no counter here").reason,
    "registry-invalid",
    "text with no counter is an invalid registry, not a missing one",
  );
  assert.equal(d.next("prd", [], null).reason, "registry-missing");
  assert.throws(
    () => d.nextNumber("prd", [], null),
    (e) => e.reason === "registry-missing",
  );
  assert.equal(d.next("task", [], null).reason, "unknown-kind");
});

// ---------------------------------------------------------------------------
// 2. One vocabulary
// ---------------------------------------------------------------------------

test("contract: ARTIFACTS equals the alternation inside WORK_ITEM_ARTIFACT_RE", () => {
  const m = /\(([^()]+)\)/.exec(WORK_ITEM_ARTIFACT_RE.source);
  assert.ok(m, "WORK_ITEM_ARTIFACT_RE still has one alternation group");
  assert.deepEqual([...d.ARTIFACTS].sort(), m[1].split("|").sort());
});

test("classification agrees with WORK_ITEM_ARTIFACT_RE / isWorkItemDocument over tracked task and bug files", () => {
  const files = execFileSync("git", ["ls-files", "docs/tasks", "docs/bugs"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => /^(task|bug)\./.test(f.slice(f.lastIndexOf("/") + 1)));
  assert.ok(
    files.length > 200,
    `non-vacuity: ${files.length} task/bug files scanned`,
  );
  const disagree = [];
  for (const f of files) {
    const base = f.slice(f.lastIndexOf("/") + 1);
    const p = d.parse(base);
    const artifact = p.ok && p.artifact !== null;
    if (artifact !== WORK_ITEM_ARTIFACT_RE.test(base))
      disagree.push(`${base}: artifact vocabulary`);
    if (base.endsWith(".md") && isWorkItemDocument(f) && artifact) {
      disagree.push(`${base}: isWorkItemDocument says document`);
    }
  }
  assert.deepEqual(disagree, []);
  // Control cases, named so the scan above cannot pass by finding nothing of either kind.
  assert.equal(d.parse("task.12.review.2026-05-06.md").canonical, false);
  assert.equal(
    d.parse("task.202.doc-id-engine-and-prd-registry.md").artifact,
    null,
  );
});

// ---------------------------------------------------------------------------
// 3. Checks
// ---------------------------------------------------------------------------

const root = (name) => join(FIXTURES, name, "docs", "prd");

test("checkCorpus: the valid chain is ok — artifacts and shard files are not documents", () => {
  const r = d.checkCorpus(root("valid"));
  assert.equal(r.reason, "ok");
  assert.deepEqual(r.findings, []);
  assert.equal(r.documents, 3, "prd + epic + story");
});

test("checkCorpus: exactly one finding per seeded defect, each under its reason", () => {
  const r = d.checkCorpus(root("defects"));
  assert.equal(r.reason, "findings");
  const got = r.findings
    .map((f) => [f.reason, f.path.slice(f.path.lastIndexOf("/") + 1)])
    .sort();
  assert.deepEqual(got, [
    ["bad-shape", "story.1.1.legacy.md"],
    ["dir-stem-mismatch", "epic.1.2.navbar.md"],
    ["duplicate-id", "prd.3.tab.md"],
    ["frontmatter-mismatch", "epic.1.3.footer.md"],
    ["parent-missing", "story.1.4.1.lost.md"],
    ["parent-number-mismatch", "story.1.5.1.wrong.md"],
    ["unregistered", "prd.2.shop.md"],
  ]);
});

test("checkCorpus: a PRD with no registry beside it is registry-missing", () => {
  const r = d.checkCorpus(root("noregistry"));
  assert.deepEqual(
    r.findings.map((f) => f.reason),
    ["registry-missing"],
  );
});

test("checkCorpus: empty and root-missing are different answers", () => {
  assert.equal(d.checkCorpus(root("empty")).reason, "empty");
  assert.equal(
    d.checkCorpus(join(FIXTURES, "no-such-root")).reason,
    "root-missing",
  );
});

test("check covers every reason it declares", () => {
  const seeded = new Set([
    ...d.checkCorpus(root("defects")).findings.map((f) => f.reason),
    ...d.checkCorpus(root("noregistry")).findings.map((f) => f.reason),
    // `unreadable` needs a filesystem that refuses a read, which no fixture tree
    // can be: seeded through an injected io.
    ...d
      .check("r/web/prd.1.h/prd.1.h.md", {
        io: { exists: () => true, readFile: () => null, readDir: () => [] },
        prdRoot: "r",
      })
      .map((f) => f.reason),
  ]);
  assert.deepEqual([...seeded].sort(), [...d.CHECK_REASONS].sort());
});

test("check: frontmatter is read from the leading block only, and a story's epic: must match", () => {
  const files = {
    "r/web/prd.1.h/epics/epic.1.1.e/stories/story.1.1.1.s/story.1.1.1.s.md":
      "---\nprd_number: 1\nepic: epic.1.2.other\n---\n\nprd_number: 1\n",
    "r/web/prd.1.h/epics/epic.1.1.e/epic.1.1.e.md":
      "---\nprd_number: 1\nepic_number: 1\n---\n",
    "r/web/prd.1.h/epics/epic.1.2.f/epic.1.2.f.md":
      "# no frontmatter\n\nprd_number: 1\nepic_number: 2\n",
  };
  const io = {
    readFile: (p) => (p in files ? files[p] : null),
    exists: (p) => p in files,
    readDir: () => [],
  };
  const story = d.check(Object.keys(files)[0], { io, prdRoot: "r" });
  assert.deepEqual(
    story.map((f) => f.reason),
    ["frontmatter-mismatch"],
  );
  assert.match(story[0].detail, /epic\.1\.2\.other/);
  const noFm = d.check(Object.keys(files)[2], { io, prdRoot: "r" });
  assert.deepEqual(
    noFm.map((f) => f.reason),
    ["frontmatter-mismatch", "frontmatter-mismatch", "parent-missing"],
    "body text is not frontmatter",
  );
});

test("check: parent-number-mismatch on the P half — an epic of PRD 2 filed under PRD 1", () => {
  const files = {
    "r/web/prd.1.h/prd.1.h.md": "---\nprd_number: 1\n---\n",
    "r/web/prd.1.h/epics/epic.2.1.x/epic.2.1.x.md":
      "---\nprd_number: 2\nepic_number: 1\n---\n",
  };
  const io = {
    readFile: (p) => (p in files ? files[p] : null),
    exists: (p) => p in files,
    readDir: () => [],
  };
  const r = d.check("r/web/prd.1.h/epics/epic.2.1.x/epic.2.1.x.md", {
    io,
    prdRoot: "r",
  });
  assert.deepEqual(
    r.map((f) => f.reason),
    ["parent-number-mismatch"],
  );
  assert.match(r[0].detail, /epic\.2\.1 sits under prd\.1/);
});

test("resolvePrdRoot: --prd-root, then skills-config.yaml, then docs/prd", () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-id-root-"));
  try {
    assert.equal(d.resolvePrdRoot([], dir), "docs/prd");
    writeFileSync(
      join(dir, "skills-config.yaml"),
      "prd:\n  prdShardedLocation: 'product/prds'\nother: 1\n",
    );
    assert.equal(d.resolvePrdRoot([], dir), "product/prds");
    assert.equal(d.resolvePrdRoot(["--prd-root", "x/y"], dir), "x/y");
    assert.equal(d.resolvePrdRoot(["--prd-root=z"], dir), "z");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// CLI, as a spawned process
// ---------------------------------------------------------------------------

test("CLI: parse — ok exits 0, a malformed name exits 1", () => {
  const ok = json(["parse", "story.1.2.3A.hero.md"]);
  assert.equal(ok.code, 0);
  assert.equal(ok.body.reason, "ok");
  assert.equal(ok.body.id, "story.1.2.3A");
  const bad = json(["parse", "story.1.2.x"]);
  assert.equal(bad.code, 1);
  assert.equal(bad.body.reason, "bad-number");
});

test("CLI: check --corpus — ok 0, empty 0, findings 1", () => {
  for (const [name, code, reason] of [
    ["valid", 0, "ok"],
    ["empty", 0, "empty"],
    ["defects", 1, "findings"],
  ]) {
    const r = json(["check", "--corpus", "--prd-root", root(name)]);
    assert.equal(r.code, code, name);
    assert.equal(r.body.reason, reason, name);
    assert.equal(r.body.exitCode, code, name);
  }
});

test("CLI: check <path> on one document", () => {
  const doc = join(
    root("valid"),
    "web/prd.1.home/epics/epic.1.1.hero/epic.1.1.hero.md",
  );
  const r = json(["check", doc, "--prd-root", root("valid")]);
  assert.equal(r.code, 0);
  assert.equal(r.body.reason, "ok");
});

test("CLI: next prd / epic / story", () => {
  const prd = json(["next", "prd", "--prd-root", root("valid")]);
  assert.deepEqual([prd.code, prd.body.next], [0, 2]);
  const epic = json([
    "next",
    "epic",
    "--prd-dir",
    join(root("valid"), "web/prd.1.home"),
  ]);
  assert.deepEqual(
    [epic.code, epic.body.next, epic.body.id],
    [0, 2, "epic.1.2"],
  );
  const story = json([
    "next",
    "story",
    "--epic-dir",
    join(root("valid"), "web/prd.1.home/epics/epic.1.1.hero"),
  ]);
  assert.deepEqual(
    [story.code, story.body.next, story.body.id],
    [0, 2, "story.1.1.2"],
  );
  const noReg = json(["next", "prd", "--prd-root", root("noregistry")]);
  assert.deepEqual([noReg.code, noReg.body.reason], [1, "registry-missing"]);
});

test("CLI: usage errors exit 2", () => {
  for (const args of [
    [],
    ["frobnicate"],
    ["parse"],
    ["next"],
    ["next", "epic"],
    ["check"],
    ["parse", "x", "--nope"],
  ]) {
    const r = json(args);
    assert.equal(r.code, 2, args.join(" "));
    assert.equal(r.body.reason, "usage", args.join(" "));
  }
});

test("CLI: a large check --corpus payload arrives whole through a pipe", () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-id-big-"));
  try {
    for (let i = 1; i <= 600; i++) {
      const stem = `story.1.${i}.legacy-shape-number-${i}`;
      mkdirSync(join(dir, stem));
      writeFileSync(join(dir, stem, `${stem}.md`), "---\n---\n");
    }
    const r = runCli(["check", "--corpus", "--prd-root", dir, "--json"]);
    assert.ok(
      r.stdout.length > 64 * 1024,
      `payload ${r.stdout.length} bytes exceeds a pipe buffer`,
    );
    const body = JSON.parse(r.stdout);
    assert.equal(r.code, 1);
    assert.equal(body.findings.length, 600);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA cycle 1 findings (gate 1) — one regression test each
// ---------------------------------------------------------------------------

test("PROBE-1: a number past MAX_SAFE_INTEGER is bad-number, never a lossy id", () => {
  for (const name of [
    "prd.99999999999999999999.x",
    "epic.1.99999999999999999999.x",
    "story.1.2.99999999999999999999.x",
    "task.99999999999999999999.x",
  ]) {
    const p = d.parse(name);
    assert.equal(p.ok, false, name);
    assert.equal(p.reason, "bad-number", name);
  }
  assert.equal(
    d.parseLegacy("epic.99999999999999999999.x").reason,
    "bad-number",
  );
  const art = d.parse("story.1.2.3.qa.99999999999999999999.x");
  assert.notEqual(art.seq, 1e20, "an unsafe seq is never parsed as a number");
  // the boundary itself still parses
  assert.equal(d.parse(`prd.${Number.MAX_SAFE_INTEGER}.x`).ok, true);
});

test("CR-1: a gap is never refilled, and deleting the HIGHEST number frees it (documented)", () => {
  assert.equal(
    d.nextNumber("epic", ["epic.1.1.a", "epic.1.3.c"]),
    4,
    "middle gap 2 is not refilled",
  );
  // epic.1.3 deleted: no counter exists for epics, so 3 is free again — the docs say so
  assert.equal(d.nextNumber("epic", ["epic.1.1.a", "epic.1.2.b"]), 3);
});

test("CR-3: format refuses parts that do not round-trip", () => {
  const base = { kind: "story", prd: 1, epic: 2, story: 3 };
  assert.throws(
    () => d.format({ ...base, artifact: "qa", slug: "x" }),
    TypeError,
    "missing seq",
  );
  assert.throws(
    () => d.format({ ...base, artifact: "gate", seq: 0, slug: "x" }),
    TypeError,
    "seq 0",
  );
  assert.throws(
    () => d.format({ ...base, slug: "x.qa" }),
    TypeError,
    "dotted slug",
  );
  assert.throws(
    () => d.format({ ...base, sub: "a", slug: "x" }),
    TypeError,
    "lowercase sub",
  );
  assert.equal(
    d.format({ ...base, artifact: "qa", seq: 2, slug: "x" }),
    "story.1.2.3.qa.2.x",
  );
});

test("CR-6: the registry reader skips fenced rows", () => {
  const reg = [
    "**Next Available PRD Number:** **3**",
    "",
    "```markdown",
    "| PRD # | Title |",
    "|---|---|",
    "| 7 | [Example](x) |",
    "```",
    "",
    "| PRD # | Title | Folder | Status | Created |",
    "|---|---|---|---|---|",
    "| 1 | [A](a) | web | draft | 2026-10-15 |",
    "| 2 | [B](b) | web | draft | 2026-10-15 |",
  ].join("\n");
  assert.deepEqual(d.registryNumbers(reg), [1, 2]);
  assert.equal(
    d.nextNumber("prd", [], reg),
    3,
    "the fenced 7 does not read as registry-behind",
  );
});

test("CR-7: a PRD counter that is not a positive integer is registry-invalid", () => {
  for (const n of ["0", "02", "99999999999999999999"]) {
    const r = d.next("prd", [], `**Next Available PRD Number:** **${n}**`);
    assert.equal(r.reason, "registry-invalid", n);
  }
});

test("CR-8: check on a missing file is one bad-shape 'not found'", () => {
  const io = { readFile: () => null, exists: () => false, readDir: () => [] };
  const r = d.check("r/web/prd.1.h/prd.1.h.md", { io, prdRoot: "r" });
  assert.deepEqual(
    r.map((f) => f.reason),
    ["bad-shape"],
  );
  assert.match(r[0].detail, /not found/);
});

test("CR-9: an unquoted value loses its trailing YAML comment; a quoted one keeps its #", () => {
  const src =
    "---\nprd_number: 1 # first\ntitle: \"a # b\"\nepic: 'epic.1.2.x' # parent\n---\n";
  assert.equal(d.frontmatterField(src, "prd_number"), "1");
  assert.equal(d.frontmatterField(src, "title"), "a # b");
  assert.equal(d.frontmatterField(src, "epic"), "epic.1.2.x");
});

test("CR-4: an unreadable directory is 'unreadable', never 'empty'", () => {
  const io = {
    exists: () => true,
    readFile: () => null,
    readDir: (p) => (p === "r" ? [{ name: "web", dir: true }] : null),
  };
  const r = d.checkCorpus("r", { io });
  assert.equal(r.reason, "unreadable");
  assert.deepEqual(r.unreadable, ["r/web"]);
  const cli = json(["check", "--corpus", "--prd-root", "package.json"]);
  assert.equal(cli.code, 1, "a file given as the root is not an empty tree");
  assert.equal(cli.body.reason, "unreadable");
});

test("CR-10: an unparsed name ending in an artifact word is reported, not skipped", () => {
  const files = { "r/epic.1.qa/epic.1.qa.md": "---\n---\n" };
  const io = {
    exists: (p) => p === "r" || p in files,
    readFile: (p) => files[p] ?? null,
    readDir: (p) =>
      p === "r"
        ? [{ name: "epic.1.qa", dir: true }]
        : p === "r/epic.1.qa"
          ? [{ name: "epic.1.qa.md", dir: false }]
          : [],
  };
  const r = d.checkCorpus("r", { io });
  assert.deepEqual(
    r.findings.map((f) => f.reason),
    ["bad-shape"],
  );
});

test("CR-2: next epic/story refuse a parent that does not exist", () => {
  const epic = json([
    "next",
    "epic",
    "--prd-dir",
    join(root("valid"), "web/prd.9.typo"),
  ]);
  assert.deepEqual([epic.code, epic.body.reason], [1, "parent-missing"]);
  const story = json([
    "next",
    "story",
    "--epic-dir",
    join(root("valid"), "web/prd.1.home/epics/epic.1.7.nope"),
  ]);
  assert.deepEqual([story.code, story.body.reason], [1, "parent-missing"]);
});

test("CR-5: runCli resolves every path against its cwd option", () => {
  const r = d.runCli(["check", "--corpus", "--prd-root", "docs/prd"], {
    cwd: join(FIXTURES, "valid"),
  });
  assert.equal(r.payload.reason, "ok");
  assert.equal(
    r.payload.documents,
    3,
    "the fixture's tree, not the repository's",
  );
  const one = d.runCli(["check", "docs/prd/web/prd.1.home/prd.1.home.md"], {
    cwd: join(FIXTURES, "valid"),
  });
  assert.equal(one.payload.reason, "ok");
});

// ---------------------------------------------------------------------------
// QA cycle 2 findings (gate 2) — one regression test each
// ---------------------------------------------------------------------------

test("QA-1: sprint-review-summary is a fixed-name artifact, never a document", () => {
  const p = d.parse("story.1.2.3.sprint-review-summary.md");
  assert.deepEqual(
    [p.ok, p.artifact, p.seq, p.slug, p.canonical],
    [true, "sprint-review-summary", null, null, true],
  );
  assert.equal(
    d.format({
      kind: "story",
      prd: 1,
      epic: 2,
      story: 3,
      artifact: "sprint-review-summary",
    }),
    "story.1.2.3.sprint-review-summary",
  );
  assert.equal(
    WORK_ITEM_ARTIFACT_RE.test("story.1.2.3.sprint-review-summary.md"),
    true,
  );
  // the legacy files in today's docs/prd are skipped by the corpus walk, as before CR-10
  const files = { "r/story.1.1.x/story.1.1.sprint-review-summary.md": "" };
  const io = {
    exists: (q) => q === "r" || q in files,
    readFile: (q) => files[q] ?? null,
    readDir: (q) =>
      q === "r"
        ? [{ name: "story.1.1.x", dir: true }]
        : q === "r/story.1.1.x"
          ? [{ name: "story.1.1.sprint-review-summary.md", dir: false }]
          : [],
  };
  assert.equal(d.checkCorpus("r", { io }).reason, "empty");
});

test("CR-1: next refuses to allocate over a directory it cannot read", () => {
  const prdDir = "/r/web/prd.1.h";
  const io = {
    exists: () => true,
    readFile: () => null,
    readDir: (q) => (q === prdDir ? [{ name: "epics", dir: true }] : null),
  };
  const epic = d.runCli(["next", "epic", "--prd-dir", prdDir], {
    cwd: "/",
    io,
  });
  assert.deepEqual([epic.exitCode, epic.payload.reason], [1, "unreadable"]);
  const prd = d.runCli(["next", "prd", "--prd-root", "/r"], {
    cwd: "/",
    io: {
      exists: () => true,
      readFile: () => "**Next Available PRD Number:** **2**",
      readDir: () => null,
    },
  });
  assert.deepEqual([prd.exitCode, prd.payload.reason], [1, "unreadable"]);
});

test("CR-2: doc-id and the selector read the same PRD registry rows (parity)", async () => {
  const { parseRegistry } = await import(
    pathToFileURL(join(repoRoot, "skills/develop-next/scripts/select-next.mjs"))
      .href
  );
  const row = (n) =>
    `| ${n} | [P${n}](web/prd.${n}.p/prd.${n}.p.md) | web | draft | 2026-10-15 |`;
  const inputs = {
    documented: [
      "| PRD # | Title | Folder | Status | Created |",
      "|---|---|---|---|---|",
      row(1),
      row(2),
    ],
    headless: [row(1), row(2)],
    "hash-header": [
      "| # | Title | Folder | Status | Created |",
      "|---|---|---|---|---|",
      row(1),
    ],
    "blank-line-between-rows": [
      "| PRD # | Title | Folder | Status | Created |",
      "|---|---|---|---|---|",
      row(1),
      "",
      row(2),
    ],
    "fenced-example": [
      "```",
      row(9),
      "```",
      "| PRD # | Title | Folder | Status | Created |",
      "|---|---|---|---|---|",
      row(1),
    ],
    "four-backtick-fence": ["````", "```", row(7), "```", "````", row(1)],
    "malformed-row": [
      "| PRD # | Title | Folder | Status | Created |",
      "|---|---|---|---|---|",
      "| 3 | no link | web | draft | 2026-10-15 |",
    ],
    "id-not-first": [
      "| Title | PRD # | Folder | Status | Created |",
      "|---|---|---|---|---|",
      "| [P4](web/prd.4.p/prd.4.p.md) | 4 | web | draft | 2026-10-15 |",
    ],
  };
  for (const [name, lines] of Object.entries(inputs)) {
    const text = lines.join("\n");
    const sel = parseRegistry(text, "prd", "docs/prd/prd-registry.md");
    const selNums = [...sel.rows, ...sel.malformed]
      .map((r) => r.n)
      .filter((n) => n !== null)
      .sort((a, b) => a - b);
    const ours = [...d.registryNumbers(text)].sort((a, b) => a - b);
    assert.deepEqual(ours, selNums, name);
  }
});

test("CR-3: format accepts string-number parts that build the same name", () => {
  assert.equal(
    d.format({ kind: "epic", prd: "1", epic: "2", slug: "x" }),
    "epic.1.2.x",
  );
  assert.equal(
    d.format({
      kind: "story",
      prd: "1",
      epic: "2",
      story: "3",
      artifact: "qa",
      seq: "4",
      slug: "x",
    }),
    "story.1.2.3.qa.4.x",
  );
  assert.throws(
    () => d.format({ kind: "epic", prd: "01", epic: 2, slug: "x" }),
    TypeError,
  );
});

test("CR-4: the counter is read outside fences", () => {
  const reg = [
    "```",
    "**Next Available PRD Number:** **99**",
    "```",
    "**Next Available PRD Number:** **4**",
    "| PRD # | Title |",
    "|---|---|",
    "| 3 | [C](c) |",
  ].join("\n");
  assert.equal(d.nextNumber("prd", [], reg), 4);
});

test("CR-5: a quoted value ends at its own closing quote", () => {
  const src = "---\nprd_number: \"1\" # a \"b\"\ntitle: 'it''s' # c 'd'\n---\n";
  assert.equal(d.frontmatterField(src, "prd_number"), "1");
  assert.equal(d.frontmatterField(src, "title"), "it's");
});

test("CR-6: frontmatterField is linear on a long whitespace run", () => {
  const src = (n) => `---\nprd_number: 1${" ".repeat(n)}x\n---\n`;
  const t0 = process.hrtime.bigint();
  d.frontmatterField(src(200000), "prd_number");
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(
    ms < 200,
    loadSensitive(
      `200k-space line took ${ms} ms — quadratic backtracking has returned`,
    ),
  );
});

test("CR-7: the full-stem review report is canonical and round-trips", () => {
  const p = d.parse("prd.1.onboarding.review.1.pm-check.md");
  assert.deepEqual(
    [p.ok, p.artifact, p.seq, p.slug, p.docSlug, p.canonical],
    [true, "review", 1, "pm-check", "onboarding", true],
  );
  assert.equal(d.format(p), "prd.1.onboarding.review.1.pm-check");
});

test("CR-9: an unreadable document or registry is 'unreadable', not a defect it does not have", () => {
  const io = {
    exists: () => true,
    readFile: () => null,
    readDir: () => [],
  };
  const r = d.check("r/web/prd.1.h/prd.1.h.md", { io, prdRoot: "r" });
  assert.deepEqual(
    r.map((f) => f.reason),
    ["unreadable", "unreadable"],
  );
});

test("CR-10: a registry with text but no usable counter is registry-invalid", () => {
  for (const c of [
    "**Next Available PRD Number:** **two**",
    "**Next Available PRD Number:** **2.0**",
    "| PRD # | Title |",
  ]) {
    assert.equal(d.next("prd", [], c).reason, "registry-invalid", c);
  }
  assert.equal(d.next("prd", [], null).reason, "registry-missing");
});

// ---------------------------------------------------------------------------
// QA cycle 3 findings (gate 3)
// ---------------------------------------------------------------------------

test("CR-1 (cycle 3): parseLegacy does not read a new-scheme artifact as a legacy one", () => {
  for (const name of [
    "epic.1.1.review.1.hero.md",
    "story.1.1.1.qa.1.anim.md",
  ]) {
    const p = d.parseLegacy(name);
    assert.notEqual(
      p.canonical,
      true,
      `${name} is not a canonical legacy artifact`,
    );
    assert.equal(p.docSlug ?? null, null, name);
  }
  const legacy = d.parseLegacy("bug.7.login-timeout.review.1.fix-readiness.md");
  assert.equal(legacy.ok, false, "bug has no legacy shape — sanity");
  const full = d.parseLegacy("prd.onboarding.review.1.pm-check.md");
  assert.equal(full.artifact, "review");
});

test("CR-3 (cycle 3): next prd reports an unreadable registry as unreadable", () => {
  const io = { exists: () => true, readFile: () => null, readDir: () => [] };
  const r = d.runCli(["next", "prd", "--prd-root", "/r"], { cwd: "/", io });
  assert.deepEqual([r.exitCode, r.payload.reason], [1, "unreadable"]);
  const absent = d.runCli(["next", "prd", "--prd-root", "/r"], {
    cwd: "/",
    io: { exists: (q) => q === "/r", readFile: () => null, readDir: () => [] },
  });
  assert.equal(absent.payload.reason, "registry-missing");
});

test("CR-2 (cycle 3): only a closed frontmatter block answers; a spaced closing fence closes it", () => {
  assert.equal(
    d.frontmatterField("---\ntitle: a\n---   \nprd_number: 9\n", "prd_number"),
    "",
  );
  assert.equal(
    d.frontmatterField("---\ntitle: a\nprd_number: 9\n", "prd_number"),
    "",
    "unclosed",
  );
  assert.equal(
    d.frontmatterField("---\r\nprd_number: 3\r\n---\r\n", "prd_number"),
    "3",
    "CRLF",
  );
});

test("CR-4 (cycle 3): format refuses a slug or seq on a fixed-name artifact", () => {
  const base = {
    kind: "story",
    prd: 1,
    epic: 2,
    story: 3,
    artifact: "sprint-review-summary",
  };
  assert.throws(() => d.format({ ...base, slug: "x" }), TypeError);
  assert.throws(() => d.format({ ...base, seq: 4 }), TypeError);
  assert.equal(d.format(base), "story.1.2.3.sprint-review-summary");
});

// ---------------------------------------------------------------------------
// QA cycle 4 findings (gate 4)
// ---------------------------------------------------------------------------

test("CR-1 (cycle 4): parse keeps the kind's slug rule for a full-stem document slug", () => {
  const p = d.parse("bug.20.404-on-refresh.review.1.fix-readiness.md");
  assert.deepEqual(
    [p.ok, p.canonical, p.docSlug, p.artifact, p.seq, p.slug],
    [true, true, "404-on-refresh", "review", 1, "fix-readiness"],
  );
  assert.equal(d.format(p), "bug.20.404-on-refresh.review.1.fix-readiness");
});

test("CR-2 (cycle 4): parseLegacy refuses a new-scheme name outright", () => {
  for (const name of [
    "epic.1.1.review.1.hero.md",
    "story.1.1.1.qa.1.anim.md",
    "epic.1.1.hero.md",
    // QA cycle 5, CR-1: the sub-story suffix
    "story.1.2.3A.qa.1.anim.md",
    "story.1.2.3A.dod.md",
    "story.1.2.3A.review.2026-01-01.md",
  ]) {
    const p = d.parseLegacy(name);
    assert.equal(p.ok, false, name);
    assert.equal(p.reason, "bad-number", name);
  }
  assert.equal(
    d.parseLegacy("story.1.1.qa.1.first-task.md").ok,
    true,
    "a legacy artifact still reads",
  );
});
