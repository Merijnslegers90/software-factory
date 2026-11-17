export const MAX_FILE_BYTES: number;
export const BRANCH_PREFIX: 'admin/';
export function parseRepo(value: string | null | undefined): { owner: string; name: string; full: string } | null;
export function missingGitHubSettings(
	settings: { token?: string; repo?: string },
	names: { token: string; repo: string }
): string[];
export function mayWrite(path: string, allowedPaths: readonly string[]): boolean;
export function branchName(key: string): string | null;
export function filesProblem(files: readonly ProposedFile[] | undefined, allowedPaths: readonly string[]): 'not-allowed' | null;
export function commitMessage(input: { title?: string; changedBy?: string }): string;
export function outcomeFromStatus(status: number, remaining?: string | null): 'key-refused' | 'conflict' | 'unavailable';
export function decodeContent(base64: string): string;
export function encodePath(path: string): string;

/** A file to write; `content: null` deletes it. */
export interface ProposedFile {
	path: string;
	content: string | null;
}
