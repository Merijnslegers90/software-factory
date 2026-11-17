import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/password.js';
import {
	ADMIN_HEADERS,
	adminPaths,
	basicDecision,
	createAttemptCounter,
	isPasswordHash,
	loginMethod,
	missingSettings,
	parseAllowList,
	parseBasicAuth,
	parseUsers,
	refusal
} from '../src/rules.js';

// F-0016: HTTP Basic with a password per person, for a product without a
// database, next to Supabase Auth for a product with one.

// Built here, so this public repo holds no address (tests/public.test.mjs).
const mail = (name, domain = 'example') => `${name}@${domain}.org`;
const paths = adminPaths();
const site = 'https://site.example.org';
const header = (user, password) =>
	'Basic ' + Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
const names = {
	supabaseUrl: 'SUPABASE_URL',
	anonKey: 'SUPABASE_ANON_KEY',
	serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
	allowList: 'ADMIN_EMAILS',
	users: 'ADMIN_USERS'
};

test('hashPassword makes a hash that verifyPassword accepts, and only for that password', async () => {
	const hash = await hashPassword('correct horse battery');
	assert.equal(isPasswordHash(hash), true);
	assert.doesNotMatch(hash, /\$/, 'a .env file would read a $ as a variable');
	assert.equal(await verifyPassword('correct horse battery', hash), true);
	assert.equal(await verifyPassword('correct horse batterY', hash), false);
	assert.equal(await verifyPassword('', hash), false);
	// A new salt every time.
	assert.notEqual(await hashPassword('correct horse battery'), hash);
});

test('verifyPassword never matches a missing or malformed hash', async () => {
	assert.equal(await verifyPassword('anything', undefined), false);
	assert.equal(await verifyPassword('anything', ''), false);
	assert.equal(await verifyPassword('anything', 'anything'), false);
	assert.equal(await verifyPassword('scrypt', 'scrypt.x.y'), false);
});

test('a password outside ASCII works, in either Unicode form', async () => {
	const hash = await hashPassword('café au lait 2026');
	assert.equal(await verifyPassword('café au lait 2026', hash), true);
});

test('parseUsers reads email:hash entries and skips typos and plain passwords', async () => {
	const hash = await hashPassword('correct horse battery');
	const { users, skipped } = parseUsers(
		`${mail('Ann')}:${hash}\n${mail('bob')}:${hash}, nobody:${hash}; ${mail('cy')}:hunter2 ${mail('dee')}`
	);
	assert.deepEqual([...users.keys()], [mail('ann'), mail('bob')]);
	assert.equal(users.get(mail('ann')), hash);
	assert.equal(skipped, 3);
	assert.deepEqual(parseUsers(undefined), { users: new Map(), skipped: 0 });
});

test('loginMethod: Supabase as soon as one of its settings is there, HTTP Basic otherwise (F-0016)', () => {
	const users = new Map([[mail('ann'), 'hash']]);
	assert.equal(loginMethod({ supabaseUrl: 'https://db.example.org', anonKey: 'anon', users }), 'supabase');
	// Half a Supabase setup does not fall back to HTTP Basic.
	assert.equal(loginMethod({ supabaseUrl: 'https://db.example.org', anonKey: '', users }), 'supabase');
	assert.equal(loginMethod({ supabaseUrl: '', anonKey: 'anon', users }), 'supabase');
	assert.equal(loginMethod({ supabaseUrl: '', anonKey: '', users }), 'basic');
	assert.equal(loginMethod({ users }), 'basic');
	assert.equal(loginMethod({ users: new Map() }), null);
	assert.equal(loginMethod({}), null);
});

test('missingSettings names only the logins a project offers (F-0005)', () => {
	const users = parseUsers('').users;
	const allowList = parseAllowList('');
	// Only HTTP Basic offered.
	assert.deepEqual(missingSettings({ users }, names), ['ADMIN_USERS']);
	assert.deepEqual(missingSettings({ users: new Map([[mail('ann'), 'h']]) }, names), []);
	// Nothing offered at all: the login without a database.
	assert.deepEqual(missingSettings({}, names), ['ADMIN_USERS']);
	// Both offered, nothing filled: both named.
	assert.deepEqual(missingSettings({ supabaseUrl: '', anonKey: '', allowList, users }, names), [
		'SUPABASE_URL',
		'SUPABASE_ANON_KEY',
		'ADMIN_EMAILS',
		'ADMIN_USERS'
	]);
	// Half a Supabase setup: the rest of Supabase is named, not ADMIN_USERS.
	assert.deepEqual(
		missingSettings({ supabaseUrl: 'https://db.example.org', anonKey: '', allowList, users }, names),
		['SUPABASE_ANON_KEY', 'ADMIN_EMAILS']
	);
});

test('parseBasicAuth reads the header, in UTF-8, and refuses what it cannot read', () => {
	assert.deepEqual(parseBasicAuth(header(` ${mail('Ann')}`, 'a:b c')), {
		email: mail('ann'),
		password: 'a:b c'
	});
	assert.deepEqual(parseBasicAuth(header(mail('ann'), 'café')).password, 'café');
	assert.equal(parseBasicAuth(header(mail('ann'), '')).password, '');
	assert.equal(parseBasicAuth(null), null);
	assert.equal(parseBasicAuth('Bearer abc'), null);
	assert.equal(parseBasicAuth('Basic !!!'), null);
	assert.equal(parseBasicAuth('Basic ' + Buffer.from('no colon').toString('base64')), null);
	assert.equal(parseBasicAuth('Basic ' + Buffer.from(':only password').toString('base64')), null);
	assert.equal(parseBasicAuth('Basic ' + Buffer.from([0xff, 0x3a, 0x61]).toString('base64')), null);
});

test('basicDecision: a challenge without a password, the Origin check with one (F-0016)', () => {
	const at = (path) => new URL(path, site);
	const ask = (path, method, origin, signedIn) =>
		basicDecision({ url: at(path), method, origin, signedIn, paths }).kind;
	assert.equal(ask('/admin', 'GET', null, false), 'challenge');
	assert.equal(ask('/admin/orders', 'POST', site, false), 'challenge');
	assert.equal(ask('/admin', 'GET', null, true), 'pass');
	assert.equal(ask('/admin/orders', 'POST', site, true), 'pass');
	assert.equal(ask('/admin/orders', 'POST', 'https://evil.example.org', true), 'forbidden');
	assert.equal(ask('/admin/orders', 'POST', null, true), 'forbidden');
	// Logging out always answers with a 401, signed in or not, encoded or not.
	assert.equal(ask('/admin/logout', 'GET', null, true), 'logout');
	assert.equal(ask('/admin/%6Cogout', 'GET', null, false), 'logout');
});

test('refusal: a challenge asks the browser for a password, in UTF-8, with the admin headers', async () => {
	const response = refusal('challenge');
	assert.equal(response.status, 401);
	assert.equal(response.headers.get('WWW-Authenticate'), 'Basic realm="Admin", charset="UTF-8"');
	assert.equal(await response.text(), '');
	for (const [name, value] of Object.entries(ADMIN_HEADERS)) {
		assert.equal(response.headers.get(name), value);
	}
	// A realm cannot break out of its quotes.
	assert.equal(
		refusal('challenge', {}, 'Be"heer\r\n').headers.get('WWW-Authenticate'),
		'Basic realm="Beheer", charset="UTF-8"'
	);
});

test("refusal: logout and rate_limited, in the project's own words", async () => {
	const responses = { unauthorized: 'Niet ingelogd.', loggedOut: 'Uitgelogd.', rateLimited: 'Wacht even.' };
	const logout = refusal('logout', responses);
	assert.equal(logout.status, 401);
	assert.match(logout.headers.get('WWW-Authenticate'), /^Basic /);
	assert.equal(await logout.text(), 'Uitgelogd.');
	assert.equal(await refusal('logout', { unauthorized: 'Niet ingelogd.' }).text(), 'Niet ingelogd.');

	const limited = refusal('rate_limited', responses);
	assert.equal(limited.status, 429);
	assert.equal(limited.headers.get('Retry-After'), '900');
	assert.equal(limited.headers.get('WWW-Authenticate'), null);
	assert.equal(await limited.text(), 'Wacht even.');
	assert.equal(await refusal('rate_limited', { unauthorized: 'Niet ingelogd.' }).text(), '');
});

test('createAttemptCounter blocks after the limit, until the window has passed', () => {
	let time = 0;
	const counter = createAttemptCounter({ limit: 3, windowMs: 1000, now: () => time });
	for (let i = 0; i < 3; i++) {
		assert.equal(counter.blocked('1.2.3.4'), false);
		counter.fail('1.2.3.4');
	}
	assert.equal(counter.blocked('1.2.3.4'), true);
	assert.equal(counter.blocked('5.6.7.8'), false);
	time = 999;
	assert.equal(counter.blocked('1.2.3.4'), true);
	time = 1000;
	assert.equal(counter.blocked('1.2.3.4'), false);
	counter.fail('1.2.3.4');
	counter.clear('1.2.3.4');
	assert.equal(counter.blocked('1.2.3.4'), false);
	// undo takes back one attempt.
	for (let i = 0; i < 3; i++) counter.fail('1.2.3.4');
	counter.undo('1.2.3.4');
	assert.equal(counter.blocked('1.2.3.4'), false);
	counter.undo('5.6.7.8');
	assert.equal(counter.blocked('5.6.7.8'), false);
});
