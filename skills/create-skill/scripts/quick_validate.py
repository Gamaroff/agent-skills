#!/usr/bin/env python3


"""
Quick validation script for skills - minimal version
"""

import sys
import os
import re
from pathlib import Path

# ANSI colour helpers — disabled when not a TTY (e.g. CI pipe)
_USE_COLOR = sys.stdout.isatty()

def _c(code, text):
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text

def green(t):   return _c("32", t)
def red(t):     return _c("31", t)
def yellow(t):  return _c("33", t)
def bold(t):    return _c("1",  t)
def dim(t):     return _c("2",  t)

def find_repo_root(skill_path):
    """Walk up from skill_path to find the repo root (contains shared/resources/)."""
    path = Path(skill_path).resolve()
    while path != path.parent:
        if (path / 'shared' / 'resources').exists():
            return path
        path = path.parent
    return None


def collect_shared_refs(content):
    """Return list of filenames referenced via shared/resources/<filename>.

    Filters out empty matches (e.g. when the regex captures only a trailing
    sentence punctuation like 'shared/resources/.' which strips to '').
    """
    refs = [f.rstrip('.,;:') for f in re.findall(r'shared/resources/([^\s`\'")\]*]+)', content)]
    return [r for r in refs if r]


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
    
    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"
    
    frontmatter = match.group(1)

    if 'managed-by:' in frontmatter:
        print(yellow("  ⚠  Warning: 'managed-by' field found in SKILL.md — injected by packager, do not author manually"))

    # Check required fields
    if 'name:' not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if 'description:' not in frontmatter:
        return False, "Missing 'description' in frontmatter"
    
    # Extract name for validation
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()
        # Check naming convention (hyphen-case: lowercase with hyphens)
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)"
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"

    # Extract and validate description
    warnings = []
    desc_match = re.search(r'description:\s*(.+)', frontmatter)
    if desc_match:
        description = desc_match.group(1).strip()
        # Unquoted description containing ': ' breaks YAML parsers (GitHub, etc.)
        block_scalars = ('>', '|', '>-', '|-', '>+', '|+')
        if description not in block_scalars and not description.startswith(('"', "'")):
            if ': ' in description:
                return False, (
                    "Description is unquoted but contains ': ' — GitHub's YAML parser "
                    "will reject this. Wrap in single quotes: description: '...'"
                )
        # YAML block scalar — extract actual multi-line content
        if description in ('>', '|', '>-', '|-', '>+', '|+'):
            block_match = re.search(r'description:\s*[>|][+\-]?\n((?:[ \t]+.+\n?)+)', frontmatter)
            if block_match:
                description = ' '.join(line.strip() for line in block_match.group(1).splitlines())
        # Quoted multi-line scalar (double or single quotes spanning lines)
        elif description.startswith(('"', "'")):
            quote = description[0]
            quoted_match = re.search(
                rf'description:\s*{quote}((?:[^{quote}\\]|\\.)*){quote}',
                frontmatter,
                re.DOTALL,
            )
            if quoted_match:
                description = ' '.join(quoted_match.group(1).split())
        # Plain unquoted multi-line scalar (continuation lines indented)
        else:
            plain_match = re.search(
                r'description:\s*(.+(?:\n[ \t]+\S.*)*)',
                frontmatter,
            )
            if plain_match:
                description = ' '.join(plain_match.group(1).split())
        # Check for angle brackets
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"
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

    skill_name = Path(sys.argv[1]).name
    valid, message = validate_skill(sys.argv[1])
    if valid:
        print(green("  ✓ ") + bold(skill_name))
    else:
        print(red("  ✗ ") + bold(skill_name) + dim(" — ") + red(message))
    sys.exit(0 if valid else 1)