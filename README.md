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

This project uses fictional products, disclosures, and investor profiles. Finance regulatory
education may use attributed Korean public sources with fixed retrieval dates and snapshot dates.
It is an engineering demonstration, not financial or legal advice. Generated responses must
identify assumptions, avoid guaranteed outcomes, distinguish public regulation from fictional
product evidence, and ground material claims in retrieved sources.

## Current status

The Finance workflow is implemented with deterministic fictional fixtures, fixed-turn preference
memory, pgvector retrieval, suitability filtering, Korean and English UI copy, and grounded product
recommendation reports. The repository contains no source-repository Git history, private runtime
assets, private migration data, or private evaluation fixtures.

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

## Public deployment

The simplest free deployment uses one Koyeb Web Service built from the repository Dockerfile, with
Neon for PostgreSQL/pgvector and hosted SuperTokens for authentication. See
[`docs/koyeb-deployment.md`](docs/koyeb-deployment.md) for the exact configuration and verification
checklist.

## Demonstrated workflow

1. Retrieve fictional products and attributed Korean public regulatory education from pgvector.
2. Remember normalized investor preferences within an isolated session.
3. Explain product matches using retrieved prospectus evidence.
4. Generate a structured personalized recommendation report with risk warnings and source
   references.

## Korean public finance sources

The deterministic Finance fixture includes educational summaries of these official sources. The
canonical fixture metadata records the authority, stable source ID, source URL, publication date,
retrieval date, data-as-of date, document type, and reuse category.

- [Financial Consumer Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsId=013704), current
  fixture snapshot effective 2026-01-02.
- [Enforcement Decree of the Financial Consumer Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=285715),
  current fixture snapshot effective 2026-04-28.
- [Financial Services Commission explanation of the suitability principle](https://www.korea.kr/briefing/actuallyView.do?newsId=148885132),
  text reused under the stated KOGL attribution condition.
- [Depositor Protection Act](https://www.law.go.kr/LSW/lsInfoP.do?lsId=001537), current fixture
  snapshot effective 2026-01-02.
- [Financial Services Commission notice on the KRW 100 million deposit-protection limit](https://www.korea.kr/news/policyNewsView.do?newsId=148943235),
  text reused under the stated KOGL attribution condition.
- [Korea Post Finance Development Institute deposit-product features dataset](https://www.data.go.kr/data/15090586/fileData.do),
  used only as a public-data structural reference under its stated unrestricted-use terms.

The repository does not present or snapshot a real retail product. Four fictional Korean deposit
and savings fixtures use only the public dataset's field structure; their names, issuer, rates,
eligibility, conditions, terms, and benefits are invented and recorded as changed fields in fixture
provenance. Three additional fund fixtures are fully fictional. The seven products each have a
linked fictional disclosure so retrieval can compare liquidity, horizon, risk, and protection
trade-offs. Public-source summaries are not substitutes for the current official text.
