import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContentRepo } from '../src/github.js';
import {
	branchName,
	commitMessage,
	decodeContent,
	filesProblem,
	MAX_FILE_BYTES,
	mayWrite,
	missingGitHubSettings,
	outcomeFromStatus,
	parseRepo
} from '../src/github-rules.js';
import { fakeGitHub } from './fake-github.mjs';

// F-0018: the admin changes content through a pull request, and never merges.

const allowed = ['src/content/notes/', 'src/lib/content/site.json'];
const names = { token: 'ADMIN_GITHUB_TOKEN', repo: 'ADMIN_GITHUB_REPO' };

function repoWith(github, extra = {}) {
	return createContentRepo({
		token: 'github_pat_test',
		repo: 'acme/site',
		allowedPaths: allowed,
		fetch: github.fetch,
		...extra
	});
}

test('parseRepo takes owner/name only', () => {
	assert.deepEqual(parseRepo(' acme/site.nl '), { owner: 'acme', name: 'site.nl', full: 'acme/site.nl' });
	for (const bad of ['', 'acme', 'acme/', '/site', 'acme/site/x', 'acme/..', 'ac me/site', null]) {
		assert.equal(parseRepo(bad), null, String(bad));
	}
});

test('missingGitHubSettings names the token and a repo with the wrong shape (F-0005)', () => {
	assert.deepEqual(missingGitHubSettings({ token: '', repo: '' }, names), [
		'ADMIN_GITHUB_TOKEN',
		'ADMIN_GITHUB_REPO'
	]);
	assert.deepEqual(missingGitHubSettings({ token: 't', repo: 'https://github.com/acme/site' }, names), [
		'ADMIN_GITHUB_REPO'
	]);
	assert.deepEqual(missingGitHubSettings({ token: 't', repo: 'acme/site' }, names), []);
});

test('mayWrite allows only paths inside allowedPaths, and never a way out', () => {
	assert.equal(mayWrite('src/content/notes/first.md', allowed), true);
	assert.equal(mayWrite('src/content/notes/2026/first.md', allowed), true);
	assert.equal(mayWrite('src/lib/content/site.json', allowed), true);
	for (const bad of [
		'src/content/notes/',
		'src/content/notes',
		'src/content/notes2/x.md',
		'src/lib/content/site.json.bak',
		'src/content/notes/../../hooks.server.ts',
		'src/content/notes/./x.md',
		'src/content/notes//x.md',
		'/src/content/notes/x.md',
		'src\\content\\notes\\x.md',
		'src/content/notes/x\n.md',
		'.github/workflows/x.yml',
		''
	]) {
		assert.equal(mayWrite(bad, allowed), false, JSON.stringify(bad));
	}
	assert.equal(mayWrite('src/content/notes/x.md', []), false);
});

test('branchName makes a safe admin branch from a key', () => {
	assert.equal(branchName('note/Één Café!'), 'admin/note/een-cafe');
	assert.equal(branchName('site'), 'admin/site');
	assert.equal(branchName('  ../..//x  '), 'admin/x');
	assert.equal(branchName('a'.repeat(200)).length, 'admin/'.length + 80);
	assert.equal(branchName('!!!'), null);
	assert.equal(branchName(''), null);
});

test('filesProblem refuses what the admin may not write', () => {
	assert.equal(filesProblem([{ path: 'src/content/notes/a.md', content: 'x' }], allowed), null);
	assert.equal(filesProblem([{ path: 'src/content/notes/a.md', content: null }], allowed), null);
	assert.equal(filesProblem([], allowed), 'not-allowed');
	assert.equal(filesProblem(undefined, allowed), 'not-allowed');
	assert.equal(filesProblem([{ path: 'package.json', content: '{}' }], allowed), 'not-allowed');
	assert.equal(filesProblem([{ path: 'src/content/notes/a.md', content: 5 }], allowed), 'not-allowed');
	assert.equal(
		filesProblem([{ path: 'src/content/notes/a.md', content: 'x'.repeat(MAX_FILE_BYTES + 1) }], allowed),
		'not-allowed'
	);
	assert.equal(
		filesProblem(
			[
				{ path: 'src/content/notes/a.md', content: 'x' },
				{ path: 'src/content/notes/a.md', content: 'y' }
			],
			allowed
		),
		'not-allowed'
	);
});

test('commitMessage puts who changed it in a trailer', () => {
	assert.equal(commitMessage({ title: ' New  note\n' }), 'New note');
	assert.equal(commitMessage({ title: 'New note', changedBy: 'ann\nX: y' }), 'New note\n\nChanged-by: annX: y');
	assert.equal(commitMessage({}), 'Change from the admin');
});

test('outcomeFromStatus turns GitHub answers into outcome codes', () => {
	assert.equal(outcomeFromStatus(401), 'key-refused');
	assert.equal(outcomeFromStatus(403, '4999'), 'key-refused');
	assert.equal(outcomeFromStatus(403, '0'), 'unavailable');
	assert.equal(outcomeFromStatus(404), 'key-refused');
	assert.equal(outcomeFromStatus(409), 'conflict');
	assert.equal(outcomeFromStatus(422), 'conflict');
	assert.equal(outcomeFromStatus(429), 'unavailable');
	assert.equal(outcomeFromStatus(502), 'unavailable');
});

test('decodeContent reads UTF-8 base64 with new lines, as GitHub sends it', () => {
	const text = 'Café\n'.repeat(30);
	const base64 = Buffer.from(text).toString('base64').replace(/(.{60})/g, '$1\n');
	assert.equal(decodeContent(base64), text);
});

test('without the settings the module is off and sends nothing (F-0005)', async () => {
	const github = fakeGitHub();
	const repo = createContentRepo({ token: '', repo: '', allowedPaths: allowed, fetch: github.fetch });
	assert.equal(repo.enabled, false);
	assert.deepEqual(repo.missingSettings(), ['ADMIN_GITHUB_TOKEN', 'ADMIN_GITHUB_REPO']);
	assert.deepEqual(await repo.readFile('src/lib/content/site.json'), { outcome: 'no-key' });
	assert.deepEqual(await repo.propose({ key: 'site', title: 'x', files: [] }), { outcome: 'no-key' });
	assert.deepEqual(await repo.openProposals(), { outcome: 'no-key' });
	assert.equal(github.calls.length, 0);
});

test('readFile and listFiles read the base branch', async () => {
	const github = fakeGitHub({
		files: { 'src/lib/content/site.json': '{"name":"Ann"}', 'src/content/notes/a.md': 'é' }
	});
	const repo = repoWith(github);
	const file = await repo.readFile('src/lib/content/site.json');
	assert.equal(file.outcome, 'ok');
	assert.equal(file.content, '{"name":"Ann"}');
	assert.deepEqual(await repo.readFile('nope.json'), { outcome: 'not-found' });
	const list = await repo.listFiles('src/content/notes/');
	assert.deepEqual(list.files.map((f) => [f.name, f.type]), [['a.md', 'file']]);
	assert.deepEqual(await repo.listFiles('src/content/empty'), { outcome: 'ok', files: [] });
	assert.equal(github.calls[0].headers.Authorization, 'Bearer github_pat_test');
	assert.match(github.calls[0].search, /ref=main/);
});

test('propose writes one commit on admin/<key> and opens a pull request; main is untouched', async () => {
	const github = fakeGitHub({ files: { 'src/lib/content/site.json': '{}', 'README.md': 'hi' } });
	const repo = repoWith(github);
	const result = await repo.propose({
		key: 'note/first',
		title: 'Note: first',
		body: 'From the admin.',
		changedBy: 'ann',
		files: [
			{ path: 'src/content/notes/first.md', content: '# First\n' },
			{ path: 'src/lib/content/site.json', content: '{"name":"Ann"}' }
		]
	});
	assert.equal(result.outcome, 'ok');
	assert.equal(result.changed, true);
	assert.deepEqual(result.proposal, {
		number: 1,
		url: 'https://github.com/acme/site/pull/1',
		title: 'Note: first',
		branch: 'admin/note/first',
		updatedAt: '2026-11-17T20:00:00Z'
	});
	assert.deepEqual(github.filesOn('admin/note/first'), {
		'src/lib/content/site.json': '{"name":"Ann"}',
		'README.md': 'hi',
		'src/content/notes/first.md': '# First\n'
	});
	assert.equal(github.commitOn('admin/note/first').message, 'Note: first\n\nChanged-by: ann');
	assert.deepEqual(github.filesOn('main'), { 'src/lib/content/site.json': '{}', 'README.md': 'hi' });
	assert.equal(github.pulls[0].base.ref, 'main');
	assert.equal(github.pulls[0].body, 'From the admin.');
	// Never a merge.
	assert.equal(github.calls.some((c) => c.path.includes('merge')), false);
});

test('a second save of the same key adds a commit to the same pull request', async () => {
	const github = fakeGitHub();
	const repo = repoWith(github);
	const file = (content) => [{ path: 'src/content/notes/a.md', content }];
	await repo.propose({ key: 'note/a', title: 'A', files: file('one') });
	const second = await repo.propose({ key: 'note/a', title: 'A again', files: file('two') });
	assert.equal(second.proposal.number, 1);
	assert.equal(github.pulls.length, 1);
	assert.equal(github.filesOn('admin/note/a')['src/content/notes/a.md'], 'two');
	assert.equal(github.commitOn('admin/note/a').parents.length, 1);
	assert.deepEqual((await repo.openProposals()).proposals.map((p) => p.branch), ['admin/note/a']);
});

test('a save without a change makes no commit and no pull request', async () => {
	const github = fakeGitHub({ files: { 'src/content/notes/a.md': 'same' } });
	const repo = repoWith(github);
	const result = await repo.propose({
		key: 'note/a',
		title: 'A',
		files: [{ path: 'src/content/notes/a.md', content: 'same' }]
	});
	assert.deepEqual(result, { outcome: 'ok', changed: false, proposal: null });
	assert.equal(github.pulls.length, 0);
	assert.equal(github.refs.has('admin/note/a'), false);
});

test('after a merge, the same key starts again from main in a new pull request', async () => {
	const github = fakeGitHub();
	const repo = repoWith(github);
	await repo.propose({ key: 'site', title: 'One', files: [{ path: 'src/lib/content/site.json', content: '1' }] });
	github.merge(1);
	await repo.propose({ key: 'site', title: 'Two', files: [{ path: 'src/content/notes/b.md', content: 'b' }] });
	assert.equal(github.pulls.length, 2);
	assert.deepEqual(github.filesOn('admin/site'), {
		'src/lib/content/site.json': '1',
		'src/content/notes/b.md': 'b'
	});
});

test('deleting a file is a change too', async () => {
	const github = fakeGitHub({ files: { 'src/content/notes/old.md': 'x', 'README.md': 'hi' } });
	const result = await repoWith(github).propose({
		key: 'note/old',
		title: 'Remove old',
		files: [{ path: 'src/content/notes/old.md', content: null }]
	});
	assert.equal(result.outcome, 'ok');
	assert.deepEqual(github.filesOn('admin/note/old'), { 'README.md': 'hi' });
});

test('a path outside allowedPaths is refused before anything goes to GitHub', async () => {
	const github = fakeGitHub();
	const result = await repoWith(github).propose({
		key: 'evil',
		title: 'x',
		files: [{ path: '.github/workflows/steal.yml', content: 'on: push' }]
	});
	assert.deepEqual(result, { outcome: 'not-allowed' });
	assert.equal(github.calls.length, 0);
});

test('a refused token, a rate limit, a moved branch and a dead network give outcome codes', async () => {
	const github = fakeGitHub();
	const repo = repoWith(github);
	const files = [{ path: 'src/content/notes/a.md', content: 'a' }];

	github.answer(() => new Response('{}', { status: 401 }));
	assert.deepEqual(await repo.propose({ key: 'a', title: 'A', files }), { outcome: 'key-refused' });

	github.answer(
		() => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })
	);
	assert.deepEqual(await repo.openProposals(), { outcome: 'unavailable' });

	github.answer(({ method, path }) =>
		method === 'POST' && path === '/git/refs' ? new Response('{}', { status: 422 }) : null
	);
	assert.deepEqual(await repo.propose({ key: 'a', title: 'A', files }), { outcome: 'conflict' });

	const down = createContentRepo({
		token: 't',
		repo: 'acme/site',
		allowedPaths: allowed,
		fetch: async () => {
			throw new TypeError('fetch failed');
		}
	});
	assert.deepEqual(await down.readFile('src/lib/content/site.json'), { outcome: 'unavailable' });
});
