import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export default function bunAdapter(handler: HattipHandler) {
  return {
    fetch(request: Request) {
      const context: AdapterRequestContext = {
        request,
        // TODO: How to get the IP address?
        ip: "127.0.0.1",
        passThrough() {
          // No op
        },
        waitUntil() {
          // No op
        },
        platform: {},
      };

      return handler(context);
    },
  };
}
