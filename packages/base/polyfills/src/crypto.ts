import crypto from "crypto";

export default function install() {
	if (globalThis.crypto) return;

	Object.defineProperty(globalThis, "crypto", {
		value: crypto.webcrypto,
		writable: false,
		configurable: true,
	});
}
