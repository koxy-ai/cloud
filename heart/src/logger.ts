export class Logger {
  private infoPrefix: string = "KOXYLOG:INFO:";
  private wanrPrefix: string = "KOXYLOG:WARN:";
  private errorPrefix: string = "KOXYLOG:ERROR:";

  constructor() {}

  info(...args: any): void {
    console.log(this.infoPrefix, ...args);
  }

  warn(...args: any): void {
    console.warn(this.wanrPrefix, ...args);
  }

  error(...args: any): void {
    console.error(this.errorPrefix, ...args);
  }
}

export const logger = new Logger();