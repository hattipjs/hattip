# HatTip Basic Integration Tests

## Running

When the environment variable `CI` equals `true`, `pnpm run ci` will all the automatic tests. When the environment variable `CI` does not equal `true`, `pnpm run ci` will run its tests on an already running server. You can set the server address by setting the environment variable `TEST_HOST` which defaults to `http://localhost:3000`.

TODO: Tests except the first three are currently run manually. Find a way to run them automatically.

## Status

### Node.js with `node-fetch`

All tests pass.

### Node.js with native fetch

All tests except "sends multiple cookies" pass which is automatically skipped in the CI.

Setting multiple `Set-Cookie` headers is not currently supported by the native fetch implementation.

### Miniflare

All tests pass.

Launch with `miniflare --modules --port 3000 dist/cloudflare-workers-bundle/index.js`. Miniflare doesn't understand the `main` field in the `wrangler.toml` files yet.

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

### Netlify Functions

All tests except "doesn't fully buffer binary stream" pass. Netlify Functions have no streaming support.

Build locally with `hattip-netlify --staticDir public --func entry-netlify-function.js`. Deploy with `netlify deploy`.
