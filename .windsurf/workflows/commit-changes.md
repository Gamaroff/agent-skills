---
description: Commit changes with proper formatting and message
---

# Commit Changes Workflow

This workflow helps you commit changes with proper git formatting and meaningful commit messages.

## Steps

1. **Stage changes**

   ```bash
   git add .
   ```

2. **Review staged changes**

   ```bash
   git diff --cached
   ```

3. **Create commit message**
   - Use conventional commit format: `type(scope): description`
   - Types: feat, fix, docs, style, refactor, test, chore
   - Keep description under 50 characters
   - Add body if needed (72 characters per line max)

4. **Commit changes**

   ```bash
   git commit -m "your message here"
   ```

5. **Push changes** (optional)
   ```bash
   git push
   ```

## Examples

- `feat(skills): add new develop skill implementation`
- `fix(docs): remove broken references to .bmad-core`
- `refactor(config): update configuration handling`
- `docs(readme): update installation instructions`

## Tips

- Be specific but concise in commit messages
- Group related changes in single commits
- Use body section for complex changes
- Reference issue numbers when applicable
