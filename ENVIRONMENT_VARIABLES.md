# Environment Variables

Use `.env.example` only as a name/template reference. Never commit real values.

| Variable | Requirement |
|---|---|
| `NODE_ENV` | Must be `production` in production; disables test-account authentication and file state fallback. |
| `PORT` | Application port behind TLS reverse proxy. |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS origin. |
| `NEXT_PUBLIC_ASSET_PREFIX` | Optional reverse-proxy prefix; validate generated assets. |
| `NURSING_SESSION_SECRET` | Required in production, independent high-entropy secret, rotated under a session invalidation plan. |
| `DATABASE_URL` | Required in production; dedicated PostgreSQL with TLS/least privilege. |
| `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED` | Pool/TLS controls approved for the environment. |
| `NURSING_TEST_ACCOUNT_PASSWORD` | Only for explicit isolated seeding; do not set/run seed in production. |
| `NURSING_LOCAL_STATE_FILE` | Development only; production rejects local state. |
| `NEXT_PUBLIC_ENABLE_NURSING_ROLE_SWITCHER` | Must be false/unset in production. |
| `DAILYMED_REQUEST_TIMEOUT_MS`, `DAILYMED_CACHE_TTL_MS`, `DAILYMED_RETRY_DELAY_MS` | Optional public NIH reliability tuning; no API key is required. |

Future object storage, monitoring, payment and DoctaRx video integrations need separately documented secret names and failure-safe validation before enablement. The deployment pipeline must validate placeholders without printing secret values.
