// Run: command node --test shared/resources/tests/context-pressure-install.test.mjs
//
// task.157 — the user-level installer: install, re-install (byte-identical), uninstall (equal to
// the original as parsed JSON), identity dedupe across spellings, sibling statusLine keys kept,
// malformed input refused untouched, dry run writes nothing. The installed status line is also
// executed, so "wrapped" is proven to mean "still renders the original".

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  applySettings,
  shellWords,
  shq,
  unshq,
  unwrapCommand,
} from "../context-pressure.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INSTALLER = path.join(HERE, "..", "context-pressure-install.sh");
const TMP = [];
after(() => TMP.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
function tmpdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-install-"));
  TMP.push(d);
  return d;
}

const ORIGINAL_STATUS = `cat >/dev/null; echo "it's $((40+2)) apples" | tr a A`;
const ORIGINAL = {
  model: "opus",
  statusLine: { type: "command", command: ORIGINAL_STATUS, padding: 2 },
  hooks: {
    PreToolUse: [
      { matcher: "Bash", hooks: [{ type: "command", command: "echo pre" }] },
    ],
    UserPromptSubmit: [
      { hooks: [{ type: "command", command: "echo other-ups" }] },
    ],
  },
};

function settingsFile(obj) {
  const f = path.join(tmpdir(), "settings.json");
  fs.writeFileSync(
    f,
    typeof obj === "string" ? obj : JSON.stringify(obj, null, 4),
  );
  return f;
}
function install(f, ...extra) {
  return spawnSync("sh", [INSTALLER, "--settings", f, ...extra], {
    encoding: "utf8",
  });
}
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const ours = (s) =>
  (s.hooks?.UserPromptSubmit || [])
    .flatMap((g) => g.hooks)
    .filter((h) => h.command.includes("context-pressure.mjs"));

test("install adds one hook, wraps the status line, keeps siblings; re-install is byte-identical; uninstall restores", () => {
  const f = settingsFile(ORIGINAL);
  const r1 = install(f);
  assert.equal(r1.status, 0, r1.stderr);
  const s = read(f);
  assert.equal(ours(s).length, 1);
  assert.equal(ours(s)[0].timeout, 5);
  assert.match(
    ours(s)[0].command,
    /^command node '.*context-pressure\.mjs' check$/,
  );
  assert.equal(s.statusLine.padding, 2, "sibling statusLine key kept");
  assert.match(
    s.statusLine.command,
    /context-pressure-statusline\.sh' -- sh -c /,
  );
  assert.deepEqual(s.hooks.PreToolUse, ORIGINAL.hooks.PreToolUse);
  assert.equal(s.model, "opus");
  assert.ok(fs.existsSync(`${f}.bak`), ".bak written");

  const bytes = fs.readFileSync(f);
  const r2 = install(f);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /unchanged/);
  assert.deepEqual(
    fs.readFileSync(f),
    bytes,
    "second install is byte-identical",
  );

  const r3 = install(f, "--uninstall");
  assert.equal(r3.status, 0, r3.stderr);
  assert.deepEqual(read(f), ORIGINAL);
  const r4 = install(f, "--uninstall");
  assert.match(
    r4.stdout,
    /unchanged/,
    "uninstall when not installed is a no-op",
  );
});

test("the installed status line command still renders the original's output", () => {
  const f = settingsFile(ORIGINAL);
  install(f);
  const cmd = read(f).statusLine.command;
  const state = path.join(tmpdir(), "s");
  const r = spawnSync("sh", ["-c", cmd], {
    input: JSON.stringify({
      session_id: "x",
      context_window: { used_percentage: 5 },
    }),
    encoding: "utf8",
    env: { ...process.env, CONTEXT_PRESSURE_STATE_DIR: state },
  });
  const direct = spawnSync("sh", ["-c", ORIGINAL_STATUS], {
    input: "{}",
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, direct.stdout);
  assert.equal(
    r.stdout,
    "it's 42 Apples\n",
    "the original's own transformation survives the wrap",
  );
});

test("identity dedupe: other spellings of the hook collapse to one; a wrapped status line is never wrapped twice", () => {
  const f = settingsFile({
    statusLine: {
      type: "command",
      command: `sh '/old/place/context-pressure-statusline.sh' -- sh -c ${shq("echo hi")}`,
    },
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: "command",
              command: 'node "/old/place/context-pressure.mjs" check',
            },
            { type: "command", command: "echo keep" },
          ],
        },
        {
          hooks: [
            {
              type: "command",
              command: "command node ~/x/context-pressure.mjs check",
            },
          ],
        },
      ],
    },
  });
  assert.equal(install(f).status, 0);
  const s = read(f);
  assert.equal(ours(s).length, 1);
  assert.ok(
    s.hooks.UserPromptSubmit.flatMap((g) => g.hooks).some(
      (h) => h.command === "echo keep",
    ),
  );
  assert.equal(
    s.statusLine.command.match(/context-pressure-statusline\.sh/g).length,
    1,
  );
});

test("no status line: install adds the recorder alone; uninstall removes it and every key it added", () => {
  const f = settingsFile({ model: "x" });
  install(f);
  const s = read(f);
  assert.match(
    s.statusLine.command,
    /^sh '.*context-pressure-statusline\.sh'$/,
  );
  install(f, "--uninstall");
  assert.deepEqual(read(f), { model: "x" });
});

test("a missing settings file is created on install and is a no-op on uninstall", () => {
  const f = path.join(tmpdir(), "nested", "settings.json");
  assert.equal(install(f, "--uninstall").status, 0);
  assert.equal(fs.existsSync(f), false);
  assert.equal(install(f).status, 0);
  assert.equal(ours(read(f)).length, 1);
  assert.deepEqual(
    fs.readdirSync(path.dirname(f)).sort(),
    ["settings.json"],
    "no temp files left behind",
  );
});

test("malformed JSON is refused with exit 1 and the file is untouched", () => {
  for (const bad of ["{ nope", "[1,2]", "null"]) {
    const f = settingsFile(bad);
    const r = install(f);
    assert.equal(r.status, 1, bad);
    assert.equal(fs.readFileSync(f, "utf8"), bad);
    assert.deepEqual(
      fs.readdirSync(path.dirname(f)),
      ["settings.json"],
      "no temp or .bak left behind",
    );
  }
});

test("--dry-run prints a diff and writes nothing", () => {
  const f = settingsFile(ORIGINAL);
  const before = fs.readFileSync(f);
  const r = install(f, "--dry-run");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /context-pressure\.mjs/);
  assert.deepEqual(fs.readFileSync(f), before);
  assert.deepEqual(fs.readdirSync(path.dirname(f)), ["settings.json"]);
});

test("a symlinked settings file is edited at its target and the link survives", () => {
  const dir = tmpdir();
  const target = path.join(dir, "real.json");
  fs.writeFileSync(target, JSON.stringify(ORIGINAL));
  const link = path.join(dir, "settings.json");
  fs.symlinkSync(target, link);
  assert.equal(install(link).status, 0);
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  assert.equal(ours(read(target)).length, 1);
});

test("usage errors exit 2", () => {
  assert.equal(spawnSync("sh", [INSTALLER, "--bogus"]).status, 2);
  assert.equal(spawnSync("sh", [INSTALLER, "--settings"]).status, 2);
});

test("shq/unshq round-trip and unwrapCommand refuses a form it did not write", () => {
  for (const s of ["", "a", "it's", "''", `a'b"c$d\\e`, "x\ny"])
    assert.equal(unshq(shq(s)), s);
  assert.deepEqual(unwrapCommand("echo plain"), { wrapped: false });
  assert.deepEqual(
    unwrapCommand(
      "sh '/p/context-pressure-statusline.sh' -- whatever unquoted",
    ),
    { wrapped: true, unparseable: true },
  );
  const r = applySettings(
    {
      statusLine: {
        type: "command",
        command: "/p/context-pressure-statusline.sh -- weird",
      },
    },
    "uninstall",
  );
  assert.equal(r.changed, false);
  assert.match(r.notes.join(" "), /by hand/);
});

test("re-install from another directory re-points an existing wrap; the original survives; uninstall restores it (QA cycle 1 CR-1)", () => {
  const original = `cat >/dev/null; echo "x'y"`;
  const f = settingsFile({
    statusLine: {
      type: "command",
      command: `sh '/old/place/context-pressure-statusline.sh' -- sh -c ${shq(original)}`,
      padding: 1,
    },
  });
  const r = install(f);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /re-pointed/);
  const s = read(f);
  assert.doesNotMatch(s.statusLine.command, /\/old\/place\//);
  assert.equal(unwrapCommand(s.statusLine.command).original, original);
  assert.equal(s.statusLine.padding, 1);
  assert.equal(install(f).status, 0);
  assert.match(install(f).stdout, /unchanged/, "re-pointed wrap is stable");
  install(f, "--uninstall");
  assert.equal(read(f).statusLine.command, original);
});

test("uninstall leaves containers it did not empty exactly as found (QA cycle 1 CR-3)", () => {
  for (const obj of [
    { hooks: { UserPromptSubmit: [] } },
    { hooks: {} },
    { hooks: { UserPromptSubmit: [{ hooks: [] }] } },
  ]) {
    const f = settingsFile(obj);
    const before = fs.readFileSync(f);
    const r = install(f, "--uninstall");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /unchanged/, JSON.stringify(obj));
    assert.deepEqual(fs.readFileSync(f), before, JSON.stringify(obj));
  }
});

test("an empty container survives an uninstall that does write (the status line is unwrapped) (QA cycle 1 CR-3)", () => {
  const original = "echo hi";
  const f = settingsFile({
    hooks: { UserPromptSubmit: [] },
    statusLine: {
      type: "command",
      command: `sh '/p/context-pressure-statusline.sh' -- sh -c ${shq(original)}`,
    },
  });
  assert.equal(install(f, "--uninstall").status, 0);
  assert.deepEqual(read(f), {
    hooks: { UserPromptSubmit: [] },
    statusLine: { type: "command", command: original },
  });
});

test("accepted residual: an empty container present before install is dropped by uninstall (equivalent settings)", () => {
  const f = settingsFile({ model: "m", hooks: {} });
  install(f);
  install(f, "--uninstall");
  assert.deepEqual(read(f), { model: "m" });
});

test("a hooks shape the transform cannot edit is refused with exit 1, a message, and no change (QA cycle 1 CR-4)", () => {
  for (const hooks of [
    [],
    "x",
    null,
    { UserPromptSubmit: "ab" },
    { UserPromptSubmit: { a: 1 } },
  ]) {
    const f = settingsFile({ hooks });
    const before = fs.readFileSync(f);
    for (const mode of [[], ["--uninstall"]]) {
      const r = install(f, ...mode);
      assert.equal(r.status, 1, `${JSON.stringify(hooks)} ${mode}`);
      assert.match(
        r.stderr,
        /hooks.*nothing changed/,
        `${JSON.stringify(hooks)} ${mode}`,
      );
      assert.deepEqual(fs.readFileSync(f), before);
    }
    assert.deepEqual(
      fs.readdirSync(path.dirname(f)),
      ["settings.json"],
      "no temp or .bak left behind",
    );
  }
});

test("the settings file keeps its own mode across install and uninstall (QA cycle 1 CR-6)", () => {
  const f = settingsFile(ORIGINAL);
  fs.chmodSync(f, 0o644);
  install(f);
  assert.equal(fs.statSync(f).mode & 0o777, 0o644);
  install(f, "--uninstall");
  assert.equal(fs.statSync(f).mode & 0o777, 0o644);
  assert.deepEqual(fs.readdirSync(path.dirname(f)).sort(), [
    "settings.json",
    "settings.json.bak",
  ]);
});

test("a wrap this installer cannot parse is ACTION NEEDED: exit 1, file untouched, no 'not installed' claim (QA cycle 2 CR-1)", () => {
  const f = settingsFile({
    statusLine: {
      type: "command",
      command: "sh '/p/context-pressure-statusline.sh' -- garbled",
    },
  });
  const before = fs.readFileSync(f);
  const r = install(f, "--uninstall");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ACTION NEEDED — statusLine: wrapped in a form/);
  assert.doesNotMatch(r.stdout + r.stderr, /not installed|unchanged$/m);
  assert.deepEqual(fs.readFileSync(f), before);
});

test("a statusLine with no command still gets the hook, then exits 1 with ACTION NEEDED (QA cycle 2 CR-1)", () => {
  const f = settingsFile({ statusLine: { type: "command" } });
  const r = install(f);
  assert.equal(r.status, 1);
  assert.match(
    r.stderr,
    /ACTION NEEDED — statusLine: present but has no command/,
  );
  assert.equal(ours(read(f)).length, 1, "the hook was written");
  assert.deepEqual(read(f).statusLine, { type: "command" });
});

test("a wrapper directory that contains the wrapper's own name round-trips (QA cycle 2 CR-2)", () => {
  const wrapper =
    "/x/context-pressure-statusline.sh.d/context-pressure-statusline.sh";
  const engine = "/x/context-pressure.mjs.d/context-pressure.mjs";
  const original = "echo context-pressure-statusline.sh in the original";
  const input = { statusLine: { type: "command", command: original } };
  const a = applySettings(input, "install", { engine, wrapper });
  assert.equal(a.outcome, "changed");
  assert.equal(unwrapCommand(a.settings.statusLine.command).original, original);
  const b = applySettings(a.settings, "install", { engine, wrapper });
  assert.equal(b.outcome, "unchanged");
  const c = applySettings(a.settings, "uninstall");
  assert.equal(c.outcome, "changed");
  assert.deepEqual(c.settings, input);
});

test("another tool's hook whose filename merely ends in context-pressure.mjs is not ours (QA cycle 2 CR-4)", () => {
  const other = {
    type: "command",
    command: "node ~/bin/my-context-pressure.mjs check",
  };
  const input = { hooks: { UserPromptSubmit: [{ hooks: [other] }] } };
  const a = applySettings(input, "install", {
    engine: "/e/context-pressure.mjs",
    wrapper: "/e/context-pressure-statusline.sh",
  });
  assert.deepEqual(a.settings.hooks.UserPromptSubmit[0].hooks, [other]);
  assert.equal(a.settings.hooks.UserPromptSubmit.length, 2);
  const u = applySettings(a.settings, "uninstall");
  assert.deepEqual(u.settings.hooks, input.hooks);
  assert.equal(applySettings(input, "uninstall").outcome, "unchanged");
});

test("a read-only settings file installs and uninstalls, keeping 0444; a read-only .bak is replaced (QA cycle 2 CR-3)", () => {
  const f = settingsFile(ORIGINAL);
  fs.chmodSync(f, 0o444);
  let r = install(f);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.statSync(f).mode & 0o777, 0o444);
  assert.equal(ours(read(f)).length, 1);
  fs.chmodSync(`${f}.bak`, 0o444);
  r = install(f, "--uninstall");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.statSync(f).mode & 0o777, 0o444);
  assert.deepEqual(read(f), ORIGINAL);
});

test("shellWords reads back every quoting form shq writes, and refuses an unclosed quote", () => {
  for (const s of ["", "a", "it's", "a'b\"c$d\\e", "x y", "o'brien/ctx"]) {
    assert.deepEqual(shellWords(`cmd ${shq(s)} tail`), ["cmd", s, "tail"]);
  }
  assert.deepEqual(shellWords(`a "b \\"c\\" $d" e\\ f`), [
    "a",
    'b "c" $d',
    "e f",
  ]);
  assert.equal(shellWords("a 'b"), null);
  assert.equal(shellWords('a "b'), null);
});

test("a wrapper path with an apostrophe round-trips: install twice is stable, uninstall restores (QA cycle 3 CR-1)", () => {
  const wrapper = "/Users/o'brien/skills/context-pressure-statusline.sh";
  const engine = "/Users/o'brien/skills/context-pressure.mjs";
  const input = { statusLine: { type: "command", command: "echo hi" } };
  const a = applySettings(input, "install", { engine, wrapper });
  assert.equal(a.outcome, "changed");
  const b = applySettings(a.settings, "install", { engine, wrapper });
  assert.equal(b.outcome, "unchanged", b.notes.join("; "));
  assert.equal(ours(b.settings).length, 1);
  const c = applySettings(a.settings, "uninstall");
  assert.equal(c.outcome, "changed");
  assert.deepEqual(c.settings, input);
});

test("the real installer, run from a directory whose path has an apostrophe, round-trips and its wrap renders", () => {
  const dir = path.join(tmpdir(), "o'brien");
  fs.mkdirSync(dir);
  for (const n of [
    "context-pressure.mjs",
    "context-pressure-statusline.sh",
    "context-pressure-install.sh",
  ]) {
    fs.copyFileSync(path.join(HERE, "..", n), path.join(dir, n));
  }
  const f = settingsFile(ORIGINAL);
  const run = (...a) =>
    spawnSync(
      "sh",
      [path.join(dir, "context-pressure-install.sh"), "--settings", f, ...a],
      { encoding: "utf8" },
    );
  assert.equal(run().status, 0);
  const bytes = fs.readFileSync(f);
  assert.match(run().stdout, /unchanged/);
  assert.deepEqual(fs.readFileSync(f), bytes);
  const r = spawnSync("sh", ["-c", read(f).statusLine.command], {
    input: "{}",
    encoding: "utf8",
    env: { ...process.env, CONTEXT_PRESSURE_STATE_DIR: path.join(dir, "s") },
  });
  assert.equal(r.stdout, "it's 42 Apples\n");
  assert.equal(run("--uninstall").status, 0);
  assert.deepEqual(read(f), ORIGINAL);
});

test("identity pairs: other spellings that must match, and look-alikes that must not (QA cycle 3 CR-2)", () => {
  const same = [
    "/bin/sh '/p/context-pressure-statusline.sh' -- sh -c 'echo hi'",
    "bash /p/context-pressure-statusline.sh -- sh -c 'echo hi'",
    "\"/p q/context-pressure-statusline.sh\" -- sh -c 'echo hi'",
    "sh 'C:\\p\\context-pressure-statusline.sh' -- sh -c 'echo hi'",
  ];
  for (const c of same)
    assert.deepEqual(
      unwrapCommand(c),
      { wrapped: true, original: "echo hi" },
      c,
    );
  const differ = [
    "echo context-pressure-statusline.sh",
    "sh /p/my-context-pressure-statusline.sh",
    "sh /p/context-pressure-statusline.sh.d/run.sh",
    "cat x | sh /p/context-pressure-statusline.sh",
  ];
  for (const c of differ) assert.equal(unwrapCommand(c).wrapped, false, c);
  const hooks = (c) => ({
    hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command: c }] }] },
  });
  for (const c of [
    'command node "/p/context-pressure.mjs" check',
    "node /p/context-pressure.mjs check",
    "node 'C:\\p\\context-pressure.mjs' check" /* unquoted, a shell itself reads C:\\p\\x as C:px */,
  ]) {
    assert.equal(applySettings(hooks(c), "uninstall").outcome, "changed", c);
  }
  for (const c of [
    "node /p/my-context-pressure.mjs check",
    "node /p/context-pressure.mjs checkpoint",
    "node /p/context-pressure.mjs record",
  ]) {
    assert.equal(applySettings(hooks(c), "uninstall").outcome, "unchanged", c);
  }
});

test("a failed .bak copy leaves the previous .bak intact (QA cycle 3 CR-3)", () => {
  const f = settingsFile(ORIGINAL);
  fs.writeFileSync(`${f}.bak`, "previous backup");
  // A cp that always fails, first on PATH: the .bak copy is the installer's only cp.
  const shim = path.join(tmpdir(), "shim");
  fs.mkdirSync(shim);
  fs.writeFileSync(
    path.join(shim, "cp"),
    "#!/bin/sh\necho 'cp: simulated failure' >&2\nexit 1\n",
    { mode: 0o755 },
  );
  const r = spawnSync("sh", [INSTALLER, "--settings", f], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${shim}:${process.env.PATH}` },
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cannot write .*\.bak/);
  assert.equal(fs.readFileSync(`${f}.bak`, "utf8"), "previous backup");
  assert.deepEqual(read(f), ORIGINAL, "settings untouched");
  assert.deepEqual(fs.readdirSync(path.dirname(f)).sort(), [
    "settings.json",
    "settings.json.bak",
  ]);
});
