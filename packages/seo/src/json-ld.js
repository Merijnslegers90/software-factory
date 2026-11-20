// Structured data for search engines (schema.org, F-0019). The builders take
// the product's details and leave out what is empty; jsonLd() writes the
// complete script tag, because Svelte fills in nothing inside a script element.

import { absoluteUrl, siteOrigin } from './head.js';

/**
 * Removes empty values: undefined, null, empty strings and lists, and objects
 * that are empty or only have a `@type` left. Nothing is ever written as an
 * empty string.
 */
export function compact(value) {
	if (Array.isArray(value)) {
		const items = value.map(compact).filter((item) => item !== undefined);
		return items.length > 0 ? items : undefined;
	}
	if (value && typeof value === 'object') {
		const entries = Object.entries(value)
			.map(([key, item]) => [key, compact(item)])
			.filter(([, item]) => item !== undefined);
		if (entries.length === 0 || entries.every(([key]) => key === '@type')) return undefined;
		return Object.fromEntries(entries);
	}
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string' && value.trim() === '') return undefined;
	return value;
}

function address(details) {
	return {
		'@type': 'PostalAddress',
		streetAddress: details?.street,
		postalCode: details?.postalCode,
		addressLocality: details?.locality,
		addressRegion: details?.region,
		addressCountry: details?.country
	};
}

function image(site, pathOrUrl) {
	return pathOrUrl ? absoluteUrl(site, pathOrUrl) : undefined;
}

/** A business with a place or an area it serves, such as a shop, practice or food truck. */
export function localBusiness(site, details) {
	const origin = siteOrigin(site);
	return compact({
		'@type': details.type ?? 'LocalBusiness',
		'@id': `${origin}/#business`,
		name: details.name ?? site.name,
		url: `${origin}/`,
		description: details.description,
		image: image(site, details.image ?? site.image),
		logo: image(site, details.logo),
		telephone: details.telephone,
		email: details.email,
		address: address(details.address),
		areaServed: (details.areaServed ?? []).map((name) => ({ '@type': 'Place', name })),
		priceRange: details.priceRange,
		founder: (details.founders ?? []).map((name) => ({ '@type': 'Person', name })),
		foundingDate: details.foundingDate,
		sameAs: details.sameAs
	});
}

/** A person the site is about, such as a personal site or a practitioner. */
export function person(site, details) {
	const origin = siteOrigin(site);
	return compact({
		'@type': 'Person',
		'@id': `${origin}/#person`,
		name: details.name,
		jobTitle: details.jobTitle,
		description: details.description,
		url: `${origin}/`,
		image: image(site, details.image),
		email: details.email ? `mailto:${details.email}` : undefined,
		address: address(details.address),
		knowsAbout: details.knowsAbout,
		worksFor: details.worksFor ? { '@id': details.worksFor } : undefined,
		sameAs: details.sameAs
	});
}

/** The site itself, published by the business or person with the id `publisher`. */
export function website(site, details = {}) {
	const origin = siteOrigin(site);
	return compact({
		'@type': 'WebSite',
		'@id': `${origin}/#website`,
		name: details.name ?? site.name,
		url: `${origin}/`,
		inLanguage: details.inLanguage,
		publisher: details.publisher ? { '@id': details.publisher } : undefined
	});
}

/**
 * The complete `<script type="application/ld+json">` tag for one node or
 * several (then as a `@graph`). A `<` in the data becomes `<`, so text in
 * the data can never close the tag.
 */
export function jsonLd(...nodes) {
	const data =
		nodes.length === 1
			? { '@context': 'https://schema.org', ...nodes[0] }
			: { '@context': 'https://schema.org', '@graph': nodes };
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</` + 'script>';
}
