// The admin login with Supabase Auth (F-0011). Server-only: the keys and the
// cookie stay on the server, the browser never talks to Supabase itself.
//
// The client with the anon key is only for logging in and reads or writes no
// table. The database stays with the service_role key, as everywhere (F-0004);
// that key is used here only to create a user on their first password link.
//
// The package reads no environment variable. The project reads them in its
// src/env.ts at runtime (F-0005) and passes them in; a missing one is an empty
// string, and then nobody gets in.

import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import {
	ADMIN_HEADERS,
	adminDecision,
	adminPaths,
	isAdminPath,
	linkOutcome,
	mayManage,
	missingSettings,
	normaliseEmail,
	parseAllowList,
	passwordOutcome,
	passwordProblem,
	signInOutcome
} from './rules.js';

const DEFAULT_NAMES = {
	supabaseUrl: 'SUPABASE_URL',
	anonKey: 'SUPABASE_ANON_KEY',
	serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
	allowList: 'ADMIN_EMAILS'
};

export function createAdmin(options) {
	const paths = adminPaths(options.paths);
	const settings = {
		supabaseUrl: options.supabaseUrl ?? '',
		anonKey: options.anonKey ?? '',
		serviceRoleKey: options.serviceRoleKey ?? '',
		allowList: parseAllowList(options.allowList)
	};
	const names = { ...DEFAULT_NAMES, ...options.settingNames };
	const missing = missingSettings(settings, names);
	const ready = missing.length === 0;

	function mayLogIn(email) {
		return mayManage(email, settings.allowList);
	}

	/** The login client for this request. The cookie belongs to the admin path only, and no script in the browser needs it. */
	function authClient(cookies) {
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
	 */
	async function currentAdmin(cookies) {
		if (!ready) return null;
		const { data, error } = await authClient(cookies).auth.getClaims();
		if (error || !data) return null;
		const email = data.claims.email;
		return typeof email === 'string' && mayLogIn(email) ? { email: normaliseEmail(email) } : null;
	}

	/** The hook for hooks.server.ts. Combine it with others through `sequence`. */
	async function handle({ event, resolve }) {
		if (!isAdminPath(event.url.pathname, paths)) return resolve(event);

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
		if (decision.kind === 'redirect') redirect(303, decision.location);

		const response =
			decision.kind === 'pass'
				? await resolve(event)
				: new Response(decision.kind === 'forbidden' ? 'Forbidden' : 'Unauthorized', {
						status: decision.kind === 'forbidden' ? 403 : 401
					});
		for (const [name, value] of Object.entries(ADMIN_HEADERS)) response.headers.set(name, value);
		return response;
	}

	/**
	 * An address not on the list gets the same outcome as a wrong password,
	 * and Supabase is not called. So the screen gives away nothing about who
	 * has access.
	 */
	async function signIn(cookies, email, password) {
		if (!ready) return 'missing_setting';
		if (!mayLogIn(email) || !password) return 'invalid_credentials';
		const { error } = await authClient(cookies).auth.signInWithPassword({
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
		if (!ready || !mayLogIn(email)) return 'ok';
		if (!settings.serviceRoleKey) {
			console.error(`Sending password link failed: ${names.serviceRoleKey} is missing.`);
			return 'send_failed';
		}

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
		const { error } = await authClient(cookies).auth.resetPasswordForEmail(normaliseEmail(email), {
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
		if (!ready) return 'missing_setting';

		const supabase = authClient(cookies);
		if (tokenHash || code) {
			const { data, error } = tokenHash
				? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
				: await supabase.auth.exchangeCodeForSession(code);
			if (error || !mayLogIn(data.user?.email ?? '')) {
				if (!error) await supabase.auth.signOut({ scope: 'local' });
				return 'link_invalid';
			}
		} else if (!(await currentAdmin(cookies))) {
			return 'not_signed_in';
		}

		const { error } = await supabase.auth.updateUser({ password });
		const outcome = passwordOutcome(error);
		if (outcome === 'save_failed') console.error('Saving password failed:', error.message);
		return outcome;
	}

	async function signOut(cookies) {
		if (ready) await authClient(cookies).auth.signOut({ scope: 'local' });
	}

	return {
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
