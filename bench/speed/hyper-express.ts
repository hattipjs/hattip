import HyperExpress from "hyper-express";

const server = new HyperExpress.Server();

server.get("/", (_req, res) => {
	res.type("text/plain").send("Hi");
});

server.get("/id/:id", (req, res) => {
	const id = req.params.id;
	const name = req.query.name;
	res.header("x-powered-by", "benchmark");
	res.type("text/plain").send(`${id} ${name}`);
});

server.post("/json", async (req, res) => {
	const body = await req.json();
	res.json(body);
});

await server.listen(3000);
