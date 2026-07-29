# Koyeb deployment

This deployment keeps React SSR and the Express API in one Docker Web Service. PostgreSQL and
pgvector remain on Neon, and authentication remains on hosted SuperTokens. The service does not
run migrations, seed data, or provider smoke tests during deployment.

## Before creating the service

- Use a dedicated public-demo Neon project or branch. Do not connect the public app to a private
  dataset.
- Use a dedicated hosted SuperTokens application for the public demo.
- Confirm the database schema and deterministic fictional Finance fixtures were prepared through
  the repository's separately reviewed migration and seed procedures.
- Keep all credentials in Koyeb Secrets. Never paste them into repository files or build logs.
- Set a provider usage limit outside the application. Hosting can be free, but LLM and embedding
  calls may incur provider charges.

## Koyeb service settings

Create one Web Service from the GitHub repository:

| Setting                   | Value                              |
| ------------------------- | ---------------------------------- |
| Repository                | `Jyonyve/rag-advisor-demo`         |
| Branch                    | `main`                             |
| Builder                   | Dockerfile                         |
| Dockerfile                | `Dockerfile`                       |
| Instance                  | Free                               |
| Region                    | Frankfurt                          |
| Service port              | `3000`, HTTP                       |
| Public route              | `/`                                |
| Health check              | HTTP `GET /healthz` on port `3000` |
| Health-check grace period | `60` seconds                       |

Do not override the Docker command. The image starts
`node packages/server/dist/server.js` and binds to `0.0.0.0`.

## Plain environment variables

Koyeb exposes these variables during the Docker build and at runtime. `KOYEB_PUBLIC_DOMAIN` is the
Koyeb-provided hostname without the `https://` prefix.

```dotenv
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE=/
VITE_APP_ENV=production
VITE_APP_DOMAIN=https://{{ KOYEB_PUBLIC_DOMAIN }}
VITE_API_DOMAIN=https://{{ KOYEB_PUBLIC_DOMAIN }}
DATABASE_SSL=true
DATABASE_POOL_MAX=3
LOCAL_IMAGE_STORAGE_DIR=/tmp/rag-advisor-demo/assets
RAG_ADVISOR_RAG_TRACE=false
RAG_ADVISOR_DEMO_DISABLE_JSONL_LOGS=1
DASHBOARD_ADMIN_EMAILS=
PUBLIC_DEMO_ENABLED=false
```

The local image directory is intentionally ephemeral. The Finance demo must not rely on runtime
uploads surviving a restart or scale-to-zero event.

## Secrets

Create each value as a Koyeb Secret, then map it to the environment variable with
`{{ secret.SECRET_NAME }}`.

| Environment variable         | Required                  | Notes                                                                                             |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Yes                       | Use the dedicated Neon pooled connection URL.                                                     |
| `SUPERTOKENS_CONNECTION_URI` | Yes                       | Hosted SuperTokens connection URI.                                                                |
| `SUPERTOKENS_API_KEY`        | Yes                       | Hosted SuperTokens API key.                                                                       |
| `OPENAI_API_KEY`             | Yes for current retrieval | Used for query embeddings and as the OpenAI fallback. Apply a strict provider budget.             |
| `SECRET_ENCRYPTION_KEY`      | Yes                       | New public-demo-only random secret of at least 32 bytes; do not reuse the private deployment key. |
| `GEMINI_API_KEY`             | Optional                  | Server fallback only if intentionally enabled.                                                    |
| `GROQ_API_KEY`               | Optional                  | Server fallback only if intentionally enabled.                                                    |
| `OPENROUTER_API_KEY`         | Optional                  | Server fallback only if intentionally enabled.                                                    |

Example mappings use names, not secret values:

```dotenv
DATABASE_URL={{ secret.RAG_ADVISOR_DATABASE_URL }}
SUPERTOKENS_CONNECTION_URI={{ secret.RAG_ADVISOR_SUPERTOKENS_URI }}
SUPERTOKENS_API_KEY={{ secret.RAG_ADVISOR_SUPERTOKENS_API_KEY }}
OPENAI_API_KEY={{ secret.RAG_ADVISOR_OPENAI_API_KEY }}
SECRET_ENCRYPTION_KEY={{ secret.RAG_ADVISOR_SECRET_ENCRYPTION_KEY }}
```

## First deployment checks

1. Confirm the Docker build receives both `VITE_APP_DOMAIN` and `VITE_API_DOMAIN`. They are compiled
   into the browser bundle and also used by the server at runtime.
2. Wait for Koyeb to report the instance healthy.
3. Open `https://<public-domain>/healthz`; expect HTTP 200 and `status: "ok"`.
4. Open `https://<public-domain>/readyz`; expect HTTP 200 and `status: "ready"`. A 503 means the
   service cannot perform the read-only Neon check.
5. Open the home page in a private browser window and confirm there is no hydration error.
6. Sign up with a dedicated fictional test account and verify login, refresh, logout, password
   reset routing, and session persistence after a page reload.
7. Confirm browser auth requests stay on the same Koyeb origin and carry SuperTokens cookies.
8. Create or open only fictional Finance demo data. Verify one retrieval response and one product
   recommendation report.
9. Review logs for secrets, raw prompts, private identifiers, repeated readiness failures, and
   memory-limit restarts.
10. Allow the free instance to sleep, then confirm the first request wakes it and subsequent login
    and database requests succeed.

## Rollback

- Keep the previous healthy Koyeb deployment available for rollback.
- If readiness fails, roll back the application before changing the database.
- Do not run migrations or seed commands automatically as part of rollback or redeployment.
