// qa-safety-clause1.test.mjs — clause 1 of the safety re-probe trigger has ONE definition, the
// bundled script qa-safety-clause1.sh (task.168 CR3-4). Executed here directly,
// under bash and zsh, against each reading the shared rule names. The replay tests against real
// gates, and the transit-constraint tests on the awk program's text, live in
// evals/shared/tests/qa-re-review-scope-parity.test.mjs.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawnBudget } from "../spawn-budget.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "..", "qa-safety-clause1.sh");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("QA_SAFETY_CLAUSE1");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "qa-clause1-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

function gate(name, body) {
  const f = path.join(TMP, name);
  fs.writeFileSync(f, body);
  return f;
}

/** Call the script the way a skill does — `bash <script> "$LATEST_GATE"` — from `shell`. */
function clause1(shell, ...args) {
  const quoted = args.map((a) => `'${a}'`).join(" ");
  const argv = shell === "zsh" ? ["-f", "-c"] : ["--noprofile", "--norc", "-c"];
  const r = spawnSync(shell, [...argv, `bash '${SCRIPT}' ${quoted}`], {
    encoding: "utf8",
    // An open, silent stdin: if the guard ever lets awk run with no file, this hangs → timeout.
    stdio: ["pipe", "pipe", "pipe"],
    timeout: SPAWN_TIMEOUT_MS,
  });
  return {
    status: r.status,
    out: (r.stdout || "").trim(),
    err: r.stderr || "",
  };
}

const CASES = [
  [
    "a security FAIL",
    "nfr_validation:\n  security:\n    status: FAIL\n    evidence: measured\n",
    "true",
  ],
  [
    "PASS, measured",
    "nfr_validation:\n  security:\n    status: PASS\n    evidence: measured\n",
    "false",
  ],
  [
    "PASS, reasoned",
    "nfr_validation:\n  security:\n    status: PASS\n    evidence: reasoned\n",
    "false",
  ],
  [
    "PASS, unverified",
    "nfr_validation:\n  security:\n    status: PASS\n    evidence: unverified\n",
    "true",
  ],
  [
    "a security block with no evidence: key (fails open)",
    "nfr_validation:\n  security:\n    status: PASS\n",
    "true",
  ],
  [
    "no security block (no security claim)",
    "gate: PASS\nnfr_validation:\n  performance:\n    status: FAIL\n",
    "false",
  ],
];

for (const sh of SHELLS) {
  for (const [what, body, want] of CASES) {
    test(`[${sh}] ${what} → ${want}`, () => {
      const r = clause1(sh, gate(`g-${what.replace(/\W+/g, "-")}.yml`, body));
      assert.equal(r.status, 0, r.err);
      assert.equal(r.out, want);
    });
  }

  test(`[${sh}] an empty or missing gate path → false, and no hang (the status half fails closed)`, () => {
    for (const p of ["", path.join(TMP, "absent.yml"), TMP]) {
      const r = clause1(sh, p);
      assert.equal(r.status, 0, `${JSON.stringify(p)}: ${r.err}`);
      assert.equal(r.out, "false", JSON.stringify(p));
    }
  });

  test(`[${sh}] a usage error exits 2 and prints nothing on stdout`, () => {
    for (const args of [[], ["a", "b"]]) {
      const r = clause1(sh, ...args);
      assert.equal(r.status, 2, JSON.stringify(args));
      assert.equal(r.out, "");
      assert.match(r.err, /usage: qa-safety-clause1\.sh <gate-file>/);
    }
  });
}
