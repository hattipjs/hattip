import { SessionData, SessionSerializationOptions } from ".";
import {
  decrypt,
  encrypt,
  exportKey,
  generateEncryptionKey,
  importEncryptionKey,
} from "./crypto";
import { SimpleCookieStore } from "./simple-cookie-store";

export class EncryptedCookieStore extends SimpleCookieStore {
  readonly #keys: CryptoKey[];

  constructor(
    keys: [CryptoKey, ...CryptoKey[]],
    serializationOptions: SessionSerializationOptions = {},
  ) {
    super(serializationOptions);
    this.#keys = keys;
  }

  static async generateKeysFromBase64(
    base64: [string, ...string[]],
  ): Promise<[CryptoKey, ...CryptoKey[]]> {
    const keys = await Promise.all(base64.map(importEncryptionKey));
    return keys as any;
  }

  static async generateKey() {
    return generateEncryptionKey();
  }

  static async exportKey(key: CryptoKey) {
    return exportKey(key);
  }

  async load(id: string) {
    const data = await decrypt(id, this.#keys);
    return data && this._parse(data);
  }

  save(_id: string | null, data: SessionData, maxAge: number) {
    return encrypt(this._stringify(data), this.#keys[0], maxAge);
  }
}
