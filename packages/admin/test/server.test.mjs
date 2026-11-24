import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdmin } from '../src/server.js';
import { hashPassword } from '../src/password.js';

// F-0020: the hook with HTTP Basic, without SvelteKit or Supabase installed.

// Built here, so this public repo holds no address (tests/public.test.mjs).
const email = ['ann', 'example.org'].join('@');
const site = 'https://site.example.org';
const PASSWORD = 'correct horse battery';
const users = `${email}:${await hashPassword(PASSWORD)}`;
const basic = (password, user = email) =>
	'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');

function quietly(fn) {
	const warn = console.warn;
	console.warn = () => {};
	try {
		return fn();
	} finally {
		console.warn = warn;
	}
}

/** Sends one request through the hook; `seen` counts the requests that reached the route. */
function client(admin) {
	const seen = { count: 0 };
	async function send(path, { method = 'GET', auth, origin, ip = '1.1.1.1' } = {}) {
		const url = new URL(path, site);
		const headers = new Headers();
		if (auth) headers.set('authorization', auth);
		if (origin) headers.set('origin', origin);
		const event = {
			url,
			request: new Request(url, { method, headers }),
			locals: {},
			cookies: {},
			getClientAddress: () => ip
		};
		const response = await admin.handle({
			event,
			resolve: async () => {
				seen.count++;
				return new Response(event.locals.admin?.email ?? '');
			}
		});
		return { status: response.status, response, text: await response.text() };
	}
	return { send, seen };
}

test('lets the right password in, with the admin headers, and the rest of the site alone', async () => {
	const admin = quietly(() => createAdmin({ users }));
	assert.equal(admin.method, 'basic');
	const { send } = client(admin);
	assert.equal((await send('/')).status, 200);
	const ok = await send('/admin', { auth: basic(PASSWORD) });
	assert.equal(ok.status, 200);
	assert.equal(ok.text, email);
	assert.equal(ok.response.headers.get('X-Frame-Options'), 'DENY');
	const missing = await send('/%61dmin');
	assert.equal(missing.status, 401);
	assert.match(missing.response.headers.get('WWW-Authenticate'), /^Basic /);
	assert.equal((await send('/admin', { auth: basic('wrong password') })).status, 401);
});

test('refuses a change from another site, even with the right password', async () => {
	const { send } = client(quietly(() => createAdmin({ users })));
	const auth = basic(PASSWORD);
	assert.equal((await send('/admin/x', { method: 'POST', auth, origin: 'https://evil.example.org' })).status, 403);
	assert.equal((await send('/admin/x', { method: 'POST', auth })).status, 403);
	assert.equal((await send('/admin/x', { method: 'POST', auth, origin: site })).status, 200);
});

test('logging out answers with a 401 before it looks at the password', async () => {
	const { send, seen } = client(quietly(() => createAdmin({ users, responses: { loggedOut: 'Weg.' } })));
	const out = await send('/admin/logout', { auth: basic(PASSWORD) });
	assert.equal(out.status, 401);
	assert.equal(out.text, 'Weg.');
	assert.match(out.response.headers.get('WWW-Authenticate'), /^Basic /);
	assert.equal(seen.count, 0);
});

test('wrong passwords sent at the same time are counted too: no more than ten get checked', async () => {
	const { send, seen } = client(quietly(() => createAdmin({ users })));
	const answers = await Promise.all(
		Array.from({ length: 40 }, (_, i) => send('/admin', { auth: basic(`wrong ${i}`), ip: '9.9.9.9' }))
	);
	const statuses = answers.map((a) => a.status);
	assert.equal(statuses.filter((s) => s === 401).length, 10);
	assert.equal(statuses.filter((s) => s === 429).length, 30);
	// Blocked for this address, even with the right password; not for another.
	assert.equal((await send('/admin', { auth: basic(PASSWORD), ip: '9.9.9.9' })).status, 429);
	assert.equal((await send('/admin', { auth: basic(PASSWORD), ip: '8.8.8.8' })).status, 200);
	assert.equal(seen.count, 1);
});

test('right passwords do not use up the limit', async () => {
	const { send } = client(quietly(() => createAdmin({ users })));
	for (let i = 0; i < 9; i++) await send('/admin', { auth: basic(`wrong ${i}`) });
	// A fresh header for the same person, each checked with scrypt.
	for (let i = 0; i < 3; i++) {
		assert.equal((await send('/admin', { auth: basic(PASSWORD, ` ${email}`.padEnd(20 + i)) })).status, 200);
	}
	assert.equal((await send('/admin', { auth: basic('wrong 9') })).status, 401);
	assert.equal((await send('/admin', { auth: basic('wrong 10') })).status, 429);
});

test('without ADMIN_USERS the admin is closed, names the setting and asks for no password', async () => {
	const admin = quietly(() => createAdmin({ users: '', responses: { closed: 'Dicht:' } }));
	assert.equal(admin.method, null);
	const { send, seen } = client(admin);
	const closed = await send('/admin', { auth: basic(PASSWORD) });
	assert.equal(closed.status, 401);
	assert.equal(closed.text, 'Dicht: ADMIN_USERS');
	assert.equal(closed.response.headers.get('WWW-Authenticate'), null);
	assert.equal(seen.count, 0);
});

test('ADMIN_OWNERS next to ADMIN_USERS: the owner gets in, also alone, and the site entry wins (software-factory#47)', async () => {
	const owner = ['owner', 'example.org'].join('@');
	const ownerEntry = `${owner}:${await hashPassword('owner password')}`;
	const login = (user, password) => basic(password, user);

	// Both set: both people get in.
	const both = client(quietly(() => createAdmin({ users: [users, ownerEntry] })));
	assert.equal((await both.send('/admin', { auth: basic(PASSWORD) })).text, email);
	assert.equal((await both.send('/admin', { auth: login(owner, 'owner password') })).text, owner);

	// Only the owner: a new product before its own people have a password.
	const alone = quietly(() => createAdmin({ users: ['', ownerEntry] }));
	assert.equal(alone.method, 'basic');
	assert.equal((await client(alone).send('/admin', { auth: login(owner, 'owner password') })).status, 200);

	// The same address in both: the site's own password counts, not the shared one.
	const siteEntry = `${owner}:${await hashPassword('site password')}`;
	const own = client(quietly(() => createAdmin({ users: [siteEntry, ownerEntry] })));
	assert.equal((await own.send('/admin', { auth: login(owner, 'site password') })).status, 200);
	assert.equal((await own.send('/admin', { auth: login(owner, 'owner password') })).status, 401);

	// Both empty: closed, and the refusal names ADMIN_USERS as before.
	const closed = quietly(() => createAdmin({ users: ['', ''], responses: { closed: 'Dicht:' } }));
	assert.equal(closed.method, null);
	assert.equal((await client(closed).send('/admin')).text, 'Dicht: ADMIN_USERS');
});

test('Supabase settings win over ADMIN_USERS, and Supabase functions do nothing with HTTP Basic', async () => {
	const both = quietly(() =>
		createAdmin({ supabaseUrl: 'https://db.example.org', anonKey: 'anon', allowList: email, users })
	);
	assert.equal(both.method, 'supabase');
	const admin = quietly(() => createAdmin({ users }));
	assert.equal(await admin.currentAdmin({}), null);
	assert.equal(await admin.signIn({}, email, PASSWORD), 'missing_setting');
	assert.equal(await admin.sendPasswordLink({}, email, site), 'ok');
});
