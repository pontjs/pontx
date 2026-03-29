/**
 * Completion Cache
 *
 * A simple in-memory cache with TTL support for completion data.
 */

interface CacheEntry<T> {
  value: T;
  expireAt: number;
}

export class CompletionCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private ttl: number;

  /**
   * Create a new completion cache
   * @param ttl Time-to-live in milliseconds (default: 60000 = 1 minute)
   */
  constructor(ttl: number = 60000) {
    this.ttl = ttl;
  }

  /**
   * Get a cached value or load it using the provided loader function
   * @param key Cache key
   * @param loader Async function to load the value if not cached
   * @returns Cached or newly loaded value
   */
  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expireAt > Date.now()) {
      return entry.value;
    }

    const value = await loader();
    this.cache.set(key, {
      value,
      expireAt: Date.now() + this.ttl,
    });

    return value;
  }

  /**
   * Get a cached value synchronously (returns undefined if not cached or expired)
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expireAt > Date.now()) {
      return entry.value;
    }

    // Clean up expired entry
    if (entry) {
      this.cache.delete(key);
    }

    return undefined;
  }

  /**
   * Set a cached value
   * @param key Cache key
   * @param value Value to cache
   * @param customTtl Optional custom TTL for this entry
   */
  set<T>(key: string, value: T, customTtl?: number): void {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + (customTtl ?? this.ttl),
    });
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns Whether the key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expireAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern Optional pattern to match keys (if not provided, clears all)
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the number of entries in the cache (including expired ones)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expireAt <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
