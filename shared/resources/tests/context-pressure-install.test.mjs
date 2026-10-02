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
