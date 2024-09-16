import { Env, env } from "./env.ts";
import { Logger } from "./logger.ts";
import { Results } from "./results.ts";
import { Runner } from "./runner.ts";
import { DB } from "./db.ts";
import type { Api, Res } from "./index.d.ts";

export class Koxy {
  env: Env;
  logger: Logger;
  results: Results;
  db: DB;

  private api: Api;
  runner?: Runner;

  req: Request;
  headers: Request["headers"];
  body: Record<string, any>;
  query: Record<string, string> = {};
  logs: any[] = [];

  static stopSign: string = "<KOXY_STOP>";
  static ignoreSign: string = "<KOXY_IGNORE>";

  runningNode: string = "";
  status: number = 200;
  res: Res | undefined = undefined;

  constructor(
    api: Api,
    path: string,
    req: Request,
    body: Record<string, any> = {},
    log: boolean = true,
  ) {
    this.env = env;
    this.req = req;
    this.api = api;

    this.logger = new Logger(this, log);
    this.results = new Results();
    this.db = new DB(this);
    this.db.init();

    this.headers = req.headers;
    this.body = body;

    const url = new URL(path, "http://localhost");
    this.query = Object.fromEntries(url.searchParams.entries());
    console.log(this.query);
  }

  async save() {}

  async run(path: string, method: string): Promise<Res> {
    try {
      this.runner = new Runner(path, method, this);
      const res = await this.runner.runLoop();

      this.res = res;
      return res;
    }
    catch (err) {
      this.logger.error(err.message);
      const res: Res = {
        status: 500,
        body: {
          success: false,
          message: err.message || "Unexpected error running flow",
          headers: {},
        },
      };

      this.res = res;
      return res;
    }
  }
}
