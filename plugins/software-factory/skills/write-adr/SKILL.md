---
name: write-adr
description: Record an architecture decision (ADR) in the right layer, as a factory decision or a project decision (F-0001). Use this when making a choice that is hard to reverse, touches several places or fixes a source of truth, external service or security boundary, and when an existing decision changes.
---

# Recording a decision

## 1. Is it a decision

Yes if the choice is hard to reverse, touches several places in the code, or a
next developer would choose differently without knowing the reason: a source
of truth, an external service, a security boundary, an agreement between
modules. No for a font size, a field name or a piece of copy.

## 2. Which layer

- **Project decision**, in the project's `docs/adr/NNNN-short-title.md`: it
  concerns this product (a vendor, a screen, a rule of this business). This is
  the default.
- **Factory decision**, in `adr/F-NNNN-short-title.md` of the
  `software-factory` repo: it would hold for every product. That is written
  there, in its own pull request, not in the project. Say in the project that
  the decision is factory-wide and propose it.

If the project decision works out a factory decision, add
`- **Follows:** F-NNNN`. If it deliberately deviates, add
`- **Deviates from:** F-NNNN` and explain why in the context.

## 3. The file

Take the next free number: `ls docs/adr`. Follow the project's
`docs/adr/README.md` exactly: its language, its headings and its status
values; the project's ADR test reads them. In English it looks like this:

```markdown
# ADR NNNN: Title in plain words

- **Status:** accepted
- **Date:** 30 October 2026

## Context

What was going on, and why a choice was needed. What went wrong or would go
wrong without it.

## Decision

What holds, as short rules. Concrete: names of files, tables, variables.

## Consequences

What it costs, what is and is not possible now, what to watch out for.

## In the code

Where it shows up, and which test enforces it.
```

- A factory decision starts with `# F-NNNN: Title` and uses the English
  format of `adr/README.md`.
- A project that writes in Dutch uses its own headings (Context, Besluit,
  Gevolgen, In de code) and the lines `Volgt` and `Wijkt af van`.
- A decision that already applied before it was written down gets the date of
  the decision itself.
- No em dashes.

## 4. A decision that changes

Do not edit an accepted decision. Write a new decision with
`- **Supersedes:** ADR NNNN` below the date, and set the old one to
`- **Status:** superseded by ADR NNNN` (or the project's equivalent). A
reference to a file that has moved may be updated.

## 5. Alongside

- Add the decision to the list in `docs/adr/README.md` (or `adr/README.md`
  and the list of the skill `factory-decisions`, for a factory decision).
- Put the short rule in `CLAUDE.md` with the topic, with the number after it
  ("ADR 0008"). The why lives in the decision, not in `CLAUDE.md`.
- If a test enforces the decision, name the number in a comment in that test,
  and the test under **In the code**.
- Run the tests; the ADR test checks numbering, headings, status and list.
