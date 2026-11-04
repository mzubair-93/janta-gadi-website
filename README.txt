JANTA GADI KARKHANA - WEBSITE

IMPORTANT SECURITY SETUP
1. Copy .env.example and rename the copy to .env.
2. Open .env in Notepad.
3. Replace SESSION_SECRET with a random secret of at least 32 characters.
4. Set ADMIN_USERNAME and a unique ADMIN_PASSWORD of at least 14 characters.
5. Do not share .env or upload it to GitHub.

RUN ON WINDOWS
1. Install Node.js 20 or newer.
2. Open this project folder in File Explorer.
3. Click the address bar, type cmd, and press Enter.
4. Run: npm.cmd install
5. Run: npm.cmd start
6. Open http://localhost:3000
7. Owner dashboard: http://localhost:3000/admin

The first admin account is created from ADMIN_USERNAME and ADMIN_PASSWORD in .env.
The three service photos are in public/images and are already connected to the service cards.
Your existing SQLite data is not included because it was not among the uploaded files. A new database will be created on first run.
