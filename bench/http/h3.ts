import { H3, serve } from "h3";

const app = new H3();

app.all(
	"/**",
	(event) => {
		const headers: [string, string][] = [];
		for (const [key, value] of event.req.headers) {
			headers.push([key, value]);
		}

		return {
			method: event.req.method,
			url: event.req.url,
			headers,
		};
	},
);

serve(app, { port: 3000, silent: true });
