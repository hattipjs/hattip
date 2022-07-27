# `@hattip/graphql`

[GraphQL](https://graphql.org/) middleware for HatTip.

## Usage

Install `@hattip/graphql` and `graphql`, then create and `use` the `graphqlServer` middleware.

```js
import { graphqlServer, graphiql } from "@hattip/graphql";

// Create and initialize the other parts of your app
// ...

app.use(
  "/graphql",
  graphqlServer({
    // You can customize the resolver context as needed
    context: (ctx) => ctx.request.headers.get("x-user-id"),
    schema: {
      typeDefs: `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: { hello: () => "Hello World!" },
      },
    },
  }),
);

// A CDN version of GraphiQL is also included for debugging purposes
if (process.env.NODE_ENV === "development") {
  app.use("/graphiql", graphiql());
}
```
