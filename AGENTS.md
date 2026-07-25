# AGENTS.md

## Project

`rag-advisor-demo` is a public-ready finance-domain RAG demo built as a pnpm/Turbo TypeScript
monorepo. It uses React, Express, SuperTokens, PostgreSQL, and pgvector.

Use `pnpm`, never npm or yarn.

## Privacy and safety

- Never copy Git history, fixtures, conversations, evaluations, assets, IDs, or documentation from
  any private source repository.
- Never add names or identifiers from private characters, users, sessions, source systems, or
  datasets.
- Do not read, print, or modify `.env`. Document variable names in `.env.example`.
- All finance products and customer profiles must be fictional and visibly marked as demo data.
- Do not present the application as a licensed adviser or its output as real financial advice.
- Preserve deterministic fixture IDs.

## Data and AI operations

- PostgreSQL is hosted on Neon in deployed environments.
- Treat migrations and seed commands as operationally sensitive.
- Every seed/import command must default to a no-write dry run.
- Use `pnpm preflight:finance` for the local, no-write finance fixture checkpoint.
- Use `pnpm eval:finance` for deterministic, provider-free finance suitability evaluation.
- Use `pnpm seed:finance` for the database-aware no-write fixture checkpoint and pass `-- --apply`
  only after reviewing its report. If multiple local users exist, select the intended owner with
  `--owner-user-id=<id>`; never persist that runtime identifier in repository fixtures.
- Use `pnpm smoke:finance -- --owner-user-id=<id>` for the database-aware, no-write live finance
  checkpoint. Review its planned writes and provider calls before adding `--apply`. The command
  uses a deterministic fictional Session/Profile and never persists the runtime owner in fixtures.
- Use `pnpm db:check` for credential-safe, read-only database verification.
- Do not write to Neon or call embedding/LLM APIs until the dry-run report has been reviewed.
- Prefer incremental, resumable embedding operations.
- Keep provider-specific behavior behind the server LLM/embedding service.
- Use fixed retrieval fixtures and deterministic evaluations before human-quality review.

## Repository skills

- Use `.agents/skills/rag-change` for retrieval, embeddings, prompts, LLM behavior, memory, reports,
  or RAG evaluation.
- Use `.agents/skills/tooling-upgrade` for package scripts, dependencies, TypeScript, CI, Docker, or
  workspace configuration.

## Verification

Run the narrowest relevant check first, followed by:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`

Do not commit generated data, logs, caches, build output, credentials, or database dumps.
