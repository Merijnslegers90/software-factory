/** The site details, kept once in the product's content (F-0019). */
export interface Site {
	/** The fixed domain the site redirects to, such as `https://www.example.nl`. Never the request's domain. */
	url: string;
	/** The name of the site, for `og:site_name`. */
	name: string;
	/** The default share image, a path such as `/og.png` or an absolute URL, 1200 by 630. */
	image?: string;
	/** The locale for `og:locale`, such as `nl_NL`. */
	locale?: string;
}

/** What one page says about itself. */
export interface Page {
	/** The full title, as the page writes it; no brand name is added. */
	title: string;
	/** The description for search results and shared links. */
	description: string;
	/** The path for the canonical URL; the requested path when left out. */
	path?: string;
	/** A share image of its own, instead of the site's default. */
	image?: string;
	/** `og:type`; `website` when left out. */
	type?: 'website' | 'article';
	/** Keep this page out of the index, such as an admin or utility page. */
	noindex?: boolean;
}

export interface MetaTag {
	name?: string;
	property?: string;
	content: string;
}

export interface Head {
	title: string;
	canonical: string;
	meta: MetaTag[];
}

export function siteOrigin(site: Site): string;
export function canonicalPath(path: string | undefined): string;
export function absoluteUrl(site: Site, pathOrUrl: string): string;
export function isIndexable(site: Site, url: URL | string, page?: Pick<Page, 'noindex'>): boolean;
export const NOINDEX_HEADERS: Readonly<{ 'X-Robots-Tag': 'noindex' }>;
export interface HeadOptions {
	/** True while SvelteKit prerenders (`building` from `$app/environment`): the page is written as on the fixed domain. */
	prerendering?: boolean;
}

export function seoHead(site: Site, page: Page, url: URL | string, options?: HeadOptions): Head;
export function escapeHtml(text: string): string;
export function headTags(site: Site, page: Page, url: URL | string, options?: HeadOptions): string;
