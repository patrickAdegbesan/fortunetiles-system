# START HERE - Fortune Tiles on Windows

## The easy way: double-click `START.bat`

1. Copy this whole folder to the Windows computer (or run it straight from the drive).
2. Double-click **START.bat**.
3. **First time only** (needs internet, takes several minutes): it installs Node.js if missing,
   installs the components, builds the app, then asks you to **choose the admin password**
   (typing is hidden; write it down). If a Windows prompt asks permission to install Node.js, click Yes.
4. The app opens. Sign in with the username `admin` and the password you chose.
5. **From then on**, double-clicking START.bat opens the app straight away.
   No internet and no Node.js needed - so after the first setup you can copy the whole folder
   (including the `FortuneTilesData` folder, which holds all your data) to other Windows PCs and just double-click START.bat there.

If setup fails, the window stays open: copy or photograph the messages and send them back.

## Using it

- Go to **Settings -> Users -> Add User** to create accounts for staff.
- Forgot a password? An owner sets a new one under **Settings -> Users -> Edit**.
- Use **File -> Backup Data** regularly and keep the backup somewhere safe.
- **Close the app before unplugging a flash drive**, and use only one copy of `FortuneTilesData` at a time.

## Quick check that everything works (about 5 minutes)

Sign in, then: add a product with some stock -> change its price -> open **Sales**, pick a location, add the product to the cart and complete a sale -> open **Transactions** to see the order -> process a return -> look at **Reports**.
If a step shows an error, note exactly what you clicked and the message.

## Optional: a single-file `.exe`

`npm run dist` (after the setup above) builds `desktop-app\dist\FortuneTiles-2.0.0-portable.exe`, which keeps its data in a
`FortuneTilesData` folder beside it. START.bat does not need this.

For developers: `npm --prefix backend test` runs 70 automatic checks.
