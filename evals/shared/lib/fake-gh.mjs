"use strict";
/**
 * Fake `gh` for hermetic eval sandboxes.
 *
 * Public API:
 *   installFakeGh(sandbox, fixtures) -> { PATH }
 *     Writes <sandbox>/.eval/bin/gh (a launcher), <sandbox>/.eval/gh-fixtures.json,
 *     an EMPTY <sandbox>/.eval/gh-calls.jsonl and an empty <sandbox>/.eval/gh-config/.
 *     Returns the directory to prefix onto PATH. The empty call log is what makes a
 *     "no refused call" assertion well-defined in a run that makes no `gh` call at all —
 *     fileDoesNotMatch fails on a missing file, and replay never runs `gh`.
 *   runFakeGh(argv, evalDir) -> { status, stdout, stderr, entry }   (pure apart from the log)
 *
 * When run as a program (the launcher's target) it serves read commands from the
 * fixtures, appends one JSON line per call to gh-calls.jsonl, and:
 *   - answers `gh --version` / `gh version` as the WHOLE command only (a harmless probe agents run
 *     first) — anything after it is not a version probe;
 *   - REFUSES every write: the pr/issue subcommands in WRITES, and every `api` call that is not
 *     a plain read. `api` is decided by ALLOW-list, not by listing write shapes: it is served only
 *     when every flag it carries is in API_READ_FLAGS and every method given is GET. Any other
 *     flag, spelling or method is refused, so a form the parser does not model fails closed.
 *     Exit 1, logged with "refused": true and "refusal": "write". "Never posts without asking" is
 *     then an assertion.
 *   - REFUSES every command that is not a served read in an unambiguous shape: a kind outside
 *     READS, a flag before the group other than -R/--repo, or (outside `api`) a flag between the
 *     group and its subcommand — cobra would resolve those differently. Fail closed, logged with
 *     "refusal": "not-a-served-read".
 *   - reports a served read kind that the fixtures have no table for as "unhandled": true,
 *     exit 1 — a gap in the fixtures shows as a failure, never as a guess.
 *   - answers a known kind with a missing key the way gh does (exit 1, GraphQL "Could not
 *     resolve" on stderr), logged with "notFound": true. That is a real outcome the skill
 *     branches on (a bare number that is an issue), not a fixture gap.
 *
 * Fixture shape (gh-fixtures.json):
 *   { "pr view":   { "<number|branch>": {…}, "*": {…} },   "*" = no positional argument
 *     "pr diff":   { "<number>": "<diff text>" | "@file:<path relative to the fixtures file>" },
 *     "pr list":   [ {…}, … ],             filtered by --head when given
 *     "issue view":{ "<number>": {…} },
 *     "repo view": {…},
 *     "api":       { "<path>": {…} } }    GET only
 * `--json a,b` selects fields, and a requested field the fixture lacks is "unhandled" (named on
 * stderr); `-q/--jq` is piped through the real `jq` when present and is "unhandled" when it is
 * not — jq is not re-implemented here. Fixture lookup reads own keys only.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { driverNameFrom } from "./driver-name.mjs";

const SELF = fileURLToPath(import.meta.url);

const WRITES = {
  pr: new Set([
    "comment",
    "review",
    "edit",
    "merge",
    "close",
    "create",
    "ready",
    "reopen",
    "new",
    "lock",
    "unlock",
    "update-branch",
  ]),
  issue: new Set([
    "comment",
    "edit",
    "close",
    "create",
    "reopen",
    "delete",
    "transfer",
    "new",
    "lock",
    "unlock",
    "pin",
    "unpin",
    "develop",
  ]),
};
// The only flags a served `api` read may carry (gh api --help). Everything else — a field or
// input flag, an unknown flag, a cluster character the parser has no name for — is refused.
const API_READ_FLAGS = new Set([
  "-X",
  "--method",
  "-H",
  "--header",
  "-i",
  "--include",
  "--paginate",
  "--slurp",
  "-q",
  "--jq",
  "-t",
  "--template",
  "-p",
  "--preview",
  "--hostname",
  "--cache",
  "--silent",
  "--verbose",
  // Not -R/--repo: real `gh api` rejects them (it addresses the repo through {owner}/{repo} in the
  // path), so an `api` call carrying one is not a form gh would run (task.186).
]);
const READS = new Set([
  "pr view",
  "pr diff",
  "pr list",
  "issue view",
  "repo view",
  "api",
  "auth status",
]);

function nodeBin() {
  // Resolved at install time, so an nvm shell function named `node` cannot intercept the launcher.
  return process.execPath;
}

/** Whether `jq` runs — the one check the install and the unit tests share (QA cycle 2, C2-CR-6). */
export function jqAvailable() {
  return spawnSync("jq", ["--version"], { encoding: "utf-8" }).status === 0;
}

export function installFakeGh(sandbox, fixtures = {}) {
  // jq answers -q/--jq. Without it a LIVE run, whose agent calls gh, cannot be judged, so the
  // install refuses as a skip (the runner reads `evalSkip`) rather than letting every run fail
  // (task.186 A5). A replay run never calls gh, so it installs without jq and is judged: refusing
  // it too made eval:all skip judged scenarios on a host without jq (QA cycle 2, C2-CR-1). The
  // driver is read from the environment the runner resolved it from, env.json included.
  if (driverNameFrom(process.env) !== "replay" && !jqAvailable())
    throw Object.assign(
      new Error("jq not available on PATH — the fake gh needs it for -q/--jq"),
      { evalSkip: true },
    );
  const evalDir = path.join(sandbox, ".eval");
  const bin = path.join(evalDir, "bin");
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(path.join(evalDir, "gh-config"), { recursive: true });
  fs.writeFileSync(
    path.join(evalDir, "gh-fixtures.json"),
    JSON.stringify(fixtures, null, 2),
  );
  fs.writeFileSync(path.join(evalDir, "gh-calls.jsonl"), "");
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh\nEVAL_GH_DIR=${q(evalDir)} exec ${q(nodeBin())} ${q(SELF)} "$@"\n`,
    { mode: 0o755 },
  );
  return { PATH: bin };
}

// Split argv into positionals and options. Flags that take a value are listed; every other
// `--x` is boolean. `--x=v` is accepted for any flag.
const VALUE_FLAGS = new Set([
  "--json",
  "-q",
  "--jq",
  "--head",
  "--base",
  "--state",
  "--limit",
  "-L",
  "--search",
  "-S",
  "--repo",
  "-R",
  "-X",
  "--method",
  "-f",
  "-F",
  "--field",
  "--raw-field",
  "--input",
  "--body",
  "-b",
  "--body-file",
  "--title",
  "-t",
  "--template",
  "-H",
  "--header",
  "-p",
  "--preview",
  "--hostname",
  "--cache",
]);

function parseArgs(args) {
  const pos = [];
  const posAt = []; // the argv index of each positional — where cobra would see the group and subcommand
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    // A single-dash token is a CLUSTER of short flags, read the way gh's flag parser (pflag) reads
    // it: each character is a flag, and the first one that takes a value takes the rest of the
    // token (minus a leading `=`), or the next argument when nothing is left. So `-XPOST` is
    // `-X POST`, `-fbody=x` is `-f body=x`, and `-iXPOST` is `-i -X POST`. Read as one flag
    // named `-iXPOST`, a write on a path a fixture serves was answered as a read (task.185).
    if (a.length > 2 && a[0] === "-" && a[1] !== "-") {
      for (let k = 1; k < a.length; k++) {
        const name = `-${a[k]}`;
        if (VALUE_FLAGS.has(name)) {
          const rest = a.slice(k + 1);
          const val = rest === "" ? args[++i] : rest.replace(/^=/, "");
          (opts[name] ||= []).push(val);
          break;
        }
        if (a[k + 1] === "=") {
          // `-i=true`: a boolean shorthand given an explicit value ends the cluster.
          (opts[name] ||= []).push(a.slice(k + 2));
          break;
        }
        (opts[name] ||= []).push(true);
      }
    } else if (a.startsWith("-") && a !== "-") {
      const eq = a.indexOf("=");
      const name = eq > 0 ? a.slice(0, eq) : a;
      let val = true;
      if (eq > 0) val = a.slice(eq + 1);
      else if (VALUE_FLAGS.has(name)) val = args[++i];
      (opts[name] ||= []).push(val);
    } else {
      pos.push(a);
      posAt.push(i);
    }
  }
  const get = (...names) => {
    for (const n of names) if (opts[n]) return opts[n][opts[n].length - 1];
    return undefined;
  };
  return { pos, posAt, opts, get };
}

// `--json a,b` selects fields. A requested field the fixture lacks is a fixture GAP, returned in
// `missing` so the caller reports it as unhandled: answering without it made a skill that branches
// on the field see `undefined` and take a path real gh would not (task.186).
function pick(value, fields) {
  if (!fields) return { value, missing: [] };
  const keys = String(fields)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const missing = new Set();
  const one = (o) => {
    if (!o || typeof o !== "object") return o;
    for (const k of keys) if (!Object.hasOwn(o, k)) missing.add(k);
    return Object.fromEntries(
      keys.filter((k) => Object.hasOwn(o, k)).map((k) => [k, o[k]]),
    );
  };
  const picked = Array.isArray(value) ? value.map(one) : one(value);
  return { value: picked, missing: [...missing] };
}

function format(value, jqExpr) {
  const json = JSON.stringify(value);
  if (jqExpr === undefined) return { ok: true, out: json + "\n" };
  const r = spawnSync("jq", ["-r", jqExpr], { input: json, encoding: "utf-8" });
  if (r.error) return { ok: false, unhandled: "jq not available for -q/--jq" };
  if (r.status !== 0) return { ok: false, err: r.stderr || "jq failed\n" };
  return { ok: true, out: r.stdout };
}

function notFound(kind, key) {
  const what =
    kind === "issue view" ? "an issue or pull request" : "a PullRequest";
  return `GraphQL: Could not resolve to ${what} with the number of ${key}. (repository.${kind === "issue view" ? "issue" : "pullRequest"})\n`;
}

// Only `-R`/`--repo` (and its value) may precede the group; outside `api` the subcommand must be
// the very next token after the group.
function servedShape(argv, group, pos, posAt) {
  if (pos.length === 0) return false;
  let t = 0;
  while (t < posAt[0]) {
    const tok = argv[t];
    if (tok === "-R" || tok === "--repo") t += 2;
    else if (
      tok.startsWith("--repo=") ||
      (tok.startsWith("-R") && tok.length > 2)
    )
      t += 1;
    else return false;
  }
  if (t !== posAt[0]) return false;
  return group === "api" || pos.length < 2 || posAt[1] === posAt[0] + 1;
}

export function runFakeGh(argv, evalDir) {
  const fixturesPath = path.join(evalDir, "gh-fixtures.json");
  const fixtures = fs.existsSync(fixturesPath)
    ? JSON.parse(fs.readFileSync(fixturesPath, "utf-8"))
    : {};
  const { pos, posAt, get, opts } = parseArgs(argv);
  const [group, sub] = pos;
  const kind = group === "api" ? "api" : `${group || ""} ${sub || ""}`.trim();
  const entry = { argv };
  const done = (status, stdout = "", stderr = "") => {
    fs.appendFileSync(
      path.join(evalDir, "gh-calls.jsonl"),
      JSON.stringify(entry) + "\n",
    );
    return { status, stdout, stderr, entry };
  };

  // Writes first: a write is refused whatever the fixtures say. `api` is a read only when it
  // passes the allow-list; three cycles of listing write spellings each missed one (task.185).
  const apiIsRead =
    Object.keys(opts).every((f) => API_READ_FLAGS.has(f)) &&
    [...(opts["-X"] || []), ...(opts["--method"] || [])].every(
      (m) => String(m).toUpperCase() === "GET",
    );
  if (
    (WRITES[group] && WRITES[group].has(sub)) ||
    (group === "api" && !apiIsRead)
  ) {
    entry.refused = true;
    entry.refusal = "write";
    return done(1, "", `fake-gh: refused write: gh ${argv.join(" ")}\n`);
  }
  // Only the whole command: `gh version issue close 5` was answered as a version probe, exit 0 —
  // a write that passed (task.186).
  if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "version"))
    return done(0, "gh version 2.0.0-fake (fake-gh)\n");
  // Every other command is served only as a read in a shape cobra cannot read another way: a
  // served read kind, nothing but `-R`/`--repo` before the group, and — outside `api` — the
  // subcommand directly after the group. Cobra strips flags before it picks the subcommand, and
  // an unknown flag takes the next token, so `gh pr --edit-last view comment` is `pr comment`:
  // read by position it was a `pr view` that came back notFound (task.185 DoD run 2). Anything
  // else is refused — fail closed, as `api` is — so a write the lists miss cannot pass as a read.
  if (!READS.has(kind) || !servedShape(argv, group, pos, posAt)) {
    entry.refused = true;
    entry.refusal = "not-a-served-read";
    return done(
      1,
      "",
      `fake-gh: refused — not a served read: gh ${argv.join(" ")}\n`,
    );
  }
  if (kind === "auth status")
    return done(
      0,
      "",
      "github.com\n  ✓ Logged in to github.com as eval (fake-gh)\n",
    );

  // Own keys only, here and below: `pr diff constructor` read Object.prototype.constructor (task.186).
  const table = Object.hasOwn(fixtures, kind) ? fixtures[kind] : undefined;
  if (table === undefined) {
    entry.unhandled = true;
    return done(
      1,
      "",
      `fake-gh: no "${kind}" fixture for: gh ${argv.join(" ")}\n`,
    );
  }

  let value;
  if (kind === "pr list") {
    value = Array.isArray(table) ? table : [];
    const head = get("--head");
    if (head !== undefined) value = value.filter((p) => p.headRefName === head);
  } else if (kind === "repo view") {
    value = table;
  } else {
    const key =
      kind === "api"
        ? String(pos[1] || "").replace(/^\//, "")
        : pos[2] === undefined || pos[2] === ""
          ? "*"
          : pos[2];
    const own = (k) => (Object.hasOwn(table, k) ? table[k] : undefined);
    value = own(key);
    if (typeof value === "string" && value.startsWith("@same:"))
      value = own(value.slice(6));
    if (value === undefined) {
      entry.notFound = true;
      return done(1, "", notFound(kind, key));
    }
  }

  if (kind === "pr diff") {
    let text = String(value);
    if (text.startsWith("@file:"))
      text = fs.readFileSync(path.resolve(evalDir, text.slice(6)), "utf-8");
    return done(0, text);
  }

  const picked = pick(value, get("--json"));
  if (picked.missing.length) {
    entry.unhandled = true;
    return done(
      1,
      "",
      `fake-gh: the "${kind}" fixture lacks requested --json field(s) ${picked.missing.join(", ")}: gh ${argv.join(" ")}\n`,
    );
  }
  const f = format(picked.value, get("-q", "--jq"));
  if (f.unhandled) {
    entry.unhandled = true;
    return done(1, "", `fake-gh: ${f.unhandled}\n`);
  }
  if (!f.ok) return done(1, "", f.err);
  return done(0, f.out);
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const evalDir = process.env.EVAL_GH_DIR;
  if (!evalDir) {
    process.stderr.write(
      "fake-gh: EVAL_GH_DIR is not set — run through the installed launcher\n",
    );
    process.exit(2);
  }
  const r = runFakeGh(process.argv.slice(2), evalDir);
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.status;
}
