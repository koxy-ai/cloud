import { Env, env } from "./env.ts";
import { Logger } from "./logger.ts";
import { Results } from "./results.ts";
import { Runner } from "./runner.ts";
import type { Api } from "./index.d.ts"

export class Koxy {
  env: Env;
  logger: Logger;
  results: Results;

  api: Api;
  runner?: Runner;

  headers: Request["headers"];
  body: Record<string, any>;

  static stopSign: string = "<KOXY_STOP>";
  static ignoreSign: string = "<KOXY_IGNORE>";
  runningNode: string = "";

  constructor(
    api: Api,
    headers: Request["headers"],
    body: Record<string, any> = {},
    log: boolean = true
  ) {
    this.env = env;
    this.api = api;

    this.logger = new Logger(this, log);
    this.results = new Results();

    this.headers = headers;
    this.body = body;
  }

  async run(path: string, method: string): Promise<{ status: number; body?: any, headers?: Record<string, string> }> {
    try {
      this.runner = new Runner(path, method, this);
      return await this.runner.runLoop();
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          message: err.message || "Unexpected error running flow",
          headers: {}
        }
      };
    }
  }
}
