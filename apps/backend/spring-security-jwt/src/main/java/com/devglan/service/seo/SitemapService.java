package com.devglan.service.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;

@Service
public class SitemapService {
    // Timestamp formatting handled inside SitemapWriter

    // Debounce and burst tracking
    private final Deque<Long> writeTimestamps = new ArrayDeque<>();

    // Simple in-memory cache (can be replaced by Redis later)
    private volatile String cachedIndexXml = null;
    private volatile long cachedIndexLastGen = 0;

    private final SeoCache seoCache;
    private MatchRepository matchRepository; // optional; may be null in tests

    public SitemapService(SeoCache seoCache) {
        this.seoCache = seoCache;
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

        if (shouldRegenerate(now, cachedIndexLastGen) || cachedIndexXml == null) {
            cachedIndexXml = buildIndexXml();
            cachedIndexLastGen = now;
            recordWrite(now);
            // persist to cache
            seoCache.putSitemapIndex(cachedIndexXml);
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

    private boolean shouldRegenerate(long now, long lastGen) {
        if (isBurstExceeded(now)) return false;
        return (now - lastGen) >= SeoConstants.SITEMAP_DEBOUNCE_SECONDS;
    }

    private boolean isBurstExceeded(long now) {
        // Drop timestamps older than 60s
        while (!writeTimestamps.isEmpty() && (now - writeTimestamps.peekFirst()) > 60) {
            writeTimestamps.removeFirst();
        }
        return writeTimestamps.size() >= SeoConstants.SITEMAP_MAX_WRITES_PER_MINUTE;
    }

    private void recordWrite(long now) {
        writeTimestamps.addLast(now);
    }

    private String buildIndexXml() {
        SitemapWriter writer = new SitemapWriter();
        int count = determinePartitionCount();
        java.util.ArrayList<String> partitions = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            String partName = formatPartitionName(i);
            partitions.add(SeoConstants.SITEMAP_PARTITION_PREFIX + partName + ".xml.gz");
        }
        return writer.buildIndex(partitions);
    }

    private String buildPartitionXml(int part) {
        SitemapWriter writer = new SitemapWriter();
        // Prefer real data if repository available
        if (matchRepository != null) {
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
                int urlsPerPart = Math.max(1, SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
                int start = Math.max(0, (part - 1) * urlsPerPart);
                int endExclusive = Math.min(allVisible.size(), start + urlsPerPart);
                List<Matches> slice = start < endExclusive ? allVisible.subList(start, endExclusive) : java.util.Collections.<Matches>emptyList();

                java.util.ArrayList<SitemapWriter.SitemapUrl> urls = new java.util.ArrayList<>();
                for (Matches m : slice) {
                    String path = deriveMatchPath(m);
                    String changefreq = deriveChangeFreq(m);
                    double priority = derivePriority(m);
                    String lastmod = new SitemapWriter().isoFromDate(m.getMatchDate());
                    urls.add(writer.urlWithLastMod(path, lastmod, changefreq, priority));
                }
                return writer.buildPartition(urls);
            }
        }

        // Fallback to sample URLs (keeps tests stable without DB)
        int urlsPerPart = Math.max(1, SeoConstants.SITEMAP_SAMPLE_URLS_PER_PARTITION);
        java.util.ArrayList<SitemapWriter.SitemapUrl> urls = new java.util.ArrayList<>();
        for (int i = 1; i <= urlsPerPart; i++) {
            urls.add(writer.url("/matches/sample-" + part + "-" + i, "daily", 0.8));
        }
        return writer.buildPartition(urls);
    }

    private int determinePartitionCount() {
        if (matchRepository == null) return Math.max(1, SeoConstants.SITEMAP_PARTITIONS);
        try {
            List<Matches> allVisible = safeGetVisibleMatches();
            int total = allVisible != null ? Math.min(allVisible.size(), SeoConstants.SITEMAP_MAX_URLS_TOTAL) : 0;
            int per = Math.max(1, SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
            int count = (total + per - 1) / per;
            return Math.max(1, count);
        } catch (Exception e) {
            return Math.max(1, SeoConstants.SITEMAP_PARTITIONS);
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
}
