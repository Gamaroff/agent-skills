// zsh-flag-expansion-guard.test.mjs — no fenced `bash` block in a canonical source passes a flag
// through `${X:+--flag "$X"}` (task 333, observation #202).
//
// The defect: bash word-splits the unquoted alternative of `${X:+--flag "$X"}` into two arguments;
// zsh does not, so the callee receives the one argument `--flag <value>` and reads it as an unknown
// flag. The trap was fixed one site at a time four times before this guard existed (step-8 commit,
// resolve-platform.sh, tracker-access.test.sh, finalise Step 3c). The rule, and the array form that
// replaces the expansion, live in docs/contributing/traps.md § "zsh does not word-split
// `${X:+--flag "$X"}`".
//
// What the guard claims, as a bounded set:
//   - CAUGHT: an alternative that opens with a flag, bare or quoted — `${X:+--f "$X"}`,
//     `${X:+-f "$X"}`, `${X:+"-f" "$X"}`, `${X:+'--f' "$X"}` — on a non-comment line of a fenced
//     `bash` block (extractBlocks) in `git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md'`,
//     minus any /references/ copy.
//   - NOT CAUGHT (named, not claimed): an alternative that opens with a variable
//     (`${X:+$FLAG "$X"}`); a `.sh` file (shellcheck and its shebang own those); a fence tagged
//     anything but `bash`; a trailing `# …` comment after code on the same line is still scanned.
//   - LEGAL, and pinned so a widened key goes red here first: an alternative meant as one word,
//     such as `"${X:+ (eq ${X})}"` or `${X:+, ${X}}` — zsh's behaviour is correct for those.
//
// Each block is the smallest claim whose reverse turns it red:
//   A — zero flag-key hits outside comments across the population, named as path:line;
//   B — non-vacuity: at least 700 blocks were read (804 on 2026-11-28);
//   C — the premise under zsh: the reconstructed bad form passes 1 argument, the array form 2
//       (and 2 under bash);
//   D — the key's calibration: it matches the caught shapes and none of the legal ones.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

/** An expansion whose `:+` alternative opens with a flag, optionally quoted. */
const FLAG_KEY = /\$\{[A-Za-z_][A-Za-z0-9_]*:\+["']?-/;
const COMMENT = /^\s*#/;
const BLOCK_FLOOR = 700;

const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;

function population() {
  return execFileSync(
    "git",
    ["ls-files", "skills/*/SKILL.md", "shared/resources/*.md"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter((f) => f && !f.includes("/references/"));
}

/** Every flag-key hit on a non-comment line of a fenced bash block, as `path:line`. */
function scan(files) {
  const hits = [];
  let blocksRead = 0;
  for (const file of files) {
    const md = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const block of extractBlocks(md)) {
      blocksRead += 1;
      block.code.split("\n").forEach((line, i) => {
        if (FLAG_KEY.test(line) && !COMMENT.test(line)) {
          // block.line is the fence's 1-based line; the code starts on the next one.
          hits.push(`${file}:${block.line + i + 1}`);
        }
      });
    }
  }
  return { hits, blocksRead };
}

const result = scan(population());

test("A — no fenced bash block passes a flag through ${X:+--flag …}", () => {
  assert.deepEqual(
    result.hits,
    [],
    `zsh passes \${X:+--flag "$X"} as ONE argument; use an array instead ` +
      `(ARGS=(); [ -n "$X" ] && ARGS=(--flag "$X"); cmd "\${ARGS[@]}") — ` +
      `docs/contributing/traps.md. Hits:\n  ${result.hits.join("\n  ")}`,
  );
});

test(`B — non-vacuity: the scan read at least ${BLOCK_FLOOR} fenced bash blocks`, () => {
  assert.ok(
    result.blocksRead >= BLOCK_FLOOR,
    `read ${result.blocksRead} blocks, expected >= ${BLOCK_FLOOR}: the population or the fence reader is broken`,
  );
});

function argCount(shell, code) {
  const r = spawnSync(shell, ["-c", code], { encoding: "utf8" });
  assert.equal(r.status, 0, `${shell}: ${r.stderr}`);
  return r.stdout.trim();
}

const BAD = 'X=v; set -- ${X:+--flag "$X"}; echo $#';
const ARRAY =
  'X=v; A=(); [ -n "$X" ] && A=(--flag "$X"); set -- "${A[@]}"; echo $#';

test(
  "C — premise: zsh passes the bad form as 1 argument, the array form as 2",
  {
    skip: hasZsh
      ? false
      : "zsh is not installed — the premise cannot be shown here",
  },
  () => {
    assert.equal(
      argCount("zsh", BAD),
      "1",
      "zsh should NOT split the alternative",
    );
    assert.equal(
      argCount("zsh", ARRAY),
      "2",
      "the array form must give two arguments under zsh",
    );
  },
);

test("C — the array form passes 2 arguments under bash too", () => {
  assert.equal(argCount("bash", ARRAY), "2");
});

test("D — the key matches flag-opening alternatives and none of the one-word ones", () => {
  for (const caught of [
    '${X:+--f "$X"}',
    '${X:+-f "$X"}',
    '${X:+"-f" "$X"}',
    "${X:+'--f' \"$X\"}",
    '${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}',
  ]) {
    assert.ok(FLAG_KEY.test(caught), `must catch: ${caught}`);
  }
  for (const legal of [
    '"${X:+ (eq ${X})}"',
    "${X:+, ${X}}",
    '"${X:+$X}"',
    "${X:-default}",
    '${X:+$FLAG "$X"}', // the named unguarded spelling: not claimed
  ]) {
    assert.ok(!FLAG_KEY.test(legal), `must not catch: ${legal}`);
  }
});
