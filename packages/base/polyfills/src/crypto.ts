import crypto from "crypto";

export default function install() {
  globalThis.crypto = globalThis.crypto ?? (crypto.webcrypto as any);
}
