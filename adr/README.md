# Factory decisions

These are the decisions that hold for every product built by the factory, one
file per decision. Each project also keeps its own decisions in `docs/adr/`,
for what belongs to that product alone. Why it works in two layers is in
[F-0001](F-0001-decisions-in-two-layers.md).

## When is it a factory decision

When it would hold for every product: the stack, how the database is reached,
how deploys work, what CI checks. If it is about one product (an accounting
package, a payment provider, how a screen is built), it is a project decision.

When in doubt, start in the project. A decision that comes back in a second
project belongs here, and the project decisions then get the status
"superseded by F-NNNN".

## How

- A new file `F-NNNN-short-title.md`, with the next free number.
- At the top `# F-NNNN: Title`, then the status and the date, then the four
  fixed headings: **Context**, **Decision**, **Consequences** and **In the
  code**.
- Status is one of: `proposed`, `accepted`, `superseded by F-NNNN` or
  `deprecated`.
- An accepted decision is not edited after the fact. If it changes, write a
  new decision, put "superseded by F-NNNN" in the old one and "Supersedes:
  F-NNNN" in the new one. A clarification or a reference that is out of date
  may be fixed.
- Add the decision to the list below and to the list in the skill
  `factory-decisions`, with its short rule. That is how every agent knows it.

`tests/adr.test.mjs` checks the numbering, headings, status, references and
both lists. No em dashes, here too.

## How a project refers to it

- A project decision that works out a factory decision has
  `- **Follows:** F-NNNN` below its date.
- A project that deliberately deviates writes a project decision with
  `- **Deviates from:** F-NNNN` and the reason in its context. Without one,
  the factory applies.
- A project that writes its decisions in another language may use the same
  lines in that language (in Dutch: `Volgt` and `Wijkt af van`).
- In a project's `CLAUDE.md`, the short rule points to the number, just like
  for a project decision ("F-0004").

Decisions dated before 30 October 2026 were written down afterwards, from
what the first two products already did. Their date is that of the decision
itself.

## List

| No                                               | Decision                                              | Status   |
| ------------------------------------------------ | ----------------------------------------------------- | -------- |
| [F-0001](F-0001-decisions-in-two-layers.md)      | Decisions are ADRs, in two layers                     | accepted |
| [F-0002](F-0002-one-stack.md)                    | One stack for every product                           | accepted |
| [F-0003](F-0003-migrations-on-deploy.md)         | Migrations run with the production deploy             | accepted |
| [F-0004](F-0004-database-server-only.md)         | The database only from the server, with service_role  | accepted |
| [F-0005](F-0005-off-without-key.md)              | A feature that needs a key is off without it          | accepted |
| [F-0006](F-0006-pure-tested-logic.md)            | Pure, tested logic; the outside world in server-only  | accepted |
| [F-0007](F-0007-one-quality-check.md)            | Every change goes through the same quality check      | accepted |
| [F-0008](F-0008-resize-images-in-browser.md)     | Images are resized in the browser before upload       | accepted |
| [F-0009](F-0009-one-project-per-product.md)      | Every product its own Supabase project                | accepted |
