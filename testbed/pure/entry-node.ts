import nodeAdapter from "@hattip/adapter-node";
import handler from "./entry-hattip";

export default nodeAdapter(handler, "http://localhost:3000");
