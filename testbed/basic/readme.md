# HatTip Basic Integration Tests

## Running

When the environment variable `CI` equals `true`, `pnpm run ci` will all the automatic tests. When the environment variable `CI` does not equal `true`, `pnpm run ci` will run its tests on an already running server. You can set the server address by setting the environment variable `TEST_HOST` which defaults to `http://127.0.0.1:3000`.

## Status

### Node.js with `node-fetch`

All tests pass.

### Node.js with native fetch

All tests except "sends multiple cookies" pass which is automatically skipped in the CI. Setting multiple `Set-Cookie` headers is not currently supported by the native fetch implementation.

### Miniflare

All tests pass.

Launch with `miniflare --modules --port 3000 dist/cloudflare-workers-bundle/index.js`. Miniflare doesn't understand the `main` field in the `wrangler.toml` files yet.

### Netlify Functions with `netlify dev`

All tests except "doesn't fully buffer binary stream" pass which is automatically skipped in the CI. Netlify Functions have no streaming support.

Build locally with `pnpm build:netlify-functions`, test with `netlify dev`.

### Netlify Edge Functions with `netlify dev`

All tests except "doesn't fully buffer binary stream" pass which is automatically skipped in the CI. `netlify dev` doesn't seem to support streaming. It works fine when actually deployed, though.

Build locally with `pnpm build:netlify-edge`, test with `netlify dev`.

### Deno

All tests pass.

Build with `pnpm build:deno`, test with `deno run --allow-read --allow-net dist/deno/index.js`.

---

TODO: Tests below this line are currently run manually. Find a way to run them automatically.

---

### Cloudflare Workers

All tests pass.

Publish with `wrangler publish`.

### Vercel Serverless Functions

All tests except "doesn't fully buffer binary stream" pass. Vercel Serverless Functions have no streaming support.

Build locally with `hattip-vercel --staticDir public --serverless entry-vercel-serverless.js --outputDir vercel-build/output`.

The `build:vercel` script just copies the files into `.vercel/output` to allow local testing of packages not yet published. The following settings are currently required on the Vercel dashboard:

- Build command: `npm run build:vercel`
- Output directory: `.vercel/output`
- Install command: Override and leave blank.

Also the `ENABLE_VC_BUILD` environment variable must be set to `1` on the dashboard.

### Vercel Edge Functions

All tests pass.

Build locally with `hattip-vercel --staticDir public --edge entry-vercel-edge.js --outputDir vercel-build/output`. Check the previous section for set up and deployment instructions.

### Netlify Functions (live)

All tests except "doesn't fully buffer binary stream" pass. Netlify Functions have no streaming support.

Build locally with `pnpm build:netlify-functions`, deploy with `netlify deploy`.

### Netlify Edge Functions (live)

All tests pass.

Build locally with `pnpm build:netlify-edge`, deploy with `netlify deploy`.

### Deno Deploy

All tests pass.

Build with `pnpm build:deno`, `cd` into `dist/deno` and deploy with `deployctl deploy --token <TOKEN> --project=<PROJECT> index.js`.
