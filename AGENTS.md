<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ayham's change workflow

- Before making a new set of changes, create a new branch from the current branch and push it. Preserve the starting branch so Ayham can return to that exact version.
- Commit and push completed changes to the new branch. Publish verified changes when the task requests publication; this project deploys production from `main` on Vercel Hobby.
- Do not rewrite the preserved branch or force-push history. Record the starting branch and commit in the handoff.
- Keep the zero-spend requirement: no paid plans, upgrades, or provider fallback.
