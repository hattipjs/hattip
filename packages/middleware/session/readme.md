# `@hattip/session`

Session middleware for HatTip. It persists data between requests in a cookie or a custom session store.

This middleware uses the [Web Crypto API](https://w3c.github.io/webcrypto/) which is supported by:

- ✅ [Node.js 16 or later](https://nodejs.org/api/webcrypto.html)
- ✅ [Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- ✅ [Deno](https://github.com/denoland/deno/issues/11690)
- ✅ Vercel Serverless (since it uses Node.js)
- ✅ Vercel Edge (since it uses Cloudflare Workers)
- ✅ Netlify Functions (since it uses Node.js)
- ✅ Netlify Edge Functions (since it uses Deno)
- 🚧 [Bun](https://github.com/oven-sh/bun/issues/159)

## Usage

```ts
import { cookie } from "@hattip/cookie";
import { session, SignedCookieStore } from "@hattip/session";
import { json } from "@hattip/response";

// session() requires cookie() or
// getSessionId option to be set to read
// the session ID from somewhere else
app.use(cookie());

app.use(
  session({
    // Session store
    store: new SignedCookieStore(
      await SignedCookieStore.generateKeysFromSecrets(["secret"]),
    ),
    // Default session data when a new session is created.
    // It can be a function.
    // It is shallow cloned, if you need a deep clone, use a function.
    defaultSessionData: {},
  }),
);

app.get((ctx) => {
  return json(ctx.session.data);
});
```

You can set the session data type using module augmentation:

```ts
declare module "@hattip/session" {
  interface SessionData {
    userId: string;
  }
}
```

## Stores

`@hattip/session` comes bundled with a few ready-to-use session stores. **Cookie stores** store their data in a cookie and are appropriate for small amounts of data. **External stores** store a key in a cookie and use external storage to store the data. External stores are appropriate for large amounts of data.

External stores support a `session.regenerate()` method, which will generate a new session ID and persist the session data to the new ID. You should call it when you want to invalidate the current session, such as when a user logs in or logs out to prevent session fixation attacks.

### `UnsignedCookieStore`

It stores the session data in an unsigned cookie. The client can read and modify the cookie, so it should only be used for non-sensitive data. Also, you should always validate the session data by passing a custom `parse` function to the constructor:

```ts
const store = new SimpleCookieStore({
  parse(data) {
    const parsed = JSON.parse(data);
    validate(parsed);
    return parsed;
  },
});
```

### `SignedCookieStore`

It stores the session data in a signed cookie. The client can read the cookie, but cannot modify it. It requires at least one secret key to sign the cookie. If you provide multiple keys, all of them will be used to verify the cookie but only the first one will be used to sign it. This allows you to rotate the keys without invalidating existing sessions.

You can generate keys from password-like secrets using `SignedCookieStore.generateKeysFromSecrets` or you can use `SignedCookieStore.generateKey` to generate a secure key. `SignedCookieStore.exportKey` can be used to base64 encode a key for storing, e.g. in an environment variable. `SignedCookieStore.generateKeysFromBase64` can be used to decode a series of keys from base64.

```ts
new SignedCookieStore(
  await SignedCookieStore.generateKeysFromSecrets(["my new secret", "my old secret]),
);
```

### `EncryptedCookieStore`

It stores the session data in an encrypted cookie. The client cannot read or modify the cookie. It requires at least one secret key to encrypt the cookie. If you provide multiple keys, all of them will be used to decrypt the cookie but only the first one will be used to encrypt it. This allows you to rotate the keys without invalidating existing sessions.

You can use `EncryptedCookieStore.generateKey` to generate a secure key. `EncryptedCookieStore.exportKey` can be used to base64 encode a key for storing, e.g. in an environment variable. `EncryptedCookieStore.generateKeysFromBase64` can be used to decode a series of keys from base64.

```ts
new EncryptedCookieStore(
  await EncryptedCookieStore.generateKeysFromBase64([
    "cnNwJHcQHlHHB7+/zRYOJP/m0JEXxQpoGskCs8Eg+XI=",
  ]),
);
```

### `UnsafeMemoryStore`

It stores the session data in memory. On edge and serverless runtimes, this store will lose its data. On long-running servers (Node, Deno, Bun, etc.) it will leak memory and lose its data on server restart. For these reasons, it is only useful for development **and should never be used in production**.

### `RedisSessionStore`

It stores the session data in a Redis database. It requires a [`node-redis`](https://github.com/redis/node-redis) compatible Redis client factory (a function that returns the Redis client) to be passed to the constructor.

```ts
const store = new RedisSessionStore({ getClient: () => redis.createClient() });
```

### `KvSessionStore`

It stores the session data in [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/). It requires a KV namespace factory (a function that returns a KV namespace) to be passed to the constructor. For example, if your KV namespace is called `SESSIONS`:

```ts
const store = new KvSessionStore({
  getStore: (ctx) => ctx.platform.env.SESSIONS,
});
```
