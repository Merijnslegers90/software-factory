# F-0019: Findability through one package

- **Status:** accepted
- **Date:** 20 November 2026

## Context

Every product with public pages wants to be found, and each did it its own
way. merijnslegers.nl had its own `seo.ts` with a site URL from
`PUBLIC_SITE_URL`; Studie Doorzien had a fixed domain and its own `jsonLd`;
Frietwagen Someren had a title and a description per page, and a sitemap and
`robots.txt` on the domain of the request, so its `vercel.app` address counted
as a second site with the same content. A fix in one copy reached no other.

With three products that need the same thing, the rule against a package with
one user no longer holds it back. The spec is issue #32.

## Decision

- **The basics hold for every public page:** rendered on the server, a title
  and a description of its own that use the words people search for, one
  `h1`, `lang` on `html`, and readable URLs.
- **The head comes from `@merijnslegers/seo`**: `SeoHead` in the root layout,
  with the site details and the page's title and description. It writes the
  title, the description, the canonical URL and the `og:` and `twitter:` tags.
  The title is the page's own, in full; nothing is added to it.
- **One fixed domain per product**, a constant in its content next to the
  other site details (`url`, `name`, the default share image). Never an
  environment variable and never the request's domain. The canonical URL,
  `og:url`, the sitemap and `robots.txt` all use it.
- **Any other host gets `noindex`**: a preview, a `vercel.app` alias of
  production, localhost. The page still works there and its canonical URL
  stays on the real domain. Nothing redirects. A prerendered page is written
  once, as on the fixed domain, so it has no `noindex` elsewhere; the
  canonical URL still points to the domain, and Vercel sends
  `X-Robots-Tag: noindex` on previews.
- **Out of the index:** admin pages and utility pages (sign up, unsubscribe,
  print) get `noindex` and the `X-Robots-Tag` header (`NOINDEX_HEADERS`); 404
  pages get `noindex`. None of them is in the sitemap. `robots.txt` keeps
  `/admin` and `/api` out.
- **A page that goes away** gets a permanent redirect (301) to the page that
  comes closest, so links elsewhere and search results do not end on a 404.
- **Sitemap and `robots.txt`** come from `sitemap()` and `robots()` of the
  package, built from the fixed domain and the product's list of public pages.
- **Structured data** goes through `jsonLd()`, which writes the complete
  script tag with `<` escaped. The builders `localBusiness`, `person` and
  `website` take the product's details and leave out what is empty.
- **The fixed test `e2e/seo.spec.ts`** (template in the skill
  `setup-product`) checks every page: one title, one description that is not
  empty, one canonical URL on the fixed domain, `lang` set, and JSON-LD that
  parses; and that the sitemap and `robots.txt` use the fixed domain.

## Consequences

- A product only keeps its site details and its list of pages; everything
  else is the package's, and a fix reaches every product with a release.
- The package supports SvelteKit 3 only (F-0010). A product on SvelteKit 2
  moves first.
- A page without a description fails CI. A missing share image falls back to
  the site's default.
- Search Console, rewriting copy, speed and multilingual sites are outside
  this decision.
- One `h1` per page is not tested, because content can bring headings of its
  own; the review checks it on new pages.

## In the code

- `packages/seo`: `head.js` (canonical URL, `noindex` by host, the tags),
  `sitemap.js`, `json-ld.js` and `SeoHead.svelte`, with tests in
  `packages/seo/test/`.
- The skill `seo` puts it in a product; `setup-product` has
  `templates/e2e/seo.spec.ts`; `factory-review` and `preview-check` check it.
