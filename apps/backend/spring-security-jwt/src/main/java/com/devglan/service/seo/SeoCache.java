package com.devglan.service.seo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
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
    private final Map<String, String> localCache = new ConcurrentHashMap<>();

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
}
