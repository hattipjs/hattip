run().catch((error) => {
	console.error(error);
	process.exit(1);
});

async function run() {
	for (let i = 0; i < 10_000; i++) {
		await fetch("http://localhost:3000/");
	}
}
