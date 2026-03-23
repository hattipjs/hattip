import { H3, eventHandler, getQuery, readBody, serve } from "h3";

const app = new H3();

app.get(
	"/",
	eventHandler((event) => {
		event.res.headers.set("content-type", "text/plain");
		return "Hi";
	}),
);

app.get(
	"/id/:id",
	eventHandler((event) => {
		const query = getQuery(event);

		event.res.headers.set("content-type", "text/plain");
		event.res.headers.set("x-powered-by", "benchmark");

		return `${event.context.params?.id} ${query.name}`;
	}),
);

app.post(
	"/json",
	eventHandler((event) => readBody(event)),
);

serve(app, { port: 3000, silent: true });
