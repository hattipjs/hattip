export default async function index(req, ctx) {
  return new Response(
    `<h1>Hello from Hattip!</h1><p>URL: <span>${req.url}</span></p><p>Your IP address is: <span>${ctx.ip}</span></p>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}
