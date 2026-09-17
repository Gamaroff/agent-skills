---
name: create-skill
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
license: Complete terms in LICENSE.txt
---

# Create Skill

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform Claude from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   ├── description: (required)
│   │   └── [managed-by, source — injected by packager at zip time, do not author manually]
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

**Metadata Quality:** The `name` and `description` in YAML frontmatter determine when Claude will use the skill. Be specific about what the skill does and when to use it. Use the third-person (e.g. "This skill should be used when..." instead of "Use this skill when...").

#### Bundled Resources (optional)

##### Scripts (`scripts/`)

Executable code (Python/Bash/etc.) for tasks that require deterministic reliability or are repeatedly rewritten.

- **When to include**: When the same code is being rewritten repeatedly or deterministic reliability is needed
- **Example**: `scripts/rotate_pdf.py` for PDF rotation tasks
- **Benefits**: Token efficient, deterministic, may be executed without loading into context
- **Note**: Scripts may still need to be read by Claude for patching or environment-specific adjustments

##### References (`references/`)

Documentation and reference material intended to be loaded as needed into context to inform Claude's process and thinking.

- **When to include**: For documentation that Claude should reference while working
- **Examples**: `references/finance.md` for financial schemas, `references/mnda.md` for company NDA template, `references/policies.md` for company policies, `references/api_docs.md` for API specifications
- **Use cases**: Database schemas, API documentation, domain knowledge, company policies, detailed workflow guides
- **Benefits**: Keeps SKILL.md lean, loaded only when Claude determines it's needed
- **Best practice**: If files are large (>10k words), include grep search patterns in SKILL.md
- **Avoid duplication**: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill—this keeps SKILL.md lean while making information discoverable without hogging the context window. Keep only essential procedural instructions and workflow guidance in SKILL.md; move detailed reference material, schemas, and examples to references files.

##### Assets (`assets/`)

Files not intended to be loaded into context, but rather used within the output Claude produces.

- **When to include**: When the skill needs files that will be used in the final output
- **Examples**: `assets/logo.png` for brand assets, `assets/slides.pptx` for PowerPoint templates, `assets/frontend-template/` for HTML/React boilerplate, `assets/font.ttf` for typography
- **Use cases**: Templates, images, icons, boilerplate code, fonts, sample documents that get copied or modified
- **Benefits**: Separates output resources from documentation, enables Claude to use files without loading them into context

### Declaring what a skill invokes (`invokes:`)

If your skill **invokes other skills** — a pipeline orchestrator, a review skill that delegates to a
sub-routine — declare them in the frontmatter:

```yaml
---
name: develop-task
description: ...
invokes: [create-branch, review-task, develop, create-pr, qa-task, qa-fix, finalise, commit-changes]
---
```

**Why it matters.** `setup-consumer.sh` offers install profiles (`minimal` / `pipeline` / `full`). A
profile names *seed* skills and the installer resolves each seed's transitive callees from this
declaration, so a consumer who picks `pipeline` gets your orchestrator **and** everything it calls.
Without the key your skill declares no edges, and a profile install can ship it with none of its
steps — failing mid-run in the consumer's repo, hours after the install, at the step whose skill is
missing.

Rules:

- **Inline flow form only, all on the key line** — `invokes: [a, b]`. Both other spellings are
  **rejected with an error**, deliberately: the YAML block form (`invokes:` then `  - a`), and the
  wrapped flow form (`invokes:` then `  [a, b]` on the next line). Each used to parse as an empty
  list, and a silently-empty edge list is invisible to CI — the generator and the committed manifest
  agree on it, so the drift check stays green — while breaking a consumer's pipeline. The wrapped
  form is not hypothetical: `develop-bug` shipped nine declared callees as zero edges for a cycle,
  and a `profile: pipeline` install lost `ensure-bug-{jira,github}-issue` with it.
- **Keep it on one line even when it is long.** Prettier does not reflow a long inline flow sequence
  in frontmatter, so nothing in the toolchain will wrap it for you. If your list feels too long to
  read on one line, that is a signal about the skill, not about the formatting.
- **Every name must be a real directory under `skills/`.** Unknown names fail the generator.
- **Absent key = no edges**, which is the safe default. Only add it if your skill genuinely calls
  others.
- After editing, run `npm run generate-skill-deps` and commit
  `references/skill-dependencies.json`. CI fails on drift — `validate.yml` on PRs,
  `release.yml` at tag time.
- `npm run skill-deps:candidates` lists skills your prose mentions but your `invokes:` does not.
  It is **advisory**: most mentions are legitimate cross-references, so scan it for a genuine missed
  call rather than bulk-adding.

**Checklist for a new orchestrator skill**: does it invoke others? If yes, is every one declared? Has
`npm run generate-skill-deps` been run and the JSON committed?

## Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (Unlimited\*)

\*Unlimited because scripts can be executed without reading into context window.

## Signal Design Principle

A skill that emits a check, status, count or verdict is designing a **signal**, and a signal is read
by someone deciding what to do next. Two rules, both learned the expensive way:

**Name the states behind every empty value.** For each falsy, empty or zero value a check can emit,
list the distinct situations that produce it. If two situations produce the same value and the right
response differs between them, they need different values — a `state` field beside the boolean, or a
verdict vocabulary instead of a boolean. "Found nothing" and "could not look" are identical from the
caller's side, and the caller will take the reassuring reading.

**Anchor a check to the thing it makes a claim about.** A check that reads `process.cwd()`, or the
first file it happens to find, is making a claim about the caller's location while being worded as a
claim about the project. Where a skill establishes an anchor precisely because some ambient value is
untrustworthy, every check downstream inherits that rule.

Corollary for the guidance you write around a check: **if the correct response to a signal is always
"note it and continue", the signal is broken.** Documenting the workaround makes the check unable to
report a true positive either, and a signal that is always ignored carries no information. Fix the
check.

Full rationale and the review-time form of both rules:
[`docs/reference/anti-patterns.md`](../../docs/reference/anti-patterns.md) § *Never let one signal
report two states*.

## Three Rules the Corpus Learned by Failing

Each of these is a rule that existed nowhere until a failure that every gate passed. Each is stated
with the failure and the alternative, because a rule without its failure reads as a preference.

### Runnable prose carries no positional-parameter token

**The rule.** A fenced `bash`/`sh`/`shell` block in a `SKILL.md` — a block an agent is meant to copy
and run — must not contain a shell positional-parameter token: a dollar sign immediately followed by
a digit. Guard: `tests/fenced-bash-positional-params.test.js`, which scans every `skills/*/SKILL.md`
and names the file and line. The token-free equivalents for every shape the corpus used, and the
Phase 0 evidence behind them, are in
[`references/runnable-prose.md`](references/runnable-prose.md) — deliberately a *reference*, because
this file is rendered on invocation and a rule that spelled the tokens out here would be corrupted
by the mechanism it describes.

**The failure.** The harness substitutes those tokens when the skill is invoked with arguments —
inside fenced code as readily as in prose. Substitution is zero-indexed from the argument list (the
first token names the first argument), and a token past the argument count is left alone, which is
why the field-two `awk` idiom sat in nineteen skills for months without biting: almost every skill
takes one argument, so only the first token was ever touched. When one finally used it, `/qa-task
<path>` delivered an awk `match()` on the whole record as a `match()` on the literal task path —
eight substitutions in one program, a silent wrong answer, and the comment written to warn about it
carried the same token and was corrupted too. Nothing on disk was wrong; every test reads the disk.

**The alternatives, in one line each** (full table in the reference): awk field *N* is `$(N)` —
not `cut -fN`, which is tab-delimited and not equivalent; a bare `/re/` tests the whole record;
`length` with no argument is its length; a script's *N*th argument is `${N}`; a script's own path is
`${BASH_SOURCE[0]}`; a currency amount in a comment is spelled `20 USD`. A backslash escape survives
rendering but leaves the on-disk form a syntax error inside awk program text, so it is tolerated by
the guard only for bash double-quoted strings. Where a token is genuinely unavoidable, allowlist the
line in the guard **with a reason**.

**What this does not cover, stated so nobody reads a green check as coverage.** Only the invoked
`SKILL.md` is rendered; a `references/*.md` or `shared/resources/*.md` loaded with Read arrives
verbatim, so the guard's scope is `SKILL.md` alone. And `qa-task` Step 4b, which executes
documented snippets, executes them **from disk** — it cannot see a render-time corruption, and its
own step says so.

### Shell matrices are derived from `zshAvailable()`, never hardcoded

**The rule.** A test that spawns a shell takes its matrix from
`qa-execute-snippets.mjs` (a shared resource) — its exported, memoised `zshAvailable()`:
`const SHELLS = zshAvailable() ? ["bash", "zsh"] : ["bash"]`. Two assertions belong beside it, and
they fail in opposite directions — `bash` is in the matrix **unconditionally** (if the probe ever
answered false for both, every behavioural case would be skipped and the suite would pass having
executed nothing), and when zsh is absent the test emits a visible `zsh-unavailable` note, so a
report never infers cross-shell agreement from silence.

**The failure.** `const SHELLS = ["bash", "zsh"]` — hand-written on task.101 — passed three QA cycles,
Step 5c and four `npm run ci:fast` runs, then failed CI on four `[zsh]` cases: `ubuntu-latest` has no
zsh and the author's macOS does. Nothing local could have caught it; the first falsifying environment
was after `/finalise` had assembled its DoD. The repository already shipped the probe.

**The criterion, stated honestly:** *both shells agree wherever both exist, and the matrix says which
ran* — not *both shells always run*.

### In a `.js` under `shared/resources/`, a `shared/resources/` path in a comment is a dependency

**The rule.** `bundle_skill.py`'s reference scanner (`SHARED_REF_RE`) matches a
`shared/resources/` path anywhere in a file — code, string or comment alike. That is right for
`.md`, where every reference is prose, and a trap for `.js`/`.mjs`. In a shared script, refer to a
sibling by **bare filename** in comments (`see tracker-card-summary.md`), and reserve the full path
for a reference the script actually loads. The bundler now prints
`⚠️ comment-only reference: <file>:<line> → <target>` when it follows a path that appears only on a
comment line, and `tests/bundle-comment-origin.test.js` asserts the live tree has none.

**The failure.** Four constants moved into `jira-sync.js` — bundled into 21 skills — carried their
leading comments, each naming the shared-resources path of `tracker-card-summary.md`, one naming a test's
path. The next `npm run bundle` copied a 646-line test and a 172-line doc into twenty skills that use
neither: +16,000 lines of generated churn from four comment lines, and the bundler reported ✅, as it
always does. The blast radius scales with how widely the destination is bundled — inversely to how
much a comment looks like it matters.

## Skill Creation Process

Copy this checklist and track your progress when creating a skill:

```text
Skill Creation Progress:
- [ ] Step 1: Understanding the skill with concrete examples
- [ ] Step 2: Planning the reusable skill contents
- [ ] Step 3: Initializing the skill
- [ ] Step 4: Edit the skill
- [ ] Step 5: Packaging a skill
- [ ] Step 6: Iterate
```

To create a skill, execute these steps sequentially, skipping steps only if there is a clear reason why they are not applicable.

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood. It remains valuable even when working with an existing skill.

To create an effective skill, clearly understand concrete examples of how the skill will be used. This understanding can come from either direct user examples or generated examples that are validated with user feedback.

For example, when building an image-editor skill, relevant questions include:

- "What functionality should the image-editor skill support? Editing, rotating, anything else?"
- "Can you give some examples of how this skill would be used?"
- "I can imagine users asking for things like 'Remove the red-eye from this image' or 'Rotate this image'. Are there other ways you imagine this skill being used?"
- "What would a user say that should trigger this skill?"

To avoid overwhelming users, avoid asking too many questions in a single message. Start with the most important questions and follow up as needed for better effectiveness.

Conclude this step when there is a clear sense of the functionality the skill should support.

### Step 2: Planning the Reusable Skill Contents

To turn concrete examples into an effective skill, analyze each example by:

1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

Example: When building a `pdf-editor` skill to handle queries like "Help me rotate this PDF," the analysis shows:

1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.py` script would be helpful to store in the skill

Example: When designing a `frontend-webapp-builder` skill for queries like "Build me a todo app" or "Build me a dashboard to track my steps," the analysis shows:

1. Writing a frontend webapp requires the same boilerplate HTML/React each time
2. An `assets/hello-world/` template containing the boilerplate HTML/React project files would be helpful to store in the skill

Example: When building a `big-query` skill to handle queries like "How many users have logged in today?" the analysis shows:

1. Querying BigQuery requires re-discovering the table schemas and relationships each time
2. A `references/schema.md` file documenting the table schemas would be helpful to store in the skill

To establish the skill's contents, analyze each concrete example to create a list of the reusable resources to include: scripts, references, and assets.

### Step 3: Initializing the Skill

At this point, it is time to actually create the skill.

Skip this step only if the skill being developed already exists, and iteration or packaging is needed. In this case, continue to the next step.

When creating a new skill from scratch, always run the `init_skill.py` script. The script conveniently generates a new template skill directory that automatically includes everything a skill requires, making the skill creation process much more efficient and reliable.

Usage:

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

The script:

- Creates the skill directory at the specified path
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Creates example resource directories: `scripts/`, `references/`, and `assets/`
- Adds example files in each directory that can be customized or deleted

After initialization, customize or remove the generated SKILL.md and example files as needed.

### Step 4: Edit the Skill

When editing the (newly-generated or existing) skill, remember that the skill is being created for another instance of Claude to use. Focus on including information that would be beneficial and non-obvious to Claude. Consider what procedural knowledge, domain-specific details, or reusable assets would help another Claude instance execute these tasks more effectively.

#### Start with Reusable Skill Contents

To begin implementation, start with the reusable resources identified above: `scripts/`, `references/`, and `assets/` files. Note that this step may require user input. For example, when implementing a `brand-guidelines` skill, the user may need to provide brand assets or templates to store in `assets/`, or documentation to store in `references/`.

Also, delete any example files and directories not needed for the skill. The initialization script creates example files in `scripts/`, `references/`, and `assets/` to demonstrate structure, but most skills won't need all of them.

#### Update SKILL.md

**Writing Style:** Write the skill using **imperative/infinitive form** (verb-first instructions). Keep default assumptions that Claude is already smart—don't add context Claude doesn't need. Keep descriptions third-person focused on "what it does and when to use it".
**Paths:** Always use forward slashes in file paths (e.g., `scripts/helper.py`), even on Windows.
**Options:** Provide a clear default option instead of offering too many alternatives.
**Output Structuring Patterns:** Use the **Template pattern** to establish strict Markdown structures (e.g., `ALWAYS use this exact template structure:`) for reports, specs, and API payloads. Use the **Examples pattern** (providing strict `Input:` and `Output:` pairs) to train Claude on nuanced stylistic tasks like drafting commits or PR reviews.

To complete SKILL.md, answer the following questions:

1. What is the purpose of the skill, in a few sentences?
2. When should the skill be used?
3. In practice, how should Claude use the skill? All reusable skill contents developed above should be referenced so that Claude knows how to use them.

### Step 5: Packaging a Skill

Once the skill is ready, it should be packaged into a distributable zip file that gets shared with the user. The packaging process automatically validates the skill first to ensure it meets all requirements:

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Optional output directory specification:

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

The packaging script will:

1. **Validate** the skill automatically, checking:
   - YAML frontmatter format and required fields
   - Skill naming conventions and directory structure
   - Description completeness and quality
   - File organization and resource references

2. **Package** the skill if validation passes, creating a zip file named after the skill (e.g., `my-skill.zip`) that includes all files and maintains the proper directory structure for distribution. The packager also injects `managed-by: agent-skills` and `source: <repo-url>` into the SKILL.md frontmatter inside the zip — do not add these fields manually in source.

If validation fails, the script will report the errors and exit without creating a package. Fix any validation errors and run the packaging command again.

### Step 6: Iterate

After testing the skill, users may request improvements. Often this happens right after using the skill, with fresh context of how the skill performed.

**Iteration workflow:**

1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again
