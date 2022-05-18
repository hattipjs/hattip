import { createRouter } from "@hattip/router";

const router = createRouter();

router.get(
  "/",
  (req, ctx) =>
    new Response(
      `<h1>Hello from Hattip!</h1><p>URL: <span>${req.url}</span></p><p>Your IP address is: <span>${ctx.ip}</span></p>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      },
    ),
);

router.get(
  "/binary",
  () =>
    new Response(
      new TextEncoder().encode(
        "This is rendered as binary with non-ASCII chars 😊",
      ),
    ),
);

router.get("/bin-stream", (_, context) => {
  const delay = Number(context.url.searchParams.get("delay")) || 0;

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
});

router.post(
  "/echo-text",
  async (request) => new Response(await request.text()),
);

router.post(
  "/echo-bin",
  async (request) =>
    new Response(new Uint8Array(await request.arrayBuffer()).join(", ")),
);

router.get("/cookies", () => {
  const headers = new Headers();
  headers.append("Set-Cookie", "name1=value1");
  headers.append("Set-Cookie", "name2=value2");
  return new Response(null, { headers });
});

router.get("/status", () => new Response(null, { status: 201 }));

export default router.handler;
