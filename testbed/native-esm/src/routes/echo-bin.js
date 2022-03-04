export default async function echoBin(request) {
  const x = new Uint8Array(await request.arrayBuffer());
  return new Response(x.join(", "));
}
