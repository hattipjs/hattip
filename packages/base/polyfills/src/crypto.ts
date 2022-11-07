import { webcrypto } from "crypto";

export default function install() {
  if (globalThis.crypto) return;

  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
