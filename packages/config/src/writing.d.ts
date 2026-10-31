/** The em dash, U+2014. */
export const EM_DASH: string;

/** The file extensions that are checked by default. */
export const DEFAULT_EXTENSIONS: RegExp;

/** Lines of one text with a forbidden em dash, as "path:line: text". */
export function emDashLines(file: string, text: string, allow?: RegExp[]): string[];

export interface FindOptions {
	/** The project root; every other path is relative to it. */
	root: string;
	/** Folders to walk, such as "src", "scripts" and "docs". */
	dirs?: string[];
	/** Single files, such as "README.md". */
	files?: string[];
	/** Patterns for dashes that may stay, such as a separator in page titles. */
	allow?: RegExp[];
	/** Names or relative paths to leave out. */
	skip?: string[];
	/** Which files to read. */
	extensions?: RegExp;
}

/** Every forbidden em dash in the project, as "path:line: text". */
export function findEmDashes(options: FindOptions): string[];
