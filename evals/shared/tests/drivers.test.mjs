"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVERS_DIR = path.resolve(__dirname, "..", "drivers");

async function loadDriver(name) {
  const p = path.join(DRIVERS_DIR, `${name}.mjs`);
  return (await import(pathToFileURL(p).href)).default;
}

const EXPECTED = ["replay", "claude-sdk", "claude-cli"];

for (const name of EXPECTED) {
  test(`driver ${name} — satisfies AgentDriver contract`, async () => {
    const d = await loadDriver(name);
    assert.equal(d.name, name);
    assert.equal(typeof d.isAvailable, "function");
    assert.equal(typeof d.run, "function");
    const avail = await d.isAvailable();
    assert.equal(typeof avail.ok, "boolean");
    if (!avail.ok) assert.equal(typeof avail.reason, "string");
  });
}

test("driver replay — always available", async () => {
  const d = await loadDriver("replay");
  assert.deepEqual(await d.isAvailable(), { ok: true });
});

test("driver claude-sdk — availability reflects SDK install + API key", async () => {
  const d = await loadDriver("claude-sdk");
  const hadKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const a = await d.isAvailable();
    // SDK is installed as devDep, so install is present; without API key we
    // expect a clear unavailable-reason. With a key, we expect ok:true.
    assert.equal(a.ok, false);
    assert.match(a.reason, /ANTHROPIC_API_KEY/);
  } finally {
    if (hadKey) process.env.ANTHROPIC_API_KEY = hadKey;
  }
});

test("driver claude-cli — availability tracks whether `claude` is on PATH", async () => {
  const d = await loadDriver("claude-cli");
  const a = await d.isAvailable();
  // Either it's installed (ok=true) or it gives a clear reason.
  if (!a.ok) assert.match(a.reason, /claude|PATH/i);
});

test("drivers/ has no rogue files outside the contract", () => {
  const files = fs
    .readdirSync(DRIVERS_DIR)
    .filter((f) => f.endsWith(".mjs") && f !== "types.mjs");
  for (const f of files) {
    const name = f.replace(/\.mjs$/, "");
    assert.ok(EXPECTED.includes(name), `unexpected driver file: ${f}`);
  }
});
