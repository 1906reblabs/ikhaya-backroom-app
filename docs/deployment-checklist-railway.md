# Railway Deploy Checklist

This checklist is tailored for:

- GitHub repo: [1906reblabs/ikhaya-backroom-app](https://github.com/1906reblabs/ikhaya-backroom-app)
- App root: repository root
- Start command: `npm start`
- Health endpoint: `/health`
- Persistent app data path: `/app/data`

## Before connecting Railway

1. Push the latest local changes from this workspace to `main`.
2. Confirm the repo root contains:
   - `package.json`
   - `railway.toml`
   - `src/server.js`
3. Confirm `package.json` still has:
   - `"start": "node src/server.js"`

## Railway Project Setup

1. In Railway, choose `New Project`.
2. Select `Deploy from GitHub repo`.
3. Choose `1906reblabs/ikhaya-backroom-app`.
4. Create one web service from the repo root.

## Service Settings

Use these exact settings:

- Root Directory: leave empty
- Build Command: leave empty
- Start Command: leave empty in dashboard if `railway.toml` is being used
- Watch Paths: optional, leave empty for now
- Healthcheck Path: leave empty in dashboard if `railway.toml` is being used

Reason:

- `railway.toml` already defines the builder, start command, and healthcheck for this repo.

## Volume Setup

1. Open the Railway service.
2. Add a volume.
3. Mount the volume to `/app/data`.
4. Redeploy after the volume is attached.

This app now resolves runtime storage in this order:

1. `DATA_DIR`
2. `RAILWAY_VOLUME_MOUNT_PATH`
3. local `./data`

## Environment Variables

Set these in Railway service variables:

- `DEMO_OTP_CODE=123456`

Optional:

- `DATA_DIR=/app/data`

Notes:

- Railway should inject `PORT` automatically.
- The app already listens on `0.0.0.0`.

## First Deploy Verification

After deploy, check these in order:

1. Deployment logs show the app started successfully.
2. Open `/health`
   - expected: `{"ok":true}`
3. Open `/api/listings`
   - expected: seeded JSON listings
4. Open the generated public domain root `/`
   - expected: app UI loads

## If the deploy fails

Look for these exact categories in logs:

- volume not mounted
- sqlite unable to open database file
- read-only file system
- port binding issues
- native package install failure for `better-sqlite3` or `sharp`

## After the app is live

1. Test tenant login with any phone number and OTP `123456`.
2. Test landlord login with any phone number and OTP `123456`.
3. Create a listing.
4. Restart or redeploy the service.
5. Confirm the listing still exists.

If it still exists, the Railway volume is working correctly.
