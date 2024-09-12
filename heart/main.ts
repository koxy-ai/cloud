import { Koxy } from "./src/koxy.ts";
import os from "node:os";

const cpus = os.cpus().length;
let api: any = "// <KOXY_API>";

if (typeof api === "string") {
  try {
    api = JSON.parse(api);
  } catch {
    api = {};
  }
}

const processing: 0[] = [];
let requests: number = 0;
let usage: number = 0;
let idle: number = 0;
let errors: string[] = [];
let latestRequestsLookup = 0;
let latestUsage = 0;

function wasIdle() {
  if (requests > latestRequestsLookup) {
    latestUsage = 0;
    latestRequestsLookup = Number(requests);
    return;
  }

  idle += 1000 - latestUsage;
  latestRequestsLookup = Number(requests);
  latestUsage = 0;
}

setInterval(wasIdle, 1000);

const handler = async (request: Request): Promise<Response> => {
  let start = Date.now();

  try {
    let body: Record<string, any> = {};

    if (request.method !== "GET") {
      try {
        body = await request.json();
      } catch (e) {} // no need for anything here
    }

    if (request.headers.get("KOXY-GET-REQUESTS")) {
      start = 0;
      return new Response(JSON.stringify({ requests }), {
        status: 200,
        headers: { "koxy-response": "true" },
      });
    }

    if (request.headers.get("KOXY-STATS")) {
      start = 0;
      return new Response(
        JSON.stringify({
          requests,
          usage,
          processing,
          errors,
          cpus,
          idle,
        }),
        {
          status: 200,
          headers: { "koxy-response": "true" },
        },
      );
    }

    requests++;
    processing.push(0);

    const koxy = new Koxy(api, request.headers, body, false);

    const res = await koxy.run(
      request.headers.get("path") ||
        request.url.replace("http://127.0.0.1:9009", ""),
      request.headers.get("method") || request.method,
    );

    return new Response(JSON.stringify(res.body || "{}"), {
      status: res.status,
      headers: { ...(res.headers || {}), "koxy-response": "true" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "koxy-response": "true" },
    });
  } finally {
    if (start !== 0) {
      const took = Date.now() - start;
      usage += took;
      if (latestUsage === 0 || took > latestUsage) latestUsage = took;
      processing.pop();
    }
  }
};

Deno.serve({ port: 9009 }, handler);
