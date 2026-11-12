# @merijnslegers/analytics

The visitor numbers of the software factory (F-0015). It reads Vercel Web
Analytics on the server and turns the answers into totals, a series per day
or week and top lists, for a screen in the admin.

The package fetches and calculates. The screen, its words and its colours stay
in the project, in its own look and language.

```bash
pnpm add @merijnslegers/analytics
```

| Import                            | What it holds                                                  | Where it runs |
| --------------------------------- | -------------------------------------------------------------- | ------------- |
| `@merijnslegers/analytics/server` | `createAnalytics`: the call to Vercel, kept for an hour        | server only   |
| `@merijnslegers/analytics/rules`  | The pure rules: periods, change, series, top lists, shares     | anywhere      |

## Connecting a project

**The settings.** Three variables, declared in `src/env.ts` and read at
runtime (F-0005). The package reads none of them itself.

| Variable                      | What it is                                                 |
| ----------------------------- | ---------------------------------------------------------- |
| `VERCEL_ANALYTICS_TOKEN`      | A Vercel access token for the team, valid for a year       |
| `VERCEL_ANALYTICS_PROJECT_ID` | The Vercel project, `prj_...` (Project Settings, General)  |
| `VERCEL_ANALYTICS_TEAM_ID`    | The Vercel team, `team_...` (Team Settings, General)       |

The token: in Vercel, Account Settings, Tokens, create one with the team as
scope and an expiration of one year. It can do more than read (see F-0015), so
it goes only into the project's environment variables in Vercel, for
Production and Preview, never into the code or a chat.

**The server module**, for example `src/lib/server/analytics.ts`:

```ts
import { createAnalytics } from '@merijnslegers/analytics/server';
import {
	VERCEL_ANALYTICS_PROJECT_ID,
	VERCEL_ANALYTICS_TEAM_ID,
	VERCEL_ANALYTICS_TOKEN
} from '$app/env/private';

let analytics: ReturnType<typeof createAnalytics> | undefined;

// Made on first use, so a missing key never stops the build (F-0005).
export function bezoekers() {
	analytics ??= createAnalytics({
		token: VERCEL_ANALYTICS_TOKEN,
		projectId: VERCEL_ANALYTICS_PROJECT_ID,
		teamId: VERCEL_ANALYTICS_TEAM_ID
	});
	return analytics;
}
```

**The screen**, in `+page.server.ts`:

```ts
import { granularityFor, parsePeriod, periodRange, topList } from '@merijnslegers/analytics/rules';

export async function load({ url }) {
	const days = parsePeriod(url.searchParams.get('period'));
	const range = periodRange(days);
	const analytics = bezoekers();
	const [totals, before, series, pages] = await Promise.all([
		analytics.totals(range),
		analytics.totals(range.previous),
		analytics.series(range, granularityFor(days)),
		// Ask for more than you show: Vercel picks the top on its own measure.
		analytics.breakdown(range, 'requestPath', { limit: 50 })
	]);
	// Each is { ok: true, data } or { ok: false, reason }.
	return {
		days,
		totals,
		before,
		series,
		pages: pages.ok ? topList(pages.data, 'requestPath', { sortBy: 'pageviews' }) : []
	};
}
```

## What comes back

Every function returns `{ ok: true, data }` or `{ ok: false, reason }`; it
never throws. The project writes its own sentence for each reason:

| Reason                | When                                                        |
| --------------------- | ----------------------------------------------------------- |
| `no-key`              | The token or project id is empty. Nothing was sent.         |
| `key-refused`         | Vercel answered 401 or 403: the token expired or was revoked |
| `unavailable`         | 402, 429, 5xx, a network error, or no answer in 5 seconds   |
| `unexpected-response` | Any other answer, or one that does not look as expected     |

An answer is kept for an hour per server instance; a failure is not kept.

**Dimensions** for `breakdown`: `requestPath`, `route`, `referrerHostname`,
`utmSource`, `utmMedium`, `utmCampaign`, `deviceType`, `country`,
`browserName`, `osName`. Only production is counted, as in Vercel's dashboard.

**Top lists.** `topList(rows, dimension, { limit, sortBy })` sorts on visitors
or pageviews and puts Vercel's own "Others" group, with whatever falls beyond
the limit, in one row with `other: true` at the bottom. An empty referrer is
`key: ''`: a visit typed in directly, or from an app that sends no referrer.
`shares(rows, dimension)` gives each value's share in whole percent, adding up
to exactly 100.

**Periods.** `periodRange(days)` is the last 7, 30 or 90 days, today
included, with `previous` the same length before it. A range ends at the end
of the current hour, not at this very moment, so the same question within the
hour hits the cache instead of Vercel. `monthToDate()` is this
month so far, with the same days of the previous month. Days are UTC days,
as Vercel buckets them. `change(current, previous)` gives whole percent, or
`'new'` when there was nothing before.

## Not measuring the admin

The root layout keeps the admin out of the numbers with `beforeSend`, so the
people who run the product do not count themselves. See the skill
`setup-product` for the whole snippet.
