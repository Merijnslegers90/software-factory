// A small GitHub in memory, for the tests of github.js: refs, commits, trees
// as maps of path to text, files and pull requests. Only what the module uses.

import { createHash } from 'node:crypto';

const sha = (value) => createHash('sha1').update(JSON.stringify(value)).digest('hex');

export function fakeGitHub({ owner = 'acme', files = {} } = {}) {
	const trees = new Map();
	const commits = new Map();
	const refs = new Map();
	const pulls = [];
	const calls = [];
	let respond = null;

	function tree(map) {
		const id = sha(Object.entries(map).sort());
		trees.set(id, { ...map });
		return id;
	}
	const rootTree = tree(files);
	const root = sha(['root', rootTree]);
	commits.set(root, { tree: rootTree, parents: [] });
	refs.set('main', root);

	const json = (status, body) =>
		new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	async function fetch(url, init = {}) {
		const method = init.method ?? 'GET';
		const u = new URL(url);
		const path = decodeURIComponent(u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ''));
		const body = init.body ? JSON.parse(init.body) : null;
		calls.push({ method, path, search: u.search, body, headers: init.headers });
		if (respond) {
			const answer = respond({ method, path });
			if (answer) return answer;
		}
		let m;
		if (method === 'GET' && path === '') return json(200, { full_name: `${owner}/site` });
		if (method === 'GET' && (m = /^\/git\/ref\/heads\/(.+)$/.exec(path))) {
			return refs.has(m[1]) ? json(200, { object: { sha: refs.get(m[1]) } }) : json(404, {});
		}
		if (method === 'GET' && (m = /^\/git\/commits\/(\w+)$/.exec(path))) {
			const c = commits.get(m[1]);
			return c ? json(200, { sha: m[1], tree: { sha: c.tree } }) : json(404, {});
		}
		if (method === 'POST' && path === '/git/trees') {
			const map = { ...trees.get(body.base_tree) };
			for (const entry of body.tree) {
				if (entry.sha === null) {
					if (!(entry.path in map)) return json(422, {});
					delete map[entry.path];
				} else map[entry.path] = entry.content;
			}
			return json(201, { sha: tree(map) });
		}
		if (method === 'POST' && path === '/git/commits') {
			const id = sha([body.tree, body.parents, body.message, commits.size]);
			commits.set(id, { tree: body.tree, parents: body.parents, message: body.message });
			return json(201, { sha: id });
		}
		if (method === 'POST' && path === '/git/refs') {
			const name = body.ref.replace('refs/heads/', '');
			if (refs.has(name)) return json(422, {});
			refs.set(name, body.sha);
			return json(201, {});
		}
		if (method === 'PATCH' && (m = /^\/git\/refs\/heads\/(.+)$/.exec(path))) {
			const current = refs.get(m[1]);
			if (!body.force && !commits.get(body.sha).parents.includes(current)) return json(422, {});
			refs.set(m[1], body.sha);
			return json(200, {});
		}
		if (method === 'GET' && path === '/pulls') {
			const head = u.searchParams.get('head');
			const base = u.searchParams.get('base');
			const open = pulls.filter(
				(p) =>
					p.state === 'open' &&
					(!head || `${owner}:${p.head.ref}` === head) &&
					(!base || p.base.ref === base)
			);
			return json(200, open.toReversed());
		}
		if (method === 'POST' && path === '/pulls') {
			const pull = {
				number: pulls.length + 1,
				html_url: `https://github.com/${owner}/site/pull/${pulls.length + 1}`,
				title: body.title,
				body: body.body,
				state: 'open',
				head: { ref: body.head },
				base: { ref: body.base },
				updated_at: '2026-11-17T20:00:00Z'
			};
			pulls.push(pull);
			return json(201, pull);
		}
		if (method === 'GET' && (m = /^\/contents\/(.+)$/.exec(path))) {
			const map = trees.get(commits.get(refs.get(u.searchParams.get('ref'))).tree);
			if (m[1] in map) {
				return json(200, {
					type: 'file',
					encoding: 'base64',
					sha: sha(map[m[1]]),
					content: Buffer.from(map[m[1]]).toString('base64').replace(/(.{60})/g, '$1\n')
				});
			}
			const prefix = m[1] + '/';
			const inside = Object.keys(map).filter((p) => p.startsWith(prefix));
			if (!inside.length) return json(404, {});
			const names = [...new Set(inside.map((p) => p.slice(prefix.length).split('/')[0]))];
			return json(
				200,
				names.map((name) => ({
					name,
					path: prefix + name,
					type: inside.includes(prefix + name) ? 'file' : 'dir',
					sha: sha(name)
				}))
			);
		}
		return json(500, { message: `fake GitHub does not know ${method} ${path}` });
	}

	return {
		fetch,
		calls,
		pulls,
		refs,
		/** The files on a branch. */
		filesOn: (branch) => ({ ...trees.get(commits.get(refs.get(branch)).tree) }),
		commitOn: (branch) => commits.get(refs.get(branch)),
		/** Points an open pull request at another base. */
		retarget(number, base) {
			pulls[number - 1].base.ref = base;
		},
		/** Merges a pull request: main gets the branch's commit. */
		merge(number) {
			const pull = pulls[number - 1];
			refs.set('main', refs.get(pull.head.ref));
			pull.state = 'closed';
		},
		/** Answers the next calls itself while `fn` returns a Response. */
		answer(fn) {
			respond = fn;
		}
	};
}
