export default handler;

async function handler(ctx) {
	const urlParsed = new URL(ctx.request.url);
	const { pathname } = urlParsed;
	return new Response(
		`<html><body>Hello ${pathname} from HatTip</body></html>`,
		{
			status: 200,
			headers: {
				"Content-Type": "text/html",
			},
		},
	);
}
