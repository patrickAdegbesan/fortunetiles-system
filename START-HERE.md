# START HERE — Fortune Tiles on Windows

This folder is the **source code**. There is no ready-made `.exe` in it yet: you build it once on a
Windows computer that has internet. After that, the finished `.exe` runs on any Windows PC with **no internet**.

## Part 1 — Build the app (once, on a Windows PC with internet)

1. Install **Node.js 20 (LTS)** from https://nodejs.org (accept the defaults).
   Also install **Python 3** and the **Visual Studio Build Tools** ("Desktop development with C++")
   only if the build below complains about missing compilers.
2. Copy this whole folder from the hard drive to the PC, for example to `C:\fortunetiles-system`.
3. (Recommended) Choose your own admin password. Open a terminal in the folder and run:
   ```
   npm --prefix backend install
   npm --prefix backend run admin:hash -- "YourPassword123!"
   ```
   Copy the long text it prints (starts with `$2b$12$`) into `backend\config\defaultAdmin.json`
   as the value of `"passwordHash"` (keep the quotes). Keep the password somewhere safe.
   If you skip this step the app makes a random password on first run (see Part 3).
4. In the same terminal run:
   ```
   npm run install:all
   npm run dist
   ```
   This takes several minutes and needs internet.
5. When it finishes, your app is at `desktop-app\dist\FortuneTiles-2.0.0-portable.exe`.

## Part 2 — Put it on any computer (no internet needed)

1. Copy `FortuneTiles-2.0.0-portable.exe` to a folder on the computer (or run it from the flash drive).
2. Double-click it. Windows may say "Windows protected your PC": click **More info → Run anyway**
   (the app is not code-signed). The first start takes a few seconds.
3. A folder called `FortuneTilesData` appears next to the `.exe`. **This folder is all your data**
   (products, sales, users). Never delete it. To move to another computer, copy the `.exe` and this folder together.

## Part 3 — First sign-in

- Email: `admin@fortunetiles.local`
- Password: the one you chose in Part 1 step 3, **or** open `FortuneTilesData\FIRST-RUN-ADMIN.txt`
  to read the random one (delete that file after signing in).
- Go to **Settings → Users → Add User** and create accounts for your staff.
- Forgot a password? An owner can set a new one under **Settings → Users → Edit**.

## Everyday rules

- Use **File → Backup Data** regularly and keep the backup file somewhere safe.
- **Close the app before unplugging a flash drive.**
- Use only one copy of the data at a time (don't run the same `FortuneTilesData` on two PCs together).

## Checking that it works (about 5 minutes)

Sign in, then: add a product with some stock → change its price → open **Sales**, pick a location,
add it to the cart and complete a sale → open **Transactions** to see the order → process a return →
look at **Reports**. If any step shows an error, note exactly what you clicked and the message, and send it back.
For developers: `npm --prefix backend test` runs 70 automatic checks.
