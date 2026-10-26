"use strict";
/**
 * scripts/test-tmpdir.mjs — the per-run TMPDIR wrapper `npm test` runs the suite through.
 *
 * WHY THIS EXISTS
 * ---------------
 * The wrapper sits between CI and the suite's exit code, so the two properties that matter are the
 * two a wrapper can silently break: it must never turn a red suite green, and it must always remove
 * its directory — on a pass, a red suite, a tripped ratchet, a signal. The ratchet cases hold the
 * other half: a new leaking prefix, a known one over its count, and a ratchet entry that no longer
 * leaks all fail the run (task 231, obs #83).
 *
 * The end-to-end cases spawn the wrapper around a tiny fake suite (`node -e …`) that creates the
 * leftovers it is told to, inside whatever TMPDIR it was given, and writes that TMPDIR to a marker
 * file outside it so the test can check the directory is gone afterwards.
 *
 * Run: node --test tests/test-tmpdir.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "test-tmpdir.mjs");
const RATCHET = path.join(__dirname, "tmp-leak-ratchet.json");

let mod;
test.before(async () => {
  mod = await import(SCRIPT);
});

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test-tmpdir-case-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * A fake suite: record its TMPDIR in `marker`, create `leaks` (names) inside it, exit `status`.
 * Returns the argv after `--`.
 */
function fakeSuite(marker, leaks, status) {
  const body = `
    const fs = require("fs"), path = require("path");
    const d = process.env.TMPDIR;
    fs.writeFileSync(${JSON.stringify(marker)}, d);
    for (const n of ${JSON.stringify(leaks)}) fs.mkdirSync(path.join(d, n));
    process.exit(${status});
  `;
  return [process.execPath, "-e", body];
}

function run(t, { leaks = [], status = 0, ratchet = {} }) {
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, JSON.stringify(ratchet));
  const r = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--ratchet",
      ratchetFile,
      "--",
      ...fakeSuite(marker, leaks, status),
    ],
    { encoding: "utf8" },
  );
  const seen = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : null;
  return { status: r.status, stderr: r.stderr, seen };
}

test("a suite that leaks nothing exits 0, and the per-run directory is gone", (t) => {
  const r = run(t, {});
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.seen, "the fake suite never ran");
  assert.equal(fs.existsSync(r.seen), false, `${r.seen} survived the run`);
  assert.match(r.stderr, /ratchet ok/);
});

test("the child sees TMPDIR set to the per-run directory, under the system tmpdir", (t) => {
  const r = run(t, {});
  assert.ok(
    r.seen.startsWith(path.join(os.tmpdir(), "agent-skills-test-")),
    r.seen,
  );
});

test("a new leaking prefix fails the run, names the prefix, and the directory is still gone", (t) => {
  const r = run(t, { leaks: ["leaky-thing-Ab12Cd", "leaky-thing-Ef34Gh"] });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /new prefix "leaky-thing" \(2 entries\)/);
  assert.equal(fs.existsSync(r.seen), false);
});

test("a ratcheted prefix within its count passes; above its count it fails", (t) => {
  const within = run(t, {
    leaks: ["known-Ab12Cd", "known-Ef34Gh"],
    ratchet: { known: 2 },
  });
  assert.equal(within.status, 0, within.stderr);
  const over = run(t, {
    leaks: ["known-Ab12Cd", "known-Ef34Gh", "known-Ij56Kl"],
    ratchet: { known: 2 },
  });
  assert.equal(over.status, 1, over.stderr);
  assert.match(over.stderr, /prefix "known" over its ratchet \(3 > 2\)/);
  assert.equal(fs.existsSync(over.seen), false);
});

// A prefix can be absent because this environment skipped the suite that leaks it (CI runs zsh
// variants this machine has no zsh for), so healed is a notice, never a failure (task 231).
test("a ratchet entry whose prefix leaked nothing is reported as a notice and does not fail the run", (t) => {
  const r = run(t, { ratchet: { gone: 4 } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stderr,
    /notice — prefix "gone" leaked nothing here; if its leak is fixed, delete it from tests\/tmp-leak-ratchet\.json/,
  );
  assert.match(r.stderr, /ratchet ok/);
});

test("a failing suite with no leaks keeps the suite's own exit code, and the directory is gone", (t) => {
  const r = run(t, { status: 3 });
  assert.equal(r.status, 3, r.stderr);
  assert.equal(fs.existsSync(r.seen), false);
});

test("a failing suite that also trips the ratchet still exits with the suite's code", (t) => {
  const r = run(t, { status: 5, leaks: ["leaky-Ab12Cd"] });
  assert.equal(r.status, 5, r.stderr);
  assert.equal(fs.existsSync(r.seen), false);
});

test("a read-only fixture left behind is still removed", (t) => {
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, JSON.stringify({ locked: 1 }));
  const body = `
    const fs = require("fs"), path = require("path");
    const d = process.env.TMPDIR;
    fs.writeFileSync(${JSON.stringify(marker)}, d);
    const l = path.join(d, "locked-Ab12Cd");
    fs.mkdirSync(l); fs.writeFileSync(path.join(l, "f"), "x"); fs.chmodSync(l, 0o500);
  `;
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--ratchet", ratchetFile, "--", process.execPath, "-e", body],
    {
      encoding: "utf8",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const seen = fs.readFileSync(marker, "utf8");
  assert.equal(
    fs.existsSync(seen),
    false,
    `${seen} survived a read-only subtree`,
  );
});

test("a signal to the wrapper reaches the suite, removes the directory, and is re-raised", async (t) => {
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, "{}");
  const body = `
    require("fs").writeFileSync(${JSON.stringify(marker)}, process.env.TMPDIR);
    setInterval(() => {}, 1000);
  `;
  const child = spawn(
    process.execPath,
    [SCRIPT, "--ratchet", ratchetFile, "--", process.execPath, "-e", body],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (b) => (stderr += b));
  for (let i = 0; i < 100 && !fs.existsSync(marker); i++)
    await new Promise((r) => setTimeout(r, 50));
  assert.ok(fs.existsSync(marker), "the fake suite never started");
  child.kill("SIGTERM");
  const [code, signal] = await new Promise((r) =>
    child.on("close", (c, s) => r([c, s])),
  );
  assert.equal(signal, "SIGTERM", `exit code ${code}, stderr: ${stderr}`);
  assert.match(stderr, /interrupted by SIGTERM/);
  assert.equal(fs.existsSync(fs.readFileSync(marker, "utf8")), false);
});

test("usage errors exit 2: no `--`, an unknown option, an unreadable ratchet", (t) => {
  const dir = scratch(t);
  assert.equal(
    spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" }).status,
    2,
  );
  assert.equal(
    spawnSync(process.execPath, [SCRIPT, "--bogus", "--", "true"], {
      encoding: "utf8",
    }).status,
    2,
  );
  const missing = path.join(dir, "absent.json");
  assert.equal(
    spawnSync(process.execPath, [SCRIPT, "--ratchet", missing, "--", "true"], {
      encoding: "utf8",
    }).status,
    2,
  );
});

test("prefixOf strips the random suffix, and an extension that follows it", () => {
  assert.equal(mod.prefixOf("qa-next-Ab12Cd"), "qa-next");
  assert.equal(
    mod.prefixOf("review-pr-comment.Ab12Cd.md"),
    "review-pr-comment",
  );
  assert.equal(mod.prefixOf("fake-gh_x1y2z3"), "fake-gh");
  assert.equal(mod.prefixOf("plain"), "plain");
  assert.equal(
    mod.prefixOf("eval-repeat-hang-o6VXmH-Ab12Cd"),
    "eval-repeat-hang",
  );
  assert.equal(mod.prefixOf("carry-5c-remote-Ab12Cd"), "carry-5c-remote");
  assert.deepEqual(mod.groupByPrefix(["a-Ab12Cd", "a-Ef34Gh", "b-Ij56Kl"]), {
    a: 2,
    b: 1,
  });
});

test("groupByPrefix counts a prefix spelled like an Object.prototype key as an ordinary prefix (TASK-231-QA-1)", () => {
  const g = mod.groupByPrefix([
    "__proto__-Ab12Cd",
    "__proto__-Ef34Gh",
    "constructor-Ab12Cd",
    "toString-Ab12Cd",
  ]);
  assert.deepEqual(Object.keys(g).sort(), [
    "__proto__",
    "constructor",
    "toString",
  ]);
  assert.equal(g["__proto__"], 2);
  assert.equal(g.constructor, 1);
  // …and so it trips the ratchet like any new prefix, with a numeric count.
  const v = mod.compareRatchet(g, {});
  assert.equal(v.ok, false);
  assert.deepEqual(
    v.newPrefixes.map((x) => [x.prefix, x.count]),
    [
      ["__proto__", 2],
      ["constructor", 1],
      ["toString", 1],
    ],
  );
});

test("compareRatchet sorts each finding into exactly one bucket", () => {
  const v = mod.compareRatchet(
    { fresh: 1, known: 3, held: 1 },
    { known: 2, held: 2, gone: 1 },
  );
  assert.deepEqual(
    v.newPrefixes.map((x) => x.prefix),
    ["fresh"],
  );
  assert.deepEqual(
    v.over.map((x) => x.prefix),
    ["known"],
  );
  assert.deepEqual(
    v.within.map((x) => x.prefix),
    ["held"],
  );
  assert.deepEqual(
    v.healed.map((x) => x.prefix),
    ["gone"],
  );
  assert.equal(v.ok, false);
  assert.equal(mod.compareRatchet({ held: 1 }, { held: 2 }).ok, true);
  assert.equal(
    mod.compareRatchet({}, { gone: 1 }).ok,
    true,
    "healed alone is not a failure",
  );
});

test("the committed ratchet is well-formed and holds none of the fixed prefixes", () => {
  const r = mod.readRatchet(RATCHET);
  for (const fixed of [
    "qa-next",
    "review-pr-repo",
    "wireloom-test",
    "executed-prose",
  ])
    assert.equal(
      Object.hasOwn(r, fixed),
      false,
      `${fixed} is fixed (task 231) and must not be ratcheted`,
    );
});
