// The public pages the fixed tests open (skill setup-product). One list, so
// pages.spec.ts and accessibility.spec.ts check the same pages, and a new page
// is added in one place.
//
// Locally and in CI the tests run against the dev server with the fake values
// from .env.example; a page that needs a CMS or a database still has to
// render then, even if empty. With E2E_BASE_URL set (a preview or the live
// site), they run there instead, and a CMS site takes its pages from the
// sitemap, so pages that only exist in the CMS are checked too.
//
// Leave out pages behind a login or that only show a form result, with a
// comment saying so.

export const PAGES: string[] = [
	'/'
	// '/contact',
];

/** The pages to check: from the sitemap of E2E_BASE_URL when asked, else the list above. */
export async function pagesToCheck(): Promise<string[]> {
	const base = process.env.E2E_BASE_URL;
	if (!base || process.env.E2E_FROM_SITEMAP !== '1') return PAGES;
	const response = await fetch(new URL('/sitemap.xml', base));
	if (!response.ok) throw new Error(`sitemap.xml gave ${response.status}`);
	const xml = await response.text();
	const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
		(m) => new URL(m[1]).pathname.replace(/\/+$/, '') || '/'
	);
	return [...new Set(paths)];
}
