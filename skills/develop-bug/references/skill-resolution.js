#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/skill-resolution.js. Regenerate via `npm run bundle`.
/**
 * skill-resolution — did the Skill tool load THIS repository's copy of a sub-skill?
 * (task 311, from observations #69 and #232.)
 *
 * The Skill tool resolves a skill by name, and a same-named user-level copy (for example one a
 * sync tool left under `~/.claude/skills/synced/`) can be loaded in place of the repository's. The
 * orchestrators then follow a copy that lacks the publish boundary, the probe plan or a flag, and
 * the run still looks complete. The tool's result carries `Base directory for this skill: <path>`,
 * so the identity check is one comparison, and this is it.
 *
 * One command:
 *
 *   check --name <skill> --base-dir <path> --root <repo> [--json]
 *
 * It resolves `--base-dir` through symlinks and says whether it is one of the repository's homes
 * for that skill: `<root>/skills/<name>`, `<root>/.agents/skills/<name>` or
 * `<root>/.claude/skills/<name>`, each also resolved through symlinks.
 *
 * Reasons and exit codes (peer of finalise-record-preflight.js; read `reason`, never the exit code
 * alone):
 *
 *   repo        the base directory is the repository's copy              exit 0
 *   shadowed    the base directory is some other path for that name      exit 1
 *   unreadable  the base directory does not resolve, so identity is
 *               unknown: fails safe, never reads as `repo`               exit 1
 *   usage       a missing or malformed argument, or a root that is not
 *               a directory                                              exit 2
 *
 * The check has no side effects: it reads the filesystem and writes nothing.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Where a skill of a given name may live inside a repository: the source tree, the consumer
// install, and the harness's own directory.
const HOMES = Object.freeze(["skills", ".agents/skills", ".claude/skills"]);

const REASONS = Object.freeze(["repo", "shadowed", "unreadable", "usage"]);

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function safeReal(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * @param {{name: string, baseDir: string, root: string}} input
 * @returns {{reason: "repo"|"shadowed"|"unreadable"|"usage", message: string, baseDir?: string, error?: string}}
 */
function classify({ name, baseDir, root }) {
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    return {
      reason: "usage",
      message: "--name must be a skill name (letters, digits, '.', '_', '-')",
    };
  }
  if (typeof baseDir !== "string" || baseDir === "") {
    return { reason: "usage", message: "--base-dir is required" };
  }
  if (typeof root !== "string" || root === "") {
    return { reason: "usage", message: "--root is required" };
  }
  const realRoot = safeReal(root);
  if (realRoot === null || !fs.statSync(realRoot).isDirectory()) {
    return { reason: "usage", message: `--root ${root} is not a directory` };
  }
  const real = safeReal(baseDir);
  if (real === null) {
    return {
      reason: "unreadable",
      message: `${baseDir} does not resolve — identity unknown`,
    };
  }
  const homes = HOMES.map((d) => safeReal(path.join(realRoot, d, name)));
  if (homes.includes(real)) {
    return {
      reason: "repo",
      message: `${name} resolves to this repository`,
      baseDir: real,
    };
  }
  return {
    reason: "shadowed",
    message: `${name} resolves to ${real}, not to this repository's copy`,
    baseDir: real,
  };
}

function exitCodeFor(reason) {
  if (reason === "repo") return 0;
  if (reason === "usage") return 2;
  return 1;
}

function parseArgs(argv) {
  const out = { json: false };
  const valued = {
    "--name": "name",
    "--base-dir": "baseDir",
    "--root": "root",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (Object.prototype.hasOwnProperty.call(valued, a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) {
        return { error: `${a} needs a value` };
      }
      out[valued[a]] = v;
      i += 1;
    } else {
      return { error: `unknown argument ${a}` };
    }
  }
  return out;
}

function main(argv) {
  if (argv[0] !== "check") {
    return finish(
      {
        reason: "usage",
        message:
          "usage: check --name <skill> --base-dir <path> --root <repo> [--json]",
      },
      argv.includes("--json"),
    );
  }
  const args = parseArgs(argv.slice(1));
  if (args.error) {
    return finish(
      { reason: "usage", message: args.error },
      argv.includes("--json"),
    );
  }
  return finish(classify(args), args.json);
}

function finish(result, json) {
  const exitCode = exitCodeFor(result.reason);
  if (json) {
    process.stdout.write(`${JSON.stringify({ ...result, exitCode })}\n`);
  } else {
    process.stdout.write(`${result.reason}: ${result.message}\n`);
  }
  return exitCode;
}

module.exports = { classify, exitCodeFor, parseArgs, HOMES, REASONS };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
