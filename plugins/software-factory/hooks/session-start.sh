#!/usr/bin/env bash
# Prepares a fresh Claude Code cloud session, so `lint`, `check` and the tests
# run straight away. Locally it does nothing: there the project is set up
# already. It never fails the session; whatever it cannot do, it says.
set -uo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Only for projects on the factory stack (F-0002).
[ -f package.json ] && [ -f pnpm-lock.yaml ] || exit 0

done=()

# Dependencies, only when they are missing or the lockfile is newer.
if [ ! -d node_modules ] || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
	if pnpm install --frozen-lockfile >/dev/null 2>&1; then
		done+=("dependencies installed")
	else
		echo "Session start: pnpm install failed; run it yourself."
	fi
fi

# check and build want a .env; the fake values from .env.example are enough
# (F-0005).
if [ ! -f .env ] && [ -f .env.example ]; then
	cp .env.example .env && done+=(".env from .env.example")
fi

# Creates .svelte-kit/tsconfig.json, so a plain `npx vitest` works too.
if [ -d node_modules/@sveltejs/kit ]; then
	npx svelte-kit sync >/dev/null 2>&1 && done+=("svelte-kit sync")
fi

if [ ${#done[@]} -gt 0 ]; then
	joined=$(printf '%s, ' "${done[@]}")
	echo "Session ready: ${joined%, }."
fi
exit 0
