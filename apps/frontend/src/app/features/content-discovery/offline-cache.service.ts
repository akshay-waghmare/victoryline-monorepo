import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Service for offline caching of search results and match data using IndexedDB.
 * Provides graceful degradation when network is unavailable.
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private readonly DB_NAME = 'CrickzenOfflineCache';
  private readonly DB_VERSION = 1;
  private readonly STORE_SEARCHES = 'searches';
  private readonly STORE_MATCHES = 'matches';
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHED_SEARCHES = 50;

  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDatabase();
  }

  /**
   * Initialize IndexedDB with object stores for searches and matches
   */
  private initDatabase(): Promise<IDBDatabase> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported - offline caching disabled');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create searches store with compound index on query + filters
        if (!db.objectStoreNames.contains(this.STORE_SEARCHES)) {
          const searchStore = db.createObjectStore(this.STORE_SEARCHES, { keyPath: 'cacheKey' });
          searchStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create matches store with matchId as key
        if (!db.objectStoreNames.contains(this.STORE_MATCHES)) {
          const matchStore = db.createObjectStore(this.STORE_MATCHES, { keyPath: 'matchId' });
          matchStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Generate cache key from search query and filters
   */
  private getCacheKey(query: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `${query.toLowerCase().trim()}|${filterStr}`;
  }

  /**
   * Check if cached data is still valid (not expired)
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_EXPIRY_MS;
  }

  /**
   * Cache search results with query and filters
   */
  cacheSearchResults(query: string, filters: any, results: any[]): Observable<void> {
    return from(this.initDatabase()).pipe(
      tap(db => {
        const transaction = db.transaction([this.STORE_SEARCHES], 'readwrite');
        const store = transaction.objectStore(this.STORE_SEARCHES);

        const cacheKey = this.getCacheKey(query, filters);
        const cacheEntry = {
          cacheKey,
          query,
          filters,
          results,
          timestamp: Date.now()
        };

        store.put(cacheEntry);

        // Clean up old entries if cache is too large
        this.cleanupOldSearches(store);
      }),
      catchError(error => {
        console.error('Failed to cache search results:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Retrieve cached search results
   */
  getCachedSearchResults(query: string, filters?: any): Observable<any[] | null> {
    return from(this.initDatabase()).pipe(
      tap(db => {
        const transaction = db.transaction([this.STORE_SEARCHES], 'readonly');
        const store = transaction.objectStore(this.STORE_SEARCHES);
        const cacheKey = this.getCacheKey(query, filters);

        return new Promise<any[] | null>((resolve) => {
          const request = store.get(cacheKey);

          request.onsuccess = () => {
            const entry = request.result;
            if (!entry) {
              resolve(null);
              return;
            }

            // Check if cache is expired
            if (this.isExpired(entry.timestamp)) {
              // Delete expired entry
              const deleteTransaction = db.transaction([this.STORE_SEARCHES], 'readwrite');
              deleteTransaction.objectStore(this.STORE_SEARCHES).delete(cacheKey);
              resolve(null);
              return;
            }

            resolve(entry.results);
          };

          request.onerror = () => {
            console.error('Failed to retrieve cached search:', request.error);
            resolve(null);
          };
        });
      }),
      catchError(error => {
        console.error('Failed to get cached search results:', error);
        return of(null);
      })
    );
  }

  /**
   * Cache individual match data
   */
  cacheMatch(matchId: string, matchData: any): Observable<void> {
    return from(this.initDatabase()).pipe(
      tap(db => {
        const transaction = db.transaction([this.STORE_MATCHES], 'readwrite');
        const store = transaction.objectStore(this.STORE_MATCHES);

        const cacheEntry = {
          matchId,
          data: matchData,
          timestamp: Date.now()
        };

        store.put(cacheEntry);
      }),
      catchError(error => {
        console.error('Failed to cache match:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Retrieve cached match data
   */
  getCachedMatch(matchId: string): Observable<any | null> {
    return from(this.initDatabase()).pipe(
      tap(db => {
        const transaction = db.transaction([this.STORE_MATCHES], 'readonly');
        const store = transaction.objectStore(this.STORE_MATCHES);

        return new Promise<any | null>((resolve) => {
          const request = store.get(matchId);

          request.onsuccess = () => {
            const entry = request.result;
            if (!entry) {
              resolve(null);
              return;
            }

            // Check if cache is expired
            if (this.isExpired(entry.timestamp)) {
              // Delete expired entry
              const deleteTransaction = db.transaction([this.STORE_MATCHES], 'readwrite');
              deleteTransaction.objectStore(this.STORE_MATCHES).delete(matchId);
              resolve(null);
              return;
            }

            resolve(entry.data);
          };

          request.onerror = () => {
            console.error('Failed to retrieve cached match:', request.error);
            resolve(null);
          };
        });
      }),
      catchError(error => {
        console.error('Failed to get cached match:', error);
        return of(null);
      })
    );
  }

  /**
   * Remove old search entries to keep cache size manageable
   */
  private cleanupOldSearches(store: IDBObjectStore): void {
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Newest first

    let count = 0;
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        count++;
        if (count > this.MAX_CACHED_SEARCHES) {
          store.delete(cursor.primaryKey);
        }
        cursor.continue();
      }
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): Observable<void> {
    return from(this.initDatabase()).pipe(
      tap(db => {
        const transaction = db.transaction([this.STORE_SEARCHES, this.STORE_MATCHES], 'readwrite');
        transaction.objectStore(this.STORE_SEARCHES).clear();
        transaction.objectStore(this.STORE_MATCHES).clear();
        console.log('Offline cache cleared');
      }),
      catchError(error => {
        console.error('Failed to clear cache:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): Observable<{ searches: number; matches: number }> {
    return from(this.initDatabase()).pipe(
      tap(async db => {
        const transaction = db.transaction([this.STORE_SEARCHES, this.STORE_MATCHES], 'readonly');

        const searchCount = await new Promise<number>((resolve) => {
          const request = transaction.objectStore(this.STORE_SEARCHES).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });

        const matchCount = await new Promise<number>((resolve) => {
          const request = transaction.objectStore(this.STORE_MATCHES).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });

        return { searches: searchCount, matches: matchCount };
      }),
      catchError(error => {
        console.error('Failed to get cache stats:', error);
        return of({ searches: 0, matches: 0 });
      })
    );
  }
}
