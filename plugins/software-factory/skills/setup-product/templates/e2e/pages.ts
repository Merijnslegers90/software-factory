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

async function fetchText(url: string | URL): Promise<string> {
	// A protected preview needs the bypass token on this request too.
	const token = process.env.E2E_BYPASS_TOKEN;
	const response = await fetch(url, {
		headers: token ? { 'x-vercel-protection-bypass': token } : {}
	});
	if (!response.ok) throw new Error(`${url} gave ${response.status}`);
	return response.text();
}

function locs(xml: string): string[] {
	return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

/** The pages to check: from the sitemap of E2E_BASE_URL when asked, else the list above. */
export async function pagesToCheck(): Promise<string[]> {
	const base = process.env.E2E_BASE_URL;
	if (!base || process.env.E2E_FROM_SITEMAP !== '1') return PAGES;
	const xml = await fetchText(new URL('/sitemap.xml', base));
	// A sitemap index points to other sitemaps: follow it one level down.
	const sitemaps = /<sitemapindex[\s>]/.test(xml)
		? await Promise.all(locs(xml).map((url) => fetchText(url)))
		: [xml];
	const paths = sitemaps
		.flatMap(locs)
		.filter((loc) => !/\.xml(\?|$)/.test(loc))
		.map((loc) => new URL(loc).pathname.replace(/\/+$/, '') || '/');
	return [...new Set(paths)];
}
