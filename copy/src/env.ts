import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

export class Env {
  private env;

  constructor() {
    load();
    this.env = Deno.env;
  }

  get(key: string): string | undefined {
    return this.env.get(key);
  }
}

export const env = new Env();