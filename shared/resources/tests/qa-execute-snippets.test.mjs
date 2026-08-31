/**
 * qa-execute-snippets — extraction, fail-closed classification, dual-shell execution.
 *
 * The regression fixture is the point of this suite. Task 66 (`review-pr`) shipped
 * a multi-glob `ls` that collected the whole paper trail. Under zsh — the default
 * macOS shell — a glob matching nothing aborts the entire command, so one absent
 * artifact kind suppressed every kind that was present. It passed two QA cycles,
 * a DoD gate and forty contract tests, because contract tests assert what prose
 * SAYS and never what it DOES.
 *
 * Note what the fixture proves about the comparison itself: the defective block
 * exits 1 under BOTH shells. Exit status agrees. Only stdout differs. That is why
 * the stdout comparison is load-bearing and is mutation-proved below.
 *
 * Run: node --test shared/resources/tests/qa-execute-snippets.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = join(__dirname, "..", "qa-execute-snippets.mjs");

const {
  classifyBlock,
  commandWords,
  executeFile,
  extractBlocks,
  runBlock,
  unboundVariables,
  zshAvailable,
} = await import(MODULE);

function tmp() {
  return mkdtempSync(join(tmpdir(), "qa-snippets-test-"));
}

/**
 * The per-block timeout passed to the code UNDER TEST, deliberately far below the
 * 30s sleep it has to cut off.
 *
 * This is not the load-sized spawn budget `tests/test-harness-concurrency.test.js`
 * guards against, and it must not be replaced by `spawnBudget()`. That budget is
 * sized so a slow machine does not falsely time out; this value is an *input* to
 * the assertion — the test proves a hanging block gets terminated, so it needs a
 * timeout much shorter than the hang. Machine load makes this test more reliable,
 * not less: a loaded box only reaches the timeout sooner.
 */
const BLOCK_TIMEOUT_MS = 300;

function md(...blocks) {
  return blocks.join("\n\n");
}

function bash(code) {
  return "```bash\n" + code + "\n```";
}

// ── 1. Extraction ─────────────────────────────────────────────────────────────

test("extracts every fenced bash block with its opening-fence line number", () => {
  const doc = ["# Title", "", bash("echo one"), "", "prose", "", bash("echo two")].join("\n");
  const blocks = extractBlocks(doc);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].code, "echo one");
  assert.equal(blocks[1].code, "echo two");
  // Lines 3 and 9 are the ``` opening fences (1-based): each fenced block is
  // three lines, so "# Title", "", fence(3-5), "", "prose", "", fence(9-11).
  assert.equal(blocks[0].line, 3);
  assert.equal(blocks[1].line, 9);
});

test("ignores fences that are not labelled bash", () => {
  const doc = ["```yaml", "a: 1", "```", "", "```", "unlabelled", "```", "", bash("echo yes")].join("\n");
  const blocks = extractBlocks(doc);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].code, "echo yes");
});

test("an unterminated fence yields no block — we never execute what we cannot delimit", () => {
  assert.deepEqual(extractBlocks("```bash\necho dangling\n"), []);
});

test("multi-line block bodies survive intact", () => {
  const code = "D=d\nfor f in a b; do\n  echo \"$f\"\ndone";
  assert.equal(extractBlocks(bash(code))[0].code, code);
});

// ── 2. Classification: the fail-closed safety boundary ────────────────────────

test("a block of allow-listed read-only commands is runnable", () => {
  assert.equal(classifyBlock("ls -la\ngrep foo bar.txt | wc -l").klass, "runnable");
});

test("fail-closed: an unrecognised command classifies as mutating, never runnable", () => {
  const r = classifyBlock("frobnicate --all");
  assert.equal(r.klass, "mutating");
  assert.match(r.reason, /unrecognised-command: frobnicate/);
  assert.match(r.reason, /fail-closed/);
});

test("fail-closed catches a novel mutating command nobody put on the deny-list", () => {
  // The whole point: a deny-list alone fails OPEN on commands nobody foresaw.
  for (const cmd of ["kubectl delete pod x", "terraform apply", "aws s3 rm s3://b/k", "dd if=/dev/zero of=/x"]) {
    assert.equal(classifyBlock(cmd).klass, "mutating", `${cmd} must not be runnable`);
  }
});

test("named deny-list entries produce a precise reason", () => {
  const cases = [
    ["gh pr comment 12 --body hi", "gh pr comment"],
    ["gh issue close 4", "gh issue"],
    ["gh api repos/x/y -X POST", "gh api with method"],
    ["curl -X POST https://example.test", "curl write method"],
    ["git push origin HEAD", "git push"],
    ["git commit -m x", "git commit"],
    ["rm -rf build", "rm -rf"],
    ["sed -i 's/a/b/' f.txt", "sed -i"],
  ];
  for (const [code, name] of cases) {
    const r = classifyBlock(code);
    assert.equal(r.klass, "mutating", code);
    assert.equal(r.reason, `deny-list: ${name}`, code);
  }
});

test("gh and curl are skipped even in read-only form — a QA gate makes no network calls", () => {
  assert.equal(classifyBlock("gh pr view 12 --json number").klass, "mutating");
  assert.equal(classifyBlock("curl -sf https://example.test").klass, "mutating");
});

test("read-only git subcommands are allowed; other git subcommands are not", () => {
  assert.equal(classifyBlock("git log --oneline -1").klass, "runnable");
  assert.equal(classifyBlock("git status --porcelain").klass, "runnable");
  assert.equal(classifyBlock("git rev-parse HEAD").klass, "runnable");
  assert.equal(classifyBlock("git checkout -b feature/x").klass, "mutating");
});

test("every git invocation is resolved, not just the first in the block", () => {
  // Found by dogfooding this engine on a real skill file. Resolving `git`
  // against the FIRST `git …` in the block fails OPEN: an opening `git rev-parse`
  // licensed every later git subcommand in the same block.
  assert.equal(classifyBlock("git rev-parse HEAD\ngit checkout -b x").klass, "mutating");
  assert.equal(classifyBlock("git rev-parse HEAD\ngit diff --stat").klass, "runnable");
});

test("case-arm patterns and quote artifacts are not read as commands", () => {
  // Also from the dogfood run: a `case` statement reported its glob arms as
  // unrecognised commands, so a read-only block was skipped as mutating.
  const block = [
    'case "$T" in',
    '  *://*/pull/*) echo web ;;',
    '  *[!0-9]*) echo branch ;;',
    '  *) echo number ;;',
    "esac",
  ].join("\n");
  assert.equal(classifyBlock(block, { T: "x" }).klass, "runnable");
});

test("a command substitution's inner command is scanned, not swallowed", () => {
  // `P=$(git remote get-url origin)` used to skip `P=$(git` as an assignment and
  // then read `remote` as the command word — hiding the real invocation.
  const r = classifyBlock("P=$(git remote get-url origin)");
  assert.equal(r.klass, "mutating", "git remote is not a read-only subcommand");
  assert.match(r.reason, /git remote/);
  assert.equal(classifyBlock("H=$(git rev-parse HEAD)").klass, "runnable");
});

test("arithmetic expansion is arithmetic, not an invocation", () => {
  // `$((N + 1))` used to become a segment whose first token was `N`, reported as
  // an unrecognised command — so a read-only block was skipped as mutating.
  assert.equal(
    classifyBlock('N=$(ls | wc -l)\nif [ -n "$N" ]; then M=$((N + 1)); fi').klass,
    "runnable",
  );
});

test("a backslash line-continuation does not start a new command", () => {
  // `git log ... -- \` + `  apps packages` reported `apps` as a command.
  const block = [
    "D=x",
    'C=$(git log --since="$D" --name-only --format="" -- \\',
    "  apps packages 2>/dev/null | sort -u | head -1)",
  ].join("\n");
  assert.equal(classifyBlock(block).klass, "runnable");
});

test("a failure identical in every shell is annotated as not a portability defect", { skip: !zshAvailable() }, () => {
  const { findings } = runBlock("exit 4", { shells: ["bash", "zsh"], cwd: tmp() });
  const f = findings.find((x) => x.kind === "execution-failure");
  assert.ok(f);
  assert.match(f.detail, /identical in every shell/);
});

test("template slots classify as placeholder", () => {
  assert.equal(classifyBlock("echo {task-id}").klass, "placeholder");
  assert.equal(classifyBlock("cat <path>").klass, "placeholder");
});

test("shell parameter expansion is not a template slot", () => {
  // `${VAR}` must not be mistaken for `{VAR}` — the negative lookbehind is load-bearing.
  assert.equal(classifyBlock("D=x\necho \"${D}\"").klass, "runnable");
});

test("redirections and heredocs are not template slots", () => {
  assert.equal(classifyBlock("echo hi 2>/dev/null").klass, "runnable");
  assert.equal(classifyBlock("cat <<'EOF'\nnot a <placeholder> here\nEOF").klass, "runnable");
});

test("a mutating command inside a heredoc body is data, not an invocation", () => {
  // Heredoc bodies are content. Scanning them for commands would classify a doc
  // that merely QUOTES `git push` as mutating.
  assert.equal(classifyBlock("cat <<'EOF'\ngit push origin main\nEOF").klass, "runnable");
});

test("mutating beats placeholder when a block is both", () => {
  const r = classifyBlock("git push origin {branch}");
  assert.equal(r.klass, "mutating");
  assert.match(r.reason, /deny-list/);
});

test("an unbound variable makes a block a placeholder, not a failure", () => {
  const r = classifyBlock('ls "$DOC_FILE"');
  assert.equal(r.klass, "placeholder");
  assert.match(r.reason, /unbound-variable: DOC_FILE/);
});

test("a caller binding satisfies the variable", () => {
  assert.equal(classifyBlock('ls "$DOC_FILE"', { DOC_FILE: "/tmp/x" }).klass, "runnable");
});

test("a variable assigned inside the block needs no binding", () => {
  assert.equal(classifyBlock('D=.\nls "$D"').klass, "runnable");
});

test("commandWords ignores leading assignments and redirections", () => {
  assert.deepEqual(commandWords("FOO=1 ls -la"), ["ls"]);
  assert.deepEqual(commandWords("2>/dev/null echo hi"), ["echo"]);
});

test("unboundVariables recognises for-loop and read bindings", () => {
  assert.deepEqual(unboundVariables("for pat in a b; do echo \"$pat\"; done", {}), []);
  assert.deepEqual(unboundVariables("read -r line\necho \"$line\"", {}), []);
});

// ── 3. Dual-shell execution ───────────────────────────────────────────────────

test("agreeing block under both shells produces no finding", { skip: !zshAvailable() }, () => {
  const { findings } = runBlock("echo hello", { shells: ["bash", "zsh"], cwd: tmp() });
  assert.deepEqual(findings, []);
});

test("a non-zero exit is reported as execution-failure with high confidence", () => {
  const { findings } = runBlock("exit 3", { shells: ["bash"], cwd: tmp() });
  const f = findings.find((x) => x.kind === "execution-failure");
  assert.ok(f, "expected an execution-failure finding");
  assert.equal(f.confidence, "high");
});

test("a hanging block is terminated by the timeout rather than hanging the run", () => {
  const { findings } = runBlock("sleep 30", { shells: ["bash"], cwd: tmp(), timeout: BLOCK_TIMEOUT_MS });
  assert.ok(
    findings.some((f) => f.kind === "execution-timeout" || f.kind === "execution-failure"),
    "expected the timeout to end the block",
  );
});

// ── 4. Regression fixture: the task-66 defect ─────────────────────────────────

/**
 * A work-item directory holding six of the seven artifact kinds. `*.bug.*.md` is
 * deliberately absent — that single missing kind is what detonates the pre-fix block.
 */
function trailFixture() {
  const root = tmp();
  const d = join(root, "d");
  mkdirSync(d, { recursive: true });
  for (const f of [
    "a.implementation.1.x.md",
    "a.qa.1.x.md",
    "a.gate.1.x.yml",
    "a.dod.1.x.md",
    "a-sprint-review-summary.md",
    "a.handover.1.x.md",
  ]) writeFileSync(join(d, f), "");
  return root;
}

const PRE_FIX = [
  "D=d",
  'ls "$D"/*.implementation.*.md "$D"/*.qa.*.md "$D"/*.gate.*.yml "$D"/*.dod.*.md ' +
    '"$D"/*sprint-review-summary.md "$D"/*.bug.*.md "$D"/*.handover.*.md 2>/dev/null',
].join("\n");

const POST_FIX = [
  "D=d",
  'for pat in "*.implementation.*.md" "*.qa.*.md" "*.gate.*.yml" "*.dod.*.md" ' +
    '"*sprint-review-summary.md" "*.bug.*.md" "*.handover.*.md"; do',
  '  find "$D" -maxdepth 1 -name "$pat" 2>/dev/null',
  "done | sort",
].join("\n");

test("the pre-fix task-66 block is caught as a shell disagreement", { skip: !zshAvailable() }, () => {
  const cwd = trailFixture();
  const { runs, findings } = runBlock(PRE_FIX, { shells: ["bash", "zsh"], cwd });

  // The measured shape of the defect: bash lists six, zsh lists nothing.
  assert.equal(runs.bash.stdout.split("\n").filter(Boolean).length, 6, "bash should list 6 artifacts");
  assert.equal(runs.zsh.stdout, "", "zsh should list nothing — the glob aborts the command");
  assert.match(runs.zsh.stderr, /no matches found/);

  const disagreement = findings.find((f) => f.kind === "shell-disagreement");
  assert.ok(disagreement, "expected a shell-disagreement finding");
  assert.equal(disagreement.confidence, "medium");

  rmSync(cwd, { recursive: true, force: true });
});

test("exit status alone cannot catch the defect — both shells exit non-zero", { skip: !zshAvailable() }, () => {
  // This is why stdout is the load-bearing comparison. If the implementation ever
  // regressed to comparing only exit codes, the defect would look clean.
  const cwd = trailFixture();
  const { runs } = runBlock(PRE_FIX, { shells: ["bash", "zsh"], cwd });
  assert.notEqual(runs.bash.status, 0);
  assert.notEqual(runs.zsh.status, 0);
  assert.equal(runs.bash.status, runs.zsh.status, "the exit codes AGREE — only stdout differs");
  rmSync(cwd, { recursive: true, force: true });
});

test("the post-fix find version is reported clean", { skip: !zshAvailable() }, () => {
  const cwd = trailFixture();
  const { runs, findings } = runBlock(POST_FIX, { shells: ["bash", "zsh"], cwd });
  assert.equal(runs.bash.stdout, runs.zsh.stdout, "both shells must agree");
  assert.equal(runs.bash.stdout.split("\n").filter(Boolean).length, 6);
  assert.deepEqual(findings, [], "the corrected block must raise nothing");
  rmSync(cwd, { recursive: true, force: true });
});

// ── 5. Mutation proofs ────────────────────────────────────────────────────────

test("MUTATION: dropping the zsh arm makes the disagreement finding disappear", { skip: !zshAvailable() }, () => {
  const cwd = trailFixture();

  const both = runBlock(PRE_FIX, { shells: ["bash", "zsh"], cwd });
  assert.ok(both.findings.some((f) => f.kind === "shell-disagreement"));

  // Same block, bash only — the mutation. The defect becomes invisible.
  const bashOnly = runBlock(PRE_FIX, { shells: ["bash"], cwd });
  assert.equal(
    bashOnly.findings.some((f) => f.kind === "shell-disagreement"),
    false,
    "with one shell there is nothing to disagree with — both arms are load-bearing",
  );

  rmSync(cwd, { recursive: true, force: true });
});

test("executeFile itself selects both shells when zsh is present", { skip: !zshAvailable() }, () => {
  // Held deliberately at the executeFile level, not only at runBlock. An earlier
  // draft proved the dual-shell comparison only by passing `shells` explicitly,
  // so hard-coding executeFile to ["bash"] broke nothing — the production entry
  // point was unheld while the mechanism it calls was fully covered.
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, bash("echo ok"));

  const report = executeFile(file, { allowZsh: true });
  assert.deepEqual(report.shells, ["bash", "zsh"]);
  assert.equal(report.zshAvailable, true);
  rmSync(dir, { recursive: true, force: true });
});

test("the task-66 defect is caught end to end, through executeFile", { skip: !zshAvailable() }, () => {
  const cwd = trailFixture();
  const file = join(cwd, "SKILL.md");
  writeFileSync(file, bash(PRE_FIX));

  // `--copy` seeds the temp working directory, so the block sees a real trail.
  const report = executeFile(file, { allowZsh: true, copyFrom: cwd });
  assert.equal(report.counts.runnable, 1, "the block must actually run");
  const f = report.findings.find((x) => x.kind === "shell-disagreement");
  assert.ok(f, "executeFile must surface the disagreement, not just runBlock");
  assert.equal(f.line, 1);

  rmSync(cwd, { recursive: true, force: true });
});

test("MUTATION: removing the fail-closed default lets a novel mutating command execute", () => {
  // Deny-list only (the mutation): `kubectl delete` matches nothing and would run.
  const denyListOnly = (code) =>
    [/\bgit\s+push\b/, /\brm\s+-[A-Za-z]*[rf]/].some((re) => re.test(code)) ? "mutating" : "runnable";

  const novel = "kubectl delete pod api-0";
  assert.equal(denyListOnly(novel), "runnable", "a deny-list alone fails OPEN");
  assert.equal(classifyBlock(novel).klass, "mutating", "the allow-list must fail CLOSED");
});

// ── 6. File-level orchestration ───────────────────────────────────────────────

test("executeFile counts each class and records every skip with a reason", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, md("# S", bash("echo ok"), bash("git push origin main"), bash("echo {id}")));

  const report = executeFile(file, { allowZsh: false });
  assert.equal(report.blocks, 3);
  assert.deepEqual(report.counts, { runnable: 1, placeholder: 1, mutating: 1 });

  const skips = report.results.filter((r) => r.skipped);
  assert.equal(skips.length, 2);
  for (const s of skips) {
    assert.ok(s.reason, "every skip must carry a reason — a silent skip is the bug being prevented");
    assert.ok(Number.isInteger(s.line));
  }
  rmSync(dir, { recursive: true, force: true });
});

test("a mutating block is skipped, not executed", () => {
  const dir = tmp();
  const canary = join(dir, "canary.txt");
  writeFileSync(canary, "intact");
  const file = join(dir, "SKILL.md");
  writeFileSync(file, bash(`rm -rf ${canary}`));

  const report = executeFile(file, { allowZsh: false });
  assert.equal(report.counts.mutating, 1);
  assert.equal(report.counts.runnable, 0);
  // The canary is the real assertion: the deny-listed block never ran.
  assert.equal(readFileSync(canary, "utf8"), "intact");
  rmSync(dir, { recursive: true, force: true });
});

test("zero runnable blocks in a file that HAS blocks is itself a finding", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, md(bash("git push origin main"), bash("echo {id}")));

  const report = executeFile(file, { allowZsh: false });
  assert.equal(report.counts.runnable, 0);
  const f = report.findings.find((x) => x.kind === "zero-blocks-executed");
  assert.ok(f, "a run where nothing executed must not look like a pass");
  // `medium`, not `high`: this reports coverage, not a defect, and `high` is what
  // makes a finding gate-blocking. Measured — qa-task and qa-story both classify
  // 0 runnable without bindings, so `high` would block the change that added this.
  assert.equal(f.confidence, "medium");
  assert.match(f.detail, /placeholder/);
  rmSync(dir, { recursive: true, force: true });
});

test("a file with no bash blocks raises nothing — the step is cheap where it does not apply", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, "# Prose only\n\nNo snippets here.\n");

  const report = executeFile(file, { allowZsh: false });
  assert.equal(report.blocks, 0);
  assert.deepEqual(report.findings, [], "no blocks means no finding, not a zero-executed finding");
  rmSync(dir, { recursive: true, force: true });
});

test("zsh being unavailable is recorded as information and never as a finding", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, bash("echo ok"));

  // --no-zsh models a host without zsh: the bash arm runs alone.
  const report = executeFile(file, { allowZsh: false });
  assert.deepEqual(report.shells, ["bash"]);
  assert.equal(report.counts.runnable, 1, "the runnable count must not drop when zsh is absent");
  assert.deepEqual(report.findings, [], "a missing interpreter is not a defect in the work item");
  rmSync(dir, { recursive: true, force: true });
});
