package com.devglan.service.seo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple abstraction over Redis with graceful fallback to in-memory map if Redis is unavailable.
 * This avoids tight coupling and lets us introduce Redis without breaking local dev.
 */
@Service
public class SeoCache {
    private static final String KEY_SITEMAP_INDEX = "seo:sitemap:index";
    private static final String KEY_INDEXED_SLUGS_PREFIX = "seo:indexed:";
    
    private final Map<String, String> localCache = new ConcurrentHashMap<>();
    private final Set<String> localIndexedSlugs = ConcurrentHashMap.newKeySet();

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate; // optional

    public String getSitemapIndex() {
        String val = readRedis(KEY_SITEMAP_INDEX);
        if (val != null) return val;
        return localCache.get(KEY_SITEMAP_INDEX);
    }

    public void putSitemapIndex(String xml) {
        localCache.put(KEY_SITEMAP_INDEX, xml);
        writeRedis(KEY_SITEMAP_INDEX, xml, Duration.ofMinutes(10));
    }

    public void evictSitemapIndex() {
        localCache.remove(KEY_SITEMAP_INDEX);
        deleteRedis(KEY_SITEMAP_INDEX);
    }

    private String readRedis(String key) {
        if (redisTemplate == null) return null;
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void writeRedis(String key, String value, Duration ttl) {
        if (redisTemplate == null) return;
        try {
            long seconds = ttl.getSeconds();
            redisTemplate.opsForValue().set(key, value, seconds, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // Fallback already written to local map
        }
    }

    private void deleteRedis(String key) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(key);
        } catch (Exception ignored) {
            // Swallow errors so local eviction still succeeds
        }
    }
    
    // ============ Indexed Slugs Tracking ============
    
    /**
     * Get Redis key for today's indexed slugs.
     * Uses date-based key so slugs auto-expire after 24 hours.
     */
    private String getIndexedSlugsKey() {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        return KEY_INDEXED_SLUGS_PREFIX + today;
    }
    
    /**
     * Check if a slug has already been indexed today.
     * Checks Redis first, falls back to local cache.
     */
    public boolean isSlugIndexed(String slug) {
        if (slug == null || slug.isEmpty()) return false;
        
        // Check Redis first
        if (redisTemplate != null) {
            try {
                Boolean isMember = redisTemplate.opsForSet().isMember(getIndexedSlugsKey(), slug);
                if (Boolean.TRUE.equals(isMember)) {
                    return true;
                }
            } catch (Exception ignored) {
                // Fall through to local check
            }
        }
        
        return localIndexedSlugs.contains(slug);
    }
    
    /**
     * Mark a slug as indexed for today.
     * Stores in both Redis (with 25h TTL) and local cache.
     */
    public void markSlugIndexed(String slug) {
        if (slug == null || slug.isEmpty()) return;
        
        // Add to local cache
        localIndexedSlugs.add(slug);
        
        // Add to Redis with 25-hour TTL (ensures full day coverage even with timezone drift)
        if (redisTemplate != null) {
            try {
                String key = getIndexedSlugsKey();
                redisTemplate.opsForSet().add(key, slug);
                redisTemplate.expire(key, 25, TimeUnit.HOURS);
            } catch (Exception ignored) {
                // Local cache already has it
            }
        }
    }
    
    /**
     * Get count of indexed slugs for today.
     */
    public long getIndexedSlugCount() {
        if (redisTemplate != null) {
            try {
                Long size = redisTemplate.opsForSet().size(getIndexedSlugsKey());
                if (size != null && size > 0) {
                    return size;
                }
            } catch (Exception ignored) {
                // Fall through to local
            }
        }
        return localIndexedSlugs.size();
    }
    
    /**
     * Get all indexed slugs for today (for status display).
     */
    public Set<String> getIndexedSlugs() {
        if (redisTemplate != null) {
            try {
                Set<String> slugs = redisTemplate.opsForSet().members(getIndexedSlugsKey());
                if (slugs != null && !slugs.isEmpty()) {
                    return slugs;
                }
            } catch (Exception ignored) {
                // Fall through to local
            }
        }
        return Collections.unmodifiableSet(localIndexedSlugs);
    }
    
    /**
     * Clear local cache (Redis keys auto-expire via TTL).
     */
    public void clearLocalIndexedSlugs() {
        localIndexedSlugs.clear();
    }
}
