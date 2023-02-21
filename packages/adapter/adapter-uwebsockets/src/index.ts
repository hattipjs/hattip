import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";

installNodeFetch();
installGetSetCookie();
installCrypto();

export type {
	UWebSocketAdapterOptions,
	UWebSocketPlatformInfo,
} from "./common";

export { createServer } from "./common";
