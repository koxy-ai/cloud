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

  private getPrefix(prefix: string) {
    return `${this.koxy.runningNode}-${prefix}::`;
  }

  private push(prefix: string, args: any[]): void {
    args.forEach(element => {
      this.koxy.logs.push({
        prefix, log: element
      });
    });
  }

  info(...args: any): void {
    if (!this.enabled) {
      return;
    }

    const prefix = this.getPrefix(this.infoPrefix);

    console.log(prefix, ...args);
    this.push(prefix, args);
  }

  warn(...args: any): void {
    if (!this.enabled) {
      return;
    }

    const prefix = this.getPrefix(this.wanrPrefix);

    console.warn(prefix, ...args);
    this.push(prefix, args);
  }

  error(...args: any): void {
    if (!this.enabled) {
      return;
    }

    const prefix = this.getPrefix(this.errorPrefix);

    console.error(prefix, ...args);
    this.push(prefix, args);
  }
}
