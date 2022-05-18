import { createRouter } from "@hattip/router";
import clientManifest from "./client-manifest";
import viteDevServer from "vavite/vite-dev-server";

const router = createRouter();

router.get("/", async () => {
  let scriptPath = "client/vanilla.ts";
  const manifestEntry = clientManifest[scriptPath];
  if (manifestEntry) {
    scriptPath = manifestEntry.file;
  }

  const script = `<script src="/${scriptPath}" type="module"></script>`;

  let html = `<!DOCTYPE html><html><head><title>Vanilla JS SSR</title></head><body><h1>Vanilla JS SSR</h1><button>Clicked 0 time(s)</button>${script}</body></html>`;

  if (viteDevServer) {
    html = await viteDevServer.transformIndexHtml("/", html);
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

import { createElement } from "react";
import { renderToString as renderReactToString } from "react-dom/server";
import { ReactApp } from "./client/react-page";

router.get("/react", async () => {
  let scriptPath = "client/react.tsx";
  const manifestEntry = clientManifest[scriptPath];
  if (manifestEntry) {
    scriptPath = manifestEntry.file;
  }

  const script = `<script src="/${scriptPath}" type="module"></script>`;

  const rendered = renderReactToString(createElement(ReactApp));
  let html = `<!DOCTYPE html><html><head><title>React SSR</title></head><body><div id="root">${rendered}</div>${script}</body></html>`;

  if (viteDevServer) {
    html = await viteDevServer.transformIndexHtml("/", html);
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

import { createSSRApp } from "vue";
import { renderToString as renderVueToString } from "vue/server-renderer";
import VueApp from "./client/vue-page.vue";

router.get("/vue", async () => {
  let scriptPath = "client/vue.ts";
  const manifestEntry = clientManifest[scriptPath];
  if (manifestEntry) {
    scriptPath = manifestEntry.file;
  }

  const script = `<script src="/${scriptPath}" type="module"></script>`;

  const rendered = await renderVueToString(createSSRApp(VueApp));
  let html = `<!DOCTYPE html><html><head><title>Vue SSR</title></head><body><div id="root">${rendered}</div>${script}</body></html>`;

  if (viteDevServer) {
    html = await viteDevServer.transformIndexHtml("/", html);
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

export default router.handle;
