// mktemp-template-portable.test.mjs — every mktemp template this repository ships puts its X's
// LAST, and the QA skills' Step 3b temp-file line yields a fresh file every time it runs (obs #181).
//
// BSD mktemp (macOS) randomises only a TRAILING run of X's. `mktemp /tmp/qa-code-review-XXXXXX.diff`
// therefore created the literal file `/tmp/qa-code-review-XXXXXX.diff` on first use and failed with
// "mkstemp failed … File exists" on every later run, leaving DIFF_FILE empty: the whole-branch arm
// wrote no patch and the scoped arm HALTed blaming the pathspec. GNU mktemp reads a trailing suffix
// as an implied `--suffix`, so the Linux CI host never saw it — the file had sat in /tmp since
// 2026-09-26 when task.135's cycle-3 dogfood found it.
//
//   A — premise: on a BSD mktemp, the old template fails on its second run (skipped on GNU, where it
//       does not — which is exactly why CI could not see the defect)
//   B — both skills' Step 3b line, cut from the shipped fence, yields two distinct files in a row
//       under bash and zsh
//   C — no shipped mktemp template (outside `-t`, which BSD suffixes with its own random part) has
//       anything after its X's

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

const TMP = [];
after(() => {
  for (const d of TMP) fs.rmSync(d, { recursive: true, force: true });
});
function sandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mktemp-portable-"));
  TMP.push(d);
  return d;
}

function run(shell, script, env) {
  const argv =
    shell === "zsh"
      ? ["-f", "-c", script]
      : ["--noprofile", "--norc", "-c", script];
  return spawnSync(shell, argv, {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

// ── A — premise ───────────────────────────────────────────────────────────────

test("A — on BSD mktemp, a template with a suffix after its X's fails on the second run", (t) => {
  const d = sandbox();
  const tpl = path.join(d, "probe-XXXXXX.diff");
  const first = spawnSync("mktemp", [tpl], { encoding: "utf8" });
  const second = spawnSync("mktemp", [tpl], { encoding: "utf8" });
  const bsd = first.stdout.trim() === tpl; // BSD leaves the X's literal
  if (!bsd) {
    t.skip("GNU mktemp randomises before a suffix — the defect is BSD-only");
    return;
  }
  assert.notEqual(second.status, 0, "BSD: the literal name already exists");
  assert.equal(second.stdout.trim(), "", "and DIFF_FILE would be empty");
});

// ── B — the shipped line works twice in a row ─────────────────────────────────

function diffFileLine(skill) {
  const md = fs.readFileSync(
    path.join(ROOT, "skills", skill, "SKILL.md"),
    "utf8",
  );
  const fences = extractBlocks(md).filter((b) =>
    /LAST_GATE_HEAD=\$\(grep -E '\^head:'/.test(b.code),
  );
  assert.equal(fences.length, 1, `${skill}: expected one Step 3b fence`);
  const line = fences[0].code
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("DIFF_FILE=$(mktemp"));
  assert.ok(line, `${skill}: Step 3b binds no DIFF_FILE with mktemp`);
  return line;
}

for (const skill of ["qa-task", "qa-story"]) {
  for (const sh of SHELLS) {
    test(`B [${sh}] ${skill} — the Step 3b temp-file line yields two distinct files in a row`, () => {
      const d = sandbox();
      const line = diffFileLine(skill);
      const script = `${line}\nprintf '%s\\n' "$DIFF_FILE"\n${line}\nprintf '%s\\n' "$DIFF_FILE"\n`;
      const r = run(sh, script, { TMPDIR: d });
      assert.equal(r.status, 0, r.stderr);
      const [a, b] = r.stdout.trim().split("\n");
      assert.ok(
        a && b,
        `both runs bound a path (got ${JSON.stringify(r.stdout)})`,
      );
      assert.notEqual(a, b, "the second run must not reuse the first file");
      assert.ok(fs.existsSync(a) && fs.existsSync(b), "both files exist");
      assert.ok(
        path.resolve(a).startsWith(fs.realpathSync(d)) || a.startsWith(d),
        "created under $TMPDIR",
      );
    });
  }
}

// ── C — the sweep ─────────────────────────────────────────────────────────────

/** Shipped sources: every SKILL.md, every skill script, every shared resource — never the bundled copies. */
function shippedFiles() {
  const out = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      ":(glob)skills/*/SKILL.md",
      ":(glob)skills/*/scripts/**",
      ":(glob)shared/resources/*.md",
      ":(glob)shared/resources/*.sh",
      ":(glob)scripts/**",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

/** mktemp calls whose template is not `-t` and has something after its final run of X's. */
export function nonTrailingTemplates(text) {
  const found = [];
  const re =
    /\bmktemp((?:\s+-[A-Za-z]+)*)\s+(["']?)([^\s"')]*X{3,}[^\s"')]*)\2/g;
  for (const [lineNo, line] of text.split("\n").entries()) {
    for (const m of line.matchAll(re)) {
      const flags = m[1];
      const tpl = m[3];
      if (/-[A-Za-z]*t/.test(flags)) continue; // -t: BSD appends its own random part; GNU implies --suffix
      if (/X{3,}$/.test(tpl)) continue;
      found.push({ line: lineNo + 1, template: tpl });
    }
  }
  return found;
}

test("C — no shipped mktemp template has anything after its X's (outside -t)", () => {
  const files = shippedFiles();
  assert.ok(
    files.length > 50,
    `the sweep saw ${files.length} files — the git ls-files globs are broken`,
  );
  const bad = [];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.statSync(p).isFile()) continue;
    for (const hit of nonTrailingTemplates(fs.readFileSync(p, "utf8"))) {
      bad.push(`${f}:${hit.line} — ${hit.template}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    `BSD mktemp leaves these literal after the first run:\n  ${bad.join("\n  ")}`,
  );
});

test("C — the sweep's matcher sees the obs #181 shape and passes the portable ones", () => {
  assert.equal(
    nonTrailingTemplates("DIFF_FILE=$(mktemp /tmp/qa-code-review-XXXXXX.diff)")
      .length,
    1,
  );
  assert.equal(
    nonTrailingTemplates(
      'DIFF_FILE=$(mktemp "${TMPDIR:-/tmp}/qa-code-review.XXXXXX")',
    ).length,
    0,
  );
  assert.equal(
    nonTrailingTemplates('F="$(mktemp -t review-pr.XXXXXX.patch)"').length,
    0,
  );
  assert.equal(
    nonTrailingTemplates("D=$(mktemp -d /tmp/probe-XXXXXX)").length,
    0,
  );
  assert.equal(
    nonTrailingTemplates("D=$(mktemp -d /tmp/probe-XXXXXX.d)").length,
    1,
  );
});
