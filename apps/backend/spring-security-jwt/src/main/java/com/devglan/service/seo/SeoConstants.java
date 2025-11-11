package com.devglan.service.seo;

public final class SeoConstants {
    private SeoConstants() {}

    public static final String CANONICAL_HOST = "https://www.crickzen.com";
    public static final int SITEMAP_DEBOUNCE_SECONDS = 5; // Minimum wait before regenerating
    public static final int SITEMAP_MAX_WRITES_PER_MINUTE = 30; // Burst cap
    public static final String SITEMAP_PARTITION_PREFIX = "/sitemaps/sitemap-matches-";
    public static final int SITEMAP_PARTITION_PAD = 4; // e.g., 0001

    // Sitemap generation knobs (defaults; may be overridden by real data logic)
    public static final int SITEMAP_PARTITIONS = 1; // Fallback partition count when data unavailable
    public static final int SITEMAP_SAMPLE_URLS_PER_PARTITION = 1; // Back-compat for tests
    public static final int SITEMAP_MAX_URLS_PER_PARTITION = 100; // Real data partition sizing
    public static final int SITEMAP_MAX_URLS_TOTAL = 10000; // Cap total URLs to avoid huge payloads

    // OG image utilities
    public static final String OG_PLACEHOLDER_URL = CANONICAL_HOST + "/assets/og/placeholder.png";
}
