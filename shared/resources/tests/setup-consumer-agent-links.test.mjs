// Guards for the wizard's agent-links step and its checkbox list (task 209).
//
// Properties, in descending order of how badly a regression would hurt:
//
// (1) NEVER DESTROY. An existing CLAUDE.md (or a link aimed elsewhere) may be
//     the only copy of a team's instructions. It is reported and left
//     byte-identical, never replaced.
// (2) NEVER COMMITTED. Every link made is gitignored, anchored to the root, so
//     a team's committed sub-folder CLAUDE.md files stay tracked.
// (3) NO DANGLING LINKS. A link whose target does not exist yet is not made.
// (4) NO TERMINAL, NO PROMPT. Without a terminal the list is skipped and
//     nothing is written; --link-agents is the way in.
// (5) THE LIST WORKS. Driven through a real pseudo-terminal: arrows, space,
//     enter, wrap-around, and pre-ticking what is already linked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { spawnBudget } from "../spawn-budget.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const WIZARD = path.join(REPO, "scripts", "setup-consumer.sh");
// The pty drive sleeps about 4s by design (settle time around each key).
const PTY_BUDGET = spawnBudget("AGENT_LINKS");

// A consumer-shaped repo: git, AGENTS.md, an installed .agents/skills.
function consumer({ agentsMd = true, skills = true, seed = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "setup-consumer-links-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  if (agentsMd) writeFileSync(path.join(dir, "AGENTS.md"), "# instructions\n");
  if (skills)
    mkdirSync(path.join(dir, ".agents/skills/demo"), { recursive: true });
  for (const [rel, body] of Object.entries(seed)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

// Warnings and errors go to stderr, so both streams are read.
function run(dir, args) {
  const r = spawnSync("bash", [WIZARD, "--links-only", ...args], {
    cwd: dir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const strip = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
// The link's target, "<real>" for a real file, null when nothing is there.
const linkOf = (dir, rel) => {
  const st = lstatSync(path.join(dir, rel), { throwIfNoEntry: false });
  if (!st) return null;
  return st.isSymbolicLink() ? readlinkSync(path.join(dir, rel)) : "<real>";
};
const gitignore = (dir) => {
  const p = path.join(dir, ".gitignore");
  return existsSync(p) ? readFileSync(p, "utf-8") : "";
};
const ignored = (dir, rel) => {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", rel], {
      cwd: dir,
    });
    return true;
  } catch {
    return false;
  }
};

// The table, read from the script itself rather than restated here.
function agentTable() {
  const out = execFileSync(
    "bash",
    ["-c", `source '${WIZARD}'; printf '%s\\n' "\${AGENT_TABLE[@]}"`],
    { env: { ...process.env, SETUP_CONSUMER_NO_MAIN: "1" }, encoding: "utf-8" },
  );
  return out
    .trim()
    .split("\n")
    .map((l) => {
      const [id, label, links = ""] = l.split("|");
      return {
        id,
        label,
        links: links
          .split(" ")
          .filter(Boolean)
          .map((p) => ({ link: p.split(">")[0], target: p.split(">")[1] })),
      };
    });
}

test("the table lists ten agents with unique ids, each target resolving to AGENTS.md or .agents/skills", () => {
  const table = agentTable();
  assert.equal(table.length, 10);
  assert.equal(new Set(table.map((a) => a.id)).size, 10, "ids must be unique");
  for (const a of table) {
    for (const { link, target } of a.links) {
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(link), target),
      );
      assert.ok(
        resolved === "AGENTS.md" || resolved === ".agents/skills",
        `${a.id}: ${link} -> ${target} resolves to ${resolved}`,
      );
    }
  }
});

test("the getting-started table names every agent the script knows, and no other", () => {
  const doc = readFileSync(
    path.join(REPO, "docs/concepts/getting-started.md"),
    "utf-8",
  );
  const section = doc.split("### 1a.")[1].split("\n### ")[0];
  const ids = [...section.matchAll(/^\| `([a-z]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(
    [...ids].sort(),
    agentTable()
      .map((a) => a.id)
      .sort(),
  );
});

test("--link-agents claude links both paths and ignores them, anchored", () => {
  const dir = consumer({ seed: { "sub/CLAUDE.md": "team rules\n" } });
  try {
    const r = run(dir, ["--link-agents", "claude"]);
    assert.equal(r.code, 0, r.out);
    assert.equal(linkOf(dir, "CLAUDE.md"), "AGENTS.md");
    assert.equal(linkOf(dir, ".claude/skills"), "../.agents/skills");
    assert.ok(
      existsSync(path.join(dir, ".claude/skills/demo")),
      "link must resolve",
    );
    assert.match(gitignore(dir), /^\/CLAUDE\.md$/m);
    assert.match(gitignore(dir), /^\/\.claude\/skills$/m);
    assert.ok(ignored(dir, "CLAUDE.md") && ignored(dir, ".claude/skills"));
    assert.ok(
      !ignored(dir, "sub/CLAUDE.md"),
      "a committed sub-folder CLAUDE.md must stay tracked",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("re-running adds no duplicate ignore lines and reports the links as already there", () => {
  const dir = consumer();
  try {
    run(dir, ["--link-agents", "claude"]);
    const r = run(dir, ["--link-agents", "claude"]);
    assert.match(strip(r.out), /CLAUDE\.md already linked/);
    assert.equal(gitignore(dir).match(/^\/CLAUDE\.md$/gm).length, 1);
    assert.equal(gitignore(dir).match(/^\/\.claude\/skills$/gm).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an existing CLAUDE.md is left byte-identical, and the other link is still made", () => {
  const dir = consumer({ seed: { "CLAUDE.md": "the only copy\n" } });
  try {
    const r = run(dir, ["--link-agents", "claude"]);
    assert.equal(
      readFileSync(path.join(dir, "CLAUDE.md"), "utf-8"),
      "the only copy\n",
    );
    assert.match(
      strip(r.out),
      /CLAUDE\.md is a real file or folder — left alone/,
    );
    assert.equal(linkOf(dir, ".claude/skills"), "../.agents/skills");
    assert.doesNotMatch(
      gitignore(dir),
      /^\/CLAUDE\.md$/m,
      "a kept file is not ignored",
    );
    assert.match(strip(r.out), /Agent links\s+warn/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a link aimed somewhere else is left alone", () => {
  const dir = consumer();
  try {
    symlinkSync("docs/other.md", path.join(dir, "GEMINI.md"));
    const r = run(dir, ["--link-agents", "gemini"]);
    assert.equal(linkOf(dir, "GEMINI.md"), "docs/other.md");
    assert.match(
      strip(r.out),
      /GEMINI\.md already links to docs\/other\.md — left alone/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no link is made to a target that does not exist", () => {
  const dir = consumer({ agentsMd: false, skills: false });
  try {
    const r = run(dir, ["--link-agents", "claude"]);
    assert.equal(linkOf(dir, "CLAUDE.md"), null);
    assert.equal(linkOf(dir, ".claude/skills"), null);
    assert.match(strip(r.out), /AGENTS\.md does not exist yet/);
    assert.match(strip(r.out), /\.agents\/skills does not exist yet/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an agent that reads AGENTS.md itself writes nothing", () => {
  const dir = consumer();
  try {
    const r = run(dir, ["--link-agents", "codex"]);
    assert.match(strip(r.out), /OpenAI Codex: nothing to link/);
    assert.equal(gitignore(dir), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown agent id writes nothing and names the known ids", () => {
  const dir = consumer();
  try {
    const r = run(dir, ["--link-agents", "claude,claud"]);
    assert.notEqual(r.code, 0, "a typo must fail the run, not read as success");
    assert.doesNotMatch(
      strip(r.out),
      /Restart your agents/,
      "a failed run must not say it worked",
    );
    assert.match(strip(r.out), /unknown agent 'claud'\. Known: claude, codex/);
    assert.equal(
      linkOf(dir, "CLAUDE.md"),
      null,
      "a typo must not half-apply the list",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown id stops the FULL wizard before any step writes", () => {
  // TASK-209-BUG-2: found at step 8b, the typo used to stop the wizard after
  // steps 1-8 had already written config, registries and skills.
  const dir = consumer();
  try {
    const before = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      {
        cwd: dir,
        encoding: "utf-8",
      },
    );
    const r = spawnSync("bash", [WIZARD, "--link-agents", "claude,claud"], {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.notEqual(r.status, 0);
    assert.match(strip(r.stderr), /unknown agent 'claud'/);
    assert.doesNotMatch(
      strip(r.stdout),
      /Prerequisites|Setup complete|Setup failed/,
      "no step ran",
    );
    const after = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      {
        cwd: dir,
        encoding: "utf-8",
      },
    );
    assert.equal(after, before, "the project is untouched");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a link that cannot be made is reported as failed, never as linked", () => {
  // TASK-209-BUG-3: inside status=$(...) set -e is off, so a failed ln printed
  // "linked", the run said ok and the missing link was gitignored.
  const dir = consumer({
    seed: { ".claude": "a regular file, not a folder\n" },
  });
  try {
    const r = run(dir, ["--link-agents", "claude"]);
    const out = strip(r.out);
    assert.match(out, /\.claude\/skills could not be created/);
    assert.doesNotMatch(out, /\.claude\/skills → \.\.\/\.agents\/skills/);
    // TASK-209-BUG-4: a link that could not be made fails the step and the
    // run, unlike a link deliberately left alone, which only warns.
    assert.match(out, /Agent links\s+fail/);
    assert.notEqual(r.code, 0, "a failed link fails the run");
    assert.match(out, /Fix the error above/);
    assert.doesNotMatch(out, /Restart your agents/);
    assert.equal(
      readFileSync(path.join(dir, ".claude"), "utf-8"),
      "a regular file, not a folder\n",
      ".claude is left as it was",
    );
    assert.doesNotMatch(
      gitignore(dir),
      /^\/\.claude\/skills$/m,
      "a link not made is not ignored",
    );
    assert.equal(
      linkOf(dir, "CLAUDE.md"),
      "AGENTS.md",
      "the other link is still made",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a run whose summary says Setup failed exits 1; one that warns exits 0", () => {
  // _exit_on_fail runs at the end of every main() path: a step that records a
  // fail and carries on must not leave the run at exit 0.
  const run = (hasFail) =>
    spawnSync(
      "bash",
      [
        "-c",
        `source '${WIZARD}'; WIZARD_HAS_FAIL=${hasFail}; _exit_on_fail; echo reached`,
      ],
      {
        env: { ...process.env, SETUP_CONSUMER_NO_MAIN: "1" },
        encoding: "utf-8",
      },
    );
  const failed = run("true");
  assert.equal(failed.status, 1);
  assert.doesNotMatch(failed.stdout, /reached/);
  const fine = run("false");
  assert.equal(fine.status, 0);
  assert.match(fine.stdout, /reached/);
});

test("--link-agents reads ids across newlines: a typo after one is refused, good ids are linked", () => {
  // Finalise run 1: `IFS=, read -a` stops at the first newline, so
  // "claude<newline>claud" never checked "claud" and the run exited 0.
  const bad = consumer();
  const good = consumer();
  try {
    const r = run(bad, ["--link-agents", "claude\nclaud"]);
    assert.notEqual(r.code, 0, "an id after a newline is checked");
    assert.match(strip(r.out), /unknown agent 'claud'/);
    assert.equal(linkOf(bad, "CLAUDE.md"), null);
    const ok = run(good, ["--link-agents", "claude\r\ngemini"]);
    assert.equal(ok.code, 0, ok.out);
    assert.equal(linkOf(good, "CLAUDE.md"), "AGENTS.md");
    assert.equal(
      linkOf(good, "GEMINI.md"),
      "AGENTS.md",
      "an id after a newline is linked",
    );
  } finally {
    rmSync(bad, { recursive: true, force: true });
    rmSync(good, { recursive: true, force: true });
  }
});

test("an existing unanchored rule is respected, not duplicated", () => {
  const dir = consumer({ seed: { ".gitignore": "CLAUDE.md\n" } });
  try {
    run(dir, ["--link-agents", "claude"]);
    assert.doesNotMatch(gitignore(dir), /^\/CLAUDE\.md$/m);
    assert.match(gitignore(dir), /^\/\.claude\/skills$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--dry-run writes nothing", () => {
  const dir = consumer();
  try {
    const r = run(dir, ["--dry-run", "--link-agents", "claude"]);
    assert.match(strip(r.out), /would link: CLAUDE\.md → AGENTS\.md/);
    assert.equal(linkOf(dir, "CLAUDE.md"), null);
    assert.equal(gitignore(dir), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with no terminal and no --link-agents, the list is skipped and nothing is written", async () => {
  const dir = consumer();
  try {
    // detached: setsid(), so the child has no controlling terminal and
    // /dev/tty cannot be opened, exactly as in CI or under a pipe.
    const child = spawn("bash", [WIZARD, "--links-only"], {
      cwd: dir,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const code = await new Promise((res) => child.on("close", res));
    assert.equal(code, 0, out);
    assert.match(strip(out), /No terminal to show the list on — skipped/);
    // The no-terminal guard is what keeps the list from touching /dev/tty at
    // all: without it the run still skips, but prints a stream of
    // "/dev/tty: No such device" errors on the way.
    assert.doesNotMatch(
      out,
      /\/dev\/tty/,
      "no /dev/tty errors without a terminal",
    );
    assert.equal(linkOf(dir, "CLAUDE.md"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Drive the real list through a pseudo-terminal. Python's pty module is the
// portable way to get one (Linux and macOS); keys are sent one at a time.
// The last autowrap switch (CSI ?7 h|l) in the output: "on", "off" or "never".
// The list turns autowrap off while it draws and must leave it on.
function finalAutowrap(bytes) {
  const all = [...bytes.matchAll(/\x1b\[\?7([hl])/g)];
  if (!all.length) return "never";
  return all.at(-1)[1] === "h" ? "on" : "off";
}

function drive(dir, keys, cols = 200) {
  const py = `
import os, pty, sys, time, select, fcntl, termios, struct
keys = [k.encode('latin1').decode('unicode_escape').encode('latin1') for k in sys.argv[2].split('|')]
pid, fd = pty.fork()
if pid == 0:
    os.execvp('bash', ['bash', sys.argv[1], '--links-only'])
# A window size, for realism only: a pty never wraps, so the width that
# decides the narrow-terminal test is the one passed to screen().
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 40, int(sys.argv[3]), 0, 0))
out = b''
def drain(t):
    global out
    end = time.time() + t
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.05)
        if r:
            try: out += os.read(fd, 65536)
            except OSError: return
drain(1.0)
for k in keys:
    os.write(fd, k); drain(0.2)
drain(1.0)
_, st = os.waitpid(pid, 0)
sys.stdout.write(out.decode('utf8', 'replace'))
sys.exit(os.waitstatus_to_exitcode(st))
`;
  return execFileSync("python3", ["-c", py, WIZARD, keys, String(cols)], {
    cwd: dir,
    encoding: "utf-8",
    timeout: PTY_BUDGET.timeoutMs,
  });
}

// A minimal terminal: printable text, CR, LF, cursor up (CSI n A), erase line
// (CSI 2K) and autowrap on/off (CSI ?7 l/h), at a fixed width. Enough to see
// the screen the list leaves behind, which the raw byte stream does not show.
function screen(bytes, cols) {
  const rows = [];
  const row = (r) => (rows[r] ??= Array(cols).fill(" "));
  let r = 0;
  let c = 0;
  let wrap = true;
  let pending = false;
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    if (ch === "\x1b") {
      const m = /^\x1b\[(\??)([\d;]*)([A-Za-z])/.exec(bytes.slice(i));
      if (m) {
        const n = parseInt(m[2] || "1", 10);
        if (m[3] === "A") ((r = Math.max(0, r - n)), (pending = false));
        else if (m[3] === "K") rows[r] = Array(cols).fill(" ");
        else if (m[1] === "?" && n === 7) wrap = m[3] === "h";
        i += m[0].length - 1;
      }
      continue;
    }
    if (ch === "\r") ((c = 0), (pending = false));
    else if (ch === "\n") (r++, (pending = false));
    else {
      if (pending && wrap) (r++, (c = 0), (pending = false));
      row(r)[c] = ch;
      if (c === cols - 1) pending = true;
      else c++;
    }
  }
  // Array.from, not map: map skips the holes rows never written leave.
  return Array.from(rows, (x) => (x ?? []).join("").trimEnd());
}

test("the list redraws in place in a terminal narrower than its lines", () => {
  // Owner's check, 2026-10-14: at ~84 columns the longest lines wrapped onto a
  // second row, each redraw moved up one row per item and landed too high, and
  // frames stacked on top of each other (TASK-209-BUG-5).
  const dir = consumer();
  try {
    const cols = 40; // narrower than every list line
    const out = drive(dir, "\\x1b[B|\\x1b[B|\\x1b[B|\\r", cols);
    const rows = screen(out, cols);
    const top = rows.findIndex((x) => x.startsWith("Which agents do you use?"));
    assert.ok(top > -1, "the list was drawn");
    const list = rows.slice(top + 2, top + 12);
    const names = [
      "Claude Code",
      "OpenAI Codex",
      "GitHub Copilot",
      "Cursor",
      "Gemini CLI",
      "Windsurf",
      "Cline",
      "Kiro",
      "OpenCode",
      "Amp",
    ];
    names.forEach((name, i) => {
      assert.ok(
        list[i].includes(name),
        `row ${i} should show ${name}, got ${JSON.stringify(list[i])}`,
      );
      assert.equal(
        (list[i].match(/\[[ x]\]/g) || []).length,
        1,
        `one item per row: ${JSON.stringify(list[i])}`,
      );
    });
    assert.match(
      list[3],
      /❯/,
      "the cursor sits on the fourth item after three downs",
    );
    assert.equal(finalAutowrap(out), "on", "autowrap is back on after enter");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Ctrl-C in the list leaves autowrap on and links nothing", () => {
  const dir = consumer();
  try {
    let out;
    try {
      out = drive(dir, "\\x1b[B| |\\x03");
    } catch (e) {
      // Ctrl-C must be what ended the run: the driver exits 254 for a child
      // killed by SIGINT (sys.exit(-2)). Anything else, a crash or a
      // timeout included, is a real failure.
      if (e.status !== 254) throw e;
      out = String(e.stdout);
    }
    assert.match(strip(out), /Which agents do you use\?/);
    assert.equal(finalAutowrap(out), "on", "autowrap is back on after Ctrl-C");
    assert.equal(linkOf(dir, "CLAUDE.md"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the list: space ticks, arrows move and wrap, enter confirms", () => {
  const dir = consumer();
  try {
    // Up from the first row wraps to the last (Amp); two more is Kiro (7).
    // Down seven wraps through Amp and the top to Gemini (4).
    const down7 = Array(7).fill("\\x1b[B").join("|");
    const out = drive(dir, `\\x1b[A|\\x1b[A|\\x1b[A| |${down7}| |\\r`);
    assert.match(strip(out), /Which agents do you use\?/);
    assert.equal(linkOf(dir, ".kiro/skills"), "../.agents/skills");
    assert.equal(linkOf(dir, "GEMINI.md"), "AGENTS.md");
    assert.equal(
      linkOf(dir, "CLAUDE.md"),
      null,
      "an unticked agent is not linked",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the list pre-ticks agents already linked, so enter keeps them", () => {
  const dir = consumer();
  try {
    run(dir, ["--link-agents", "claude"]);
    const out = drive(dir, "\\r");
    assert.match(strip(out), /Claude Code: CLAUDE\.md already linked/);
    assert.match(strip(out), /\[x\] Claude Code/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
