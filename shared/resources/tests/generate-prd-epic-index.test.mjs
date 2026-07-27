"use strict";
/**
 * Unit tests for shared/resources/generate-prd-epic-index.mjs.
 *
 * The script runs on import (it is an executable, not a module with exports), so
 * each case spawns it as a subprocess against a throwaway PRD tree and asserts on
 * exit code + emitted file contents.
 *
 * Run: node --test shared/resources/tests/generate-prd-epic-index.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "..", "generate-prd-epic-index.mjs");

/** Spawn the generator (using the current node binary — avoids PATH/nvm surprises). */
function run(cwd, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function tmp() {
  return mkdtempSync(join(os.tmpdir(), "prd-epic-index-"));
}

/**
 * Build a PRD dir: <root>/<prd>/<prd>.md + epics/<dir>/<dir>.md per epic.
 * Each epic: { dir, title, number?, status?, reviewTitle? }.
 * `reviewTitle` writes a *.review.*.md sibling that must NOT appear in the index.
 */
function makePrd(root, prd, epics) {
  const prdDir = join(root, prd);
  mkdirSync(join(prdDir, "epics"), { recursive: true });
  writeFileSync(
    join(prdDir, `${prd}.md`),
    `---\ntype: prd\n---\n\n# ${prd} PRD\n\nBody paragraph.\n`,
  );
  for (const e of epics) {
    const epicDir = join(prdDir, "epics", e.dir);
    mkdirSync(epicDir, { recursive: true });
    let fm = `---\ntitle: "${e.title}"\n`;
    if (e.number !== undefined) fm += `epic_number: ${e.number}\n`;
    if (e.status) fm += `status: ${e.status}\n`;
    fm += `---\n\n# ${e.title}\n`;
    writeFileSync(join(epicDir, `${e.dir}.md`), fm);
    if (e.reviewTitle) {
      writeFileSync(
        join(epicDir, `${e.dir}.review.1.qa.md`),
        `---\ntitle: "${e.reviewTitle}"\nepic_number: 999\n---\n\n# ${e.reviewTitle}\n`,
      );
    }
  }
  return prdDir;
}

const readPrd = (prdDir, prd) => readFileSync(join(prdDir, `${prd}.md`), "utf8");

// ===========================================================================
// Idempotency
// ===========================================================================
test("idempotency — second run makes no change", () => {
  const root = tmp();
  try {
    makePrd(root, "prd.alpha", [
      { dir: "epic.1.foo", title: "[Epic 1] Foo", number: 1, status: "planned" },
      { dir: "epic.2.bar", title: "[Epic 2] Bar", number: 2, status: "in-progress" },
    ]);
    const first = run(root, ["--prd-root", root]);
    assert.equal(first.status, 0, first.stderr);
    const after1 = readPrd(join(root, "prd.alpha"), "prd.alpha");

    const second = run(root, ["--prd-root", root]);
    assert.equal(second.status, 0, second.stderr);
    const after2 = readPrd(join(root, "prd.alpha"), "prd.alpha");

    assert.equal(after2, after1, "second run must be byte-identical");
    assert.match(second.stdout, /Done: 0 PRD\(s\) updated\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// Output shape — markers, header, auto-gen line, table, numeric sort, links
// ===========================================================================
test("output shape — markers, table header, sort, relative links", () => {
  const root = tmp();
  try {
    makePrd(root, "prd.alpha", [
      { dir: "epic.10.ten", title: "[Epic 10] Ten", number: 10, status: "planned" },
      { dir: "epic.2.two", title: "[Epic 2] Two", number: 2, status: "accepted" },
      { dir: "epic.1.one", title: "[Epic 1] One", number: 1 },
    ]);
    assert.equal(run(root, ["--prd-root", root]).status, 0);
    const out = readPrd(join(root, "prd.alpha"), "prd.alpha");

    assert.match(out, /<!-- epics-index-start -->/);
    assert.match(out, /<!-- epics-index-end -->/);
    assert.match(out, /## Epics/);
    assert.match(
      out,
      /_Auto-generated index — regenerate with `node scripts\/generate-prd-epic-index\.mjs`\._/,
    );
    assert.match(out, /\| #   \| Epic \| Status \|/);
    assert.match(out, /\| --- \| ---- \| ------ \|/);

    // Relative link shape: [Title](epics/<dir>/<dir>.md)
    assert.match(out, /\| 1 \| \[One\]\(epics\/epic\.1\.one\/epic\.1\.one\.md\) \| — \|/);
    assert.match(
      out,
      /\| 2 \| \[Two\]\(epics\/epic\.2\.two\/epic\.2\.two\.md\) \| accepted \|/,
    );

    // Numeric (not lexical) sort: 1 then 2 then 10.
    const order = ["One", "Two", "Ten"].map((t) => out.indexOf(`[${t}]`));
    assert.ok(order[0] < order[1] && order[1] < order[2], "epics must sort numerically");

    // Block sits after the H1.
    assert.ok(
      out.indexOf("# prd.alpha PRD") < out.indexOf("<!-- epics-index-start -->"),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// *.review.*.md exclusion
// ===========================================================================
test("excludes *.review.*.md siblings", () => {
  const root = tmp();
  try {
    makePrd(root, "prd.alpha", [
      {
        dir: "epic.1.foo",
        title: "[Epic 1] Foo",
        number: 1,
        reviewTitle: "SHOULD NOT APPEAR",
      },
    ]);
    assert.equal(run(root, ["--prd-root", root]).status, 0);
    const out = readPrd(join(root, "prd.alpha"), "prd.alpha");
    assert.doesNotMatch(out, /SHOULD NOT APPEAR/);
    assert.doesNotMatch(out, /\| 999 \|/);
    assert.match(out, /\| 1 \| \[Foo\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// --check exit codes
// ===========================================================================
test("--check exits 0 when up to date, non-zero on drift", () => {
  const root = tmp();
  try {
    const prdDir = makePrd(root, "prd.alpha", [
      { dir: "epic.1.foo", title: "[Epic 1] Foo", number: 1, status: "planned" },
    ]);
    // Generate once so the index is current.
    assert.equal(run(root, ["--prd-root", root]).status, 0);

    const clean = run(root, ["--prd-root", root, "--check"]);
    assert.equal(clean.status, 0, "clean tree → exit 0");
    assert.match(clean.stdout, /All epics indexes up to date\./);

    // Mutate an epic's status → index is now stale.
    const epicFile = join(prdDir, "epics", "epic.1.foo", "epic.1.foo.md");
    writeFileSync(
      epicFile,
      readFileSync(epicFile, "utf8").replace("status: planned", "status: accepted"),
    );
    const drift = run(root, ["--prd-root", root, "--check"]);
    assert.equal(drift.status, 1, "stale tree → exit 1");
    assert.match(drift.stdout, /STALE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// --strict on a missing epic_number
// ===========================================================================
test("--strict fails on missing epic_number; lenient skips it", () => {
  const root = tmp();
  try {
    makePrd(root, "prd.alpha", [
      { dir: "epic.1.ok", title: "[Epic 1] Ok", number: 1 },
      { dir: "epic.2.bad", title: "[Epic 2] Bad" /* no number */ },
    ]);

    // Lenient: skips the bad epic, exits 0, still writes the good one.
    const lenient = run(root, ["--prd-root", root]);
    assert.equal(lenient.status, 0);
    assert.match(lenient.stderr, /epic\.2\.bad.*no epic_number/s);
    const out = readPrd(join(root, "prd.alpha"), "prd.alpha");
    assert.match(out, /\[Ok\]/);
    assert.doesNotMatch(out, /\[Bad\]/);

    // Strict: the missing epic_number is a hard error (non-zero exit).
    const strict = run(root, ["--prd-root", root, "--strict"]);
    assert.notEqual(strict.status, 0, "strict → non-zero exit");
    assert.match(strict.stderr, /--strict/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// PRD-root resolution: --prd-root override and skills-config.yaml
// ===========================================================================
test("resolves PRD root from skills-config.yaml when no --prd-root", () => {
  const root = tmp();
  try {
    // PRD tree under <root>/prds; config points there.
    makePrd(join(root, "prds"), "prd.alpha", [
      { dir: "epic.1.foo", title: "[Epic 1] Foo", number: 1 },
    ]);
    writeFileSync(
      join(root, "skills-config.yaml"),
      "prd:\n  prdShardedLocation: prds\narchitecture:\n  architectureShardedLocation: docs/architecture\n",
    );
    const res = run(root, []); // no --prd-root: must read config
    assert.equal(res.status, 0, res.stderr);
    const out = readPrd(join(root, "prds", "prd.alpha"), "prd.alpha");
    assert.match(out, /<!-- epics-index-start -->/);
    assert.match(out, /\[Foo\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--prd-root overrides config", () => {
  const root = tmp();
  try {
    makePrd(join(root, "custom"), "prd.beta", [
      { dir: "epic.1.foo", title: "[Epic 1] Foo", number: 1 },
    ]);
    // Config points elsewhere; the CLI flag must win.
    writeFileSync(
      join(root, "skills-config.yaml"),
      "prd:\n  prdShardedLocation: docs/prd\n",
    );
    const res = run(root, ["--prd-root", join(root, "custom")]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(readPrd(join(root, "custom", "prd.beta"), "prd.beta"), /\[Foo\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing PRD root is a graceful no-op (exit 0)", () => {
  const root = tmp();
  try {
    const res = run(root, ["--prd-root", join(root, "does-not-exist")]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /nothing to index/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
