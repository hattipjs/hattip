export default function binStream(request, context) {
  const delay = Number(new URL(request.url).searchParams.get("delay")) || 0;

  const output = new TextEncoder().encode(
    "This is rendered as binary stream with non-ASCII chars 😊",
  );

  const { readable, writable } = new TransformStream();

  async function pump(body) {
    const writer = writable.getWriter();
    for await (const chunk of body) {
      writer.write(chunk);
    }

    writer.close();
  }

  async function* stream() {
    for (const byte of output) {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      yield new Uint8Array([byte]);
    }
  }

  const promise = pump(stream());

  context.waitUntil(promise);

  return new Response(readable);
}
