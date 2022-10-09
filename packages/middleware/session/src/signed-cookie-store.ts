import { SessionData, SessionSerializationOptions } from ".";
import {
  exportKey,
  generateSignatureKey,
  importSignatureKey,
  sign,
  signatureKeyFromSecret,
  verify,
} from "./crypto";
import { SimpleCookieStore } from "./simple-cookie-store";

export class SignedCookieStore extends SimpleCookieStore {
  readonly #keys: CryptoKey[];

  constructor(
    keys: [CryptoKey, ...CryptoKey[]],
    serializationOptions: SessionSerializationOptions = {},
  ) {
    super(serializationOptions);
    this.#keys = keys;
  }

  static async generateKeysFromSecrets(
    secrets: [string, ...string[]],
  ): Promise<[CryptoKey, ...CryptoKey[]]> {
    const keys = await Promise.all(secrets.map(signatureKeyFromSecret));
    return keys as any;
  }

  static async generateKeysFromBase64(
    base64: [string, ...string[]],
  ): Promise<[CryptoKey, ...CryptoKey[]]> {
    const keys = await Promise.all(base64.map(importSignatureKey));
    return keys as any;
  }

  static async generateKey() {
    return generateSignatureKey();
  }

  static async exportKey(key: CryptoKey) {
    return exportKey(key);
  }

  async load(id: string) {
    const data = await verify(id, this.#keys);
    return data ? this._parse(data) : null;
  }

  save(_id: string | null, data: SessionData, maxAge: number) {
    return sign(this._stringify(data), this.#keys[0], maxAge);
  }
}
