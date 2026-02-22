# Deploy: AWS App Runner Backend + Netlify Frontend

This guide matches the current repo setup:
- Backend on AWS App Runner using `apprunner.yaml`
- Frontend on Netlify using `netlify.toml`

## 0) Required before deploy

1. A production PostgreSQL URL.
   - Do **not** use `127.0.0.1` / `localhost` for App Runner.
   - Use RDS or Neon:
     - `postgresql+psycopg2://<user>:<pass>@<host>:5432/market_pathways`
2. Frontend site URL (Netlify or custom domain), for:
   - `CORS_ORIGINS`
   - `PUBLIC_APP_BASE_URL`

## 1) Deploy backend (App Runner)

1. AWS Console -> App Runner -> Create service
2. Source: GitHub repository
3. Branch: your deploy branch
4. Configuration: `Use configuration file`
   - App Runner reads `apprunner.yaml` at repo root
5. Set environment variables from `backend/.env.example`

Minimum required:
- `DATABASE_URL`
- `AUTH_SECRET`
- `ADMIN_TOKEN`
- `CORS_ORIGINS`
- `PUBLIC_APP_BASE_URL`

Recommended production defaults:
- `AUTH_DEV_RETURN_CODES=false`
- `AUTH_REQUIRE_EMAIL_VERIFICATION=false` (or `true` once mail is fully configured)
- `AI_ENABLED=true` (if you want AI features)
- `LLM_PROVIDER=openai`

6. Deploy service
7. Confirm health:
   - `https://<backend>.awsapprunner.com/meta/health`

## 2) Deploy frontend (Netlify)

1. Netlify -> Add new site -> Import from Git
2. Point to this repository
3. Build settings are already in `netlify.toml`:
   - Base: `frontend`
   - Command: `npm run build`
4. Add environment variable:
   - `NEXT_PUBLIC_API_BASE=https://<backend>.awsapprunner.com/api`
5. Deploy site

## 3) Final backend CORS update

Update backend `CORS_ORIGINS` to include your final Netlify URL(s), then redeploy backend.

Example:
`https://your-site.netlify.app,https://www.yourdomain.com,http://localhost:3000,http://127.0.0.1:3000`

## 4) Post-deploy checks

1. `GET /meta/health` returns `ok: true`
2. Login/register works from Netlify frontend
3. AI route works if `AI_ENABLED=true`
4. Upload routes work if S3 vars are configured

## 5) Security follow-up

1. Rotate all keys that were shared in chat/docs.
2. Replace static AWS keys with IAM role access where possible.
3. Move secrets to AWS Secrets Manager for long-term operation.
