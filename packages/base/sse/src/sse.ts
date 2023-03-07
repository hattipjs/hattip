export interface ServerSentEventResult<T> {
	/** The response that was created */
	response: Response;
	/** The event sink that can be used to send events to the client */
	sink: ServerSentEventSink<T>;
}

export interface ServerSentEventSink<T> {
	/** The payload that was passed to the function */
	payload: T;
	/** Send an event to the client */
	send(event: ServerSentEvent): void;
	/** Send a ping to the client (keep-alive) */
	ping(): void;
	/** Close the connection */
	close(): void;
}

export interface ServerSentEvent {
	/** The event ID */
	id?: string;
	/** The event name */
	event?: string;
	/** The event data */
	data: unknown;
	/** The retry interval in ms */
	retry?: number;
}

export interface ServerSentEventsInit<T> {
	/** The payload that will be available on the event sink object */
	payload?: T;
	/** The response init options like status, headers, etc. */
	responseInit?: ResponseInit;
	/** Called when the connection is closed. No more events can be sent */
	onDisconnect?: (sink: ServerSentEventSink<T>) => void;
	/** Payload serializer */
	serialize?: (payload: T) => string;
}

/** Create a server-sent event response and a corresponding event sink */
export function serverSentEvents<T = undefined>(
	options?: ServerSentEventsInit<T>,
): ServerSentEventResult<T> {
	const {
		payload,
		responseInit,
		onDisconnect,
		serialize = JSON.stringify,
	} = options || {};

	const headers = new Headers(responseInit?.headers);
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/event-stream");
	}

	let sink: ServerSentEventSink<T>;

	const response = new Response(
		new ReadableStream<ArrayBuffer>({
			start(controller) {
				const encoder = new TextEncoder();

				sink = {
					payload: payload!,
					send(event) {
						if (event.id?.includes("\n")) {
							throw new Error("Event ID cannot contain newlines");
						} else if (event.event?.includes("\n")) {
							throw new Error("Event name cannot contain newlines");
						}

						const serialized = serialize(event.data);
						if (serialized.includes("\n")) {
							throw new Error("Serialized event data cannot contain newlines");
						}

						const data = encoder.encode(
							event.id
								? `id: ${event.id}`
								: "" + event.event
								? `event: ${event.event}`
								: "" + `data: ${serialized}` + event.retry
								? `retry: ${event.retry}`
								: "",
						);
						controller.enqueue(data);
					},
					ping() {
						const data = encoder.encode(": ping");
						controller.enqueue(data);
					},
					close() {
						controller.close();
					},
				};
			},
			cancel() {
				onDisconnect?.(sink!);
			},
		}),
		{
			...responseInit,
			headers,
		},
	);

	return { response, sink: sink! };
}
