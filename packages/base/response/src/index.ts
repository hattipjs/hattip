/**
 * Create a text response. Content-Type is set to "text/plain; charset=utf-8"
 * unless explicitly set.
 */
export function text(text: string, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/plain; charset=utf-8");
	}

	return new Response(text, {
		...init,
		headers,
	});
}

/**
 * Create a JSON response. Content-Type is set to
 * "application/json; charset=utf-8" unless explicitly set.
 */
export function json(value: unknown, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json; charset=utf-8");
	}

	return new Response(JSON.stringify(value), {
		...init,
		headers,
	});
}

/**
 * Create an HTML response. Content-Type is set to "text/html; charset=utf-8"
 * unless explicitly set.
 */
export function html(html: string, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/html; charset=utf-8");
	}

	return new Response(html, {
		...init,
		headers,
	});
}

/** Initalization options for a server-sent events response */
export interface ServerSentEventsInit {
	/**
	 * The response init options like status, headers, etc.
	 *
	 * By default the following headers are set to the following values unless
	 * they are explicitly set to something else:
	 *
	 * ```txt
	 * Content-Type: text/event-stream
	 * Cache-Control: no-cache
	 * Connection: keep-alive
	 * ```
	 */
	responseInit?: ResponseInit;
	/**
	 * Called when the connection is established.
	 *
	 * The `sink` can be used to send events to the client.
	 */
	onOpen?: (sink: ServerSentEventSink) => void;
	/** Called when the connection is closed. No more events can be sent after this is called. */
	onClose?: () => void;
}

/** The event sink that can be used to send events to the client */
export interface ServerSentEventSink {
	/** Send a `message` event to the client */
	sendMessage(message: string): void;
	/** Send a custom event to the client */
	send(event: ServerSentEvent): void;
	/**
	 * Send a raw frame to the client
	 *
	 * Note that the frame contents are not validated.
	 */
	sendRaw(data: string): void;
	/**
	 * Send a ping to the client.
	 *
	 * Legacy proxy servers are known to, in certain cases, drop HTTP
	 * connections after a short timeout. To protect against such proxy
	 * servers, you can send a ping every 15 seconds or so.
	 */
	ping(): void;
	/**
	 * Close the connection
	 *
	 * Note that the client will normally try to reconnect when the connection
	 * is closed. So this is only useful under certain circumstances.
	 */
	close(): void;
}

/** A server-sent event */
export interface ServerSentEvent {
	/**
	 * The event ID
	 *
	 * Note that `serverSentEvents` does not keep track of the last event ID by
	 * itself. It is up to the user to check and honor the `Last-Event-ID`
	 * header.
	 */
	id?: string;
	/** The event name */
	event?: string;
	/** The event data */
	data?: string;
	/**
	 * The retry interval in ms
	 *
	 * This is a hint to the client to wait this long before trying to
	 * reconnect after a connection is lost.
	 */
	retry?: number;
}

/** Create a server-sent events response */
export function serverSentEvents(options: ServerSentEventsInit): Response {
	const { onOpen, onClose, responseInit = {} } = options;

	const defaultHeaders = {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	};

	const headers = new Headers(responseInit.headers);

	for (const [key, value] of Object.entries(defaultHeaders)) {
		if (!headers.has(key)) {
			headers.set(key, value);
		}
	}

	let sink: ServerSentEventSink;
	let onCloseCalled = false;
	function callOnClose() {
		if (!onCloseCalled) {
			onCloseCalled = true;
			onClose?.();
		}
	}

	return new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				const encoder = new TextEncoder();

				sink = {
					sendRaw(data: string) {
						controller.enqueue(encoder.encode(data));
					},

					send(event) {
						if (event.id?.includes("\n")) {
							throw new Error("Event ID cannot contain newlines");
						} else if (event.event?.includes("\n")) {
							throw new Error("Event name cannot contain newlines");
						}

						const retry =
							event.retry === undefined ? "" : `retry: ${event.retry}\n`;

						const ev = event.event ? `event: ${event.event}\n` : "";

						let data = "";
						if (event.data) {
							const lines = event.data.split("\n");
							data = lines.map((line) => `data: ${line}`).join("\n") + "\n";
						}

						const id = event.id ? `id: ${event.id}\n` : "";

						this.sendRaw(retry + ev + data + id + "\n");
					},

					sendMessage(message) {
						this.send({ data: message });
					},

					ping() {
						const data = encoder.encode(": ping");
						controller.enqueue(data);
					},

					close() {
						controller.close();
						callOnClose();
					},
				};

				onOpen?.(sink);
			},

			cancel() {
				callOnClose();
			},
		}),
		{ ...responseInit, headers },
	);
}
