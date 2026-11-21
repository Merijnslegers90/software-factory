import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, renderComponent, textOf } from '../../../tests/svelte-render.mjs';
import { FORM_TEXT, fill, isCurrent, joinNames, shortDate, withText } from '../src/ui/text.js';

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
	assert.match(html, /aria-expanded="false"/);
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
		'packages/admin/src/ui/index.d.ts': ['AdminShell', 'AdminOverview', 'AdminMessage', 'AdminCard', 'AdminField'],
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
