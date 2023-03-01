import { test, expect, vi } from "vitest";
import { createTestClient } from "@hattip/adapter-test";
import { serverSentEvents, ServerSentEvent } from ".";

test("server-sent events", async () => {
	const onClose = vi.fn();

	const fetch = createTestClient({
		handler() {
			return serverSentEvents({
				onOpen(sink) {
					sink.sendMessage("hello");
					sink.send({ event: "custom", data: "world", id: "1" });
					sink.send({ event: "done" });
				},
				onClose,
			});
		},
	});

	const controller = new AbortController();
	const res = await fetch("http://localhost", { signal: controller.signal });
	expect(res.status).toBe(200);
	expect(res.headers.get("Content-Type")).toBe("text/event-stream");

	const events: ServerSentEvent[] = [];
	let resolveClose: () => void;
	const closePromise = new Promise<void>((resolve) => {
		resolveClose = resolve;
	});

	const doClose = sseClient(res, (event) => {
		if (event.event === "done") {
			doClose();
		} else if (event.event === "close") {
			resolveClose();
		}

		events.push(event);
	});

	await closePromise;

	expect(events).toEqual([
		{ event: "message", data: "hello" },
		{ event: "custom", data: "world", id: "1" },
		{ event: "done", data: "" },
		{ event: "close", data: "" },
	]);

	expect(onClose).toHaveBeenCalledOnce();
});

function sseClient(
	response: Response,
	onEvent: (event: ServerSentEvent) => void,
) {
	const decoder = new TextDecoder();
	let decoded = "";

	if (!response.body) {
		throw new Error("Response body is null");
	}

	let close: () => void;
	async function pump() {
		const reader = response.body!.getReader();
		close = () => reader.cancel();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			const chunk = value;
			decoded += decoder.decode(chunk);
			const events = decoded.split("\n\n");
			if (events.length === 1) {
				continue;
			}
			const incomplete = events.pop();
			for (const eventText of events) {
				onEvent(parseEvent(eventText));
			}

			decoded = incomplete ?? "";
		}
	}

	pump()
		.then(() => onEvent({ event: "close", data: "" }))
		.catch(() => onEvent({ event: "error", data: "" }));

	return close!;
}

function parseEvent(text: string): ServerSentEvent {
	const lines = text.split("\n");
	let data = "";
	let event = "message";
	let id: string | undefined;
	for (const line of lines) {
		if (line.startsWith(":")) {
			// ignore
		} else if (line.startsWith("data:")) {
			data += trim(line.slice(5));
		} else if (line.startsWith("event:")) {
			event = trim(line.slice(6));
		} else if (line.startsWith("id:")) {
			id = trim(line.slice(3));
		} else if (line.startsWith("retry:")) {
			// ignore
		} else {
			throw new Error(`Invalid event line: ${line}`);
		}
	}

	const result: ServerSentEvent = { data, event };
	if (id !== undefined) {
		result.id = id;
	}

	return result;
}

function trim(s: string) {
	return s.replace(/^ /, "");
}
