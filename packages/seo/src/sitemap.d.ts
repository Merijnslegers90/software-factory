import type { Site } from './head.js';

export type SitemapPage = string | { path: string; lastmod?: Date | string | null };

export const DEFAULT_DISALLOW: readonly string[];
export function sitemap(site: Site, pages: SitemapPage[]): string;
export function robots(site: Site, options?: { disallow?: string[] }): string;
export const SITEMAP_HEADERS: Readonly<Record<string, string>>;
export const ROBOTS_HEADERS: Readonly<Record<string, string>>;
