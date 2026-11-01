# Way of working

The factory decisions in [`adr/`](../adr/README.md) say how products are
built. This document says how we work on them: how a change goes from an idea
to `main`, how it is specified, how we write, and how a change is described.
It holds for every product; a project adds its own rules in its `CLAUDE.md`
(its language, its tone, its exceptions) and never weakens these.

These are conventions, not decisions. They are easy to change, so they are not
ADRs; a change here is an ordinary pull request. The decision behind the loop
is F-0007: every change goes through CI, `factory-review` and a human before
it is merged. The loop says how we get there.

## The loop

Every feature and every change in behaviour goes the same way. People decide
what is built and what is merged; agents do the work in between.

1. **An issue** says what is wanted, in a few lines.
2. **Plan.** Before anything is built, the agent questions the owner until
   every choice is settled, then writes a spec (skill `plan`). The owner
   approves it. Nothing is built before that.
3. **Build** from the spec, on a branch, following the decisions it names.
4. **CI** runs the central quality check (F-0007).
5. **Review.** The agent `factory-review` checks the change against the
   rules, the decisions and the spec. Blocking findings are fixed first.
6. **Preview.** Once Vercel has built the preview, the agent goes through it
   (skill `preview-check`) and reports what it saw and what it could not
   check.
7. **The owner** opens the preview, tries what matters, and is the only one
   who merges. The agent's checks prepare that review; they never replace it.

**A small fix** skips the plan and the spec: a typo, a dependency update, a
hotfix for something broken in production, or a change that leaves behaviour
as it is (a refactor, CI, docs). The rest of the loop still applies. This is
the one place that says what a small fix is; the skill `plan` and the review
point here.

## Specs

A spec says what one change must do, before it is built. It is what the
agent builds from and what the review checks against, so it is written for
both: precise enough to build, short enough to read.

### Where

In the project's `docs/specs/`, one file per change:
`NNNN-short-title.md`, with the next free number (`ls docs/specs`), in the
project's language. A spec stays in the repo after the change is merged; it
says why the code is the way it is.

For a change to the factory itself, the issue is the spec, with the same
headings: the factory has no product code to keep it next to.

### The form

```markdown
# Spec NNNN: Title in plain words

- **Status:** draft
- **Date:** 1 November 2026
- **Issue:** #12

## Problem

What is wrong or missing now, and for whom. Why it is worth changing.

## What it does

The behaviour after the change, as short rules a reader can check.

## Not in scope

What this change deliberately does not do, so neither the build nor the
review drifts into it. Each with a word on why, or where it goes instead.

## Edge cases

Empty, long, wrong and slow input; phone and desktop; signed in and out;
a key that is missing (F-0005). For each, what happens.

## Done when

A list of checks that are true when the change is finished: what the
owner will see on the preview, which test pins a rule down.

## Decisions

The factory decisions (F-NNNN) and project decisions (ADR NNNN) this change
follows. A new decision this change needs is named here and written
alongside it (skill `write-adr`).
```

- **Status** is `draft` while it is being discussed and `approved` once the
  owner says so. Only an approved spec is built. That the change is merged,
  the history shows; the status does not change again.
- A project that writes in Dutch uses its own headings (Probleem, Wat het
  doet, Bewust niet, Randgevallen, Klaar als, Besluiten) and status values
  (`concept`, `akkoord`).
- A choice that turns out wrong during the build is not quietly changed in
  the code. The spec changes first, and the owner agrees again.
- A spec is not a decision. When a choice in it is hard to reverse or holds
  beyond this change, it also gets an ADR (F-0001), and the spec points to it.

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
