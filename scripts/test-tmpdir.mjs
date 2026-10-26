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
 * The eval runner's sandboxes, by producer: `evals/shared/runner.mjs` names each
 * `eval-<scenario dir basename>-XXXXXX`, and a scenario dir made by `mkdtemp` carries its own
 * six-character suffix of ANY case. Keyed on the case-free shape, a suffix that happened to be all
 * lowercase (`qwerty`, about 0.55% of draws) split the prefix and tripped the ratchet
 * (TASK-231-CR2-2). For `eval-` names the inner segment is stripped whatever its case, which is
 * deterministic for a fixed scenario name too.
 */
const EVAL_INNER_RE = /^(eval-.+)[-_.][A-Za-z0-9]{6}$/;

/**
 * The one prefix rule. The report, the ratchet and the tests all call this; there is no second
 * regex anywhere. Measured on the 2026-10-26 base: two full runs gave identical `{ prefix: count }`
 * maps under this rule, so the ratchet keys on counts.
 */
export function prefixOf(name) {
  const bare = SUFFIX_RE.test(name) ? name : name.replace(EXT_RE, "");
  const outer = bare.replace(SUFFIX_RE, "");
  return outer.startsWith("eval-")
    ? outer.replace(EVAL_INNER_RE, "$1")
    : outer.replace(INNER_RE, "");
}

/**
 * { prefix: count } over a list of top-level entry names. Counted in a Map: on a plain object a
 * `__proto__` prefix set the prototype and vanished, and `constructor` counted from the inherited
 * function (TASK-231-QA-1). Object.fromEntries defines each key as an own property.
 */
export function groupByPrefix(names) {
  const counts = new Map();
  for (const n of names) {
    const p = prefixOf(n);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
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
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Reported by the return value below; a throw here would skip main's report and exit.
    }
  }
  return !fs.existsSync(dir);
}

/**
 * Signal a whole process group. False only when there is no pid or the group is gone (ESRCH): an
 * EPERM means it exists but cannot be signalled. Read as "gone", the reap would report a clean end
 * for processes still running; read as present, it reports the group it could not end
 * (TASK-231-CR3-3).
 */
export function signalGroup(pid, sig) {
  if (!pid) return false;
  try {
    process.kill(-pid, sig);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
}

/**
 * The signals forwarded to the suite's group. `detached` puts the suite in a session of its own,
 * so it no longer receives anything the terminal sends: every terminating signal a terminal or a
 * supervisor can deliver has to be passed on, or it kills the wrapper and orphans the suite with
 * its directory (TASK-231-CR3-1).
 */
export const FORWARDED_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"];

/**
 * After the suite's leader exits, end what is left of its group: SIGTERM, up to `graceMs` for it
 * to go, then SIGKILL. Resolves true when the group is gone.
 */
export async function reapGroup(pid, graceMs = 2000) {
  if (!signalGroup(pid, 0)) return true;
  signalGroup(pid, "SIGTERM");
  for (let waited = 0; waited < graceMs; waited += 50) {
    await new Promise((r) => setTimeout(r, 50));
    if (!signalGroup(pid, 0)) return true;
  }
  signalGroup(pid, "SIGKILL");
  await new Promise((r) => setTimeout(r, 50));
  return !signalGroup(pid, 0);
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
  // The suite runs in its own process group so a signal reaches all of it. `npm test` is
  // npm → sh -c → node --test → workers; signalling only the direct child left the rest running
  // with their TMPDIR deleted under them (TASK-231-CR2-1).
  const child = spawn(parsed.command, parsed.args, {
    stdio: "inherit",
    env,
    detached: true,
  });

  // Forward a signal to the suite's group and let its exit run the cleanup below; the signal is
  // re-raised once the directory is gone, so the caller still sees how the run ended.
  let received = null;
  const forward = (sig) => {
    received = sig;
    signalGroup(child.pid, sig);
  };
  for (const sig of FORWARDED_SIGNALS) process.on(sig, forward);
  // Job control: Ctrl-Z reaches only the wrapper now. Stop the suite's group, then the wrapper
  // itself; on resume, continue the group. The group is in a new session, so a SIGTSTP sent to it
  // would be discarded as orphaned — SIGSTOP is the one that stops it.
  const suspend = () => {
    signalGroup(child.pid, "SIGSTOP");
    process.kill(process.pid, "SIGSTOP");
  };
  const resume = () => signalGroup(child.pid, "SIGCONT");
  process.on("SIGTSTP", suspend);
  process.on("SIGCONT", resume);

  const { code, signal, spawnError } = await new Promise((resolveExit) => {
    child.on("error", (err) =>
      resolveExit({ code: null, signal: null, spawnError: err }),
    );
    child.on("close", (c, s) => resolveExit({ code: c, signal: s }));
  });

  // The direct child has exited; anything left in its group would write into a directory about
  // to be removed. Ask it to stop, then make it stop.
  if (!(await reapGroup(child.pid)))
    say(
      `test-tmpdir: the suite's process group ${child.pid} could not be ended (it survived SIGKILL or refused the signal) — it may still write to ${dir}`,
    );

  let names = [];
  try {
    names = fs.readdirSync(dir);
  } finally {
    if (!removeDir(dir)) say(`test-tmpdir: could not remove ${dir}`);
  }
  for (const sig of FORWARDED_SIGNALS) process.off(sig, forward);
  process.off("SIGTSTP", suspend);
  process.off("SIGCONT", resume);

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
