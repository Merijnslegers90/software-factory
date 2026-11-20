// sitemap.xml and robots.txt (F-0019), built from the site's fixed domain and
// the product's list of public pages, never from the request's domain.

import { absoluteUrl, canonicalPath, escapeHtml } from './head.js';

/** Paths that are never in the index of any product. */
export const DEFAULT_DISALLOW = Object.freeze(['/admin', '/api']);

/**
 * The sitemap for a list of pages. Each page is a path or `{ path, lastmod }`,
 * where `lastmod` is a date or an ISO string. A path is listed once.
 */
export function sitemap(site, pages) {
	const seen = new Set();
	const entries = [];
	for (const page of pages) {
		const { path, lastmod } = typeof page === 'string' ? { path: page } : page;
		const loc = absoluteUrl(site, canonicalPath(path));
		if (seen.has(loc)) continue;
		seen.add(loc);
		const date = lastmod ? new Date(lastmod).toISOString().slice(0, 10) : null;
		entries.push(
			`  <url>\n    <loc>${escapeHtml(loc)}</loc>${date ? `\n    <lastmod>${date}</lastmod>` : ''}\n  </url>`
		);
	}
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries,
		'</urlset>',
		''
	].join('\n');
}

/** robots.txt: everything allowed except admin, API and what the product adds, and the sitemap. */
export function robots(site, { disallow = [] } = {}) {
	const paths = [...new Set([...DEFAULT_DISALLOW, ...disallow])];
	return [
		'User-agent: *',
		'Allow: /',
		...paths.map((path) => `Disallow: ${path}`),
		'',
		`Sitemap: ${absoluteUrl(site, '/sitemap.xml')}`,
		''
	].join('\n');
}

/** Response headers for sitemap.xml and robots.txt: an hour in the cache. */
export const SITEMAP_HEADERS = Object.freeze({
	'Content-Type': 'application/xml; charset=utf-8',
	'Cache-Control': 'public, max-age=3600'
});
export const ROBOTS_HEADERS = Object.freeze({
	'Content-Type': 'text/plain; charset=utf-8',
	'Cache-Control': 'public, max-age=3600'
});
