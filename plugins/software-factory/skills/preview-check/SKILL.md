---
name: preview-check
description: Go through the Vercel preview of a change before saying it is ready: the pages it touches, HTTP status, runtime and browser errors, screenshots at phone and desktop width. Report what was seen and what could not be checked. Use this as the last step of the loop, once CI is green and the preview is built, and whenever someone asks to check a preview. Prepares the owner's review; never replaces it.
---

# Checking the preview

The last step of the loop (way of working, "The loop"). The agent goes
through the preview so the owner does not find the obvious things first. The
owner still opens the preview, tries what matters, and is the only one who
merges. Nothing in this skill approves, merges or promotes a deployment.

## 1. When

After CI is green and `factory-review` has no blocking findings left, and
Vercel has built the preview for the latest commit. A preview of an older
commit says nothing about this one.

## 2. Find the preview

With the Vercel connector:

- `list_teams`, then `list_deployments` with the commit SHA
  (`git rev-parse HEAD`) or the branch. Use the deployment whose
  `githubCommitSha` is the latest commit.
- `BUILDING` or `QUEUED`: wait and look again. `ERROR`: read the build logs,
  report the failure, and stop; that is a finding, not something to check
  around.

## 3. Get in

Previews are usually behind Vercel's login. `get_access_to_vercel_url` gives
a share link that sets a cookie and works for anyone who has it: a new link
for 23 hours, an existing one possibly without end. Open it first in
Playwright, so the browser has the cookie, then go to the pages. Never post
it in a pull request or anywhere public. `web_fetch_vercel_url` fetches one page without a browser: enough for
the status and the HTML, not for screenshots or browser errors.

If the browser cannot reach the preview (the network of the session blocks
it), say so, check what `web_fetch_vercel_url` can, and name everything that
needs a browser as not checked.

## 4. Which pages

- The pages the change touches: routes in the diff, and the pages that use a
  changed component (search for its imports).
- Every point under **Done when** in the spec that can be seen on the
  preview.
- The project's `CLAUDE.md` may say how a preview differs from production
  (features switched on, a query parameter); follow it.

## 5. What to check per page

- **HTTP status**: 200, or the redirect or 404 that is meant.
- **Browser errors**: open the page with Playwright, collect `pageerror` and
  console errors, and wait until the page is interactive. A page that renders
  but fails to hydrate looks fine in a screenshot and is broken.
- **Screenshots** at phone width (390 px) and desktop width (1280 px). Add
  dark mode, `prefers-reduced-motion` or JavaScript off when the change is
  about them. Look at every screenshot: overlap, text cut off, horizontal
  scroll, contrast.
- **What the spec asks**: try the behaviour itself (hover, focus, a click, a
  form with fake values), as far as it is safe on a preview.
- **Runtime errors** of the deployment, after the pages have been visited:
  `get_runtime_logs` with the project ID, the team ID, the deployment ID and
  level `error`; `get_runtime_errors` for the project gives them grouped.

## 6. What you do not check

Name it instead of guessing: a page behind the product's own login, a real
payment, an email that would be sent, an external service that is off without
its key on previews (F-0005), data that only production has. Do not log in
with real credentials and do not trigger anything with an effect outside the
preview.

## 7. Report

- **In the pull request**, as a comment, if there is one: the deployment (its
  `*.vercel.app` address, not the share link), the pages and widths you went
  through, what you saw per page, errors with the message, what you could not
  check and why, and which **Done when** points are left for the owner.
- **The screenshots** go to the owner in the session (a GitHub comment cannot
  carry them through the API). Name each file by page, width and mode.
- No pull request yet: the same report in the session.
- End with what the owner should still try on the preview themselves.

A finding on the preview is fixed like any other: a new commit, CI, the
review, and a new preview check on the new commit.
