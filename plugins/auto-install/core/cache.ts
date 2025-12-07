import { hashString } from "./utils";

type CacheEntry<T> = {
  key: string;
  value: T;
  timestamp: number;
};

export class ImportCache<T> {
  ttl: number;
  map = new Map<string, CacheEntry<T>>();

  constructor(ttl = 0) {
    this.ttl = ttl;
  }

  get(filePath: string, content: string): T | null {
    const key = `${filePath}:${hashString(content)}`;
    const entry = this.map.get(key);
    if (!entry) return null;
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  set(filePath: string, content: string, value: T) {
    const key = `${filePath}:${hashString(content)}`;
    this.map.set(key, { key, value, timestamp: Date.now() });
  }

  clear() {
    this.map.clear();
  }
}
