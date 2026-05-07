#!/usr/bin/env python3


"""
Quick validation script for skills - minimal version
"""

import sys
import os
import re
from pathlib import Path

def find_repo_root(skill_path):
    """Walk up from skill_path to find the repo root (contains shared/resources/)."""
    path = Path(skill_path).resolve()
    while path != path.parent:
        if (path / 'shared' / 'resources').exists():
            return path
        path = path.parent
    return None


def collect_shared_refs(content):
    """Return list of filenames referenced via shared/resources/<filename>."""
    return re.findall(r'shared/resources/([^\s`\'")\]*]+)', content)


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
        # YAML block scalar — extract actual multi-line content
        if description in ('>', '|', '>-', '|-', '>+', '|+'):
            block_match = re.search(r'description:\s*[>|][+\-]?\n((?:[ \t]+.+\n?)+)', frontmatter)
            if block_match:
                description = ' '.join(line.strip() for line in block_match.group(1).splitlines())
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
        print(f"⚠️  Warning: {w}")

    return True, "Skill is valid!"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)