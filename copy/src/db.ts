export class DB {
  private kv: any;

  constructor(kv?: any) {
    this.kv = kv;
  }

  public async init() {
    if (this.kv) return;

    try {
      await Deno.stat("/data");
    } catch {
      await Deno.mkdir("/data");
    }

    this.kv = await Deno.openKv("/data/db.sqlite");
  }

  public async get<T = any>(key: string[]): Promise<T | null> {
    await this.init();
    const res = await this.kv.get(key);
    return (res.value ?? null) as T | null;
  }

  public async set<T = any>(key: string[], value: T) {
    await this.init();
    await this.kv.set(key, value);
  }
}

(async () => {
  const db = new DB();
  await db.init();

  console.time("set");
  await db.set(["test"], { value: "test2" });
  console.timeEnd("set");

  console.time("get");
  const get = await db.get(["test"]);
  console.timeEnd("get");
  console.log(get);
})();
