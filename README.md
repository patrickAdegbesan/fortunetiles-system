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

On first run the app creates a built-in owner account, `admin@fortunetiles.local`.

- If `backend/config/defaultAdmin.json` has a `passwordHash`, that password is used. Create the hash with
  `npm --prefix backend run admin:hash -- "<a password of 12+ characters>"` and paste it into the file.
  Only the hash is stored in the code; the password stays known only to you.
- If no hash is set, a random one-time password is written to `FIRST-RUN-ADMIN.txt` in the data folder.
  Delete that file after signing in.

The account is re-created (and kept an active owner) if it is ever deleted. Use it to create your
users under *Settings → Users*. Passwords need 12+ characters with upper, lower, a number and one of
`@$!%*?&`.

**Forgotten password:** there is no email reset. An owner sets a new one under *Settings → Users → Edit*.

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

Copy the `.exe` to the flash drive. The `FortuneTilesData` folder is created next to it on first launch.
