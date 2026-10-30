# F-0008: Images are resized in the browser before upload

- **Status:** accepted
- **Date:** September 2026

## Context

A function on Vercel accepts about 4.5 MB per request. A photo from a phone is
a few megabytes, so untouched it does not even reach the server action, and
two photos in one form certainly do not. A large original in Storage then
costs bandwidth on every view, and on the Supabase free plan that is capped.

## Decision

- An image is resized in the browser before it is uploaded, to a fixed
  maximum width per kind of use (a photo in a mail, a screenshot on the site)
  and to a compact format.
- Only the resized file goes to the server action, which stores it in Storage
  under its own path.
- An image that an outsider must load goes into a public bucket (F-0004); the
  rest does not.

## Consequences

- The server never sees the original, and no original is kept. Should that
  ever be needed, it is a new decision.
- The widths per kind live in one place in the code, so a mail and the site do
  not each pick their own size.

## In the code

- The resizing in each project's admin. It becomes part of `packages/admin`.
