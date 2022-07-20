import ReactDOM from "react-dom";
import React from "react";
import { PageWrapper } from "./PageWrapper";
import type { PageContext } from "./types";
import type { PageContextBuiltInClient } from "vite-plugin-ssr/types";

export async function render(
  pageContext: PageContextBuiltInClient & PageContext,
) {
  const { Page, pageProps } = pageContext;
  ReactDOM.hydrate(
    <PageWrapper pageContext={pageContext}>
      <Page {...pageProps} />
    </PageWrapper>,
    document.getElementById("page-view"),
  );
}
