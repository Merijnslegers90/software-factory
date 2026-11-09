# F-0014: A site on Storyblok stays on it, with its token on the server

- **Status:** accepted
- **Date:** 9 November 2026

## Context

F-0013 makes Sanity the CMS for a new site the customer edits, and lets sites
that already run on another CMS stay on it. Two such sites run on Storyblok.
Each reads it in its own way, and one has a preview token hardcoded in a load
that also runs in the browser: anyone who opens the site can read the
customer's drafts with it, and the token is in the git history. Without a
rule, the next review has nothing to check this against.

## Decision

- **A site that already runs on Storyblok stays on it.** A new site the
  customer edits still gets Sanity (F-0013).
- **The token is read on the server only**, at runtime, never `static`
  (F-0005); in `src/env.ts` once the site is on SvelteKit 3 (F-0010). It is
  never written in the code, and never reaches the browser: the content is
  fetched in a server load, not in a universal one.
- **Two tokens.** A public token reads published content. A separate preview
  token reads drafts, and is only used on preview deployments and in the
  Visual Editor. Production never uses the preview token.
- **A token that has been in the code or in the browser is replaced** in
  Storyblok when the site is taken in, because the old one stays in the git
  history.
- **Types** are generated from Storyblok's components, and the generated file
  is committed.
- **Without a token**, the site does not call Storyblok and shows what it can
  without it (F-0005). The build does not break.

## Consequences

- Taking in a Storyblok site moves the content fetching to server loads.
  That is the one change in behaviour the take-in may make (skill
  `setup-product`).
- The Storyblok account stays in the customer's name, like the CMS account in
  F-0013.
- Moving a Storyblok site to Sanity is a change of its own, with a spec,
  never part of a take-in.

## In the code

- The skill `setup-product`, route for an existing site.
- Each Storyblok site: its server loads, `.env.example` with the names of both
  tokens, and the generated types.
