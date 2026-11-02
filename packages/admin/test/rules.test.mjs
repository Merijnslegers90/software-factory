import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	ADMIN_HEADERS,
	adminDecision,
	adminPaths,
	fromOtherSite,
	isAdminPath,
	linkOutcome,
	loginAddress,
	mayManage,
	missingSettings,
	parseAllowList,
	PASSWORD_MIN_LENGTH,
	passwordOutcome,
	passwordProblem,
	readPasswordLink,
	safeReturnPath,
	signInOutcome
} from '../src/rules.js';

// F-0011: one admin login for every product, with an allow list.

// Built here, so this public repo holds no address (tests/public.test.mjs).
const mail = (name, domain = 'example') => `${name}@${domain}.org`;
const paths = adminPaths();
const site = 'https://shop.example.org';

test('adminPaths gives defaults and takes a project its own screens', () => {
	assert.deepEqual(paths, { base: '/admin', login: '/admin/login', password: '/admin/password' });
	assert.deepEqual(adminPaths({ base: '/beheer/', login: '/beheer/inloggen' }), {
		base: '/beheer',
		login: '/beheer/inloggen',
		password: '/beheer/password'
	});
});

test('isAdminPath holds the admin path and below, not a path that only starts alike', () => {
	assert.equal(isAdminPath('/admin', paths), true);
	assert.equal(isAdminPath('/admin/orders', paths), true);
	assert.equal(isAdminPath('/administration', paths), false);
	assert.equal(isAdminPath('/', paths), false);
});

test('parseAllowList reads commas, semicolons, spaces and new lines, and skips typos', () => {
	const list = parseAllowList(`${mail('Ann')}, ${mail('bob')};${mail('cy')}\n ,nobody, ,`);
	assert.deepEqual([...list], [mail('ann'), mail('bob'), mail('cy')]);
	assert.equal(parseAllowList('').size, 0);
	assert.equal(parseAllowList(undefined).size, 0);
});

test('mayManage ignores case and spaces, and refuses without an address', () => {
	const list = parseAllowList(mail('ann'));
	assert.equal(mayManage(`  ${mail('ANN')} `, list), true);
	assert.equal(mayManage(mail('bob'), list), false);
	assert.equal(mayManage('', list), false);
	assert.equal(mayManage(null, list), false);
});

test('passwordProblem asks for the minimum length and two equal entries', () => {
	const good = 'a'.repeat(PASSWORD_MIN_LENGTH);
	assert.equal(PASSWORD_MIN_LENGTH, 10);
	assert.equal(passwordProblem(good, good), null);
	assert.equal(passwordProblem(good.slice(1), good.slice(1)), 'password_too_short');
	assert.equal(passwordProblem(good, good + 'b'), 'passwords_differ');
});

test('safeReturnPath keeps a path within the admin, with its query', () => {
	assert.equal(safeReturnPath('/admin/orders?status=open', paths), '/admin/orders?status=open');
	assert.equal(safeReturnPath('/admin', paths), '/admin');
});

test('safeReturnPath sends everything else to the admin home', () => {
	for (const to of [
		null,
		undefined,
		'',
		'https://elsewhere.example/admin',
		'//elsewhere.example/admin',
		'/\\elsewhere.example',
		'/cart',
		'/administration',
		'/admin/../cart',
		'/admin/login',
		'/admin/password',
		'admin/orders'
	]) {
		assert.equal(safeReturnPath(to, paths), '/admin', String(to));
	}
});

test('loginAddress keeps where you came from, and safeReturnPath brings you back', () => {
	const from = new URL(`${site}/admin/orders?status=open`);
	const address = loginAddress(from, paths);
	assert.equal(address, `/admin/login?to=${encodeURIComponent('/admin/orders?status=open')}`);
	const to = new URL(address, site).searchParams.get('to');
	assert.equal(safeReturnPath(to, paths), '/admin/orders?status=open');
	assert.equal(loginAddress(new URL(`${site}/admin`), paths), '/admin/login');
});

test('fromOtherSite lets reading through and wants our origin for the rest', () => {
	for (const method of ['GET', 'HEAD', 'OPTIONS']) {
		assert.equal(fromOtherSite(method, 'https://evil.example', site), false);
	}
	for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
		assert.equal(fromOtherSite(method, site, site), false);
		assert.equal(fromOtherSite(method, 'https://evil.example', site), true);
		assert.equal(fromOtherSite(method, null, site), true);
	}
});

function decide(overrides) {
	return adminDecision({
		url: new URL(`${site}/admin/orders`),
		method: 'GET',
		contentType: null,
		origin: null,
		signedIn: false,
		paths,
		...overrides
	});
}

test('adminDecision: signed in passes, a post from another site does not', () => {
	assert.deepEqual(decide({ signedIn: true }), { kind: 'pass' });
	assert.deepEqual(decide({ signedIn: true, method: 'POST', origin: site }), { kind: 'pass' });
	assert.deepEqual(decide({ signedIn: true, method: 'POST', origin: 'https://evil.example' }), {
		kind: 'forbidden'
	});
	assert.deepEqual(decide({ signedIn: true, method: 'POST', origin: null }), { kind: 'forbidden' });
});

test('adminDecision: the open screens pass without a session, with the origin check', () => {
	const login = new URL(`${site}/admin/login`);
	assert.deepEqual(decide({ url: login }), { kind: 'pass' });
	assert.deepEqual(decide({ url: login, method: 'POST', origin: site }), { kind: 'pass' });
	assert.deepEqual(decide({ url: login, method: 'POST', origin: 'https://evil.example' }), {
		kind: 'forbidden'
	});
});

test('adminDecision: a page or a form without a session goes to the login screen', () => {
	const location = `/admin/login?to=${encodeURIComponent('/admin/orders')}`;
	assert.deepEqual(decide({}), { kind: 'redirect', location });
	for (const contentType of [
		'application/x-www-form-urlencoded',
		'multipart/form-data; boundary=x'
	]) {
		assert.deepEqual(decide({ method: 'POST', contentType, origin: site }), {
			kind: 'redirect',
			location
		});
	}
});

test('adminDecision: a fetch without a session gets a 401', () => {
	assert.deepEqual(decide({ method: 'POST', contentType: 'application/json', origin: site }), {
		kind: 'unauthorized'
	});
});

test('ADMIN_HEADERS keep the admin out of frames, search engines and caches', () => {
	assert.equal(ADMIN_HEADERS['Content-Security-Policy'], "frame-ancestors 'none'");
	assert.equal(ADMIN_HEADERS['X-Frame-Options'], 'DENY');
	assert.match(ADMIN_HEADERS['X-Robots-Tag'], /noindex/);
	assert.match(ADMIN_HEADERS['Cache-Control'], /no-store/);
	assert.equal(ADMIN_HEADERS['Referrer-Policy'], 'same-origin');
	assert.equal(ADMIN_HEADERS['X-Content-Type-Options'], 'nosniff');
	assert.throws(() => {
		ADMIN_HEADERS['X-Frame-Options'] = 'SAMEORIGIN';
	});
});

test('missingSettings names what is missing, by the project its names (F-0005)', () => {
	const names = {
		supabaseUrl: 'URL',
		anonKey: 'ANON',
		serviceRoleKey: 'SERVICE',
		allowList: 'LIST'
	};
	const all = {
		supabaseUrl: 'https://db.example.org',
		anonKey: 'anon',
		serviceRoleKey: 'service',
		allowList: parseAllowList(mail('ann'))
	};
	assert.deepEqual(missingSettings(all, names), []);
	assert.deepEqual(
		missingSettings({ ...all, anonKey: '', allowList: parseAllowList('nobody') }, names),
		['ANON', 'LIST']
	);
});

test('the outcome codes follow Supabase its errors', () => {
	assert.equal(signInOutcome(null), 'ok');
	assert.equal(signInOutcome({ status: 400, code: 'invalid_credentials' }), 'invalid_credentials');
	assert.equal(signInOutcome({ status: 429 }), 'rate_limited');
	assert.equal(signInOutcome({ status: 500 }), 'invalid_credentials');

	assert.equal(linkOutcome(null), 'ok');
	assert.equal(linkOutcome({ status: 429 }), 'rate_limited');
	assert.equal(linkOutcome({ status: 500 }), 'send_failed');

	assert.equal(passwordOutcome(null), 'ok');
	assert.equal(passwordOutcome({ code: 'same_password' }), 'ok');
	assert.equal(passwordOutcome({ code: 'weak_password' }), 'weak_password');
	assert.equal(passwordOutcome({ code: 'unexpected_failure' }), 'save_failed');
});

test('readPasswordLink reads both kinds of link and an error, without using them', () => {
	assert.deepEqual(readPasswordLink(new URL(`${site}/admin/password?token_hash=abc`)), {
		tokenHash: 'abc',
		code: '',
		linkError: false
	});
	assert.deepEqual(readPasswordLink(new URL(`${site}/admin/password?code=xyz`)), {
		tokenHash: '',
		code: 'xyz',
		linkError: false
	});
	assert.equal(readPasswordLink(new URL(`${site}/admin/password?error=expired`)).linkError, true);
});
