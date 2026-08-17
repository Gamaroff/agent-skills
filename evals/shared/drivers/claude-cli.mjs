"use strict";
/**
 * claude-cli driver — shells out to the user's installed `claude` binary.
 * No SDK dependency, no API-key plumbing inside the driver (the binary
 * already owns its auth). Proof that the driver contract works for any
 * subprocess-driven agent — swap `claude` for `gemini`, `goose`, `aider`,
 * etc. and the rest of the harness is unchanged.
 *
 * Q&A interception is best-effort: scripted answers are piped via stdin in
 * order. Richer matching (regex-based answer selection) is out of scope for
 * the CLI driver and lives in the SDK driver.
 *
 * @type {import("./types.mjs").AgentDriver}
 */
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function whichClaude() {
  try {
    const out = execFileSync("which", ["claude"], { encoding: "utf-8" }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function copyTree(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

// Stage the skill into <sandbox>/.claude/skills/<skill>/ so the cli can
// discover it as a project-scoped skill. We drop tests/ to keep the staged
// copy tight — the skill itself does not need its own tests at runtime.
function installSkill(sandbox, skill, skillRoot) {
  if (!skill || !skillRoot || !fs.existsSync(skillRoot)) return;
  const dst = path.join(sandbox, ".claude", "skills", skill);
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (entry.name === "tests") continue;
    const s = path.join(skillRoot, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

const driver = {
  name: "claude-cli",

  async isAvailable() {
    const bin = whichClaude();
    if (!bin) return { ok: false, reason: "`claude` binary not found on PATH" };
    return { ok: true };
  },

  async run(ctx) {
    installSkill(ctx.sandbox, ctx.skill, ctx.skillRoot);
    const stdin = ctx.answers.map((a) => a.answer).join("\n") + "\n";
    // -p prints the prompt and runs non-interactively. --add-dir scopes the
    // agent to the sandbox. We pass the skill root as a hint via env so the
    // user can wire skill discovery in their own ~/.claude config.
    const args = ["-p", ctx.prompt, "--add-dir", ctx.sandbox];
    const res = spawnSync("claude", args, {
      cwd: ctx.sandbox,
      input: stdin,
      env: {
        ...process.env,
        ...ctx.env,
        EVAL_SKILL: ctx.skill,
        EVAL_SKILL_ROOT: ctx.skillRoot,
      },
      encoding: "utf-8",
      timeout: 5 * 60 * 1000,
    });
    if (res.status !== 0) {
      throw new Error(
        `claude-cli exited ${res.status}: ${(res.stderr || "").slice(0, 500)}`,
      );
    }
    // We can't tell which scripted answers were actually consumed without a
    // real interception protocol. Conservatively report none remaining iff
    // the binary exited 0 — assertions still verify artefact shape.
    return { remainingAnswers: [] };
  },
};

export default driver;
