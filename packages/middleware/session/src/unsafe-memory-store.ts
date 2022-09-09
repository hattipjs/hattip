import { Awaitable, SessionData, SessionStore } from ".";
import { randomUUID } from "./crypto";

export class UnsafeMemorySessionStore implements SessionStore {
  readonly #generateId: () => Awaitable<string>;
  readonly #store = new Map<string, [data: SessionData, expires?: Date]>();

  constructor(generateId: () => Awaitable<string> = () => randomUUID()) {
    this.#generateId = generateId;
  }

  async load(id: string) {
    const [data, expires] = this.#store.get(id) ?? [undefined, undefined];
    if (expires && expires.getTime() < Date.now()) {
      await this.destroy(id);
      return null;
    }

    return data ?? null;
  }

  async save(
    id: string | null,
    data: SessionData,
    maxAge?: number | undefined,
  ) {
    const newId = id ?? (await this.#generateId());
    this.#store.set(newId, [
      data,
      maxAge ? new Date(Date.now() + maxAge) : undefined,
    ]);

    return newId;
  }

  async destroy(id: string) {
    this.#store.delete(id);
  }
}
