# Financial RAG Advisor Demo

A full-stack portfolio project demonstrating retrieval-augmented financial product discovery,
stateful investor-preference memory, and evidence-grounded report generation.

The application is built as a TypeScript monorepo with:

- React and Vite
- Node.js and Express
- SuperTokens authentication
- PostgreSQL and pgvector
- Runtime-validated structured LLM output

## Safety and scope

This project uses fictional products, prospectuses, regulations, and investor profiles. It is an
engineering demonstration, not financial advice. Generated responses must identify assumptions,
avoid guaranteed outcomes, and ground product claims in retrieved demo documents.

## Current status

The generic application framework has been extracted into a new repository without the source
repository's Git history, runtime assets, migration data, or private evaluation fixtures. The
finance-domain contracts, fixture seed, retrieval evaluation, advisor prompt, and report UI are the
next implementation milestones.

## Local development

Requirements:

- Node.js 22 or newer
- pnpm 10.18.0
- Docker for local PostgreSQL, pgvector, and SuperTokens

```bash
pnpm install
pnpm db:up
pnpm dev
```

Copy `.env.example` to your own untracked `.env` and fill in local values. Never commit provider
keys or database credentials.

## Planned demonstration

1. Retrieve fictional funds, deposit products, and regulations from pgvector.
2. Remember normalized investor preferences within an isolated session.
3. Explain product matches using retrieved prospectus evidence.
4. Generate a structured personalized recommendation report with risk warnings and source
   references.
