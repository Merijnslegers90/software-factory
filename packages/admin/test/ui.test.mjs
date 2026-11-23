import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, renderComponent, renderPage, textOf } from '../../../tests/svelte-render.mjs';
import {
	FORM_TEXT,
	countLabel,
	fill,
	greeting,
	isCurrent,
	joinNames,
	longDate,
	navGroups,
	proposalsTodo,
	shortDate,
	titleWithCount,
	totalCount,
	withText
} from '../src/ui/text.js';
import { readFileSync } from 'node:fs';

// F-0020: the admin blocks render with their data and without their
// settings, in Dutch unless the product passes its own words. Axe runs on
// the admin pages of the first product, in its e2e tests.

const ui = (name) => `packages/admin/src/ui/${name}.svelte`;

test('the words: defaults, a product’s own words over them, one level deep', () => {
	const t = withText(FORM_TEXT, { save: 'Opslaan', errors: { required: 'Verplicht.' } });
	assert.equal(t.save, 'Opslaan');
	assert.equal(t.errors.required, 'Verplicht.');
	assert.equal(t.errors['too-long'], FORM_TEXT.errors['too-long']);
	assert.equal(withText(FORM_TEXT, { save: undefined }).save, FORM_TEXT.save);
	assert.equal(fill('{a} en {b}', { a: 1 }), '1 en {b}');
	assert.equal(joinNames(['A', 'B', 'C']), 'A, B en C');
	assert.equal(joinNames(['A']), 'A');
	assert.equal(shortDate('2026-11-20T15:30:00Z'), '20 november om 16:30');
	assert.equal(shortDate('kapot'), '');
});

test('the current menu item: /admin only exactly, the rest also below it', () => {
	assert.equal(isCurrent('/admin', '/admin'), true);
	assert.equal(isCurrent('/admin', '/admin/menu'), false);
	assert.equal(isCurrent('/admin/menu', '/admin/menu/kaart'), true);
	assert.equal(isCurrent('/admin/menu', '/admin/menukaart'), false);
});

test('the shell shows the logo, the menu with the current page, the site and logout', async () => {
	page.url = new URL('http://localhost/admin/prijzen');
	const html = await renderComponent(ui('AdminShell'), {
		name: 'Frietwagen Someren',
		logo: '/images/logo.png',
		nav: [
			{ href: '/admin', label: 'Overzicht' },
			{ href: '/admin/prijzen', label: 'Prijzen' }
		],
		message: 'Opslaan staat uit.'
	});
	assert.match(html, /<img src="\/images\/logo.png" alt="Frietwagen Someren"/);
	assert.match(html, /href="\/admin\/prijzen" aria-current="page"/);
	assert.doesNotMatch(html, /href="\/admin" aria-current/);
	assert.match(html, /href="\/admin\/logout" data-sveltekit-reload/);
	assert.match(html, /target="_blank" rel="noopener"/);
	assert.match(textOf(html), /Opslaan staat uit\./);
	// On a phone the menu is a <details>, so it opens without JavaScript.
	assert.match(html, /<details class="fold[^"]*"><summary/);
});

test('the shell takes the product’s words', async () => {
	const html = await renderComponent(ui('AdminShell'), {
		name: 'Site',
		text: { logout: 'Log out', viewSite: 'View site' }
	});
	assert.match(textOf(html), /Site admin/);
	assert.match(textOf(html), /View site/);
	assert.match(textOf(html), /Log out/);
});

test('the overview leaves out what a product does not have', async () => {
	assert.equal(textOf(await renderComponent(ui('AdminOverview'), {})), '');
	const html = await renderComponent(ui('AdminOverview'), {
		facts: [{ label: 'Domein', value: 'www.frietwagensomeren.nl', href: 'https://www.frietwagensomeren.nl' }],
		links: [{ label: 'Vercel', href: 'https://vercel.com', note: 'Hosting en previews' }]
	});
	assert.match(textOf(html), /De site Domein www\.frietwagensomeren\.nl Handig Vercel Hosting en previews/);
});

test('an error message is read out at once, the rest when it is calm', async () => {
	assert.match(await renderComponent(ui('AdminMessage'), { tone: 'error', text: 'Mis' }), /role="alert"/);
	assert.match(await renderComponent(ui('AdminMessage'), { text: 'Info' }), /role="status"/);
});

test('the proposals: open ones with a link, none, or what is missing', async () => {
	const open = await renderComponent(ui('AdminProposals'), {
		data: {
			outcome: 'ok',
			missing: [],
			proposals: [
				{ number: 4, url: 'https://github.com/a/b/pull/4', title: 'Prijzen bijgewerkt', branch: 'admin/prijzen', updatedAt: '2026-11-20T15:30:00Z' }
			]
		}
	});
	assert.match(open, /href="https:\/\/github.com\/a\/b\/pull\/4"/);
	assert.match(textOf(open), /Prijzen bijgewerkt bijgewerkt 20 november om 16:30/);

	const none = await renderComponent(ui('AdminProposals'), { data: { outcome: 'ok', missing: [], proposals: [] } });
	assert.match(textOf(none), /Er staan geen voorstellen open\./);

	const off = await renderComponent(ui('AdminProposals'), {
		data: { outcome: 'no-key', missing: ['ADMIN_GITHUB_TOKEN', 'ADMIN_GITHUB_REPO'], proposals: [] }
	});
	assert.match(textOf(off), /ADMIN_GITHUB_TOKEN en ADMIN_GITHUB_REPO ontbreekt/);
});

const fields = [
	{ key: 'titel', type: 'text', label: 'Titel', required: true },
	{ key: 'open', type: 'toggle', label: 'Te boeken' },
	{
		key: 'regels',
		type: 'list',
		label: 'Prijzen',
		itemLabel: 'Prijsregel',
		titleKey: 'omschrijving',
		fields: [
			{ key: 'omschrijving', type: 'text', label: 'Omschrijving' },
			{ key: 'prijs', type: 'price', label: 'Prijs' }
		]
	}
];

const data = {
	values: { titel: 'Menu', open: true, regels: [{ omschrijving: 'Per persoon', prijs: 12.5 }] },
	proposal: null,
	canSave: true,
	outcome: 'ok',
	mismatchAt: null,
	missing: []
};

test('the form shows every field with its value, prices as people write them', async () => {
	const html = await renderComponent(ui('AdminContentForm'), { data, fields });
	assert.match(html, /<label for="f-titel"[^>]*>Titel<\/label>/);
	assert.match(html, /id="f-titel"[^>]*value="Menu"/);
	assert.match(html, /type="checkbox" id="f-open" checked/);
	assert.match(html, /<legend[^>]*>Prijzen<\/legend>/);
	assert.match(html, /id="f-titel"[^>]*aria-required="true"/);
	assert.match(textOf(html), /Per persoon/);
	assert.match(html, /id="f-regels-0-prijs"[^>]*value="12,50"/);
	assert.match(html, /aria-describedby="f-regels-0-prijs-hint"/);
	assert.match(html, /name="value" value="[^"]*12,50/);
	assert.match(textOf(html), /Voorstel opslaan/);
	assert.doesNotMatch(html, /<fieldset class="fields[^"]*" disabled/);
});

test('the form names each error at its field', async () => {
	const html = await renderComponent(ui('AdminContentForm'), {
		data,
		fields,
		form: { ok: false, errors: { titel: 'required', 'regels.0.prijs': 'not-a-price' } }
	});
	assert.match(textOf(html), /Niet opgeslagen: kijk naar de velden met een melding\./);
	assert.match(html, /aria-describedby="f-titel-error" aria-invalid="true"/);
	assert.match(html, /<p class="error[^"]*" id="f-regels-0-prijs-error">Dit is geen prijs\. Schrijf bijvoorbeeld 4,50\.<\/p>/);
});

test('the form after a save, with an open proposal, and without its settings', async () => {
	const saved = await renderComponent(ui('AdminContentForm'), {
		data,
		fields,
		form: { ok: true, changed: true, proposal: { number: 2, url: 'https://github.com/a/b/pull/2' } }
	});
	assert.match(textOf(saved), /Opgeslagen\. Je voorstel staat klaar om te mergen\./);

	const open = await renderComponent(ui('AdminContentForm'), {
		data: { ...data, proposal: { number: 2, url: 'https://github.com/a/b/pull/2' } },
		fields
	});
	assert.match(textOf(open), /Er staat al een voorstel open/);

	const off = await renderComponent(ui('AdminContentForm'), {
		data: { ...data, canSave: false, outcome: 'no-key', missing: ['ADMIN_GITHUB_TOKEN'] },
		fields
	});
	assert.match(textOf(off), /Opslaan staat uit: ADMIN_GITHUB_TOKEN ontbreekt\./);
	assert.match(off, /<fieldset class="fields[^"]*" disabled/);

	const mismatch = await renderComponent(ui('AdminContentForm'), {
		data: { ...data, values: null, canSave: false, outcome: 'mismatch', mismatchAt: 'regels.2.prijs' },
		fields
	});
	assert.match(textOf(mismatch), /past niet meer bij dit formulier \(regels\.2\.prijs\)/);
});

test('a theme becomes CSS variables, light and dark, and refuses what could break out', async () => {
	const { themeStyle, schemeClass } = await import('../src/ui/theme.js');
	assert.equal(
		themeStyle({ accent: '#f2b705', headingFont: "'Oswald', sans-serif", dark: { bg: '#000' } }),
		"--admin-accent: #f2b705; --admin-heading-font: 'Oswald', sans-serif; --admin-dark-bg: #000"
	);
	assert.equal(themeStyle({ accent: '', text: null }), '');
	assert.equal(themeStyle(), '');
	assert.throws(() => themeStyle({ colour: 'red' }), /unknown key colour/);
	assert.throws(() => themeStyle({ accent: 'red; } body { display: none' }), /not allowed/);
	assert.throws(() => themeStyle({ font: 'x</style>' }), /not allowed/);
	assert.equal(schemeClass({ scheme: 'dark' }), 'dark');
	assert.equal(schemeClass({}), 'auto');
});

test('the shell carries the theme, and the site link can go', async () => {
	const html = await renderComponent(ui('AdminShell'), {
		name: 'Frietwagen Someren',
		theme: { accent: '#f2b705', onAccent: '#000', bg: '#000', text: '#fff', scheme: 'dark' },
		showSiteLink: false
	});
	assert.match(html, /class="ms-admin dark[^"]*" style="--admin-accent: #f2b705; --admin-on-accent: #000; --admin-bg: #000; --admin-text: #fff"/);
	assert.doesNotMatch(textOf(html), /Bekijk site/);
	assert.match(textOf(html), /Uitloggen/);
});

test('a fixed list can be changed but not grown, shrunk or moved', async () => {
	const { checkFields, fixedListsKept } = await import('../src/content-form.js');
	const list = checkFields([
		{ key: 'kaarten', type: 'list', label: 'K', fixed: true, fields: [
			{ key: 'naam', type: 'text', label: 'N' },
			{ key: 'regels', type: 'list', label: 'R', fields: [{ key: 'p', type: 'price', label: 'P' }] }
		] }
	]);
	const before = { kaarten: [{ naam: 'A', regels: [] }, { naam: 'B', regels: [] }] };
	assert.equal(fixedListsKept(list, before, { kaarten: [{ naam: 'X', regels: [{ p: 1 }] }, { naam: 'B', regels: [] }] }), true);
	assert.equal(fixedListsKept(list, before, { kaarten: [{ naam: 'A', regels: [] }] }), false);
	assert.throws(() => checkFields([{ key: 't', type: 'text', label: 'T', fixed: true }]), /only a list/);
	const html = await renderComponent(ui('AdminContentForm'), {
		data: { values: before, proposal: null, canSave: true, outcome: 'ok', mismatchAt: null, missing: [] },
		fields: list
	});
	assert.doesNotMatch(html, /id="f-kaarten-add"/);
	assert.doesNotMatch(html, /id="f-kaarten-remove-0"/);
	assert.match(html, /id="f-kaarten-0-regels-add"/);
});

test('the types name every prop the blocks take, so a product can pass it', async () => {
	const { propsOf, typedPropsOf } = await import('../../../tests/svelte-types.mjs');
	const blocks = {
		'packages/admin/src/ui/index.d.ts': ['AdminShell', 'AdminOverview', 'AdminMessage', 'AdminCard', 'AdminField', 'AdminTodo'],
		'packages/admin/src/ui/github.d.ts': ['AdminProposals', 'AdminContentForm', 'AdminContent']
	};
	for (const [dts, names] of Object.entries(blocks)) {
		for (const name of names) {
			const typed = typedPropsOf(dts, name);
			assert.ok(typed, `${name} is not in ${dts}`);
			assert.ok(propsOf(ui(name)).length > 0, `${name}: no props found to compare`);
			assert.deepEqual(
				propsOf(ui(name)).filter((prop) => !typed.includes(prop)),
				[],
				`${name}: props missing from ${dts}`
			);
		}
	}
});

test('the theme types name the same keys as the theme itself', async () => {
	const { readFileSync } = await import('node:fs');
	const { THEME_KEYS } = await import('../src/ui/theme.js');
	const dts = readFileSync('packages/admin/src/ui/index.d.ts', 'utf8');
	const body = dts.slice(dts.indexOf('interface AdminThemeValues {'), dts.indexOf('interface AdminTheme '));
	const typed = [...body.matchAll(/^\s*(\w+)\?:/gm)].map((m) => m[1]);
	assert.deepEqual(typed.sort(), Object.keys(THEME_KEYS).sort());
});

test('the Content page shows a tab per section, the active one marked, and its form', async () => {
	const content = {
		sections: [
			{ key: 'menu', label: 'Menu', href: '/admin/content/menu', proposal: false },
			{ key: 'contact', label: 'Contactgegevens', href: '/admin/content/contact', proposal: true }
		],
		active: 'menu',
		fields,
		form: data
	};
	const html = await renderComponent(ui('AdminContent'), { data: { content } });
	assert.match(html, /<nav class="tabs[^"]*" aria-label="Onderdelen">/);
	assert.match(html, /<a href="\/admin\/content\/menu" aria-current="page"[^>]*>/);
	assert.doesNotMatch(html, /href="\/admin\/content\/contact" aria-current/);
	assert.match(textOf(html), /Contactgegevens\s*voorstel open/);
	assert.match(html, /id="f-titel"[^>]*value="Menu"/);

	const own = await renderComponent(ui('AdminContent'), {
		data: { content },
		text: { sections: 'Delen', proposal: 'wacht op Merijn' }
	});
	assert.match(own, /aria-label="Delen"/);
	assert.match(textOf(own), /wacht op Merijn/);
});

test('a Content page with one section has no tabs, just the form', async () => {
	const html = await renderComponent(ui('AdminContent'), {
		data: {
			content: {
				sections: [{ key: 'menu', label: 'Menu', href: '/admin/content/menu', proposal: false }],
				active: 'menu',
				fields,
				form: data
			}
		}
	});
	assert.doesNotMatch(html, /class="tabs/);
	assert.match(html, /id="f-titel"/);
});

test('the shell gives headings a size of their own, so a reset in the product does not flatten them', () => {
	const source = readFileSync(ui('AdminShell'), 'utf8');
	assert.match(source, /:where\(h1\)\)\s*\{[^}]*font-size: 1\.75rem/);
	assert.match(source, /:where\(h2\)\)\s*\{[^}]*font-size: 1\.25rem/);
});

test('the menu takes groups, and a flat list is one group without a title', () => {
	const flat = [{ href: '/admin', label: 'Overzicht' }];
	assert.deepEqual(navGroups(flat), [{ title: undefined, items: flat }]);
	const groups = [{ title: 'Site', items: flat }];
	assert.equal(navGroups(groups), groups);
	assert.deepEqual(navGroups([]), []);
});

test('a count shows above 0, as 99+ above 99, and adds up for the tab title', () => {
	assert.equal(countLabel(0), '');
	assert.equal(countLabel(-2), '');
	assert.equal(countLabel('3'), '');
	assert.equal(countLabel(Number.NaN), '');
	assert.equal(countLabel(2), '2');
	assert.equal(countLabel(120), '99+');
	const groups = [
		{ title: 'A', items: [{ href: '/a', label: 'A', count: 2 }, { href: '/b', label: 'B', count: 0 }] },
		{ title: 'B', items: [{ href: '/c', label: 'C', count: 3 }, { href: '/d', label: 'D' }] }
	];
	assert.equal(totalCount(groups), 5);
	assert.equal(titleWithCount('Admin Frietwagen Someren', 5), '(5) Admin Frietwagen Someren');
	assert.equal(titleWithCount('Admin Frietwagen Someren', 0), 'Admin Frietwagen Someren');
});

test('the shell shows groups, badges with words for screen readers, who is logged in, and the total in the title', async () => {
	page.url = new URL('http://localhost/admin/content');
	const { head, body } = await renderPage(ui('AdminShell'), {
		name: 'Frietwagen Someren',
		user: 'gerard',
		nav: [
			{ title: 'Site', items: [{ href: '/admin/content', label: 'Content', count: 2 }] },
			{ title: 'Inzicht', items: [{ href: '/admin/bezoekers', label: 'Bezoekers', count: 0 }] }
		]
	});
	assert.match(head, /<title>\(2\) Admin Frietwagen Someren<\/title>/);
	assert.match(body, /<p class="group-title[^"]*">Site<\/p>/);
	assert.match(body, /<p class="group-title[^"]*">Inzicht<\/p>/);
	assert.match(textOf(body), /Content 2 openstaand/);
	assert.doesNotMatch(textOf(body), /Bezoekers 0/);
	// The total on the phone's menu button.
	assert.match(textOf(body), /Menu 2 openstaand/);
	assert.match(textOf(body), /Ingelogd als gerard/);

	const plain = await renderPage(ui('AdminShell'), { name: 'Site', title: 'Beheer' });
	assert.match(plain.head, /<title>Beheer<\/title>/);
	assert.doesNotMatch(plain.body, /group-title/);
});

test('the greeting follows the time of day in the product’s time zone', () => {
	// 23 November 2026: 08:00, 13:00 and 20:00 in Amsterdam (UTC+1).
	assert.equal(greeting(new Date('2026-11-23T07:00:00Z')), 'Goedemorgen');
	assert.equal(greeting(new Date('2026-11-23T12:00:00Z')), 'Goedemiddag');
	assert.equal(greeting(new Date('2026-11-23T19:00:00Z')), 'Goedenavond');
	assert.equal(greeting(new Date('2026-11-23T03:00:00Z')), 'Goedenavond');
	// 23:30 UTC is already the next day in Amsterdam.
	assert.equal(longDate(new Date('2026-11-23T23:30:00Z')), 'dinsdag 24 november');
});

test('the overview head shows the date and a greeting with the name, only when asked', async () => {
	const html = await renderComponent(ui('AdminOverview'), {
		greet: true,
		name: 'Gerard',
		now: new Date('2026-11-23T12:00:00Z')
	});
	assert.match(textOf(html), /maandag 23 november Goedemiddag, Gerard/);
	assert.match(html, /<h1[^>]*>Goedemiddag, Gerard<\/h1>/);
	assert.doesNotMatch(await renderComponent(ui('AdminOverview'), {}), /<h1/);
});

test('the to-do block lists what waits with a count, and says so when nothing does', async () => {
	const html = await renderComponent(ui('AdminTodo'), {
		items: [{ count: 2, text: 'voorstellen wachten op een merge', href: 'https://github.com/a/b/pulls' }]
	});
	assert.match(textOf(html), /Te doen 2 voorstellen wachten op een merge/);
	assert.match(html, /href="https:\/\/github.com\/a\/b\/pulls"/);
	assert.match(textOf(await renderComponent(ui('AdminTodo'), {})), /Te doen Er wacht niets\./);
});

test('the open proposals become one to-do line, or none', () => {
	const proposal = (number) => ({ number, title: 'x', url: `https://github.com/a/b/pull/${number}`, updatedAt: '' });
	assert.deepEqual(proposalsTodo({ outcome: 'ok', proposals: [], missing: [] }), []);
	assert.deepEqual(proposalsTodo({ outcome: 'no-key', proposals: [], missing: ['X'] }), []);
	assert.deepEqual(proposalsTodo({ outcome: 'ok', proposals: [proposal(5)], missing: [] }), [
		{ count: 1, text: 'voorstel wacht op een merge', href: 'https://github.com/a/b/pull/5' }
	]);
	assert.deepEqual(proposalsTodo({ outcome: 'ok', proposals: [proposal(5), proposal(6)], missing: [] }), [
		{ count: 2, text: 'voorstellen wachten op een merge', href: 'https://github.com/a/b/pulls' }
	]);
});
