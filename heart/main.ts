import { Koxy } from "./src/koxy.ts";
import { testkoxy } from "./src/runner.ts";

let api: any = "// <KOXY_API>";

if (typeof api === "string") {
  try {
    api = JSON.parse(api);
  } catch {
    api = {};
  }
}

const handler = async (request: Request): Promise<Response> => {
  console.time("request");
  let body: Record<string, any> = {};

  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch (e) {} // no need for anything here
  }

  console.log(body);

  // const koxy = new Koxy(api, request.headers, body);
  testkoxy.body = body;
  testkoxy.headers = request.headers;

  const res = await testkoxy.run(
    request.headers.get("path") ||
      request.url.replace("http://127.0.0.1:9009", ""),
    request.headers.get("method") || request.method,
  );
  console.log(res);

  console.timeEnd("request");
  return new Response(JSON.stringify(res.body || "{}"), { status: res.status });
};

Deno.serve({ port: 9009 }, handler);
