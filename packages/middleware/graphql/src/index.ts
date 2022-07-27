import { RequestContext } from "@hattip/compose";
import { html, json } from "@hattip/response";
import { graphql, GraphQLSchema } from "graphql";
import {
  makeExecutableSchema,
  IExecutableSchemaDefinition,
} from "@graphql-tools/schema";

interface GraphQLOptions<TContext = RequestContext> {
  context?: TContext | ((context: RequestContext) => TContext);
  schema: GraphQLSchema | IExecutableSchemaDefinition<TContext>;
}

export function graphqlServer<TContext>(options: GraphQLOptions<TContext>) {
  const schema =
    options.schema instanceof GraphQLSchema
      ? options.schema
      : makeExecutableSchema(options.schema);

  return async function graphqlServer(ctx: RequestContext) {
    if (ctx.method !== "POST") {
      return json({ errors: ["Method not allowed"] }, { status: 405 });
    }

    const value = await ctx.request.json().catch((error) => {
      if (error.name === "SyntaxError") {
        return null;
      }
    });

    if (typeof value !== "object" || value === null) {
      return json({ errors: ["Invalid JSON"] }, { status: 400 });
    }

    const context =
      typeof options.context === "function"
        ? (options.context as any)(ctx)
        : options.context || ctx;

    const result = await graphql({
      schema,
      contextValue: context,
      source: value?.query,
      variableValues: value?.variables,
      operationName: value?.operationName,
    });

    return json(
      {
        data: result.data,
        errors: result.errors?.map((error) => ({
          message: error.message,
          extensions: error.extensions,
        })),
      },
      { status: result.errors ? 400 : 200 },
    );
  };
}

export interface GraphiqlOptions {
  endpointURL?: string;
}

export function graphiql(options: GraphiqlOptions = {}) {
  const { endpointURL = "/graphql" } = options;

  return function graphiql() {
    return html(`<!DOCTYPE html>
      <html>
        <head>
          <title>GraphiQL</title>
          <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
        </head>
        <body style="margin: 0;">
          <div id="graphiql" style="height: 100vh;"></div>

          <script
            crossorigin
            src="https://unpkg.com/react/umd/react.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/graphiql/graphiql.min.js"
          ></script>

          <script>
            const fetcher = GraphiQL.createFetcher({ url: ${JSON.stringify(
              endpointURL,
            )}});

            ReactDOM.render(
              React.createElement(GraphiQL, { fetcher: fetcher }),
              document.getElementById('graphiql'),
            );
          </script>
        </body>
      </html>
    `);
  };
}
