import { Koxy } from "./src/koxy.ts";
import os from "node:os";

let cpus = os.cpus().length;
let api: any = "// <KOXY_API>";

if (typeof api === "string") {
  try {
    api = JSON.parse(api);
  } catch {
    api = {};
  }
}

let processing: number[] = [];
let requests: number[] = [];
let usage: number[] = [];
let idle: number = 0;
let errors: string[] = [];
let latestRequestsLookup = 0;
let latestUsage = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wasIdle() {
  if (requests.length > latestRequestsLookup) {
    latestUsage = 0;
    latestRequestsLookup = requests.length;
    return;
  }

  idle += 1000 - latestUsage;
  latestRequestsLookup = requests.length;
  latestUsage = 0;
}

setInterval(wasIdle, 1000);

const excludeRoot = (url: string) => {
  url = url.replace("https://", "").replace("http://", "");
  const slashIndex = url.indexOf("/");
  if (slashIndex === -1) {
    return url;
  }
  return url.slice(slashIndex);
}

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
          requests: requests.length,
          usage: usage.reduce((a, b) => a + b, 0),
          processing: processing.length,
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

    requests.push(1);
    processing.push(1);

    const path = request.headers.get("path") || excludeRoot(request.url);
    const method = request.headers.get("method") || request.method;

    const koxy = new Koxy(api, path, request, body);
    const res = await koxy.run(path, method);

    return new Response(JSON.stringify(res.body || "{}"), {
      status: res.status,
      headers: {
        ...(res.headers || {}),
        "koxy-response": "true",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "koxy-response": "true", "Access-Control-Allow-Origin": "*" },
    });
  } finally {
    if (start !== 0) {
      const took = Date.now() - start;

      usage.push(took);
      processing.pop();

      if (latestUsage === 0 || took > latestUsage) {
        latestUsage = took;
      }

      const nowCpu = os.cpus().length;
      if (nowCpu !== cpus) {
        cpus = nowCpu;
      }
    }
  }
};

Deno.serve({ port: 9009 }, handler);
