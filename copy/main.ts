import { Koxy } from "./src/koxy.ts";
import pidusage from "npm:pidusage";
import os from "node:os";

const cpus = os.cpus().length;

let api: any = {"id": "324", "env": {"TOKEN1": "VALUE1", "TOKEN2": "VALUE2"}, "flows": {"/api/hi": [{"id": "1", "name": "1", "method": "GET", "history": [], "dependecies": [], "start": {"type": "start", "id": "start", "name": "start", "label": "start", "icon": "start", "description": "start", "code": "start", "inputs": [], "next": "node1"}, "end": {"type": "return", "id": "end", "name": "end", "label": "end", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "response", "type": "string", "label": "", "required": true, "visible": true}, "code:K::Koxy.results.get(\"node1\")"]]}, "nodes": [{"type": "normal", "id": "node1id", "name": "node1", "label": "Node", "description": "", "icon": "", "next": "node2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) { console.log(\"node1\", inputs); return \"Hi\"; }"}, {"type": "normal", "id": "node2id", "name": "node2", "label": "Node", "description": "", "icon": "", "next": "end", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) {console.log(\"node2\", inputs)}"}, {"type": "return", "id": "end", "name": "end", "label": "end", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "response", "type": "string", "label": "", "required": true, "visible": true}, "code:K::Koxy.results.get(\"node1\")"]]}]}]}};

if (typeof api === "string") {
  try {
    api = JSON.parse(api);
  } catch {
    api = {};
  }
}

let requests: number = 0;
let totalUsage: any = "";
let errors: string[] = [];

// Function to calculate CPU usage
// async function calculateCPUUsage() {
//   const process = Deno.run({
//     cmd: ["ps", "-p", Deno.pid.toString(), "-o", "%cpu"],
//     stdout: "piped",
//     stderr: "piped"
//   });
  
//   const output = await process.output(); // output will be a Uint8Array
//   const decoder = new TextDecoder();
//   const cpuUsage = decoder.decode(output).split("\n")[1].trim();
  
//   console.log(`CPU usage: ${cpuUsage}%`);
// }

// // Print CPU usage every 10 seconds
// setInterval(() => {
//   calculateCPUUsage();
// }, 1000);

async function getCPUUsage() {
  try {
    const process = Deno.run({
      cmd: ["mpstat", "-P", "ALL", "1", "1"],
      stdout: "piped",
      stderr: "piped"
    });
  
    const output = await process.output();
    const decoder = new TextDecoder();
    const text = decoder.decode(output);
    const lines = text.split('\n');
    
    // Parse CPU usage for each core
    let usage = lines.slice(3, -1).map(line => {
      const fields = line.trim().split(/\s+/);
      const core = parseInt(fields[1]);
  
      return {
        core,
        usage: parseFloat(fields[11]) // %idle (negate to get %usage)
      };
    });
  
    usage = usage.filter(i => !isNaN(i.core) && !isNaN(i.usage) && i.core < cpus);
    totalUsage = usage;
  } catch (err: any) {
    console.error(`Error getting CPU usage: ${err.message}`);
    errors.push(err.message);
  }
}

async function getMemoryInfo() {
  try {
    const memoryInfo = Deno.systemMemoryInfo();
    console.log("Memory Info:", memoryInfo);
    return memoryInfo;
  } catch (err: any) {
    console.error(`Error getting memory info: ${err.message}`);
  }
}

async function captureUsage() {
  while (true) {
    await getMemoryInfo();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

setTimeout(captureUsage, 1000);

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
      return new Response(
        JSON.stringify({ requests, usage: totalUsage, errors, cpus: os.cpus().length }),
        {
          status: 200,
          headers: { "koxy-response": "true" },
        },
      );
    }

    requests++;

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
  }
};

Deno.serve({ port: 9009 }, handler);

