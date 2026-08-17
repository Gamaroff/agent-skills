import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createGhSandbox } from "../lib/gh-sandbox.mjs";

const ORIGINAL_GH_TOKEN = process.env.GH_TOKEN;

afterEach(() => {
  if (ORIGINAL_GH_TOKEN === undefined) {
    delete process.env.GH_TOKEN;
  } else {
    process.env.GH_TOKEN = ORIGINAL_GH_TOKEN;
  }
});

test("createGhSandbox: returns skipped when GH_TOKEN not set", async () => {
  delete process.env.GH_TOKEN;
  const receipt = await createGhSandbox({
    repo: "owner/repo",
    branch: "feature/x",
    base: "main",
    title: "t",
  });
  assert.ok(receipt.skipped);
  assert.equal(receipt.reason, "GH_TOKEN not set");
  assert.equal(typeof receipt.cleanup, "function");
  await receipt.cleanup(); // should not throw
});

test("createGhSandbox: returns skipped when repo not provided", async () => {
  process.env.GH_TOKEN = "fake-token";
  const receipt = await createGhSandbox({
    branch: "feature/x",
    base: "main",
    title: "t",
  });
  assert.ok(receipt.skipped);
  assert.equal(receipt.reason, "repo not provided");
});

test("createGhSandbox: returns skipped when branch not provided", async () => {
  process.env.GH_TOKEN = "fake-token";
  const receipt = await createGhSandbox({
    repo: "owner/repo",
    base: "main",
    title: "t",
  });
  assert.ok(receipt.skipped);
  assert.equal(receipt.reason, "branch not provided");
});

test("createGhSandbox: happy path with injected exec", async () => {
  process.env.GH_TOKEN = "fake-token";

  const calls = [];
  const mockExec = async (cmd, args, _opts) => {
    calls.push({ cmd, args });
    if (args.includes("view")) {
      return {
        stdout: JSON.stringify({
          number: 42,
          url: "https://github.com/owner/repo/pull/42",
          baseRefName: "main",
        }),
      };
    }
    return { stdout: "" };
  };

  const receipt = await createGhSandbox({
    repo: "owner/repo",
    branch: "feature/eval-test",
    base: "main",
    title: "Eval test PR",
    exec: mockExec,
  });

  assert.ok(!receipt.skipped);
  assert.equal(receipt.pr.number, 42);
  assert.equal(receipt.pr.baseRefName, "main");
  assert.equal(calls.length, 2);
  assert.ok(calls[0].args.includes("create"));
  assert.ok(calls[1].args.includes("view"));
});

test("createGhSandbox: cleanup calls gh pr close", async () => {
  process.env.GH_TOKEN = "fake-token";

  const calls = [];
  const mockExec = async (cmd, args, _opts) => {
    calls.push({ cmd, args });
    if (args.includes("view")) {
      return {
        stdout: JSON.stringify({
          number: 7,
          url: "https://github.com/o/r/pull/7",
          baseRefName: "develop",
        }),
      };
    }
    return { stdout: "" };
  };

  const receipt = await createGhSandbox({
    repo: "o/r",
    branch: "b",
    base: "develop",
    title: "t",
    exec: mockExec,
  });
  assert.ok(!receipt.skipped);

  await receipt.cleanup();
  const closeCalls = calls.filter((c) => c.args.includes("close"));
  assert.equal(closeCalls.length, 1);
  assert.ok(closeCalls[0].args.includes("7"));
  assert.ok(closeCalls[0].args.includes("--delete-branch"));
});

test("createGhSandbox: returns skipped when pr create fails", async () => {
  process.env.GH_TOKEN = "fake-token";
  const mockExec = async () => {
    throw new Error("network error");
  };
  const receipt = await createGhSandbox({
    repo: "o/r",
    branch: "b",
    base: "develop",
    title: "t",
    exec: mockExec,
  });
  assert.ok(receipt.skipped);
  assert.ok(receipt.reason.includes("gh pr create failed"));
});
