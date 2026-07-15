/**
 * Behavioral checks for the develop-pipeline hook installer.
 *
 * Unlike the static `#2e` grep assertions in stall-and-cleanup-protocol.test.mjs
 * (which prove the installer *source* mentions ${CLAUDE_PROJECT_DIR}), these run
 * the REAL install-hooks.sh against a throwaway settings.json and assert on the
 * produced JSON and its runtime behaviour. They pin the two things that actually
 * broke consumers (regression reported 2026-07-09):
 *
 *   1. Migration — a bare-relative legacy command
 *        `bash .agents/skills/develop-story/scripts/on-stop.sh`
 *      resolved against the shell's cwd at hook-fire time, so it failed with
 *      "No such file or directory" once the session had `cd`'d into a subdir.
 *      Re-running the installer must REPLACE that entry, not stack a second
 *      still-broken one alongside the fix.
 *   2. cwd-independence — the emitted ${CLAUDE_PROJECT_DIR}-prefixed command must
 *      resolve from any working directory (that is the whole point of the fix),
 *      while the old bare-relative form must NOT (negative control).
 *
 * Hermetic: bash + jq only, no network, no model calls. Scoped to the canonical
 * installer (shared/resources/develop-pipeline-install-hooks.sh); setup-consumer.sh
 * reimplements the same logic inline and is covered by the static #2e guard.
 *
 * Run via: node --test evals/develop-story/protocol/install-hooks-behavior.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SHARED_INSTALL = path.join(REPO_ROOT, "shared", "resources", "develop-pipeline-install-hooks.sh");

// The installer detects its base from candidate paths relative to cwd; the first
// candidate (`.agents/skills/develop-story/scripts`) is what a sandbox provides,
// so both the legacy and fixed commands reference that exact base.
const BASE = ".agents/skills/develop-story/scripts";
const LEGACY_STOP       = `bash ${BASE}/on-stop.sh`;
const LEGACY_PRECOMPACT = `bash ${BASE}/on-precompact.sh`;
const HOOK_MARKER = "STUB_HOOK_RAN";

// jq is a hard prerequisite of the installer. If it's absent, skip loudly rather
// than fail — but never silently pass.
let HAS_JQ = true;
try { execSync("command -v jq", { stdio: "ignore" }); } catch { HAS_JQ = false; }

/** Create a throwaway project dir with runnable hook stubs; auto-clean via t.after. */
function makeSandbox(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "agent-skills-hooks-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, BASE);
  mkdirSync(scripts, { recursive: true });
  for (const name of ["on-stop.sh", "on-precompact.sh"]) {
    const p = path.join(scripts, name);
    // Consume stdin (the hooks read a JSON event) and print an identifiable marker.
    writeFileSync(p, `#!/usr/bin/env bash\ncat >/dev/null\necho "${HOOK_MARKER}"\nexit 0\n`);
    chmodSync(p, 0o755);
  }
  return dir;
}

function runInstaller(sandbox, settingsPath) {
  return execFileSync("bash", [SHARED_INSTALL, "--settings", settingsPath], {
    cwd: sandbox, encoding: "utf-8",
  });
}

/** Every registered command string for `event`, flattened across matcher groups. */
function commandsFor(settings, event) {
  return (settings.hooks?.[event] ?? []).flatMap((g) => (g.hooks ?? []).map((h) => h.command));
}

test("#2e-behavior — migration replaces a legacy bare-relative entry (no duplicate)", { skip: !HAS_JQ && "jq not installed" }, (t) => {
  const sandbox = makeSandbox(t);
  const settingsPath = path.join(sandbox, "settings.json");

  // Seed settings.json as a pre-fix install would have left it.
  writeFileSync(settingsPath, JSON.stringify({
    hooks: {
      PreCompact: [{ matcher: "*", hooks: [{ type: "command", command: LEGACY_PRECOMPACT }] }],
      Stop:       [{ matcher: "*", hooks: [{ type: "command", command: LEGACY_STOP }] }],
    },
  }, null, 2));

  runInstaller(sandbox, settingsPath);
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

  for (const event of ["PreCompact", "Stop"]) {
    const cmds = commandsFor(settings, event);
    assert.equal(cmds.length, 1, `${event}: exactly one entry after migration (got ${cmds.length}: ${JSON.stringify(cmds)})`);
    assert.match(cmds[0], /\$\{CLAUDE_PROJECT_DIR\}/, `${event}: migrated entry must be cwd-independent`);
    assert.ok(!cmds.includes(LEGACY_STOP) && !cmds.includes(LEGACY_PRECOMPACT), `${event}: legacy bare-relative entry must be gone`);
  }
});

test("#2e-behavior — fresh install emits exactly one ${CLAUDE_PROJECT_DIR} entry per event, idempotent on re-run", { skip: !HAS_JQ && "jq not installed" }, (t) => {
  const sandbox = makeSandbox(t);
  const settingsPath = path.join(sandbox, "settings.json");
  writeFileSync(settingsPath, "{}");

  runInstaller(sandbox, settingsPath);
  const first = readFileSync(settingsPath, "utf-8");
  const settings = JSON.parse(first);
  for (const event of ["PreCompact", "Stop"]) {
    const cmds = commandsFor(settings, event);
    assert.equal(cmds.length, 1, `${event}: exactly one entry on fresh install`);
    assert.match(cmds[0], /^bash "\$\{CLAUDE_PROJECT_DIR\}\/.*on-(stop|precompact)\.sh"$/, `${event}: expected cwd-independent command form`);
  }

  runInstaller(sandbox, settingsPath); // re-run
  assert.equal(readFileSync(settingsPath, "utf-8"), first, "re-running the installer must be a byte-identical no-op");
});

test("#2e-behavior — emitted command resolves from a subdirectory; legacy bare-relative form does not", { skip: !HAS_JQ && "jq not installed" }, (t) => {
  const sandbox = makeSandbox(t);
  const settingsPath = path.join(sandbox, "settings.json");
  writeFileSync(settingsPath, "{}");
  runInstaller(sandbox, settingsPath);

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  const stopCmd = commandsFor(settings, "Stop")[0];

  const subdir = path.join(sandbox, "apps", "api");
  mkdirSync(subdir, { recursive: true });
  // Mirror how Claude Code runs a hook: ${CLAUDE_PROJECT_DIR} in the env, the
  // command executed through a shell, the JSON event on stdin — but from a cwd
  // that is NOT the project root.
  const env = { ...process.env, CLAUDE_PROJECT_DIR: sandbox };

  const out = execSync(stopCmd, { cwd: subdir, env, input: "{}", encoding: "utf-8" });
  assert.match(out, new RegExp(HOOK_MARKER), "the ${CLAUDE_PROJECT_DIR} command must resolve and run from a subdirectory");

  // Negative control: the pre-fix bare-relative form breaks from the same subdir.
  assert.throws(
    () => execSync(LEGACY_STOP, { cwd: subdir, env, input: "{}", stdio: "pipe" }),
    /No such file or directory|cannot|not found/i,
    "the legacy bare-relative command must fail from a subdirectory (the original bug)",
  );
});
