import type { Site } from './head.js';

export interface Address {
	street?: string;
	postalCode?: string;
	locality?: string;
	region?: string;
	country?: string;
}

export type Node = Record<string, unknown> & { '@type': string; '@id'?: string };

export interface LocalBusinessDetails {
	/** A schema.org type: `LocalBusiness` or a more specific one, such as `FoodEstablishment`. */
	type?: string;
	/** The site's name when left out. */
	name?: string;
	description?: string;
	/** A path or absolute URL; the site's share image when left out. */
	image?: string;
	logo?: string;
	telephone?: string | string[];
	email?: string;
	address?: Address;
	/** Places the business works in, such as `['Someren', 'Asten']`. */
	areaServed?: string[];
	priceRange?: string;
	founders?: string[];
	foundingDate?: string;
	/** Profiles elsewhere: Instagram, Facebook, LinkedIn, a Google business page. */
	sameAs?: string[];
}

export interface PersonDetails {
	name: string;
	jobTitle?: string;
	description?: string;
	image?: string;
	email?: string;
	address?: Address;
	knowsAbout?: string[];
	/** The `@id` of the business the person works for. */
	worksFor?: string;
	sameAs?: string[];
}

export interface WebsiteDetails {
	name?: string;
	/** Such as `nl` or `en`. */
	inLanguage?: string;
	/** The `@id` of the business or person that publishes the site, such as `https://www.example.nl/#business`. */
	publisher?: string;
}

export function compact<T>(value: T): T | undefined;
export function localBusiness(site: Site, details: LocalBusinessDetails): Node;
export function person(site: Site, details: PersonDetails): Node;
export function website(site: Site, details?: WebsiteDetails): Node;
export function jsonLd(...nodes: Node[]): string;
