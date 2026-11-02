#!/usr/bin/env node
// guard-skills-symlink.mjs — Claude Code PreToolUse hook (Bash). Refuses a command that moves or
// removes the skill links `.agents/skills` / `.claude/skills`, or the `.agents` / `.claude`
// directories that hold them.
//
// Why: Claude Code loads every project skill through `.claude/skills -> ../.agents/skills`. Moving
// either link aside — the old way of running the suite without the gitignored symlink — unloads
// every project skill from the running session, and they come back only minutes after the link is
// restored. On 2026-11-01 four move-asides during task.248 each emptied the skills list, and
// `Skill(qa-task)` answered "Unknown skill" three minutes after a restore, stopping /develop-task
// mid-loop. The check the move was for is `npm run test:clean-checkout`, which needs no move.
//
// Restoring a link (`mv .agents/skills.aside .agents/skills`) is allowed: only a SOURCE of `mv`
// and an operand of `rm` / `unlink` / `rmdir` count. Simple commands are split on `;`, `&&`, `||`,
// `|` and newlines, and a `cd` earlier in the same command line moves the base relative paths
// resolve against.
//
// Exit: 0 allow; 2 refuse (stderr is shown to the agent). Input it cannot read is allowed: a hook
// that blocked every Bash call on a parse error would be worse than the defect it guards.
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROTECTED = [".agents/skills", ".claude/skills", ".agents", ".claude"];
const WRAPPERS = new Set([
  "command",
  "builtin",
  "sudo",
  "exec",
  "nohup",
  "time",
]);
const REMOVERS = new Set(["rm", "unlink", "rmdir"]);

/** Split a command line into simple commands, each a list of words with quotes removed. */
export function simpleCommands(line) {
  const out = [];
  let words = [];
  let word = null;
  let quote = null;
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endCommand = () => {
    endWord();
    if (words.length) out.push(words);
    words = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < line.length)
        word += line[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      word = word ?? "";
    } else if (c === "\\" && i + 1 < line.length) {
      word = (word ?? "") + line[++i];
    } else if (c === ";" || c === "\n" || c === "|" || c === "&") {
      endCommand();
    } else if (c === " " || c === "\t") {
      endWord();
    } else {
      word = (word ?? "") + c;
    }
  }
  endCommand();
  return out;
}

/** The operands a simple command would move away or remove, or [] when it is neither. */
export function displacedOperands(words) {
  let w = words.slice();
  while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w.shift();
  while (w.length && WRAPPERS.has(w[0])) w.shift();
  if (!w.length) return [];
  const verb = path.basename(w[0]);
  if (verb !== "mv" && !REMOVERS.has(verb)) return [];
  const operands = [];
  let targetDir = false;
  let optionsDone = false;
  for (let i = 1; i < w.length; i++) {
    const a = w[i];
    if (!optionsDone && a === "--") optionsDone = true;
    else if (!optionsDone && (a === "-t" || a === "--target-directory")) {
      targetDir = true;
      i++;
    } else if (!optionsDone && a.startsWith("--target-directory="))
      targetDir = true;
    else if (!optionsDone && a.startsWith("-") && a !== "-") {
      if (/^-[^-]*t/.test(a)) targetDir = true;
    } else operands.push(a);
  }
  // mv's last operand is the destination, unless -t named it.
  return verb === "mv" && !targetDir ? operands.slice(0, -1) : operands;
}

/** The protected path a command line would displace, or null. */
export function violation(line, cwd, root) {
  let base = cwd;
  for (const words of simpleCommands(line)) {
    if (words[0] === "cd" && words.length >= 2 && !words[1].startsWith("-")) {
      base = path.resolve(
        base,
        words[1].replace(/^~(?=\/|$)/, process.env.HOME ?? "~"),
      );
      continue;
    }
    for (const op of displacedOperands(words)) {
      const abs = path.resolve(
        base,
        op.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"),
      );
      for (const p of PROTECTED) if (abs === path.join(root, p)) return p;
    }
  }
  return null;
}

async function main() {
  let input;
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    process.exit(0);
  }
  const command = input?.tool_input?.command;
  if (input?.tool_name !== "Bash" || typeof command !== "string")
    process.exit(0);
  const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
  const root = process.env.CLAUDE_PROJECT_DIR || cwd;
  const hit = violation(command, cwd, root);
  if (!hit) process.exit(0);
  process.stderr.write(
    `Blocked: this command moves or removes \`${hit}\`. Claude Code loads every project skill ` +
      `through .claude/skills -> ../.agents/skills, so this unloads them all from the running ` +
      `session for minutes. To test without the gitignored symlink, commit and run ` +
      `\`CLEAN_CHECKOUT_CMD="npm run ci" npm run test:clean-checkout\` (or plain ` +
      `\`npm run test:clean-checkout\` for npm test). See docs/contributing/traps.md.\n`,
  );
  process.exit(2);
}

// Real paths on both sides: through a symlinked path the plain comparison fails and the hook
// would allow everything (obs #126).
const isMain = () => {
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
};
if (isMain()) await main();
