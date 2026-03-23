import { createServer } from "node:http";

createServer((req, res) => {
	const headers: [string, string][] = [];
	for (let i = 0; i < req.rawHeaders.length; i += 2) {
		const key = req.rawHeaders[i]!;
		const value = req.rawHeaders[i + 1]!;
		headers.push([key, value]);
	}

	const data = {
		method: req.method,
		rawUrl: req.url,
		headers,
	};

	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(data));
}).listen(3000);
