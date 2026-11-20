// The head of a public page (F-0019): title, description, canonical URL and
// share tags, always on the site's fixed domain. Pure, so it can be tested;
// SeoHead.svelte puts the result in <svelte:head>.

/** The origin of the site's fixed domain, such as `https://www.example.nl`. */
export function siteOrigin(site) {
	return new URL(site.url).origin;
}

/**
 * The path for the canonical URL: always starting with a slash, without query
 * string or fragment. A trailing slash is kept as the site's routes use it;
 * only the root is always `/`.
 */
export function canonicalPath(path) {
	const clean = (path || '/').split(/[?#]/)[0] || '/';
	return clean.startsWith('/') ? clean : `/${clean}`;
}

/** An absolute URL on the fixed domain, for a path or an address that is absolute already. */
export function absoluteUrl(site, pathOrUrl) {
	return new URL(pathOrUrl, `${siteOrigin(site)}/`).href;
}

/**
 * True when the page may be indexed: on the fixed domain itself, and not
 * marked noindex. On any other host, such as a preview or a vercel.app alias
 * of production, the page works but asks search engines to leave it out.
 */
export function isIndexable(site, url, page = {}) {
	if (page.noindex) return false;
	return new URL(url).host === new URL(site.url).host;
}

/** The header that keeps a page out of the index, for admin and utility pages. */
export const NOINDEX_HEADERS = Object.freeze({ 'X-Robots-Tag': 'noindex' });

/**
 * The tags for one page. `url` is the address the page was requested on; it
 * only decides `noindex`, never the canonical URL.
 */
export function seoHead(site, page, url) {
	if (!page.title?.trim()) throw new Error('seoHead: a page needs a title (F-0019).');
	const canonical = absoluteUrl(site, canonicalPath(page.path ?? new URL(url).pathname));
	const image = page.image || site.image;
	const meta = [
		{ name: 'description', content: page.description ?? '' },
		...(isIndexable(site, url, page) ? [] : [{ name: 'robots', content: 'noindex' }]),
		{ property: 'og:type', content: page.type ?? 'website' },
		{ property: 'og:site_name', content: site.name },
		{ property: 'og:title', content: page.title },
		{ property: 'og:description', content: page.description ?? '' },
		{ property: 'og:url', content: canonical },
		...(site.locale ? [{ property: 'og:locale', content: site.locale }] : []),
		...(image ? [{ property: 'og:image', content: absoluteUrl(site, image) }] : []),
		{ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
		{ name: 'twitter:title', content: page.title },
		{ name: 'twitter:description', content: page.description ?? '' },
		...(image ? [{ name: 'twitter:image', content: absoluteUrl(site, image) }] : [])
	];
	return { title: page.title, canonical, meta };
}

/** Text for inside an HTML attribute or element. */
export function escapeHtml(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** The tags of seoHead as HTML, for `{@html}` in `<svelte:head>`. */
export function headTags(site, page, url) {
	const head = seoHead(site, page, url);
	const meta = head.meta.map((tag) => {
		const [key, value] = tag.name ? ['name', tag.name] : ['property', tag.property];
		return `<meta ${key}="${escapeHtml(value)}" content="${escapeHtml(tag.content)}">`;
	});
	return [
		`<title>${escapeHtml(head.title)}</title>`,
		`<link rel="canonical" href="${escapeHtml(head.canonical)}">`,
		...meta
	].join('\n');
}
