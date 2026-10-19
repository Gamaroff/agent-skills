/**
 * Corpus guard — every PRD, epic and story document under the PRD root is
 * numbered, consistent with its directory and parent, registered, and unique.
 *
 * task.207. Tasks 202–206 moved PRDs, epics and stories to hierarchical
 * numbering (`prd.{P}`, `epic.{P}.{E}`, `story.{P}.{E}.{S}`) and migrated the
 * corpus. Nothing held the result once it landed: a hand-made `epic.3.foo/`
 * folder, a story renamed back to the flat shape, or a PRD missing its registry
 * row is invisible until a pipeline step misreads it. The task registry had the
 * same shape of failure — seventeen accepted rows never ticked, unseen until
 * `task-registry-drift.test.mjs` made it a failure. This test is that failure
 * for the document corpus.
 *
 * The check is IMPORTED from `doc-id.js` (`checkCorpus`), never restated here. A
 * second definition of "a valid story id" in a test drifts in the worst
 * direction: it passes a corpus the engine would reject.
 *
 * Eval replay fixtures (`evals/**\/replay/docs/prd/**`) are NOT read: they are
 * examples, and a fixture's deliberately bad shape is a negative case, not a
 * corpus defect. Only the project's own PRD root is checked.
 *
 * Run via: node --test evals/shared/tests/doc-numbering-corpus.test.mjs
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const { checkCorpus, resolvePrdRoot, parse } = await import(
  pathToFileURL(path.join(REPO_ROOT, "shared", "resources", "doc-id.js")).href
);

const PRD_ROOT = path.join(REPO_ROOT, resolvePrdRoot([], REPO_ROOT));

/**
 * Non-vacuity floor. The migrated corpus held 22 documents — 1 PRD, 4 epics, 17
 * stories — on 2026-10-16 (`checkCorpus("docs/prd").documents`), and it only
 * grows. The engine returns a total, not per-kind counts. Without a floor, a
 * walker that stopped descending (a moved root, a renamed directory) would read
 * a handful of documents, find nothing wrong with them, and report success for a
 * corpus it never saw.
 */
const MIN_DOCUMENTS = 22;

/** Reasons that mean the instrument read the corpus. Anything else is a failure to read it. */
const READ = ["ok", "findings"];

function describe(r) {
  return r.findings
    .map((f) => `${f.path}: ${f.reason} — ${f.detail}`)
    .join("\n");
}

test("the PRD corpus is numbered, consistent, registered and unique", () => {
  const r = checkCorpus(PRD_ROOT);
  assert.ok(
    READ.includes(r.reason),
    `corpus at ${PRD_ROOT} was not read: ${r.reason}${r.unreadable?.length ? ` (${r.unreadable.join(", ")})` : ""}`,
  );
  assert.ok(
    r.documents >= MIN_DOCUMENTS,
    `vacuous read: ${r.documents} documents under ${PRD_ROOT}, floor ${MIN_DOCUMENTS}`,
  );
  assert.deepEqual(r.findings, [], `corpus findings:\n${describe(r)}`);
});

// ── Mutation proof: each defect class goes red on a temp copy ─────────────────
//
// Each case copies the real corpus into its own temp directory in `before()`, so
// the project's docs/prd is never touched, then introduces exactly one defect.
// The clean copy must stay green — otherwise a red mutation proves nothing about
// the mutation.

let tmp;
const copyOf = (name) => {
  const dir = path.join(tmp, name);
  cpSync(PRD_ROOT, dir, { recursive: true });
  return dir;
};

/** Every directory under `root` whose name parses as `kind` with no artifact. */
function dirsOf(root, kind) {
  const out = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const full = path.join(dir, ent.name);
      const p = parse(ent.name);
      if (p.ok && p.kind === kind && !p.artifact) out.push(full);
      walk(full);
    }
  };
  walk(root);
  return out.sort();
}

before(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "doc-numbering-corpus-"));
});
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const reasons = (r) => new Set(r.findings.map((f) => f.reason));

test("mutation control: the unmodified copy is clean", () => {
  const r = checkCorpus(copyOf("clean"));
  assert.equal(r.reason, "ok", describe(r));
  assert.ok(r.documents >= MIN_DOCUMENTS);
});

test("mutation: a story renamed back to the flat story.E.S shape is a bad-shape finding", () => {
  const root = copyOf("flat");
  const story = dirsOf(root, "story")[0];
  assert.ok(story, "no story directory in the corpus copy");
  const name = path.basename(story);
  const p = parse(name);
  const flat = name.replace(`story.${p.prd}.`, "story.");
  renameSync(path.join(story, `${name}.md`), path.join(story, `${flat}.md`));
  renameSync(story, path.join(path.dirname(story), flat));
  const r = checkCorpus(root);
  assert.ok(reasons(r).has("bad-shape"), `expected bad-shape:\n${describe(r)}`);
});

test("mutation: a PRD without prd_number is a frontmatter-mismatch finding", () => {
  const root = copyOf("prd-number");
  const prd = dirsOf(root, "prd")[0];
  assert.ok(prd, "no PRD directory in the corpus copy");
  const doc = path.join(prd, `${path.basename(prd)}.md`);
  const src = readFileSync(doc, "utf8");
  assert.match(src, /^prd_number:/m, "the PRD carries no prd_number to strip");
  writeFileSync(doc, src.replace(/^prd_number:.*\n/m, ""));
  const r = checkCorpus(root);
  assert.ok(
    reasons(r).has("frontmatter-mismatch"),
    `expected frontmatter-mismatch:\n${describe(r)}`,
  );
});

test("mutation: two epic documents with the same (P, E) are a duplicate-id finding", () => {
  const root = copyOf("duplicate");
  const epic = dirsOf(root, "epic")[0];
  assert.ok(epic, "no epic directory in the corpus copy");
  const name = path.basename(epic);
  const p = parse(name);
  // The epic document alone, under a different slug: copying the whole directory
  // would duplicate its stories too and test more than the one defect.
  const twin = `epic.${p.prd}.${p.epic}.zz-duplicate`;
  mkdirSync(path.join(path.dirname(epic), twin));
  cpSync(
    path.join(epic, `${name}.md`),
    path.join(path.dirname(epic), twin, `${twin}.md`),
  );
  const r = checkCorpus(root);
  assert.ok(
    reasons(r).has("duplicate-id"),
    `expected duplicate-id:\n${describe(r)}`,
  );
});
