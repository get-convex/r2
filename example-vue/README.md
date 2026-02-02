# Vue Example

Demonstrates `@convex-dev/r2/vue` with `useUploadFile` composable.

## Setup

```bash
npm install
npx convex dev --once --configure=new
```

Set R2 credentials in Convex:

```bash
npx convex env set R2_BUCKET <bucket-name>
npx convex env set R2_ENDPOINT https://<account-id>.r2.cloudflarestorage.com
npx convex env set R2_ACCESS_KEY_ID <access-key>
npx convex env set R2_SECRET_ACCESS_KEY <secret-key>
```

## Run

```bash
npx convex dev &
npm run dev
```
