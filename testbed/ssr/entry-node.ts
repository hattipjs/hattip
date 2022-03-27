import nodeAdapter, { NodeHandler } from "@hattip/adapter-node";
import handler from ".";

const middleware: NodeHandler = (req, res, next) => {
  function getForwardedHeader(name: string) {
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

export default middleware;
