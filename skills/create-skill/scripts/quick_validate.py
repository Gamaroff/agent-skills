#!/usr/bin/env python3


"""
Quick validation script for skills - minimal version
"""

import sys
import os
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import skill_frontmatter

# ANSI colour helpers — disabled when not a TTY (e.g. CI pipe)
_USE_COLOR = sys.stdout.isatty()

def _c(code, text):
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text

def green(t):   return _c("32", t)
def red(t):     return _c("31", t)
def yellow(t):  return _c("33", t)
def bold(t):    return _c("1",  t)
def dim(t):     return _c("2",  t)

# Agent Skills spec: `description` is capped at 1,024 characters.
DESCRIPTION_MAX_CHARS = 1024


def find_repo_root(skill_path):
    """Walk up from skill_path to find the repo root (contains shared/resources/)."""
    path = Path(skill_path).resolve()
    while path != path.parent:
        if (path / 'shared' / 'resources').exists():
            return path
        path = path.parent
    return None


# The ONE parse of a `shared/resources/<name>` reference (task.126). The bundler's
# discovery, the packager and `validate_skill` below all read references through
# `parse_shared_refs`; there used to be three copies of this pattern, and none of
# them knew that `#` starts a fragment, so `shared/resources/X.md#anchor` named a
# file called `X.md#anchor` — validation failed on it and the bundler warned
# "missing source".
#
# `(?<![\w-]/)` — never match inside an absolute URL such as
# `https://…/blob/develop/shared/resources/x.md`, which the bundler writes into
# bundled copies for targets a skill does not ship. Without the guard the
# packager's walk over references/ rediscovered every such URL as a reference
# and vendored the file it deliberately did not bundle.
SHARED_REF_LINE_RE = re.compile(r'(?<![\w-]/)shared/resources/([^\s`\'")\]*]+)')

# The comment form of a citation. Both prefixes, because the bundler rewrites
# `shared/resources/X` to `references/X` in place in every skill file and in every
# bundled copy — a comment written with the first prefix is read back with the
# second on every run after the first.
CITE_COMMENT_RE = re.compile(
    r'<!--\s*cite:\s*(?:\.\./)*(?:shared/resources|references)/[^\s>]+\s*-->'
)

# A citation copies ONE file; a dependency copies the file and its closure. Only a
# document can be cited: a script copied without the siblings it requires or
# sources is broken, so a fragment or cite comment on any other target still reads
# as a dependency — the fail-safe direction.
CITE = 'cite'
DEP = 'dep'
CITABLE_SUFFIXES = ('.md',)


def split_fragment(raw):
    """Split a captured reference into (name, has_fragment).

    Trailing sentence punctuation is stripped first, as it always was, then the
    name is cut at the first `#`. `name` may come back empty (a bare
    `shared/resources/.`); callers drop those."""
    raw = raw.rstrip('.,;:')
    name, sep, _ = raw.partition('#')
    return name.rstrip('.,;:'), bool(sep)


def ref_kind(name, has_fragment, in_cite_comment):
    """`cite` for a document named with a fragment or inside a cite comment,
    `dep` for everything else. The one statement of the edge rule."""
    if (has_fragment or in_cite_comment) and name.endswith(CITABLE_SUFFIXES):
        return CITE
    return DEP


def cite_comment_spans(content):
    """[(start, end)] of every `<!-- cite: … -->` in `content`."""
    return [m.span() for m in CITE_COMMENT_RE.finditer(content)]


def in_spans(pos, spans):
    return any(start <= pos < end for start, end in spans)


def parse_shared_refs(content):
    """Return [(line_no, name, kind)] for every shared/resources/<name> reference.

    One pass over the text: the name class excludes whitespace, so no match spans
    a newline, and counting newlines between matches gives the line (a per-line
    loop cost 1.9 s of a 7.2 s `bundle --check`, task 154). Empty names are
    dropped. Pure."""
    spans = cite_comment_spans(content)
    out = []
    line, pos = 1, 0
    for m in SHARED_REF_LINE_RE.finditer(content):
        line += content.count('\n', pos, m.start())
        pos = m.start()
        name, has_fragment = split_fragment(m.group(1))
        if name:
            out.append((line, name, ref_kind(name, has_fragment, in_spans(m.start(), spans))))
    return out


def collect_shared_refs(content):
    """Return list of filenames referenced via shared/resources/<filename>,
    fragment stripped. A view of `parse_shared_refs`."""
    return [name for _, name, _ in parse_shared_refs(content)]


def validate_skill(skill_path):
    """Basic validation of a skill"""
    skill_path = Path(skill_path)
    
    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"
    
    # Read and validate frontmatter
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"

    frontmatter = skill_frontmatter.split_frontmatter(content)
    if frontmatter is None:
        return False, "Invalid frontmatter format"

    if 'managed-by:' in frontmatter:
        print(yellow("  ⚠  Warning: 'managed-by' field found in SKILL.md — injected by packager, do not author manually"))

    # An unquoted description containing ': ' is invalid YAML. Caught here rather
    # than left to the parser below purely for the more actionable message.
    raw_desc = re.search(r'^description:[ \t]*(.*)$', frontmatter, re.MULTILINE)
    if raw_desc:
        raw_value = raw_desc.group(1).strip()
        if (raw_value
                and raw_value not in skill_frontmatter.BLOCK_SCALARS
                and not raw_value.startswith(('"', "'"))
                and ': ' in raw_value):
            return False, (
                "Description is unquoted but contains ': ' — GitHub's YAML parser "
                "will reject this. Wrap in single quotes: description: '...'"
            )

    # Parse for real. Regex extraction used to silently truncate a single-quoted
    # description at its first unescaped apostrophe and report success, shipping
    # a skill whose description no YAML parser could read.
    fm, parse_error = skill_frontmatter.parse(content)
    if parse_error:
        return False, parse_error

    # Check required fields
    if 'name' not in fm:
        return False, "Missing 'name' in frontmatter"
    if 'description' not in fm:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = str(fm['name']).strip()
    # Check naming convention (hyphen-case: lowercase with hyphens)
    if not re.match(r'^[a-z0-9-]+$', name):
        return False, f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)"
    if name.startswith('-') or name.endswith('-') or '--' in name:
        return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"

    # Validate description
    warnings = []
    # The value must BE a string. `description:` with nothing after it parses to
    # None, `true` to a bool and `[]` to a list; `str()` turned each into the
    # text "None" / "True" / "[]" and validated that as a four-character
    # description, so a skill with no description passed (obs #107, task.127).
    desc = fm['description']
    if not isinstance(desc, str) or not desc.strip():
        return False, (
            f"description must be a non-empty string (got {type(desc).__name__})"
            if not isinstance(desc, str) else "Description is empty"
        )
    description = ' '.join(desc.split())
    # Check for angle brackets
    if '<' in description or '>' in description:
        return False, "Description cannot contain angle brackets (< or >)"
    # Hard cap from the Agent Skills spec: description is at most 1,024
    # characters. Measured on the PARSED value with only its outer whitespace
    # stripped — what a loader actually receives after YAML has folded the
    # scalar — not on the whitespace-normalised string above. The two differ
    # on a block scalar with a more-indented line: YAML keeps that newline, so
    # a loader sees it and normalisation would hide it (QA cycle 2 on task 111
    # produced exactly that: a fixture the normalised measure read as 1,024 and
    # the parsed value as 1,026). The trailing newline a clip-chomped block
    # scalar carries is not content and is stripped. This is a failure, not a
    # warning: a loader that enforces the cap rejects the whole skill.
    parsed_len = len(desc.strip())
    if parsed_len > DESCRIPTION_MAX_CHARS:
        return False, (
            f"Description is {parsed_len} chars as parsed "
            f"(max {DESCRIPTION_MAX_CHARS} — Agent Skills spec); trim it"
        )
    # Warn if description is too short or too long (target: ~100 words)
    word_count = len(description.split())
    if word_count < 10:
        warnings.append(f"Description is very short ({word_count} words); aim for ~100 words for reliable auto-activation")
    elif word_count > 150:
        warnings.append(f"Description is long ({word_count} words); descriptions over 150 words consume unnecessary context — aim for ~100")

    # Check shared/resources/ references exist at repo level
    repo_root = find_repo_root(skill_path)
    all_md = list(skill_path.rglob('*.md'))
    for md_file in all_md:
        if not md_file.is_file():
            continue
        for filename in collect_shared_refs(md_file.read_text()):
            if repo_root is None:
                return False, f"shared/resources/{filename} referenced but repo root not found"
            src = repo_root / 'shared' / 'resources' / filename
            if not src.exists():
                return False, f"shared/resources/{filename} referenced but file does not exist"

    for w in warnings:
        print(yellow(f"  ⚠  {w}"))

    return True, None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    if not skill_frontmatter.HAVE_YAML:
        print(yellow("  ⚠  PyYAML not installed — frontmatter is NOT strictly validated. "
                     "Install it (pip install pyyaml) for the full check."), file=sys.stderr)

    skill_name = Path(sys.argv[1]).name
    valid, message = validate_skill(sys.argv[1])
    if valid:
        print(green("  ✓ ") + bold(skill_name))
    else:
        print(red("  ✗ ") + bold(skill_name) + dim(" — ") + red(message))
    sys.exit(0 if valid else 1)