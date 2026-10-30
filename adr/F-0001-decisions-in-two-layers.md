# F-0001: Decisions are ADRs, in two layers

- **Status:** accepted
- **Date:** 30 October 2026

## Context

A project's rules lived in one long `CLAUDE.md`, without the reasons. A rule
without a reason is just as easily overturned by the next developer, human or
agent. The first project therefore wrote its decisions down as separate ADRs.

With a second product on the same setup, the same decisions appeared twice,
and they drifted apart: one project gave a new table grants and RLS, the other
only grants. A decision that lives in two projects gets updated in one of
them.

## Decision

- A choice that is hard to reverse, touches several places, or that a next
  developer would make differently without knowing the reason, gets an ADR:
  status, date, and the headings Context, Decision, Consequences and In the
  code.
- There are two layers. What holds for every product lives in this repo as a
  factory decision (`F-NNNN`). What belongs to one product lives in that
  project in `docs/adr/` (`NNNN`).
- A project decision that works out a factory decision says "Follows:
  F-NNNN". A project that deliberately deviates writes a project decision with
  "Deviates from: F-NNNN" and the reason. Without one, the factory applies.
- An accepted decision is not rewritten. If it changes, a new decision is
  written and the old one becomes "superseded by".
- `CLAUDE.md` keeps the short rule and points to the number. A test that
  enforces a decision names the number too.
- A test checks the structure, here and in every project.

## Consequences

- An improved factory decision holds for every product at once; the projects
  only keep their reference.
- An agent working in a project knows the factory decisions through the skill
  `factory-decisions`, without them being repeated in every `CLAUDE.md`.
- This repo is public. A factory decision describes how things are built,
  never data about a company, a customer or a person involved.
- A decision that lives in one project but comes back in a second moves here.

## In the code

- `adr/README.md`: the structure and the list.
- `tests/adr.test.mjs` checks the structure and that every decision is in
  both lists.
- The skill `write-adr` writes a decision in the right layer; the skill
  `factory-decisions` loads these decisions.
