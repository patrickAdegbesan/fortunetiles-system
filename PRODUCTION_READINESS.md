# Production Readiness Checklist (Fortune Tiles System)

This repo contains a full stack app (backend API + frontend + desktop app). Use this checklist to get to a production-grade deployment.

## 1) Secrets & Access (must-do)

- Rotate any credentials that have ever been committed to git history (DB URLs, JWT secrets, email credentials).
- Store secrets only in your hosting provider’s secret manager/env vars (Railway/Render/Vercel/GitHub Actions secrets).
- Ensure `.env` files are never committed (keep only `.env.example` templates).
- Restrict admin creation/seeding to non-production only.

## 2) Deploy Hygiene (must-do)

- Ensure production builds **do not ship** local exports/dumps (keep dumps in repo if needed, but exclude them from Docker images/artifacts).
- Confirm the backend serves only `backend/public` (inventory) and `backend/website-build` (website), not the repository root.
- Use `NODE_ENV=production` in production and verify error responses do not leak internals.

## 3) Environment Variables (must-do)

Backend (typical):

- `DATABASE_URL` (Postgres)
- `JWT_SECRET` (32+ chars)
- `ALLOWED_ORIGINS` (comma-separated)
- `EMAIL_USER`, `EMAIL_PASSWORD` (if password reset email is enabled)
- `GITHUB_WEBHOOK_SECRET` (if webhook auto-update is enabled)

Frontend (typical):

- `REACT_APP_API_BASE_URL` (if deploying frontend separately)

## 4) Security Controls (should-do before production)

- Rate limit auth endpoints (login/register/forgot-password).
- Validate inputs for all write endpoints (POST/PUT/PATCH).
- Add basic CSRF/same-origin protections for browser-originating state-changing requests (especially if cookies are used).
- Use secure headers (CSP/HSTS where applicable) and HTTPS everywhere.
- Minimize sensitive logs (never log reset tokens, PIN values, passwords, JWTs).

## 5) Reliability & Operations

- Health checks: `/health` and `/api/ping` should work in production.
- Backups: define a backup + restore runbook (RPO/RTO) and test restores.
- Monitoring: centralize logs + add alerting (5xx rate, DB errors, latency).
- Rollbacks: document how to revert to last known-good release.

## 6) CI/CD (recommended)

- Add CI to run: install, build, unit tests, and basic smoke checks on PRs.
- Use `npm ci` for reproducible installs (requires up-to-date lockfiles).
