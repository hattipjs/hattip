// @ts-check
/// <reference types="vite/client" />

import { test, expect, describe, beforeAll, afterAll } from "vitest";
import fetch from "node-fetch";
import { ChildProcess, spawn } from "child_process";
import psTree from "ps-tree";

import ".";
import { kill } from "process";
import { promisify } from "util";

let host: string;
let cases: Array<{
  env: string;
  command?: string;
  skipCookieTest?: boolean;
}>;

if (process.env.CI === "true") {
  const versions = process.versions.node.split(".");
  const major = +versions[0];
  const minor = +versions[1];

  const fetchAvailable =
    major >= 18 || (major >= 17 && minor >= 5) || (major >= 16 && minor >= 15);
  if (!fetchAvailable) {
    console.warn("Node version < 17.5 or 16.15, will skip native fetch tests");
  }

  const miniflareAvailable = major >= 17 || (major >= 16 && minor >= 7);
  if (!miniflareAvailable) {
    console.warn("Node version < 16.7, will skip miniflare tests");
  }

  cases = [
    {
      env: "Node with node-fetch",
      command: "node entry-node.js",
    },
    fetchAvailable && {
      env: "Node with native fetch",
      command: "USE_NATIVE_FETCH=true node --experimental-fetch entry-node.js",
      skipCookieTest: true,
    },
    miniflareAvailable && {
      env: "MiniFlare",
      command: "miniflare --modules --port 3000",
    },
  ].filter(Boolean) as typeof cases;
  host = "http://localhost:3000";
} else {
  cases = [
    {
      env: "Existing server",
    },
  ];
  host = process.env.TEST_HOST || "http://localhost:3000";
}

describe.each(cases)("$env", ({ env, command, skipCookieTest }) => {
  if (skipCookieTest) {
    console.warn("Skipping multiple Set-Cookie test for", env);
  }

  if (command) {
    let cp: ChildProcess | undefined;

    beforeAll(async () => {
      cp = spawn(command, {
        shell: true,
        stdio: "inherit",
      });

      // Wait until server is ready
      await new Promise((resolve, reject) => {
        cp!.on("error", (error) => {
          cp = undefined;
          reject(error);
        });

        cp!.on("exit", (code) => {
          if (code !== 0) {
            cp = undefined;
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        const interval = setInterval(() => {
          fetch(host)
            .then(async (r) => {
              if (r.status === 200) {
                clearInterval(interval);
                resolve(null);
              }
            })
            .catch(() => {
              // Ignore error
            });
        }, 250);
      });
    });

    afterAll(async () => {
      if (!cp || cp.exitCode || !cp.pid) {
        return;
      }

      const tree = await promisify(psTree)(cp.pid);

      for (const p of tree) {
        kill(+p.PID, "SIGINT");
      }

      await new Promise((resolve) => {
        cp!.on("exit", resolve);
      });
    });
  }

  test("renders HTML", async () => {
    const response = await fetch(host);
    const text = await response.text();

    let ip;

    if (new URL(host).hostname === "localhost") {
      ip = "127.0.0.1";
    } else {
      ip = await fetch("http://api.ipify.org").then((r) => r.text());
    }

    const EXPECTED = `<h1>Hello from Hattip!</h1><p>URL: <span>${
      host + "/"
    }</span></p><p>Your IP address is: <span>${ip}</span></p>`;
    expect(text).toContain(EXPECTED);
    expect(response.headers.get("content-type")).toEqual(
      "text/html; charset=utf-8",
    );
  });

  test("serves static files", async () => {
    const response = await fetch(host + "/static.txt");
    const text = await response.text();

    expect(text).toContain("This is a static file!");
  });

  test("renders binary", async () => {
    const response = await fetch(host + "/binary");
    const text = await response.text();
    const EXPECTED = "This is rendered as binary with non-ASCII chars 😊";
    expect(text).toEqual(EXPECTED);
  });

  test("renders binary stream", async () => {
    const response = await fetch(host + "/bin-stream");

    const text = await response.text();
    expect(text).toEqual(
      "This is rendered as binary stream with non-ASCII chars 😊",
    );
  });

  test("doesn't fully buffer binary stream", async () => {
    const response = await fetch(host + "/bin-stream?delay=1");

    let chunks = 0;
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      chunks++;
    }

    expect(chunks).toBeGreaterThan(10);
  });

  test("echoes text", async () => {
    const response = await fetch(host + "/echo-text", {
      method: "POST",
      body: "Hello world! 😊",
    });
    const text = await response.text();
    expect(text).toEqual("Hello world! 😊");
  });

  test("echoes binary", async () => {
    const response = await fetch(host + "/echo-bin", {
      method: "POST",
      body: "ABC",
    });
    const text = await response.text();
    expect(text).toEqual("65, 66, 67");
  });

  if (!skipCookieTest) {
    test("sends multiple cookies", async () => {
      const response = await fetch(host + "/cookies");
      expect(response.headers.raw()["set-cookie"]).toMatchObject([
        "name1=value1",
        "name2=value2",
      ]);
    });
  }

  test("sets status", async () => {
    const response = await fetch(host + "/status");
    expect(response.status).toEqual(201);
  });

  test("sends 404", async () => {
    const response = await fetch(host + "/not-found");
    expect(response.status).toEqual(404);
  });
});
