# HatTip Basic Integration Tests

## Running

When the environment variable `CI` equals `true`, `pnpm run ci` will all the automatic tests. When the environment variable `CI` does not equal `true`, `pnpm run ci` will run its tests on an already running server. You can set the server address by setting the environment variable `TEST_HOST` which defaults to `http://127.0.0.1:3000`.

To manually test streaming, run `curl -ND - 'http://127.0.0.1:3000/bin-stream?delay=50'` and observe the typewriter effect.

## Manual Tests

All environments that provide a local development server are tested automatically. But testing actual deployments is also desirable. Follow the instructions below to test deployments.

### Cloudflare Workers

Publish with `wrangler publish`.

### Vercel Serverless Functions

Build locally with `pnpm build:vercel` and deploy with `vercel deploy --prebuilt`.

### Vercel Edge Functions

Build locally with `pnpm build:vercel-edge` and deploy with `vercel deploy --prebuilt`.

### Netlify Functions (live)

Build locally with `pnpm build:netlify-functions`, deploy with `netlify deploy`.

### Netlify Edge Functions (live)

Build locally with `pnpm build:netlify-edge`, deploy with `netlify deploy`.

### Deno Deploy

Build with `pnpm build:deno`, `cd` into `dist/deno` and deploy with `deployctl deploy --token <TOKEN> --project=<PROJECT> index.js`.
