import { createServer, IncomingMessage, ServerResponse } from "http";
import { Stats } from "fs";
import { NodeHandler } from ".";
import sirv from "sirv";

export interface FullStackServerOptions {
  host?: string;
  port?: number;
  sirvDir?: string;
  sirvOptions?: SirvOptions;
}

export interface SirvOptions {
  dev?: boolean;
  etag?: boolean;
  maxAge?: number;
  immutable?: boolean;
  single?: string | boolean;
  ignores?: false | string | RegExp | (string | RegExp)[];
  extensions?: string[];
  dotfiles?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  onNoMatch?: (req: IncomingMessage, res: ServerResponse) => void;
  setHeaders?: (res: ServerResponse, pathname: string, stats: Stats) => void;
}

export function startServer(
  handler: NodeHandler,
  options: FullStackServerOptions = {},
) {
  const {
    host = process.env.HOST || "localhost",
    port = Number(process.env.PORT) || 3000,
    sirvDir,
    sirvOptions,
  } = options;

  const sirvMiddleware = sirv(sirvDir, sirvOptions);

  const server = createServer((req, res) => {
    sirvMiddleware(req, res, () => {
      handler(req, res, () => {
        if (!res.writableEnded) {
          res.statusCode = 404;
          res.end();
        }
      });
    });
  });

  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${host}:${port}`);
  });
}
