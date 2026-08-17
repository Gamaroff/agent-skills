import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createSandbox } from "../lib/git-sandbox.mjs";

test("createSandbox: initialises git repo with correct default branch", async () => {
  const sb = await createSandbox({ branch: "develop" });
  try {
    const { stdout } = await sb.run("git", ["branch", "--show-current"]);
    assert.equal(stdout, "develop");
  } finally {
    await sb.cleanup();
  }
});

test("createSandbox: writes fixture files and creates initial commit", async () => {
  const sb = await createSandbox({
    fixtureFiles: { "README.md": "hello" },
    initialCommit: true,
  });
  try {
    assert.ok(fs.existsSync(path.join(sb.path, "README.md")));
    const { stdout } = await sb.run("git", ["log", "--oneline"]);
    assert.ok(stdout.includes("initial fixture"));
  } finally {
    await sb.cleanup();
  }
});

test("createSandbox: branchList returns default branch", async () => {
  const sb = await createSandbox({
    branch: "develop",
    fixtureFiles: { "a.txt": "x" },
  });
  try {
    const branches = await sb.branchList();
    assert.ok(branches.includes("develop"));
  } finally {
    await sb.cleanup();
  }
});

test("createSandbox: commit creates a new commit", async () => {
  const sb = await createSandbox({ fixtureFiles: { "a.txt": "initial" } });
  try {
    await sb.run("git", ["checkout", "-b", "feature/test"]);
    fs.writeFileSync(path.join(sb.path, "b.txt"), "new");
    await sb.commit("second commit");
    const { stdout } = await sb.run("git", ["log", "--oneline"]);
    assert.ok(stdout.includes("second commit"));
  } finally {
    await sb.cleanup();
  }
});

test("createSandbox: cleanup removes the directory", async () => {
  const sb = await createSandbox();
  const p = sb.path;
  assert.ok(fs.existsSync(p));
  await sb.cleanup();
  assert.ok(!fs.existsSync(p));
});

test("createSandbox: no initial commit when fixtureFiles empty", async () => {
  const sb = await createSandbox({ initialCommit: true });
  try {
    // git log exits 128 with no commits — run should succeed if we check via rev-parse
    let hasCommit = true;
    try {
      await sb.run("git", ["rev-parse", "HEAD"]);
    } catch {
      hasCommit = false;
    }
    assert.ok(!hasCommit, "should have no commit when fixtureFiles is empty");
  } finally {
    await sb.cleanup();
  }
});
