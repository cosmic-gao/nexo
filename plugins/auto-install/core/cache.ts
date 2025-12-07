import { sha1Hash } from "./utils";

type CacheEntry<T> = {
  key: string;
  value: T;
  timestamp: number;
};

const FINGERPRINT_BYTES = 4096;
const PURGE_BATCH = 32;

/**
 * 内容哈希缓存：
 * - key = filePath + content hash，避免同文件不同内容误命中
 * - 支持 TTL，超时自动失效
 */
export class ImportCache<T> {
  ttl: number;
  map = new Map<string, CacheEntry<T>>();

  constructor(ttl = 0) {
    this.ttl = ttl;
  }

  /**
   * 获取缓存；如过期则返回 null 并清理
   * @param filePath 文件路径
   * @param content  文件内容
   */
  get(filePath: string, content: string): T | null {
    const key = this.buildKey(filePath, content);
    const entry = this.map.get(key);
    if (!entry) return null;
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * 设置缓存，记录当前时间戳
   * @param filePath 文件路径
   * @param content  文件内容
   * @param value    缓存值
   */
  set(filePath: string, content: string, value: T) {
    const key = this.buildKey(filePath, content);
    if (this.ttl > 0) this.purgeExpired();
    this.map.set(key, { key, value, timestamp: Date.now() });
  }

  /**
   * 清空缓存
   */
  clear() {
    this.map.clear();
  }

  private buildKey(filePath: string, content: string) {
    const fp = this.fingerprint(content);
    return `${filePath}:${content.length}:${fp}`;
  }

  private fingerprint(content: string) {
    if (content.length <= FINGERPRINT_BYTES) return sha1Hash(content);
    return sha1Hash(content.slice(0, FINGERPRINT_BYTES));
  }

  private purgeExpired() {
    if (this.ttl <= 0 || this.map.size === 0) return;
    const now = Date.now();
    let scanned = 0;
    for (const [key, entry] of this.map) {
      if (now - entry.timestamp > this.ttl) {
        this.map.delete(key);
      }
      if (++scanned >= PURGE_BATCH) break;
    }
  }
}
