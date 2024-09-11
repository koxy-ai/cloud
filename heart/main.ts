import { Koxy } from "./src/koxy.ts";
import * as os from "https://deno.land/std@0.123.0/node/os.ts";

let api: any = "// <KOXY_API>";

if (typeof api === "string") {
  try {
    api = JSON.parse(api);
  } catch {
    api = {};
  }
}

let initStart: number = Date.now();
let requests: number = 0;

// Function to calculate CPU usage in Deno
async function printCpuUsage() {
  console.log(os.cpus())
  let numCpus = os.cpus().length;
  let numCpusUtilized = Deno.loadavg()[2]; // or use [1] for 5 minute average, or [2] for 15 minute average
  let cpuUtilizationRatio = numCpusUtilized / numCpus; // is a value between 0 and 1
  console.log(`CPU Utilization: ${cpuUtilizationRatio * 100}%`);
  console.log(`Number of CPU utilized: ${numCpusUtilized}`);

  return numCpusUtilized;
}

// Print CPU usage every 10 seconds
setInterval(printCpuUsage, 10000);

const handler = async (request: Request): Promise<Response> => {
  try {
    let body: Record<string, any> = {};

    if (request.method !== "GET") {
      try {
        body = await request.json();
      } catch (e) {} // no need for anything here
    }

    if (request.headers.get("KOXY-GET-REQUESTS")) {
      return new Response(JSON.stringify({ requests }), {
        status: 200,
        headers: { "koxy-response": "true" },
      });
    }

    if (request.headers.get("KOXY-STATS")) {
      const load = os.loadavg()
      return new Response(
        JSON.stringify({ requests, load: load[2] || load[1] || load[0], cpu: os.cpus().length }),
        {
          status: 200,
          headers: { "koxy-response": "true" },
        },
      );
    }

    requests++;

    const koxy = new Koxy(api, request.headers, body);

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
  }
};

Deno.serve({ port: 9009 }, handler);
