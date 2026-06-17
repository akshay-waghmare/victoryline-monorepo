package com.devglan.service.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.CrexMatchUrlHelper;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SitemapService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SitemapService.class);
    private static final String[] STATIC_SITEMAP_PATHS = new String[] {
            "/",
            "/matches",
            "/live-cricket-score",
            "/live-score",
            "/live-score/today",
            "/live-score/ipl",
            "/cricket-schedule/today",
            "/cricket-schedule/ipl-2026",
            "/live-score/archive"
    };

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
            for (String staticPath : STATIC_SITEMAP_PATHS) {
                allUrls.add(writer.url(staticPath, deriveStaticChangeFreq(staticPath), deriveStaticPriority(staticPath)));
            }
        }
        
        // Try to get live matches from the API
        List<LiveMatchesService.LiveMatchEntry> liveMatches = liveMatchesService.getLiveMatches();
        if (liveMatches != null && !liveMatches.isEmpty()) {
            List<LiveMatchesService.LiveMatchEntry> prioritizedMatches = new ArrayList<>(liveMatches);
            prioritizedMatches.sort(Comparator.comparingLong(this::sitemapPrioritySortValue));
            for (LiveMatchesService.LiveMatchEntry match : prioritizedMatches) {
                String path = deriveCanonicalMatchPath(match);
                if (path != null) {
                    String changefreq = match.isLive() ? "hourly" : "daily";
                    double priority = match.isLive() ? 0.9 : 0.8;
                    allUrls.add(writer.urlWithLastMod(path, deriveLiveMatchLastMod(match, writer), changefreq, priority));
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
                    if (path == null) {
                        continue;
                    }
                    String changefreq = deriveChangeFreq(m);
                    double priority = derivePriority(m);
                    String lastmod = writer.isoFromDate(m.getMatchDate());
                    allUrls.add(writer.urlWithLastMod(path, lastmod, changefreq, priority));
                }
            }
        }

        allUrls = deduplicateUrls(allUrls);
        
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
            int total = STATIC_SITEMAP_PATHS.length;
            
            // Count live matches from API
            List<LiveMatchesService.LiveMatchEntry> liveMatches = liveMatchesService.getLiveMatches();
            if (liveMatches != null && !liveMatches.isEmpty()) {
                total += countDistinctCanonicalLiveMatches(liveMatches);
            } else if (matchRepository != null) {
                // Fallback: count database matches if no live matches
                List<Matches> allVisible = safeGetVisibleMatches();
                if (allVisible != null) {
                    total += countDistinctCanonicalRepositoryMatches(allVisible);
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
            if (isCanonicalMatchSlug(slug)) {
                return "/cric-live/" + slug;
            }
        }

        return null;
    }

    private String deriveCanonicalMatchPath(LiveMatchesService.LiveMatchEntry match) {
        if (match == null) {
            return null;
        }

        if (isCompletedWithoutIndexableResult(match)) {
            return null;
        }

        String slug = liveMatchesService.extractSlugFromUrl(match.getUrl());
        if (!isCanonicalMatchSlug(slug)) {
            slug = match.getExternalMatchKey();
        }

        return isCanonicalMatchSlug(slug) ? "/cric-live/" + slug : null;
    }

    private String deriveLiveMatchLastMod(LiveMatchesService.LiveMatchEntry match, SitemapWriter writer) {
        if (match == null) {
            return writer.isoFromEpochMillis(null);
        }

        if (match.getLastStateUpdatedAt() != null && match.getLastStateUpdatedAt() > 0) {
            return writer.isoFromEpochMillis(match.getLastStateUpdatedAt());
        }

        if (match.getScheduledStartTime() != null && match.getScheduledStartTime() > 0) {
            return writer.isoFromEpochMillis(match.getScheduledStartTime());
        }

        String parsedStartDate = parseLiveMatchStartDate(match.getStartDate());
        if (parsedStartDate != null) {
            return parsedStartDate;
        }

        return writer.isoFromEpochMillis(null);
    }

    private String parseLiveMatchStartDate(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        String raw = value.trim();
        try {
            return OffsetDateTime.parse(raw).toInstant().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            // fall through
        }

        try {
            return LocalDateTime.parse(raw).toInstant(ZoneOffset.UTC).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            // fall through
        }

        try {
            return LocalDate.parse(raw).atStartOfDay().toInstant(ZoneOffset.UTC).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private boolean isCompletedWithoutIndexableResult(LiveMatchesService.LiveMatchEntry match) {
        String status = normalize(match.getStatus());
        boolean completed = match.isFinished()
                || status.contains("completed")
                || status.contains("finished");
        if (!completed) {
            return false;
        }

        String signals = normalize(match.getResultSummary()) + " " + normalize(match.getLastKnownState());
        if (signals.trim().isEmpty() || "null null".equals(signals.trim())) {
            return true;
        }

        return !hasResultSignal(signals);
    }

    private long sitemapPrioritySortValue(LiveMatchesService.LiveMatchEntry match) {
        String status = normalize(match == null ? null : match.getStatus());
        long scheduledStart = match == null || match.getScheduledStartTime() == null
                ? Long.MAX_VALUE / 8
                : match.getScheduledStartTime();
        long updatedAt = match == null || match.getLastStateUpdatedAt() == null
                ? 0
                : match.getLastStateUpdatedAt();

        if (status.contains("live") || status.contains("innings_break") || status.contains("rain_delay")) {
            return scheduledStart;
        }
        if (status.contains("upcoming") || status.contains("scheduled")) {
            return Long.MAX_VALUE / 4 + scheduledStart;
        }

        // Newer completed matches remain ahead of older archive pages.
        return Long.MAX_VALUE / 2 - Math.min(updatedAt, Long.MAX_VALUE / 8);
    }

    private boolean hasResultSignal(String value) {
        return value.matches(".*\\bwon\\b.*")
                || value.matches(".*\\bdrawn?\\b.*")
                || value.matches(".*\\btied?\\b.*")
                || value.matches(".*\\babandoned\\b.*")
                || value.matches(".*\\bno\\s+result\\b.*")
                || value.matches(".*\\b\\d+[/\\-]\\d+\\b.*");
    }

    private String normalize(String value) {
        if (value == null || "null".equalsIgnoreCase(value.trim())) {
            return "";
        }

        return value.trim().toLowerCase();
    }

    private boolean isCanonicalMatchSlug(String slug) {
        if (slug == null) {
            return false;
        }

        String clean = slug.trim();
        if (clean.isEmpty() || clean.matches("\\d+") || "match".equalsIgnoreCase(clean)) {
            return false;
        }

        return clean.toLowerCase().contains("-vs-");
    }

    private ArrayList<SitemapWriter.SitemapUrl> deduplicateUrls(List<SitemapWriter.SitemapUrl> urls) {
        Map<String, SitemapWriter.SitemapUrl> uniqueByLocation = new LinkedHashMap<>();
        for (SitemapWriter.SitemapUrl url : urls) {
            if (url != null && url.loc != null) {
                uniqueByLocation.putIfAbsent(url.loc, url);
            }
        }
        return new ArrayList<>(uniqueByLocation.values());
    }

    private int countDistinctCanonicalLiveMatches(List<LiveMatchesService.LiveMatchEntry> matches) {
        Set<String> paths = new LinkedHashSet<>();
        for (LiveMatchesService.LiveMatchEntry match : matches) {
            String path = deriveCanonicalMatchPath(match);
            if (path != null) {
                paths.add(path);
            }
        }
        return paths.size();
    }

    private int countDistinctCanonicalRepositoryMatches(List<Matches> matches) {
        Set<String> paths = new LinkedHashSet<>();
        for (Matches match : matches) {
            String path = deriveMatchPath(match);
            if (path != null) {
                paths.add(path);
            }
        }
        return paths.size();
    }

    private String extractSlugFromUrl(String url) {
        return CrexMatchUrlHelper.extractMatchKey(url);
    }

    private String deriveChangeFreq(Matches m) {
        String status = m.getMatchStatus();
        if (status == null) return "daily";
        String s = status.toLowerCase();
        if (s.contains("live")) return "hourly";
        if (s.contains("upcoming") || s.contains("scheduled")) return "daily";
        return "weekly";
    }

    private String deriveStaticChangeFreq(String path) {
        if ("/".equals(path) || "/matches".equals(path) || "/live-cricket-score".equals(path) || "/live-score".equals(path) || "/live-score/today".equals(path)) {
            return "hourly";
        }
        return "daily";
    }

    private double deriveStaticPriority(String path) {
        if ("/".equals(path)) {
            return 1.0;
        }
        if ("/matches".equals(path) || "/live-cricket-score".equals(path) || "/live-score".equals(path) || "/live-score/today".equals(path)) {
            return 0.9;
        }
        if ("/live-score/ipl".equals(path) || "/cricket-schedule/today".equals(path)) {
            return 0.85;
        }
        return 0.8;
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
