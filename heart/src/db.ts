import { Koxy } from "./koxy.ts";
import { ValidateInputs } from "./validate-inputs.ts";

export class DB {
  private koxy: Koxy;
  private kv: any;

  constructor(koxy: Koxy, kv?: any) {
    this.koxy = koxy;
    this.kv = kv;
  }

  public async init() {
    if (this.kv) return;

    try {
      await Deno.stat("/database");
    } catch {
      await Deno.mkdir("/database");
    }

    this.kv = await Deno.openKv("/database/db.sqlite");
  }

  public async get<T = any>(
    collection: string,
    key: string,
  ): Promise<T | null> {
    await this.init();
    const res = await this.kv.get([collection, key]);
    return (res.value ?? null) as T | null;
  }

  public async set<T = any>(
    collection: string,
    key: string[],
    value: T,
  ): Promise<boolean> {
    await this.init();

    const col = (this.koxy.api.collections || []).find((c) => c.id === collection);
    if (!col) {
      this.koxy.logger.error(`Collection ${collection} not found`);
      return false;
    }

    const schema = col.schema;
    const validator = new ValidateInputs(this.koxy, schema);

    if (!validator.validate(value as any)) {
      this.koxy.logger.error(`Invalid value for collection ${collection}`);
      return false;
    }

    await this.kv.set([collection, key], value);
    return true;
  }
}
