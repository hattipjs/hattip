// @ts-check
import "./install-polyfills.js";
import handler from "./index.js";
import { createTestClient } from "@hattip/adapter-test";

export const testFetch = createTestClient({ handler });
