declare module "https://deno.land/std@0.144.0/http/server.ts" {
  export function serve(
    handler: Handler,
    options: ServeInit = {},
  ): Promise<void>;

  export interface ServeInit extends Partial<Deno.ListenOptions> {
    /** An AbortSignal to close the server and all connections. */
    signal?: AbortSignal;

    /** The handler to invoke when route handlers throw an error. */
    onError?: (error: unknown) => Response | Promise<Response>;

    /** The callback which is called when the server started listening */
    onListen?: (params: { hostname: string; port: number }) => void;
  }
}

declare module "https://deno.land/std@0.144.0/http/file_server.ts" {
  export function serveDir(req: Request, opts: ServeDirOptions = {});

  /** Interface for serveDir options. */
  export interface ServeDirOptions {
    /** Serves the files under the given directory root. Defaults to your current directory. */
    fsRoot?: string;
    /** Specified that part is stripped from the beginning of the requested pathname. */
    urlRoot?: string;
    /** Enable directory listing. Defaults to false. */
    showDirListing?: boolean;
    /** Serves dotfiles. Defaults to false. */
    showDotfiles?: boolean;
    /** Enable CORS via the "Access-Control-Allow-Origin" header. Defaults to false. */
    enableCors?: boolean;
    /** Do not print request level logs. Defaults to false. Defaults to false. */
    quiet?: boolean;
    /** The algorithm to use for generating the ETag. Defaults to "fnv1a". */
    etagAlgorithm?: EtagAlgorithm;
  }

  /** Algorithm used to determine etag */
  export type EtagAlgorithm =
    | "fnv1a"
    | "sha-1"
    | "sha-256"
    | "sha-384"
    | "sha-512";
}
