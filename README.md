# Grounded — Finance & Healthcare RAG Demo

**English** | [한국어](README.ko.md)

Grounded is a full-stack portfolio project that demonstrates how a shared RAG architecture can support two distinct business domains: financial-product exploration and healthcare-administration guidance.

It retrieves domain evidence and session memory relevant to the current request from PostgreSQL with pgvector, applies domain and role policies, and presents each generated answer together with citations, assumptions, missing information, and excluded evidence groups.

**[Open the live demo](https://rag-advisor-demo.onrender.com)**

> On the free Render tier, the first request after an idle period may take up to about a minute. A guest session is retained in a normal browser profile. Open an Incognito/InPrivate window to test the first-visit flow again.

## What this demo demonstrates

- Reuse of one persona-oriented RAG architecture across multiple business domains
- Separation of the active persona, user profile, session memory, domain documents, retrieval policies, and LLM orchestration
- Explicit context precedence: assumptions and corrections in the current request override the saved profile and retrieved memory
- Domain-isolated retrieval and role-aware evidence filtering for Finance and Healthcare Administration
- Response-level traceability through citations, assumptions, missing information, and excluded evidence groups
- Production-oriented public-demo controls, including authentication, quotas, concurrency limits, and server-side authorization

## Features

- **Finance:** exploration of fictional deposits, savings products, and funds; persistent investor-preference memory; suitability-aware filtering; evidence-grounded comparisons; and recommendation report generation
- **Healthcare Administration:** guidance based on fictional hospital policies for admission and discharge, appointment rescheduling, medical-record copy requests and privacy, billing inquiries, and HIS account and access procedures
- Korean and English UI and query support
- Streaming responses with structured LLM output validated at runtime

## Technology

- React, Vite, TypeScript
- Node.js, Express
- PostgreSQL, pgvector
- SuperTokens
- pnpm, Turbo
- Docker, Render, Neon

## Project origin and architecture reuse

This demo evolved from **Rita-Berenice**, a persona-oriented RAG framework originally designed to preserve long-term conversational context.

The original framework separates the active persona, user and session memory, domain knowledge, retrieval policies, and LLM orchestration. The Finance and Healthcare Administration workflows reuse these core layers without redesigning the retrieval and memory architecture.

The domain transition primarily required replacing or extending:

- Domain documents and fixtures
- Persona and user-profile schemas
- Suitability, role, access, and source policies
- Domain-specific retrieval filters
- Structured response schemas
- Finance and healthcare workflow components

This reuse demonstrates that the architecture can support domain-oriented assistants beyond its original character-chat use case.

Because the demo reuses concepts from the original framework, some UI and internal labels retain terms such as `Character` and `Lore`.

- `Character` represents a domain-specific assistant persona.
- `Lore` represents curated domain knowledge, reference material, and operating policies.
- Session memory represents user-specific context accumulated within the current workflow.

These concepts are treated as reusable domain abstractions rather than being limited to fictional-character conversations.

## Safety and scope

All financial products, customer profiles, hospitals, patient scenarios, and operating procedures are fictional and were created solely for this demo.

Only the finance-domain regulatory and educational content is derived from attributed Korean public sources, with snapshot dates recorded in metadata.

This application is an engineering demonstration. It does not provide financial, legal, or medical advice and is not a substitute for real product recommendations, professional guidance, or clinical decisions.

The public deployment disables signup and administrative write operations, including document approval, at the server layer. API keys and database credentials are stored only in server-side environment variables and are never shipped in the client bundle or committed to the repository.

## Architecture and request flow

1. Normalize the current request, domain, user role, and session context.
2. Resolve explicit assumptions and corrections, giving them precedence over the saved profile and retrieved memory.
3. Retrieve relevant domain documents and session memory from pgvector.
4. Apply role, suitability, domain-isolation, and source-policy filters to the retrieved evidence.
5. Generate a schema-validated structured response from a prompt containing the selected evidence.
6. Stream and display the answer together with citations, assumptions, missing information, and excluded evidence groups.
7. In the Finance workflow, generate a separate reviewable product recommendation report.

## Local development

### Requirements

- Node.js 22 or newer
- pnpm 10.18.0
- Docker for local PostgreSQL, pgvector, and SuperTokens

```bash
pnpm install
pnpm db:up
pnpm dev
```

Copy `.env.example` to an untracked local `.env` and fill in the required values.

Never commit API keys or database credentials.

## Verification

Run deterministic fixture checks and evaluations that do not call external model providers first:

```bash
pnpm preflight:finance
pnpm eval:finance
pnpm preflight:healthcare
pnpm eval:healthcare
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Database seeding and live LLM/embedding smoke-test commands run in dry-run mode by default.

Pass an explicit `--apply` only after reviewing the planned database writes and external-provider calls.

## Deployment

The live demo uses:

- A Render Web Service built from the repository Dockerfile
- Neon for PostgreSQL and pgvector
- Hosted SuperTokens for authentication

See [`docs/render-deployment.md`](docs/render-deployment.md) for environment variables and the post-deployment checklist.

## Korean public finance sources

The Finance fixtures contain educational summaries of the following official sources.

Fixture metadata records the authority, stable source ID, URL, publication date, retrieval date, data-as-of date, document type, and reuse category.

- [Financial Consumer Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsId=013704)
- [Enforcement Decree of the Financial Consumer Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=285715)
- [Financial Services Commission explanation of the suitability principle](https://www.korea.kr/briefing/actuallyView.do?newsId=148885132)
- [Depositor Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsId=001537)
- [Financial Services Commission notice on the KRW 100 million deposit-protection limit](https://www.korea.kr/news/policyNewsView.do?newsId=148943235)
- [Korea Post Finance Development Institute deposit-product features dataset](https://www.data.go.kr/data/15090586/fileData.do)

The demo does not reproduce or offer any real retail financial product.

The deposit and savings fixtures use only the public dataset's field structure. All product names, providers, rates, eligibility criteria, terms, and benefits are fictional.
