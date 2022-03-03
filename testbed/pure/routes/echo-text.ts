export default async function echoText(request: Request) {
  return new Response(await request.text());
}
