# `@hattip/graphql`

[GraphQL](https://graphql.org/) middleware for HatTip based on [GraphQL Yoga](https://github.com/dotansimha/graphql-yoga).

## Usage

Install `@hattip/graphql` and `graphql`, then create and `use` the `yoga` middleware.

```ts
import { yoga, createSchema } from "@hattip/graphql";

// Create and initialize the other parts of your app
// ...

const schema = createSchema<{ requestContext: RequestContext }>({
  // Your GraphQL schema
  // ...
});

app.use("/graphql", yoga({ schema }));
```

## LICENSE

- This package comes bundled with `graphql-yoga` which is part of the [GraphQL Yoga](https://github.com/dotansimha/graphql-yoga) project by Graphcool, Prisma, and The Guild, under the [MIT License](./graphql-yoga.license.txt). They are not affiliated with HatTip.
- HatTip specific code is also licensed under the [MIT License](./LICENSE).
