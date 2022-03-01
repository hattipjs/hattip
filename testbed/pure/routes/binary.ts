export default function binary() {
	return new Response(
		new TextEncoder().encode(
			"This is rendered as binary with non-ASCII chars 😊",
		),
	);
}
