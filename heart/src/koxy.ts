import { env, Env } from "./env.ts";
import { Logger } from "./logger.ts";
import { Results } from "./results.ts";

export class Koxy {
  env: Env;
  logger: Logger;
  results: Results;

  headers: Request["headers"];
  body: Record<string, any>;

  constructor(
    headers: Request["headers"],
    body: Record<string, any> = {},
  ) {
    this.env = env;

    this.logger = new Logger();
    this.results = new Results();

    this.headers = headers;
    this.body = body;
  }
}
