export function fromBase64(input: string): Uint8Array {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  return typeof atob === "function"
    ? Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
    : Buffer.from(input, "base64");
}

export function toBase64(input: Uint8Array): string {
  return (
    typeof btoa === "function"
      ? btoa(String.fromCharCode(...input))
      : Buffer.from(input).toString("base64")
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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

export async function sign(data: string, key: CryptoKey, maxAge: number) {
  data = dateToBase64(new Date(Date.now() + maxAge)) + "." + data;

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
    const [signatureText, dataText = ""] = split(signed);

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
          const [dateText, data] = split(dataText);
          const date = base64ToDate(dateText);
          if (date > new Date()) {
            return data;
          }
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

export async function encrypt(data: string, key: CryptoKey, maxAge: number) {
  data = dateToBase64(new Date(Date.now() + maxAge)) + "." + data;
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
    const [iv, data] = split(encrypted).map(fromBase64);

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

        const combined = new TextDecoder().decode(result);
        const [dateText, dataText] = split(combined);
        const date = base64ToDate(dateText);
        if (date > new Date()) {
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

export async function randomUUID(): Promise<string> {
  return crypto.randomUUID();
}

export function dateToBase64(d: Date) {
  const n = d.getTime();
  if (isNaN(n) || n < 0) {
    throw new TypeError("Invalid date");
  }
  return toBase64(numberToBytes(n));
}

export function base64ToDate(s: string) {
  return bytesToDate(fromBase64(s));
}

export function bytesToDate(bytes: Uint8Array) {
  return new Date(bytesToNumber(bytes));
}

export function numberToBytes(n: number) {
  const bytes = new Uint8Array(8);
  let i = 0;
  while (n) {
    bytes[i++] = n % 256;
    n = Math.floor(n / 256);
  }

  return bytes.slice(0, i);
}

export function bytesToNumber(bytes: Uint8Array) {
  let n = 0;
  for (let i = bytes.length - 1; i >= 0; i--) {
    n = n * 256 + bytes[i];
  }

  return n;
}

function split(s: string): [string, string] {
  let dotPos = s.indexOf(".");
  if (dotPos === -1) {
    dotPos = s.length;
  }

  return [s.slice(0, dotPos), s.slice(dotPos + 1)];
}
