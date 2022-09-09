import { RequestContext } from "@hattip/compose";
import { randomUUID } from "./crypto";
import { Awaitable } from "vitest";
import { SessionData, SessionSerializationOptions, SessionStore } from ".";

export interface KVStore {
  get(key: string): Awaitable<string | null>;
  put(
    key: string,
    value: string,
    options: { expirationTtl: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

interface KvSessionStoreOptions {
  getStore(ctx: RequestContext): Awaitable<KVStore>;
  generateId?(): Awaitable<string>;
  validateId?(id: string): Awaitable<boolean>;
  serializationOptions?: SessionSerializationOptions;
}

export class KvSessionStore implements SessionStore {
  readonly #getStore: (ctx: RequestContext) => Awaitable<KVStore>;
  readonly #generateId: () => Awaitable<string>;
  readonly #validateId: (id: string) => Awaitable<boolean>;
  readonly #stringify: (data: SessionData) => string;
  readonly #parse: (data: string) => SessionData;

  constructor(options: KvSessionStoreOptions) {
    const {
      getStore,
      generateId = async () => await randomUUID(),
      validateId = () => true,
      serializationOptions = {},
    } = options;

    this.#getStore = getStore;
    this.#generateId = generateId;
    this.#validateId = validateId;

    const { stringify = JSON.stringify, parse = JSON.parse } =
      serializationOptions;
    this.#stringify = stringify;
    this.#parse = parse;
  }

  async load(id: string | null, ctx: RequestContext) {
    if (!id || !(await this.#validateId(id))) {
      return null;
    }

    const store = await this.#getStore(ctx);
    const value = await store.get(id);

    return value && this.#parse(value);
  }

  async save(
    id: string | null,
    data: SessionData,
    maxAge: number,
    ctx: RequestContext,
  ) {
    if (!id || !(await this.#validateId(id))) {
      id = await this.#generateId();
    }

    const store = await this.#getStore(ctx);
    await store.put(id, this.#stringify(data), {
      expirationTtl: Math.max(maxAge / 1000, 60),
    });

    return id;
  }

  async destroy(id: string, ctx: RequestContext) {
    const store = await this.#getStore(ctx);
    await store.delete(id);
  }
}
