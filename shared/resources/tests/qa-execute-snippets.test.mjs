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

import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { neverRan, spawnBudget } from "./spawn-budget.mjs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = join(__dirname, "..", "qa-execute-snippets.mjs");

const {
  COMMAND_RUNNERS,
  main,
  SAFE_COMMANDS,
  classifyBlock,
  commandWords,
  executeFile,
  extractBlocks,
  runBlock,
  unboundVariables,
  zshAvailable,
} = await import(MODULE);

const TEMP_DIRS = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "qa-snippets-test-"));
  TEMP_DIRS.push(d);
  return d;
}
// The suite spawns a temp dir per assertion and used to abandon every one of
// them — 146 were found in /tmp during QA. Registering them here makes cleanup
// unconditional rather than dependent on each test remembering.
after(() => {
  for (const d of TEMP_DIRS) rmSync(d, { recursive: true, force: true });
});

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

// Mirrors the module's private SHELL_KEYWORDS for the precedence assertion above;
// a runner appearing here would bypass the COMMAND_RUNNERS check entirely.
const SHELL_KEYWORDS_SNAPSHOT = [
  "!",
  "[",
  "[[",
  "]]",
  "]",
  "{",
  "}",
  "(",
  ")",
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "select",
  "then",
  "until",
  "while",
  ":",
  "break",
  "cd",
  "continue",
  "exit",
  "export",
  "local",
  "read",
  "readonly",
  "return",
  "set",
  "shift",
  "type",
  "unset",
  "which",
];

function md(...blocks) {
  return blocks.join("\n\n");
}

function bash(code) {
  return "```bash\n" + code + "\n```";
}

// ── 1. Extraction ─────────────────────────────────────────────────────────────

test("extracts every fenced bash block with its opening-fence line number", () => {
  const doc = [
    "# Title",
    "",
    bash("echo one"),
    "",
    "prose",
    "",
    bash("echo two"),
  ].join("\n");
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
  const doc = [
    "```yaml",
    "a: 1",
    "```",
    "",
    "```",
    "unlabelled",
    "```",
    "",
    bash("echo yes"),
  ].join("\n");
  const blocks = extractBlocks(doc);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].code, "echo yes");
});

test("an unterminated fence yields no block — we never execute what we cannot delimit", () => {
  assert.deepEqual(extractBlocks("```bash\necho dangling\n"), []);
});

test("multi-line block bodies survive intact", () => {
  const code = 'D=d\nfor f in a b; do\n  echo "$f"\ndone';
  assert.equal(extractBlocks(bash(code))[0].code, code);
});

// ── 2. Classification: the fail-closed safety boundary ────────────────────────

test("a block of allow-listed read-only commands is runnable", () => {
  assert.equal(
    classifyBlock("ls -la\ngrep foo bar.txt | wc -l").klass,
    "runnable",
  );
});

test("fail-closed: an unrecognised command classifies as mutating, never runnable", () => {
  const r = classifyBlock("frobnicate --all");
  assert.equal(r.klass, "mutating");
  assert.match(r.reason, /unrecognised-command: frobnicate/);
  assert.match(r.reason, /fail-closed/);
});

test("fail-closed catches a novel mutating command nobody put on the deny-list", () => {
  // The whole point: a deny-list alone fails OPEN on commands nobody foresaw.
  for (const cmd of [
    "kubectl delete pod x",
    "terraform apply",
    "aws s3 rm s3://b/k",
    "dd if=/dev/zero of=/x",
  ]) {
    assert.equal(
      classifyBlock(cmd).klass,
      "mutating",
      `${cmd} must not be runnable`,
    );
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
  assert.equal(
    classifyBlock("curl -sf https://example.test").klass,
    "mutating",
  );
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
  assert.equal(
    classifyBlock("git rev-parse HEAD\ngit checkout -b x").klass,
    "mutating",
  );
  assert.equal(
    classifyBlock("git rev-parse HEAD\ngit diff --stat").klass,
    "runnable",
  );
});

test("case-arm patterns and quote artifacts are not read as commands", () => {
  // Also from the dogfood run: a `case` statement reported its glob arms as
  // unrecognised commands, so a read-only block was skipped as mutating.
  const block = [
    'case "$T" in',
    "  *://*/pull/*) echo web ;;",
    "  *[!0-9]*) echo branch ;;",
    "  *) echo number ;;",
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
    classifyBlock('N=$(ls | wc -l)\nif [ -n "$N" ]; then M=$((N + 1)); fi')
      .klass,
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

test(
  "a failure identical in every shell is annotated as not a portability defect",
  { skip: !zshAvailable() },
  () => {
    const { findings } = runBlock("exit 4", {
      shells: ["bash", "zsh"],
      cwd: tmp(),
    });
    const f = findings.find((x) => x.kind === "execution-failure");
    assert.ok(f);
    assert.match(f.detail, /identical in every shell/);
  },
);

test("template slots classify as placeholder", () => {
  assert.equal(classifyBlock("echo {task-id}").klass, "placeholder");
  assert.equal(classifyBlock("cat <path>").klass, "placeholder");
});

test("shell parameter expansion is not a template slot", () => {
  // `${VAR}` must not be mistaken for `{VAR}` — the negative lookbehind is load-bearing.
  assert.equal(classifyBlock('D=x\necho "${D}"').klass, "runnable");
});

test("redirections and heredocs are not template slots", () => {
  assert.equal(classifyBlock("echo hi 2>/dev/null").klass, "runnable");
  assert.equal(
    classifyBlock("cat <<'EOF'\nnot a <placeholder> here\nEOF").klass,
    "runnable",
  );
});

test("a mutating command inside a heredoc body is data, not an invocation", () => {
  // Heredoc bodies are content. Scanning them for commands would classify a doc
  // that merely QUOTES `git push` as mutating.
  assert.equal(
    classifyBlock("cat <<'EOF'\ngit push origin main\nEOF").klass,
    "runnable",
  );
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
  assert.equal(
    classifyBlock('ls "$DOC_FILE"', { DOC_FILE: "/tmp/x" }).klass,
    "runnable",
  );
});

test("a variable assigned inside the block needs no binding", () => {
  assert.equal(classifyBlock('D=.\nls "$D"').klass, "runnable");
});

test("commandWords ignores leading assignments and redirections", () => {
  assert.deepEqual(commandWords("FOO=1 ls -la"), ["ls"]);
  assert.deepEqual(commandWords("2>/dev/null echo hi"), ["echo"]);
});

test("unboundVariables recognises for-loop and read bindings", () => {
  assert.deepEqual(
    unboundVariables('for pat in a b; do echo "$pat"; done', {}),
    [],
  );
  assert.deepEqual(unboundVariables('read -r line\necho "$line"', {}), []);
});

// ── 2b. Regressions from QA cycle 1 — every one of these once classified runnable ──

/**
 * Thirteen inputs reached `runnable` in the shipped first draft, each verified
 * against the module rather than inferred. They are kept as one table because
 * they share a single property: the safety boundary must refuse what it cannot
 * read. Losing any row silently reopens a hole that a green suite will not show.
 */
test("QA-1: a write redirection makes any command mutating, allow-listed or not", () => {
  for (const code of [
    "echo pwned > /tmp/qa-x",
    "ls >> /tmp/qa-x",
    "git diff > $HOME/qa-x",
    "cat a &> /tmp/qa-x",
  ]) {
    const r = classifyBlock(code, {});
    assert.equal(r.klass, "mutating", code);
  }
  // The temp cwd is no defence — an absolute target ignores it entirely, which is
  // why this is classification's job and not the sandbox's.
  assert.equal(
    classifyBlock("echo x > /etc/hosts").reason,
    "write-redirection",
  );
});

test("QA-1b: discarding a stream, and duplicating a descriptor, are not writes", () => {
  // Both exemptions are load-bearing. An earlier draft matched `2>&1` and made
  // `command -v zsh >/dev/null 2>&1` — this repo's own documented zsh guard —
  // unrunnable by the gate that recommends it.
  assert.equal(classifyBlock("ls foo 2>/dev/null").klass, "runnable");
  assert.equal(classifyBlock("grep x f 2>/dev/null | wc -l").klass, "runnable");
  assert.equal(classifyBlock("ls >/dev/null").klass, "runnable");
  assert.equal(classifyBlock("ls >/dev/null 2>&1").klass, "runnable");
  assert.equal(
    classifyBlock('find . -name "*.md" 2>/dev/null | sort').klass,
    "runnable",
  );
});

test("QA-2: a `#` inside quotes is data, not a comment", () => {
  // The line regex deleted the rest of the line from BOTH scans while execution
  // still used the original code, so the `rm -rf` was invisible and ran.
  assert.equal(
    classifyBlock('echo "note # here"; rm -rf /tmp/qa-x').klass,
    "mutating",
  );
  assert.equal(
    classifyBlock("echo 'a # b'; git push origin main").klass,
    "mutating",
  );
  // A real trailing comment is still stripped.
  assert.equal(classifyBlock("ls # rm -rf /tmp/qa-x").klass, "runnable");
});

test("QA-3: a here-string is not a heredoc opener", () => {
  // `<<<"DATA"` matched the heredoc regex, so every following line was discarded
  // as "body" — including a trailing rm.
  assert.equal(
    classifyBlock('grep -q x <<<"DATA"\nrm -rf /tmp/qa-x').klass,
    "mutating",
  );
  // A genuine heredoc still shields its body from the command scan.
  assert.equal(
    classifyBlock("cat <<'EOF'\ngit push origin main\nEOF").klass,
    "runnable",
  );
});

test("QA-4: an unreadable command position fails CLOSED", () => {
  // This is the fail-closed rule failing open on the exact case it names: the
  // leading token could not be parsed, so the segment contributed no command word
  // and was treated as harmless.
  assert.equal(classifyBlock("\\mv /tmp/a /tmp/b").klass, "mutating");
  const varCmd = classifyBlock("CMD=rm\n$CMD -rf /tmp/qa-x");
  assert.equal(varCmd.klass, "mutating");
  assert.match(varCmd.reason, /unparseable/);
  // A backslash-quoted SAFE command is still safe — the fix strips the quote and
  // re-tests rather than refusing everything it does not recognise on sight.
  assert.equal(classifyBlock("\\ls -la").klass, "runnable");
});

test("QA-5: command runners are refused — their blast radius is what follows", () => {
  for (const code of [
    "env touch /tmp/qa-x",
    "command mv a b",
    "time mv a b",
    "xargs rm",
    "sudo rm -f /tmp/qa-x",
    "nohup mv a b",
  ]) {
    assert.equal(classifyBlock(code).klass, "mutating", code);
  }
});

test("QA-5b: COMMAND_RUNNERS takes precedence over the allow-list", () => {
  // Without this ordering the runners check is dead code: they are already absent
  // from SAFE_COMMANDS, so the fallthrough catches them and nothing proves the set
  // does anything. Its real job is to survive someone re-adding `env` or `xargs`
  // to the allow-list — a plausible future edit that would silently reopen QA-5.
  assert.ok(COMMAND_RUNNERS.has("env"), "env must be a declared runner");
  assert.ok(COMMAND_RUNNERS.has("xargs"), "xargs must be a declared runner");
  assert.ok(COMMAND_RUNNERS.has("awk"), "awk must be a declared runner");
  for (const r of COMMAND_RUNNERS) {
    assert.equal(
      SAFE_COMMANDS.has(r),
      false,
      `${r} must not also be allow-listed`,
    );
    assert.equal(
      SHELL_KEYWORDS_SNAPSHOT.includes(r),
      false,
      `${r} must not be a shell keyword`,
    );
  }
});

test("QA-5c: `command -v` is a lookup and stays runnable; bare `command` does not", () => {
  assert.equal(
    classifyBlock("command -v zsh >/dev/null 2>&1").klass,
    "runnable",
  );
  assert.equal(
    classifyBlock("if command -v zsh >/dev/null 2>&1; then echo yes; fi").klass,
    "runnable",
  );
  // The exception is anchored to the flag. Bare `command` still runs its argument.
  assert.equal(classifyBlock("command mv a b").klass, "mutating");
  assert.equal(classifyBlock("command rm -f /tmp/x").klass, "mutating");
});

test("QA-14: an obfuscated command name is unquoted before it is judged", () => {
  // Found at the DoD gate, after cycle 1 had already closed thirteen holes.
  // `who\'am\'i` blanked to `who''i`, failed the command-name test, and was
  // treated as NO COMMAND — so the segment read as harmless and the binary ran.
  // A scanner an attacker defeats with one quote is not a boundary.
  for (const code of [
    "who'am'i",
    'to"u"ch /tmp/x',
    "t\\ouch /tmp/x",
    "g\\h pr comment 1 --body x",
    "cu'r'l -X POST https://example.test/",
  ]) {
    assert.equal(classifyBlock(code, {}).klass, "mutating", code);
  }
  // A backslash-quoted SAFE command still resolves, because the backslash is
  // removed before the name is read.
  assert.equal(classifyBlock("\\ls -la").klass, "runnable");

  // But a name spelled with EMBEDDED quotes is refused even when the underlying
  // command is safe: quote contents are blanked before the name is read, so
  // `l's'` reconstructs as `l` rather than `ls`. That is deliberate and it is the
  // right direction to be wrong in — no real documentation writes `l's' -la`, and
  // a boundary that guesses at a half-erased name is worse than one that refuses
  // it. The security property asserted above (an obfuscated name never reaches
  // `runnable`) does not depend on reconstructing the name correctly.
  assert.equal(classifyBlock("l's' -la").klass, "mutating");
});

test("QA-15: a glob or tilde in command position is unsafe, not absent", () => {
  // The scanner cannot say what `/usr/bin/[t]ouch` expands to. "Cannot say" must
  // never resolve to "safe".
  for (const code of [
    "/usr/bin/[t]ouch /tmp/x",
    "/usr/bin/touc? /tmp/x",
    "~/../../usr/bin/whoami",
  ]) {
    assert.equal(classifyBlock(code, {}).klass, "mutating", code);
  }
});

test("QA-15b: a case-arm pattern is still not an invocation", () => {
  // The counterweight to QA-15. Arm patterns are globs too, and the ONLY thing
  // distinguishing them is the trailing `)` — which is why the stripper stopped
  // erasing it. Without this the previous fix refuses every case statement.
  const block = [
    'case "$T" in',
    "  *://*/pull/*) echo web ;;",
    "  *[!0-9]*) echo branch ;;",
    "  *) echo number ;;",
    "esac",
  ].join("\n");
  assert.equal(classifyBlock(block, { T: "x" }).klass, "runnable");
});

test("QA-16: a redirection on a heredoc-opening line is not lost with the body", () => {
  // The opener line was truncated at `<<`, discarding the redirection before the
  // write-redirect check ever saw it.
  assert.equal(classifyBlock("cat <<EOF > /tmp/x\nhi\nEOF").klass, "mutating");
  assert.equal(
    classifyBlock("cat <<'EOF' >> ~/.zshrc\nevil\nEOF").klass,
    "mutating",
  );
  // A heredoc with no redirection is still fine, and its body is still data.
  assert.equal(
    classifyBlock("cat <<'EOF'\ngit push origin main\nEOF").klass,
    "runnable",
  );
});

test("QA-17: write flags are caught wherever they appear in the invocation", () => {
  // Anchoring `-i` to sed's first argument missed both of these.
  assert.equal(classifyBlock("sed 's/a/b/' -i file.txt").klass, "mutating");
  assert.equal(classifyBlock("sed -e 's/a/b/' -i file.txt").klass, "mutating");
  // Long-form output flags write a file while carrying no `>` to be caught by
  // the redirection rule.
  assert.equal(
    classifyBlock("sort --output=/tmp/x file.txt").klass,
    "mutating",
  );
  assert.equal(classifyBlock("git diff --output=/tmp/x").klass, "mutating");
  assert.equal(classifyBlock("sort -o /tmp/x file.txt").klass, "mutating");
});

test("QA-6: awk is refused — its program is a quoted argument the scan cannot see", () => {
  assert.equal(
    classifyBlock(`awk 'BEGIN{system("touch /tmp/qa-x")}'`).klass,
    "mutating",
  );
  assert.equal(classifyBlock(`awk '{print > "/etc/x"}'`).klass, "mutating");
});

test("QA-7: find is read-only until given a write action", () => {
  assert.equal(classifyBlock("find . -name x -delete").klass, "mutating");
  assert.equal(classifyBlock("find . -exec mv {} /tmp \\;").klass, "mutating");
  assert.equal(classifyBlock("sort -o out.txt in.txt").klass, "mutating");
  assert.equal(classifyBlock("ls | tee out.txt").klass, "mutating");
  // The read-only form this engine actually relies on stays runnable.
  assert.equal(
    classifyBlock('find . -maxdepth 1 -name "*.md"').klass,
    "runnable",
  );
});

test("QA-8: process substitution starts its own segment", () => {
  // `<(…)` kept the inner command glued to the outer segment's tail, and only the
  // first token of a segment is examined — so `cat` was all the scanner saw.
  assert.equal(classifyBlock("cat <(touch /tmp/qa-x)").klass, "mutating");
  assert.equal(classifyBlock("diff <(ls a) <(ls b)").klass, "runnable");
});

test("QA-9: the sed deny-list covers the long form", () => {
  assert.equal(
    classifyBlock("sed --in-place 's/a/b/' f.txt").klass,
    "mutating",
  );
  assert.equal(
    classifyBlock("sed --in-place=.bak 's/a/b/' f.txt").klass,
    "mutating",
  );
  assert.equal(classifyBlock("sed -i 's/a/b/' f.txt").klass, "mutating");
  assert.equal(classifyBlock("sed -E 's/a/b/' f.txt").klass, "runnable");
});

test("QA-10: an attributed fence does not desynchronise the file", () => {
  // The worst shape this took: the attributed opener was not recognised, its body
  // was dropped, and its CLOSING fence was then read as an OPENING one — so the
  // rest of the document was parsed inside-out and the gate reported a clean run
  // on a file it had never read.
  const doc = [
    "```bash showLineNumbers",
    "echo one",
    "```",
    "",
    "```bash",
    "echo two",
    "```",
  ].join("\n");
  const blocks = extractBlocks(doc);
  assert.equal(blocks.length, 2);
  assert.deepEqual(
    blocks.map((b) => b.code),
    ["echo one", "echo two"],
  );
  assert.deepEqual(
    extractBlocks('```bash title="x"\necho a\n```').map((b) => b.code),
    ["echo a"],
  );
});

test("QA-11: a failing --copy removes the temp directory it created", () => {
  const before = readdirSync(tmpdir()).filter((n) =>
    /^qa-snippets-[^t]/.test(n),
  ).length;
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, bash("echo ok"));
  executeFile(file, { allowZsh: false });
  assert.throws(() =>
    executeFile(file, { allowZsh: false, copyFrom: "/nonexistent-qa-path" }),
  );
  const after_ = readdirSync(tmpdir()).filter((n) =>
    /^qa-snippets-[^t]/.test(n),
  ).length;
  assert.equal(
    after_,
    before,
    "neither the happy nor the failing path may leak a temp dir",
  );
});

test("QA-12: snippets do not inherit the parent environment", () => {
  // The header claims the execution environment carries no credentials. It did.
  process.env.QA_FAKE_SECRET = "sekrit";
  try {
    const { runs } = runBlock('echo "[${QA_FAKE_SECRET}]"', {
      shells: ["bash"],
      cwd: tmp(),
    });
    assert.equal(
      runs.bash.stdout,
      "[]",
      "the parent env must not reach the snippet",
    );
  } finally {
    delete process.env.QA_FAKE_SECRET;
  }
});

test("QA-13: the sandbox sentinel catches a block that escapes its working copy", () => {
  // Defence in depth. Classification is the first line and it was wrong thirteen
  // ways; this is the second, and it deliberately does NOT consult the classifier.
  const root = tmp();
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });

  const { findings } = runBlock("echo escaped > ../ESCAPED", {
    shells: ["bash"],
    cwd: work,
    sandboxRoot: root,
  });
  const f = findings.find((x) => x.kind === "escaped-sandbox");
  assert.ok(
    f,
    "a write outside the working copy must be reported whatever the classifier said",
  );
  assert.equal(f.confidence, "high");
  assert.match(f.detail, /ESCAPED/);
});

test("QA-13b: writing inside the working copy does not trip the sentinel", () => {
  const root = tmp();
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });
  const { findings } = runBlock("echo inside > ./file.txt", {
    shells: ["bash"],
    cwd: work,
    sandboxRoot: root,
  });
  assert.deepEqual(
    findings.filter((f) => f.kind === "escaped-sandbox"),
    [],
  );
});

// ── 3. Dual-shell execution ───────────────────────────────────────────────────

test(
  "agreeing block under both shells produces no finding",
  { skip: !zshAvailable() },
  () => {
    const { findings } = runBlock("echo hello", {
      shells: ["bash", "zsh"],
      cwd: tmp(),
    });
    assert.deepEqual(findings, []);
  },
);

test("a non-zero exit is reported as execution-failure with high confidence", () => {
  const { findings } = runBlock("exit 3", { shells: ["bash"], cwd: tmp() });
  const f = findings.find((x) => x.kind === "execution-failure");
  assert.ok(f, "expected an execution-failure finding");
  assert.equal(f.confidence, "high");
});

test("a hanging block is terminated by the timeout rather than hanging the run", () => {
  // Accepting `execution-failure` as an alternative made this pass even if timeout
  // classification regressed, and nothing measured that the 30s sleep was actually
  // cut off rather than waited out — the one property worth asserting.
  const started = Date.now();
  const { findings } = runBlock("sleep 30", {
    shells: ["bash"],
    cwd: tmp(),
    timeout: BLOCK_TIMEOUT_MS,
  });
  const elapsed = Date.now() - started;
  assert.ok(
    findings.some((f) => f.kind === "execution-timeout"),
    "the block must be reported as a timeout, not merely as a failure",
  );
  assert.ok(
    elapsed < 10_000,
    `the 30s sleep must be truncated, took ${elapsed}ms`,
  );
});

test("a block that terminates itself is not reported as a timeout", () => {
  const { findings } = runBlock("kill -TERM $$", {
    shells: ["bash"],
    cwd: tmp(),
  });
  assert.equal(
    findings.some((f) => f.kind === "execution-timeout"),
    false,
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
  ])
    writeFileSync(join(d, f), "");
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

test(
  "the pre-fix task-66 block is caught as a shell disagreement",
  { skip: !zshAvailable() },
  () => {
    const cwd = trailFixture();
    const { runs, findings } = runBlock(PRE_FIX, {
      shells: ["bash", "zsh"],
      cwd,
    });

    // The measured shape of the defect: bash lists six, zsh lists nothing.
    assert.equal(
      runs.bash.stdout.split("\n").filter(Boolean).length,
      6,
      "bash should list 6 artifacts",
    );
    assert.equal(
      runs.zsh.stdout,
      "",
      "zsh should list nothing — the glob aborts the command",
    );
    assert.match(runs.zsh.stderr, /no matches found/);

    const disagreement = findings.find((f) => f.kind === "shell-disagreement");
    assert.ok(disagreement, "expected a shell-disagreement finding");
    assert.equal(disagreement.confidence, "medium");

    rmSync(cwd, { recursive: true, force: true });
  },
);

test(
  "exit status alone cannot catch the defect — both shells exit non-zero",
  { skip: !zshAvailable() },
  () => {
    // This is why stdout is the load-bearing comparison. If the implementation ever
    // regressed to comparing only exit codes, the defect would look clean.
    const cwd = trailFixture();
    const { runs } = runBlock(PRE_FIX, { shells: ["bash", "zsh"], cwd });
    assert.notEqual(runs.bash.status, 0);
    assert.notEqual(runs.zsh.status, 0);
    assert.equal(
      runs.bash.status,
      runs.zsh.status,
      "the exit codes AGREE — only stdout differs",
    );
    rmSync(cwd, { recursive: true, force: true });
  },
);

test(
  "the post-fix find version is reported clean",
  { skip: !zshAvailable() },
  () => {
    const cwd = trailFixture();
    const { runs, findings } = runBlock(POST_FIX, {
      shells: ["bash", "zsh"],
      cwd,
    });
    assert.equal(runs.bash.stdout, runs.zsh.stdout, "both shells must agree");
    assert.equal(runs.bash.stdout.split("\n").filter(Boolean).length, 6);
    assert.deepEqual(findings, [], "the corrected block must raise nothing");
    rmSync(cwd, { recursive: true, force: true });
  },
);

// ── 5. Mutation proofs ────────────────────────────────────────────────────────

test(
  "MUTATION: dropping the zsh arm makes the disagreement finding disappear",
  { skip: !zshAvailable() },
  () => {
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
  },
);

test(
  "executeFile itself selects both shells when zsh is present",
  { skip: !zshAvailable() },
  () => {
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
  },
);

test(
  "the task-66 defect is caught end to end, through executeFile",
  { skip: !zshAvailable() },
  () => {
    const cwd = trailFixture();
    const file = join(cwd, "SKILL.md");
    writeFileSync(file, bash(PRE_FIX));

    // `--copy` seeds the temp working directory, so the block sees a real trail.
    const report = executeFile(file, { allowZsh: true, copyFrom: cwd });
    assert.equal(report.counts.runnable, 1, "the block must actually run");
    const f = report.findings.find((x) => x.kind === "shell-disagreement");
    assert.ok(
      f,
      "executeFile must surface the disagreement, not just runBlock",
    );
    assert.equal(f.line, 1);

    rmSync(cwd, { recursive: true, force: true });
  },
);

test("MUTATION: the allow-list, not the deny-list, is what refuses a novel command", () => {
  // An earlier version asserted against a locally defined deny-list fake, which
  // could never fail regardless of module behaviour. Assert a property of the
  // MODULE instead: the command is refused, and refused for the fail-closed
  // reason rather than by matching a named deny pattern.
  const r = classifyBlock("kubectl delete pod api-0");
  assert.equal(r.klass, "mutating");
  assert.match(r.reason, /fail-closed/);
  assert.doesNotMatch(
    r.reason,
    /deny-list/,
    "nothing on the deny-list names kubectl",
  );
});

// ── 5b. CLI surface ───────────────────────────────────────────────────────────

test("main() exit codes and argument validation", () => {
  const dir = tmp();
  const clean = join(dir, "clean.md");
  writeFileSync(clean, bash("echo ok"));
  const findings = join(dir, "findings.md");
  writeFileSync(findings, bash("exit 3"));

  // 0 = clean, 1 = findings, 2 = hard error. Callers depend on this contract and
  // nothing exercised it.
  assert.equal(main(["--file", clean, "--no-zsh"]).exitCode, 0);
  assert.equal(main(["--file", findings, "--no-zsh"]).exitCode, 1);
  assert.equal(main(["--file", "/no/such/file.md", "--no-zsh"]).exitCode, 2);
  assert.equal(main([]).exitCode, 2, "--file is required");
  assert.equal(main(["--bogus"]).exitCode, 2);
  assert.equal(main(["--help"]).exitCode, 0);
});

test("main() validates --bind and --timeout", () => {
  const dir = tmp();
  const f = join(dir, "s.md");
  writeFileSync(f, bash("echo ok"));

  assert.equal(main(["--file", f, "--bind", "novalue"]).exitCode, 2);
  assert.match(main(["--file", f, "--bind", "novalue"]).error, /bad --bind/);

  // `--timeout 0` is the case that matters, and it is not the one the finding
  // named. Node THROWS ERR_OUT_OF_RANGE on NaN and on a negative value, so those
  // already fail loudly with or without validation. `0`, however, is accepted by
  // spawnSync and means "no timeout" — that is the value that silently disables
  // hang protection, so that is what this rejects.
  assert.equal(main(["--file", f, "--timeout", "0"]).exitCode, 2);
  assert.match(main(["--file", f, "--timeout", "0"]).error, /positive/);
  // NaN and negative still exit 2; validation makes the message useful rather
  // than surfacing an opaque ERR_OUT_OF_RANGE.
  assert.equal(main(["--file", f, "--timeout", "abc"]).exitCode, 2);
  assert.equal(main(["--file", f, "--timeout", "-1"]).exitCode, 2);
  // Generous on purpose: this asserts that a valid value is ACCEPTED, not that any
  // particular duration is enough. A tight value here made the test flaky under
  // load, failing on shell startup rather than on the thing being tested.
  assert.equal(
    main(["--file", f, "--timeout", "30000", "--no-zsh"]).exitCode,
    0,
  );

  // A well-formed binding is accepted and reaches the block.
  const bound = join(dir, "b.md");
  writeFileSync(bound, bash('test -n "$MY_VAL"'));
  assert.equal(
    main(["--file", bound, "--bind", "MY_VAL=x", "--no-zsh"]).exitCode,
    0,
  );
});

// ── 6. File-level orchestration ───────────────────────────────────────────────

test("executeFile counts each class and records every skip with a reason", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(
    file,
    md("# S", bash("echo ok"), bash("git push origin main"), bash("echo {id}")),
  );

  const report = executeFile(file, { allowZsh: false });
  assert.equal(report.blocks, 3);
  assert.deepEqual(report.counts, { runnable: 1, placeholder: 1, mutating: 1 });

  const skips = report.results.filter((r) => r.skipped);
  assert.equal(skips.length, 2);
  for (const s of skips) {
    assert.ok(
      s.reason,
      "every skip must carry a reason — a silent skip is the bug being prevented",
    );
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
  assert.deepEqual(
    report.findings,
    [],
    "no blocks means no finding, not a zero-executed finding",
  );
  rmSync(dir, { recursive: true, force: true });
});

test("zsh being unavailable is recorded as information and never as a finding", () => {
  const dir = tmp();
  const file = join(dir, "SKILL.md");
  writeFileSync(file, bash("echo ok"));

  // --no-zsh models a host without zsh: the bash arm runs alone.
  const report = executeFile(file, { allowZsh: false });
  assert.deepEqual(report.shells, ["bash"]);
  assert.equal(
    report.counts.runnable,
    1,
    "the runnable count must not drop when zsh is absent",
  );
  assert.deepEqual(
    report.findings,
    [],
    "a missing interpreter is not a defect in the work item",
  );
  rmSync(dir, { recursive: true, force: true });
});

// ── CLI entrypoint guard ──────────────────────────────────────────────────────
//
// Everything above this line tests the engine's exported functions in-process.
// None of it reaches the module-level `if (…) main()` guard at the bottom of the
// file, which is why bug.4 lived there undetected: the engine was thoroughly
// tested and completely unable to run.
//
// The two tests below are deliberately a pair, and the reason is bug.3. That bug
// shipped a structural scan which passed under mutation on the exact defect it
// named — a scan can only ever assert that the source LOOKS right. So the
// behavioural test is the one that holds this bug (it actually invokes the CLI
// through a symlink and demands output), and the structural test only stops the
// class from reappearing in some new file that no behavioural test covers yet.
// Neither substitutes for the other.

/**
 * The engine's real path, plus every generated copy `npm run bundle` writes.
 *
 * The bundled copies are what the documented invocations actually name
 * (`.agents/skills/qa-task/references/…`), so a fix that lands only in the
 * source and is never bundled would leave every real caller broken. Scanning
 * the copies is what makes that visible here rather than in production.
 */
const ENGINE_COPIES = [
  join(__dirname, "..", "qa-execute-snippets.mjs"),
  ...["qa-task", "qa-story", "develop-task", "develop-story"].map((s) =>
    join(
      __dirname,
      "..",
      "..",
      "..",
      "skills",
      s,
      "references",
      "qa-execute-snippets.mjs",
    ),
  ),
];

/**
 * Spawn the engine's CLI under the shared load budget — bug.2's remedy.
 *
 * The two CLI-invoking tests below fork a real node process (which itself forks a
 * shell per block), so they are exactly the spawn-heavy shape `spawn-budget.mjs`
 * exists for: their latency is a function of machine load, not of the code under
 * test. (The third, the copies scan, only reads files.) Retrying only
 * when the child NEVER RAN is the important half — a child that ran and exited
 * non-zero is a result and must not be retried away.
 *
 * `--no-zsh` is deliberate. These tests assert that the CLI runs *at all* through a
 * symlink; the dual-shell behaviour is covered by the suite above. Forcing the bash
 * arm halves the subprocesses each one costs.
 */
const CLI_BUDGET = spawnBudget("SNIPPETS");

function runCli(args) {
  let result;
  for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt++) {
    result = spawnSync(process.execPath, args, {
      encoding: "utf-8",
      timeout: CLI_BUDGET.timeoutMs,
    });
    if (!neverRan(result)) return result;
  }
  return result;
}

test("CLI: runs when invoked through a symlinked path", () => {
  // `.agents/skills` and `.claude/skills` are symlinks to `../skills`, in this
  // repo and in every consumer install, so argv[1] arrives symlinked while
  // import.meta.url has already been realpath-resolved by Node. Comparing them
  // raw makes the direct-invocation guard false and main() never runs: exit 0,
  // no output. That is indistinguishable from a clean run with nothing to
  // report — so the QA step built to catch prose that never executes was itself
  // never executing, and recording a pass. See bug.4.
  const dir = tmp();
  const link = join(dir, "qa-execute-snippets-link.mjs");
  symlinkSync(MODULE, link);

  // A file with one plainly runnable block: the engine must execute it and say so.
  const target = join(dir, "SKILL.md");
  writeFileSync(target, bash("echo ok"));

  const r = runCli([link, "--file", target, "--json", "--no-zsh"]);

  // A child that exhausted its retries has stdout === null, so the length
  // assertion below would throw a TypeError and never print its message —
  // losing exactly the legibility it exists for. Separate "never ran" (a load
  // problem) from "ran and said nothing" (this bug).
  assert.ok(
    !neverRan(r),
    `the CLI never ran: ${r.error ?? r.signal} — a load problem, not this bug`,
  );

  // Assert on stdout FIRST and by length. The failure mode is silence, and an
  // empty-string assertion reports it far more legibly than a JSON.parse throw.
  assert.ok(
    r.stdout.length > 0,
    `the CLI produced no stdout when invoked through a symlink — the entrypoint ` +
      `guard did not fire (exit=${r.status}, stderr=${JSON.stringify(r.stderr)})`,
  );

  const report = JSON.parse(r.stdout);
  assert.equal(
    report.counts.runnable,
    1,
    "the block should have been executed",
  );
  assert.equal(r.status, 0, "a clean file exits 0");
});

test("CLI: the symlinked and real invocation paths agree exactly", () => {
  // The bug was not that the symlinked path was *degraded* — it produced nothing
  // at all. Pinning the two paths to identical stdout and identical exit status
  // is what makes any future divergence between them a failure, rather than only
  // the total-silence case the test above names.
  const dir = tmp();
  const link = join(dir, "qa-execute-snippets-link.mjs");
  symlinkSync(MODULE, link);

  const target = join(dir, "SKILL.md");
  writeFileSync(target, bash("echo ok"));

  const viaLink = runCli([link, "--file", target, "--json", "--no-zsh"]);
  const viaReal = runCli([MODULE, "--file", target, "--json", "--no-zsh"]);

  // Check BOTH arms ran before touching either one's stdout. Two distinct
  // failures hide here, and the second is the dangerous one: if viaReal never
  // ran, the vacuity guard below throws a TypeError on null and prints nothing;
  // but if only viaLink never ran, control reaches the equality assertion and
  // `null !== "{…}"` is reported as "the invocation path must not change the
  // report" — a behavioural divergence that never happened, on a machine that
  // was merely loaded. That is the precise false positive neverRan() exists to
  // prevent, and it is the same class as the guard nine lines above in the
  // previous test.
  assert.ok(
    !neverRan(viaLink) && !neverRan(viaReal),
    `a CLI arm never ran (link: ${viaLink.error ?? viaLink.signal}, ` +
      `real: ${viaReal.error ?? viaReal.signal}) — a load problem, not a divergence`,
  );

  // Without this, the test passes vacuously if the entrypoint block is deleted
  // outright: both arms fall silent, and "" === "" with 0 === 0 satisfies both
  // assertions below. Test 1 covers deletion, but this pair must not agree by
  // agreeing on nothing.
  assert.ok(
    viaReal.stdout.length > 0,
    "the real path produced no output — the comparison below would be vacuous",
  );

  assert.equal(
    viaLink.stdout,
    viaReal.stdout,
    "the invocation path must not change the report",
  );
  assert.equal(
    viaLink.status,
    viaReal.status,
    "the invocation path must not change the exit code",
  );
});

test("CLI: no engine copy carries a naive entrypoint guard", () => {
  // Structural companion to the behavioural tests above. It cannot prove the
  // guard WORKS — only that no copy has regressed to comparing `import.meta.url`
  // against an unresolved `process.argv[1]`, which is the one shape known to
  // break under a symlink. `npm run bundle` regenerates the four copies from the
  // source, so a source-only fix that was never bundled fails here.
  // Match on the unresolved `pathToFileURL(process.argv[1])` alone rather than on
  // a full `a === b` comparison. The operands commute, and
  // `pathToFileURL(process.argv[1]).href === import.meta.url` is the identical
  // defect written the other way round — a shape no formatter would rewrite for
  // you. Anchoring on the comparison would have missed it.
  const naive = /pathToFileURL\(\s*process\.argv\[1\]/;

  for (const file of ENGINE_COPIES) {
    const src = readFileSync(file, "utf-8");

    assert.ok(
      !naive.test(src),
      `${file} compares import.meta.url against an unresolved process.argv[1]; ` +
        `realpath both sides (see isInvokedDirectly in select-next.mjs)`,
    );

    // The negative above is satisfied vacuously by a file that has no entrypoint
    // guard at all — including one where a bad edit deleted it, which reproduces
    // bug.4's symptom exactly. So demand the resolved form is actually present.
    //
    // Match the full comparison, not the bare token `realpathSync`: that token
    // also appears in the node:fs import list, so a first cut of this assertion
    // passed with the entire guard function deleted. Caught by mutation 3 — the
    // exact vacuous pass this bug's own report warned a structural scan can give.
    assert.match(
      src,
      /realpathSync\(\s*fileURLToPath\(import\.meta\.url\)\s*\)/,
      `${file} never realpath-resolves import.meta.url — no resolved entrypoint guard`,
    );

    // ...and that the guard is actually WIRED UP. A file can define
    // isInvokedDirectly() correctly and still never call it.
    assert.match(
      src,
      /if\s*\(isInvokedDirectly\(\)\)/,
      `${file} defines no reachable isInvokedDirectly() call site`,
    );
  }
});

/* -------------------------------------------------------------------------- *
 *  BUG-6 counterweights.
 *
 *  The thirteen routes themselves are pinned in
 *  evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs, which also
 *  holds the discriminating pre-fix half. What lives here is the other
 *  direction: the inputs that must NOT change verdict as a result of closing
 *  them. Every one of these passes trivially on a classifier that refuses
 *  everything, which is exactly why they belong beside a fail-open corpus that
 *  such a classifier would also satisfy.
 * -------------------------------------------------------------------------- */

test("BUG-6: scanning past a keyword does not refuse the constructs around it", () => {
  // `for` is followed by a NAME, not a command. Continuing to scan past it would
  // report the loop variable `f` as an unrecognised command.
  assert.equal(
    classifyBlock("for f in a b; do echo $f; done", { f: "a" }).klass,
    "runnable",
  );
  // `[` is a builtin that cannot look like a command name. It reaches the scanner
  // now that `if` no longer terminates the segment, and must be read as a keyword
  // rather than as an unreadable command position.
  assert.equal(
    classifyBlock('N=1\nif [ -n "$N" ]; then echo x; fi').klass,
    "runnable",
  );
  assert.equal(classifyBlock('while read -r l; do echo "$l"; done').klass, "runnable");
  // `!` negates a command that still RUNS. It is in the command-introducing set
  // for that reason; without it this input would have become runnable.
  assert.equal(classifyBlock("! touch /tmp/x").klass, "mutating");
});

test("BUG-6: widening the write-redirect pre-context spares descriptors and /dev/null", () => {
  assert.equal(classifyBlock("echo hi 2>/dev/null").klass, "runnable");
  assert.equal(classifyBlock("echo hi >/dev/null 2>&1").klass, "runnable");
  assert.equal(classifyBlock("ls >&2").klass, "runnable");
  // This repository's own documented zsh guard. It was runnable before only
  // because `if` cleared the segment; it must still be runnable now that the
  // segment is actually scanned.
  assert.equal(
    classifyBlock("if command -v zsh >/dev/null 2>&1; then echo yes; fi").klass,
    "runnable",
  );
  // A `>` inside a quoted string is text, not a redirection.
  assert.equal(classifyBlock('echo "a > b"').klass, "runnable");
});

test("BUG-6: resolving git's subcommand past global flags keeps safe ones safe", () => {
  assert.equal(classifyBlock("git -C /path status").klass, "runnable");
  assert.equal(classifyBlock("git -c user.name=x log").klass, "runnable");
  assert.equal(classifyBlock("git --git-dir=/p/.git status").klass, "runnable");
  // The route itself: the flag operand must not be mistaken for the subcommand.
  assert.equal(classifyBlock("git -C log push origin main").klass, "mutating");
  assert.equal(classifyBlock("git -C /path push").klass, "mutating");
});

test("BUG-6: scoping -o to its command does not un-refuse the commands that write", () => {
  assert.equal(classifyBlock("sort -o /tmp/x file.txt").klass, "mutating");
  assert.equal(classifyBlock("sort -o out.txt in.txt").klass, "mutating");
  assert.equal(classifyBlock("git diff --output=/tmp/x").klass, "mutating");
  // Exempt for grep and find only, and only for those commands' own `-o`.
  assert.equal(classifyBlock("grep -o 'foo' README.md").klass, "runnable");
  assert.equal(classifyBlock("find . -name a -o -name b").klass, "runnable");
  // A pipeline is scoped per segment: the grep half is exempt, the sort half is not.
  assert.equal(
    classifyBlock("grep -o foo README.md | sort -o /tmp/x").klass,
    "mutating",
  );
});

test("BUG-6: quote-state awareness does not break the heredoc forms that shield bodies", () => {
  // The quotes around a heredoc terminator are SYNTAX. Blanking them before
  // detection would erase the terminator and expose the body to the scan.
  assert.equal(
    classifyBlock("cat <<'EOF'\ngit push origin main\nEOF").klass,
    "runnable",
  );
  assert.equal(classifyBlock("cat <<EOF > /tmp/x\nhi\nEOF").klass, "mutating");
  // A `<<` inside a quoted string is documentation ABOUT a heredoc.
  assert.equal(classifyBlock('echo "cat <<EOF"').klass, "runnable");
});

test("BUG-6: an unterminated quote blanks nothing, so it cannot hide a command", () => {
  // Found while reviewing the quote-state walker before it shipped. Blanking from
  // an unclosed quote to the end of the block would have hidden every following
  // command from the scan while bash still ran them — a new fail-open route
  // introduced by the fix for an old one. The scanner must always see MORE text
  // than bash will run, never less.
  assert.equal(classifyBlock("echo don't\ntouch /tmp/x").klass, "mutating");
  assert.equal(classifyBlock('echo "unclosed\ntouch /tmp/x').klass, "mutating");
  assert.equal(classifyBlock("echo 'unclosed\ngit push origin main").klass, "mutating");
  // A terminated span still blanks, or root cause C is not fixed.
  assert.equal(
    classifyBlock(`echo "it's fine"; touch /tmp/x; echo "don't"`).klass,
    "mutating",
  );
  assert.equal(classifyBlock('echo "a > b"').klass, "runnable");
});
