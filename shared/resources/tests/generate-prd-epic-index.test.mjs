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

const readPrd = (prdDir, prd) =>
  readFileSync(join(prdDir, `${prd}.md`), "utf8");

// ===========================================================================
// Idempotency
// ===========================================================================
test("idempotency — second run makes no change", () => {
  const root = tmp();
  try {
    makePrd(root, "prd.alpha", [
      {
        dir: "epic.1.foo",
        title: "[Epic 1] Foo",
        number: 1,
        status: "planned",
      },
      {
        dir: "epic.2.bar",
        title: "[Epic 2] Bar",
        number: 2,
        status: "in-progress",
      },
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
      {
        dir: "epic.10.ten",
        title: "[Epic 10] Ten",
        number: 10,
        status: "planned",
      },
      {
        dir: "epic.2.two",
        title: "[Epic 2] Two",
        number: 2,
        status: "accepted",
      },
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
    assert.match(
      out,
      /\| 1 \| \[One\]\(epics\/epic\.1\.one\/epic\.1\.one\.md\) \| — \|/,
    );
    assert.match(
      out,
      /\| 2 \| \[Two\]\(epics\/epic\.2\.two\/epic\.2\.two\.md\) \| accepted \|/,
    );

    // Numeric (not lexical) sort: 1 then 2 then 10.
    const order = ["One", "Two", "Ten"].map((t) => out.indexOf(`[${t}]`));
    assert.ok(
      order[0] < order[1] && order[1] < order[2],
      "epics must sort numerically",
    );

    // Block sits after the H1.
    assert.ok(
      out.indexOf("# prd.alpha PRD") <
        out.indexOf("<!-- epics-index-start -->"),
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
      {
        dir: "epic.1.foo",
        title: "[Epic 1] Foo",
        number: 1,
        status: "planned",
      },
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
      readFileSync(epicFile, "utf8").replace(
        "status: planned",
        "status: accepted",
      ),
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
    assert.match(
      readPrd(join(root, "custom", "prd.beta"), "prd.beta"),
      /\[Foo\]/,
    );
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

// ===========================================================================
// YAML quote escaping
// ===========================================================================

// A value that contains the quote character it is wrapped in MUST escape it, and
// the old one-line strip (`replace(/^['"]|['"]$/g, '')`) left that escape in the
// rendered table. Single-quoted YAML doubles the apostrophe, so `'Anna''s wallet'`
// rendered as `Anna''s wallet` — the doubling visible to every reader of the
// generated index.
//
// Found in a consumer repo (rebirth-wallet) which had patched this locally. The
// installer vendors this file over `scripts/`, so the local fix was silently
// reverted on every `setup-consumer.sh --update` — twice before anyone noticed.
// Fixing it here is what makes it survive.
test("frontmatter — a single-quoted title undoubles YAML's escaped apostrophe", () => {
  const root = tmp();
  try {
    const prdDir = join(root, "prd.quoted");
    mkdirSync(join(prdDir, "epics", "epic.1.wallet"), { recursive: true });
    writeFileSync(
      join(prdDir, "prd.quoted.md"),
      `---\ntype: prd\n---\n\n# Quoted PRD\n\nBody.\n`,
    );
    writeFileSync(
      join(prdDir, "epics", "epic.1.wallet", "epic.1.wallet.md"),
      `---\ntitle: '[Epic 1] Anna''s wallet'\nepic_number: 1\nstatus: planned\n---\n\n# [Epic 1] Anna's wallet\n`,
    );

    const res = run(root, ["--prd-root", root]);
    assert.equal(res.status, 0, res.stderr);

    const out = readPrd(prdDir, "prd.quoted");
    assert.match(out, /Anna's wallet/, "renders one apostrophe");
    assert.doesNotMatch(out, /Anna''s wallet/, "never leaks YAML's doubling");
    assert.doesNotMatch(
      out,
      /'\[Epic 1\]/,
      "the wrapping quote is still stripped",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The mirror case, and the second bug in the old one-liner: because it stripped a
// leading OR trailing quote independently, an UNQUOTED value that merely ends in
// one lost the character. Only a matching pair is a quote pair.
test("frontmatter — an unquoted title keeping a trailing quote is left intact", () => {
  const root = tmp();
  try {
    const prdDir = join(root, "prd.trailing");
    mkdirSync(join(prdDir, "epics", "epic.2.shout"), { recursive: true });
    writeFileSync(
      join(prdDir, "prd.trailing.md"),
      `---\ntype: prd\n---\n\n# Trailing PRD\n\nBody.\n`,
    );
    writeFileSync(
      join(prdDir, "epics", "epic.2.shout", "epic.2.shout.md"),
      `---\ntitle: Say it "loud"\nepic_number: 2\nstatus: planned\n---\n\n# Say it "loud"\n`,
    );

    const res = run(root, ["--prd-root", root]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(readPrd(prdDir, "prd.trailing"), /Say it "loud"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ===========================================================================
// Replacement-pattern injection ($&, $`, $', $$) in an epic title
// ===========================================================================

// The regenerate path feeds the freshly built block to `String.replace` as the
// replacement argument. A STRING replacement is a PATTERN: `$&` expands to the
// whole match, `` $` `` / `$'` to the text around it, `$$` to a literal `$`. So an
// epic titled `Tilemap $& Ruleset` did not insert its own title — it spliced the
// entire previous index block back inside a table cell, corrupting the PRD.
//
// It compounds. The regex is lazy (`[\s\S]*?END`), so it matches only up to the
// FIRST end marker; the next run re-expands around the already-nested block and
// adds another. Left running, the PRD grows without bound and `--check` reports
// STALE forever — a permanently red gate with no explanation of what is stale.
// Passing a FUNCTION suppresses all `$` expansion — see the call site.
//
// Found by adversarial review downstream (tinker-city task.83), which had just
// wired `--check` into `lint:docs` and therefore into a required CI job.
test("epic title containing $& is inserted literally, not expanded", () => {
  const root = tmp();
  try {
    const prdDir = makePrd(root, "prd.dollar", [
      {
        dir: "epic.38.tilemap",
        title: "[Epic 38] Tilemap $& Ruleset",
        number: 38,
        status: "planned",
      },
    ]);

    // First run inserts the block; second run takes the regenerate/replace path.
    assert.equal(run(root, ["--prd-root", root]).status, 0);
    assert.equal(run(root, ["--prd-root", root]).status, 0);

    const out = readPrd(prdDir, "prd.dollar");

    assert.match(
      out,
      /\| 38 \| \[Tilemap \$& Ruleset\]\(epics\/epic\.38\.tilemap\/epic\.38\.tilemap\.md\) \| planned \|/,
      "the title must appear verbatim in its table cell",
    );
    // The block must appear exactly once — `$&` re-inserting the match would
    // nest a second copy of the markers inside the table cell.
    assert.equal(
      out.split("<!-- epics-index-start -->").length - 1,
      1,
      "exactly one index block — no recursive re-insertion",
    );
    assert.equal(out.split("## Epics").length - 1, 1);

    // Second half: --check must agree the file is up to date. On the unfixed
    // script it reported STALE indefinitely, because each run nested one more
    // block and no amount of regenerating ever converged.
    const check = run(root, ["--prd-root", root, "--check"]);
    assert.equal(check.status, 0, check.stdout + check.stderr);
    assert.match(check.stdout, /All epics indexes up to date\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The remaining three replacement patterns, for completeness: `` $` `` (text
// before the match), `$'` (text after), and `$$` (a literal dollar). Each one
// silently rewrites the cell under a string replacement.
test("epic titles containing $`, $' and $$ survive regeneration", () => {
  const root = tmp();
  try {
    const prdDir = makePrd(root, "prd.dollars", [
      { dir: "epic.1.before", title: "[Epic 1] Cost $` each", number: 1 },
      { dir: "epic.2.after", title: "[Epic 2] Cost $' each", number: 2 },
      { dir: "epic.3.literal", title: "[Epic 3] Cost $$ each", number: 3 },
    ]);

    assert.equal(run(root, ["--prd-root", root]).status, 0);
    assert.equal(run(root, ["--prd-root", root]).status, 0);

    const out = readPrd(prdDir, "prd.dollars");
    assert.match(out, /\| 1 \| \[Cost \$` each\]/);
    assert.match(out, /\| 2 \| \[Cost \$' each\]/);
    assert.match(out, /\| 3 \| \[Cost \$\$ each\]/);
    assert.equal(out.split("<!-- epics-index-start -->").length - 1, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
