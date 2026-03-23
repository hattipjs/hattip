export default {
	fetch(req: Request) {
		const headers: [string, string][] = [];
		for (const [key, value] of req.headers) {
			headers.push([key, value]);
		}

		const data = {
			method: req.method,
			url: req.url,
			headers,
		};

		return new Response(JSON.stringify(data));
	},
};
