---
name: add-sanity
description: Move a site's content from code to Sanity, the factory way (F-0013). Sets up the project in the right owner's name, the Studio in studio/, generated types, a prerendered site that reads published content at build time, a rebuild on every publish, and the move of the content that is live now. Use this when a customer wants to edit their own site, or when someone asks to add Sanity or a CMS to a product.
---

# Moving a site's content to Sanity

A site the customer edits keeps its content in Sanity (F-0013). The site is
prerendered: it reads the published content when it is built, and every
publish in Sanity starts a new build. Visitors get static pages, Sanity is
only called while building, and a failed build leaves the previous version
live.

Read F-0013 in full before you start (skill
`software-factory:factory-decisions`), and F-0005, F-0008 and F-0010 where a
step names them. Work through the steps in order; each ends with something
you can check.

**Not part of this skill:** previewing drafts on the site, visual editing
(the Presentation tool), and sites that already run on another CMS. A
product with a shop keeps name, price, stock and orders in its database; the
CMS only tells the story and refers to a product by its product code.

## 1. Who owns the project

Ask the owner: is this the owner's own product, or a customer's?

- **Own product.** Create the project through the Sanity integration on the
  Vercel Marketplace, in the owner's Vercel team: `vercel integration add
sanity` in the linked project (check the slug with `vercel integration add
--help` if it is refused). Billing and plan changes then go through Vercel.
  The integration also adds environment variables; the site does not use
  them (step 4), so leave them as they are.
- **Customer.** The customer creates an organization at sanity.io/manage in
  their own name, with their own email address, and invites the builder as an
  administrator. Create the project inside that organization. Do not use the
  Marketplace integration: it ties the project to the builder's Vercel team,
  and the customer could not take it along (F-0013). When the work ends, the
  customer keeps the Sanity organization; only the Vercel project is
  transferred.

Either way: one project per site, dataset `production`, public (the
default). Published content on a public dataset can be read without a token;
drafts cannot. Write down the project ID.

## 2. The Studio in `studio/`

From the repo root, with the project ID from step 1:

```bash
npx sanity@latest init -y --project <projectId> --dataset production \
  --output-path studio --template clean --typescript --package-manager pnpm
```

- The Studio is its own package with its own `package.json` and lockfile,
  and `sanity init` gives it its own prettier settings. It is not part of the
  site's build: add `studio/` to the `ignores` of the site's ESLint config and
  to `.prettierignore`, so `lint` leaves it alone. The site's `tsconfig.json`
  does not include it already; leave that file as it is. Vercel only builds
  the site.
- **The schema** lives in `studio/schemaTypes/`, one file per type, in
  TypeScript. Model what the site has now: a page that exists once (the home
  page, the about page) is a singleton with a fixed `_id`; something that
  repeats (projects, team members) is a document type. Name the fields after
  the content types already in code, so step 6 maps one to one.
- **Every image field** has a required `alt` field, and every field the site
  cannot do without is `required()`.
- **Deploy** with `npx sanity deploy` from `studio/`. Pick the hostname after
  the site, so the Studio is on `<site>.sanity.studio`.
- Add the people who edit as members of the project, with the Editor role.

Check: the Studio opens on its hostname and shows the types.

## 3. Types from the schema

In `studio/sanity.cli.ts`, next to `api`:

```ts
typegen: {
	path: '../src/lib/sanity/**/*.ts',
	schema: './schema.json',
	generates: '../src/lib/sanity/types.ts'
}
```

and in `studio/package.json` a script
`"typegen": "sanity schema extract && sanity typegen generate"`.

- Every GROQ query sits in `src/lib/sanity/queries.ts`, written with
  `defineQuery` from `groq`, so the types cover it. Not in a `.svelte` file.
- Commit `src/lib/sanity/types.ts`. CI does not install the Studio, so the
  site must type-check with the generated file as it is.
- Run `pnpm typegen` in `studio/` after every schema change, in the same
  commit.

Check: `pnpm run check` in the site passes with the generated types.

## 4. Reading at build time

The site gets `@sanity/client`, `@sanity/image-url` and `groq`.

**`src/lib/sanity/config.ts`**, pure:

```ts
// Public settings, not keys (F-0005): published content needs no token.
export const SANITY_PROJECT_ID = ""; // empty until step 1 is done
export const SANITY_DATASET = "production";
export const SANITY_API_VERSION = "2026-11-01";
```

- `studio/sanity.cli.ts` and `studio/sanity.config.ts` have the same two
  values. A test in the site reads both files and fails when they differ.

**`src/lib/server/sanity.ts`**, server-only:

- `sanityClient()` returns `null` while `SANITY_PROJECT_ID` is empty, and
  otherwise a client with `useCdn: false` (a build right after a publish must
  see it) and `perspective: 'published'`. Made on first use, like every
  other client in the factory.
- One function per piece of content, such as `getHome()`. Without a client it
  returns the launch content from code (step 7). With a client it runs the
  query; if the request fails, it throws an error that starts with
  `Sanity unreachable:`, and if a document the site needs is missing, or
  the dataset is empty, it throws an error that names Sanity and the
  document, such as `Sanity: document home is missing`. Either error fails the build
  (step 8).
- Turning the query result into what the page shows is a pure function in
  `src/lib/sanity/`, with a test (F-0006). So is the check that a required
  document is there.

**Prerendering.** In `src/routes/+layout.ts`: `export const prerender = true`.
The loads go in `+page.server.ts` and `+layout.server.ts`, never in a
universal `+page.ts`, because they import the server-only module. They run at
build time and call the functions above.

- A page with a form action cannot be prerendered. A contact form posts to an
  endpoint under `/api/` instead, which sends the mail and stores nothing
  (F-0013).
- `PUBLIC_SITE_URL` and other settings stay in `src/env.ts` as before; this
  step adds no keys and no lines to `.env.example`.

Check: with an empty project ID the build passes and shows the launch content;
with the real ID it shows what is in Sanity.

## 5. A rebuild on every publish

1. In Vercel, project settings, Git, Deploy Hooks: a hook named
   `sanity-publish` on the production branch. Copy the URL.
2. At sanity.io/manage, the project, API, Webhooks: a webhook with that URL,
   method POST, dataset `production`, triggers on create, update and delete,
   without drafts. No filter and no projection: any publish rebuilds.
3. The URL lives only in Vercel and in the Sanity webhook. Never in the repo,
   a comment or a pull request: anyone with it can start builds.

Check: publish a small change in the Studio; Vercel starts a production
build, and the change is live about a minute later.

## 6. Moving the content that is live now

A one-off script puts what the site shows now into the dataset, so the
customer starts from the live site, not an empty Studio.

- `studio/scripts/import-launch-content.ts`, run from `studio/` with
  `npx sanity exec scripts/import-launch-content.ts --with-user-token`. It
  uses `getCliClient()` from `sanity/cli` and the token of whoever is logged
  in; no token is created or stored.
- It reads the launch content from the site's content modules by relative
  path. If those import with an alias (`#lib/...`), copy the content into the
  script once instead.
- Images: upload each with `client.assets.upload('image', ...)` and put the
  returned asset in the image field, with its alt text.
- Write with `createOrReplace` and the fixed `_id` of each singleton, in one
  transaction.
- **Delete the script in the same pull request**, after the import has run.
  Run again later, it would overwrite what the customer changed since.

Check: every page of the site has its content in the Studio, with images and
alt texts.

## 7. The launch content stays in code

The content modules in code stay, as the content the site launched with. They
are used only while `SANITY_PROJECT_ID` is empty, and are not updated after
the move. Say so in a comment at the top of each module, with a pointer to
this skill.

## 8. When Sanity cannot be reached

Nothing to build beyond step 4: the errors thrown there fail the build, and
Vercel keeps the previous deployment live. The same holds in CI, which reads
published content like any build; a run that fails because Sanity was down
is run again later.

Check: build once with a wrong dataset name; it fails with a message that
names Sanity, and nothing is published.

## 9. Images

- Sanity keeps the original upload and scales it in its image service. The
  site never loads an original (F-0013, next to F-0008).
- One module, `src/lib/sanity/images.ts`, builds the image URL with
  `@sanity/image-url`: a fixed width per kind of image (hero, card, thumbnail)
  as constants, `auto('format')`, with a test for the widths.
- If the site sets a Content Security Policy for images, add `cdn.sanity.io`.

Check: in the browser, every image comes from `cdn.sanity.io` with a width
in its URL.

## 10. The project's `CLAUDE.md`

Add a short section:

- The kind: a site the customer edits (F-0013).
- Who owns the Sanity project (the owner's Vercel team, or the customer's
  organization by name) and the Studio's address.
- How a change goes live: publish in the Studio, rebuilt in about a minute.
- Where the schema lives, and that `pnpm typegen` in `studio/` follows every
  schema change.
- That the launch content in code is not kept up to date.

Not the Deploy Hook URL, and no project tokens.

## Before the pull request

- The checks at the end of steps 2 to 9 all hold.
- `lint`, `check`, `test` and `build` pass in the site.
- The import script is gone, and the customer has looked at their content in
  the Studio.
