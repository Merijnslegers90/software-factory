export interface AdminPaths {
	/** The admin path, `/admin` by default. */
	base: string;
	/** The login screen, `<base>/login` by default. */
	login: string;
	/** The password screen, `<base>/password` by default. */
	password: string;
	/** HTTP Basic: the path that makes the browser forget its password, `<base>/logout` by default. */
	logout: string;
}

export type LoginMethod = 'supabase' | 'basic';

export type BasicDecision =
	| { kind: 'pass' }
	| { kind: 'challenge' }
	| { kind: 'logout' }
	| { kind: 'forbidden' };

export interface AttemptCounter {
	blocked(key: string): boolean;
	fail(key: string): void;
	clear(key: string): boolean;
}

export type AdminDecision =
	| { kind: 'pass' }
	| { kind: 'redirect'; location: string }
	| { kind: 'unauthorized' }
	| { kind: 'forbidden' };

/** The project's own words for the hook's refusals. A missing one is an empty body. */
export interface AdminResponses {
	/** 401: not signed in. */
	unauthorized?: string;
	/** 403: a change that did not come from the site itself. */
	forbidden?: string;
	/** HTTP Basic: the 401 of the logout path. Falls back to `unauthorized`. */
	loggedOut?: string;
	/** HTTP Basic: the 429 after too many wrong passwords. */
	rateLimited?: string;
	/** HTTP Basic: put before the names of the missing settings while the admin is closed. */
	closed?: string;
}

export interface SettingNames {
	supabaseUrl: string;
	anonKey: string;
	serviceRoleKey: string;
	allowList: string;
	users: string;
}

export const PASSWORD_MIN_LENGTH: number;
export const ADMIN_HEADERS: Readonly<Record<string, string>>;

export function adminPaths(paths?: Partial<AdminPaths>): AdminPaths;
export function decodePath(pathname: string): string | null;
export function isAdminPath(pathname: string, paths: AdminPaths): boolean;
export function isOpenPath(pathname: string, paths: AdminPaths): boolean;
export function normaliseEmail(email: string | null | undefined): string;
export function parseAllowList(list: string | null | undefined): Set<string>;
export function mayManage(email: string | null | undefined, allowList: Set<string>): boolean;
export function passwordProblem(
	password: string,
	repeat: string
): 'password_too_short' | 'passwords_differ' | null;
export function safeReturnPath(to: string | null | undefined, paths: AdminPaths): string;
export function loginAddress(from: URL, paths: AdminPaths): string;
export function fromOtherSite(method: string, origin: string | null, ownOrigin: string): boolean;
export function adminDecision(request: {
	url: URL;
	method: string;
	contentType: string | null;
	origin: string | null;
	signedIn: boolean;
	paths: AdminPaths;
}): AdminDecision;
export function refusal(
	kind: 'unauthorized' | 'forbidden' | 'challenge' | 'logout' | 'rate_limited',
	responses?: AdminResponses,
	realm?: string
): Response;
export function isPasswordHash(value: string | null | undefined): boolean;
export function parseUsers(list: string | null | undefined): {
	users: Map<string, string>;
	skipped: number;
};
export function loginMethod(settings: {
	supabaseUrl?: string;
	anonKey?: string;
	users?: Map<string, string>;
}): LoginMethod | null;
/** A setting that is undefined is a login the project does not offer, and is not named. */
export function missingSettings(
	settings: {
		supabaseUrl?: string;
		anonKey?: string;
		allowList?: Set<string>;
		users?: Map<string, string>;
	},
	names: SettingNames
): string[];
export function parseBasicAuth(
	header: string | null | undefined
): { email: string; password: string } | null;
export function basicDecision(request: {
	url: URL;
	method: string;
	origin: string | null;
	signedIn: boolean;
	paths: AdminPaths;
}): BasicDecision;
export function createAttemptCounter(options?: {
	limit?: number;
	windowMs?: number;
	now?: () => number;
}): AttemptCounter;
export function signInOutcome(
	error: { status?: number; code?: string } | null
): 'ok' | 'rate_limited' | 'invalid_credentials';
export function linkOutcome(
	error: { status?: number; code?: string } | null
): 'ok' | 'rate_limited' | 'send_failed';
export function passwordOutcome(
	error: { status?: number; code?: string } | null
): 'ok' | 'weak_password' | 'save_failed';
export function readPasswordLink(url: URL): { tokenHash: string; code: string; linkError: boolean };
