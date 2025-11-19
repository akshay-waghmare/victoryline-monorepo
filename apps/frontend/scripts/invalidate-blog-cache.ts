#!/usr/bin/env ts-node

/**
 * Blog Cache Invalidation Script
 * 
 * Manually invalidates Redis cache for blog API responses.
 * Used for immediate content updates or troubleshooting.
 * 
 * Usage:
 *   npm run invalidate-blog-cache
 *   ts-node scripts/invalidate-blog-cache.ts
 *   ts-node scripts/invalidate-blog-cache.ts --key blog_list
 *   ts-node scripts/invalidate-blog-cache.ts --all
 */

import * as redis from 'redis';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Cache key patterns
const CACHE_KEYS = {
  BLOG_LIST: 'blog_list*',
  BLOG_POST: 'blog_post*',
  ALL: 'blog_*'
};

/**
 * Parse command line arguments
 */
function parseArgs(): { key?: string; all?: boolean } {
  const args = process.argv.slice(2);
  const result: { key?: string; all?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) {
      result.key = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      result.all = true;
    }
  }

  return result;
}

/**
 * Create Redis client
 */
async function createRedisClient(): Promise<redis.RedisClientType> {
  const client = redis.createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    },
    password: REDIS_PASSWORD || undefined
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await client.connect();
  return client;
}

/**
 * Delete keys matching a pattern
 */
async function deleteKeysByPattern(
  client: redis.RedisClientType,
  pattern: string
): Promise<number> {
  let cursor = 0;
  let deletedCount = 0;

  do {
    // Scan for keys matching the pattern
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100
    });

    cursor = result.cursor;
    const keys = result.keys;

    if (keys.length > 0) {
      // Delete the keys
      const deleted = await client.del(keys);
      deletedCount += deleted;
      console.log(`  Deleted ${deleted} keys: ${keys.join(', ')}`);
    }
  } while (cursor !== 0);

  return deletedCount;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🗑️  Blog Cache Invalidation Script\n');

  const args = parseArgs();
  let pattern: string;

  // Determine which cache keys to invalidate
  if (args.all) {
    pattern = CACHE_KEYS.ALL;
    console.log('Invalidating ALL blog caches...\n');
  } else if (args.key) {
    pattern = args.key.includes('*') ? args.key : `${args.key}*`;
    console.log(`Invalidating cache for pattern: ${pattern}\n`);
  } else {
    // Default: invalidate both blog_list and blog_post
    pattern = CACHE_KEYS.ALL;
    console.log('Invalidating blog_list and blog_post caches...\n');
  }

  let client: redis.RedisClientType | null = null;

  try {
    // Connect to Redis
    console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    client = await createRedisClient();
    console.log('✅ Connected to Redis\n');

    // Delete cache keys
    console.log('Scanning for matching keys...');
    const deletedCount = await deleteKeysByPattern(client, pattern);

    if (deletedCount === 0) {
      console.log('\n⚠️  No matching keys found. Cache may already be empty.');
    } else {
      console.log(`\n✅ Successfully invalidated ${deletedCount} cache entries.`);
    }

    // Optionally: Trigger sitemap regeneration
    if (args.all || !args.key) {
      console.log('\n💡 Consider regenerating sitemap:');
      console.log('   npm run generate-sitemap');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    // Close Redis connection
    if (client) {
      await client.quit();
      console.log('\nRedis connection closed.');
    }
  }
}

/**
 * Display usage information
 */
function showUsage(): void {
  console.log(`
Usage:
  npm run invalidate-blog-cache [options]

Options:
  --all                 Invalidate all blog-related caches
  --key <pattern>       Invalidate specific cache key pattern
                        (e.g., --key blog_list, --key blog_post::my-slug)

Examples:
  # Invalidate all blog caches (default)
  npm run invalidate-blog-cache

  # Invalidate only blog list cache
  npm run invalidate-blog-cache --key blog_list

  # Invalidate specific blog post cache
  npm run invalidate-blog-cache --key blog_post::my-article-slug

  # Invalidate everything
  npm run invalidate-blog-cache --all

Environment Variables:
  REDIS_HOST            Redis host (default: localhost)
  REDIS_PORT            Redis port (default: 6379)
  REDIS_PASSWORD        Redis password (optional)
  `);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
