# Heritage Teacher

## Start of every session
Read these before auditing or building:
- /Users/nikolashorvat/Documents/Obsidian Vault/Projects/Heritage-Teacher/spec.md
- /Users/nikolashorvat/Documents/Obsidian Vault/Projects/Heritage-Teacher/decisions.md

## Working rules
- Before adding a feature, check spec.md for what already exists. Do not duplicate or rebuild existing functionality.
- Show a plain-English plan before writing code on anything non-trivial.
- After multi-file edits, run `npx vite build` to confirm it still builds. Note: `tsc -b` currently fails on a pre-existing Supabase `never` typing issue, so don't treat tsc failures as your bug unless they're new and in files you touched.
- After shipping a feature, append a dated entry to /Users/nikolashorvat/Documents/Obsidian Vault/Projects/Heritage-Teacher/progress.md

## Hard rules (see decisions.md)
- No voice cloning, ever.
- The paper-signed consent attestation is honor-system. It records a claim, not evidence. Never describe it as stored consent proof.
- Don't change RLS for consent work.

## Stack
React 19 + Vite + Tailwind v4 + Supabase. Deployed on Vercel.
Repo: github.com/bhumu105/heritage-teacher
