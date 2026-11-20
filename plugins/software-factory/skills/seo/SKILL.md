---
name: seo
description: Make a product findable the factory's way (F-0019) with @merijnslegers/seo - the head with canonical URL and share tags on the fixed domain, noindex on any other host, sitemap.xml, robots.txt, structured data, and the fixed test e2e/seo.spec.ts. Use this for a new product with public pages, for a site that was taken in (after its move to SvelteKit 3), for a new public page, and when someone asks about SEO, search engines, Google, share previews or the sitemap.
---

# Findability

Read F-0019 first (skill `software-factory:factory-decisions`). The package
`@merijnslegers/seo` does the work; the product only keeps its site details
and its pages. It needs SvelteKit 3 (F-0010): a site still on SvelteKit 2
moves first (skill `setup-product`, route B).

## 1. The package

```bash
pnpm add @merijnslegers/seo
```

## 2. The site details

One file, such as `src/lib/content/site.ts`, that imports nothing through
`$lib` or `#lib` (the fixed test imports it too):

```ts
import type { Site } from '@merijnslegers/seo/head';

export const site: Site = {
	url: 'https://www.example.nl', // the domain the site redirects to, with or without www
	name: 'Example',
	image: '/og.png', // 1200 by 630, in static/
	locale: 'nl_NL'
};
```

- `url` is a constant, never an environment variable and never
  `url.origin` of a request. Check in Vercel which of `www` and the bare
  domain redirects to the other, and use the one it redirects to.
- **The share image** shows when someone shares a link (WhatsApp, LinkedIn).
  Without one, make it from the logo on the site's background, 1200 by 630,
  and show it to the owner.
- Put `lang` on `<html>` in `src/app.html` (`nl` or `en`).

## 3. The head

Every page gives its title and description through its load, so the layout
can write them. In the root layout:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import SeoHead from '@merijnslegers/seo/SeoHead.svelte';
	import { localBusiness, website } from '@merijnslegers/seo/json-ld';
	import { site } from '#lib/content/site';

	const seo = $derived(
		page.error
			? { title: 'Pagina niet gevonden', description: '', noindex: true }
			: page.data.seo
	);
</script>

<SeoHead {site} page={seo} jsonLd={[website(site, { inLanguage: 'nl', publisher: `${site.url}/#business` }), localBusiness(site, business)]} />
```

- A page's load returns `seo: { title, description }`, from the content where
  the content has it. The title is the page's own, in full; the package adds
  nothing. `path` and `image` are optional.
- Remove every `<title>`, `<meta name="description">`, canonical and `og:`
  tag the pages, the layout or `app.html` wrote themselves.
- **Admin and utility pages** (sign up, unsubscribe, print): `noindex: true`
  in their `seo`, and in their server load
  `setHeaders(NOINDEX_HEADERS)` from `@merijnslegers/seo/head`.

## 4. Structured data

Choose by what the product is, and take the details from the content, never
typed twice:

- **A business** (a shop, a practice, a food truck): `localBusiness`, with a
  more specific `type` where schema.org has one (`FoodEstablishment`,
  `EducationalOrganization`), phone, email, address or `areaServed`, and the
  profiles elsewhere in `sameAs`. Plus `website` with the business as
  `publisher`.
- **A person** (a personal site): `person`, plus `website` with the person
  as `publisher`.

Leave out what the site does not show; the builders drop empty values. Ask
the owner before adding a detail the site does not show yet, such as an
address.

## 5. Sitemap and robots.txt

`src/routes/sitemap.xml/+server.ts` and `src/routes/robots.txt/+server.ts`:

```ts
import { sitemap, SITEMAP_HEADERS } from '@merijnslegers/seo/sitemap';
import { site } from '#lib/content/site';
import { pages } from '#lib/content';

export const prerender = true;

export function GET() {
	return new Response(sitemap(site, pages), { headers: SITEMAP_HEADERS });
}
```

```ts
import { robots, ROBOTS_HEADERS } from '@merijnslegers/seo/sitemap';
import { site } from '#lib/content/site';

export const prerender = true;

export function GET() {
	return new Response(robots(site), { headers: ROBOTS_HEADERS });
}
```

- The list of pages comes from the content: every public page, as a path or
  `{ path, lastmod }`. Not the admin, not a page that is switched off.
- A product with more paths to keep out passes `robots(site, { disallow })`.
- Remove a hand-written `static/sitemap.xml` or `static/robots.txt`.

## 6. The fixed test

Copy `templates/e2e/seo.spec.ts` of the skill `setup-product` to `e2e/`,
point its import to the site details, and translate the comments and test
names to the product's language. It runs on every page in `e2e/pages.ts`.

## 7. Check

- `lint`, `check`, `test`, `build` and `test:e2e` pass.
- On the preview (skill `preview-check`): one title and description per page,
  the canonical URL on the fixed domain, `noindex` (it is a preview), and
  `sitemap.xml` and `robots.txt` with only the fixed domain.
- After the merge, tell the owner to put the live site through Google's Rich
  Results Test, and to submit the sitemap in Search Console if the site is
  there.
- `CLAUDE.md` says where the site details are and that a new public page goes
  in the list of pages and in `e2e/pages.ts` (template, "Findability").
