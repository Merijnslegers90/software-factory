// The admin login (F-0020). Server-only. Two ways, chosen by the settings:
//
// - Supabase Auth with an allow list, for a product with a database. The keys
//   and the cookie stay on the server, the browser never talks to Supabase.
// - HTTP Basic with a password per person (`ADMIN_USERS`), for a product
//   without one. Supabase is then never loaded, so it need not be installed.
//
// The client with the anon key is only for logging in and reads or writes no
// table. The database stays with the service_role key, as everywhere (F-0004);
// that key is used here only to create a user on their first password link.
//
// The package reads no environment variable. The project reads them in its
// src/env.ts at runtime (F-0005) and passes them in; a missing one is an empty
// string, and then nobody gets in.

import { createHash } from 'node:crypto';
import { verifyPassword } from './password.js';
import {
	ADMIN_HEADERS,
	adminDecision,
	adminPaths,
	basicDecision,
	createAttemptCounter,
	isAdminPath,
	linkOutcome,
	loginMethod,
	mayManage,
	missingSettings,
	normaliseEmail,
	parseAllowList,
	parseBasicAuth,
	parseUsers,
	passwordOutcome,
	passwordProblem,
	refusal,
	signInOutcome
} from './rules.js';

const DEFAULT_NAMES = {
	supabaseUrl: 'SUPABASE_URL',
	anonKey: 'SUPABASE_ANON_KEY',
	serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
	allowList: 'ADMIN_EMAILS',
	users: 'ADMIN_USERS'
};

/** How long a checked password is remembered per server instance, so not every request pays for scrypt. */
const VERIFIED_FOR_MS = 5 * 60 * 1000;

export function createAdmin(options) {
	const paths = adminPaths(options.paths);
	const parsedUsers = parseUsers(options.users);
	const settings = {
		supabaseUrl: options.supabaseUrl,
		anonKey: options.anonKey,
		serviceRoleKey: options.serviceRoleKey ?? '',
		allowList: parseAllowList(options.allowList),
		users: options.users === undefined ? undefined : parsedUsers.users
	};
	const names = { ...DEFAULT_NAMES, ...options.settingNames };
	const method = loginMethod(settings);
	const missing = missingSettings(settings, names);
	const ready = method !== null && missing.length === 0;
	// Without any login, a project that offers HTTP Basic (or offers nothing)
	// answers the way HTTP Basic does: there is no login screen to send to.
	const basic =
		method === 'basic' ||
		(method === null &&
			(settings.users !== undefined ||
				(options.supabaseUrl === undefined && options.anonKey === undefined)));

	if (method === 'supabase' && parsedUsers.users.size > 0) {
		console.warn(`Admin: ${names.users} is ignored, because Supabase Auth is set up.`);
	}
	if (parsedUsers.skipped > 0) {
		console.warn(
			`Admin: ${parsedUsers.skipped} entries in ${names.users} have no address or no password hash, and do not count.`
		);
	}
	if (!ready) console.warn(`Admin: closed, missing ${missing.join(', ')}.`);

	function mayLogIn(email) {
		return mayManage(email, settings.allowList);
	}

	// Loaded only for Supabase Auth, so a product without a database does not
	// need the Supabase packages.
	let supabaseModules;
	function supabase() {
		supabaseModules ??= Promise.all([import('@supabase/ssr'), import('@supabase/supabase-js')]);
		return supabaseModules;
	}

	/** The login client for this request. The cookie belongs to the admin path only, and no script in the browser needs it. */
	async function authClient(cookies) {
		const [{ createServerClient }] = await supabase();
		return createServerClient(settings.supabaseUrl, settings.anonKey, {
			cookies: {
				getAll: () => cookies.getAll(),
				setAll: (toSet) => {
					for (const { name, value, options: cookieOptions } of toSet) {
						cookies.set(name, value, {
							...cookieOptions,
							path: paths.base,
							httpOnly: true,
							sameSite: 'lax'
						});
					}
				}
			}
		});
	}

	/**
	 * Who is signed in with this cookie, or null. `getClaims` checks the
	 * token's signature and refreshes an expired one. An address no longer on
	 * the allow list does not count, even with a valid session: that is how
	 * someone's access is taken away.
	 *
	 * Supabase Auth only. With HTTP Basic it is always null: the hook sets
	 * `event.locals.admin`, and the browser sends the password only under the
	 * admin path, so a remote function never gets it.
	 */
	async function currentAdmin(cookies) {
		if (!ready || method !== 'supabase') return null;
		const { data, error } = await (await authClient(cookies)).auth.getClaims();
		if (error || !data) return null;
		const email = data.claims.email;
		return typeof email === 'string' && mayLogIn(email) ? { email: normaliseEmail(email) } : null;
	}

	const attempts = createAttemptCounter();
	const verified = new Map();

	/**
	 * Who this `Authorization` header belongs to, or null. A checked header is
	 * remembered for a few minutes by its SHA-256, never as it is.
	 */
	function headerKey(header) {
		return createHash('sha256').update(header).digest('base64url');
	}

	/** A header checked in the last few minutes, without scrypt. */
	function knownAdmin(header) {
		const known = verified.get(headerKey(header));
		return known && known.until > Date.now() ? { email: known.email } : null;
	}

	async function basicAdmin(header) {
		const credentials = parseBasicAuth(header);
		if (!credentials) return null;
		const hash = settings.users?.get(credentials.email);
		if (!(await verifyPassword(credentials.password, hash))) return null;
		if (verified.size > 1000) verified.clear();
		verified.set(headerKey(header), {
			email: credentials.email,
			until: Date.now() + VERIFIED_FOR_MS
		});
		return { email: credentials.email };
	}

	function clientAddress(event) {
		try {
			return event.getClientAddress();
		} catch {
			return 'unknown';
		}
	}

	function withHeaders(response) {
		for (const [name, value] of Object.entries(ADMIN_HEADERS)) response.headers.set(name, value);
		return response;
	}

	/** The hook for HTTP Basic: the browser asks for the password itself, there is no login screen. */
	async function handleBasic(event, resolve) {
		const realm = options.realm ?? 'Admin';
		// Closed: no password window, because no password can open it.
		if (!ready) {
			const text = [options.responses?.closed, missing.join(', ')].filter(Boolean).join(' ');
			return refusal('unauthorized', { unauthorized: text });
		}

		const request = {
			url: event.url,
			method: event.request.method,
			origin: event.request.headers.get('origin'),
			paths
		};
		// Logging out never checks the password the browser still sends.
		if (basicDecision({ ...request, signedIn: false }).kind === 'logout') {
			return refusal('logout', options.responses, realm);
		}

		const header = event.request.headers.get('authorization');
		let admin = header ? knownAdmin(header) : null;
		if (header && !admin) {
			// Counted before the slow check, so attempts sent at the same time
			// cannot all get past the limit; taken back when it was right.
			const ip = clientAddress(event);
			if (attempts.blocked(ip)) return refusal('rate_limited', options.responses, realm);
			attempts.fail(ip);
			admin = await basicAdmin(header);
			if (admin) attempts.undo(ip);
		}
		if (admin) event.locals.admin = admin;

		const decision = basicDecision({ ...request, signedIn: !!admin });
		if (decision.kind !== 'pass') return refusal(decision.kind, options.responses, realm);
		return withHeaders(await resolve(event));
	}

	/** The hook for hooks.server.ts. Combine it with others through `sequence`. */
	async function handle({ event, resolve }) {
		if (!isAdminPath(event.url.pathname, paths)) return resolve(event);
		if (basic) return handleBasic(event, resolve);

		const admin = await currentAdmin(event.cookies);
		if (admin) event.locals.admin = admin;

		const decision = adminDecision({
			url: event.url,
			method: event.request.method,
			contentType: event.request.headers.get('content-type'),
			origin: event.request.headers.get('origin'),
			signedIn: !!admin,
			paths
		});
		// SvelteKit turns this redirect into the right answer for a page load
		// and for a form with use:enhance. It has no content that could end up
		// in a frame, a search engine or a cache.
		if (decision.kind === 'redirect') {
			const { redirect } = await import('@sveltejs/kit');
			redirect(303, decision.location);
		}

		return decision.kind === 'pass'
			? withHeaders(await resolve(event))
			: refusal(decision.kind, options.responses);
	}

	/**
	 * An address not on the list gets the same outcome as a wrong password,
	 * and Supabase is not called. So the screen gives away nothing about who
	 * has access.
	 */
	async function signIn(cookies, email, password) {
		if (!ready || method !== 'supabase') return 'missing_setting';
		if (!mayLogIn(email) || !password) return 'invalid_credentials';
		const { error } = await (await authClient(cookies)).auth.signInWithPassword({
			email: normaliseEmail(email),
			password
		});
		if (error && error.status !== 429 && error.code !== 'invalid_credentials') {
			console.error('Admin sign in failed:', error.message);
		}
		return signInOutcome(error);
	}

	/**
	 * Sends a link to set a password, the first time or when it is forgotten.
	 * Supabase only mails a user that exists, so someone on the list who is no
	 * user yet is created first, without a password. The outcome is the same
	 * for every address, and only one on the list gets a mail.
	 *
	 * The link goes to the project's own password screen, which uses it only
	 * once the password is saved.
	 */
	async function sendPasswordLink(cookies, email, origin) {
		if (!normaliseEmail(email).includes('@')) return 'invalid_email';
		if (!ready || method !== 'supabase' || !mayLogIn(email)) return 'ok';
		if (!settings.serviceRoleKey) {
			console.error(`Sending password link failed: ${names.serviceRoleKey} is missing.`);
			return 'send_failed';
		}

		const [, { createClient }] = await supabase();
		const service = createClient(settings.supabaseUrl, settings.serviceRoleKey, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const { error: createError } = await service.auth.admin.createUser({
			email: normaliseEmail(email),
			email_confirm: true
		});
		// Existing already is exactly right.
		if (createError && createError.code !== 'email_exists') {
			console.error('Creating admin user failed:', createError.message);
			return linkOutcome(createError);
		}
		const { error } = await (await authClient(cookies)).auth.resetPasswordForEmail(normaliseEmail(email), {
			redirectTo: origin + paths.password
		});
		if (error) console.error('Sending password link failed:', error.message);
		return linkOutcome(error);
	}

	/**
	 * Saves a new password, with the link from the mail (`tokenHash` or `code`)
	 * or while signed in. The password is checked first: a link works only
	 * once, so it is spent only when the rest is right.
	 */
	async function setPassword(cookies, { tokenHash = '', code = '', password, repeat }) {
		const problem = passwordProblem(password, repeat);
		if (problem) return problem;
		if (!ready || method !== 'supabase') return 'missing_setting';

		const client = await authClient(cookies);
		if (tokenHash || code) {
			const { data, error } = tokenHash
				? await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
				: await client.auth.exchangeCodeForSession(code);
			if (error || !mayLogIn(data.user?.email ?? '')) {
				if (!error) await client.auth.signOut({ scope: 'local' });
				return 'link_invalid';
			}
		} else if (!(await currentAdmin(cookies))) {
			return 'not_signed_in';
		}

		const { error } = await client.auth.updateUser({ password });
		const outcome = passwordOutcome(error);
		if (outcome === 'save_failed') console.error('Saving password failed:', error.message);
		return outcome;
	}

	/** Supabase Auth only. With HTTP Basic, logging out is a link to `paths.logout`. */
	async function signOut(cookies) {
		if (ready && method === 'supabase') await (await authClient(cookies)).auth.signOut({ scope: 'local' });
	}

	return {
		method,
		paths,
		handle,
		currentAdmin,
		mayLogIn,
		missingSettings: () => [...missing],
		signIn,
		sendPasswordLink,
		setPassword,
		signOut
	};
}
