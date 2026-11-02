// The rules around the admin login (F-0011). Pure, so they are tested without
// Supabase or SvelteKit (F-0006). The calls to Supabase are in server.js.

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

/** The admin path and its two screens that open without a session. */
export function adminPaths({ base = '/admin', login, password } = {}) {
	const root = base.replace(/\/+$/, '') || '/admin';
	return {
		base: root,
		login: login ?? `${root}/login`,
		password: password ?? `${root}/password`
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
 * The settings logging in needs that are missing, by the names the project
 * gave them. Empty when everything is there. Without them nobody gets in
 * (F-0005). The service_role key is not among them: only a password link
 * needs it, and the database has it anyway (F-0004).
 */
export function missingSettings(settings, names) {
	const missing = [];
	if (!settings.supabaseUrl) missing.push(names.supabaseUrl);
	if (!settings.anonKey) missing.push(names.anonKey);
	if (settings.allowList.size === 0) missing.push(names.allowList);
	return missing;
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
