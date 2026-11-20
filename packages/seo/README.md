# @merijnslegers/seo

Findability for every product of the software factory (F-0019): the head of
a public page with its canonical URL and share tags on the site's fixed
domain, `noindex` on any other host, `sitemap.xml`, `robots.txt` and
structured data for search engines.

The product keeps its site details and its list of pages; the rest is here.
The skill `seo` puts it in a product, step by step.

```bash
pnpm add @merijnslegers/seo
```

| Import                                | What it holds                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `@merijnslegers/seo/SeoHead.svelte`   | The component for the root layout: title, description, canonical URL, share tags, structured data |
| `@merijnslegers/seo/head`             | `seoHead`, `headTags`, `isIndexable`, `canonicalPath`, `absoluteUrl`, `NOINDEX_HEADERS` |
| `@merijnslegers/seo/sitemap`          | `sitemap`, `robots`, and the response headers for both                        |
| `@merijnslegers/seo/json-ld`          | `jsonLd` (the escaped script tag), `localBusiness`, `person`, `website`, `compact` |

Everything but the component is plain JavaScript without dependencies and
runs anywhere. The component needs SvelteKit 3 (F-0010).

## The site details

```ts
import type { Site } from '@merijnslegers/seo/head';

export const site: Site = {
	url: 'https://www.example.nl', // fixed: never a variable, never the request's domain
	name: 'Example',
	image: '/og.png', // the default share image, 1200 by 630
	locale: 'nl_NL'
};
```

## The head

```svelte
<SeoHead {site} page={{ title, description }} jsonLd={[website(site), localBusiness(site, details)]} />
```

- The canonical URL and `og:url` are `site.url` with the page's path, without
  query string. A page can pass its own `path` and `image`.
- On any host other than the one in `site.url` (a preview, a `vercel.app`
  alias, localhost) the page gets `<meta name="robots" content="noindex">`.
  A page with `noindex: true` gets it everywhere.
- The title is written as given. A page without a title throws.
- Every value is escaped.

## Sitemap and robots.txt

```ts
sitemap(site, ['/', { path: '/menu', lastmod: '2026-01-03' }]);
robots(site, { disallow: ['/print'] }); // /admin and /api are always out
```

## Structured data

`jsonLd(...nodes)` returns the complete `<script type="application/ld+json">`
tag, with `<` escaped so text in the data cannot close it; several nodes
become one `@graph`. The builders take the product's details and leave out
what is empty.

## Tests

`npm test` at the root of the factory runs `test/*.test.mjs`.
