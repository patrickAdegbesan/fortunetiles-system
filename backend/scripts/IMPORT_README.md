# Import Heroku production DB into Railway (quick)

This folder contains a small utility to import a Heroku/Postgres database dump into the Railway Postgres service.

Prerequisites
- `pg_dump` and `psql` installed and available on PATH (Postgres client tools). On Windows, install Postgres or use the "Postgres.app" equivalent.
- The Railway `DATABASE_URL` environment variable set (or `RAILWAY_DATABASE_URL`).
- The Heroku database URL available via `HEROKU_DATABASE_URL` env var or under `heroku-data-collection/*/database-url.env`.

Usage (PowerShell)

```powershell
# set destination Railway DB
$env:DATABASE_URL = "postgres://user:pass@host:5432/dbname"
# (optional) set source Heroku DB (only if you don't have database-url.env collected)
$env:HEROKU_DATABASE_URL = "postgres://..."
# run
node .\backend\scripts\import-heroku-to-railway-quick.js
```

Usage (Windows wrapper)

```powershell
$env:RAILWAY_DATABASE_URL = "postgres://user:pass@host:5432/dbname"
.\backend\scripts\import-heroku-to-railway-quick.ps1
```

Notes & caveats
- This operation is destructive on the destination database. The dump uses `--clean` to drop existing objects before creating them. Backup the destination first if needed.
- If migrations are failing in the deployed app, prefer running migrations first, then import data. If migrations already created partial schema, inspect with `psql` and resolve conflicts.
- If the databases are large, the operation may take long and may time out on free tiers.
- The script leaves the dump file on failure for inspection.

If you want a safer, schema-only + selective data copy flow, I can add options to export/import only certain tables or schema.
