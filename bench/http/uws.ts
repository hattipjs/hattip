import { App } from "uWebSockets.js";

const app = App();

app.any("/*", (res, req) => {
	const query = req.getQuery();
	const headers: [string, string][] = [];
	req.forEach((key, value) => {
		headers.push([key, value]);
	});
	const data = {
		method: req.getCaseSensitiveMethod(),
		rawUrl: req.getUrl() + (query === undefined ? "" : "?" + query),
		headers,
	};
	res.end(JSON.stringify(data));
});

app.listen(3000, () => {});
