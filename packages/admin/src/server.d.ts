import type { Cookies } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { AdminPaths, AdminResponses, SettingNames } from './rules.js';

export interface AdminOptions {
	/** Read at runtime in the project's src/env.ts (F-0005). An empty string means missing. */
	supabaseUrl: string;
	anonKey: string;
	serviceRoleKey: string;
	/** `ADMIN_EMAILS`: addresses separated by commas, semicolons, spaces or new lines. */
	allowList: string;
	/** Where the admin lives and its two open screens. */
	paths?: Partial<AdminPaths>;
	/** The names `missingSettings()` reports, if the project's variables are named differently. */
	settingNames?: Partial<SettingNames>;
	/** The body of the hook's 401 and 403, in the project's own words. Without it the body is empty. */
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
	paths: AdminPaths;
	/** For hooks.server.ts. Sets `event.locals.admin` when someone is signed in. */
	handle: Handle;
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
	signOut(cookies: Cookies): Promise<void>;
}

export function createAdmin(options: AdminOptions): AdminLogin;
