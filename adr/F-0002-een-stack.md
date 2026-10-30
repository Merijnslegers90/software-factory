# F-0002: Eén stack voor elk product

- **Status:** aangenomen
- **Datum:** september 2026

## Context

Het tweede product is op dezelfde stack gebouwd als het eerste, en dat
maakte overnemen makkelijk: de inlog, het migratiescript, de CI en het
verkleinen van afbeeldingen kwamen zo mee. Gedeelde skills, pakketten en een
gedeelde workflow werken alleen als die stack vastligt. Een product op een
andere stack past er maar half in.

## Besluit

- **Applicatie:** SvelteKit 2 met Svelte 5 (runes), TypeScript en Tailwind
  CSS 4, met `adapter-vercel`.
- **Data:** Supabase: Postgres, Storage en, waar er een inlog is, Auth.
- **Hosting:** Vercel. Een preview per pull request, productie bij een push
  naar `main`.
- **Gereedschap:** pnpm en Node 22; prettier en eslint; vitest voor
  unit-tests, Playwright voor end-to-end-tests.
- **Vaste scripts** in `package.json`: `lint`, `check`, `test`, `build`, en
  `test:e2e` als het project end-to-end-tests heeft. De CI roept ze bij die
  namen aan.

## Gevolgen

- Gedeelde pakketten en de workflow mogen van deze stack uitgaan.
- Een product dat iets anders nodig heeft, schrijft een projectbesluit met
  "Wijkt af van: F-0002" en draagt zelf wat de fabriek dan niet levert.
- Een grote upgrade (een nieuwe SvelteKit, een andere Node) gaat eerst door
  de gedeelde pakketten en de workflow, en daarna door de projecten.

## In de code

- `.github/workflows/kwaliteit.yml` roept de vaste scripts aan.
- `packages/config` (nog te bouwen): eslint, prettier, tsconfig en vitest.
