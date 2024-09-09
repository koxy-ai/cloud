import { env, Env } from "./env.ts";
import { Logger } from "./logger.ts";
import { Results } from "./results.ts";

export class Koxy {
  env: Env;
  logger: Logger;
  results: Results;

  api: Api;
  headers: Request["headers"];
  body: Record<string, any>;

  stopSign: string = "<KOXY_STOP>";
  ignoreSign: string = "<KOXY_IGNORE>";
  runningNode: string = "";

  constructor(
    api: Api,
    headers: Request["headers"],
    body: Record<string, any> = {},
  ) {
    this.env = env;
    this.api = api;

    this.logger = new Logger(this);
    this.results = new Results();

    this.headers = headers;
    this.body = body;
  }
}
