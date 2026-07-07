package com.devglan.scheduler;

import com.devglan.service.CrexMatchUrlHelper;
import com.devglan.service.seo.GoogleSearchConsoleService;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.LiveMatchesService.LiveMatchEntry;
import com.devglan.service.seo.SeoCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Scheduled job for automatic URL indexing of live matches.
 * Runs every 15 minutes to ensure new live matches get indexed quickly.
 * 
 * Feature 008 - Match Page Title SEO Optimization
 * 
 * Quota Management:
 * - Google Indexing API has ~200 requests/day quota
 * - Tracks indexed URLs in Redis (via SeoCache) to persist across restarts
 * - Daily auto-expiration via Redis TTL (25 hours)
 * - Falls back to in-memory if Redis unavailable
 */
@Component
public class LiveMatchIndexingScheduler {
    
    private static final Logger logger = LoggerFactory.getLogger(LiveMatchIndexingScheduler.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private final GoogleSearchConsoleService googleSearchConsoleService;
    private final LiveMatchesService liveMatchesService;
    private final SeoCache seoCache;
    
    @Value("${gsc.enabled:false}")
    private boolean gscEnabled;
    
    @Value("${gsc.live-match-indexing.enabled:true}")
    private boolean liveMatchIndexingEnabled;
    
    @Value("${gsc.live-match-indexing.max-per-run:10}")
    private int maxIndexingPerRun;

    @Value("${gsc.live-match-indexing.daily-budget:180}")
    private int dailyIndexingBudget;

    @Value("${gsc.live-match-indexing.upcoming-window-hours:120}")
    private int upcomingIndexingWindowHours;

    @Value("${gsc.live-match-indexing.upcoming-priority-lead-hours:30}")
    private int upcomingPriorityLeadHours;
    
    public LiveMatchIndexingScheduler(
            GoogleSearchConsoleService googleSearchConsoleService,
            LiveMatchesService liveMatchesService,
            SeoCache seoCache) {
        this.googleSearchConsoleService = googleSearchConsoleService;
        this.liveMatchesService = liveMatchesService;
        this.seoCache = seoCache;
    }
    
    /**
     * Index live and upcoming matches every 15 minutes.
     *
     * Upcoming matches are included so Google discovers pre-match pages before
     * the first ball, not hours after the match goes LIVE. Completed/abandoned
     * matches are filtered out because they do not need a real-time ping.
     *
     * Cron alternative: @Scheduled(cron = "0 0/15 * * * *")
     * Using fixedRate for simplicity and immediate start after deployment.
     */
    @Scheduled(fixedRateString = "${gsc.live-match-indexing.interval-ms:900000}") // 15 minutes by default
    public void indexNewLiveMatches() {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
        
        if (!gscEnabled) {
            logger.debug("[LiveMatchIndexer] GSC disabled, skipping match indexing");
            return;
        }
        
        if (!liveMatchIndexingEnabled) {
            logger.debug("[LiveMatchIndexer] Live match indexing disabled");
            return;
        }
        
        if (!googleSearchConsoleService.isIndexingInitialized()) {
            logger.warn("[LiveMatchIndexer] Indexing API not initialized, skipping");
            return;
        }
        
        logger.info("[LiveMatchIndexer] Starting match indexing at {}", timestamp);
        
        try {
            List<LiveMatchEntry> allMatches = liveMatchesService.getLiveMatches();
            
            if (allMatches == null || allMatches.isEmpty()) {
                logger.info("[LiveMatchIndexer] No matches found");
                return;
            }

            List<LiveMatchEntry> indexableMatches = allMatches.stream()
                    .filter(this::isIndexableForPing)
                    .collect(Collectors.toList());

            if (indexableMatches.isEmpty()) {
                logger.info("[LiveMatchIndexer] No indexable matches found after filtering terminal matches");
                return;
            }

            indexableMatches.sort(Comparator.comparingLong(this::prioritySortValue));
            
            int indexed = 0;
            int skipped = 0;
            int failed = 0;
            long indexedToday = seoCache.getIndexedSlugCount();
            
            for (LiveMatchEntry match : indexableMatches) {
                if (indexedToday >= dailyIndexingBudget) {
                    logger.warn("[LiveMatchIndexer] Reached daily indexing budget ({}), stopping to protect quota", dailyIndexingBudget);
                    break;
                }

                // Respect max per run to stay within quota
                if (indexed >= maxIndexingPerRun) {
                    logger.info("[LiveMatchIndexer] Reached max indexing limit ({}) for this run", maxIndexingPerRun);
                    break;
                }

                String slug = extractSlugFromUrl(match.getUrl());
                if (slug == null || slug.isEmpty()) {
                    slug = match.getExternalMatchKey();
                }

                if (!isCanonicalMatchSlug(slug)) {
                    logger.warn("[LiveMatchIndexer] Could not extract slug from URL: {}", match.getUrl());
                    continue;
                }
                
                // Skip if already indexed today (persisted in Redis)
                if (seoCache.isSlugIndexed(slug)) {
                    skipped++;
                    continue;
                }
                
                // Request indexing
                boolean success = googleSearchConsoleService.requestIndexingForMatch(slug);
                
                if (success) {
                    seoCache.markSlugIndexed(slug);
                    indexed++;
                    indexedToday++;
                    logger.info("[LiveMatchIndexer] Indexed match: {}", slug);
                } else {
                    failed++;
                    logger.warn("[LiveMatchIndexer] Failed to index match: {}", slug);
                }
                
                // Small delay between requests to avoid rate limiting
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            
            logger.info("[LiveMatchIndexer] Completed: {} indexed, {} skipped (already indexed), {} failed", 
                indexed, skipped, failed);
            
        } catch (Exception e) {
            logger.error("[LiveMatchIndexer] Error during live match indexing: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Extract match slug from the full URL.
     * 
     * Input formats:
     * - https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025/live
     * - /cric-live/ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025
     * 
     * Output: ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025
     */
    public String extractSlugFromUrl(String url) {
        return CrexMatchUrlHelper.extractMatchKey(url);
    }

    private boolean isCanonicalMatchSlug(String slug) {
        return slug != null
                && !slug.trim().isEmpty()
                && !slug.trim().matches("\\d+")
                && slug.toLowerCase().contains("-vs-");
    }

    /**
     * Returns true for matches that should receive a real-time Indexing API ping.
     * Live and upcoming matches qualify; completed/abandoned/finished matches do not.
     */
    private boolean isIndexableForPing(LiveMatchEntry match) {
        if (match.isFinished()) {
            return false;
        }
        String status = match.getStatus() == null ? "" : match.getStatus().toUpperCase();
        if ("COMPLETED".equals(status) || "ABANDONED".equals(status) || "FINISHED".equals(status)) {
            return false;
        }
        if ("UPCOMING".equals(status) || "SCHEDULED".equals(status)) {
            Long scheduledStartTime = match.getScheduledStartTime();
            if (scheduledStartTime == null || scheduledStartTime <= 0) {
                return true;
            }
            long now = System.currentTimeMillis();
            if (scheduledStartTime <= now) {
                return true;
            }
            long horizonMillis = Math.max(1, upcomingIndexingWindowHours) * 60L * 60L * 1000L;
            return scheduledStartTime - now <= horizonMillis;
        }
        return true;
    }

    private long prioritySortValue(LiveMatchEntry match) {
        String status = match.getStatus() == null ? "" : match.getStatus().toUpperCase();
        long start = match.getScheduledStartTime() == null ? Long.MAX_VALUE / 2 : match.getScheduledStartTime();
        long now = System.currentTimeMillis();
        if ("LIVE".equals(status) || "INNINGS_BREAK".equals(status) || "RAIN_DELAY".equals(status)) {
            return start;
        }
        if ("UPCOMING".equals(status)) {
            long hoursUntilStart = match.getScheduledStartTime() == null
                    ? Long.MAX_VALUE / 2
                    : (match.getScheduledStartTime() - now) / (60L * 60L * 1000L);
            if (hoursUntilStart >= Math.max(0, upcomingPriorityLeadHours)
                    && hoursUntilStart <= Math.max(upcomingPriorityLeadHours, upcomingIndexingWindowHours)) {
                return Long.MAX_VALUE / 8 + start;
            }
            return Long.MAX_VALUE / 4 + start;
        }
        return Long.MAX_VALUE / 2 + start;
    }
    
    /**
     * Manual trigger for testing
     */
    public void triggerManualIndexing() {
        logger.info("[LiveMatchIndexer] Manual indexing triggered");
        indexNewLiveMatches();
    }
    
    /**
     * Get current status
     */
    public String getStatus() {
        StringBuilder status = new StringBuilder();
        status.append("LiveMatchIndexingScheduler Status:\n");
        status.append("  GSC Enabled: ").append(gscEnabled).append("\n");
        status.append("  Live Match Indexing Enabled: ").append(liveMatchIndexingEnabled).append("\n");
        status.append("  Indexing API Initialized: ").append(googleSearchConsoleService.isIndexingInitialized()).append("\n");
        status.append("  Max Per Run: ").append(maxIndexingPerRun).append("\n");
        status.append("  Daily Budget: ").append(dailyIndexingBudget).append("\n");
        status.append("  Upcoming Window Hours: ").append(upcomingIndexingWindowHours).append("\n");
        status.append("  Upcoming Priority Lead Hours: ").append(upcomingPriorityLeadHours).append("\n");
        status.append("  Already Indexed (today): ").append(seoCache.getIndexedSlugCount()).append("\n");
        status.append("  Persistence: Redis (25h TTL) with in-memory fallback\n");
        status.append("  Schedule: Every 15 minutes\n");
        return status.toString();
    }
    
    /**
     * Get count of indexed slugs for today
     */
    public long getIndexedCount() {
        return seoCache.getIndexedSlugCount();
    }
    
    /**
     * Check if a slug has been indexed today
     */
    public boolean isIndexed(String slug) {
        return seoCache.isSlugIndexed(slug);
    }
}
