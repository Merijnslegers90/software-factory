// Resizes images in the browser before they are uploaded (F-0008). A function
// on Vercel accepts about 4.5 MB per request, and a photo from a phone is a few
// megabytes. The plan (what to do with which file) is pure and tested; the
// drawing itself needs a browser.

/** Leave an image alone that is already narrow enough and smaller than this: compressing it again only makes it worse. */
export const SKIP_BELOW_BYTES = 1024 * 1024;

/** SVG is not drawn on a canvas; a GIF would lose its animation. */
export function keepsAsIs(type) {
	return !/^image\//.test(type) || type === 'image/gif' || type === 'image/svg+xml';
}

/**
 * The type a resized image gets. `webp` for the site. `mail` for an image in an
 * email: many mail clients (Outlook) do not show webp, so it becomes JPEG, and
 * a PNG stays PNG because it often holds transparency (a logo) that turns
 * black in a JPEG.
 */
export function targetType(type, format) {
	if (format === 'mail') return type === 'image/png' ? 'image/png' : 'image/jpeg';
	return 'image/webp';
}

/**
 * Whether the original may not go as it is, whatever its size: a webp or AVIF
 * in a mail would not show in many mail clients.
 */
export function mustConvert(type, format) {
	return format === 'mail' && type !== 'image/jpeg' && type !== 'image/png';
}

const EXTENSIONS = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/**
 * What to do with an image of this type, size and width: null to keep the
 * original, or the size and type to draw it at.
 */
export function resizePlan({ type, size, width, height }, { maxWidth, format = 'webp' }) {
	if (keepsAsIs(type)) return null;
	if (width <= maxWidth && size <= SKIP_BELOW_BYTES && !mustConvert(type, format)) return null;
	const scale = Math.min(1, maxWidth / width);
	const target = targetType(type, format);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
		type: target,
		extension: EXTENSIONS[target]
	};
}

/** The file name with the extension of the new type; the server derives the storage path from it. */
export function renamed(name, extension) {
	return `${String(name).replace(/\.[^.]+$/, '') || 'image'}.${extension}`;
}

/**
 * Resizes one image. When it cannot (a format the browser cannot unpack, no
 * canvas) or the result is not smaller, the original goes and the server
 * decides.
 */
export async function resizeImage(file, { maxWidth, format = 'webp', quality = 0.85 }) {
	if (keepsAsIs(file.type)) return file;
	let bitmap;
	try {
		// from-image: otherwise an upright phone photo comes back lying down,
		// because the rotation is only in its EXIF data.
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const plan = resizePlan(
			{ type: file.type, size: file.size, width: bitmap.width, height: bitmap.height },
			{ maxWidth, format }
		);
		if (!plan) return file;

		const blob = await draw(bitmap, plan, plan.type === 'image/png' ? undefined : quality);
		// A browser that cannot write the type (webp in an older Safari) quietly
		// gives a PNG instead; then the original is the better choice.
		if (!blob || blob.type !== plan.type) return file;
		if (blob.size >= file.size && !mustConvert(file.type, format)) return file;
		return new File([blob], renamed(file.name, plan.extension), { type: plan.type });
	} catch (err) {
		console.error('Resizing failed, the original is used:', err);
		return file;
	} finally {
		bitmap?.close();
	}
}

async function draw(bitmap, plan, quality) {
	if (typeof OffscreenCanvas !== 'undefined') {
		const canvas = new OffscreenCanvas(plan.width, plan.height);
		const context = canvas.getContext('2d');
		if (!context) return null;
		context.drawImage(bitmap, 0, 0, plan.width, plan.height);
		return canvas.convertToBlob({ type: plan.type, quality });
	}
	const canvas = document.createElement('canvas');
	canvas.width = plan.width;
	canvas.height = plan.height;
	const context = canvas.getContext('2d');
	if (!context) return null;
	context.drawImage(bitmap, 0, 0, plan.width, plan.height);
	return new Promise((done) => canvas.toBlob(done, plan.type, quality));
}

/** Replaces the files in one field of a FormData by resized versions. */
export async function resizeFormFiles(formData, field, options) {
	const files = formData.getAll(field).filter((v) => v instanceof File && v.size > 0);
	formData.delete(field);
	for (const file of await Promise.all(files.map((f) => resizeImage(f, options)))) {
		formData.append(field, file);
	}
}
