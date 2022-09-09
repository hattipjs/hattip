export function fromBase64(input: string): Uint8Array {
  return typeof atob === "function"
    ? Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
    : Buffer.from(input, "base64");
}

export function toBase64(input: Uint8Array): string {
  return typeof btoa === "function"
    ? btoa(String.fromCharCode(...input))
    : Buffer.from(input).toString("base64");
}

export async function signatureKeyFromSecret(
  secret: string,
): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  return key;
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return toBase64(new Uint8Array(exported));
}

export async function importSignatureKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    fromBase64(key),
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
}

export async function sign(data: string, key: CryptoKey) {
  const signature = await crypto.subtle.sign(
    { name: "HMAC", hash: "SHA-256" },
    key,
    new TextEncoder().encode(data),
  );

  return toBase64(new Uint8Array(signature)) + "." + data;
}

export async function verify(
  signed: string,
  keys: Array<CryptoKey>,
): Promise<string | null> {
  try {
    const [signatureText, dataText = ""] = signed.split(".", 2);

    const signature = fromBase64(signatureText);
    const data = new TextEncoder().encode(dataText);

    for (const key of keys) {
      try {
        const result = await crypto.subtle.verify(
          {
            name: "HMAC",
            hash: "SHA-256",
          },
          key,
          signature,
          data,
        );

        if (result) {
          return dataText;
        }
      } catch {
        // Do nothing
      }
    }
  } catch {
    // Do nothing
  }

  return null;
}

export async function generateSignatureKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  return key;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  return key;
}

export async function importEncryptionKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    fromBase64(key),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(data: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(data),
  );

  return toBase64(iv) + "." + toBase64(new Uint8Array(encrypted));
}

export async function decrypt(
  encrypted: string,
  keys: Array<CryptoKey>,
): Promise<string | null> {
  try {
    const [iv, data] = encrypted.split(".", 2).map(fromBase64);

    for (const key of keys) {
      try {
        const result = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
          },
          key,
          data,
        );

        return new TextDecoder().decode(result);
      } catch {
        // Do nothing
      }
    }
  } catch {
    // Do nothing
  }

  return null;
}

export async function randomUUID(): Promise<string> {
  return crypto.randomUUID();
}
