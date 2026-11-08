export interface AdminPaths {
	/** The admin path, `/admin` by default. */
	base: string;
	/** The login screen, `<base>/login` by default. */
	login: string;
	/** The password screen, `<base>/password` by default. */
	password: string;
}

export type AdminDecision =
	| { kind: 'pass' }
	| { kind: 'redirect'; location: string }
	| { kind: 'unauthorized' }
	| { kind: 'forbidden' };

/** The project's own words for the hook's 401 and 403. A missing one is an empty body. */
export interface AdminResponses {
	unauthorized?: string;
	forbidden?: string;
}

export interface SettingNames {
	supabaseUrl: string;
	anonKey: string;
	serviceRoleKey: string;
	allowList: string;
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
export function refusal(kind: 'unauthorized' | 'forbidden', responses?: AdminResponses): Response;
export function missingSettings(
	settings: {
		supabaseUrl: string;
		anonKey: string;
		allowList: Set<string>;
	},
	names: SettingNames
): string[];
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
