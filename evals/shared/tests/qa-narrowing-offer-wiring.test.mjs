/**
 * Executes the QA loop's narrowing-residue offer (task.148, obs #172) from a
 * consumer-shaped working directory.
 *
 * WHY THIS EXISTS
 * ---------------
 * The offer is runnable prose: a fenced ```bash block in
 * `shared/resources/develop-pipeline-step-5-6-qa-loop.md` that ships verbatim
 * into consumer repos and `require`s the engine through
 * `./.agents/skills/{develop-story|develop-task}/references/`. Asserting that the
 * document contains the right text proves only that a string exists. This file
 * EXTRACTS the block and RUNS it, from a temporary directory laid out like a
 * consumer install — never from this repository's root, whose `.agents/skills`
 * symlink is gitignored and absent on CI.
 *
 * It also holds the single-statement property: the Step 2.6 move menu lives in
 * `qa-fix` and nowhere in the loop document. A second copy is the cross-file
 * restatement obs #174 describes, which is the defect this task exists to stop
 * producing.
 *
 * Run: node --test evals/shared/tests/qa-narrowing-offer-wiring.test.mjs
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  spawnBudget,
  neverRan,
} from "../../../shared/resources/spawn-budget.mjs";
// The shipped, memoised zsh probe — reused rather than re-derived.
import { zshAvailable } from "../../../shared/resources/qa-execute-snippets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const { timeoutMs: SPAWN_TIMEOUT_MS, retries: SPAWN_RETRIES } =
  spawnBudget("QA_NARROWING_OFFER");

const LOOP_DOC = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const HEADING = "#### Narrowing-residue offer";
const ENGINE = "shared/resources/qa-diminishing-returns.js";
const FIXTURES = join(
  repoRoot,
  "shared/resources/tests/fixtures/qa-narrowing-residue",
);
/** The placeholder the snippet's reader substitutes with the orchestrator's name. */
const PLACEHOLDER = "{develop-story|develop-task}";

const doc = readFileSync(join(repoRoot, LOOP_DOC), "utf-8");

/** The section from `heading` to the next `####`-or-shallower heading, fences skipped. */
function sectionUnder(text, heading) {
  const at = text.indexOf(heading);
  if (at === -1) return null;
  const lines = text.slice(at).split("\n");
  const out = [lines[0]];
  let fence = false;
  for (const line of lines.slice(1)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^#{1,4} /.test(line)) break;
    out.push(line);
  }
  return out.join("\n");
}

const section = sectionUnder(doc, HEADING);

function bashBlock(text) {
  const m = text && text.match(/```bash\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

// ── a consumer-shaped cwd: the engine where the snippet looks for it ────────

const CONSUMER_ROOT = mkdtempSync(join(tmpdir(), "qa-narrowing-offer-"));
after(() => rmSync(CONSUMER_ROOT, { recursive: true, force: true }));
const REFS = join(CONSUMER_ROOT, ".agents/skills/develop-task/references");
mkdirSync(REFS, { recursive: true });
copyFileSync(join(repoRoot, ENGINE), join(REFS, "qa-diminishing-returns.js"));

// A cwd with NO engine in it — the "engine did not run" case (CR-2).
const EMPTY_ROOT = mkdtempSync(join(tmpdir(), "qa-narrowing-offer-empty-"));
after(() => rmSync(EMPTY_ROOT, { recursive: true, force: true }));

function runSnippet(env, { shell = "bash", cwd = CONSUMER_ROOT } = {}) {
  const code = bashBlock(section).split(PLACEHOLDER).join("develop-task");
  const script = `${code}\nprintf '%s\\n' "$NARROWING_JSON"\nprintf 'SIGNAL=%s\\n' "$NARROWING_SIGNAL"\n`;
  let r;
  for (let attempt = 0; attempt <= SPAWN_RETRIES; attempt++) {
    r = spawnSync(shell, ["-c", script], {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf-8",
      timeout: SPAWN_TIMEOUT_MS,
    });
    if (!neverRan(r)) break;
  }
  return r;
}

// ── the section exists and is wired to the right things ─────────────────────

test("the 5b section exists, calls classifyNarrowingResidue and names qa-fix Step 2.6", () => {
  assert.ok(section, `no "${HEADING}" section in ${LOOP_DOC}`);
  assert.match(section, /classifyNarrowingResidue/);
  assert.match(section, /qa-fix Step 2\.6/);
  // It sits in 5b, between the third-strike rule and the commit section.
  const offerAt = doc.indexOf(HEADING);
  assert.ok(offerAt > doc.indexOf("#### Third-strike rule"));
  assert.ok(
    offerAt < doc.indexOf("#### Where the gate and QA report get committed"),
  );
});

test("every variable the snippet reads is bound in the section's own Variable table", () => {
  const code = bashBlock(section);
  assert.ok(code, "the section carries no ```bash block");
  const read = new Set(
    [...code.matchAll(/"\$([A-Z][A-Z0-9_]*)"/g)].map((m) => m[1]),
  );
  // Anti-vacuity: the snippet reads the four inputs the task names.
  for (const v of ["CYCLE", "HIGH_SEQUENCE_JSON", "GATE_N", "GATE_N1"]) {
    assert.ok(read.has(v), `snippet does not read $${v}`);
  }
  const bound = new Set(
    [...section.matchAll(/^\| `\$([A-Z][A-Z0-9_]*)` \|/gm)].map((m) => m[1]),
  );
  for (const v of read) {
    if (v === "NARROWING_JSON") continue; // assigned inside the snippet itself
    assert.ok(
      bound.has(v),
      `$${v} is read but not bound in the section's Variable table`,
    );
  }
});

test("single statement: the loop document restates no Step 2.6 move menu", () => {
  // The menu's two structural moves are named only in qa-fix. Pasting the menu
  // into the loop document turns this red.
  assert.doesNotMatch(doc, /scope the claim/i);
  assert.doesNotMatch(doc, /consolidate the contract/i);
});

// ── behaviour: the snippet runs from a consumer-shaped cwd ──────────────────

for (const shell of ["bash", "zsh"]) {
  test(`the snippet returns signal: true on task.143 cycle 3 (gates 2 → 3) — ${shell}`, (t) => {
    if (shell === "zsh" && !zshAvailable())
      return t.skip("zsh not installed on this host");
    const r = runSnippet(
      {
        CYCLE: "3",
        HIGH_SEQUENCE_JSON: "[0,0,0]",
        GATE_N: join(FIXTURES, "task143-gate-3.yml"),
        GATE_N1: join(FIXTURES, "task143-gate-2.yml"),
      },
      { shell },
    );
    assert.equal(r.status, 0, `snippet failed: ${r.stderr}`);
    const [jsonLine, signalLine] = r.stdout.trim().split("\n");
    const out = JSON.parse(jsonLine);
    assert.equal(out.signal, true, jsonLine);
    assert.equal(out.reason, "narrowing-residue");
    assert.equal(out.file, "skills/qa-next/scripts/uat-status.mjs");
    assert.match(out.message, /OFFER to qa-fix Step 2\.6/);
    assert.equal(signalLine, "SIGNAL=true");
  });
}

// ── CR-2: a check that could not look must not read as a quiet cycle ────────

test("a blank or malformed HIGH sequence reaches the engine and answers high-counts-missing", () => {
  for (const seq of ["", "not json", "[0,"]) {
    const r = runSnippet({
      CYCLE: "3",
      HIGH_SEQUENCE_JSON: seq,
      GATE_N: join(FIXTURES, "task143-gate-3.yml"),
      GATE_N1: join(FIXTURES, "task143-gate-2.yml"),
    });
    assert.equal(
      r.status,
      0,
      `snippet failed on ${JSON.stringify(seq)}: ${r.stderr}`,
    );
    const [jsonLine, signalLine] = r.stdout.trim().split("\n");
    assert.ok(
      jsonLine,
      `no verdict for HIGH_SEQUENCE_JSON=${JSON.stringify(seq)}`,
    );
    assert.equal(JSON.parse(jsonLine).reason, "high-counts-missing", jsonLine);
    assert.equal(signalLine, "SIGNAL=false");
  }
});

test("with no engine installed the snippet says so: SIGNAL=error, never an empty signal", () => {
  const r = runSnippet(
    {
      CYCLE: "3",
      HIGH_SEQUENCE_JSON: "[0,0,0]",
      GATE_N: join(FIXTURES, "task143-gate-3.yml"),
      GATE_N1: join(FIXTURES, "task143-gate-2.yml"),
    },
    { cwd: EMPTY_ROOT },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^SIGNAL=error$/m);
  assert.match(r.stderr, /narrowing offer: engine did not run/);
});

// ── CR-6: the prompt block does not double its own prefix ───────────────────

test("the /qa-fix prompt block opens with {message} alone, which already carries the prefix", () => {
  const block = section.match(/```\n(\{message\}[\s\S]*?)\n```/);
  assert.ok(block, "no prompt block opening with {message}");
  assert.doesNotMatch(section, /^Narrowing residue: \{message\}/m);
});

test("the snippet declines at cycle 1 with an empty $GATE_N1 (no substitute gate)", () => {
  const r = runSnippet({
    CYCLE: "1",
    HIGH_SEQUENCE_JSON: "[0]",
    GATE_N: join(FIXTURES, "task143-gate-1.yml"),
    GATE_N1: "",
  });
  assert.equal(r.status, 0, `snippet failed: ${r.stderr}`);
  const out = JSON.parse(r.stdout.trim().split("\n")[0]);
  assert.equal(out.signal, false);
  assert.equal(out.reason, "below-cycle-floor");
});
