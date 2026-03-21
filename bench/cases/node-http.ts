import { createServer } from "node:http";
import type { Readable } from "node:stream";

createServer((req, res) => {
	const [pathname, search] = split(req.url ?? "/");
	const method = req.method;

	if (pathname === "/" && method === "GET") {
		res.setHeader("content-type", "text/plain;charset=UTF-8");
		return res.end("Hi");
	}

	if (pathname === "/json" && method === "POST") {
		return json(req)
			.then((text) => {
				res.setHeader("content-type", "application/json");
				res.end(JSON.stringify(text));
			})
			.catch((error) => {
				console.error(error);
				res.statusCode = 500;
				res.end("Internal Server Error");
			});
	}

	if (pathname.startsWith("/id/") && method === "GET") {
		const id = pathname.slice(4);
		const name = new URLSearchParams(search).get("name");

		res.setHeader("content-type", "text/plain;charset=UTF-8");
		res.setHeader("x-powered-by", "benchmark");
		return res.end(`${id} ${name}`);
	}

	res.statusCode = 404;
	res.end("Not Found");
}).listen(3000);

function split(href: string): [path: string, search?: string] {
	const questionMarkIndex = href.indexOf("?");
	if (questionMarkIndex < 0) {
		return [href];
	}

	return [href.slice(0, questionMarkIndex), href.slice(questionMarkIndex)];
}

function json(req: Readable): Promise<any> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];

		function onData(chunk: Buffer) {
			chunks.push(chunk);
		}

		function onError(error: any) {
			req.off("data", onData);
			reject(error);
		}

		req.on("data", onData);
		req.once("error", onError);

		req.once("end", () => {
			req.off("data", onData);
			req.off("error", onError);

			const buffer = Buffer.concat(chunks);
			resolve(JSON.parse(buffer.toString()));
		});
	});
}
