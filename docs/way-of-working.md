# Way of working

The factory decisions in [`adr/`](../adr/README.md) say how products are
built. This document says how we work on them: how we write, and how a change
is described. It holds for every product; a project adds its own rules in its
`CLAUDE.md` (its language, its tone, its exceptions) and never weakens these.

These are conventions, not decisions. They are easy to change, so they are not
ADRs; a change here is an ordinary pull request.

Still to come here (step 6 of the plan): the spec format and the loop itself,
from spec to merged change.

## Writing

Everything a product shows or sends is writing: pages, mails, admin screens,
social copy, and also code comments, commit messages and pull requests. The
same rules apply to all of it.

### No em dashes in running text

A long dash (U+2014) in the middle of a sentence reads as machine text, and
we want it nowhere. What replaces it depends on the sentence:

- **Two sentences**, when two thoughts are glued together. "Come by, dash, we
  pour everything" becomes "Come by. We pour everything."
- **A comma**, when the second part is a clause of the first.
- **A colon**, when an explanation or a list follows.
- **A semicolon**, when two main clauses belong together.
- **Parentheses**, for an aside in the middle of a sentence.

Hyphens in compounds (`well-known`, `btw-nummer`) and the en dash in ranges
are fine. It is only about the long dash between words.

A project may keep the long dash as a separator in one fixed place, such as
page titles and mail subjects ("The Source", long dash, "Brand"), and then
says so in its `CLAUDE.md`. That is a separator, not punctuation. Anywhere else it goes.

Every project has a test that fails on a long dash in its code, scripts,
workflows and docs, with its own exceptions spelled out in the test. This repo
checks itself in `tests/public.test.mjs`.

### Plain words

- Say what something does, in the words the reader uses. No jargon a reader
  would have to look up, and no internal names on pages for customers.
- Few slogans. A sentence that would fit on any product says nothing about
  this one.
- One thing once. Repeating a rule in a second place gives it a second place
  to go stale; point to the first instead.

## Describing a change

### Pull requests

The opening of a pull request is read by people who do not read the diff: in
some projects it becomes the changelog in the admin. So:

- **Open with what changes and why**, in plain language, in one or two short
  paragraphs. Not which files were touched.
- **Name what someone else must do or check**: a text a lawyer should read, a
  setting to change, a migration that runs with the deploy.
- **Then the details**, under headings such as "What changes", "Not in this
  pull request" and "Checked".
- **"Checked" says what was actually run** (lint, type check, tests, build)
  and what was not, with the reason.

### Commits

The first line says what changes, as a sentence. The body says why, and what
someone reading the history later needs to know. In the project's language.

### Code comments

A comment says why the code is the way it is: the constraint, the earlier
mistake, the decision behind it ("F-0004"). Not what the next line does. In
the project's language.
