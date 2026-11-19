# Fortune Tiles — Offline Inventory System

A desktop inventory and point-of-sale application for Windows. It runs **entirely on the
computer it is installed on**: no internet, no cloud database, no accounts anywhere else.
Everything (products, stock, sales, returns, users, passwords) is stored in one local SQLite file.

## How it works

```
Electron window  ->  http://127.0.0.1:<random port>  ->  Express server (bundled)  ->  SQLite file
```

- The Express server is part of the app. It listens on the loopback address only, so nothing on the
  network can reach it, and it is started and stopped by the Electron shell.
- The React interface (`frontend/`) is built once and served by that local server.
- Login is checked against the local database, so it works with no connection at all.
- Thermal receipt printing goes over USB (`desktop-app/printer/`).

## Data and the flash drive

All data lives in one folder:

| Build | Data folder |
|---|---|
| Portable `.exe` | `FortuneTilesData/` next to the `.exe` (copy the whole folder to move everything) |
| `npm start` (development) | `%APPDATA%/FortuneTiles/data` (or the path in `FORTUNE_TILES_DATA`) |

It holds `fortunetiles.sqlite` (the database), `jwt.secret` (login signing key, generated on first
run) and the Electron profile. **Close the app before removing the flash drive**, and run only one
copy of the data at a time. Use *File → Backup Data* regularly.

## First sign-in

On first run the app creates a built-in owner account with the username `admin`.

- If `backend/config/defaultAdmin.json` has a `passwordHash`, that password is used. Create the hash with
  `npm --prefix backend run admin:hash -- "<a password of 6+ characters>"` and paste it into the file.
  Only the hash is stored in the code; the password stays known only to you.
- If no hash is set, a random one-time password is written to `FIRST-RUN-ADMIN.txt` in the data folder.
  Delete that file after signing in.

The account is re-created (and kept an active owner) if it is ever deleted. Use it to create your
users under *Settings → Users*. Passwords only need to be at least 6 characters.

**Forgotten password:** there is no email reset. An owner sets a new one under *Settings → Users → Edit*.

## Cloud sync

The computer and the POS terminal share data through a Supabase project while each keeps working offline. Nobody has to
log in or press anything: a device links itself the first time it has internet and then syncs every 15 seconds.

- **Set up once (already done for this shop):** run `backend/sync/supabase-setup.sql` in the Supabase SQL editor after
  replacing `__APP_SECRET__` with the key in `backend/config/sync.secret.json`, and put the project URL and publishable
  key in `backend/config/sync.json`. `sync.secret.json` is not committed; it is packed into the builds.
- **Security:** the shop key is inside the app files, so anyone who can copy the app can read the shop's cloud data.
  Keep the devices and the flash drive with people you trust. To change the key, edit both the file and the SQL function
  `ft_app_ok`, then rebuild the apps.
- **First device uploads, later devices download.** If a device already holds data when the cloud does too, the owner is
  asked once (Settings, or More → Cloud sync on the terminal) which of the two to keep.
- **How it works:** every device keeps its own database. Changes are noted by database triggers. New records use a
  per-device id range so devices never clash, stock is shared as +/- changes (so two devices selling at once both count),
  and for everything else the latest edit wins. The built-in `admin` account is not synced.
- **Testing:** `npm --prefix backend run test:sync` runs several devices against a stand-in cloud, no network needed.


## Shop settings (kept out of git)

Shop-specific values live in local files that are not committed. Copy each example and fill it in:

| File | Holds | Example |
|---|---|---|
| `backend/config/defaultAdmin.json` | Built-in owner account, optional password hash | `defaultAdmin.example.json` |
| `backend/config/sync.json` | Cloud project URL and publishable key | `sync.example.json` |
| `backend/config/bankAccounts.json` | The shop's bank accounts, created on first run | `bankAccounts.example.json` |
| `frontend/.env.local` | Accounts printed on older transfer receipts | `.env.local.example` |

Without them the app still runs, with placeholder bank accounts and cloud sync off.

## Development

```bash
npm run install:all     # install backend, frontend and desktop dependencies
npm run build:app       # build the React app and copy it to backend/public
npm start               # run the desktop app (needs a display)
```

## Building the Windows portable app

Run on a **Windows** machine (native modules `sqlite3` and `usb` are rebuilt for Electron there):

```bash
npm run install:all
npm run dist            # output: desktop-app/dist/FortuneTiles-<version>-portable.exe
```

Or skip building: double-click `START.bat` (see START-HERE.md) - it sets everything up and runs the app.
