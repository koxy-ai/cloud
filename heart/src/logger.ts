import { Koxy } from "./koxy.ts";

export class Logger {
  koxy: Koxy;
  enabled: boolean;

  private infoPrefix: string = "KOXYLOG:INFO:";
  private wanrPrefix: string = "KOXYLOG:WARN:";
  private errorPrefix: string = "KOXYLOG:ERROR:";

  constructor(koxy: Koxy, enabled: boolean) {
    this.koxy = koxy;
    this.enabled = enabled;
  }

  getPrefix(prefix: string) {
    return `${this.koxy.runningNode}-${prefix}::`;
  }

  info(...args: any): void {
    if (!this.enabled) {
      return;
    }

    console.log(this.getPrefix(this.infoPrefix), ...args);
  }

  warn(...args: any): void {
    if (!this.enabled) {
      return;
    }

    console.warn(this.getPrefix(this.wanrPrefix), ...args);
  }

  error(...args: any): void {
    if (!this.enabled) {
      return;
    }

    console.error(this.getPrefix(this.errorPrefix), ...args);
  }
}
