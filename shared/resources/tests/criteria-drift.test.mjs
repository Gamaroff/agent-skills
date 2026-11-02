/**
 * criteria-drift — which criteria changed since a base, and how (task.248, obs #139).
 *
 * The fixtures are task.234's real criterion #5 at four commits: as reviewed,
 * with develop's evidence note, after qa-fix cycle 2 amended it, and as accepted
 * with the owner's approval. The test calls the engine; it never greps prose.
 *
 * Run: node --test shared/resources/tests/criteria-drift.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { diffCriteria } = require("../criteria-drift.js");
const CLI = join(here, "..", "criteria-drift.js");
const fx = (name) =>
  readFileSync(join(here, "fixtures", "criteria-drift", `${name}.md`), "utf8");

const perf = (r) =>
  r.changed.find((c) => /wall time/.test(c.after ?? c.before));

test("task.234: the amendment as it stood before approval is appended, unapproved", () => {
  const r = diffCriteria(fx("reviewed"), fx("amended"));
  assert.equal(r.reason, "drift");
  const c = perf(r);
  assert.equal(c.kind, "appended");
  assert.equal(c.approved, false);
  assert.equal(c.approver, null);
});

test("task.234: the approved wording is approved, and names the approver", () => {
  const c = perf(diffCriteria(fx("reviewed"), fx("approved")));
  assert.equal(c.kind, "appended");
  assert.equal(c.approved, true);
  assert.match(c.approver, /^Lorien Gamaroff/);
});

test("task.234: an amendment inserted above an existing evidence note is reworded", () => {
  // Against develop's noted version the old continuation is no longer a prefix
  // of the new one: text went in ahead of it.
  const c = perf(diffCriteria(fx("evidence"), fx("amended")));
  assert.equal(c.kind, "reworded");
  assert.equal(c.approved, false);
});

test("a tick-only change is clean, and QA Results / Change Log edits are not read", () => {
  // reviewed → evidence ticks both boxes and edits QA Results and the Change Log;
  // only the Performance note is a criteria change.
  const ticked = fx("reviewed")
    .replaceAll("- [ ]", "- [x]")
    .replace("None yet.", "QA 1: PASS.");
  assert.deepEqual(diffCriteria(fx("reviewed"), ticked), {
    reason: "clean",
    changed: [],
    exitCode: 0,
  });
  const r = diffCriteria(fx("reviewed"), fx("evidence"));
  assert.deepEqual(
    r.changed.map((c) => c.kind),
    ["appended"],
  );
});

test("control: an amendment written on the checkbox line itself is reworded", () => {
  const after = fx("reviewed").replace(
    "(about 0.6 s per spawn site).",
    "(about 0.6 s per spawn site), or by 10% under load.",
  );
  const c = perf(diffCriteria(fx("reviewed"), after));
  assert.equal(c.kind, "reworded");
  assert.equal(c.approved, false);
});

test("a changed word inside an existing continuation line is reworded", () => {
  const after = fx("evidence").replace("+0.14 s;", "+0.41 s;");
  assert.equal(perf(diffCriteria(fx("evidence"), after)).kind, "reworded");
});

// task.248 QA cycle 1, T248-QA-2: "appended" means whole words were added after
// the old text. Both directions: a pair that must read as appended, and a pair
// that shares a prefix but must read as reworded.
const bound = (cont) =>
  `## Success Criteria\n\n- [ ] 1. The check runs fast.\n      ${cont}\n`;
const kindOf = (b, a) => diffCriteria(bound(b), bound(a)).changed[0].kind;

test("T248-QA-2: a bound edited by extension is reworded, not appended", () => {
  assert.equal(kindOf("Bound: within 5", "Bound: within 50 ms"), "reworded");
  assert.equal(kindOf("Bound: within 5 s", "Bound: within 5 s5"), "reworded");
  assert.equal(kindOf("Bound: within 5", "Bound: within 5.5 s"), "reworded");
});

test("T248-QA-2: text added after a word boundary is still appended", () => {
  assert.equal(
    kindOf("Bound: within 5 s.", "Bound: within 5 s. Evidence: run 3"),
    "appended",
  );
  assert.equal(
    kindOf("Bound: within 5 s", "Bound: within 5 s, measured by x"),
    "appended",
  );
  assert.equal(kindOf("Bound: within 5 s", "Bound: within 5 s."), "appended");
});

test("an approval already in the base does not approve a later change", () => {
  const after = fx("approved").replace(
    "(about 0.6 s per spawn site).",
    "(about 1 s per spawn site).",
  );
  const c = perf(diffCriteria(fx("approved"), after));
  assert.equal(c.kind, "reworded");
  assert.equal(c.approved, false);
});

test('"approval pending" is not an approver', () => {
  const after = fx("reviewed").replace(
    "(about 0.6 s per spawn site).",
    "(about 0.6 s per spawn site).\n      *(Relaxed to 1 s — approval pending.)*",
  );
  assert.equal(perf(diffCriteria(fx("reviewed"), after)).approved, false);
});

test("an added and a removed criterion are reported, and the rest stay paired", () => {
  const added = fx("reviewed").replace(
    "### Performance",
    "- [ ] A new functional criterion.\n\n### Performance",
  );
  const r = diffCriteria(fx("reviewed"), added);
  assert.deepEqual(
    r.changed.map((c) => c.kind),
    ["added"],
  );
  const back = diffCriteria(added, fx("reviewed"));
  assert.deepEqual(
    back.changed.map((c) => [c.kind, c.approved]),
    [["removed", false]],
  );
});

test("no criteria now is no-criteria (exit 1); no document at the base is new-document", () => {
  assert.equal(
    diffCriteria(fx("reviewed"), "# Notes\n\nNothing.\n").reason,
    "no-criteria",
  );
  assert.equal(diffCriteria(fx("reviewed"), "# Notes\n").exitCode, 1);
  assert.deepEqual(diffCriteria(null, fx("reviewed")), {
    reason: "new-document",
    changed: [],
    exitCode: 0,
  });
});

// ── the CLI against a real repository ────────────────────────────────────────

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "criteria-drift-"));
  const g = (...a) => {
    const r = spawnSync("git", a, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${a.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  g("init", "-q", "-b", "develop");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");
  return { dir, g };
}
const cli = (cwd, ...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args, "--json"], {
    cwd,
    encoding: "utf8",
  });
  return { status: r.status, j: JSON.parse(r.stdout) };
};

test("CLI: --base <ref> diffs against the document at that commit", (t) => {
  const { dir, g } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "docs"));
  const doc = join(dir, "docs", "task.1.x.md");
  writeFileSync(doc, fx("reviewed"));
  g("add", ".");
  g("commit", "-qm", "base");
  writeFileSync(doc, fx("amended"));
  const { status, j } = cli(dir, "--doc", doc, "--base", "HEAD");
  assert.equal(status, 0);
  assert.equal(j.reason, "drift");
  assert.equal(j.base.kind, "ref");
  assert.deepEqual(
    j.changed.map((c) => [c.kind, c.approved]),
    [["appended", false]],
  );
});

test("CLI: a document absent at the base is new-document; an unknown ref is usage, never clean", (t) => {
  const { dir, g } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "README.md"), "x\n");
  g("add", ".");
  g("commit", "-qm", "base");
  const doc = join(dir, "task.1.x.md");
  writeFileSync(doc, fx("reviewed"));
  assert.equal(
    cli(dir, "--doc", doc, "--base", "HEAD").j.reason,
    "new-document",
  );
  const bad = cli(dir, "--doc", doc, "--base", "no-such-ref");
  assert.equal(bad.status, 2);
  assert.equal(bad.j.reason, "usage");
  for (const args of [
    [],
    ["--doc", doc],
    ["--doc", doc, "--base", "HEAD", "--base-blob", "abc"],
    ["--doc", "--base", "HEAD"],
  ]) {
    assert.equal(cli(dir, ...args).status, 2, args.join(" "));
  }
});

test("CLI: --base-from-review prefers the reviewed blob, then the review's commit, then the merge-base", (t) => {
  const { dir, g } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const doc = join(dir, "task.1.x.md");
  const report = join(dir, "task.1.review.1.x.md");
  writeFileSync(doc, fx("reviewed"));
  g("add", ".");
  g("commit", "-qm", "base");
  g("update-ref", "refs/remotes/origin/develop", "HEAD");
  writeFileSync(doc, fx("amended"));

  // No review report: the merge-base.
  let r = cli(dir, "--doc", doc, "--base-from-review", "develop");
  assert.equal(r.j.base.kind, "merge-base");
  assert.equal(r.j.changed[0].kind, "appended");

  // A report whose blob is not in the store, added in a commit: the review's commit.
  const evidence = fx("evidence");
  writeFileSync(doc, evidence);
  const stamp = spawnSync("git", ["hash-object", "--stdin"], {
    cwd: dir,
    input: evidence,
    encoding: "utf8",
  }).stdout.trim();
  writeFileSync(
    report,
    `# Review\n\n**Reviewed:** 2026-10-31\n**reviewed_blob:** ${stamp}\n`,
  );
  g("add", ".");
  g("commit", "-qm", "review");
  writeFileSync(doc, fx("amended"));
  r = cli(dir, "--doc", doc, "--base-from-review", "develop");
  assert.equal(r.j.base.kind, "reviewed-blob"); // the commit put the exact bytes in the store
  assert.equal(r.j.changed[0].kind, "reworded");

  // A stamp naming a blob no commit holds: the commit that added the report.
  writeFileSync(report, `# Review\n\n**reviewed_blob:** ${"0".repeat(40)}\n`);
  g("add", ".");
  g("commit", "-qm", "restamp");
  r = cli(dir, "--doc", doc, "--base-from-review", "develop");
  assert.equal(r.j.base.kind, "review-commit");
  assert.equal(r.j.base.exact, false);
  assert.equal(r.j.changed[0].kind, "reworded");
});

// task.248 QA cycle 1, T248-QA-1: a review never halts over a missing stamp, so
// an unstamped report is normal. Its commit is the base, not the merge-base —
// otherwise the review's own edit reads as an unapproved rewording.
test("CLI: an unstamped review report still makes the review's commit the base", (t) => {
  const { dir, g } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const doc = join(dir, "task.1.x.md");
  writeFileSync(doc, fx("reviewed"));
  g("add", ".");
  g("commit", "-qm", "base");
  g("update-ref", "refs/remotes/origin/develop", "HEAD");
  // The review step edits the criteria and writes a report with no stamp line.
  writeFileSync(doc, fx("evidence"));
  writeFileSync(join(dir, "task.1.review.1.x.md"), "# Review\n\nNo stamp.\n");
  g("add", ".");
  g("commit", "-qm", "review");
  const r = cli(dir, "--doc", doc, "--base-from-review", "develop");
  assert.equal(r.j.base.kind, "review-commit");
  assert.equal(r.j.base.exact, false); // nothing vouches for the bytes
  assert.equal(r.j.reason, "clean");
  assert.equal(r.status, 0);
});

// task.248 QA cycle 2, T248-QA2-2: review-bug writes {BUG_PREFIX}.review.{N} into the task's
// directory. Both directions: the bug's review is never the task's base, and is the bug's own.
test("CLI: a co-located bug's review report is the bug's base, never the task's", (t) => {
  const { dir, g } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const doc = join(dir, "task.9.x.md");
  const bug = join(dir, "task.9.bug.1.y.md");
  writeFileSync(doc, fx("reviewed"));
  writeFileSync(bug, fx("evidence"));
  g("add", ".");
  g("commit", "-qm", "base");
  g("update-ref", "refs/remotes/origin/develop", "HEAD");
  const stamp = (f) => g("hash-object", f);
  writeFileSync(
    join(dir, "task.9.review.1.x.md"),
    `# R\n\n**reviewed_blob:** \`${stamp(doc)}\`\n`,
  );
  writeFileSync(
    join(dir, "task.9.bug.1.review.2.y.md"),
    `# R\n\n**reviewed_blob:** \`${stamp(bug)}\`\n`,
  );
  g("add", ".");
  g("commit", "-qm", "reviews");
  const task = cli(dir, "--doc", doc, "--base-from-review", "develop");
  assert.equal(task.j.base.report, "task.9.review.1.x.md");
  assert.equal(task.j.reason, "clean");
  const own = cli(dir, "--doc", bug, "--base-from-review", "develop");
  assert.equal(own.j.base.report, "task.9.bug.1.review.2.y.md");
  assert.equal(own.j.reason, "clean");
});

// task.248 QA cycle 2, T248-QA2-3: git's toplevel is a real path. A document reached through a
// symlink (macOS's /var → /private/var) must read the same as through its real path.
test("CLI: a document path through a symlink reads the same as its real path", (t) => {
  const { dir, g } = repo();
  const link = `${dir}-link`;
  t.after(() => {
    rmSync(link, { force: true });
    rmSync(dir, { recursive: true, force: true });
  });
  writeFileSync(join(dir, "task.1.x.md"), fx("reviewed"));
  g("add", ".");
  g("commit", "-qm", "base");
  symlinkSync(dir, link);
  const real = cli(dir, "--doc", join(dir, "task.1.x.md"), "--base", "HEAD");
  const via = cli(dir, "--doc", join(link, "task.1.x.md"), "--base", "HEAD");
  assert.equal(real.j.reason, "clean");
  assert.equal(via.status, 0);
  assert.equal(via.j.reason, "clean");
});
