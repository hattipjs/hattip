// @ts-check

import { test, expect, describe, beforeAll, afterAll } from "vitest";
import fetch from "node-fetch";
import { ChildProcess, spawn } from "child_process";
import psTree from "ps-tree";
import ".";
import { kill } from "process";
import { promisify } from "util";

let host: string;
let cases: Array<{
  name: string;
  command?: string;
  envOverride?: Record<string, string>;
  skipCookieTest?: boolean;
  skipStreamingTest?: boolean;
}>;

const nodeVersions = process.versions.node.split(".");
const nodeVersionMajor = +nodeVersions[0];
const nodeVersionMinor = +nodeVersions[1];

if (process.env.CI === "true") {
  const fetchAvailable =
    nodeVersionMajor >= 18 ||
    (nodeVersionMajor >= 17 && nodeVersionMinor >= 5) ||
    (nodeVersionMajor >= 16 && nodeVersionMinor >= 15);
  if (!fetchAvailable) {
    console.warn("Node version < 17.5 or 16.15, will skip native fetch tests");
  }

  const miniflareAvailable =
    nodeVersionMajor >= 17 || (nodeVersionMajor >= 16 && nodeVersionMinor >= 7);
  if (!miniflareAvailable) {
    console.warn("Node version < 16.7, will skip miniflare tests");
  }

  cases = [
    {
      name: "Node with node-fetch",
      command: "node entry-node.js",
    },
    fetchAvailable && {
      name: "Node with native fetch",
      command: "node --experimental-fetch entry-node-native-fetch.js",
      skipCookieTest: true,
    },
    miniflareAvailable && {
      name: "MiniFlare",
      command:
        "miniflare --modules --port 3000 dist/cloudflare-workers-bundle/index.js",
    },
    {
      name: "Netlify Functions with netlify dev",
      command: "pnpm build:netlify-functions && netlify dev -op 3000",
      skipStreamingTest: true,
      envOverride: {
        BROWSER: "none",
      },
    },
    {
      name: "Netlify Edge Functions with netlify dev",
      command: "pnpm build:netlify-edge && netlify dev -op 3000",
      skipStreamingTest: true,
      envOverride: {
        BROWSER: "none",
      },
    },
  ].filter(Boolean) as typeof cases;
  host = "http://localhost:3000";
} else {
  cases = [
    {
      name: "Existing server",
    },
  ];
  host = process.env.TEST_HOST || "http://localhost:3000";
}

describe.each(cases)(
  "$name",
  ({ name, command, skipCookieTest, skipStreamingTest, envOverride }) => {
    if (skipCookieTest) {
      console.warn("Skipping multiple Set-Cookie test for", name);
    }

    if (skipStreamingTest) {
      console.warn("Skipping streaming test for", name);
    }

    if (command) {
      let cp: ChildProcess | undefined;

      beforeAll(async () => {
        cp = spawn(command, {
          shell: true,
          stdio: "inherit",
          env: {
            ...process.env,
            ...envOverride,
          },
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
        const pids = [cp.pid, ...tree.map((p) => +p.PID)];

        for (const pid of pids) {
          kill(+pid, "SIGINT");
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
        ip = ["::1", "127.0.0.1"];
      } else {
        ip = [await fetch("http://api.ipify.org").then((r) => r.text())];
      }

      const EXPECTED = ip.map(
        (ip) =>
          `<h1>Hello from Hattip!</h1><p>URL: <span>${
            host + "/"
          }</span></p><p>Your IP address is: <span>${ip}</span></p>`,
      );

      expect(EXPECTED.some((e) => text.includes(e))).toBe(true);
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

    if (!skipStreamingTest) {
      test("doesn't fully buffer binary stream", async () => {
        const response = await fetch(host + "/bin-stream?delay=1");

        let chunks = 0;
        for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
          chunks++;
        }

        expect(chunks).toBeGreaterThan(10);
      });
    }

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
  },
);
