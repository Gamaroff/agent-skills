/**
 * Tests for migrate-doc-numbering.mjs — the hierarchical-numbering migration
 * (task 203).
 *
 * The pure core (discover → plan → planEdits → verify) runs over in-memory trees
 * through an injected io; the apply path runs twice — once over the same in-memory
 * io, counting every move and walk, and once against a real temporary git
 * repository, where a second run must be `already` with an empty diff.
 *
 * Run: node --test shared/resources/tests/migrate-doc-numbering.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadSensitive } from "../spawn-budget.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const ENGINE = join(repoRoot, "shared/resources/migrate-doc-numbering.mjs");
const m = await import(ENGINE);
const require = createRequire(import.meta.url);
const docId = require(join(repoRoot, "shared/resources/doc-id.js"));
const { extractRelativeLinks } = require(
  join(repoRoot, "shared/resources/doc-links.js"),
);

// ---------------------------------------------------------------------------
// An in-memory io: files are { path: text }; directories are implied.
// ---------------------------------------------------------------------------

function memIo(files, { tracked, dirty = [], failMoveAt = 0 } = {}) {
  const fs = new Map(Object.entries(files));
  const calls = {
    readDir: [],
    tracked: 0,
    moves: [],
    writes: [],
    rmdirs: [],
    dirtyAsked: [],
  };
  const isDir = (p) => {
    const pre = `${p}/`;
    for (const k of fs.keys()) if (k.startsWith(pre)) return true;
    return false;
  };
  return {
    calls,
    files: fs,
    readFile: (p) => (fs.has(p) ? fs.get(p) : null),
    readDir(p) {
      calls.readDir.push(p);
      if (!isDir(p)) return null;
      const pre = `${p}/`;
      const seen = new Map();
      for (const k of fs.keys()) {
        if (!k.startsWith(pre)) continue;
        const [name, ...rest] = k.slice(pre.length).split("/");
        seen.set(name, seen.get(name) || rest.length > 0);
      }
      return [...seen].map(([name, dir]) => ({ name, dir }));
    },
    exists: (p) => fs.has(p) || isDir(p),
    tracked() {
      calls.tracked++;
      return tracked || [...fs.keys()];
    },
    dirty(paths) {
      calls.dirtyAsked.push(...paths);
      return new Set(dirty);
    },
    mkdirp() {},
    move(from, to, opts) {
      if (failMoveAt && calls.moves.length + 1 === failMoveAt)
        throw new Error("git mv refused");
      calls.moves.push({ from, to, tracked: opts.tracked });
      fs.set(to, fs.get(from));
      fs.delete(from);
    },
    rmdirIfEmpty(p) {
      calls.rmdirs.push(p);
      return !isDir(p);
    },
    writeFile(p, t) {
      calls.writes.push(p);
      fs.set(p, t);
    },
  };
}

const R = "docs/prd";
const E1 = `${R}/onb/epics/epic.1.alpha`;
const S11 = `${E1}/stories/story.1.1.first`;

/** This repository's shape: an L2 PRD with one epic and one story. */
function l2Tree(extra = {}) {
  return {
    [`${R}/onb/prd.onb.md`]:
      "---\nname: prd.onb\ntitle: Onboarding\nstatus: draft\ncreated: 2026-01-01\n---\n# PRD\n",
    [`${E1}/epic.1.alpha.md`]:
      '---\nepic_number: 1\ntitle: "Alpha"\nprd_source: "docs/prd/onb/prd.onb.md"\n---\n# [Epic 1] Alpha\n\n[PRD](../../prd.onb.md)\n',
    [`${S11}/story.1.1.first.md`]: [
      "---",
      "id: story.1.1.first",
      'title: "[Story 1.1] First"',
      "status: accepted",
      "epic: 1",
      "epic_file: ../../epic.1.alpha.md",
      "prd_source: docs/prd/onb/prd.onb.md",
      "---",
      "# [Story 1.1] First",
      "",
      "See story.1.1 and Epic 1: the alpha. Its plan is `story.1.1.plan.first.md`.",
      "The example copy is `examples/prd-example/prd.onb.md`.",
      "",
      "[epic](../../epic.1.alpha.md) [gone](../../missing.md) [up](../../../../../../../README.md)",
      "",
    ].join("\n"),
    [`${S11}/story.1.1.plan.first.md`]: "plan\n",
    [`${S11}/story.1.1.qa.1.first.md`]: "qa\n",
    [`${S11}/story.1.1.gate.1.first.yml`]: "schema: 1\nstory: '1.1'\n",
    [`${S11}/story.1.1.validate.2026-05-12.md`]: "short-id validate\n",
    [`${S11}/story.1.1.first.validate.2026-05-13.md`]: "full-stem validate\n",
    [`${S11}/sprint-review-summary.md`]: "summary\n",
    "README.md":
      "[stories](docs/prd/onb/epics/epic.1.alpha/stories/)\nSee `docs/prd/onb/prd.onb.md`.\n[dead](docs/prd/onb/epics/epic.1.alpha/nope.md)\n",
    ...extra,
  };
}

/** discover → plan → planEdits → verify, as run() does, without writing. */
function dry(io, { names, allowInFlight, registry } = {}) {
  const disc = m.discover(R, io, { names: names || new Map() });
  const reg =
    registry === undefined ? io.readFile(`${R}/prd-registry.md`) : registry;
  const planned = m.plan(disc, reg, io);
  const edits = m.planEdits(planned, disc, io);
  const blockers = [
    ...m.verify(planned, disc, io, { allowInFlight }),
    ...edits.blockers,
  ];
  return { disc, planned, edits, blockers, codes: blockers.map((b) => b.code) };
}

const NEW_E1 = `${R}/onb/prd.1.onb/epics/epic.1.1.alpha`;
const NEW_S11 = `${NEW_E1}/stories/story.1.1.1.first`;

// ---------------------------------------------------------------------------
// Discovery and the rename map
// ---------------------------------------------------------------------------

test("L2 tree (this repository's shape): a prd.1.{f}/ directory is inserted and epics/ moves under it", () => {
  const { planned, codes } = dry(memIo(l2Tree()));
  assert.deepEqual(codes, []);
  const fm = planned.fileMap;
  assert.equal(
    fm.get(`${R}/onb/prd.onb.md`),
    `${R}/onb/prd.1.onb/prd.1.onb.md`,
  );
  assert.equal(fm.get(`${E1}/epic.1.alpha.md`), `${NEW_E1}/epic.1.1.alpha.md`);
  assert.equal(
    fm.get(`${S11}/story.1.1.first.md`),
    `${NEW_S11}/story.1.1.1.first.md`,
  );
  assert.equal(
    fm.has("README.md"),
    false,
    "a file outside the tree never moves",
  );
});

test("L1 tree: the PRD directory is renamed and its epics and stories are prefixed", () => {
  const files = {
    [`${R}/dom/prd.feat/prd.feat.md`]: "---\nname: prd.feat\n---\n",
    [`${R}/dom/prd.feat/epics/epic.3.x/epic.3.x.md`]:
      "---\nepic_number: 3\n---\n",
    [`${R}/dom/prd.feat/epics/epic.3.x/stories/story.3.2.y/story.3.2.y.md`]:
      "---\nid: story.3.2.y\nstatus: cancelled\nepic: epic.3.x\n---\n",
  };
  const { planned, codes } = dry(memIo(files));
  assert.deepEqual(codes, []);
  assert.equal(
    planned.fileMap.get(
      `${R}/dom/prd.feat/epics/epic.3.x/stories/story.3.2.y/story.3.2.y.md`,
    ),
    `${R}/dom/prd.1.feat/epics/epic.1.1.x/stories/story.1.1.2.y/story.1.1.2.y.md`,
  );
});

test("both artifact infix forms are renamed and an unprefixed sprint-review-summary.md keeps its name", () => {
  const { planned } = dry(memIo(l2Tree()));
  const fm = planned.fileMap;
  assert.equal(
    fm.get(`${S11}/story.1.1.validate.2026-05-12.md`),
    `${NEW_S11}/story.1.1.1.validate.2026-05-12.md`,
  );
  assert.equal(
    fm.get(`${S11}/story.1.1.first.validate.2026-05-13.md`),
    `${NEW_S11}/story.1.1.1.first.validate.2026-05-13.md`,
  );
  assert.equal(
    fm.get(`${S11}/sprint-review-summary.md`),
    `${NEW_S11}/sprint-review-summary.md`,
  );
  assert.equal(
    fm.get(`${S11}/story.1.1.gate.1.first.yml`),
    `${NEW_S11}/story.1.1.1.gate.1.first.yml`,
  );
});

test("two PRDs, old epics 3, 7, 9 under A and 5 under B: A → 1, 2, 3; B → 1", () => {
  const files = {};
  const prd = (d, f) => {
    files[`${R}/${d}/prd.${f}/prd.${f}.md`] = `---\nname: prd.${f}\n---\n`;
  };
  const epic = (d, f, n) => {
    files[`${R}/${d}/prd.${f}/epics/epic.${n}.e${n}/epic.${n}.e${n}.md`] =
      `---\nepic_number: ${n}\n---\n`;
  };
  prd("a", "aa");
  prd("b", "bb");
  for (const n of [9, 3, 7]) epic("a", "aa", n);
  epic("b", "bb", 5);
  const { planned } = dry(memIo(files));
  const got = Object.fromEntries(
    planned.epics.map((e) => [e.oldStem, e.newStem]),
  );
  assert.deepEqual(got, {
    "epic.3.e3": "epic.1.1.e3",
    "epic.7.e7": "epic.1.2.e7",
    "epic.9.e9": "epic.1.3.e9",
    "epic.5.e5": "epic.2.1.e5",
  });
});

test("partially migrated: a numbered PRD and epic keep their numbers; a legacy epic is appended", () => {
  const files = {
    [`${R}/prd-registry.md`]: docId.appendPrdRow(null, {
      n: 4,
      title: "Feat",
      href: "dom/prd.4.feat/prd.4.feat.md",
      folder: "dom",
      status: "draft",
      created: "2026-01-01",
    }),
    [`${R}/dom/prd.4.feat/prd.4.feat.md`]:
      "---\nname: prd.4.feat\nprd_number: 4\n---\n",
    [`${R}/dom/prd.4.feat/epics/epic.4.2.kept/epic.4.2.kept.md`]:
      "---\nprd_number: 4\nepic_number: 2\n---\n",
    [`${R}/dom/prd.4.feat/epics/epic.1.old/epic.1.old.md`]:
      "---\nepic_number: 1\n---\n",
  };
  const { planned, codes } = dry(memIo(files));
  assert.deepEqual(codes, []);
  const byOld = Object.fromEntries(
    planned.epics.map((e) => [e.oldStem, e.newStem]),
  );
  assert.equal(
    byOld["epic.4.2.kept"],
    "epic.4.2.kept",
    "a numbered epic keeps E",
  );
  assert.equal(
    byOld["epic.1.old"],
    "epic.4.3.old",
    "a legacy epic takes max(kept) + 1",
  );
  assert.equal(planned.prds[0].n, 4, "a numbered PRD keeps P");
  assert.equal(planned.fileMap.has(`${R}/dom/prd.4.feat/prd.4.feat.md`), false);
});

test("L3: an index PRD without --name is unplaced-prd; a slug alone is needs-domain; <domain>/<slug> is planned", () => {
  const files = { [`${R}/index.md`]: "# PRD\n", [`${R}/goals.md`]: "shard\n" };
  assert.deepEqual(dry(memIo(files)).codes, ["unplaced-prd"]);
  // task.211: a root index has no domain directory, and create-prd refuses a PRD without one.
  const slugOnly = dry(memIo(files), {
    names: new Map([[`${R}/index.md`, "core"]]),
  });
  assert.deepEqual(slugOnly.codes, ["needs-domain"]);
  assert.match(
    slugOnly.blockers[0].detail,
    /--name docs\/prd\/index\.md=<domain>\/<slug>/,
  );
  const named = dry(memIo(files), {
    names: new Map([[`${R}/index.md`, "main/core"]]),
  });
  assert.deepEqual(named.codes, []);
  assert.equal(
    named.planned.fileMap.get(`${R}/index.md`),
    `${R}/main/prd.1.core/prd.1.core.md`,
  );
});

// ---------------------------------------------------------------------------
// Text edits
// ---------------------------------------------------------------------------

test("frontmatter: an integer epic: becomes the epic stem; id, prd_number, epic_file, prd_source follow", () => {
  const { edits } = dry(memIo(l2Tree()));
  const text = edits.edits.get(`${S11}/story.1.1.first.md`);
  const fm = (k) => docId.frontmatterField(text, k);
  assert.equal(fm("id"), "story.1.1.1.first");
  assert.equal(fm("prd_number"), "1");
  assert.equal(fm("epic"), "epic.1.1.alpha");
  assert.equal(fm("epic_file"), "../../epic.1.1.alpha.md");
  assert.equal(fm("prd_source"), `${R}/onb/prd.1.onb/prd.1.onb.md`);
  const epic = edits.edits.get(`${E1}/epic.1.alpha.md`);
  assert.equal(docId.frontmatterField(epic, "prd_number"), "1");
  assert.match(
    epic,
    /^prd_source: "docs\/prd\/onb\/prd\.1\.onb\/prd\.1\.onb\.md"$/m,
    "quote style kept",
  );
  const prd = edits.edits.get(`${R}/onb/prd.onb.md`);
  assert.equal(docId.frontmatterField(prd, "name"), "prd.1.onb");
  assert.equal(docId.frontmatterField(prd, "prd_number"), "1");
  assert.equal(
    edits.edits.get(`${S11}/story.1.1.gate.1.first.yml`),
    "schema: 1\nstory: '1.1.1'\n",
  );
});

test("titles and prose tokens are untouched: [Story 1.1], Epic 1:, and story.1.1 with no slug", () => {
  const { edits } = dry(memIo(l2Tree()));
  const text = edits.edits.get(`${S11}/story.1.1.first.md`);
  assert.match(text, /^title: "\[Story 1\.1\] First"$/m);
  assert.match(text, /^# \[Story 1\.1\] First$/m);
  assert.match(text, /See story\.1\.1 and Epic 1: the alpha\./);
  assert.match(
    text,
    /Its plan is `story\.1\.1\.1\.plan\.first\.md`\./,
    "a whole old basename is renamed",
  );
  assert.match(
    edits.edits.get(`${E1}/epic.1.alpha.md`),
    /^# \[Epic 1\] Alpha$/m,
    "the epic H1 mirrors the tracker card and is never rewritten",
  );
});

test("a name inside a slash path is a path, not a name: a same-named example copy is untouched", () => {
  const { edits } = dry(memIo(l2Tree()));
  const text = edits.edits.get(`${S11}/story.1.1.first.md`);
  assert.match(text, /`examples\/prd-example\/prd\.onb\.md`/);
});

test("a live link is re-pointed and still resolves; a dead link stays byte-identical", () => {
  const { edits } = dry(memIo(l2Tree()));
  const text = edits.edits.get(`${S11}/story.1.1.first.md`);
  assert.match(text, /\[epic\]\(\.\.\/\.\.\/epic\.1\.1\.alpha\.md\)/);
  assert.match(
    text,
    /\[gone\]\(\.\.\/\.\.\/missing\.md\)/,
    "dead link untouched",
  );
  // The escaping link to the repo-root README gains one ../ — the story moved one level deeper.
  assert.match(
    text,
    /\[up\]\(\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/README\.md\)/,
  );
  const readme = edits.edits.get("README.md");
  assert.match(
    readme,
    /\[stories\]\(docs\/prd\/onb\/prd\.1\.onb\/epics\/epic\.1\.1\.alpha\/stories\/\)/,
  );
  assert.match(
    readme,
    /`docs\/prd\/onb\/prd\.1\.onb\/prd\.1\.onb\.md`/,
    "a repo-relative literal is mapped",
  );
  // A dead link that names a moving path is still byte-identical: no pass may touch it.
  assert.match(
    readme,
    /^\[dead\]\(docs\/prd\/onb\/epics\/epic\.1\.alpha\/nope\.md\)$/m,
  );
});

test("a dead link that would start resolving after the move is reported as would-heal, not healed", () => {
  // From the old story dir, ../../../../prd.1.onb/x.md is dead; from the new one it reaches the moved PRD dir.
  const tree = l2Tree({
    [`${S11}/story.1.1.qa.1.first.md`]:
      "[x](../../../../../prd.1.onb/prd.1.onb.md)\n",
  });
  const { edits } = dry(memIo(tree));
  assert.equal(edits.links.wouldHeal.length, 1);
  assert.equal(
    edits.links.wouldHeal[0].target,
    "../../../../../prd.1.onb/prd.1.onb.md",
  );
  // Byte-identical: the file's only change would be... none at all.
  assert.equal(edits.edits.has(`${S11}/story.1.1.qa.1.first.md`), false);
});

test("an example copy keeps its body; only its provenance frontmatter is re-pointed", () => {
  const tree = l2Tree({
    "examples/epic-examples/epic.1.alpha.md":
      '---\nprd_source: "docs/prd/onb/prd.onb.md"\nsource_path: docs/prd/onb/epics/epic.1.alpha/epic.1.alpha.md\n---\nA copy of `docs/prd/onb/prd.onb.md`.\n',
  });
  const text = dry(memIo(tree)).edits.edits.get(
    "examples/epic-examples/epic.1.alpha.md",
  );
  assert.match(
    text,
    /^prd_source: "docs\/prd\/onb\/prd\.1\.onb\/prd\.1\.onb\.md"$/m,
  );
  assert.match(
    text,
    /^source_path: docs\/prd\/onb\/prd\.1\.onb\/epics\/epic\.1\.1\.alpha\/epic\.1\.1\.alpha\.md$/m,
  );
  assert.match(
    text,
    /A copy of `docs\/prd\/onb\/prd\.onb\.md`\./,
    "the frozen body is untouched",
  );
});

test("test fixtures and history keep their literals; doc-links.test.mjs is the named exception", () => {
  const lit = "`docs/prd/onb/prd.onb.md`\n";
  const tree = l2Tree({
    "skills/x/tests/fixture.test.js": lit,
    "evals/y/case.md": lit,
    "docs/tasks/task.1.t/task.1.t.md": lit,
    "CHANGELOG.md": lit,
    "shared/resources/tests/doc-links.test.mjs":
      '"docs/prd/onb/prd.onb.md → ../x.md",\n',
  });
  const { edits } = dry(memIo(tree));
  for (const f of [
    "skills/x/tests/fixture.test.js",
    "evals/y/case.md",
    "docs/tasks/task.1.t/task.1.t.md",
    "CHANGELOG.md",
  ])
    assert.equal(edits.edits.has(f), false, f);
  assert.match(
    edits.edits.get("shared/resources/tests/doc-links.test.mjs"),
    /docs\/prd\/onb\/prd\.1\.onb\/prd\.1\.onb\.md/,
  );
});

test("history keeps its literal text but its live links are re-pointed", () => {
  const tree = l2Tree({
    "CHANGELOG.md": "([`docs/prd/onb/prd.onb.md`](docs/prd/onb/prd.onb.md))\n",
  });
  const text = dry(memIo(tree)).edits.edits.get("CHANGELOG.md");
  assert.equal(
    text,
    "([`docs/prd/onb/prd.onb.md`](docs/prd/onb/prd.1.onb/prd.1.onb.md))\n",
  );
});

// ---------------------------------------------------------------------------
// Blockers — one test each
// ---------------------------------------------------------------------------

test("blocker prd-less-epic: location decides — an epics/ directory no PRD owns blocks whatever prd_source says", () => {
  const files = {
    [`${R}/dom/feat/epics/epic.1.bf/epic.1.bf.md`]:
      '---\nepic_number: 1\nprd_source: "docs/prd/dom/prd.feat.md"\n---\n',
  };
  const { codes } = dry(memIo(files));
  assert.deepEqual(codes, ["prd-less-epic"]);
});

test("location decides the parent: a brownfield-enhancement epic under an L2 PRD moves with it", () => {
  const tree = l2Tree({
    [`${R}/onb/epics/epic.2.bf/epic.2.bf.md`]:
      '---\nepic_number: 2\nprd_source: "brownfield-enhancement"\n---\n',
  });
  const { planned, codes, edits } = dry(memIo(tree));
  assert.deepEqual(codes, []);
  assert.equal(
    planned.fileMap.get(`${R}/onb/epics/epic.2.bf/epic.2.bf.md`),
    `${R}/onb/prd.1.onb/epics/epic.1.2.bf/epic.1.2.bf.md`,
  );
  assert.equal(
    docId.frontmatterField(
      edits.edits.get(`${R}/onb/epics/epic.2.bf/epic.2.bf.md`),
      "prd_source",
    ),
    `${R}/onb/prd.1.onb/prd.1.onb.md`,
  );
});

test("blocker unplaced-prd: an L3 monolith beside the root without --name", () => {
  const files = { "docs/prd.md": "# Monolith\n", [`${R}/.keep`]: "" };
  assert.deepEqual(dry(memIo(files)).codes, ["unplaced-prd"]);
});

test("blocker in-flight: a story not accepted or cancelled blocks unless --allow-in-flight", () => {
  const tree = l2Tree();
  tree[`${S11}/story.1.1.first.md`] = tree[`${S11}/story.1.1.first.md`].replace(
    "status: accepted",
    "status: in-progress",
  );
  assert.deepEqual(dry(memIo(tree)).codes, ["in-flight"]);
  assert.deepEqual(dry(memIo(tree), { allowInFlight: true }).codes, []);
});

test("blocker target-exists: a destination already occupied", () => {
  const tree = l2Tree({
    [`${NEW_S11}/story.1.1.1.first.md`]: "already here\n",
  });
  assert.ok(dry(memIo(tree)).codes.includes("target-exists"));
});

test("blocker dirty-path: a path to be moved has uncommitted changes", () => {
  const io = memIo(l2Tree(), { dirty: [`${S11}/story.1.1.qa.1.first.md`] });
  assert.deepEqual(dry(io).codes, ["dirty-path"]);
});

test("blocker link-would-break: a live link whose rewrite would not resolve in the post-move tree", () => {
  const liveSet = new Set(["a/b.md", "a", "a/t.md"]);
  const postSet = new Set(["a/b.md", "a"]); // t.md is absent after the move
  const r = m.linkPass("a/b.md", "[t](t.md)\n", {
    liveSet,
    postSet,
    mapPath: (p) => p,
  });
  assert.deepEqual(
    r.blockers.map((b) => b.code),
    ["link-would-break"],
  );
  assert.equal(
    r.rewrites.length,
    0,
    "the text is never rewritten to a dead target",
  );
});

test("blocker registry-behind: a counter at or below a PRD number already in use", () => {
  const reg = docId
    .appendPrdRow(null, {
      n: 1,
      title: "X",
      href: "x/prd.1.x/prd.1.x.md",
      folder: "x",
      status: "draft",
      created: "2026-01-01",
    })
    .replace(
      "**Next Available PRD Number:** **2**",
      "**Next Available PRD Number:** **1**",
    );
  const { codes } = dry(memIo(l2Tree({ [`${R}/prd-registry.md`]: reg })));
  assert.deepEqual(codes, ["registry-behind"]);
});

test("blocker registry-missing: no registry, but a numbered PRD already on disk", () => {
  const tree = l2Tree({
    [`${R}/z/prd.3.z/prd.3.z.md`]: "---\nname: prd.3.z\nprd_number: 3\n---\n",
  });
  assert.deepEqual(dry(memIo(tree)).codes, ["registry-missing"]);
});

test("absent registry is bootstrapped: with no numbered PRD the first legacy PRD takes 1", () => {
  const { planned, codes } = dry(memIo(l2Tree()));
  assert.deepEqual(codes, []);
  assert.equal(planned.prds[0].n, 1);
});

test("every blocker reports together: one run returns all of them, not the first", () => {
  const tree = l2Tree({
    [`${R}/dom/feat/epics/epic.1.bf/epic.1.bf.md`]:
      "---\nepic_number: 1\n---\n",
    [`${R}/index.md`]: "# index\n",
  });
  tree[`${S11}/story.1.1.first.md`] = tree[`${S11}/story.1.1.first.md`].replace(
    "status: accepted",
    "status: draft",
  );
  const codes = dry(
    memIo(tree, { dirty: [`${S11}/story.1.1.qa.1.first.md`] }),
  ).codes.sort();
  assert.deepEqual(codes, [
    "dirty-path",
    "in-flight",
    "prd-less-epic",
    "unplaced-prd",
  ]);
});

// ---------------------------------------------------------------------------
// apply, run and the CLI contract
// ---------------------------------------------------------------------------

test("apply makes one move per file and walks the tree once", () => {
  const tree = l2Tree();
  // Discovery reads each directory exactly once.
  const dio = memIo(tree);
  m.discover(R, dio);
  assert.equal(
    new Set(dio.calls.readDir).size,
    dio.calls.readDir.length,
    "no directory read twice",
  );
  const io = memIo(tree, {
    tracked: Object.keys(tree).filter((f) => !f.includes("validate")),
  });
  const r = m.run(["--apply", "--root", R], { io });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  const moved = Object.keys(tree).filter((f) => f.startsWith(`${R}/onb/`));
  assert.equal(io.calls.moves.length, moved.length, "one move per file");
  assert.equal(
    new Set(io.calls.moves.map((x) => x.from)).size,
    moved.length,
    "no file moved twice",
  );
  assert.equal(
    io.calls.moves.filter((x) => !x.tracked).length,
    2,
    "the two untracked files are renamed, not git-mv'd",
  );
  assert.ok(
    io.calls.tracked <= 2,
    `the tracked list was read ${io.calls.tracked} times — never once per file`,
  );
  const reg = io.files.get(`${R}/prd-registry.md`);
  assert.deepEqual(docId.registryNumbers(reg), [1]);
  assert.equal(
    docId.next("prd", [], reg).next,
    2,
    "the counter moved past the new row",
  );
});

test("--check: needs-migration before, already after", () => {
  const io = memIo(l2Tree());
  const before = m.run(["--check", "--root", R], { io });
  assert.deepEqual([before.reason, before.exitCode], ["needs-migration", 1]);
  assert.equal(
    io.calls.moves.length + io.calls.writes.length,
    0,
    "--check writes nothing",
  );
  assert.equal(m.run(["--apply", "--root", R], { io }).reason, "ok");
  const after = m.run(["--check", "--root", R], { io });
  assert.deepEqual([after.reason, after.exitCode], ["already", 0]);
});

test("a dry run writes nothing; blocked writes nothing", () => {
  const io = memIo(l2Tree());
  const r = m.run(["--root", R], { io });
  assert.deepEqual([r.reason, r.exitCode], ["dry-run", 0]);
  assert.deepEqual(
    [r.counts.prds, r.counts.epics, r.counts.stories],
    [1, 1, 1],
  );
  const tree = l2Tree();
  tree[`${S11}/story.1.1.first.md`] = tree[`${S11}/story.1.1.first.md`].replace(
    "status: accepted",
    "status: draft",
  );
  const bio = memIo(tree);
  const b = m.run(["--apply", "--root", R], { io: bio });
  assert.deepEqual([b.reason, b.exitCode], ["blocked", 1]);
  assert.equal(bio.calls.moves.length + bio.calls.writes.length, 0);
});

test("nothing left to move but a dirty corpus is post-check-failed, never already", () => {
  const files = {
    [`${R}/prd-registry.md`]: docId.appendPrdRow(null, {
      n: 1,
      title: "X",
      href: "x/prd.1.x/prd.1.x.md",
      folder: "x",
      status: "draft",
      created: "2026-01-01",
    }),
    [`${R}/x/prd.1.x/prd.1.x.md`]: "---\nname: prd.1.x\n---\n", // prd_number missing: a crashed apply
  };
  const r = m.run(["--root", R], { io: memIo(files) });
  assert.deepEqual([r.reason, r.exitCode], ["post-check-failed", 1]);
  // Nothing left to move means this run touched nothing: no command, never a
  // whole-root restore that would erase work it did not write (cycle 2, CR-1).
  assert.doesNotMatch(r.revert, /git (restore|checkout|clean)/);
  assert.match(r.revert, /git status/);
});

test("usage: --apply with --check, an unknown flag, a missing root, a bad --name", () => {
  const io = memIo(l2Tree());
  for (const argv of [
    ["--apply", "--check"],
    ["--frobnicate"],
    ["--root", "nope"],
    ["--name", "x"],
    ["--root", ""],
    ["--root="],
    ["--root", "../outside"],
  ]) {
    const r = m.run(argv, { io });
    assert.deepEqual([r.reason, r.exitCode], ["usage", 2], argv.join(" "));
  }
});

test("epicRegistryPointer keeps the old table as a historical mapping and names task.205", () => {
  const old = [
    "# Epic Registry",
    "",
    "| Epic # | Tracker key | Domain / feature | Folder | Title | Status | Created |",
    "|-------:|---|---|---|---|---|---|",
    "| 1 | gh#73 | onb/onb | epic.1.alpha | Alpha | ✅ Accepted | 2026-05-11 |",
  ].join("\n");
  const { planned } = dry(memIo(l2Tree()));
  const text = m.epicRegistryPointer(old, planned, {
    rel: "../prd/prd-registry.md",
    repoPath: "docs/prd/prd-registry.md",
  });
  assert.equal(docId.frontmatterField(text, "status"), "retired");
  assert.match(
    text,
    /\| 1 \| 1\.1 \| epic\.1\.1\.alpha \| gh#73 \| Alpha \| ✅ Accepted \|/,
  );
  assert.match(text, /task\.205/);
  // task.205 landed: the pointer no longer tells anyone to hold off /create-epic.
  assert.doesNotMatch(text, /do not run `\/create-epic`/);
  assert.match(
    text,
    /\[`docs\/prd\/prd-registry\.md`\]\(\.\.\/prd\/prd-registry\.md\)/,
  );
});

test("engine defines no id regex: identifiers go through doc-id.js", () => {
  const src = readFileSync(ENGINE, "utf8");
  for (const kind of ["story", "epic", "prd"]) {
    assert.ok(
      !src.includes(`${kind}\\.`),
      `${kind}\\. appears in the engine — parse it through doc-id.js`,
    );
  }
});

// ---------------------------------------------------------------------------
// Integration: a real temporary git repository
// ---------------------------------------------------------------------------

function gitRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "migrate-doc-numbering-"));
  const g = (...a) =>
    execFileSync("git", a, {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CEILING_DIRECTORIES: dirname(dir),
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      },
    });
  g("init", "-q");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");
  for (const [p, t] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), t);
  }
  g("add", "-A");
  g("commit", "-qm", "fixture", "--no-verify");
  return { dir, g };
}

test("fixture --apply in a temp git repo: renames recorded as R, live links resolve, dead links intact, second run already", () => {
  // Real documents are long; git pairs a rename by content similarity, so a
  // three-line fixture whose one line changed would read as delete + add.
  const PAD =
    Array.from({ length: 40 }, (_, i) => `# unchanged line ${i}`).join("\n") +
    "\n";
  const tree = Object.fromEntries(
    Object.entries(
      l2Tree({
        [`${R}/onb/epics/epic.1.alpha/stories/story.1.1.first/story.1.1.qa.1.first.md`]:
          "[gone](../../nowhere.md)\n",
      }),
    ).map(([k, v]) => [k, v + PAD]),
  );
  const { dir, g } = gitRepo(tree);
  try {
    const r = m.run(["--apply", "--json", "--root", R], { cwd: dir });
    assert.equal(
      r.reason,
      "ok",
      JSON.stringify(r.findings || r.blockers || r.error),
    );
    g("add", "-A");
    const status = g("status", "--porcelain=v1", "-M").trim().split("\n");
    const moved = status.filter((l) => l.startsWith("R"));
    assert.equal(
      moved.length,
      Object.keys(tree).filter((f) => f.startsWith(`${R}/onb/`)).length,
      status.join("\n"),
    );
    assert.ok(
      status.every((l) => /^(R|M|A) /.test(l)),
      status.join("\n"),
    );
    // Every live link in every moved markdown file resolves on disk.
    for (const l of moved) {
      const to = l.split(" -> ")[1];
      if (!to.endsWith(".md")) continue;
      const text = readFileSync(join(dir, to), "utf8");
      for (const { target } of extractRelativeLinks(text)) {
        if (target.includes("missing") || target.includes("nowhere")) continue;
        assert.ok(
          existsSync(join(dir, dirname(to), target.split("#")[0])),
          `${to} → ${target}`,
        );
      }
    }
    assert.match(
      readFileSync(join(dir, `${NEW_S11}/story.1.1.1.qa.1.first.md`), "utf8"),
      /^\[gone\]\(\.\.\/\.\.\/nowhere\.md\)$/m,
    );
    g("commit", "-qm", "migrated", "--no-verify");
    const again = m.run(["--apply", "--json", "--root", R], { cwd: dir });
    assert.equal(again.reason, "already");
    assert.equal(
      g("status", "--porcelain").trim(),
      "",
      "a second run changes nothing",
    );
    assert.equal(
      m.run(["--check", "--root", R], { cwd: dir }).reason,
      "already",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA cycle 1 (gate 1): CR-1, CR-2, CR-3, CR-4, QA-1
// ---------------------------------------------------------------------------

test("CR-1: a named L3 monolith beside the root is moved, not reported as already", () => {
  const io = memIo({
    "docs/prd.md": "---\ntitle: Mono\nstatus: draft\n---\n# PRD\n",
    [`${R}/.keep`]: "",
  });
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.equal(r.counts.files, 1);
  assert.equal(
    io.files.has("docs/prd.md"),
    false,
    "the monolith left its old path",
  );
  const moved = io.files.get(`${R}/mono/prd.1.mono/prd.1.mono.md`);
  assert.ok(moved, "the monolith is at its new path");
  assert.equal(docId.frontmatterField(moved, "prd_number"), "1");
  assert.deepEqual(
    docId.registryNumbers(io.files.get(`${R}/prd-registry.md`)),
    [1],
  );
});

test("CR-3: a registry appendPrdRow would refuse blocks the dry run and --apply, before any write", () => {
  const reg =
    "---\ntype: registry\n---\n\n# PRD Registry\n\n**Next Available PRD Number:** **1**\n\n| # | Name | Folder | Status | Created |\n|---|---|---|---|---|\n";
  for (const argv of [
    ["--root", R],
    ["--apply", "--root", R],
  ]) {
    const io = memIo(l2Tree({ [`${R}/prd-registry.md`]: reg }));
    const r = m.run(argv, { io });
    assert.equal(r.reason, "blocked", argv.join(" "));
    assert.deepEqual(
      r.blockers.map((b) => b.code),
      ["registry-unwritable"],
    );
    assert.equal(
      io.calls.moves.length + io.calls.writes.length,
      0,
      "nothing written",
    );
  }
});

test("CR-4: the registry row is layered on the link pass's rewrite of an in-tree registry", () => {
  const reg =
    docId.appendPrdRow(null, {
      n: 2,
      title: "Z",
      href: "z/prd.2.z/prd.2.z.md",
      folder: "z",
      status: "draft",
      created: "2026-01-01",
    }) + "\nSee [the old onboarding PRD](onb/prd.onb.md).\n";
  const io = memIo(
    l2Tree({
      [`${R}/prd-registry.md`]: reg,
      [`${R}/z/prd.2.z/prd.2.z.md`]: "---\nname: prd.2.z\nprd_number: 2\n---\n",
    }),
  );
  const r = m.run(["--apply", "--root", R], { io });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  const out = io.files.get(`${R}/prd-registry.md`);
  assert.match(
    out,
    /\[the old onboarding PRD\]\(onb\/prd\.3\.onb\/prd\.3\.onb\.md\)/,
    "the link pass's rewrite survives",
  );
  assert.deepEqual(
    docId.registryNumbers(out),
    [2, 3],
    "and the new row is appended",
  );
});

test("QA-1: checkPrdRoot refuses an empty, escaping, encoded, NUL or symlinked root and accepts plain ones", () => {
  const base = mkdtempSync(join(tmpdir(), "prd-root-"));
  try {
    mkdirSync(join(base, "uploads"));
    execFileSync("ln", ["-s", "/etc", join(base, "uploads", "link-to-etc")]);
    for (const bad of [
      "",
      "..",
      "../x",
      "/etc",
      "a/../../x",
      "..%2f..%2fetc",
      "a\0b",
      "uploads/link-to-etc/passwd",
      "uploads/link-to-etc",
    ])
      assert.equal(m.checkPrdRoot(bad, base), null, JSON.stringify(bad));
    assert.equal(m.checkPrdRoot("docs/prd", base), "docs/prd");
    assert.equal(m.checkPrdRoot("docs/prd/", base), "docs/prd");
    assert.equal(m.checkPrdRoot("./docs/prd", base), "docs/prd");
    assert.equal(
      m.checkPrdRoot(join(base, "docs/prd"), base),
      "docs/prd",
      "an absolute path inside the base",
    );
    for (const internal of [
      ".",
      ".git",
      ".git/x",
      "node_modules",
      "a/node_modules/b",
    ])
      assert.equal(
        m.checkPrdRoot(internal, base),
        null,
        `${internal} is never a PRD root (cycle 2, CR-4)`,
      );
    // A root named through a symlinked path to the base is the same root (cycle 2, CR-5).
    const link = `${base}-link`;
    execFileSync("ln", ["-s", base, link]);
    try {
      assert.equal(m.checkPrdRoot(join(link, "docs/prd"), base), "docs/prd");
      assert.equal(m.checkPrdRoot("docs/prd", link), "docs/prd");
    } finally {
      rmSync(link, { force: true });
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("CR-2: the printed revert undoes an uncommitted --apply exactly, in a real git repository", () => {
  const PAD =
    Array.from({ length: 40 }, (_, i) => `# unchanged line ${i}`).join("\n") +
    "\n";
  const tree = Object.fromEntries(
    Object.entries(l2Tree()).map(([k, v]) => [k, v + PAD]),
  );
  const { dir, g } = gitRepo(tree);
  try {
    writeFileSync(
      join(dir, "unrelated.txt"),
      "someone else's untracked work\n",
    );
    const r = m.run(["--apply", "--json", "--root", R], { cwd: dir });
    assert.equal(
      r.reason,
      "ok",
      JSON.stringify(r.findings || r.blockers || r.error),
    );
    assert.ok(
      g("status", "--porcelain").trim().length > 0,
      "the apply changed the tree",
    );
    execFileSync("bash", ["-c", r.revert], { cwd: dir });
    assert.equal(
      g("status", "--porcelain").trim(),
      "?? unrelated.txt",
      "back to HEAD, untracked work untouched",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA cycle 2 (gate 2): CR-1, CR-2, CR-3, CR-4, CR-6, CR-7
// ---------------------------------------------------------------------------

test("cycle 2 CR-1: a dirty file the run would rewrite in place blocks, not only a dirty move source", () => {
  const io = memIo(l2Tree(), { dirty: ["README.md"] });
  const r = m.run(["--apply", "--root", R], { io });
  assert.equal(r.reason, "blocked");
  assert.deepEqual(
    r.blockers.map((b) => `${b.code} ${b.path}`),
    ["dirty-path README.md"],
  );
  assert.ok(
    io.calls.dirtyAsked.includes("README.md"),
    "the in-place edit target was checked",
  );
  assert.equal(
    io.calls.moves.length + io.calls.writes.length,
    0,
    "nothing written",
  );
});

test("cycle 2 CR-1/CR-7: the revert touches only the run's own paths, keeps unrelated dirty work, and runs from a subdirectory", () => {
  const PAD =
    Array.from({ length: 40 }, (_, i) => `# unchanged line ${i}`).join("\n") +
    "\n";
  const tree = Object.fromEntries(
    Object.entries(l2Tree({ [`${R}/onb/notes.md`]: "notes\n" })).map(
      ([k, v]) => [k, v + PAD],
    ),
  );
  const { dir, g } = gitRepo(tree);
  try {
    // Uncommitted work under the root that the run neither moves nor rewrites.
    writeFileSync(join(dir, R, "onb/notes.md"), "someone's uncommitted edit\n");
    const r = m.run(["--apply", "--json", "--root", R], { cwd: dir });
    assert.equal(
      r.reason,
      "ok",
      JSON.stringify(r.findings || r.blockers || r.error),
    );
    assert.doesNotMatch(
      r.revert,
      /-- '?docs\/prd'?( |$)/,
      "never the whole root",
    );
    execFileSync("bash", ["-c", r.revert], { cwd: join(dir, "docs") });
    assert.equal(
      g("status", "--porcelain").trim(),
      `M ${R}/onb/notes.md`,
      "only the unrelated edit is left",
    );
    assert.equal(
      readFileSync(join(dir, R, "onb/notes.md"), "utf8"),
      "someone's uncommitted edit\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cycle 2 CR-2: two stories that would carry one id block the dry run", () => {
  const E = `${R}/d/prd.f/epics/epic.1.e`;
  const io = memIo({
    [`${R}/d/prd.f/prd.f.md`]: "---\nname: prd.f\n---\n",
    [`${E}/epic.1.e.md`]: "---\nepic_number: 1\n---\n",
    [`${E}/stories/story.1.1.a/story.1.1.a.md`]:
      "---\nid: story.1.1.a\nstatus: accepted\nepic: 1\n---\n",
    [`${E}/stories/story.1.1.1.b/story.1.1.1.b.md`]:
      "---\nid: story.1.1.1.b\nstatus: accepted\nepic: epic.1.1.e\n---\n",
  });
  for (const argv of [
    ["--root", R],
    ["--apply", "--root", R],
  ]) {
    const r = m.run(argv, { io });
    assert.equal(r.reason, "blocked", argv.join(" "));
    assert.ok(
      r.blockers.some(
        (b) => b.code === "id-collision" && /story\.1\.1\.1/.test(b.detail),
      ),
    );
  }
  assert.equal(io.calls.moves.length, 0);
});

test("cycle 2 CR-3: a move that fails part-way returns post-check-failed with a revert for what was done", () => {
  const io = memIo(l2Tree(), { failMoveAt: 3 });
  const r = m.run(["--apply", "--root", R], { io });
  assert.deepEqual([r.reason, r.exitCode], ["post-check-failed", 1]);
  assert.match(r.error, /stopped part-way: git mv refused/);
  assert.equal(r.moved, 2);
  const [first, second] = io.calls.moves;
  for (const p of [first.from, first.to, second.from, second.to])
    assert.ok(r.revert.includes(`'${p}'`), p);
  const fresh = memIo(l2Tree());
  const third = [
    ...m.plan(m.discover(R, fresh), null, fresh).fileMap.keys(),
  ][2];
  assert.ok(
    !r.revert.includes(`'${third}'`),
    "a file never moved is not in the revert",
  );
});

test("cycle 2 CR-4: apply only asks to remove ancestors of moved files, never another directory", () => {
  const io = memIo(l2Tree({ [`${R}/other/empty-later/keep.md`]: "x" }));
  assert.equal(m.run(["--apply", "--root", R], { io }).reason, "ok");
  const movedFrom = io.calls.moves.map((x) => x.from);
  assert.ok(io.calls.rmdirs.length > 0);
  for (const d of io.calls.rmdirs) {
    assert.ok(
      movedFrom.some((f) => f.startsWith(`${d}/`)),
      `${d} is an ancestor of a moved file`,
    );
    assert.notEqual(d, R, "never the root");
  }
  assert.ok(
    !io.calls.rmdirs.some((d) => d.startsWith(`${R}/other`)),
    "an unrelated directory is never touched",
  );
});

test("cycle 2 CR-6: an untracked monolith still gets its frontmatter edit", () => {
  const io = memIo(
    {
      "docs/prd.md": "---\ntitle: Mono\nstatus: draft\n---\n# PRD\n",
      [`${R}/.keep`]: "",
    },
    { tracked: [`${R}/.keep`] },
  );
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.equal(
    docId.frontmatterField(
      io.files.get(`${R}/mono/prd.1.mono/prd.1.mono.md`),
      "prd_number",
    ),
    "1",
  );
});

// ---------------------------------------------------------------------------
// task.211 — frontmatter-less PRDs, links from outside the root, domain-less PRDs
// ---------------------------------------------------------------------------

test("task.211 phase 1: editFrontmatter creates a block when there is none, and frontmatterState tells the three shapes apart", () => {
  const edits = [
    { key: "name", value: "prd.1.mono" },
    { key: "prd_number", value: 1, quote: false, insert: true, after: "name" },
    { key: "type", value: "prd", createOnly: true },
  ];
  assert.equal(
    m.editFrontmatter("# Mono\n", edits),
    "---\nname: prd.1.mono\nprd_number: 1\ntype: prd\n---\n# Mono\n",
  );
  // An existing block: edited in place; a createOnly key is never inserted into it.
  assert.equal(
    m.editFrontmatter("---\nname: old\ntitle: T\n---\n# x\n", edits),
    "---\nname: prd.1.mono\nprd_number: 1\ntitle: T\n---\n# x\n",
  );
  // createOnly never overwrites: a PRD whose block already states a type keeps it.
  assert.equal(
    m.editFrontmatter("---\ntype: spec\n---\n", edits),
    "---\nprd_number: 1\ntype: spec\n---\n",
  );
  assert.equal(m.frontmatterState("# x\n"), "none");
  assert.equal(m.frontmatterState("---\na: 1\n---\n"), "closed");
  assert.equal(m.frontmatterState("---\na: 1\n# never closed\n"), "unclosed");
});

test("task.211 phase 1: a frontmatter-less monolith and a frontmatter-less L1 PRD migrate and pass the post-check", () => {
  const mono = memIo({
    "docs/prd.md": "# Mono, no frontmatter\n",
    [`${R}/.keep`]: "",
  });
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io: mono,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  const moved = mono.files.get(`${R}/mono/prd.1.mono/prd.1.mono.md`);
  assert.equal(docId.frontmatterField(moved, "prd_number"), "1");
  assert.equal(docId.frontmatterField(moved, "name"), "prd.1.mono");
  assert.equal(docId.frontmatterField(moved, "type"), "prd");
  assert.match(moved, /\n---\n# Mono, no frontmatter\n$/, "the body is kept");
  const l1 = memIo({ [`${R}/onb/prd.onb/prd.onb.md`]: "# Onboarding\n" });
  const r1 = m.run(["--apply", "--root", R], { io: l1 });
  assert.equal(r1.reason, "ok", JSON.stringify(r1.findings || r1.blockers));
  assert.equal(
    docId.frontmatterField(
      l1.files.get(`${R}/onb/prd.1.onb/prd.1.onb.md`),
      "prd_number",
    ),
    "1",
  );
});

test("task.211 phase 1: an unclosed frontmatter fence is a blocker, and --apply moves nothing", () => {
  const files = {
    "docs/prd.md": "---\ntype: prd\n# Mono, fence never closed\n",
    [`${R}/.keep`]: "",
  };
  const names = new Map([["docs/prd.md", "mono"]]);
  assert.deepEqual(dry(memIo(files), { names }).codes, [
    "unclosed-frontmatter",
  ]);
  const io = memIo(files);
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
  assert.deepEqual(io.calls.moves, [], "nothing moved");
  assert.deepEqual(io.calls.writes, [], "nothing written");
  assert.ok(m.BLOCKER_CODES.includes("unclosed-frontmatter"));
});

/** A monolith, the files outside the root that name it, and two that do not. */
function outsideTree() {
  return {
    "docs/prd.md": "---\ntitle: Mono\nstatus: draft\n---\n# PRD\n",
    [`${R}/.keep`]: "",
    "README.md": "[PRD](docs/prd.md)\nSee `docs/prd.md`.\n",
    "docs/architecture.md": "See [the PRD](prd.md).\n",
    "docs/notes.md": "The old prd.md layout is prose.\n",
    "docs/other.md": "[contributing](../CONTRIBUTING.md)\n",
    "CONTRIBUTING.md": "# Contributing\n",
  };
}
const MONO_NEW = `${R}/mono/prd.1.mono/prd.1.mono.md`;

test("task.211 phase 2: links and literals naming a moved docs/prd.md from outside the root are re-pointed; files naming it in prose or not at all are untouched", () => {
  const files = outsideTree();
  const io = memIo(files);
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.equal(
    io.files.get("README.md"),
    `[PRD](${MONO_NEW})\nSee \`${MONO_NEW}\`.\n`,
    "the repository-root link and the literal path both follow the move",
  );
  assert.equal(
    io.files.get("docs/architecture.md"),
    "See [the PRD](prd/mono/prd.1.mono/prd.1.mono.md).\n",
    "a relative link from docs/ follows the move",
  );
  for (const f of ["docs/notes.md", "docs/other.md", "CONTRIBUTING.md"])
    assert.equal(io.files.get(f), files[f], `${f} is byte-identical`);
  assert.equal(r.links.rewritten, 2, "links.rewritten counts both links");
  // Every re-pointed link resolves after the move.
  for (const f of ["README.md", "docs/architecture.md"])
    for (const { target } of extractRelativeLinks(io.files.get(f)))
      assert.ok(
        io.files.has(join(dirname(f), target).replace(/^\.\//, "")),
        `${f} → ${target}`,
      );
});

test("task.211 phase 2: a link to an untracked monolith is live, so it is re-pointed rather than left dead", () => {
  const files = outsideTree();
  const io = memIo(files, {
    tracked: Object.keys(files).filter((f) => f !== "docs/prd.md"),
  });
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.equal(io.files.get("README.md").split("\n")[0], `[PRD](${MONO_NEW})`);
  assert.equal(r.links.dead, 0);
});

test("task.211 phase 2 (performance): the widened prefilter adds no reads, and a file naming no move source gets no link pass", () => {
  const files = outsideTree();
  const io = memIo(files);
  const reads = new Map();
  const readFile = io.readFile;
  io.readFile = (p) => {
    reads.set(p, (reads.get(p) || 0) + 1);
    return readFile(p);
  };
  const { edits } = dry(io, { names: new Map([["docs/prd.md", "mono"]]) });
  // Each outside candidate is read once, by the candidate loop — the prefilter decides what
  // is processed after that read, so naming a move source costs no extra read.
  for (const f of [
    "README.md",
    "docs/architecture.md",
    "docs/notes.md",
    "docs/other.md",
  ])
    assert.equal(reads.get(f), 1, `${f} read once`);
  // docs/other.md holds a live link to CONTRIBUTING.md; it names no move source, so the link
  // pass never sees it. Only the two links to the monolith are counted.
  assert.equal(edits.links.live, 2);
  assert.equal(edits.edits.has("docs/other.md"), false);
});

test("task.211 phase 3: root L1 and L2 PRDs and a root index need a domain; <domain>/<slug> places them under it", () => {
  const cases = [
    [`${R}/prd.x/prd.x.md`, "main/x", `${R}/main/prd.1.x/prd.1.x.md`],
    [`${R}/prd.y.md`, "main/y", `${R}/main/prd.1.y/prd.1.y.md`],
    [`${R}/index.md`, "main/core", `${R}/main/prd.1.core/prd.1.core.md`],
  ];
  for (const [doc, name, to] of cases) {
    const files = { [doc]: "---\ntype: prd\n---\n# PRD\n" };
    const slug = name.split("/")[1];
    const bare = dry(memIo(files), { names: new Map([[doc, slug]]) });
    assert.deepEqual(bare.codes, ["needs-domain"], doc);
    assert.match(bare.blockers[0].detail, /=<domain>\/<slug>/, doc);
    const named = dry(memIo(files), { names: new Map([[doc, name]]) });
    assert.deepEqual(named.codes, [], doc);
    assert.equal(named.planned.fileMap.get(doc), to, doc);
    assert.equal(named.planned.prds[0].domain, "main", doc);
  }
  assert.ok(m.BLOCKER_CODES.includes("needs-domain"));
});

test("task.211 phase 3: --apply with <domain>/<slug> writes Folder <domain> and a clean corpus; the monolith takes a named domain too", () => {
  const io = memIo({ [`${R}/prd.y.md`]: "---\ntitle: Why\n---\n# PRD\n" });
  const r = m.run(["--apply", "--root", R, "--name", `${R}/prd.y.md=main/y`], {
    io,
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.ok(io.files.has(`${R}/main/prd.1.y/prd.1.y.md`));
  assert.match(io.files.get(`${R}/prd-registry.md`), /\| main \|/);
  const mono = dry(
    memIo({ "docs/prd.md": "---\ntype: prd\n---\n", [`${R}/.keep`]: "" }),
    { names: new Map([["docs/prd.md", "dom/mono"]]) },
  );
  assert.deepEqual(mono.codes, []);
  assert.equal(
    mono.planned.fileMap.get("docs/prd.md"),
    `${R}/dom/prd.1.mono/prd.1.mono.md`,
  );
});

test("task.211 phase 3: a numbered PRD already under the root is not moved, so it is not blocked", () => {
  const files = {
    [`${R}/prd.1.x/prd.1.x.md`]:
      "---\nname: prd.1.x\nprd_number: 1\n---\n# PRD\n",
  };
  assert.deepEqual(dry(memIo(files)).codes, []);
});

test("task.211 phase 3: a bad domain is bad-slug; a malformed <domain>/<slug> is a usage error", () => {
  const files = { [`${R}/index.md`]: "---\ntype: prd\n---\n# PRD\n" };
  const bad = dry(memIo(files), {
    names: new Map([[`${R}/index.md`, "Bad_Dom/core"]]),
  });
  assert.deepEqual(bad.codes, ["bad-slug"]);
  assert.match(bad.blockers[0].detail, /"Bad_Dom\/core"/);
  const io = memIo(files);
  for (const v of ["x=a/b/c", "x=/core", "x=main/", "x=a//b"]) {
    const r = m.run(["--name", v], { io });
    assert.deepEqual([r.reason, r.exitCode], ["usage", 2], v);
  }
});

// ---------------------------------------------------------------------------
// task.211 QA cycle 1
// ---------------------------------------------------------------------------

test("task.211 QA-1 CR-1: a fence after a BOM or blank lines is displaced-frontmatter, and --apply moves and writes nothing", () => {
  assert.equal(m.frontmatterState("﻿---\na: 1\n---\n"), "displaced");
  assert.equal(m.frontmatterState("\n\n---\na: 1\n---\n"), "displaced");
  // A thematic break below a heading is body, not a block: the file still gets one.
  assert.equal(m.frontmatterState("# T\n\n---\n"), "none");
  assert.equal(m.frontmatterState(""), "none");
  for (const body of [
    "﻿---\nname: prd.onb\ntitle: O\n---\n# O\n",
    "\n---\nname: prd.onb\ntitle: O\n---\n# O\n",
  ]) {
    const files = { [`${R}/onb/prd.onb.md`]: body };
    assert.deepEqual(dry(memIo(files)).codes, ["displaced-frontmatter"]);
    const io = memIo(files);
    const r = m.run(["--apply", "--root", R], { io });
    assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
    assert.deepEqual(io.calls.moves, [], "nothing moved");
    assert.deepEqual(io.calls.writes, [], "nothing written");
  }
  assert.ok(m.BLOCKER_CODES.includes("displaced-frontmatter"));
});

test("task.211 QA-1 CR-1: editFrontmatter is idempotent — a second write over the block it created is byte-identical", () => {
  const edits = [
    { key: "name", value: "prd.1.mono" },
    { key: "prd_number", value: 1, quote: false, insert: true, after: "name" },
    { key: "type", value: "prd", createOnly: true },
  ];
  for (const text of ["# Mono\n", "", "# T\n\n---\nbody\n"]) {
    const once = m.editFrontmatter(text, edits);
    assert.equal(m.frontmatterState(once), "closed", JSON.stringify(text));
    assert.equal(m.editFrontmatter(once, edits), once, JSON.stringify(text));
  }
});

test("task.211 QA-1: a relative or embedded mention of a moved outside source that no pass rewrites is stale-reference, and --apply moves nothing", () => {
  const files = {
    ...outsideTree(),
    "scripts/x.js": 'const prd = "../docs/prd.md";\n',
    "docs/guide/x.md": "Read `../prd.md` first.\n",
  };
  const names = new Map([["docs/prd.md", "mono"]]);
  const d = dry(memIo(files), { names });
  assert.deepEqual(d.codes, ["stale-reference", "stale-reference"]);
  assert.deepEqual(d.blockers.map((b) => b.path).sort(), [
    "docs/guide/x.md",
    "scripts/x.js",
  ]);
  assert.match(d.blockers[0].detail, /docs\/prd\.md/);
  const io = memIo(files);
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
  assert.deepEqual(io.calls.moves, [], "nothing moved");
  // The other direction: what the passes do rewrite, and bare-name prose, raise nothing.
  assert.deepEqual(dry(memIo(outsideTree()), { names }).codes, []);
  assert.ok(m.BLOCKER_CODES.includes("stale-reference"));
});

test("task.211 QA-2: parseNameValue is the one --name check — legitimate names parse, every path escape is refused", () => {
  assert.deepEqual(m.parseNameValue("core"), { slug: "core", domain: null });
  assert.deepEqual(m.parseNameValue("main/core"), {
    slug: "core",
    domain: "main",
  });
  for (const v of [
    "../core",
    "main/..",
    "./core",
    "/etc/passwd",
    "%2e%2e/core",
    "main\u0000/core",
    "..\\core",
    "a/b/c",
    "",
    "main/",
    "Main/core",
    undefined,
  ])
    assert.equal(m.parseNameValue(v), null, JSON.stringify(v));
  // parseArgs and discover both answer through it: a library caller passing a bad
  // name directly gets bad-slug, and nothing is placed from it.
  const d = dry(memIo({ [`${R}/prd.y.md`]: "# Y\n" }), {
    names: new Map([[`${R}/prd.y.md`, "../y"]]),
  });
  assert.deepEqual(d.codes, ["bad-slug"]);
  assert.equal(d.planned.fileMap.size, 0);
  const r = m.run(["--name", `${R}/prd.y.md=../y`], {
    io: memIo({ [`${R}/prd.y.md`]: "# Y\n" }),
  });
  assert.deepEqual([r.reason, r.exitCode], ["usage", 2]);
});

test("task.211 CR-3: a named domain for an already-numbered PRD is bad-slug, and --apply moves nothing", () => {
  const files = {
    [`${R}/prd.1.x/prd.1.x.md`]:
      "---\nname: prd.1.x\nprd_number: 1\n---\n# PRD\n",
  };
  const names = new Map([[`${R}/prd.1.x/prd.1.x.md`, "main/x"]]);
  const d = dry(memIo(files), { names });
  assert.deepEqual(d.codes, ["bad-slug"]);
  assert.match(d.blockers[0].detail, /already numbered/);
  const io = memIo(files);
  const r = m.run(
    ["--apply", "--root", R, "--name", `${R}/prd.1.x/prd.1.x.md=main/x`],
    { io },
  );
  assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
  assert.deepEqual(io.calls.moves, [], "nothing moved");
});

// ---------------------------------------------------------------------------
// task.211 QA cycle 2
// ---------------------------------------------------------------------------

test("task.211 QA-2 CR-3 CR-4: outsideReferences flags each token that resolves to a source, and no token that only ends like one", () => {
  const S = ["docs/prd.md"];
  const tokens = (file, text) =>
    m.outsideReferences(file, text, S).map((h) => h.token);
  // Must flag: every way a file can name docs/prd.md by path.
  for (const [file, text, token] of [
    ["scripts/x.js", 'read("../docs/prd.md")', "../docs/prd.md"],
    ["docs/guide/x.md", "Read `../prd.md` first.", "../prd.md"],
    ["docs/build.js", 'read("./prd.md")', "./prd.md"],
    ["package.json", '{"prd":"docs/prd.md"}', "docs/prd.md"],
    ["scripts/a.sh", "cat docs/prd.md.", "docs/prd.md"],
    ["docs/a/b/x.md", "[p](../../prd.md)", "../../prd.md"],
    // A path rooted in a variable is relative, not absolute (task.211 QA-3 CR-1).
    ["scripts/x.mjs", "const p = `${ROOT}/docs/prd.md`;", "/docs/prd.md"],
    ["scripts/x.sh", "cat $ROOT/docs/prd.md", "ROOT/docs/prd.md"],
    ["scripts/x.sh", 'cat "$(dirname "$0")/../docs/prd.md"', "/../docs/prd.md"],
    // Quoted on its own, or a template (task.211 QA-4 CR-3).
    ["scripts/x.sh", 'cat "$ROOT"/docs/prd.md', "/docs/prd.md"],
    ["scripts/x.sh", "cat '${ROOT}'/docs/prd.md", "/docs/prd.md"],
    ["docs/t.md", "{{root}}/docs/prd.md", "/docs/prd.md"],
  ])
    assert.deepEqual(tokens(file, text), [token], `${file}: ${text}`);
  // Must not flag: other files whose path ends in the same text, bare names, URLs.
  for (const [file, text] of [
    ["README.md", "See apps/web/docs/prd.md"],
    ["docs/a/b/x.md", "[root](../../../prd.md)"],
    ["docs/notes.md", "The old prd.md layout is prose."],
    ["README.md", "https://example.com/docs/prd.md"],
    ["README.md", "/docs/prd.md is absolute"],
    ["README.md", '[abs](/docs/prd.md) and "/docs/prd.md" and x=/docs/prd.md'],
    ["README.md", "docs/prd.md.bak and docs/prd.mdx"],
    // A variable naming a place outside the repository, like ~ (task.211 QA-4 CR-4).
    [
      "scripts/x.sh",
      'cp $HOME/docs/prd.md ${TMPDIR}/x "$XDG_DATA_HOME"/docs/prd.md',
    ],
    ["scripts/x.sh", "cp ~/docs/prd.md x"],
    ["README.md", '"x"/docs/prd.md and (y)/docs/prd.md'],
  ])
    assert.deepEqual(tokens(file, text), [], `${file}: ${text}`);
});

// Sized so a quadratic matcher takes seconds and fails the bound rather than hanging the
// suite: without the lookbehind, 60k word characters take ~7s; resolving a 100k `../`
// chain takes ~4.5s. The shipped matcher does each in milliseconds.
test("task.211 QA-2 CR-3: outsideReferences stays linear on long path-shaped input", () => {
  for (const text of [
    `prd.md ${"../".repeat(100000)}prd.md`,
    `prd.md ${"a/".repeat(200000)}`,
    `prd.md ${"a".repeat(60000)}`,
    `prd.md ${'"/a'.repeat(150000)}`,
    `prd.md ${"$(x)/a ".repeat(80000)}`,
  ]) {
    const t0 = performance.now();
    m.outsideReferences("docs/x.md", text, ["docs/prd.md"]);
    assert.ok(
      performance.now() - t0 < 1000,
      loadSensitive(`${text.slice(7, 12)}… in < 1s`),
    );
  }
});

test("task.211 QA-2 CR-1: a non-literal file naming a moved outside source is stale-reference; none is read when no outside source exists", () => {
  const files = {
    ...outsideTree(),
    "package.json": '{"prd":"docs/prd.md"}\n',
    "scripts/a.sh": "cat docs/prd.md\n",
    "logo.png": "\u0000PNG docs/prd.md",
  };
  const names = new Map([["docs/prd.md", "mono"]]);
  const d = dry(memIo(files), { names });
  assert.deepEqual(d.codes, ["stale-reference", "stale-reference"]);
  assert.deepEqual(d.blockers.map((b) => b.path).sort(), [
    "package.json",
    "scripts/a.sh",
  ]);
  const io = memIo(files);
  const r = m.run(["--apply", "--root", R, "--name", "docs/prd.md=mono"], {
    io,
  });
  assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
  assert.deepEqual(io.calls.moves, [], "nothing moved");
  // An in-tree migration has no outside source, so no non-literal file is read.
  const l2 = memIo({ ...l2Tree(), "package.json": '{"x":1}\n' });
  const reads = [];
  const readFile = l2.readFile;
  l2.readFile = (p) => {
    reads.push(p);
    return readFile(p);
  };
  assert.deepEqual(dry(l2).codes, []);
  assert.equal(reads.includes("package.json"), false);
});

test("task.211 QA-2 CR-2: a numbered PRD that would move directly under the root needs a domain; one in a domain moves cleanly", () => {
  const root = {
    [`${R}/prd.1.x.md`]: "---\nname: prd.1.x\nprd_number: 1\n---\n# x\n",
  };
  const d = dry(memIo(root));
  assert.deepEqual(d.codes, ["needs-domain"]);
  assert.match(d.blockers[0].detail, /by hand/);
  const io = memIo(root);
  const r = m.run(["--apply", "--root", R], { io });
  assert.deepEqual([r.reason, r.exitCode], ["blocked", 1]);
  assert.deepEqual(io.calls.moves, [], "nothing moved");
  const inDomain = dry(
    memIo({
      [`${R}/main/prd.1.x.md`]: "---\nname: prd.1.x\nprd_number: 1\n---\n",
    }),
  );
  assert.deepEqual(inDomain.codes, []);
  assert.equal(
    inDomain.planned.fileMap.get(`${R}/main/prd.1.x.md`),
    `${R}/main/prd.1.x/prd.1.x.md`,
  );
});

test("task.211 QA-2 CR-5: a blank line and a thematic break is a body with no block — the migration writes one and keeps the body", () => {
  assert.equal(m.frontmatterState("\n---\n# Onboarding\n"), "none");
  assert.equal(m.frontmatterState("\n---\na: 1\n---\n"), "displaced");
  const io = memIo({ [`${R}/onb/prd.onb.md`]: "\n---\n# Onboarding\n" });
  const r = m.run(["--apply", "--root", R], { io });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  const moved = io.files.get(`${R}/onb/prd.1.onb/prd.1.onb.md`);
  assert.equal(docId.frontmatterField(moved, "prd_number"), "1");
  assert.match(moved, /\n---\n\n---\n# Onboarding\n$/, "the body is kept");
});

test("task.211 QA-3 CR-4: a late fence is displaced only when it closes over YAML — two thematic breaks are a body", () => {
  const body = "\n---\n# Onb\n\nIntro\n\n---\n## Goals\n";
  assert.equal(m.frontmatterState(body), "none");
  assert.equal(m.frontmatterState("\n---\n# Title\n---\n"), "none");
  assert.equal(
    m.frontmatterState("\n---\ntitle: x\ntags:\n  - a\n---\n# x\n"),
    "displaced",
  );
  assert.equal(m.frontmatterState("\uFEFF---\nname: x\n---\n"), "displaced");
  // A real block keyed in any YAML spelling is still displaced (task.211 QA-4 CR-2).
  for (const key of [
    "Last updated: 2024",
    '"title": x',
    "prd.version: 2",
    "'a b': c",
  ])
    assert.equal(
      m.frontmatterState(`\n---\n${key}\nname: x\n---\n# x\n`),
      "displaced",
      key,
    );
  for (const line of [
    "**Status**: Draft",
    "> Note: x",
    "[a]: http://x",
    "- item: x",
  ])
    assert.equal(
      m.frontmatterState(`\n---\n${line}\n---\n# x\n`),
      "none",
      line,
    );
  const io = memIo({ [`${R}/onb/prd.onb.md`]: body });
  const r = m.run(["--apply", "--root", R], { io });
  assert.equal(r.reason, "ok", JSON.stringify(r.findings || r.blockers));
  assert.ok(
    io.files.get(`${R}/onb/prd.1.onb/prd.1.onb.md`).endsWith(body),
    "the body is kept",
  );
});

test("task.211 QA-4 CR-1: a file whose extension differs only in case is read by exactly one loop", () => {
  const files = {
    ...outsideTree(),
    "notes/README.MD": "see ../docs/prd.md\n",
    ".github/workflows/ci.YML": "run: cat ../../docs/prd.md\n",
  };
  const io = memIo(files);
  const reads = [];
  const readFile = io.readFile;
  io.readFile = (p) => {
    reads.push(p);
    return readFile(p);
  };
  const d = dry(io, { names: new Map([["docs/prd.md", "mono"]]) });
  assert.deepEqual(d.blockers.map((b) => [b.code, b.path]).sort(), [
    ["stale-reference", ".github/workflows/ci.YML"],
    ["stale-reference", "notes/README.MD"],
  ]);
  for (const f of ["notes/README.MD", ".github/workflows/ci.YML"])
    assert.equal(reads.filter((p) => p === f).length, 1, `${f} read once`);
});

test("task.211 QA-3 CR-2 CR-3 CR-5: the scan reads every in-scope non-literal file once — under the root too — and no example copy or known binary", () => {
  const files = {
    ...outsideTree(),
    [`${R}/tools/cfg.json`]: '{"p":"docs/prd.md"}\n',
    "examples/demo/package.json": '{"p":"docs/prd.md"}\n',
    "examples/demo/README.md": "docs/prd.md\n",
    "assets/logo.png": "docs/prd.md",
    "data/blob.bin": "\u0000 docs/prd.md",
  };
  const io = memIo(files);
  const reads = [];
  const readFile = io.readFile;
  io.readFile = (p) => {
    reads.push(p);
    return readFile(p);
  };
  const d = dry(io, { names: new Map([["docs/prd.md", "mono"]]) });
  assert.deepEqual(
    d.blockers.map((b) => [b.code, b.path]),
    [["stale-reference", `${R}/tools/cfg.json`]],
  );
  assert.equal(
    reads.includes("assets/logo.png"),
    false,
    "a known binary type is never read",
  );
  assert.equal(
    reads.includes("data/blob.bin"),
    true,
    "an unknown type is read, then refused on NUL",
  );
  assert.equal(
    reads.filter((p) => p === `${R}/tools/cfg.json`).length,
    1,
    "read once",
  );
});
