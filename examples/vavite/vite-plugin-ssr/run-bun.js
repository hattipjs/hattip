// A hack to disable the `debug` package
process.type = "renderer";

const bunServer = await import("./dist/server/index.js");
export default bunServer.default;
