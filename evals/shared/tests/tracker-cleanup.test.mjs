"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanupFromReceipt } from "../lib/tracker-cleanup.mjs";

function sandbox(receipt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tc-"));
  if (receipt !== undefined) {
    fs.mkdirSync(path.join(dir, ".eval"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".eval", "tracker-receipt.json"), JSON.stringify(receipt));
  }
  return dir;
}

test("cleanup — no receipt is a no-op", () => {
  const dir = sandbox();
  const r = cleanupFromReceipt(dir);
  assert.equal(r.cleaned, false);
  assert.match(r.reason, /no receipt/);
});

test("cleanup — non-real receipt is skipped", () => {
  const dir = sandbox({ createdInRealTracker: false, platform: "jira", issueKey: "X-1" });
  const r = cleanupFromReceipt(dir);
  assert.equal(r.cleaned, false);
  assert.match(r.reason, /non-real|DRY_RUN/);
});

test("cleanup — unparseable receipt is reported, not thrown", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tc-"));
  fs.mkdirSync(path.join(dir, ".eval"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".eval", "tracker-receipt.json"), "{not json");
  const r = cleanupFromReceipt(dir);
  assert.equal(r.cleaned, false);
});

test("cleanup — unknown platform is a no-op warning", () => {
  const dir = sandbox({ createdInRealTracker: true, platform: "linear", issueKey: "LIN-1" });
  const r = cleanupFromReceipt(dir);
  assert.equal(r.cleaned, false);
});
