---
name: plan
description: Plan a change before it is built - question the owner one topic at a time until every choice is settled, then write the spec in docs/specs/ and get it approved. Use this at the start of every feature or change in behaviour, before writing any code, and whenever someone asks to plan, scope or specify a change. Not for a typo, a dependency update or a hotfix.
---

# Planning a change

Nothing is built before the owner has approved a spec. The spec format and
the loop it belongs to are in the way of working (skill
`software-factory:way-of-working`, sections "The loop" and "Specs"). Read
those first; this skill says how to get there.

## 1. Read before you ask

- The issue, with its comments.
- The project's `CLAUDE.md`, `docs/adr/README.md` and the decisions that
  touch this change; the factory decisions through the skill
  `software-factory:factory-decisions`.
- The code the change will touch, and `docs/specs/` for earlier specs on
  the same part.

Whatever the code, the decisions or the issue already answer, you do not ask.
You state it in the spec instead, so the owner can correct it.

## 2. Question the owner

- **One topic per question.** Wait for the answer before the next one. A
  later question often changes once an earlier one is answered.
- **Ask what only the owner can decide:** what it is for, what the user
  sees, what is deliberately left out, what happens in an edge case, what
  "done" looks like. Not what the code or a decision already settles.
- **Give your recommendation** with each question, with the reason in one
  sentence, and the alternatives that are real. "Should it do X or Y? I
  recommend X, because ..." is quicker to answer than an open question.
- **Go through the headings of the spec** as a checklist: problem, what it
  does, not in scope, edge cases, done when, decisions. Keep asking until
  every one of them has an answer you did not have to guess.
- Say so when an answer would go against a decision, and propose either
  following it or a project decision that deviates (skill `write-adr`).
- In the language the owner speaks to you.

Stop asking when every choice is settled, not after a fixed number of
questions. A small change may need two questions; a new module, twenty.

## 3. Write the spec

- `docs/specs/NNNN-short-title.md`, next free number, status `draft` (in a
  Dutch project `concept`), in the project's language and with its headings.
- Only what was settled. Where you filled something in yourself, say so in
  the text, so the owner sees it.
- **Done when** holds checks someone can actually carry out on the preview
  or in a test, not "works well".
- **Decisions** names every F-number and project ADR the change follows, and
  any new decision it needs.

## 4. Present it and wait

- Show the owner the spec (the whole file, or a link to it on the branch),
  with the choices you made yourself listed first.
- Commit the draft on the branch, so it is not lost if the session ends.
- Change it until the owner says it is right. Then set the status to
  `approved` (`akkoord`) in its own commit, before any code.
- Do not start building on silence or on "looks fine so far". Ask for a
  clear yes.

## 5. Then

Build from the spec. When something in it turns out not to work, stop, change
the spec, and ask again; do not let the code quietly differ from it. The
review (`software-factory:factory-review`) checks the change against the spec,
and after the preview is built, the skill `software-factory:preview-check`
goes through it. The owner merges.
