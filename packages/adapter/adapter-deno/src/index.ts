/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.144.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.144.0/http/file_server.ts";

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export interface DenoPlatformInfo {
  connInfo: ConnInfo;
}

export type DenoRequestHandler = (
  request: Request,
  connInfo: ConnInfo,
) => Response | Promise<Response>;

export interface ConnInfo {
  readonly localAddr: DenoTcpAddr;
  readonly remoteAddr: DenoTcpAddr;
}

export interface DenoTcpAddr {
  transport: "tcp";
  hostname: string;
  port: number;
}

export function createRequestHandler(
  handler: HattipHandler,
): DenoRequestHandler {
  return async function fetchHandler(request, connInfo) {
    const context: AdapterRequestContext<DenoPlatformInfo> = {
      request,
      ip: connInfo.remoteAddr.hostname,
      waitUntil() {
        // No op
      },
      passThrough() {
        // No op
      },
      platform: { connInfo },
    };

    return handler(context);
  };
}

export type serve = (
  handler: DenoRequestHandler,
  options: ServeInit,
) => Promise<void>;

export interface ServeInit extends Partial<DenoListenOptions> {
  signal?: AbortSignal;
  onError?: (error: unknown) => Response | Promise<Response>;
  onListen?: (params: { hostname: string; port: number }) => void;
}

export interface DenoListenOptions {
  port: number;
  hostname?: string;
}

export type serveDir = (
  req: Request,
  opts: ServeDirOptions,
) => Promise<Request>;

export interface ServeDirOptions {
  fsRoot?: string;
  urlRoot?: string;
  showDirListing?: boolean;
  showDotfiles?: boolean;
  enableCors?: boolean;
  quiet?: boolean;
  etagAlgorithm?: EtagAlgorithm;
}

export type EtagAlgorithm =
  | "fnv1a"
  | "sha-1"
  | "sha-256"
  | "sha-384"
  | "sha-512";

export { serve, serveDir };
