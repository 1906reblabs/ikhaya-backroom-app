# Railway Deployment

## Why Railway is the fastest path

This app currently expects:

- a normal long-running Node server
- a writable local filesystem
- a persistent SQLite database file
- persisted uploaded images on disk

Railway supports this model with a regular Node service plus a mounted volume. Railway's docs state that:

- volumes persist data for services
- the mount path is writable at runtime
- if your app writes to `./data`, mount the volume to `/app/data`
- Railway exposes `RAILWAY_VOLUME_MOUNT_PATH` automatically at runtime

Source:

- [Railway Volumes Guide](https://docs.railway.com/guides/volumes)
- [Railway Volumes Reference](https://docs.railway.com/reference/volumes)

## Recommended setup

1. Create a new Railway project from the GitHub repo.
2. Add a volume to the service.
3. Set the volume mount path to `/app/data`.
4. Keep the start command as `npm start`.
5. Redeploy.

This project now automatically uses:

- `DATA_DIR` if you set it manually
- otherwise `RAILWAY_VOLUME_MOUNT_PATH` if Railway provides it
- otherwise local `./data`

## Environment variables

Required:

- `PORT` is provided by Railway automatically

Optional:

- `DEMO_OTP_CODE=123456`
- `DATA_DIR=/app/data` if you want to force the path explicitly

## Post-deploy checks

After deployment, verify:

1. The service boot log shows the app started successfully.
2. `GET /api/listings` returns seeded listings.
3. Visiting `/` loads the UI.
4. Creating a landlord listing still works after a redeploy.

## Known limits of this fast path

- SQLite is fine for an MVP, but not ideal for multi-instance scale.
- Uploaded files remain local to the mounted volume.
- Keep the service to a single instance to avoid SQLite file contention.

## Future upgrade path

When you want a more cloud-native setup:

- move SQLite to Postgres
- move uploads to object storage
- then Vercel becomes a viable frontend or full-stack target
