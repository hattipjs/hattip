import * as webStream from "node:stream/web";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";
import installHalfDuplexRequest from "@hattip/polyfills/half-duplex-request";

installGetSetCookie();
installCrypto();
installHalfDuplexRequest();

for (const key of Object.keys(webStream)) {
	if (!(key in globalThis)) {
		(globalThis as any)[key] = (webStream as any)[key];
	}
}
