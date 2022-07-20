/// <reference types="vite/client" />

import { renderPage } from "vite-plugin-ssr";
import { compose, RequestContext } from "@hattip/compose";

export default compose(handler);

async function handler(ctx: RequestContext) {
  const parsedUrl = new URL(ctx.request.url);
  const url = parsedUrl.pathname + parsedUrl.search;
  const pageContext = await renderPage({ url });
  const { httpResponse } = pageContext;

  if (httpResponse) {
    return new Response(httpResponse.body, {
      status: httpResponse.statusCode,
      headers: {
        "Content-Type": httpResponse.contentType,
      },
    });
  }
}
