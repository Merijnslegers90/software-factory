# @merijnslegers/admin

The admin login of the software factory (F-0011), and image resizing in the
browser (F-0008). Each person signs in to `/admin` with their own email address
and password through Supabase Auth. Who may enter is an allow list the project
passes in, checked on every request.

The package holds the login, the access rules and the headers. The screens, the
components, the navigation and every sentence a user reads stay in the project,
in its own look and language.

```bash
pnpm add @merijnslegers/admin @supabase/ssr @supabase/supabase-js
```

| Import                        | What it holds                                                            | Where it runs |
| ----------------------------- | ------------------------------------------------------------------------ | ------------- |
| `@merijnslegers/admin/server` | `createAdmin`: the hook and the functions for the login screens          | server only   |
| `@merijnslegers/admin/rules`  | The pure rules: allow list, return path, Origin check, headers, password | anywhere      |
| `@merijnslegers/admin/resize` | `resizeImage` and `resizeFormFiles`                                      | browser       |

## Connecting a project

**The settings.** Four variables, declared in `src/env.ts` and read at runtime
(F-0005). The package reads none of them itself.

| Variable                    | What it is                                                              |
| --------------------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL`              | The project's Supabase address (F-0009)                                 |
| `SUPABASE_ANON_KEY`         | Only for logging in; it reads or writes no table                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Already there for the database (F-0004); here only to create a new user |
| `ADMIN_EMAILS`              | Who may enter: addresses separated by commas, spaces or new lines       |

Without one of them nobody gets in, the build still works, and
`missingSettings()` names what is missing so the login screen can show it.
A project whose variables are named differently passes `settingNames`.

**One module**, `src/lib/server/admin.ts`:

```ts
import { createAdmin } from '@merijnslegers/admin/server';
import {
	ADMIN_EMAILS,
	SUPABASE_ANON_KEY,
	SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_URL
} from '$app/env/private';

export const admin = createAdmin({
	supabaseUrl: SUPABASE_URL,
	anonKey: SUPABASE_ANON_KEY,
	serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
	allowList: ADMIN_EMAILS,
	// Optional: a project in Dutch names its screens in Dutch.
	paths: { login: '/admin/inloggen', password: '/admin/wachtwoord' },
	// Optional: the hook's 401 and 403 in the project's own words.
	responses: {
		unauthorized: 'U bent niet ingelogd.',
		forbidden: 'Dit verzoek kwam niet van onze eigen site.'
	}
});
```

**The hook**, in `src/hooks.server.ts`. With other hooks, combine them with
`sequence`.

```ts
import { admin } from '#lib/server/admin.js';

export const handle = admin.handle;
```

For everything under the admin path it:

- lets the login and password screens through without a session;
- sends a page, a link from a mail or a form without a session to the login
  screen, and back to where it was afterwards (only within the admin path);
- answers any other request without a session with a 401;
- answers a request that can change something with a 403 when it does not come
  from the site's own origin, even when SvelteKit's own check is off for a
  webhook;
- gives that 401 or 403 the text from `responses` as plain text, or an empty
  body without it, so the package chooses no words of its own;
- puts `ADMIN_HEADERS` on every response: no framing, `noindex`, `no-store`,
  a referrer that stays on the site.

Someone signed in is in `event.locals.admin` (`{ email }`). Declare it in
`src/app.d.ts`:

```ts
declare global {
	namespace App {
		interface Locals {
			admin?: import('@merijnslegers/admin/server').Admin;
		}
	}
}
```

A webhook belongs under `/api`, never under the admin path.

**Remote functions** are called at `/_app/remote/...`, outside the admin path,
so the hook does not guard them. An admin remote function checks
`admin.currentAdmin(cookies)` itself, first thing.

**The screens.** The login and password screens use `+page@.svelte`, so they do
not hang under the admin layout, which belongs to someone signed in. Their
actions call the package and turn its outcome into the project's own words:

```ts
// src/routes/admin/inloggen/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { safeReturnPath } from '@merijnslegers/admin/rules';
import { admin } from '#lib/server/admin.js';

const TEXT = {
	invalid_credentials: 'Dit e-mailadres en wachtwoord horen niet bij elkaar.',
	rate_limited: 'Te veel pogingen. Wacht een paar minuten.',
	missing_setting: 'Dit e-mailadres en wachtwoord horen niet bij elkaar.'
};

export const load = async ({ cookies, url }) => {
	const to = safeReturnPath(url.searchParams.get('to'), admin.paths);
	if (await admin.currentAdmin(cookies)) redirect(303, to);
	return { to, missing: admin.missingSettings() };
};

export const actions = {
	signIn: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const outcome = await admin.signIn(cookies, email, String(data.get('password') ?? ''));
		if (outcome !== 'ok')
			return fail(outcome === 'rate_limited' ? 429 : 400, { email, error: TEXT[outcome] });
		redirect(303, safeReturnPath(String(data.get('to') ?? ''), admin.paths));
	}
};
```

| Function                                   | Outcomes                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `signIn(cookies, email, password)`         | `ok`, `invalid_credentials`, `rate_limited`, `missing_setting`                                                                     |
| `sendPasswordLink(cookies, email, origin)` | `ok`, `invalid_email`, `rate_limited`, `send_failed`                                                                               |
| `setPassword(cookies, input)`              | `ok`, `password_too_short`, `passwords_differ`, `link_invalid`, `not_signed_in`, `weak_password`, `save_failed`, `missing_setting` |
| `signOut(cookies)`                         | nothing                                                                                                                            |

Some outcomes say nothing on purpose:

- An address that is not on the list gets `invalid_credentials`, just like a
  wrong password, and Supabase is not called.
- `sendPasswordLink` answers `ok` for every valid address, and only one on the
  list gets a mail.

So no screen gives away who has access.

**A password link** works for a first password and a forgotten one alike:

- `sendPasswordLink` creates the user if they do not exist yet. You never create
  one by hand.
- On the password screen, `readPasswordLink(url)` reads the link in `load` and
  puts it in the form.
- `setPassword` uses the link only once the password is saved, because mail
  programs and virus scanners open links in advance.
- Both kinds of link work: `token_hash` (your own mail template, any browser)
  and `code` (Supabase's default template, only in the browser that asked for
  it).
- Someone signed in sets a new password on the same screen, without a link.
- A password is at least `PASSWORD_MIN_LENGTH` (10) characters.

## Settings in Supabase

Under Authentication:

- **URL Configuration, Redirect URLs:** the password screen on the production
  domain, such as `https://www.<domain>/admin/password`, and on the previews.
  - Mind `www`: the link is built from the address the person is on.
  - Supabase replaces an address that is not listed by the Site URL, and then
    the link does not work.
- **"Allow new users to sign up"** may be off. The package creates users with
  the `service_role` key, which does not look at it.
- **Emails, SMTP Settings:** your own mail server, through Resend
  (`smtp.resend.com`, port 465, user `resend`, an API key of its own as
  password). Without it, Supabase only mails members of its own organisation, a
  few per hour, and you cannot change the templates.
- **Emails, template "Reset password":** the link as
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}` instead of
  `{{ .ConfirmationURL }}`. It then goes straight to your own screen and is used
  only on saving.

## Resizing images

In the browser, before the upload (F-0008). The project sets the width and the
format per kind of image, in one place:

```ts
import { resizeFormFiles, resizeImage } from '@merijnslegers/admin/resize';

const SCREENSHOT = { maxWidth: 2000 }; // webp, for the site
const MAIL_PHOTO = { maxWidth: 1200, format: 'mail' } as const; // JPEG, PNG kept

await resizeFormFiles(formData, 'images', SCREENSHOT);
const photo = await resizeImage(file, MAIL_PHOTO);
```

- **`webp`** (the default) for images on the site.
- **`mail`** for images in an email. Many mail clients (Outlook) do not show
  webp, so the image becomes JPEG, and a PNG stays PNG because it often holds
  transparency.
- A phone photo stays upright (its EXIF orientation).
- An image that is already narrow enough and under 1 MB is left alone.
- SVG and GIF are never drawn again.
- When the browser cannot do it, or the result is not smaller, the original
  goes and the server decides. With `mail`, a webp or AVIF is always turned
  into JPEG, even when that is larger.
- A browser without `OffscreenCanvas` draws on an ordinary canvas instead.

## Tests

The rules and the resize plan are pure; `npm test` at the repo root runs their
tests. A project's own tests use the same rules without Supabase, for instance
for its own screen names:

```ts
// F-0011
import { adminPaths, safeReturnPath } from '@merijnslegers/admin/rules';

const paths = adminPaths({ login: '/admin/inloggen', password: '/admin/wachtwoord' });

it('never sends you back to the login screen', () => {
	expect(safeReturnPath('/admin/inloggen', paths)).toBe('/admin');
});
```
