export class Results {
  private data: Map<string, any> = new Map();

  constructor() {}

  get(key: string): any {
    return this.data.get(key);
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }
}