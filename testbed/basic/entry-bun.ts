import { AdapterRequestContext } from "../../packages/base/core/index.js";
// @ts-ignore
import hattipHandler from "./index.js";

export default {
  port: 3000,
  origin: "http://127.0.0.1:3000",
  fetch(request: Request) {
    const context: AdapterRequestContext = {
      request,
      ip: "127.0.0.1",
      passThrough() {},
      waitUntil() {},
      platform: {},
    };
    return hattipHandler(context);
  },
};
