import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	NOINDEX_HEADERS,
	absoluteUrl,
	canonicalPath,
	headTags,
	isIndexable,
	seoHead
} from '../src/head.js';

const site = {
	url: 'https://www.example.nl',
	name: 'Example',
	image: '/og.png',
	locale: 'nl_NL'
};
const page = { title: 'Menu & prijzen', description: 'Ons menu, met "prijzen".' };

function tag(head, key) {
	return head.meta.find((m) => m.name === key || m.property === key)?.content;
}

test('the canonical URL is always on the fixed domain, also on a preview', () => {
	const head = seoHead(site, page, 'https://example-git-x.vercel.app/menu?utm=1');
	assert.equal(head.canonical, 'https://www.example.nl/menu');
	assert.equal(tag(head, 'og:url'), 'https://www.example.nl/menu');
});

test('a page may give its own path for the canonical URL', () => {
	const head = seoHead(site, { ...page, path: '/menu-en-prijzen' }, 'https://www.example.nl/x');
	assert.equal(head.canonical, 'https://www.example.nl/menu-en-prijzen');
});

test('the canonical path drops query and fragment, and keeps a trailing slash', () => {
	assert.equal(canonicalPath('/a?b=1#c'), '/a');
	assert.equal(canonicalPath('/blog/'), '/blog/');
	assert.equal(canonicalPath('contact'), '/contact');
	assert.equal(canonicalPath(''), '/');
	assert.equal(canonicalPath(undefined), '/');
	assert.equal(canonicalPath('?x=1'), '/');
});

test('only the fixed domain is indexable; any other host and a noindex page are not', () => {
	assert.equal(isIndexable(site, 'https://www.example.nl/'), true);
	assert.equal(isIndexable(site, 'https://example.nl/'), false);
	assert.equal(isIndexable(site, 'https://example.vercel.app/'), false);
	assert.equal(isIndexable(site, 'http://localhost:5173/'), false);
	assert.equal(isIndexable(site, 'https://www.example.nl/', { noindex: true }), false);
});

test('noindex is written on another host, and not on the fixed domain', () => {
	assert.equal(tag(seoHead(site, page, 'https://example.vercel.app/'), 'robots'), 'noindex');
	assert.equal(tag(seoHead(site, page, 'https://www.example.nl/'), 'robots'), undefined);
	assert.deepEqual(NOINDEX_HEADERS, { 'X-Robots-Tag': 'noindex' });
});

test('the title is the page title in full, with no brand added', () => {
	const head = seoHead(site, page, 'https://www.example.nl/');
	assert.equal(head.title, 'Menu & prijzen');
	assert.equal(tag(head, 'og:title'), 'Menu & prijzen');
	assert.equal(tag(head, 'og:site_name'), 'Example');
});

test('a page without a title is refused', () => {
	assert.throws(() => seoHead(site, { title: '  ', description: 'x' }, 'https://www.example.nl/'));
});

test('the share image is absolute, the page one before the site default', () => {
	const own = seoHead(site, { ...page, image: '/menu.jpg' }, 'https://www.example.nl/');
	assert.equal(tag(own, 'og:image'), 'https://www.example.nl/menu.jpg');
	const fallback = seoHead(site, page, 'https://www.example.nl/');
	assert.equal(tag(fallback, 'og:image'), 'https://www.example.nl/og.png');
	assert.equal(tag(fallback, 'twitter:card'), 'summary_large_image');
	assert.equal(
		absoluteUrl(site, 'https://cdn.example.com/a.jpg'),
		'https://cdn.example.com/a.jpg'
	);
});

test('without any image there is no og:image and a small card', () => {
	const head = seoHead({ url: site.url, name: 'X' }, page, 'https://www.example.nl/');
	assert.equal(tag(head, 'og:image'), undefined);
	assert.equal(tag(head, 'twitter:card'), 'summary');
	assert.equal(tag(head, 'og:locale'), undefined);
});

test('the HTML escapes every value, so a description cannot break out of its attribute', () => {
	const html = headTags(
		site,
		{ title: 'A </title><script>', description: 'x" onload="y & <b>' },
		'https://www.example.nl/'
	);
	assert.match(html, /<title>A &lt;\/title&gt;&lt;script&gt;<\/title>/);
	assert.match(html, /content="x&quot; onload=&quot;y &amp; &lt;b&gt;"/);
	assert.doesNotMatch(html, /<script>/);
	assert.match(html, /<link rel="canonical" href="https:\/\/www\.example\.nl\/">/);
});

test('there is exactly one title, description and canonical URL', () => {
	const html = headTags(site, page, 'https://www.example.nl/');
	assert.equal(html.match(/<title>/g).length, 1);
	assert.equal(html.match(/name="description"/g).length, 1);
	assert.equal(html.match(/rel="canonical"/g).length, 1);
});
