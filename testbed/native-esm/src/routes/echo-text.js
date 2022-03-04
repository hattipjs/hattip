export default async function echoText(request) {
  return new Response(await request.text());
}
