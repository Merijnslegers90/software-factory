// The rules around the admin login (F-0016): Supabase Auth with an allow list,
// or HTTP Basic with a password per person. Pure, so they are tested without
// Supabase or SvelteKit (F-0006). The calls to Supabase are in server.js, the
// password hashes in password.js.

/** Longer than the six characters Supabase asks by default. A short sentence or a password manager makes it easily. */
export const PASSWORD_MIN_LENGTH = 10;

/**
 * Every response under the admin path gets these headers. Not in a frame, so
 * no other site can lay our buttons under a page of its own; not in a search
 * engine; not in a cache; and no admin address (with an email or an invoice in
 * it) as referrer to another service.
 */
export const ADMIN_HEADERS = Object.freeze({
	'Content-Security-Policy': "frame-ancestors 'none'",
	'X-Frame-Options': 'DENY',
	'X-Robots-Tag': 'noindex, nofollow',
	'Referrer-Policy': 'same-origin',
	'X-Content-Type-Options': 'nosniff',
	'Cache-Control': 'private, no-store'
});

/**
 * The admin path, its two screens that open without a session (Supabase
 * Auth), and the path that makes the browser forget its password (HTTP Basic).
 */
export function adminPaths({ base = '/admin', login, password, logout } = {}) {
	const root = base.replace(/\/+$/, '') || '/admin';
	return {
		base: root,
		login: login ?? `${root}/login`,
		password: password ?? `${root}/password`,
		logout: logout ?? `${root}/logout`
	};
}

/**
 * The path as SvelteKit decodes it to pick a route. Comparing the raw path
 * would let `/%61dmin/orders` reach the route `/admin/orders` past the hook.
 * Null when it cannot be decoded.
 */
export function decodePath(pathname) {
	try {
		return pathname.split('%25').map(decodeURI).join('%25');
	} catch {
		return null;
	}
}

/**
 * Whether a path is the admin path or below it, after decoding. `/administration`
 * is not. A path that cannot be decoded counts as admin, so it stays closed.
 */
export function isAdminPath(pathname, paths) {
	const path = decodePath(pathname);
	return path === null || path === paths.base || path.startsWith(paths.base + '/');
}

/** The screens under the admin path you must reach without a session, after decoding. */
export function isOpenPath(pathname, paths) {
	const path = decodePath(pathname);
	return path !== null && (path === paths.login || path === paths.password);
}

/** An email address as we compare it: without spaces, in lower case. */
export function normaliseEmail(email) {
	return String(email ?? '')
		.trim()
		.toLowerCase();
}

/**
 * The allow list from `ADMIN_EMAILS`: addresses separated by commas,
 * semicolons, spaces or new lines. An entry without `@` is a typo and does not
 * count.
 */
export function parseAllowList(list) {
	return new Set(
		String(list ?? '')
			.split(/[\s,;]+/)
			.map(normaliseEmail)
			.filter((email) => email.includes('@'))
	);
}

/** Whether this address may manage. Without an address, never. */
export function mayManage(email, allowList) {
	return !!email && allowList.has(normaliseEmail(email));
}

/** What is wrong with a new password, or null when it is fine. */
export function passwordProblem(password, repeat) {
	if (String(password ?? '').length < PASSWORD_MIN_LENGTH) return 'password_too_short';
	if (password !== repeat) return 'passwords_differ';
	return null;
}

/**
 * Where to go after logging in. The address comes from a link, so only a path
 * within the admin path on our own site counts; otherwise a link such as
 * `?to=https://elsewhere` would turn our login screen into a relay.
 */
export function safeReturnPath(to, paths) {
	if (!to || !to.startsWith('/') || to.startsWith('//') || to.includes('\\')) return paths.base;
	const origin = 'https://admin.invalid';
	let url;
	try {
		url = new URL(to, origin);
	} catch {
		return paths.base;
	}
	if (
		url.origin !== origin ||
		!isAdminPath(url.pathname, paths) ||
		isOpenPath(url.pathname, paths)
	) {
		return paths.base;
	}
	return url.pathname + url.search;
}

/** The login screen, with the path you came from. Read back with `safeReturnPath`. */
export function loginAddress(from, paths) {
	const to = from.pathname + from.search;
	return to === paths.base ? paths.login : `${paths.login}?to=${encodeURIComponent(to)}`;
}

/**
 * Whether a request comes from another site. Every method that can change
 * something, a fetch with JSON too, must come from our own origin. A browser
 * always sets an Origin on such a request; without one, it was not a form on
 * our screen. This holds even when SvelteKit's own check is off for a webhook.
 */
export function fromOtherSite(method, origin, ownOrigin) {
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
	return origin !== ownOrigin;
}

const FORM = /^(multipart\/form-data|application\/x-www-form-urlencoded)/;

/**
 * What the hook does with a request under the admin path.
 *
 * - `pass`: let it through.
 * - `redirect`: a page, a link from a mail or a form without a session goes to
 *   the login screen (`location`), and back afterwards.
 * - `unauthorized`: a fetch to an endpoint without a session gets a 401; there
 *   is nowhere to send it.
 * - `forbidden`: it can change something and does not come from our site.
 */
export function adminDecision({ url, method, contentType, origin, signedIn, paths }) {
	if (signedIn || isOpenPath(url.pathname, paths)) {
		return fromOtherSite(method, origin, url.origin) ? { kind: 'forbidden' } : { kind: 'pass' };
	}
	if (method === 'GET' || method === 'HEAD' || FORM.test(contentType ?? '')) {
		return { kind: 'redirect', location: loginAddress(url, paths) };
	}
	return { kind: 'unauthorized' };
}

/**
 * The answer to a refusal, with `ADMIN_HEADERS` on it. The package chooses no
 * words (F-0016): the body is the project's own text from `responses`, or
 * empty when it passes none.
 *
 * - `unauthorized` (401) and `forbidden` (403), for both logins.
 * - `challenge` and `logout` (401 with `WWW-Authenticate`), for HTTP Basic.
 *   `logout` takes `responses.loggedOut`, else `responses.unauthorized`.
 * - `rate_limited` (429), after too many wrong passwords.
 */
export function refusal(kind, responses = {}, realm = 'Admin') {
	const status = { forbidden: 403, rate_limited: 429 }[kind] ?? 401;
	const text =
		(kind === 'forbidden'
			? responses.forbidden
			: kind === 'rate_limited'
				? responses.rateLimited
				: kind === 'logout'
					? (responses.loggedOut ?? responses.unauthorized)
					: responses.unauthorized) ?? '';
	const headers = new Headers(ADMIN_HEADERS);
	if (kind === 'challenge' || kind === 'logout') {
		const name = String(realm).replace(/["\\\r\n]/g, '');
		headers.set('WWW-Authenticate', `Basic realm="${name}", charset="UTF-8"`);
	}
	if (kind === 'rate_limited') headers.set('Retry-After', '900');
	if (!text) return new Response(null, { status, headers });
	headers.set('Content-Type', 'text/plain; charset=utf-8');
	return new Response(text, { status, headers });
}

/**
 * The shape of a password hash from `hashPassword` in password.js:
 * `scrypt.<salt>.<key>`, in base64url. A plain password does not have it.
 */
export function isPasswordHash(value) {
	const parts = String(value ?? '').split('.');
	return (
		parts.length === 3 &&
		parts[0] === 'scrypt' &&
		/^[\w-]{16,}$/.test(parts[1]) &&
		/^[\w-]{40,}$/.test(parts[2])
	);
}

/**
 * The people of the HTTP Basic login from `ADMIN_USERS`: entries of
 * `email:hash`, separated by commas, semicolons, spaces or new lines. An entry
 * without `@`, or with a plain password instead of a hash, does not count;
 * `skipped` says how many there were, so the server can warn.
 */
export function parseUsers(list) {
	const users = new Map();
	let skipped = 0;
	for (const entry of String(list ?? '').split(/[\s,;]+/)) {
		if (!entry) continue;
		const at = entry.indexOf(':');
		const email = normaliseEmail(entry.slice(0, at));
		const hash = entry.slice(at + 1);
		if (at > 0 && email.includes('@') && isPasswordHash(hash)) users.set(email, hash);
		else skipped++;
	}
	return { users, skipped };
}

/**
 * Which login a product uses, from the settings it has (F-0016):
 * - `supabase` as soon as one of the two Supabase settings is filled. A half
 *   setup does not fall back to HTTP Basic: then the admin stays closed and
 *   names what is missing.
 * - `basic` when only `ADMIN_USERS` has people.
 * - null when there is neither, and nobody gets in.
 */
export function loginMethod({ supabaseUrl, anonKey, users }) {
	if (supabaseUrl || anonKey) return 'supabase';
	if (users && users.size > 0) return 'basic';
	return null;
}

/**
 * The settings logging in needs that are missing, by the names the project
 * gave them. Empty when everything is there. Without them nobody gets in
 * (F-0005). The service_role key is not among them: only a password link
 * needs it, and the database has it anyway (F-0004).
 *
 * A setting the project does not pass at all (undefined) is a login it does
 * not offer, and is not named.
 */
export function missingSettings(settings, names) {
	const method = loginMethod(settings);
	if (method === 'basic') return [];
	const offersSupabase = settings.supabaseUrl !== undefined || settings.anonKey !== undefined;
	const offersBasic = settings.users !== undefined;
	const missing = [];
	if (method === 'supabase' || offersSupabase) {
		if (!settings.supabaseUrl) missing.push(names.supabaseUrl);
		if (!settings.anonKey) missing.push(names.anonKey);
		if (!settings.allowList || settings.allowList.size === 0) missing.push(names.allowList);
	}
	if (method === null && (offersBasic || !offersSupabase)) missing.push(names.users);
	return missing;
}

/**
 * The name and password in an `Authorization: Basic` header, or null. The
 * name is read as UTF-8, as the browser sends it with `charset="UTF-8"` in
 * the challenge.
 */
export function parseBasicAuth(header) {
	const match = /^basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(String(header ?? ''));
	if (!match) return null;
	let text;
	try {
		const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
	const colon = text.indexOf(':');
	if (colon <= 0) return null;
	return { email: normaliseEmail(text.slice(0, colon)), password: text.slice(colon + 1) };
}

/**
 * What the hook does with a request under the admin path, for HTTP Basic.
 *
 * - `logout`: the logout path. Always a 401, so the browser forgets the
 *   password it keeps.
 * - `challenge`: no valid password; a 401 that makes the browser ask for one.
 * - `forbidden`: it can change something and does not come from our site.
 * - `pass`: let it through.
 */
export function basicDecision({ url, method, origin, signedIn, paths }) {
	if (decodePath(url.pathname) === paths.logout) return { kind: 'logout' };
	if (!signedIn) return { kind: 'challenge' };
	return fromOtherSite(method, origin, url.origin) ? { kind: 'forbidden' } : { kind: 'pass' };
}

/**
 * Counts password attempts per key (the IP address), per server instance.
 * After `limit` within `windowMs`, the key is blocked until the window has
 * passed. The hook counts an attempt before it checks the password and takes
 * it back when the password is right, so attempts sent at the same time are
 * counted too.
 * Without a database this is all there is; scrypt makes every attempt slow
 * besides.
 */
export function createAttemptCounter({ limit = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
	const attempts = new Map();

	function current(key) {
		const entry = attempts.get(key);
		if (entry && now() - entry.since >= windowMs) {
			attempts.delete(key);
			return null;
		}
		return entry ?? null;
	}

	return {
		blocked: (key) => (current(key)?.count ?? 0) >= limit,
		fail(key) {
			const entry = current(key);
			if (entry) entry.count++;
			else attempts.set(key, { count: 1, since: now() });
			// A flood of addresses must not fill the memory.
			if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);
		},
		/** Takes back one attempt, for a password that turned out right. */
		undo(key) {
			const entry = current(key);
			if (entry && --entry.count <= 0) attempts.delete(key);
		},
		clear: (key) => attempts.delete(key)
	};
}

/** The outcome of signing in, from Supabase's error. */
export function signInOutcome(error) {
	if (!error) return 'ok';
	return error.status === 429 ? 'rate_limited' : 'invalid_credentials';
}

/** The outcome of sending a password link, from Supabase's error. */
export function linkOutcome(error) {
	if (!error) return 'ok';
	return error.status === 429 ? 'rate_limited' : 'send_failed';
}

/** The outcome of saving a password, from Supabase's error. The same password as now is fine: you know it already. */
export function passwordOutcome(error) {
	if (!error || error.code === 'same_password') return 'ok';
	return error.code === 'weak_password' ? 'weak_password' : 'save_failed';
}

/** The link parameters on the password screen. They are used only on saving, never on opening. */
export function readPasswordLink(url) {
	return {
		tokenHash: url.searchParams.get('token_hash') ?? '',
		code: url.searchParams.get('code') ?? '',
		linkError: url.searchParams.has('error')
	};
}
