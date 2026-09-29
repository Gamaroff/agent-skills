"use strict";
/**
 * `.githooks/pre-commit` — an untracked generated copy is refused, not warned about (task.126).
 *
 * The hook bundles when a commit touches a SKILL.md or a shared resource, then
 * stages exactly the `references/` copies ITS OWN run produced (NEW). A copy that
 * was already sitting untracked in the tree before the commit (LEFT) — what a
 * manual `npm run bundle` leaves behind — used to get a one-line warning while the
 * commit proceeded without it. Every local check passes, because the file is on
 * disk; `bundle:check` then fails in CI a push later (observation #114, task.99).
 *
 * Each test drives the real hook in a throwaway git repository whose `npm run
 * bundle` is a stub that writes the files listed in `bundle-creates.txt`, so the
 * hook's own NEW/LEFT accounting is what is under test, not the bundler.
 *
 * Run: node --test tests/pre-commit-hook.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const HOOK = path.resolve(__dirname, "..", ".githooks", "pre-commit");

const STUB = `const fs = require("fs");
const path = require("path");
let list = "";
try { list = fs.readFileSync("bundle-creates.txt", "utf-8"); } catch {}
for (const rel of list.split("\\n").filter(Boolean)) {
  fs.mkdirSync(path.dirname(rel), { recursive: true });
  fs.writeFileSync(rel, "generated\\n");
}
`;

function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-commit-hook-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf-8" });
  git("init", "-q");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "fixture");
  git("config", "core.hooksPath", ".githooks");
  fs.mkdirSync(path.join(root, ".githooks"));
  fs.copyFileSync(HOOK, path.join(root, ".githooks", "pre-commit"));
  fs.chmodSync(path.join(root, ".githooks", "pre-commit"), 0o755);
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "fixture", scripts: { bundle: "node stub.js" } }),
  );
  fs.writeFileSync(path.join(root, "stub.js"), STUB);
  fs.writeFileSync(path.join(root, ".gitignore"), "bundle-creates.txt\n");
  const write = (rel, content = "x\n") => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  };
  write("skills/fx/SKILL.md", "# v1\n");
  write("skills/fx/references/tracked.md", "generated\n");
  // A "generated" copy is one with a source: `stray.md` and `fresh.md` have one,
  // `native-guide.md` (written by the tests below) deliberately does not.
  write("shared/resources/stray.md", "source\n");
  write("shared/resources/fresh.md", "source\n");
  git("add", "-A");
  // The seed commit must not run the hook's bundle against an empty stub list.
  git("-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed");

  const commit = (env = {}) =>
    spawnSync("git", ["commit", "-q", "-m", "change"], {
      cwd: root,
      encoding: "utf-8",
      env: { ...process.env, ...env },
    });
  const touchSkill = () => {
    write("skills/fx/SKILL.md", `# v${Date.now()}\n`);
    git("add", "skills/fx/SKILL.md");
  };
  return { root, git, write, commit, touchSkill };
}

test("an untracked generated copy left in the tree refuses the commit, naming it", (t) => {
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n"); // a manual bundle run left this
  r.touchSkill();
  const res = r.commit();
  assert.notEqual(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stderr, /Untracked generated copies/);
  assert.match(res.stderr, /skills\/fx\/references\/stray\.md/);
  assert.match(res.stderr, /BUNDLE_PRECOMMIT_WARN=1/);
});

test("git add the copy and the same commit goes through", (t) => {
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n");
  r.touchSkill();
  r.git("add", "skills/fx/references/stray.md");
  const res = r.commit();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(r.git("ls-files"), /skills\/fx\/references\/stray\.md/);
});

test("BUNDLE_PRECOMMIT_WARN=1 downgrades the refusal to a warning", (t) => {
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n");
  r.touchSkill();
  const res = r.commit({ BUNDLE_PRECOMMIT_WARN: "1" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stderr, /Untracked generated copies/);
  assert.doesNotMatch(
    r.git("ls-files"),
    /skills\/fx\/references\/stray\.md/,
    "still not committed",
  );
});

test("a copy the hook's own bundle run creates is staged, not refused", (t) => {
  const r = repo(t);
  r.write("bundle-creates.txt", "skills/fx/references/fresh.md\n");
  r.touchSkill();
  const res = r.commit();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(r.git("ls-files"), /skills\/fx\/references\/fresh\.md/);
});

test("a modified TRACKED copy stays a warning — the committed tree is consistent without it", (t) => {
  const r = repo(t);
  r.write("skills/fx/references/tracked.md", "edited\n");
  r.touchSkill();
  const res = r.commit();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  // git hands a hook's stdout to its own stderr, so read both.
  assert.match(res.stdout + res.stderr, /pre-existing bundle change/);
});

test("a commit touching no SKILL.md or shared resource is not gated at all", (t) => {
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n");
  r.write("README.md", "hi\n");
  r.git("add", "README.md");
  const res = r.commit();
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test("an untracked SKILL-NATIVE references/ file (no shared source) is warned about, not refused", (t) => {
  // 89 tracked references/ files in this repository have no shared source: a
  // hand-written reference is normal, bundle:check does not judge it, and the
  // hook must not call it a generated copy (task.126 QA-1, CR-1).
  const r = repo(t);
  r.write("skills/fx/references/native-guide.md", "hand-written\n");
  r.touchSkill();
  const res = r.commit();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.doesNotMatch(res.stderr, /Untracked generated copies/);
  assert.match(res.stdout + res.stderr, /pre-existing bundle change/);
});

test("a refused commit leaves the index as it found it — the hook's NEW copies are not staged", (t) => {
  // The refusal runs before the NEW copies are staged; otherwise an aborted
  // commit would leave bundled files in the index (task.126 QA-1, CR-3).
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n");
  r.write("bundle-creates.txt", "skills/fx/references/fresh.md\n");
  r.touchSkill();
  const res = r.commit();
  assert.notEqual(res.status, 0, res.stdout + res.stderr);
  assert.deepEqual(
    r.git("diff", "--cached", "--name-only").trim().split("\n"),
    ["skills/fx/SKILL.md"],
  );
});

test("following the printed remedy and retrying goes through — the refused run left none of its own copies behind", (t) => {
  // A refused commit that left the run's NEW copies on disk made the retry
  // refuse again, naming files the author never made (task.126 QA-2, CR-1).
  const r = repo(t);
  r.write("skills/fx/references/stray.md", "generated\n");
  r.write("bundle-creates.txt", "skills/fx/references/fresh.md\n");
  r.touchSkill();
  const first = r.commit();
  assert.notEqual(first.status, 0, first.stdout + first.stderr);
  assert.ok(
    !fs.existsSync(path.join(r.root, "skills/fx/references/fresh.md")),
    "the refused run removed the copy it wrote",
  );
  r.git("add", "skills/fx/references/stray.md"); // the printed remedy
  const retry = r.commit();
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  const files = r.git("ls-files");
  assert.match(files, /skills\/fx\/references\/fresh\.md/);
  assert.match(files, /skills\/fx\/references\/stray\.md/);
});

test("the unstaged-source refusal's own remedy — stage the source, retry — goes through", (t) => {
  const r = repo(t);
  r.write("shared/resources/fresh.md", "edited source\n"); // unstaged shared edit
  r.write("bundle-creates.txt", "skills/fx/references/fresh.md\n");
  r.touchSkill();
  const first = r.commit();
  assert.notEqual(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stderr, /shared sources have unstaged edits/);
  r.git("add", "shared/resources/fresh.md"); // the printed remedy
  const retry = r.commit();
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  assert.match(r.git("ls-files"), /skills\/fx\/references\/fresh\.md/);
});
