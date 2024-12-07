// TODO: Remove or update this rule!
import installCrypto from "@hattip/polyfills/crypto";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installWhatwgNodeFetch from "@hattip/polyfills/whatwg-node";

installWhatwgNodeFetch();
installGetSetCookie();
installCrypto();
