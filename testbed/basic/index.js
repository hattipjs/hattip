// @ts-check
import { createRouter } from "@hattip/router";
import { cookie } from "@hattip/cookie";
import { graphqlServer, graphiql } from "@hattip/graphql";

const app = createRouter();

app.use(cookie());

app.get(
  "/",
  (ctx) =>
    new Response(
      `<h1>Hello from Hattip!</h1><p>URL: <span>${ctx.request.url}</span></p><p>Your IP address is: <span>${ctx.ip}</span></p>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      },
    ),
);

app.get(
  "/binary",
  () =>
    new Response(
      new TextEncoder().encode(
        "This is rendered as binary with non-ASCII chars 😊",
      ),
    ),
);

app.get("/bin-stream", (context) => {
  const delay = Number(context.url.searchParams.get("delay")) || 0;

  const output = new TextEncoder().encode(
    "This is rendered as binary stream with non-ASCII chars 😊",
  );

  let i = 0;

  /** @type {(value: any) => void} */
  let resolveStreamPromise;
  const streamPromise = new Promise(
    (resolve) => (resolveStreamPromise = resolve),
  );

  const stream = new ReadableStream({
    async pull(controller) {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (i < output.length) {
        controller.enqueue(new Uint8Array([output[i]]));
        i++;
      } else {
        controller.close();
        resolveStreamPromise;
      }
    },
  });

  context.waitUntil(streamPromise);

  return new Response(stream);
});

app.post("/echo-text", async (ctx) => new Response(await ctx.request.text()));

app.post(
  "/echo-bin",
  async (ctx) =>
    new Response(new Uint8Array(await ctx.request.arrayBuffer()).join(", ")),
);

app.get("/cookie", (ctx) => {
  return new Response(JSON.stringify(ctx.cookie), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
});

app.get("/set-cookie", (ctx) => {
  ctx.setCookie("name1", "value1");
  ctx.setCookie("name2", "value2");

  return new Response("Cookies set");
});

app.get("/status", () => new Response(null, { status: 201 }));

app.get("/headers", (ctx) => {
  const headers = Object.fromEntries(ctx.request.headers.entries());
  return new Response(JSON.stringify(headers, null, 2));
});

app.get("/query", (ctx) => {
  return new Response(JSON.stringify(ctx.url.searchParams.get("foo"), null, 2));
});

app.get("/pass", () => new Response("Passed on from an edge middleware"));

app.use(
  "/graphql",
  graphqlServer({
    context: (ctx) => ctx.request.headers.get("x-test"),

    schema: {
      typeDefs: `
        type Query {
          hello: String!
          context: String!
          sum(a: Int!, b: Int!): Int
        }
      `,
      resolvers: {
        Query: {
          hello: () => "Hello world!",
          context: (_parent, _args, context) => context,
          sum: (_parent, { a, b }) => a + b,
        },
      },
    },
  }),
);

if (process.env.NODE_ENV !== "production") {
  app.use("/graphiql", graphiql());
}

export default app.buildHandler();
