#!/usr/bin/env node
/**
 * test-tmpdir.mjs — run the test suite inside a per-run TMPDIR, report what it leaked, remove it.
 *
 * WHY THIS EXISTS
 * ---------------
 * The suite's helpers create temp directories with `mkdtemp` and many never remove them. One full
 * `npm test` on 2026-10-23 left 607 top-level entries holding 10,188 inodes, and on 2026-10-21
 * `/tmp` ran out of inodes: `ci:fast` then reported 1,576 of 6,129 tests failing, none of them
 * related to the change (obs #83, task 231). This wrapper is CONTAINMENT, not a fix: every
 * leak lands in one directory that is always removed, pass or fail. The ratchet is what reduces the
 * leaks — a new leaking prefix, or a known one over its count, fails the run and names the prefix.
 *
 * THE RULE
 * --------
 *   1. Create one directory under the system tmpdir, read BEFORE TMPDIR is overridden.
 *   2. Run the command with TMPDIR / TMP / TEMP pointing at it.
 *   3. Group its top-level entries by prefix (prefixOf: the name with its random suffix stripped).
 *   4. Compare with the ratchet ({ prefix: maxCount }):
 *        new     a prefix the ratchet does not list                 → fail
 *        over    a ratcheted prefix above its count                 → fail
 *        healed  a ratcheted prefix that leaked nothing this run    → a notice, never a failure
 *   Why `healed` does not fail: leaks depend on the environment. CI installs zsh and every
 *   shell-matrix suite then runs a zsh variant this machine skips, and 14 tests skipped here on
 *   2026-10-26. So a prefix absent from one run is not proof the leak is fixed, and failing on it
 *   would turn every machine without CI's toolset red. Counts are the per-prefix maximum over the
 *   environments measured; delete an entry when its fix lands, as the notice says.
 *   5. Remove the directory — always: on a red suite, a tripped ratchet, a signal.
 *   6. Exit with the suite's own status when it failed; otherwise 1 on a tripped ratchet, else 0.
 *      A suite killed by a signal exits 1 and names the signal.
 *
 * A child that builds its own `env` without TMPDIR writes to the system tmpdir and is invisible
 * here; the ratchet cannot see what never reached the directory.
 *
 * CLI: `test-tmpdir.mjs [--ratchet <file>] -- <command> [args…]`. Exit 2 on a usage error. The
 * report goes to stderr in small writes; the process exits through `process.exitCode`, never
 * `process.exit()`, so nothing written is truncated on a pipe (the select-next trap, traps.md).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RATCHET = path.join(
  HERE,
  "..",
  "tests",
  "tmp-leak-ratchet.json",
);

/** The random suffix `mkdtemp` / `mktemp` appends: a separator, then six or more alphanumerics. */
const SUFFIX_RE = /[-_.][A-Za-z0-9]{6,}$/;
/** A short extension after the suffix (`review-pr-comment.Ab12Cd.md`), stripped first. */
const EXT_RE = /\.[A-Za-z0-9]{1,5}$/;
/**
 * A second, inner temp suffix: a name built from another temp dir's basename
 * (`eval-repeat-hang-o6VXmH-Ab12Cd`, the eval runner naming its dir after a scenario that lives in
 * one). Exactly six characters with a digit or a capital — the shape `mkdtemp` writes — so a real
 * word such as `-remote` in `carry-5c-remote` is never taken for one.
 */
const INNER_RE = /[-_.](?=[A-Za-z0-9]*[A-Z0-9])[A-Za-z0-9]{6}$/;

/**
 * The one prefix rule. The report, the ratchet and the tests all call this; there is no second
 * regex anywhere. Measured on the 2026-10-26 base: two full runs gave identical `{ prefix: count }`
 * maps under this rule, so the ratchet keys on counts.
 */
export function prefixOf(name) {
  const bare = SUFFIX_RE.test(name) ? name : name.replace(EXT_RE, "");
  return bare.replace(SUFFIX_RE, "").replace(INNER_RE, "");
}

/** { prefix: count } over a list of top-level entry names. */
export function groupByPrefix(names) {
  const out = {};
  for (const n of names) {
    const p = prefixOf(n);
    out[p] = (out[p] || 0) + 1;
  }
  return out;
}

/**
 * Compare a run's leftovers with the ratchet. Returns { ok, newPrefixes, over, healed, within },
 * each list sorted by prefix so the report is stable.
 */
export function compareRatchet(leftovers, ratchet) {
  const newPrefixes = [];
  const over = [];
  const within = [];
  for (const [prefix, count] of Object.entries(leftovers)) {
    if (!Object.hasOwn(ratchet, prefix)) newPrefixes.push({ prefix, count });
    else if (count > ratchet[prefix])
      over.push({ prefix, count, max: ratchet[prefix] });
    else within.push({ prefix, count, max: ratchet[prefix] });
  }
  const healed = Object.keys(ratchet)
    .filter((p) => !Object.hasOwn(leftovers, p))
    .map((prefix) => ({ prefix, max: ratchet[prefix] }));
  const byPrefix = (a, b) =>
    a.prefix < b.prefix ? -1 : a.prefix > b.prefix ? 1 : 0;
  newPrefixes.sort(byPrefix);
  over.sort(byPrefix);
  healed.sort(byPrefix);
  within.sort(byPrefix);
  return {
    ok: newPrefixes.length === 0 && over.length === 0,
    newPrefixes,
    over,
    healed,
    within,
  };
}

/** The report lines, one finding per line. */
export function formatReport(verdict, totals) {
  const lines = [
    `tmp-leak: ${totals.entries} top-level entries under ${totals.prefixes} prefixes left by the suite (directory removed)`,
  ];
  for (const { prefix, count } of verdict.newPrefixes)
    lines.push(
      `tmp-leak: new prefix "${prefix}" (${count} entries) — git grep -n '"${prefix}'`,
    );
  for (const { prefix, count, max } of verdict.over)
    lines.push(
      `tmp-leak: prefix "${prefix}" over its ratchet (${count} > ${max}) — git grep -n '"${prefix}'`,
    );
  for (const { prefix } of verdict.healed)
    lines.push(
      `tmp-leak: notice — prefix "${prefix}" leaked nothing here; if its leak is fixed, delete it from tests/tmp-leak-ratchet.json so the ratchet tightens`,
    );
  if (verdict.ok) lines.push("tmp-leak: ratchet ok");
  return lines;
}

export function readRatchet(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(`${file}: expected an object of { prefix: maxCount }`);
  for (const [k, v] of Object.entries(parsed))
    if (!Number.isInteger(v) || v < 1)
      throw new Error(`${file}: "${k}" must map to a positive integer`);
  return parsed;
}

/**
 * Remove the per-run directory. A test that chmods a fixture read-only leaves a tree `rmSync`
 * cannot unlink, so a failed remove restores write permission and tries once more.
 */
export function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    spawnSync("chmod", ["-R", "u+rwX", dir]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return !fs.existsSync(dir);
}

function parseArgs(argv) {
  const sep = argv.indexOf("--");
  if (sep < 0 || sep === argv.length - 1)
    return {
      error: "usage: test-tmpdir.mjs [--ratchet <file>] -- <command> [args…]",
    };
  const opts = argv.slice(0, sep);
  let ratchet = DEFAULT_RATCHET;
  for (let i = 0; i < opts.length; i++) {
    if (opts[i] === "--ratchet" && opts[i + 1])
      ratchet = path.resolve(opts[++i]);
    else return { error: `unknown option: ${opts[i]}` };
  }
  return { ratchet, command: argv[sep + 1], args: argv.slice(sep + 2) };
}

const say = (line) => process.stderr.write(line + "\n");

export async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    say(parsed.error);
    return 2;
  }
  let ratchet;
  try {
    ratchet = readRatchet(parsed.ratchet);
  } catch (e) {
    say(`test-tmpdir: cannot read the ratchet — ${e.message}`);
    return 2;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-test-"));
  const env = { ...process.env, TMPDIR: dir, TMP: dir, TEMP: dir };
  const child = spawn(parsed.command, parsed.args, { stdio: "inherit", env });

  // Forward a signal to the suite and let its exit run the cleanup below; the signal is
  // re-raised once the directory is gone, so the caller still sees how the run ended.
  let received = null;
  const forward = (sig) => {
    received = sig;
    child.kill(sig);
  };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);

  const { code, signal, spawnError } = await new Promise((resolveExit) => {
    child.on("error", (err) =>
      resolveExit({ code: null, signal: null, spawnError: err }),
    );
    child.on("close", (c, s) => resolveExit({ code: c, signal: s }));
  });

  let names = [];
  try {
    names = fs.readdirSync(dir);
  } finally {
    if (!removeDir(dir)) say(`test-tmpdir: could not remove ${dir}`);
  }
  process.off("SIGINT", forward);
  process.off("SIGTERM", forward);

  if (received) {
    say(`test-tmpdir: interrupted by ${received} — per-run directory removed`);
    process.kill(process.pid, received);
    return 1;
  }
  if (spawnError) {
    say(
      `test-tmpdir: could not start "${parsed.command}" — ${spawnError.message}`,
    );
    return 1;
  }

  const leftovers = groupByPrefix(names);
  const verdict = compareRatchet(leftovers, ratchet);
  for (const line of formatReport(verdict, {
    entries: names.length,
    prefixes: Object.keys(leftovers).length,
  }))
    say(line);

  if (signal) {
    say(`test-tmpdir: the suite was killed by ${signal}`);
    return 1;
  }
  if (code !== 0) return code;
  return verdict.ok ? 0 : 1;
}

// Compare real paths: the script can be reached through a symlinked layout, where argv[1] arrives
// symlinked and import.meta.url is already real (obs #126 — the form release-ci-verdict.mjs uses).
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  main(process.argv.slice(2)).then((rc) => {
    process.exitCode = rc;
  });
}
