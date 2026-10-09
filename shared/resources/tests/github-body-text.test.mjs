// github-body-text.js — a literal \u0000-\u001f escape in a GitHub body is written
// as U+00XX before it is sent, because GitHub stores it as caret notation
// (bug.17: \u0000 → \^@, \u001f → \^_; obs #233, #303).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "github-body-text.js");
const { wordsForControlEscapes } = require(SCRIPT);

test("every escape GitHub rewrites becomes U+00XX; the count is reported", () => {
  const r = wordsForControlEscapes(
    "a NUL `\\u0000`, a unit separator \\u001f and \\u001F, then \\u000a",
  );
  assert.equal(
    r.text,
    "a NUL `U+0000`, a unit separator U+001F and U+001F, then U+000A",
  );
  assert.equal(r.count, 4);
});

test("what GitHub keeps is left alone: \\u007f, \\u0020, a real newline, plain text", () => {
  const text =
    "DEL \\u007f, space \\u0020, line\nnext, and u0000 with no backslash";
  const r = wordsForControlEscapes(text);
  assert.equal(r.text, text);
  assert.equal(r.count, 0);
});

test("CLI rewrites the file in place and names the count on stderr; exit 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "gbt-"));
  try {
    const f = join(dir, "body.md");
    writeFileSync(f, "quotes \\u0000 here\n");
    const r = spawnSync(process.execPath, [SCRIPT, "--file", f], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(f, "utf8"), "quotes U+0000 here\n");
    assert.match(r.stderr, /1 control-character escape/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI usage errors exit 2: no --file, an unreadable file", () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT]).status, 2);
  assert.equal(
    spawnSync(process.execPath, [SCRIPT, "--file", "/no/such/file"]).status,
    2,
  );
});
