import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { retry, retryWhen, mergeMap, finalize } from 'rxjs/operators';

/**
 * Configuration for rate limiting and retry behavior
 */
export interface RateLimitConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Service to handle API rate limiting with exponential backoff
 * Prevents overwhelming the backend with too many requests
 */
@Injectable({
  providedIn: 'root'
})
export class RateLimitService {
  private readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  };

  // Track retry counts per operation
  private retryAttempts = new Map<string, number>();
  
  // Track when operations are in progress
  private inProgressOperations = new Set<string>();

  constructor() {}

  /**
   * Apply exponential backoff retry strategy to an Observable
   * @param operationId Unique identifier for the operation (for tracking)
   * @param config Optional custom rate limit configuration
   */
  applyRateLimit<T>(
    operationId: string,
    config: Partial<RateLimitConfig> = {}
  ): (source: Observable<T>) => Observable<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    return (source: Observable<T>) => {
      // Mark operation as in progress
      this.inProgressOperations.add(operationId);
      
      return source.pipe(
        retryWhen(errors => {
          return errors.pipe(
            mergeMap((error, index) => {
              const attempt = index + 1;
              this.retryAttempts.set(operationId, attempt);
              
              // Check if max retries exceeded
              if (attempt > finalConfig.maxRetries) {
                console.error(`Max retries (${finalConfig.maxRetries}) exceeded for ${operationId}`);
                return throwError(error);
              }
              
              // Calculate exponential backoff delay
              const delay = Math.min(
                finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, index),
                finalConfig.maxDelayMs
              );
              
              console.log(
                `Retrying ${operationId} (attempt ${attempt}/${finalConfig.maxRetries}) after ${delay}ms...`
              );
              
              // Wait before retrying
              return timer(delay);
            })
          );
        }),
        finalize(() => {
          // Clean up tracking when operation completes or errors
          this.inProgressOperations.delete(operationId);
          this.retryAttempts.delete(operationId);
        })
      );
    };
  }

  /**
   * Check if an operation is currently in progress
   */
  isOperationInProgress(operationId: string): boolean {
    return this.inProgressOperations.has(operationId);
  }

  /**
   * Get current retry attempt for an operation
   */
  getRetryAttempt(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Get all operations currently in progress
   */
  getInProgressOperations(): string[] {
    return Array.from(this.inProgressOperations);
  }

  /**
   * Check if we should throttle based on too many simultaneous operations
   * @param maxSimultaneous Maximum number of simultaneous operations allowed
   */
  shouldThrottle(maxSimultaneous: number = 5): boolean {
    return this.inProgressOperations.size >= maxSimultaneous;
  }

  /**
   * Apply simple throttle to prevent duplicate operations
   * Returns true if operation should proceed, false if throttled
   */
  throttleOperation(operationId: string, minIntervalMs: number = 500): boolean {
    const lastAttemptKey = `last_${operationId}`;
    const lastAttempt = (this as any)[lastAttemptKey] || 0;
    const now = Date.now();
    
    if (now - lastAttempt < minIntervalMs) {
      console.log(`Throttling ${operationId} - too soon since last attempt`);
      return false;
    }
    
    (this as any)[lastAttemptKey] = now;
    return true;
  }

  /**
   * Create a rate-limited Promise wrapper
   * Useful for converting existing Promise-based APIs
   */
  async executeLimited<T>(
    operationId: string,
    operation: () => Promise<T>,
    config: Partial<RateLimitConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: any;
    
    // Mark operation as in progress
    this.inProgressOperations.add(operationId);
    
    try {
      for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
        this.retryAttempts.set(operationId, attempt);
        
        try {
          const result = await operation();
          return result;
        } catch (error) {
          lastError = error;
          
          // Don't retry if it's the last attempt
          if (attempt >= finalConfig.maxRetries) {
            throw error;
          }
          
          // Calculate exponential backoff delay
          const delay = Math.min(
            finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
            finalConfig.maxDelayMs
          );
          
          console.log(
            `Retrying ${operationId} (attempt ${attempt}/${finalConfig.maxRetries}) after ${delay}ms...`
          );
          
          // Wait before retrying
          await this.sleep(delay);
        }
      }
      
      throw lastError;
    } finally {
      // Clean up tracking
      this.inProgressOperations.delete(operationId);
      this.retryAttempts.delete(operationId);
    }
  }

  /**
   * Helper to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset all tracking (useful for testing)
   */
  reset(): void {
    this.retryAttempts.clear();
    this.inProgressOperations.clear();
  }
}
