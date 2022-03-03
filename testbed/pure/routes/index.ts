export default async function index() {
  return new Response("<h1>Hello from Hattip!</h1>", {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
