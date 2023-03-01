import { RequestContext } from "@hattip/compose";
import { serverSentEvents, ServerSentEventSink } from "./sse";
import { json } from "@hattip/response";

export interface PubSubController {
	emit(
		channel: string | string[] | RegExp | ((channel: string) => boolean),
		data: any,
	): void;
	close(): void;
}

export function createPubSubEndpoint(): PubSubEndpoint {
	const clients = new Map<
		string,
		{ channels: Set<string>; sink: ServerSentEventSink<string> }
	>();

	// Keep alive ping
	const interval = setInterval(() => {
		for (const [, client] of clients) {
			client.sink.ping();
		}
	}, 30 * 1000);

	return {
		async handler(ctx) {
			if (ctx.method === "GET") {
				const id = crypto.randomUUID();

				const { response, sink } = serverSentEvents({
					payload: id,
					onDisconnect() {
						clients.delete(id);
					},
				});

				sink.send({ event: "connected", data: id });

				clients.set(id, {
					sink,
					channels: new Set(ctx.url.searchParams.getAll("channel")),
				});

				return response;
			} else if (ctx.method === "POST") {
				const clientId = ctx.request.headers.get("X-SSE-Client-ID");
				if (!clientId || !clients.has(clientId)) {
					return json({ error: "Invalid client ID" }, { status: 400 });
				}
				const client = clients.get(clientId)!;

				try {
					const body = await ctx.request.json();
					if (
						typeof body !== "object" ||
						body === null ||
						Array.isArray(body)
					) {
						throw new Error();
					}
					const { subscribe = [], unsubscribe = [] } = body;

					assertStringArray(subscribe);
					assertStringArray(unsubscribe);

					subscribe.forEach((channel) => client.channels.add(channel));
					unsubscribe.forEach((channel) => client.channels.delete(channel));

					return json({ channels: [...client.channels] });
				} catch {
					return json({ error: "Invalid request body" }, { status: 400 });
				}
			}
		},

		controller: {
			emit(channel, data) {
				const filter = createChannelFilter(channel);
				for (const [, client] of clients) {
					if ([...client.channels].some(filter)) {
						client.sink.send({ data });
					}
				}
			},
			close() {
				clearInterval(interval);
				for (const [, client] of clients) {
					client.sink.close();
				}
			},
		},
	};
}

export interface PubSubEndpoint {
	handler(ctx: RequestContext): Promise<Response | void>;
	controller: PubSubController;
}

function assertStringArray(value: unknown): asserts value is string[] {
	if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
		throw new Error();
	}
}

function createChannelFilter(
	channel: string | string[] | RegExp | ((channel: string) => boolean),
): (channel: string) => boolean {
	if (typeof channel === "string") {
		return (c: string) => c === channel;
	} else if (Array.isArray(channel)) {
		return (c: string) => channel.includes(c);
	} else if (channel instanceof RegExp) {
		return (c: string) => channel.test(c);
	} else {
		return channel;
	}
}
