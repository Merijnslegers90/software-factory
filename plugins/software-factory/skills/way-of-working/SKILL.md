---
name: way-of-working
description: How we write and how a change is described, in every product of the factory - no em dashes, plain words, and how to open a pull request, write a commit and a code comment. Use this before writing any page text, mail, admin copy, code comment, commit message or pull request description, and in every review.
---

# Way of working

The full text is in `way-of-working.md` next to this file. Read it before you
write anything a reader will see, including commits and pull requests. The
project's `CLAUDE.md` adds its own rules on top (its language, its tone, its
exceptions); it never weakens these.

The rules that break most often:

- **No em dashes in running text.** Use two sentences, a comma, a colon, a
  semicolon or parentheses instead. Only a separator the project names in its
  `CLAUDE.md` (such as in page titles) may stay.
- **A pull request opens with what changes and why**, in plain language, for
  people who do not read the diff. Then what someone must do or check, then
  the details, and "Checked" with what was actually run.
- **A comment says why**, not what the next line does.
