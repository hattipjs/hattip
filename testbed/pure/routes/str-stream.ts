import { Context } from "@hattip/core";

export default function binary(request: Request, context: Context) {
	const delay = Number(new URL(request.url).searchParams.get("delay")) || 0;

	const output = "This is rendered as a string stream with non-ASCII chars 😊";

	const { readable, writable } = new TransformStream();

	async function pump(body: AsyncIterable<string>) {
		const writer = writable.getWriter();
		for await (const chunk of body!) {
			writer.write(chunk);
		}

		writer.close();
	}

	async function* stream() {
		for (const char of output) {
			if (delay) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			yield char;
		}
	}

	const promise = pump(stream());

	context.waitUntil(promise);

	return new Response(readable);
}
