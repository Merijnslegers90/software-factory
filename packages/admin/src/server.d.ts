import type { Cookies } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { AdminPaths, AdminResponses, LoginMethod, SettingNames } from './rules.js';

/**
 * Read at runtime in the project's src/env.ts (F-0005). An empty string means
 * missing; leaving an option out means the project does not offer that login.
 * With `supabaseUrl` or `anonKey` filled the login is Supabase Auth, otherwise
 * with `users` filled it is HTTP Basic (F-0020).
 */
export interface AdminOptions {
	/** Supabase Auth. */
	supabaseUrl?: string;
	anonKey?: string;
	serviceRoleKey?: string;
	/** Supabase Auth: `ADMIN_EMAILS`, addresses separated by commas, semicolons, spaces or new lines. */
	allowList?: string;
	/** HTTP Basic: `ADMIN_USERS`, entries of `email:hash` from `npx @merijnslegers/admin hash`. */
	users?: string;
	/** HTTP Basic: the name the browser shows in its login window. `Admin` by default. */
	realm?: string;
	/** Where the admin lives and its two open screens. */
	paths?: Partial<AdminPaths>;
	/** The names `missingSettings()` reports, if the project's variables are named differently. */
	settingNames?: Partial<SettingNames>;
	/** The body of the hook's refusals, in the project's own words. Without it the body is empty. */
	responses?: AdminResponses;
}

export interface Admin {
	email: string;
}

export type SignInOutcome = 'ok' | 'invalid_credentials' | 'rate_limited' | 'missing_setting';
export type LinkOutcome = 'ok' | 'invalid_email' | 'rate_limited' | 'send_failed';
export type PasswordOutcome =
	| 'ok'
	| 'password_too_short'
	| 'passwords_differ'
	| 'link_invalid'
	| 'not_signed_in'
	| 'weak_password'
	| 'save_failed'
	| 'missing_setting';

export interface AdminLogin {
	/** The login in use, or null when settings are missing and nobody gets in. */
	method: LoginMethod | null;
	paths: AdminPaths;
	/** For hooks.server.ts. Sets `event.locals.admin` when someone is signed in. */
	handle: Handle;
	/** Supabase Auth only; with HTTP Basic always null, use `event.locals.admin`. */
	currentAdmin(cookies: Cookies): Promise<Admin | null>;
	mayLogIn(email: string): boolean;
	/** The names of the settings that are missing; empty when everything is there. */
	missingSettings(): string[];
	signIn(cookies: Cookies, email: string, password: string): Promise<SignInOutcome>;
	/** `ok` for every valid address, on the list or not; only one on the list gets a mail. */
	sendPasswordLink(cookies: Cookies, email: string, origin: string): Promise<LinkOutcome>;
	setPassword(
		cookies: Cookies,
		input: { tokenHash?: string; code?: string; password: string; repeat: string }
	): Promise<PasswordOutcome>;
	/** Supabase Auth only. With HTTP Basic, link to `paths.logout`. */
	signOut(cookies: Cookies): Promise<void>;
}

export function createAdmin(options: AdminOptions): AdminLogin;
