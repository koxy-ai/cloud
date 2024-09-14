import { Koxy } from "./src/koxy.ts";
import os from "node:os";

let cpus = os.cpus().length;
let api: any = {"id": "test-api-123", "env": {"TOKEN1": "VALUE1", "TOKEN2": "VALUE2"}, "flows": {"/api/set": [{"id": "1", "name": "1", "method": "GET", "history": [], "dependecies": [], "start": {"type": "start", "id": "start", "name": "start", "label": "start", "icon": "start", "description": "start", "code": "start", "inputs": [], "next": "node1"}, "end": {"type": "return", "id": "end", "name": "end", "label": "end", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "response", "type": "string", "label": "", "required": true, "visible": true}, "code:K::Koxy.results.get(\"node1\")"]]}, "nodes": [{"type": "normal", "id": "node1id", "name": "node1", "label": "Node", "description": "", "icon": "", "next": "node2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) { return \"Hi\"; }"}, {"type": "normal", "id": "node2id", "name": "node2", "label": "Node", "description": "", "icon": "", "next": "end", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) {koxy.db.set(['test'], {value: 'test'}); return true;}"}, {"type": "return", "id": "end", "name": "end", "label": "end", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "response", "type": "string", "label": "", "required": true, "visible": true}, "code:K::Koxy.results.get(\"node1\")"]]}]}], "/api/get": [{"id": "1", "name": "1", "method": "GET", "history": [], "dependecies": [], "start": {"type": "start", "id": "start", "name": "start", "label": "start", "icon": "start", "description": "start", "code": "start", "inputs": [], "next": "node1_2"}, "end": {"type": "return", "id": "end2", "name": "end2", "label": "end2", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "value", "type": "string", "label": "", "required": true, "visible": true}, "code:K::(await Koxy.db.get(['test'])).value"]]}, "nodes": [{"type": "normal", "id": "node1_2id", "name": "node1_2", "label": "Node", "description": "", "icon": "", "next": "node2_2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) { return \"Hi\"; }"}, {"type": "normal", "id": "node2_2id", "name": "node2_2", "label": "Node", "description": "", "icon": "", "next": "end2", "inputs": [[{"key": "date", "type": "number", "label": "", "required": true, "visible": true}, "code:K::Date.now()"], [{"key": "hi-s", "type": "string", "label": "", "required": true, "visible": true}, "string:K::hi"]], "code": "export async function main(koxy: any, inputs: any) {return true;}"}, {"type": "return", "id": "end2", "name": "end2", "label": "end2", "icon": "end", "description": "end", "code": "end", "inputs": [[{"key": "value", "type": "string", "label": "", "required": true, "visible": true}, "code:K::(await Koxy.db.get(['test'])).value"]]}]}]}};

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
  } 
  
  catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "koxy-response": "true" },
    });
  } 
  
  finally {
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
