import { createServer } from "http";
import { NodeHandler } from ".";

export interface ServerOptions {
  host?: string;
  port?: number;
}

export function startServer(handler: NodeHandler, options: ServerOptions = {}) {
  const {
    host = process.env.HOST || "localhost",
    port = Number(process.env.PORT) || 3000,
  } = options;

  const server = createServer((req, res) => {
    handler(req, res, () => {
      if (!res.writableEnded) {
        res.statusCode = 404;
        res.end();
      }
    });
  });

  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${host}:${port}`);
  });
}
