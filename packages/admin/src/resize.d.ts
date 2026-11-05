/** `webp` for images on the site; `mail` (JPEG, PNG kept) for images in an email. */
export type ImageFormat = 'webp' | 'mail';

export interface ResizeOptions {
	/** The maximum width for this kind of image, in pixels. */
	maxWidth: number;
	format?: ImageFormat;
	/** 0 to 1, for webp and JPEG. 0.85 by default. */
	quality?: number;
}

export interface ResizePlan {
	width: number;
	height: number;
	type: 'image/webp' | 'image/jpeg' | 'image/png';
	extension: 'webp' | 'jpg' | 'png';
}

export const SKIP_BELOW_BYTES: number;
export function keepsAsIs(type: string): boolean;
export function mustConvert(type: string, format: ImageFormat): boolean;
export function targetType(type: string, format: ImageFormat): ResizePlan['type'];
export function resizePlan(
	image: { type: string; size: number; width: number; height: number },
	options: { maxWidth: number; format?: ImageFormat }
): ResizePlan | null;
export function renamed(name: string, extension: string): string;
export function resizeImage(file: File, options: ResizeOptions): Promise<File>;
export function resizeFormFiles(
	formData: FormData,
	field: string,
	options: ResizeOptions
): Promise<void>;
