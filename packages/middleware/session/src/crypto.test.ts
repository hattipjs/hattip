import { describe, test, expect } from "vitest";
import installCrypto from "@hattip/polyfills/crypto";
import {
  decrypt,
  encrypt,
  exportKey,
  generateEncryptionKey,
  signatureKeyFromSecret,
  sign,
  verify,
  generateSignatureKey,
  importSignatureKey,
  importEncryptionKey,
} from "./crypto";

installCrypto();

describe("sign and verify", () => {
  test("signs and verifies", async () => {
    const key = await signatureKeyFromSecret("topsecret");
    const signed = await sign("hello", key);
    const verified = await verify(signed, [key]);
    expect(verified).toBe("hello");
  });

  test("can use multiple keys", async () => {
    const key1 = await signatureKeyFromSecret("topsecret");
    const key2 = await signatureKeyFromSecret("topsecret2");
    const signed = await sign("hello", key2);
    const verified = await verify(signed, [key1, key2]);
    expect(verified).toBe("hello");
  });

  test("returns null if not valid", async () => {
    const key = await generateSignatureKey();
    const signed = await sign("hello", key);
    const verified = await verify(signed.replace("hello", "hello2"), [key]);
    expect(verified).toBeNull();
  });

  test("returns null if not signed", async () => {
    const key = await signatureKeyFromSecret("topsecret");
    const verified = await verify("hello", [key]);
    expect(verified).toBeNull();
  });

  test("exports and imports", async () => {
    const key = await generateSignatureKey();
    const exported = await exportKey(key);
    const imported = await importSignatureKey(exported);
    const reexported = await exportKey(imported);
    expect(exported).toBe(reexported);
  });
});

describe("encrypt and decrypt", () => {
  test("it encrypts and decrypts", async () => {
    const key = await generateEncryptionKey();
    const encrypted = await encrypt("hello", key);
    const decrypted = await decrypt(encrypted, [key]);
    expect(decrypted).toBe("hello");
  });

  test("it can use multiple keys", async () => {
    const key1 = await generateEncryptionKey();
    const key2 = await generateEncryptionKey();
    const encrypted = await encrypt("hello", key2);
    const decrypted = await decrypt(encrypted, [key1, key2]);
    expect(decrypted).toBe("hello");
  });

  test("it returns null if not valid", async () => {
    const key = await generateEncryptionKey();
    const encrypted = await encrypt("hello", key);
    const decrypted = await decrypt("x" + encrypted, [key]);
    expect(decrypted).toBeNull();
  });

  test("exports and imports", async () => {
    const key = await generateEncryptionKey();
    const exported = await exportKey(key);
    const imported = await importEncryptionKey(exported);
    const reexported = await exportKey(imported);
    expect(exported).toBe(reexported);
  });
});
