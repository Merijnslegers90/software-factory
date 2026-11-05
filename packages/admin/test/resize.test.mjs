import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	keepsAsIs,
	mustConvert,
	renamed,
	resizePlan,
	SKIP_BELOW_BYTES,
	targetType
} from '../src/resize.js';

// F-0008: images are resized in the browser before upload, to a fixed width per kind.

const MB = 1024 * 1024;

test('keepsAsIs leaves SVG, GIF and what is no image alone', () => {
	assert.equal(keepsAsIs('image/svg+xml'), true);
	assert.equal(keepsAsIs('image/gif'), true);
	assert.equal(keepsAsIs('application/pdf'), true);
	assert.equal(keepsAsIs(''), true);
	for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']) {
		assert.equal(keepsAsIs(type), false, type);
	}
});

test('targetType: webp for the site, JPEG for mail with PNG kept for transparency', () => {
	assert.equal(targetType('image/jpeg', 'webp'), 'image/webp');
	assert.equal(targetType('image/png', 'webp'), 'image/webp');
	assert.equal(targetType('image/jpeg', 'mail'), 'image/jpeg');
	assert.equal(targetType('image/webp', 'mail'), 'image/jpeg');
	assert.equal(targetType('image/png', 'mail'), 'image/png');
});

test('resizePlan leaves an image alone that is narrow enough and small', () => {
	const small = { type: 'image/jpeg', size: SKIP_BELOW_BYTES, width: 800, height: 600 };
	assert.equal(resizePlan(small, { maxWidth: 1200 }), null);
});

test('resizePlan scales a wide image down to the width, in proportion', () => {
	const photo = { type: 'image/jpeg', size: 4 * MB, width: 4032, height: 3024 };
	assert.deepEqual(resizePlan(photo, { maxWidth: 2000 }), {
		width: 2000,
		height: 1500,
		type: 'image/webp',
		extension: 'webp'
	});
	assert.deepEqual(resizePlan(photo, { maxWidth: 1200, format: 'mail' }), {
		width: 1200,
		height: 900,
		type: 'image/jpeg',
		extension: 'jpg'
	});
});

test('resizePlan compresses a narrow but heavy image without making it larger', () => {
	const heavy = { type: 'image/png', size: 3 * MB, width: 900, height: 900 };
	assert.deepEqual(resizePlan(heavy, { maxWidth: 1200, format: 'mail' }), {
		width: 900,
		height: 900,
		type: 'image/png',
		extension: 'png'
	});
});

test('resizePlan never plans a GIF or an SVG', () => {
	assert.equal(
		resizePlan({ type: 'image/gif', size: 5 * MB, width: 3000, height: 2000 }, { maxWidth: 1000 }),
		null
	);
	assert.equal(
		resizePlan(
			{ type: 'image/svg+xml', size: 2 * MB, width: 3000, height: 2000 },
			{ maxWidth: 1000 }
		),
		null
	);
});

test('renamed gives the new extension and a name when there is none', () => {
	assert.equal(renamed('IMG_0001.HEIC', 'webp'), 'IMG_0001.webp');
	assert.equal(renamed('logo.final.png', 'png'), 'logo.final.png');
	assert.equal(renamed('.jpg', 'jpg'), 'image.jpg');
});

test('mail never sends a webp or AVIF as it is, however small', () => {
	assert.equal(mustConvert('image/webp', 'mail'), true);
	assert.equal(mustConvert('image/avif', 'mail'), true);
	assert.equal(mustConvert('image/jpeg', 'mail'), false);
	assert.equal(mustConvert('image/png', 'mail'), false);
	assert.equal(mustConvert('image/webp', 'webp'), false);
	const small = { type: 'image/webp', size: 200 * 1024, width: 600, height: 400 };
	assert.deepEqual(resizePlan(small, { maxWidth: 1200, format: 'mail' }), {
		width: 600,
		height: 400,
		type: 'image/jpeg',
		extension: 'jpg'
	});
	assert.equal(resizePlan(small, { maxWidth: 1200 }), null);
});
