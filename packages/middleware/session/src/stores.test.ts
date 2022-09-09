import { describe, test, expect, vi } from "vitest";
import { UnsafeMemorySessionStore } from "./unsafe-memory-store";
import { SimpleCookieStore } from "./simple-cookie-store";
import { SignedCookieStore } from "./signed-cookie-store";
import { EncryptedCookieStore } from "./encrypted-cookie-store";
import { SessionStore } from ".";
import { RedisSessionStore } from "./redis-store";
import { KvSessionStore } from "./kv-store";
import installCrypto from "@hattip/polyfills/crypto";

installCrypto();

// eslint-disable-next-line import/default
import redis from "redis-mock";
import { KVNamespace } from "@miniflare/kv";
import { MemoryStorage } from "@miniflare/storage-memory";

const redisClient = await redis.createClient();
const kv = new KVNamespace(new MemoryStorage());

const stores: Array<{
  name: string;
  store: SessionStore;
  isExternal?: boolean;
}> = [
  { name: "SimpleCookieStore", store: new SimpleCookieStore() },
  {
    name: "SignedCookieStore",
    store: new SignedCookieStore([await SignedCookieStore.generateKey()]),
  },
  {
    name: "EncryptedCookieStore",
    store: new EncryptedCookieStore([await EncryptedCookieStore.generateKey()]),
  },
  {
    name: "UnsafeMemorySessionStore",
    store: new UnsafeMemorySessionStore(),
    isExternal: true,
  },
  {
    name: "RedisSessionStore",
    store: new RedisSessionStore({
      getClient: () => redisClient,
    }),
    isExternal: true,
  },
  {
    name: "KvSessionStore",
    store: new KvSessionStore({
      getStore: () => kv,
    }),
    isExternal: true,
  },
];

vi.useFakeTimers();

describe.each(stores)("$name", ({ store, isExternal: supportsMaxAge }) => {
  test("saves and loads", async () => {
    const data = { foo: "bar" };
    const id = await store.save(null, data, 1000, null as any);
    const loaded = await store.load(id, null as any);
    expect(loaded).toEqual(data);
  });

  if (supportsMaxAge) {
    test("forgets after max age", async () => {
      const data = { foo: "bar" };
      const id = await store.save(null, data, 60_000, null as any);

      vi.advanceTimersByTime(50_000);
      const loaded1 = await store.load(id, null as any);
      expect(loaded1).toEqual(data);

      vi.advanceTimersByTime(15_000);
      const loaded = await store.load(id, null as any);
      expect(loaded).toBeNull();
    });

    test("destroys", async () => {
      const data = { foo: "bar" };
      const id = await store.save(null, data, 1000, null as any);
      await store.destroy(id, null as any);
      const loaded = await store.load(id, null as any);
      expect(loaded).toBeNull();
    });
  }
});
