# Render deployment

This deployment keeps React SSR and the Express API in one Docker Web Service. PostgreSQL and
pgvector remain on Neon, and authentication remains on hosted SuperTokens. The service does not
run migrations, seed data, or provider smoke tests during deployment.

Render's Free instance is suitable for a public portfolio demo, not a production service. It
spins down after 15 minutes without inbound traffic, can take about a minute to wake, and has an
ephemeral filesystem. Keep the database and authentication service outside Render.

## Before creating the service

- Use a dedicated public-demo Neon project or branch. Do not connect the public app to a private
  dataset.
- Use a dedicated hosted SuperTokens application for the public demo.
- Confirm the database schema and deterministic fictional Finance fixtures were prepared through
  the repository's separately reviewed migration and seed procedures.
- Keep all credentials in Render environment variables. Never paste them into repository files or
  build logs.
- Set provider usage limits outside the application. Hosting can be free, but LLM and embedding
  calls may incur provider charges.
- Leave the Render workspace without a payment method if automatic paid overages are unacceptable.
  Render suspends free services or builds when included limits are exhausted and no payment method
  is present.

## Render service settings

In the Render dashboard, choose **New Web Service** and connect the GitHub repository:

| Setting         | Value                      |
| --------------- | -------------------------- |
| Repository      | `Jyonyve/rag-advisor-demo` |
| Branch          | `main`                     |
| Language        | Docker                     |
| Region          | Singapore                  |
| Dockerfile Path | `./Dockerfile`             |
| Instance Type   | Free                       |
| Health Check    | `/healthz`                 |

Choose a stable, available service name. Render derives the public origin from it, for example
`https://grounded-finance-demo.onrender.com`. Copy the actual origin shown by Render and use it for
both domain variables below. Do not include a trailing slash.

Do not set a build command, Docker command, pre-deploy command, or start-command override. The
image starts `node packages/server/dist/server.js` and binds to `0.0.0.0` on Render's `PORT`.

## Plain environment variables

Add these on the service's Environment page before the first deployment. Render translates
Docker-service environment variables into build arguments as well as runtime variables, so the two
`VITE_` domain values are compiled into the browser bundle.

```dotenv
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
BASE=/
VITE_APP_ENV=production
VITE_APP_DOMAIN=https://<actual-render-service-domain>
VITE_API_DOMAIN=https://<actual-render-service-domain>
DATABASE_SSL=true
DATABASE_POOL_MAX=3
LOCAL_IMAGE_STORAGE_DIR=/tmp/rag-advisor-demo/assets
RAG_ADVISOR_RAG_TRACE=false
RAG_ADVISOR_DEMO_DISABLE_JSONL_LOGS=1
DASHBOARD_ADMIN_EMAILS=
PUBLIC_DEMO_ENABLED=false
```

The local image directory is intentionally ephemeral. The Finance demo must not rely on runtime
uploads surviving a restart, redeploy, or idle spin-down.

## Secret environment variables

Add each secret directly in Render's Environment page. Do not place any value in a Docker build
argument, repository file, or screenshot.

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

## First deployment checks

1. Confirm the Docker build receives the exact same-origin values for `VITE_APP_DOMAIN` and
   `VITE_API_DOMAIN`. They are compiled into the browser bundle and used by the server at runtime.
2. Wait for Render to report the service live and the health check healthy.
3. Open `https://<actual-render-service-domain>/healthz`; expect HTTP 200 and `status: "ok"`.
4. Open `https://<actual-render-service-domain>/readyz`; expect HTTP 200 and `status: "ready"`. A
   503 means the service cannot perform the read-only Neon check.
5. Open the home page in a private browser window and confirm there is no hydration error.
6. Sign up with a dedicated fictional test account and verify login, refresh, logout, password
   reset routing, and session persistence after a page reload.
7. Confirm browser authentication requests stay on the same Render origin and carry SuperTokens
   cookies.
8. Create or open only fictional Finance demo data. Verify one retrieval response and one product
   recommendation report.
9. Review logs for secrets, raw prompts, private identifiers, repeated readiness failures, and
   memory-limit restarts.
10. Allow the free service to sleep, then confirm the first request wakes it and subsequent login
    and database requests succeed.

## Rollback

- Keep the previous healthy Render deployment available in the Events page for rollback.
- If readiness fails, roll back the application before changing the database.
- Do not run migrations or seed commands automatically as part of rollback or redeployment.
