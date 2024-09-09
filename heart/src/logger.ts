import { Koxy } from "./koxy";

export class Logger {
  koxy: Koxy;

  private infoPrefix: string = "KOXYLOG:INFO:";
  private wanrPrefix: string = "KOXYLOG:WARN:";
  private errorPrefix: string = "KOXYLOG:ERROR:";

  constructor(koxy: Koxy) {
    this.koxy = koxy;
  }

  getPrefix(prefix: string) {
    return `${this.koxy.runningNode}-${prefix}::`;
  }

  info(...args: any): void {
    console.log(this.getPrefix(this.infoPrefix), ...args);
  }

  warn(...args: any): void {
    console.warn(this.getPrefix(this.wanrPrefix), ...args);
  }

  error(...args: any): void {
    console.error(this.getPrefix(this.errorPrefix), ...args);
  }
}
