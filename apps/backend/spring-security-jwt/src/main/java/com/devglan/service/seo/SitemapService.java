package com.devglan.service.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;

@Service
public class SitemapService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SitemapService.class);

    // Timestamp formatting handled inside SitemapWriter

    // Debounce and burst tracking
    private final Deque<Long> writeTimestamps = new ArrayDeque<>();

    // Simple in-memory cache (can be replaced by Redis later)
    private volatile String cachedIndexXml = null;
    private volatile long cachedIndexLastGen = 0;
    private volatile boolean sitemapDirty = false;
    private volatile long lastRefreshEvent = 0;
    private final Object cacheLock = new Object();

    private final SeoCache seoCache;
    private final LiveMatchesService liveMatchesService;
    private MatchRepository matchRepository; // optional; may be null in tests

    public SitemapService(SeoCache seoCache, LiveMatchesService liveMatchesService) {
        this.seoCache = seoCache;
        this.liveMatchesService = liveMatchesService;
    }

    // Setter injection keeps tests working while allowing Spring to wire repository in app
    @Autowired(required = false)
    public void setMatchRepository(MatchRepository matchRepository) {
        this.matchRepository = matchRepository;
    }

    public String getSitemapIndexXml() {
        long now = epochSeconds();
        // Try Redis/local cache first
        String fromCache = seoCache.getSitemapIndex();
        if (fromCache != null && !fromCache.isEmpty()) {
            cachedIndexXml = fromCache;
        }

        synchronized (cacheLock) {
            boolean needsRebuild = (cachedIndexXml == null) || sitemapDirty;
            if (needsRebuild && canRegenerate(now)) {
                cachedIndexXml = buildIndexXml();
                cachedIndexLastGen = now;
                sitemapDirty = false;
                recordWrite(now);
                seoCache.putSitemapIndex(cachedIndexXml);
            } else if (needsRebuild && LOGGER.isDebugEnabled()) {
                LOGGER.debug("Skipping sitemap rebuild due to debounce/burst controls (dirty={}, cachedAt={}, now={})",
                        sitemapDirty, cachedIndexLastGen, now);
            }
        }
        return cachedIndexXml;
    }

    public String getPartitionXml(int part) {
        // Partition XML is small; for demo just build every time but still respect burst cap
        long now = epochSeconds();
        if (isBurstExceeded(now)) {
            // Return previous if burst exceeded to avoid excessive writes
            return cachedIndexXml != null ? cachedIndexXml : buildIndexXml();
        }
        recordWrite(now);
        try {
            return buildPartitionXml(part);
        } catch (Exception ex) {
            // Fallback safety to ensure endpoint remains responsive
            SitemapWriter writer = new SitemapWriter();
            return writer.buildPartition(java.util.Collections.singletonList(writer.url("/health", "weekly", 0.1)));
        }
    }

    private boolean isBurstExceeded(long now) {
        cleanupOldWrites(now);
        return writeTimestamps.size() >= SeoConstants.SITEMAP_MAX_WRITES_PER_MINUTE;
    }

    private void recordWrite(long now) {
        cleanupOldWrites(now);
        writeTimestamps.addLast(now);
    }

    @EventListener
    public void handleContentChange(SeoContentChangeEvent event) {
        long now = epochSeconds();
        lastRefreshEvent = now;
        synchronized (cacheLock) {
            sitemapDirty = true;
        }
        seoCache.evictSitemapIndex();
        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("SEO content change detected ({}), reference={}, occurredAt={}.",
                    event.getChangeType(), event.getReference(), event.getOccurredAt());
        }
    }

    private String buildIndexXml() {
        SitemapWriter writer = new SitemapWriter();
        int count = determinePartitionCount();
        java.util.ArrayList<String> partitions = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            String partName = formatPartitionName(i);
            // Serve plain XML endpoints (no gzip) for simplicity/compatibility
            partitions.add(SeoConstants.SITEMAP_PARTITION_PREFIX + partName + ".xml");
        }
        return writer.buildIndex(partitions);
    }

    private String buildPartitionXml(int part) {
        SitemapWriter writer = new SitemapWriter();
        
        // Build complete URL list from all sources
        ArrayList<SitemapWriter.SitemapUrl> allUrls = new ArrayList<>();
        
        // Always add static pages to partition 1
        if (part == 1) {
            allUrls.add(writer.url("/", "hourly", 1.0));
            allUrls.add(writer.url("/matches", "hourly", 0.9));
            allUrls.add(writer.url("/blog", "daily", 0.7));
        }
        
        // Try to get live matches from the API
        List<LiveMatchesService.LiveMatchEntry> liveMatches = liveMatchesService.getLiveMatches();
        if (liveMatches != null && !liveMatches.isEmpty()) {
            for (LiveMatchesService.LiveMatchEntry match : liveMatches) {
                String slug = liveMatchesService.extractSlugFromUrl(match.getUrl());
                if (slug != null && !slug.isEmpty()) {
                    String path = "/cric-live/" + slug;
                    String changefreq = match.isLive() ? "hourly" : "daily";
                    double priority = match.isLive() ? 0.9 : 0.8;
                    allUrls.add(writer.url(path, changefreq, priority));
                }
            }
        }
        
        // Fallback: try database if repository available and no live matches
        if ((liveMatches == null || liveMatches.isEmpty()) && matchRepository != null) {
            List<Matches> allVisible = safeGetVisibleMatches();
            if (allVisible != null && !allVisible.isEmpty()) {
                // Sort by most recent first (null-safe)
                Collections.sort(allVisible, new Comparator<Matches>() {
                    @Override
                    public int compare(Matches a, Matches b) {
                        if (a.getMatchDate() == null && b.getMatchDate() == null) return 0;
                        if (a.getMatchDate() == null) return 1;
                        if (b.getMatchDate() == null) return -1;
                        return b.getMatchDate().compareTo(a.getMatchDate());
                    }
                });
                
                for (Matches m : allVisible) {
                    String path = deriveMatchPath(m);
                    String changefreq = deriveChangeFreq(m);
                    double priority = derivePriority(m);
                    String lastmod = writer.isoFromDate(m.getMatchDate());
                    allUrls.add(writer.urlWithLastMod(path, lastmod, changefreq, priority));
                }
            }
        }
        
        // Apply partition slicing
        int urlsPerPart = Math.max(1, SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
        int start = Math.max(0, (part - 1) * urlsPerPart);
        int endExclusive = Math.min(allUrls.size(), start + urlsPerPart);
        
        // Return slice for this partition
        if (start < endExclusive) {
            List<SitemapWriter.SitemapUrl> slice = allUrls.subList(start, endExclusive);
            return writer.buildPartition(slice);
        }
        
        // If partition number exceeds available URLs, return empty valid sitemap
        return writer.buildPartition(new ArrayList<SitemapWriter.SitemapUrl>());
    }

    private int determinePartitionCount() {
        try {
            int total = 3; // home, matches, blog (static pages)
            
            // Count live matches from API
            List<LiveMatchesService.LiveMatchEntry> liveMatches = liveMatchesService.getLiveMatches();
            if (liveMatches != null && !liveMatches.isEmpty()) {
                total += liveMatches.size();
            } else if (matchRepository != null) {
                // Fallback: count database matches if no live matches
                List<Matches> allVisible = safeGetVisibleMatches();
                if (allVisible != null) {
                    total += allVisible.size();
                }
            }
            
            // Cap total to avoid excessive memory/processing
            if (total > SeoConstants.SITEMAP_MAX_URLS_TOTAL) {
                total = SeoConstants.SITEMAP_MAX_URLS_TOTAL;
            }
            
            // Calculate partitions needed based on max URLs per partition
            int per = Math.max(1, SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
            int count = (total + per - 1) / per; // Ceiling division
            return Math.max(1, count);
        } catch (Exception e) {
            LOGGER.error("Error determining partition count", e);
            return 1; // Safe default
        }
    }

    private List<Matches> safeGetVisibleMatches() {
        try {
            return matchRepository.findByVisibilityTrue();
        } catch (Exception e) {
            return java.util.Collections.emptyList();
        }
    }

    private String deriveMatchPath(Matches m) {
        // Prefer slug from external link; fallback to matchId
        String link = m.getMatchLink();
        if (link != null) {
            String slug = extractSlugFromUrl(link);
            if (slug != null && !slug.isEmpty()) {
                return "/cric-live/" + slug;
            }
        }
        Long id = m.getMatchId();
        return "/cric-live/" + (id != null ? String.valueOf(id) : "match");
    }

    private String extractSlugFromUrl(String url) {
        try {
            if (url == null || !url.contains("/")) return null;
            String[] parts = url.split("/");
            if (parts.length < 2) return null;
            String last = parts[parts.length - 1];
            String prev = parts[parts.length - 2];
            if (last != null && prev != null) {
                String lastLower = last.toLowerCase();
                if ("live".equals(lastLower) || "scorecard".equals(lastLower)) {
                    return prev;
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private String deriveChangeFreq(Matches m) {
        String status = m.getMatchStatus();
        if (status == null) return "daily";
        String s = status.toLowerCase();
        if (s.contains("live")) return "hourly";
        if (s.contains("upcoming") || s.contains("scheduled")) return "daily";
        return "weekly";
    }

    private double derivePriority(Matches m) {
        String status = m.getMatchStatus();
        if (status == null) return 0.6;
        String s = status.toLowerCase();
        if (s.contains("live")) return 0.9;
        if (s.contains("upcoming") || s.contains("scheduled")) return 0.8;
        return 0.5;
    }

    private String formatPartitionName(int part) {
        return String.format("%0" + SeoConstants.SITEMAP_PARTITION_PAD + "d", part);
    }

    private long epochSeconds() {
        return OffsetDateTime.now().toEpochSecond();
    }

    // kept for future hooks; currently using SitemapWriter for timestamps

    private void cleanupOldWrites(long now) {
        while (!writeTimestamps.isEmpty() && (now - writeTimestamps.peekFirst()) > 60) {
            writeTimestamps.removeFirst();
        }
    }

    private boolean canRegenerate(long now) {
        if (cachedIndexXml == null) {
            return !isBurstExceeded(now);
        }
        long secondsSinceLastGen = now - cachedIndexLastGen;
        if (secondsSinceLastGen < SeoConstants.SITEMAP_DEBOUNCE_SECONDS) {
            return false;
        }
        return !isBurstExceeded(now);
    }

}
