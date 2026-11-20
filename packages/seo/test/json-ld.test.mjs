import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compact, jsonLd, localBusiness, person, website } from '../src/json-ld.js';

// Built from parts, so the check on personal data in tests/public.test.mjs
// does not take them for real ones.
const mail = (name) => [name, 'example.nl'].join('@');
const phone = (n) => `06 ${String(n).repeat(8)}`;

const site = { url: 'https://www.example.nl', name: 'Frietwagen Example', image: '/og.png' };

function parse(tag) {
	const m = /^<script type="application\/ld\+json">(.*)<\/script>$/s.exec(tag);
	assert.ok(m, 'a complete script tag');
	return JSON.parse(m[1]);
}

test('jsonLd escapes <, so text in the data can never close the tag', () => {
	const tag = jsonLd({ '@type': 'Thing', name: '</script><script>alert(1)</script>' });
	assert.equal(tag.match(/<\/script>/g).length, 1);
	assert.equal(parse(tag).name, '</script><script>alert(1)</script>');
	assert.equal(parse(tag)['@context'], 'https://schema.org');
});

test('several nodes become one @graph', () => {
	const data = parse(jsonLd(website(site), localBusiness(site, {})));
	assert.equal(data['@graph'].length, 2);
	assert.deepEqual(
		data['@graph'].map((n) => n['@type']),
		['WebSite', 'LocalBusiness']
	);
});

test('a local business with its details, everything absolute', () => {
	const node = localBusiness(site, {
		type: 'FoodEstablishment',
		telephone: [phone(1), phone(2)],
		email: mail('info'),
		logo: '/images/logo.png',
		areaServed: ['Someren', 'Asten'],
		founders: ['Gerard', 'Jeroen'],
		foundingDate: '2006',
		sameAs: ['https://www.instagram.com/example/']
	});
	assert.equal(node['@type'], 'FoodEstablishment');
	assert.equal(node['@id'], 'https://www.example.nl/#business');
	assert.equal(node.name, 'Frietwagen Example');
	assert.equal(node.url, 'https://www.example.nl/');
	assert.equal(node.image, 'https://www.example.nl/og.png');
	assert.equal(node.logo, 'https://www.example.nl/images/logo.png');
	assert.deepEqual(node.areaServed, [
		{ '@type': 'Place', name: 'Someren' },
		{ '@type': 'Place', name: 'Asten' }
	]);
	assert.deepEqual(node.founder[1], { '@type': 'Person', name: 'Jeroen' });
});

test('empty details are left out, never written as an empty string', () => {
	const node = localBusiness({ url: site.url, name: 'X' }, {
		description: '',
		telephone: undefined,
		address: { street: '', locality: '' },
		areaServed: [],
		sameAs: []
	});
	assert.deepEqual(Object.keys(node).sort(), ['@id', '@type', 'name', 'url']);
});

test('an address with some parts keeps only those', () => {
	const node = localBusiness(site, { address: { locality: 'Someren', country: 'NL' } });
	assert.deepEqual(node.address, {
		'@type': 'PostalAddress',
		addressLocality: 'Someren',
		addressCountry: 'NL'
	});
});

test('a person, with mailto and an id for the business they work for', () => {
	const node = person(site, {
		name: 'Jeanne',
		jobTitle: 'Remedial teacher',
		email: mail('j'),
		image: '/foto.jpg',
		worksFor: 'https://www.example.nl/#business'
	});
	assert.equal(node['@id'], 'https://www.example.nl/#person');
	assert.equal(node.email, `mailto:${mail('j')}`);
	assert.equal(node.image, 'https://www.example.nl/foto.jpg');
	assert.deepEqual(node.worksFor, { '@id': 'https://www.example.nl/#business' });
	assert.equal(node.knowsAbout, undefined);
});

test('the website names its publisher by id', () => {
	const node = website(site, { inLanguage: 'nl', publisher: 'https://www.example.nl/#business' });
	assert.deepEqual(node, {
		'@type': 'WebSite',
		'@id': 'https://www.example.nl/#website',
		name: 'Frietwagen Example',
		url: 'https://www.example.nl/',
		inLanguage: 'nl',
		publisher: { '@id': 'https://www.example.nl/#business' }
	});
});

test('compact keeps false and 0, and drops what is empty', () => {
	assert.deepEqual(compact({ a: 0, b: false, c: '', d: [null], e: { '@type': 'X' } }), {
		a: 0,
		b: false
	});
});
