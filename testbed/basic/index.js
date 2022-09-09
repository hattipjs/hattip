// @ts-check
import { createRouter } from "@hattip/router";
import { html, json, text } from "@hattip/response";
import { cookie } from "@hattip/cookie";
import { yoga } from "@hattip/graphql";
import { session, EncryptedCookieStore } from "@hattip/session";

const app = createRouter();

app.use(cookie());

app.get("/", (ctx) =>
  html(
    `<h1>Hello from Hattip!</h1><p>URL: <span>${ctx.request.url}</span></p><p>Your IP address is: <span>${ctx.ip}</span></p>`,
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

  const { readable, writable } = new TransformStream();

  async function stream() {
    const writer = writable.getWriter();

    for (let i = 0; i < output.length; i++) {
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
      writer.write(new Uint8Array([output[i]]));
    }

    writer.close();
  }

  context.waitUntil(stream());

  return new Response(readable);
});

app.post("/echo-text", async (ctx) => text(await ctx.request.text()));

app.post(
  "/echo-bin",
  async (ctx) =>
    new Response(new Uint8Array(await ctx.request.arrayBuffer()).join(", ")),
);

app.get("/cookie", (ctx) => {
  return json(ctx.cookie);
});

app.get("/set-cookie", (ctx) => {
  ctx.setCookie("name1", "value1");
  ctx.setCookie("name2", "value2");

  return text("Cookies set");
});

app.get("/status", () => new Response(null, { status: 201 }));

app.get("/headers", (ctx) => {
  const headers = Object.fromEntries(ctx.request.headers.entries());
  return json(headers);
});

app.get("/query", (ctx) => {
  return json(ctx.url.searchParams.get("foo"));
});

app.get("/pass", () => text("Passed on from an edge middleware"));

app.use(
  "/graphql",
  yoga({
    endpoint: "/graphql",

    graphiql: {
      defaultQuery: `query { hello }`,
    },

    schema: {
      typeDefs: `type Query {
        hello: String!
        context: String
        sum(a: Int!, b: Int!): Int!
      }`,
      resolvers: {
        Query: {
          hello: () => "Hello world!",
          context: (_root, _args, ctx) => ctx.request.headers.get("x-test"),
          sum: (_root, args) => args.a + args.b,
        },
      },
    },
  }),
);

/**
 * @type {(ctx: import("@hattip/compose").RequestContext) => Promise<Response>}
 */
let sessionMiddleware;

// This is so complicated because top level await is not supported on Node 14
app.use("/session", async (ctx) => {
  sessionMiddleware =
    sessionMiddleware ??
    session({
      store: new EncryptedCookieStore(
        await EncryptedCookieStore.generateKeysFromBase64([
          "cnNwJHcQHlHHB7+/zRYOJP/m0JEXxQpoGskCs8Eg+XI=",
        ]),
      ),
      defaultSessionData: { count: 0 },
    });

  return sessionMiddleware(ctx);
});

app.use("/session", (ctx) => {
  // @ts-ignore
  ctx.session.data.count++;
  // @ts-ignore
  return text(`You have visited this page ${ctx.session.data.count} time(s).`);
});

export default app.buildHandler();
