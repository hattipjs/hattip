import nodeAdapter from "@hattip/adapter-node";
import handler from "./index.js";
import { createServer } from "http";

const middleware = (req, res, next) => {
  function getForwardedHeader(name) {
    return (String(req.headers["x-forwarded-" + name]) || "")
      .split(",", 1)[0]
      .trim();
  }

  if (process.env.TRUST_PROXY === "1") {
    req.protocol = getForwardedHeader("proto");
    req.hostname = getForwardedHeader("host");
    req.ip = getForwardedHeader("for");
  }

  nodeAdapter(handler)(req, res, next);
};

const server = createServer((req, res) =>
  middleware(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end();
    }
  }),
);

server.listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
