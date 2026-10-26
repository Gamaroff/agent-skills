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
const { pathToFileURL } = require("node:url");

const SCRIPT = path.join(__dirname, "..", "scripts", "test-tmpdir.mjs");
const RATCHET = path.join(__dirname, "tmp-leak-ratchet.json");

let mod;
let budget;
test.before(async () => {
  mod = await import(SCRIPT);
  const { spawnBudget } = await import(
    pathToFileURL(
      path.join(__dirname, "..", "shared", "resources", "spawn-budget.mjs"),
    ).href
  );
  budget = spawnBudget("TEST_TMPDIR");
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

/**
 * Spawn the wrapper in a process group of its own and, after the test, kill that group. A
 * regression that stops the signal reaching the suite would otherwise leave the suite holding the
 * stderr pipe open, and the test file would hang instead of failing.
 */
function spawnWrapper(t, args, suitePidFile) {
  const child = spawn(process.execPath, [SCRIPT, ...args], {
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
  });
  // Read the suite's pid as soon as it is written, not in the hook: node:test runs after hooks in
  // registration order, so scratch(t)'s removal has deleted the file before this hook runs
  // (TASK-231-CR4-1).
  let suite = null;
  const capture = () => {
    if (suite === null && suitePidFile && fs.existsSync(suitePidFile)) {
      const pid = Number(fs.readFileSync(suitePidFile, "utf8"));
      if (pid > 0) suite = pid;
    }
    return suite;
  };
  // Tests read the pid through this, so the net holds it before the test can end; the poll is
  // the backstop for a test that never reads it.
  child.suitePid = capture;
  const watch = setInterval(
    () => capture() !== null && clearInterval(watch),
    20,
  );
  watch.unref();
  t.after(() => {
    clearInterval(watch);
    // The wrapper's group, and the suite's own: the wrapper starts the suite in a session of its
    // own, so killing the wrapper's group alone misses it (TASK-231-CR3-2).
    const groups = suite === null ? [child.pid] : [child.pid, suite];
    for (const g of groups) {
      try {
        process.kill(-g, "SIGKILL");
      } catch {
        // already gone
      }
    }
    child.stderr.destroy();
  });
  return child;
}

/** The wrapper's [code, signal], or a rejection once the spawn budget runs out. */
function closeWithin(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error(`wrapper still running after ${budget.timeoutMs} ms`)),
      budget.timeoutMs,
    );
    child.on("close", (c, s) => {
      clearTimeout(timer);
      resolve([c, s]);
    });
  });
}

for (const sig of ["SIGTERM", "SIGHUP"]) {
  test(`a ${sig} to the wrapper reaches the suite, removes the directory, and is re-raised (SIGHUP: TASK-231-CR3-1)`, async (t) => {
    const dir = scratch(t);
    const marker = path.join(dir, "tmpdir.txt");
    const suitePid = path.join(dir, "suite.pid");
    const ratchetFile = path.join(dir, "ratchet.json");
    fs.writeFileSync(ratchetFile, "{}");
    const body = `
      require("fs").writeFileSync(${JSON.stringify(suitePid)}, String(process.pid));
      require("fs").writeFileSync(${JSON.stringify(marker)}, process.env.TMPDIR);
      setInterval(() => {}, 1000);
    `;
    const child = spawnWrapper(
      t,
      ["--ratchet", ratchetFile, "--", process.execPath, "-e", body],
      suitePid,
    );
    let stderr = "";
    child.stderr.on("data", (b) => (stderr += b));
    for (let i = 0; i < 100 && !fs.existsSync(marker); i++)
      await new Promise((r) => setTimeout(r, 50));
    assert.ok(fs.existsSync(marker), "the fake suite never started");
    const suite = child.suitePid();
    child.kill(sig);
    const [code, signal] = await closeWithin(child);
    assert.equal(signal, sig, `exit code ${code}, stderr: ${stderr}`);
    assert.match(stderr, new RegExp(`interrupted by ${sig}`));
    assert.equal(alive(suite), false, `suite ${suite} outlived a ${sig}`);
    assert.equal(fs.existsSync(fs.readFileSync(marker, "utf8")), false);
  });
}

/** The single-letter process state from /proc (R, S, T, …), or null where /proc is absent. */
function procState(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3);
  } catch {
    return null;
  }
}

async function until(pred) {
  for (let i = 0; i < 100 && !pred(); i++)
    await new Promise((r) => setTimeout(r, 50));
  return pred();
}

test("Ctrl-Z stops the suite with the wrapper, and resuming the wrapper resumes it (TASK-231-CR3-1)", async (t) => {
  if (!fs.existsSync("/proc/self/stat"))
    return t.skip("needs /proc to read process states");
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const suitePid = path.join(dir, "suite.pid");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, "{}");
  const body = `
    require("fs").writeFileSync(${JSON.stringify(suitePid)}, String(process.pid));
    require("fs").writeFileSync(${JSON.stringify(marker)}, process.env.TMPDIR);
    setInterval(() => {}, 1000);
  `;
  const child = spawnWrapper(
    t,
    ["--ratchet", ratchetFile, "--", process.execPath, "-e", body],
    suitePid,
  );
  assert.ok(
    await until(() => fs.existsSync(marker)),
    "the fake suite never started",
  );
  const suite = child.suitePid();
  child.kill("SIGTSTP");
  assert.ok(
    await until(() => procState(child.pid) === "T"),
    "the wrapper did not stop",
  );
  assert.ok(
    await until(() => procState(suite) === "T"),
    "the suite kept running while the wrapper was stopped",
  );
  child.kill("SIGCONT");
  assert.ok(
    await until(() => procState(suite) !== "T"),
    "the suite was not resumed",
  );
  child.kill("SIGTERM");
  const [, signal] = await closeWithin(child);
  assert.equal(signal, "SIGTERM");
});

test("the safety net ends a suite the test left running, in its own session (TASK-231-CR4-1)", async (t) => {
  let suite;
  let inner;
  await t.test("a test that never signals the wrapper", async (st) => {
    const dir = scratch(st);
    const marker = path.join(dir, "tmpdir.txt");
    const suitePid = path.join(dir, "suite.pid");
    const ratchetFile = path.join(dir, "ratchet.json");
    fs.writeFileSync(ratchetFile, "{}");
    const body = `
      require("fs").writeFileSync(${JSON.stringify(suitePid)}, String(process.pid));
      require("fs").writeFileSync(${JSON.stringify(marker)}, process.env.TMPDIR);
      setInterval(() => {}, 1000);
    `;
    const child = spawnWrapper(
      st,
      ["--ratchet", ratchetFile, "--", process.execPath, "-e", body],
      suitePid,
    );
    assert.ok(
      await until(() => fs.existsSync(marker)),
      "the fake suite never started",
    );
    suite = child.suitePid();
    inner = fs.readFileSync(marker, "utf8");
  });
  // The wrapper was SIGKILLed by the net and could not clean up after itself.
  t.after(() => inner && fs.rmSync(inner, { recursive: true, force: true }));
  t.after(() => alive(suite) && process.kill(suite, "SIGKILL"));
  assert.ok(
    await until(() => !alive(suite)),
    `suite ${suite} outlived the safety net`,
  );
});

test("signalGroup reads EPERM as a group that still exists, not one that is gone (TASK-231-CR3-3)", (t) => {
  if (process.getuid?.() === 0 || !fs.existsSync("/proc"))
    return t.skip("needs /proc and a non-root user");
  // A process group led by another user's process: it exists, and we may not signal it.
  const leader = fs
    .readdirSync("/proc")
    .filter((d) => /^[0-9]+$/.test(d) && Number(d) > 1)
    .map(Number)
    .find((pid) => {
      try {
        const st = fs.statSync(`/proc/${pid}`);
        const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
        const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        return st.uid !== process.getuid() && Number(fields[2]) === pid;
      } catch {
        return false;
      }
    });
  if (!leader) return t.skip("no group led by another user's process");
  assert.throws(
    () => process.kill(-leader, 0),
    { code: "EPERM" },
    "premise: the probe is refused, not missing",
  );
  assert.equal(mod.signalGroup(leader, 0), true);
  assert.equal(
    mod.signalGroup(2 ** 22 + 12345, 0),
    false,
    "a group that does not exist is gone",
  );
});

/** True while a process with this pid exists. */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * A fake suite that starts a grandchild (recording its pid), then: "exit" — exits 0 and leaves it
 * running; "wait-on-child" — on SIGTERM waits for the grandchild to exit before exiting itself,
 * as a test runner waits for its workers, so only a signal that reaches the grandchild ends it.
 */
function grandchildSuite(gcPidFile, marker, mode) {
  return `
    const { spawn } = require("child_process");
    const fs = require("fs");
    fs.writeFileSync(${JSON.stringify(gcPidFile + ".leader")}, String(process.pid));
    const gc = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    fs.writeFileSync(${JSON.stringify(gcPidFile)}, String(gc.pid));
    fs.writeFileSync(${JSON.stringify(marker)}, process.env.TMPDIR);
    ${
      mode === "exit"
        ? "gc.unref(); process.exit(0);"
        : 'process.on("SIGTERM", () => {}); gc.on("exit", () => process.exit(0)); setInterval(() => {}, 1000);'
    }
  `;
}

test("a signal reaches the suite's grandchildren too — none outlives the per-run directory (TASK-231-CR2-1)", async (t) => {
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const gcPidFile = path.join(dir, "gc.pid");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, "{}");
  const child = spawnWrapper(
    t,
    [
      "--ratchet",
      ratchetFile,
      "--",
      process.execPath,
      "-e",
      grandchildSuite(gcPidFile, marker, "wait-on-child"),
    ],
    `${gcPidFile}.leader`,
  );
  let stderr = "";
  child.stderr.on("data", (b) => (stderr += b));
  for (let i = 0; i < 100 && !fs.existsSync(marker); i++)
    await new Promise((r) => setTimeout(r, 50));
  assert.ok(fs.existsSync(marker), "the fake suite never started");
  const gc = Number(fs.readFileSync(gcPidFile, "utf8"));
  t.after(() => alive(gc) && process.kill(gc, "SIGKILL"));
  child.kill("SIGTERM");
  const [, signal] = await closeWithin(child);
  assert.equal(signal, "SIGTERM", stderr);
  assert.equal(alive(gc), false, `grandchild ${gc} outlived the wrapper`);
  assert.equal(fs.existsSync(fs.readFileSync(marker, "utf8")), false);
});

test("a background process the suite leaves behind is ended before the directory is removed (TASK-231-CR2-1)", async (t) => {
  const dir = scratch(t);
  const marker = path.join(dir, "tmpdir.txt");
  const gcPidFile = path.join(dir, "gc.pid");
  const ratchetFile = path.join(dir, "ratchet.json");
  fs.writeFileSync(ratchetFile, "{}");
  const r = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--ratchet",
      ratchetFile,
      "--",
      process.execPath,
      "-e",
      grandchildSuite(gcPidFile, marker, "exit"),
    ],
    { encoding: "utf8", timeout: budget.timeoutMs },
  );
  const gc = Number(fs.readFileSync(gcPidFile, "utf8"));
  t.after(() => alive(gc) && process.kill(gc, "SIGKILL"));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(alive(gc), false, `background process ${gc} outlived the run`);
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
  // TASK-231-CR2-2: an eval sandbox's inner mkdtemp suffix folds whatever its case.
  assert.equal(
    mod.prefixOf("eval-repeat-hang-qwerty-Ab12Cd"),
    "eval-repeat-hang",
  );
  assert.equal(mod.prefixOf("eval-sc-Ab12Cd"), "eval-sc");
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

test("removeDir reports a directory it cannot remove instead of throwing (TASK-231-CR2-3)", (t) => {
  const dir = scratch(t);
  const parent = path.join(dir, "ro-parent");
  const victim = path.join(parent, "victim");
  fs.mkdirSync(victim, { recursive: true });
  if (process.getuid?.() === 0)
    return t.skip("root ignores directory permissions");
  fs.chmodSync(parent, 0o555); // the retry's chmod -R reaches victim, never its parent
  let result;
  try {
    assert.doesNotThrow(() => (result = mod.removeDir(victim)));
  } finally {
    fs.chmodSync(parent, 0o755);
  }
  assert.equal(result, false);
});

test("every committed ratchet key is a fixed point of prefixOf, so the ratchet keys what the rule produces", () => {
  const r = mod.readRatchet(RATCHET);
  const moved = Object.keys(r).filter((k) => mod.prefixOf(`${k}-Ab12Cd`) !== k);
  assert.deepEqual(moved, []);
  assert.ok(Object.keys(r).length >= 50, "non-vacuity: the ratchet was read");
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
