import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	checkFields,
	checkValues,
	emptyItem,
	fileContent,
	formatPrice,
	isLink,
	mergeIntoFile,
	parsePrice,
	valuesFromFile
} from '../src/content-form.js';
import { contentFormAction, loadContentForm, saveContentForm } from '../src/content-form-server.js';
import { createContentRepo } from '../src/github.js';
import { fakeGitHub } from './fake-github.mjs';

// F-0020: the form block reads a JSON file into fields, checks what was
// entered, and saves it as a proposal (F-0018).

const fields = checkFields([
	{ key: 'titel', type: 'text', label: 'Titel', required: true, maxLength: 40 },
	{ key: 'intro', type: 'longtext', label: 'Intro' },
	{ key: 'zichtbaar', type: 'toggle', label: 'Zichtbaar' },
	{ key: 'link', type: 'link', label: 'Link' },
	{
		key: 'kaarten',
		type: 'list',
		label: 'Kaarten',
		max: 3,
		fields: [
			{ key: 'naam', type: 'text', label: 'Naam', required: true },
			{
				key: 'prijzen',
				type: 'list',
				label: 'Prijzen',
				fields: [
					{ key: 'omschrijving', type: 'text', label: 'Omschrijving', required: true },
					{ key: 'prijs', type: 'price', label: 'Prijs', required: true }
				]
			}
		]
	}
]);

const file = {
	titel: 'Menu',
	intro: 'Lekker',
	zichtbaar: true,
	link: '/contact',
	kaarten: [{ naam: 'Basis', prijzen: [{ omschrijving: 'Per persoon', prijs: 12.5 }] }],
	anders: 'blijft'
};

test('a wrong field list throws while building', () => {
	assert.throws(() => checkFields([]), /list of fields/);
	assert.throws(() => checkFields([{ key: 'a', type: 'colour', label: 'A' }]), /unknown type/);
	assert.throws(() => checkFields([{ key: 'a', type: 'text' }]), /no label/);
	assert.throws(
		() =>
			checkFields([
				{ key: 'a', type: 'text', label: 'A' },
				{ key: 'a', type: 'text', label: 'B' }
			]),
		/twice/
	);
	assert.throws(() => checkFields([{ key: 'l', type: 'list', label: 'L', fields: [] }]), /fields\.l/);
});

test('prices are read the way people type them', () => {
	for (const [input, want] of [
		['4,50', 4.5],
		['4.5', 4.5],
		['€ 12,-', 12],
		[' 3 ', 3],
		[7, 7],
		['0', 0]
	]) {
		assert.equal(parsePrice(input), want, String(input));
	}
	for (const bad of ['', 'gratis', '-1', '4,555', '1.000,00', '4 50', -2, NaN, null]) {
		assert.equal(parsePrice(bad), null, String(bad));
	}
	assert.equal(formatPrice(4.5), '4,50');
	assert.equal(formatPrice(null), '');
});

test('links are paths, anchors or http, mailto and tel addresses', () => {
	for (const ok of ['/contact', '#menu', 'https://x.nl/a', 'mailto:a@b', 'tel:+31 6 1234']) {
		assert.equal(isLink(ok), true, ok);
	}
	for (const bad of ['', 'contact', '//evil.com', '/\\evil.com', '/\t/evil.com', '/a b', 'javascript:alert(1)', 'http://', 'ftp://x']) {
		assert.equal(isLink(bad), false, bad);
	}
});

test('the file becomes values, and a missing key an empty value', () => {
	const read = valuesFromFile(fields, { titel: 'X' });
	assert.equal(read.ok, true);
	assert.deepEqual(read.values, { titel: 'X', intro: '', zichtbaar: false, link: '', kaarten: [] });
	assert.deepEqual(valuesFromFile(fields, file).values.kaarten[0].prijzen[0].prijs, 12.5);
	assert.deepEqual(emptyItem(fields[4]), { naam: '', prijzen: [] });
});

test('a file that no longer matches says where', () => {
	assert.deepEqual(
		valuesFromFile(fields, { ...file, kaarten: [{ naam: 'B', prijzen: [{ prijs: '12' }] }] }),
		{ ok: false, problem: 'mismatch', at: 'kaarten.0.prijzen.0.prijs' }
	);
	assert.equal(valuesFromFile(fields, []).ok, false);
	// A key inside a list item that the fields do not name would be lost on saving.
	assert.deepEqual(
		valuesFromFile(fields, { ...file, kaarten: [{ naam: 'B', prijzen: [], foto: '/x.jpg' }] }),
		{ ok: false, problem: 'mismatch', at: 'kaarten.0.foto' }
	);
	assert.equal(valuesFromFile(fields, { zichtbaar: 'ja' }).at, 'zichtbaar');
});

test('entered values are cleaned: text trimmed, prices as numbers, toggles as booleans', () => {
	const checked = checkValues(fields, {
		titel: '  Menu ',
		intro: 'a\r\nb ',
		zichtbaar: 'on',
		link: ' https://x.nl ',
		kaarten: [{ naam: 'Basis', prijzen: [{ omschrijving: 'Kind', prijs: '6,50' }] }]
	});
	assert.deepEqual(checked, {
		ok: true,
		values: {
			titel: 'Menu',
			intro: 'a\nb',
			zichtbaar: true,
			link: 'https://x.nl',
			kaarten: [{ naam: 'Basis', prijzen: [{ omschrijving: 'Kind', prijs: 6.5 }] }]
		}
	});
});

test('every error is named by its field path', () => {
	const checked = checkValues(fields, {
		titel: '',
		intro: 3,
		link: 'javascript:x',
		kaarten: [
			{ naam: 'A', prijzen: [{ omschrijving: 'x', prijs: 'veel' }] },
			{ naam: '', prijzen: 'geen lijst' },
			{ naam: 'C', prijzen: [] },
			{ naam: 'D', prijzen: [] }
		]
	});
	assert.deepEqual(checked, {
		ok: false,
		errors: {
			titel: 'required',
			intro: 'not-text',
			link: 'not-a-link',
			kaarten: 'too-many',
			'kaarten.0.prijzen.0.prijs': 'not-a-price',
			'kaarten.1.naam': 'required',
			'kaarten.1.prijzen': 'not-a-list'
		}
	});
	assert.deepEqual(checkValues(fields, '{kapot'), { ok: false, errors: { '': 'not-readable' } });
	for (const notAnObject of [null, undefined, [], 'null', '[]', 3]) {
		assert.deepEqual(checkValues(fields, notAnObject), { ok: false, errors: { '': 'not-readable' } });
	}
	assert.equal(checkValues(fields, { titel: 'x'.repeat(41), kaarten: [] }).errors.titel, 'too-long');
});

test('saving keeps the keys the form does not know, and writes tabs and a new line', () => {
	const merged = mergeIntoFile(file, fields, { ...valuesFromFile(fields, file).values, titel: 'Nieuw' });
	assert.equal(merged.anders, 'blijft');
	assert.equal(merged.titel, 'Nieuw');
	assert.equal(fileContent({ a: 1 }), '{\n\t"a": 1\n}\n');
});

const path = 'src/lib/content/menu.json';

function repoFor(github, extra = {}) {
	return createContentRepo({
		token: 'github_pat_test',
		repo: 'acme/site',
		allowedPaths: [path],
		fetch: github.fetch,
		...extra
	});
}

test('without the GitHub settings the form shows the built file and cannot save (F-0005)', async () => {
	const repo = createContentRepo({ token: '', repo: '', allowedPaths: [path] });
	const data = await loadContentForm(repo, { path, key: 'menu', fields, current: file });
	assert.equal(data.canSave, false);
	assert.equal(data.outcome, 'no-key');
	assert.equal(data.values.titel, 'Menu');
	assert.deepEqual(data.missing, ['ADMIN_GITHUB_TOKEN', 'ADMIN_GITHUB_REPO']);
	const saved = await saveContentForm(repo, { path, key: 'menu', title: 'x', fields, value: file });
	assert.deepEqual(saved, { ok: false, outcome: 'no-key' });
});

test('saving opens a proposal, and the next load starts from it', async () => {
	const github = fakeGitHub({ files: { [path]: fileContent(file) } });
	const repo = repoFor(github);
	const first = await loadContentForm(repo, { path, key: 'menu', fields });
	assert.equal(first.canSave, true);
	assert.equal(first.proposal, null);

	const values = { ...first.values, titel: 'Menu 2027' };
	const saved = await saveContentForm(repo, {
		path,
		key: 'menu',
		title: 'Menu bijgewerkt',
		fields,
		value: JSON.stringify(values),
		changedBy: 'gerard'
	});
	assert.equal(saved.ok, true);
	assert.equal(saved.proposal.branch, 'admin/menu');
	const written = JSON.parse(github.filesOn('admin/menu')[path]);
	assert.equal(written.titel, 'Menu 2027');
	assert.equal(written.anders, 'blijft');
	assert.equal(JSON.parse(github.filesOn('main')[path]).titel, 'Menu');

	const next = await loadContentForm(repo, { path, key: 'menu', fields });
	assert.equal(next.values.titel, 'Menu 2027');
	assert.equal(next.proposal.number, saved.proposal.number);
});

test('wrong input never reaches GitHub', async () => {
	const github = fakeGitHub({ files: { [path]: fileContent(file) } });
	const before = github.calls.length;
	const saved = await saveContentForm(repoFor(github), {
		path,
		key: 'menu',
		title: 'x',
		fields,
		value: { titel: '', kaarten: [] }
	});
	assert.deepEqual(saved, { ok: false, errors: { titel: 'required' } });
	assert.equal(github.calls.length, before);
});

test('a file in the repo that no longer matches is refused, not overwritten', async () => {
	const broken = { ...file, zichtbaar: 'ja' };
	const github = fakeGitHub({ files: { [path]: fileContent(broken) } });
	const repo = repoFor(github);
	const data = await loadContentForm(repo, { path, key: 'menu', fields });
	assert.equal(data.canSave, false);
	assert.equal(data.outcome, 'mismatch');
	assert.equal(data.mismatchAt, 'zichtbaar');
	const saved = await saveContentForm(repo, { path, key: 'menu', title: 'x', fields, value: file });
	assert.deepEqual(saved, { ok: false, outcome: 'mismatch' });
	assert.equal(github.pulls.length, 0);
});

test('the action returns a fail with the errors', async () => {
	const github = fakeGitHub({ files: { [path]: fileContent(file) } });
	const action = contentFormAction(repoFor(github), {
		path,
		key: 'menu',
		title: 'x',
		fields,
		changedBy: (event) => event.locals.admin?.email
	});
	const form = new FormData();
	form.set('value', JSON.stringify({ titel: '', kaarten: [] }));
	let result;
	try {
		result = await action({ request: new Request('http://x', { method: 'POST', body: form }), locals: {} });
	} catch (e) {
		// Without @sveltejs/kit installed in the factory, the import of fail fails.
		assert.match(String(e), /@sveltejs\/kit/);
		return;
	}
	assert.equal(result.status, 400);
	assert.deepEqual(result.data.errors, { titel: 'required' });
});
