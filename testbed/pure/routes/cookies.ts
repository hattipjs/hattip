export default function cookies() {
  const headers = new Headers();
  headers.append("Set-Cookie", "name1=value1");
  headers.append("Set-Cookie", "name2=value2");
  return new Response(null, { headers });
}
