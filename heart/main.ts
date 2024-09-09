import { Koxy } from "./src/koxy.ts";

const handler = async (request: Request): Promise<Response> => {
  let body: Record<string, any> = {};

  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch (e) {} // no need for anything here
  }

  console.log(body);

  const koxy = new Koxy({} as Api, request.headers, body);

  return new Response("Hi", { status: 200 });
};

Deno.serve({ port: 9009 }, handler);
