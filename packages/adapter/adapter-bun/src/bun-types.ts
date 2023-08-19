import type { Buffer } from "node:buffer";

export type Serve<WebSocketDataType = undefined> =
	| ServeOptions
	| TLSServeOptions
	| WebSocketServeOptions<WebSocketDataType>
	| TLSWebSocketServeOptions<WebSocketDataType>;

export interface ServeOptions extends GenericServeOptions {
	/**
	 * Handle HTTP requests
	 *
	 * Respond to {@link Request} objects with a {@link Response} object.
	 *
	 */
	fetch(
		this: Server,
		request: Request,
		server: Server,
	): Response | Promise<Response>;
}

/**
 * HTTP & HTTPS Server
 *
 * To start the server, see {@link serve}
 *
 * For performance, Bun pre-allocates most of the data for 2048 concurrent requests.
 * That means starting a new server allocates about 500 KB of memory. Try to
 * avoid starting and stopping the server often (unless it's a new instance of bun).
 *
 * Powered by a fork of [uWebSockets](https://github.com/uNetworking/uWebSockets). Thank you @alexhultman.
 *
 */
export interface Server {
	/**
	 * Stop listening to prevent new connections from being accepted.
	 *
	 * By default, it does not cancel in-flight requests or websockets. That means it may take some time before all network activity stops.
	 *
	 * @param closeActiveConnections Immediately terminate in-flight requests, websockets, and stop accepting new connections.
	 * @default false
	 */
	stop(closeActiveConnections?: boolean): void;

	/**
	 * Update the `fetch` and `error` handlers without restarting the server.
	 *
	 * This is useful if you want to change the behavior of your server without
	 * restarting it or for hot reloading.
	 *
	 * @example
	 *
	 * ```js
	 * // create the server
	 * const server = Bun.serve({
	 *  fetch(request) {
	 *    return new Response("Hello World v1")
	 *  }
	 * });
	 *
	 * // Update the server to return a different response
	 * server.update({
	 *   fetch(request) {
	 *     return new Response("Hello World v2")
	 *   }
	 * });
	 * ```
	 *
	 * Passing other options such as `port` or `hostname` won't do anything.
	 */
	reload(options: Serve): void;

	/**
	 * Mock the fetch handler for a running server.
	 *
	 * This feature is not fully implemented yet. It doesn't normalize URLs
	 * consistently in all cases and it doesn't yet call the `error` handler
	 * consistently. This needs to be fixed
	 */
	fetch(request: Request | string): Response | Promise<Response>;

	/**
	 * Upgrade a {@link Request} to a {@link ServerWebSocket}
	 *
	 * @param request The {@link Request} to upgrade
	 * @param options Pass headers or attach data to the {@link ServerWebSocket}
	 *
	 * @returns `true` if the upgrade was successful and `false` if it failed
	 *
	 * @example
	 * ```js
	 * import { serve } from "bun";
	 *  serve({
	 *    websocket: {
	 *      open: (ws) => {
	 *        console.log("Client connected");
	 *      },
	 *      message: (ws, message) => {
	 *        console.log("Client sent message", message);
	 *      },
	 *      close: (ws) => {
	 *        console.log("Client disconnected");
	 *      },
	 *    },
	 *    fetch(req, server) {
	 *      const url = new URL(req.url);
	 *      if (url.pathname === "/chat") {
	 *        const upgraded = server.upgrade(req);
	 *        if (!upgraded) {
	 *          return new Response("Upgrade failed", { status: 400 });
	 *        }
	 *      }
	 *      return new Response("Hello World");
	 *    },
	 *  });
	 * ```
	 *  What you pass to `data` is available on the {@link ServerWebSocket.data} property
	 *
	 */
	upgrade<T = undefined>(
		request: Request,
		options?: {
			/**
			 * Send any additional headers while upgrading, like cookies
			 */
			headers?: HeadersInit;
			/**
			 * This value is passed to the {@link ServerWebSocket.data} property
			 */
			data?: T;
		},
	): boolean;

	/**
	 * Send a message to all connected {@link ServerWebSocket} subscribed to a topic
	 *
	 * @param topic The topic to publish to
	 * @param data The data to send
	 * @param compress Should the data be compressed? Ignored if the client does not support compression.
	 *
	 * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
	 *
	 * @example
	 *
	 * ```js
	 * server.publish("chat", "Hello World");
	 * ```
	 *
	 * @example
	 * ```js
	 * server.publish("chat", new Uint8Array([1, 2, 3, 4]));
	 * ```
	 *
	 * @example
	 * ```js
	 * server.publish("chat", new ArrayBuffer(4), true);
	 * ```
	 *
	 * @example
	 * ```js
	 * server.publish("chat", new DataView(new ArrayBuffer(4)));
	 * ```
	 */
	publish(
		topic: string,
		data: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
		compress?: boolean,
	): ServerWebSocketSendStatus;

	/**
	 * How many requests are in-flight right now?
	 */
	readonly pendingRequests: number;

	/**
	 * How many {@link ServerWebSocket}s are in-flight right now?
	 */
	readonly pendingWebSockets: number;

	readonly port: number;
	/**
	 * The hostname the server is listening on. Does not include the port
	 * @example
	 * ```js
	 * "localhost"
	 * ```
	 */
	readonly hostname: string;
	/**
	 * Is the server running in development mode?
	 *
	 * In development mode, `Bun.serve()` returns rendered error messages with
	 * stack traces instead of a generic 500 error. This makes debugging easier,
	 * but development mode shouldn't be used in production or you will risk
	 * leaking sensitive information.
	 *
	 */
	readonly development: boolean;
}

export interface TLSServeOptions extends ServeOptions, TLSOptions {
	/**
	 *  The keys are [SNI](https://en.wikipedia.org/wiki/Server_Name_Indication) hostnames.
	 *  The values are SSL options objects.
	 */
	serverNames?: Record<string, TLSOptions>;

	tls?: TLSOptions;
}

export interface WebSocketServeOptions<WebSocketDataType = undefined>
	extends GenericServeOptions {
	/**
	 * Enable websockets with {@link Bun.serve}
	 *
	 * For simpler type safety, see {@link Bun.websocket}
	 *
	 * @example
	 * ```js
	 *import { serve } from "bun";
	 *serve({
	 *  websocket: {
	 *    open: (ws) => {
	 *      console.log("Client connected");
	 *    },
	 *    message: (ws, message) => {
	 *      console.log("Client sent message", message);
	 *    },
	 *    close: (ws) => {
	 *      console.log("Client disconnected");
	 *    },
	 *  },
	 *  fetch(req, server) {
	 *    const url = new URL(req.url);
	 *    if (url.pathname === "/chat") {
	 *      const upgraded = server.upgrade(req);
	 *      if (!upgraded) {
	 *        return new Response("Upgrade failed", { status: 400 });
	 *      }
	 *    }
	 *    return new Response("Hello World");
	 *  },
	 *});
	 *```
	 * Upgrade a {@link Request} to a {@link ServerWebSocket} via {@link Server.upgrade}
	 *
	 * Pass `data` in @{link Server.upgrade} to attach data to the {@link ServerWebSocket.data} property
	 *
	 *
	 */
	websocket: WebSocketHandler<WebSocketDataType>;

	/**
	 * Handle HTTP requests or upgrade them to a {@link ServerWebSocket}
	 *
	 * Respond to {@link Request} objects with a {@link Response} object.
	 *
	 */
	fetch(
		this: Server,
		request: Request,
		server: Server,
	): Response | undefined | Promise<Response | undefined>;
}

export interface TLSWebSocketServeOptions<WebSocketDataType = undefined>
	extends WebSocketServeOptions<WebSocketDataType>,
		TLSOptions {
	tls?: TLSOptions;
}

interface GenericServeOptions {
	/**
	 * What port should the server listen on?
	 * @default process.env.PORT || "3000"
	 */
	port?: string | number;

	/**
	 * What hostname should the server listen on?
	 *
	 * @default
	 * ```js
	 * "0.0.0.0" // listen on all interfaces
	 * ```
	 * @example
	 *  ```js
	 * "127.0.0.1" // Only listen locally
	 * ```
	 * @example
	 * ```js
	 * "remix.run" // Only listen on remix.run
	 * ````
	 *
	 * note: hostname should not include a {@link port}
	 */
	hostname?: string;

	/**
	 * What URI should be used to make {@link Request.url} absolute?
	 *
	 * By default, looks at {@link hostname}, {@link port}, and whether or not SSL is enabled to generate one
	 *
	 * @example
	 *```js
	 * "http://my-app.com"
	 * ```
	 *
	 * @example
	 *```js
	 * "https://wongmjane.com/"
	 * ```
	 *
	 * This should be the public, absolute URL – include the protocol and {@link hostname}. If the port isn't 80 or 443, then include the {@link port} too.
	 *
	 * @example
	 * "http://localhost:3000"
	 *
	 */
	// baseURI?: string;

	/**
	 * What is the maximum size of a request body? (in bytes)
	 * @default 1024 * 1024 * 128 // 128MB
	 */
	maxRequestBodySize?: number;

	/**
	 * Render contextual errors? This enables bun's error page
	 * @default process.env.NODE_ENV !== 'production'
	 */
	development?: boolean;

	error?: (
		this: Server,
		request: Errorlike,
	) => Response | Promise<Response> | undefined | void | Promise<undefined>;
}

type ServerWebSocketSendStatus = 0 | -1 | number;

interface TLSOptions {
	/**
	 * File path to a TLS key
	 *
	 * To enable TLS, this option is required.
	 *
	 * @deprecated since v0.6.3 - Use `key: Bun.file(path)` instead.
	 */
	keyFile?: string;
	/**
	 * File path to a TLS certificate
	 *
	 * To enable TLS, this option is required.
	 *
	 * @deprecated since v0.6.3 - Use `cert: Bun.file(path)` instead.
	 */
	certFile?: string;

	/**
	 * Passphrase for the TLS key
	 */
	passphrase?: string;
	/**
	 *  File path to a .pem file for a custom root CA
	 *
	 * @deprecated since v0.6.3 - Use `ca: Bun.file(path)` instead.
	 */
	caFile?: string;

	/**
	 * File path to a .pem file custom Diffie Helman parameters
	 */
	dhParamsFile?: string;

	/**
	 * Explicitly set a server name
	 */
	serverName?: string;

	/**
	 * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
	 * It reduces overall performance but saves some memory.
	 * @default false
	 */
	lowMemoryMode?: boolean;

	/**
	 * Optionally override the trusted CA certificates. Default is to trust
	 * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
	 * replaced when CAs are explicitly specified using this option.
	 */
	ca?: string | Buffer | BunFile | Array<string | Buffer | BunFile> | undefined;
	/**
	 *  Cert chains in PEM format. One cert chain should be provided per
	 *  private key. Each cert chain should consist of the PEM formatted
	 *  certificate for a provided private key, followed by the PEM
	 *  formatted intermediate certificates (if any), in order, and not
	 *  including the root CA (the root CA must be pre-known to the peer,
	 *  see ca). When providing multiple cert chains, they do not have to
	 *  be in the same order as their private keys in key. If the
	 *  intermediate certificates are not provided, the peer will not be
	 *  able to validate the certificate, and the handshake will fail.
	 */
	cert?:
		| string
		| Buffer
		| BunFile
		| Array<string | Buffer | BunFile>
		| undefined;
	/**
	 * Private keys in PEM format. PEM allows the option of private keys
	 * being encrypted. Encrypted keys will be decrypted with
	 * options.passphrase. Multiple keys using different algorithms can be
	 * provided either as an array of unencrypted key strings or buffers,
	 * or an array of objects in the form {pem: <string|buffer>[,
	 * passphrase: <string>]}. The object form can only occur in an array.
	 * object.passphrase is optional. Encrypted keys will be decrypted with
	 * object.passphrase if provided, or options.passphrase if it is not.
	 */
	key?:
		| string
		| Buffer
		| BunFile
		| Array<string | Buffer | BunFile>
		| undefined;
	/**
	 * Optionally affect the OpenSSL protocol behavior, which is not
	 * usually necessary. This should be used carefully if at all! Value is
	 * a numeric bitmask of the SSL_OP_* options from OpenSSL Options
	 */
	secureOptions?: number | undefined; // Value is a numeric bitmask of the `SSL_OP_*` options
}

/**
 * Create a server-side {@link ServerWebSocket} handler for use with {@link Bun.serve}
 *
 * @example
 * ```ts
 * import { websocket, serve } from "bun";
 *
 * serve<{name: string}>({
 *   port: 3000,
 *   websocket: {
 *     open: (ws) => {
 *       console.log("Client connected");
 *    },
 *     message: (ws, message) => {
 *       console.log(`${ws.data.name}: ${message}`);
 *    },
 *     close: (ws) => {
 *       console.log("Client disconnected");
 *    },
 *  },
 *
 *   fetch(req, server) {
 *     const url = new URL(req.url);
 *     if (url.pathname === "/chat") {
 *       const upgraded = server.upgrade(req, {
 *         data: {
 *           name: new URL(req.url).searchParams.get("name"),
 *        },
 *      });
 *       if (!upgraded) {
 *         return new Response("Upgrade failed", { status: 400 });
 *      }
 *      return;
 *    }
 *     return new Response("Hello World");
 *  },
 * });
 */
export type WebSocketHandler<T = undefined> = {
	/**
	 * Called when the server receives an incoming message.
	 *
	 * If the message is not a `string`, its type is based on the value of `binaryType`.
	 * - if `nodebuffer`, then the message is a `Buffer`.
	 * - if `arraybuffer`, then the message is an `ArrayBuffer`.
	 * - if `uint8array`, then the message is a `Uint8Array`.
	 *
	 * @param ws The websocket that sent the message
	 * @param message The message received
	 */
	message(
		ws: ServerWebSocket<T>,
		message: string | Buffer,
	): void | Promise<void>;

	/**
	 * Called when a connection is opened.
	 *
	 * @param ws The websocket that was opened
	 */
	open?(ws: ServerWebSocket<T>): void | Promise<void>;

	/**
	 * Called when a connection was previously under backpressure,
	 * meaning it had too many queued messages, but is now ready to receive more data.
	 *
	 * @param ws The websocket that is ready for more data
	 */
	drain?(ws: ServerWebSocket<T>): void | Promise<void>;

	/**
	 * Called when a connection is closed.
	 *
	 * @param ws The websocket that was closed
	 * @param code The close code
	 * @param message The close message
	 */
	close?(
		ws: ServerWebSocket<T>,
		code: number,
		reason: string,
	): void | Promise<void>;

	/**
	 * Called when a ping is sent.
	 *
	 * @param ws The websocket that received the ping
	 * @param data The data sent with the ping
	 */
	ping?(ws: ServerWebSocket<T>, data: Buffer): void | Promise<void>;

	/**
	 * Called when a pong is received.
	 *
	 * @param ws The websocket that received the ping
	 * @param data The data sent with the ping
	 */
	pong?(ws: ServerWebSocket<T>, data: Buffer): void | Promise<void>;

	/**
	 * Sets the maximum size of messages in bytes.
	 *
	 * Default is 16 MB, or `1024 * 1024 * 16` in bytes.
	 */
	maxPayloadLength?: number;

	/**
	 * Sets the maximum number of bytes that can be buffered on a single connection.
	 *
	 * Default is 16 MB, or `1024 * 1024 * 16` in bytes.
	 */
	backpressureLimit?: number;

	/**
	 * Sets if the connection should be closed if `backpressureLimit` is reached.
	 *
	 * Default is `false`.
	 */
	closeOnBackpressureLimit?: boolean;

	/**
	 * Sets the the number of seconds to wait before timing out a connection
	 * due to no messages or pings.
	 *
	 * Default is 2 minutes, or `120` in seconds.
	 */
	idleTimeout?: number;

	/**
	 * Should `ws.publish()` also send a message to `ws` (itself), if it is subscribed?
	 *
	 * Default is `false`.
	 */
	publishToSelf?: boolean;

	/**
	 * Should the server automatically send and respond to pings to clients?
	 *
	 * Default is `true`.
	 */
	sendPings?: boolean;

	/**
	 * Sets the compression level for messages, for clients that supports it. By default, compression is disabled.
	 *
	 * Default is `false`.
	 */
	perMessageDeflate?:
		| boolean
		| {
				/**
				 * Sets the compression level.
				 */
				compress?: WebSocketCompressor | boolean;
				/**
				 * Sets the decompression level.
				 */
				decompress?: WebSocketCompressor | boolean;
		  };
};

export interface Errorlike extends Error {
	code?: string;
	errno?: number;
	syscall?: string;
}

/**
 * [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) powered by the fastest system calls available for operating on files.
 *
 * This Blob is lazy. That means it won't do any work until you read from it.
 *
 * - `size` will not be valid until the contents of the file are read at least once.
 * - `type` is auto-set based on the file extension when possible
 *
 * @example
 * ```js
 * const file = Bun.file("./hello.json");
 * console.log(file.type); // "application/json"
 * console.log(await file.text()); // '{"hello":"world"}'
 * ```
 *
 * @example
 * ```js
 * await Bun.write(
 *   Bun.file("./hello.txt"),
 *   "Hello, world!"
 * );
 * ```
 *
 */
export interface BunFile extends Blob {
	/**
	 * Offset any operation on the file starting at `begin` and ending at `end`. `end` is relative to 0
	 *
	 * Similar to [`TypedArray.subarray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/subarray). Does not copy the file, open the file, or modify the file.
	 *
	 * If `begin` > 0, {@link Bun.write()} will be slower on macOS
	 *
	 * @param begin - start offset in bytes
	 * @param end - absolute offset in bytes (relative to 0)
	 * @param contentType - MIME type for the new BunFile
	 */
	slice(begin?: number, end?: number, contentType?: string): BunFile;

	/**
	 *
	 */
	/**
	 * Offset any operation on the file starting at `begin`
	 *
	 * Similar to [`TypedArray.subarray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/subarray). Does not copy the file, open the file, or modify the file.
	 *
	 * If `begin` > 0, {@link Bun.write()} will be slower on macOS
	 *
	 * @param begin - start offset in bytes
	 * @param contentType - MIME type for the new BunFile
	 */
	slice(begin?: number, contentType?: string): BunFile;

	/**
	 * @param contentType - MIME type for the new BunFile
	 */
	slice(contentType?: string): BunFile;

	/**
	 * Incremental writer for files and pipes.
	 */
	writer(options?: { highWaterMark?: number }): FileSink;

	readonly readable: ReadableStream;

	// TODO: writable: WritableStream;

	/**
	 * A UNIX timestamp indicating when the file was last modified.
	 */
	lastModified: number;
	/**
	 * The name or path of the file, as specified in the constructor.
	 */
	readonly name?: string;

	/**
	 * Does the file exist?
	 *
	 * This returns true for regular files and FIFOs. It returns false for
	 * directories. Note that a race condition can occur where the file is
	 * deleted or renamed after this is called but before you open it.
	 *
	 * This does a system call to check if the file exists, which can be
	 * slow.
	 *
	 * If using this in an HTTP server, it's faster to instead use `return new
	 * Response(Bun.file(path))` and then an `error` handler to handle
	 * exceptions.
	 *
	 * Instead of checking for a file's existence and then performing the
	 * operation, it is faster to just perform the operation and handle the
	 * error.
	 *
	 * For empty Blob, this always returns true.
	 */
	exists(): Promise<boolean>;
}

/**
 * A fast WebSocket designed for servers.
 *
 * Features:
 * - **Message compression** - Messages can be compressed
 * - **Backpressure** - If the client is not ready to receive data, the server will tell you.
 * - **Dropped messages** - If the client cannot receive data, the server will tell you.
 * - **Topics** - Messages can be {@link ServerWebSocket.publish}ed to a specific topic and the client can {@link ServerWebSocket.subscribe} to topics
 *
 * This is slightly different than the browser {@link WebSocket} which Bun supports for clients.
 *
 * Powered by [uWebSockets](https://github.com/uNetworking/uWebSockets).
 *
 * @example
 * import { serve } from "bun";
 *
 * serve({
 *   websocket: {
 *     open(ws) {
 *       console.log("Connected", ws.remoteAddress);
 *     },
 *     message(ws, data) {
 *       console.log("Received", data);
 *       ws.send(data);
 *     },
 *     close(ws, code, reason) {
 *       console.log("Disconnected", code, reason);
 *     },
 *   }
 * });
 */
export interface ServerWebSocket<T = undefined> {
	/**
	 * Sends a message to the client.
	 *
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.send("Hello!");
	 * ws.send("Compress this.", true);
	 * ws.send(new Uint8Array([1, 2, 3, 4]));
	 */
	send(
		data: string | BufferSource,
		compress?: boolean,
	): ServerWebSocketSendStatus;

	/**
	 * Sends a text message to the client.
	 *
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.send("Hello!");
	 * ws.send("Compress this.", true);
	 */
	sendText(data: string, compress?: boolean): ServerWebSocketSendStatus;

	/**
	 * Sends a binary message to the client.
	 *
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.send(new TextEncoder().encode("Hello!"));
	 * ws.send(new Uint8Array([1, 2, 3, 4]), true);
	 */
	sendBinary(data: BufferSource, compress?: boolean): ServerWebSocketSendStatus;

	/**
	 * Closes the connection.
	 *
	 * Here is a list of close codes:
	 * - `1000` means "normal closure" **(default)**
	 * - `1009` means a message was too big and was rejected
	 * - `1011` means the server encountered an error
	 * - `1012` means the server is restarting
	 * - `1013` means the server is too busy or the client is rate-limited
	 * - `4000` through `4999` are reserved for applications (you can use it!)
	 *
	 * To close the connection abruptly, use `terminate()`.
	 *
	 * @param code The close code to send
	 * @param reason The close reason to send
	 */
	close(code?: number, reason?: string): void;

	/**
	 * Abruptly close the connection.
	 *
	 * To gracefully close the connection, use `close()`.
	 */
	terminate(): void;

	/**
	 * Sends a ping.
	 *
	 * @param data The data to send
	 */
	ping(data?: string | BufferSource): ServerWebSocketSendStatus;

	/**
	 * Sends a pong.
	 *
	 * @param data The data to send
	 */
	pong(data?: string | BufferSource): ServerWebSocketSendStatus;

	/**
	 * Sends a message to subscribers of the topic.
	 *
	 * @param topic The topic name.
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.publish("chat", "Hello!");
	 * ws.publish("chat", "Compress this.", true);
	 * ws.publish("chat", new Uint8Array([1, 2, 3, 4]));
	 */
	publish(
		topic: string,
		data: string | BufferSource,
		compress?: boolean,
	): ServerWebSocketSendStatus;

	/**
	 * Sends a text message to subscribers of the topic.
	 *
	 * @param topic The topic name.
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.publish("chat", "Hello!");
	 * ws.publish("chat", "Compress this.", true);
	 */
	publishText(
		topic: string,
		data: string,
		compress?: boolean,
	): ServerWebSocketSendStatus;

	/**
	 * Sends a binary message to subscribers of the topic.
	 *
	 * @param topic The topic name.
	 * @param data The data to send.
	 * @param compress Should the data be compressed? If the client does not support compression, this is ignored.
	 * @example
	 * ws.publish("chat", new TextEncoder().encode("Hello!"));
	 * ws.publish("chat", new Uint8Array([1, 2, 3, 4]), true);
	 */
	publishBinary(
		topic: string,
		data: BufferSource,
		compress?: boolean,
	): ServerWebSocketSendStatus;

	/**
	 * Subscribes a client to the topic.
	 *
	 * @param topic The topic name.
	 * @example
	 * ws.subscribe("chat");
	 */
	subscribe(topic: string): void;

	/**
	 * Unsubscribes a client to the topic.
	 *
	 * @param topic The topic name.
	 * @example
	 * ws.unsubscribe("chat");
	 */
	unsubscribe(topic: string): void;

	/**
	 * Is the client subscribed to a topic?
	 *
	 * @param topic The topic name.
	 * @example
	 * ws.subscribe("chat");
	 * console.log(ws.isSubscribed("chat")); // true
	 */
	isSubscribed(topic: string): boolean;

	/**
	 * Batches `send()` and `publish()` operations, which makes it faster to send data.
	 *
	 * The `message`, `open`, and `drain` callbacks are automatically corked, so
	 * you only need to call this if you are sending messages outside of those
	 * callbacks or in async functions.
	 *
	 * @param callback The callback to run.
	 * @example
	 * ws.cork((ctx) => {
	 *   ctx.send("These messages");
	 *   ctx.sendText("are sent");
	 *   ctx.sendBinary(new TextEncoder().encode("together!"));
	 * });
	 */
	cork<T = unknown>(callback: (ws: ServerWebSocket<T>) => T): T;

	/**
	 * The IP address of the client.
	 *
	 * @example
	 * console.log(socket.remoteAddress); // "127.0.0.1"
	 */
	readonly remoteAddress: string;

	/**
	 * The ready state of the client.
	 *
	 * - if `0`, the client is connecting.
	 * - if `1`, the client is connected.
	 * - if `2`, the client is closing.
	 * - if `3`, the client is closed.
	 *
	 * @example
	 * console.log(socket.readyState); // 1
	 */
	readonly readyState: WebSocketReadyState;

	/**
	 * Sets how binary data is returned in events.
	 *
	 * - if `nodebuffer`, binary data is returned as `Buffer` objects. **(default)**
	 * - if `arraybuffer`, binary data is returned as `ArrayBuffer` objects.
	 * - if `uint8array`, binary data is returned as `Uint8Array` objects.
	 *
	 * @example
	 * let ws: WebSocket;
	 * ws.binaryType = "uint8array";
	 * ws.addEventListener("message", ({ data }) => {
	 *   console.log(data instanceof Uint8Array); // true
	 * });
	 */
	binaryType?: "nodebuffer" | "arraybuffer" | "uint8array";

	/**
	 * Custom data that you can assign to a client, can be read and written at any time.
	 *
	 * @example
	 * import { serve } from "bun";
	 *
	 * serve({
	 *   fetch(request, server) {
	 *     const data = {
	 *       accessToken: request.headers.get("Authorization"),
	 *     };
	 *     if (server.upgrade(request, { data })) {
	 *       return;
	 *     }
	 *     return new Response();
	 *   },
	 *   websocket: {
	 *     open(ws) {
	 *       console.log(ws.data.accessToken);
	 *     }
	 *   }
	 * });
	 */
	data: T;
}

/**
 * Compression options for WebSocket messages.
 */
type WebSocketCompressor =
	| "disable"
	| "shared"
	| "dedicated"
	| "3KB"
	| "4KB"
	| "8KB"
	| "16KB"
	| "32KB"
	| "64KB"
	| "128KB"
	| "256KB";

/**
 * Fast incremental writer for files and pipes.
 *
 * This uses the same interface as {@link ArrayBufferSink}, but writes to a file or pipe.
 */
export interface FileSink {
	/**
	 * Write a chunk of data to the file.
	 *
	 * If the file descriptor is not writable yet, the data is buffered.
	 */
	write(
		chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
	): number;
	/**
	 * Flush the internal buffer, committing the data to disk or the pipe.
	 */
	flush(): number | Promise<number>;
	/**
	 * Close the file descriptor. This also flushes the internal buffer.
	 */
	end(error?: Error): number | Promise<number>;

	start(options?: {
		/**
		 * Preallocate an internal buffer of this size
		 * This can significantly improve performance when the chunk size is small
		 */
		highWaterMark?: number;
	}): void;

	/**
	 * For FIFOs & pipes, this lets you decide whether Bun's process should
	 * remain alive until the pipe is closed.
	 *
	 * By default, it is automatically managed. While the stream is open, the
	 * process remains alive and once the other end hangs up or the stream
	 * closes, the process exits.
	 *
	 * If you previously called {@link unref}, you can call this again to re-enable automatic management.
	 *
	 * Internally, it will reference count the number of times this is called. By default, that number is 1
	 *
	 * If the file is not a FIFO or pipe, {@link ref} and {@link unref} do
	 * nothing. If the pipe is already closed, this does nothing.
	 */
	ref(): void;

	/**
	 * For FIFOs & pipes, this lets you decide whether Bun's process should
	 * remain alive until the pipe is closed.
	 *
	 * If you want to allow Bun's process to terminate while the stream is open,
	 * call this.
	 *
	 * If the file is not a FIFO or pipe, {@link ref} and {@link unref} do
	 * nothing. If the pipe is already closed, this does nothing.
	 */
	unref(): void;
}

/**
 * A state that represents if a WebSocket is connected.
 *
 * - `WebSocket.CONNECTING` is `0`, the connection is pending.
 * - `WebSocket.OPEN` is `1`, the connection is established and `send()` is possible.
 * - `WebSocket.CLOSING` is `2`, the connection is closing.
 * - `WebSocket.CLOSED` is `3`, the connection is closed or couldn't be opened.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
 */
type WebSocketReadyState = 0 | 1 | 2 | 3;
