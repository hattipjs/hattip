# HatTip Basic Integration Tests

## Running

When the environment variable `CI` equals `true`, `pnpm run ci` will all the automatic tests. When the environment variable `CI` does not equal `true`, `pnpm run ci` will run its tests on an already running server. You can set the server address by setting the environment variable `TEST_HOST` which defaults to `http://127.0.0.1:3000`.

## Status

### Node.js with `node-fetch`

All tests pass.

### Node.js with native fetch

All tests pass.

### Cloudflare Workers with `wrangler dev`

All tests pass.

Launch with `wrangler dev --port 3000`.

### Netlify Functions with `netlify serve`

All tests except "doesn't fully buffer binary stream" pass which is automatically skipped in the CI. Netlify Functions have no streaming support.

Build locally with `pnpm build:netlify-functions`, test with `netlify serve`.

### Netlify Edge Functions with `netlify serve`

All tests except "doesn't fully buffer binary stream" pass which is automatically skipped in the CI. `netlify serve` doesn't seem to support streaming. It works fine when actually deployed, though.

Build locally with `pnpm build:netlify-edge`, test with `netlify serve`.

### Deno

All tests pass.

Build with `pnpm build:deno`, test with `deno run --allow-read --allow-net --allow-env dist/deno/index.js`.

---

TODO: Tests below this line are currently run manually. Find a way to run them automatically.

---

### Cloudflare Workers

All tests pass.

Publish with `wrangler publish`.

### Vercel Serverless Functions

All tests except "doesn't fully buffer binary stream" pass. Vercel Serverless Functions have no streaming support.

Build locally with `pnpm build:vercel` and deploy with `vercel deploy --prebuilt`.

### Vercel Edge Functions

All tests pass.

Build locally with `pnpm build:vercel-edge` and deploy with `vercel deploy --prebuilt`.

### Netlify Functions (live)

All tests except "doesn't fully buffer binary stream" pass. Netlify Functions have no streaming support.

Build locally with `pnpm build:netlify-functions`, deploy with `netlify deploy`.

### Netlify Edge Functions (live)

All tests pass.

Build locally with `pnpm build:netlify-edge`, deploy with `netlify deploy`.

### Deno Deploy

All tests pass.

Build with `pnpm build:deno`, `cd` into `dist/deno` and deploy with `deployctl deploy --token <TOKEN> --project=<PROJECT> index.js`.

### Bun

All tests except "doesn't fully buffer binary stream" pass. Bun doesn't support streaming yet.

Run with `bun entry-bun.js`.

### Lagon

All tests except the following pass:

- renders binary stream (`TextEncoder` problem)
- doesn't fully buffer binary stream
- sends multiple cookies
- session
