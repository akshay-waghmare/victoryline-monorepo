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
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Publishes sitemap XML from one immutable manifest.
 *
 * A crawler can fetch the index and child partitions concurrently.  They must
 * therefore all come from the same completed generation, never from independent
 * request-time rebuilds.  A failed refresh deliberately keeps the last good
 * manifest in service instead of publishing an empty 200 response.
 */
@Service
public class SitemapService {
    private static final Logger LOGGER = LoggerFactory.getLogger(SitemapService.class);
    private static final String[] STATIC_SITEMAP_PATHS = new String[] {
            "/",
            "/matches",
            "/series",
            "/live-cricket-score",
            "/live-score",
            "/live-score/today",
            "/live-score/ipl",
            "/cricket-schedule/today",
            "/cricket-schedule/ipl-2026",
            "/live-score/archive"
    };

    private final Object generationLock = new Object();
    private final AtomicReference<SitemapManifest> currentManifest = new AtomicReference<>();
    private final AtomicLong generationFailures = new AtomicLong(0L);
    private final AtomicLong generationSequence = new AtomicLong(0L);

    private final SeoCache seoCache;
    private final LiveMatchesService liveMatchesService;
    private MatchRepository matchRepository; // optional in isolated tests

    private volatile boolean sitemapDirty = true;
    private volatile long lastSuccessfulGenerationEpochMs = 0L;
    private volatile long lastGenerationDurationMs = 0L;

    @Autowired
    public SitemapService(SeoCache seoCache, LiveMatchesService liveMatchesService, MatchFreshnessSummaryService ignoredFreshnessSummaryService) {
        this(seoCache, liveMatchesService);
    }

    public SitemapService(SeoCache seoCache, LiveMatchesService liveMatchesService) {
        this.seoCache = seoCache;
        this.liveMatchesService = liveMatchesService;
    }

    @Autowired(required = false)
    public void setMatchRepository(MatchRepository matchRepository) {
        this.matchRepository = matchRepository;
    }

    public String getSitemapIndexXml() {
        SitemapManifest manifest = getOrRefreshManifest();
        return manifest == null ? null : manifest.indexXml;
    }

    /**
     * Returns null when the requested child is not part of the published
     * manifest, or when no valid manifest has ever been generated.
     */
    public String getPartitionXml(int part) {
        SitemapManifest manifest = getOrRefreshManifest();
        return manifest == null ? null : manifest.partitionXmlByNumber.get(part);
    }

    public boolean hasPublishedManifest() {
        return currentManifest.get() != null;
    }

    public Map<String, Object> getManifestMetrics() {
        SitemapManifest manifest = currentManifest.get();
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("available", manifest != null);
        metrics.put("generationId", manifest == null ? 0L : manifest.generationId);
        metrics.put("urlCount", manifest == null ? 0 : manifest.urlCount);
        metrics.put("shardCount", manifest == null ? 0 : manifest.partitionXmlByNumber.size());
        metrics.put("lastSuccessfulGenerationEpochMs", lastSuccessfulGenerationEpochMs);
        metrics.put("lastGenerationDurationMs", lastGenerationDurationMs);
        metrics.put("generationFailures", generationFailures.get());
        metrics.put("refreshPending", sitemapDirty);
        return metrics;
    }

    @EventListener
    public void handleContentChange(SeoContentChangeEvent event) {
        sitemapDirty = true;
        // The old Redis index could describe a different set of partitions.
        // It is intentionally not read by manifest-serving requests.
        seoCache.evictSitemapIndex();
        LOGGER.info("Sitemap manifest marked dirty: changeType={}, reference={}",
                event.getChangeType(), event.getReference());
    }

    private SitemapManifest getOrRefreshManifest() {
        SitemapManifest existing = currentManifest.get();
        if (existing != null && !sitemapDirty) {
            return existing;
        }

        synchronized (generationLock) {
            existing = currentManifest.get();
            if (existing != null && !sitemapDirty) {
                return existing;
            }

            long startedAt = System.currentTimeMillis();
            try {
                SitemapManifest next = buildManifest(generationSequence.incrementAndGet(), startedAt);
                currentManifest.set(next); // Atomic publication after complete validation.
                sitemapDirty = false;
                lastSuccessfulGenerationEpochMs = System.currentTimeMillis();
                lastGenerationDurationMs = lastSuccessfulGenerationEpochMs - startedAt;
                LOGGER.info("Sitemap manifest published: generationId={}, urls={}, shards={}, durationMs={}",
                        next.generationId, next.urlCount, next.partitionXmlByNumber.size(), lastGenerationDurationMs);
                return next;
            } catch (Exception ex) {
                generationFailures.incrementAndGet();
                lastGenerationDurationMs = System.currentTimeMillis() - startedAt;
                SitemapManifest lastKnownGood = currentManifest.get();
                if (lastKnownGood != null) {
                    // Do not make every crawler request retry the same failed
                    // generation. The next content-change event schedules the
                    // next attempt; callers continue to receive one fast,
                    // internally consistent last-known-good manifest.
                    sitemapDirty = false;
                    LOGGER.error("Sitemap manifest regeneration failed after {} ms; preserving generationId={} with {} URLs and {} shards",
                            lastGenerationDurationMs, lastKnownGood.generationId, lastKnownGood.urlCount,
                            lastKnownGood.partitionXmlByNumber.size(), ex);
                    return lastKnownGood;
                }
                LOGGER.error("Initial sitemap manifest generation failed after {} ms; no manifest will be published",
                        lastGenerationDurationMs, ex);
                return null;
            }
        }
    }

    private SitemapManifest buildManifest(long generationId, long startedAt) {
        SitemapWriter writer = new SitemapWriter();
        List<SitemapWriter.SitemapUrl> allUrls = new ArrayList<>();

        for (String staticPath : STATIC_SITEMAP_PATHS) {
            allUrls.add(writer.url(staticPath, deriveStaticChangeFreq(staticPath), deriveStaticPriority(staticPath)));
        }

        List<LiveMatchesService.LiveMatchEntry> liveMatches = loadSitemapMatches();
        // The human-readable CREX slug can change while the source match key
        // stays fixed.  A sitemap must publish the same one-owner identity rule
        // as SSR, never both aliases.
        List<LiveMatchesService.LiveMatchEntry> prioritizedMatches = canonicalizeMatchIdentities(liveMatches);
        Collections.sort(prioritizedMatches, Comparator.comparingLong(this::sitemapPrioritySortValue));
        for (LiveMatchesService.LiveMatchEntry match : prioritizedMatches) {
            String canonicalPath = deriveCanonicalMatchPath(match);
            if (canonicalPath == null) {
                continue;
            }
            String changefreq = match.isLive() ? "hourly" : "daily";
            double priority = match.isLive() ? 0.9 : 0.8;
            allUrls.add(writer.urlWithLastMod(canonicalPath, deriveLiveMatchLastMod(match, writer), changefreq, priority));
        }

        allUrls = deduplicateUrls(allUrls);
        if (allUrls.isEmpty()) {
            throw new IllegalStateException("Refusing to publish an empty sitemap manifest");
        }

        int urlsPerPartition = Math.max(1, SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
        Map<Integer, String> partitionXmlByNumber = new LinkedHashMap<>();
        List<String> partitionPaths = new ArrayList<>();
        for (int start = 0, part = 1; start < allUrls.size(); start += urlsPerPartition, part++) {
            int endExclusive = Math.min(allUrls.size(), start + urlsPerPartition);
            List<SitemapWriter.SitemapUrl> partitionUrls = new ArrayList<>(allUrls.subList(start, endExclusive));
            if (partitionUrls.isEmpty()) {
                throw new IllegalStateException("Refusing to publish an empty sitemap partition");
            }
            partitionXmlByNumber.put(part, writer.buildPartition(partitionUrls));
            partitionPaths.add(SeoConstants.SITEMAP_PARTITION_PREFIX + formatPartitionName(part) + ".xml");
        }

        if (partitionXmlByNumber.isEmpty()) {
            throw new IllegalStateException("Refusing to publish a sitemap index without child partitions");
        }

        return new SitemapManifest(generationId, startedAt, writer.buildIndex(partitionPaths),
                Collections.unmodifiableMap(partitionXmlByNumber), allUrls.size());
    }

    private List<LiveMatchesService.LiveMatchEntry> loadSitemapMatches() {
        try {
            List<LiveMatchesService.LiveMatchEntry> matches = liveMatchesService.getSitemapMatches();
            if (matches == null || matches.isEmpty()) {
                throw new IllegalStateException("Sitemap match source returned no records");
            }
            return matches;
        } catch (Exception liveSourceFailure) {
            List<LiveMatchesService.LiveMatchEntry> repositoryMatches = loadRepositoryMatches();
            if (!repositoryMatches.isEmpty()) {
                LOGGER.warn("Sitemap live source failed; using repository fallback with {} records", repositoryMatches.size(), liveSourceFailure);
                return repositoryMatches;
            }
            throw new IllegalStateException("Sitemap match source unavailable and repository fallback is empty", liveSourceFailure);
        }
    }

    private List<LiveMatchesService.LiveMatchEntry> loadRepositoryMatches() {
        if (matchRepository == null) {
            return Collections.emptyList();
        }
        List<Matches> visibleMatches = safeGetVisibleMatches();
        if (visibleMatches.isEmpty()) {
            return Collections.emptyList();
        }

        List<LiveMatchesService.LiveMatchEntry> converted = new ArrayList<>();
        for (Matches match : visibleMatches) {
            String path = deriveMatchPath(match);
            if (path == null) {
                continue;
            }
            LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
            entry.setUrl(SeoConstants.CANONICAL_HOST + path);
            entry.setExternalMatchKey(path.replaceFirst("^/cric-live/", ""));
            entry.setStatus(match.getMatchStatus());
            entry.setResultSummary(match.getResult());
            entry.setLastKnownState(match.getResult());
            entry.setLastStateUpdatedAt(match.getMatchDate() == null ? null : match.getMatchDate().getTime());
            converted.add(entry);
        }
        return converted;
    }

    private List<Matches> safeGetVisibleMatches() {
        try {
            List<Matches> matches = matchRepository.findByVisibilityTrue();
            return matches == null ? Collections.<Matches>emptyList() : matches;
        } catch (Exception ex) {
            LOGGER.warn("Sitemap repository fallback failed", ex);
            return Collections.emptyList();
        }
    }

    private String deriveMatchPath(Matches match) {
        if (match == null || match.getMatchLink() == null) {
            return null;
        }
        String slug = extractSlugFromUrl(match.getMatchLink());
        return isCanonicalMatchSlug(slug) ? "/cric-live/" + slug : null;
    }

    private String deriveCanonicalMatchPath(LiveMatchesService.LiveMatchEntry match) {
        if (match == null || isCompletedWithoutIndexableResult(match)) {
            return null;
        }

        String slug = liveMatchesService.extractSlugFromUrl(match.getUrl());
        if (!isCanonicalMatchSlug(slug)) {
            slug = match.getExternalMatchKey();
        }
        return isCanonicalMatchSlug(slug) ? "/cric-live/" + slug : null;
    }

    private List<LiveMatchesService.LiveMatchEntry> canonicalizeMatchIdentities(List<LiveMatchesService.LiveMatchEntry> matches) {
        Map<String, LiveMatchesService.LiveMatchEntry> ownerByIdentity = new LinkedHashMap<>();
        for (LiveMatchesService.LiveMatchEntry candidate : matches) {
            if (candidate == null) continue;
            String identity = CrexMatchUrlHelper.extractCrexApiKey(candidate.getUrl());
            if (identity == null) {
                identity = "slug:" + String.valueOf(liveMatchesService.extractSlugFromUrl(candidate.getUrl()));
            }
            LiveMatchesService.LiveMatchEntry current = ownerByIdentity.get(identity);
            if (current == null || prefersCanonicalOwner(candidate, current)) {
                ownerByIdentity.put(identity, candidate);
            }
        }
        return new ArrayList<>(ownerByIdentity.values());
    }

    private boolean prefersCanonicalOwner(LiveMatchesService.LiveMatchEntry candidate, LiveMatchesService.LiveMatchEntry current) {
        if (candidate.isFinished() != current.isFinished()) return !candidate.isFinished();
        long candidateUpdated = candidate.getLastStateUpdatedAt() == null ? Long.MIN_VALUE : candidate.getLastStateUpdatedAt();
        long currentUpdated = current.getLastStateUpdatedAt() == null ? Long.MIN_VALUE : current.getLastStateUpdatedAt();
        if (candidateUpdated != currentUpdated) return candidateUpdated > currentUpdated;
        return String.valueOf(candidate.getUrl()).compareTo(String.valueOf(current.getUrl())) < 0;
    }

    private String deriveLiveMatchLastMod(LiveMatchesService.LiveMatchEntry match, SitemapWriter writer) {
        if (match == null) {
            return writer.isoFromEpochMillis(null);
        }
        if (match.getLastStateUpdatedAt() != null && match.getLastStateUpdatedAt() > 0) {
            return writer.isoFromEpochMillis(match.getLastStateUpdatedAt());
        }

        long now = System.currentTimeMillis();
        if (match.getScheduledStartTime() != null && match.getScheduledStartTime() > 0) {
            if (match.getScheduledStartTime() > now) {
                return writer.isoFromEpochMillis(now);
            }
            return writer.isoFromEpochMillis(match.getScheduledStartTime());
        }

        String parsedStartDate = parseLiveMatchStartDate(match.getStartDate());
        if (parsedStartDate != null) {
            try {
                OffsetDateTime parsed = OffsetDateTime.parse(parsedStartDate);
                if (parsed.toInstant().toEpochMilli() > now) {
                    return writer.isoFromEpochMillis(now);
                }
            } catch (Exception ignored) {
                // Preserve the parsed timestamp when its future status is unknown.
            }
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
            // Try the alternate forms below.
        }
        try {
            return LocalDateTime.parse(raw).toInstant(ZoneOffset.UTC).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            // Try date-only format below.
        }
        try {
            return LocalDate.parse(raw).atStartOfDay().toInstant(ZoneOffset.UTC).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private boolean isCompletedWithoutIndexableResult(LiveMatchesService.LiveMatchEntry match) {
        String status = normalize(match.getStatus());
        boolean completed = match.isFinished() || status.contains("completed") || status.contains("finished");
        if (!completed) {
            return false;
        }

        String signals = normalize(match.getResultSummary()) + " " + normalize(match.getLastKnownState());
        if (signals.trim().isEmpty() || "null null".equals(signals.trim())) {
            return true;
        }
        return !hasResultSignal(signals);
    }

    private boolean hasResultSignal(String value) {
        return value.matches(".*\\bwon\\b.*")
                || value.matches(".*\\bdrawn?\\b.*")
                || value.matches(".*\\btied?\\b.*")
                || value.matches(".*\\babandoned\\b.*")
                || value.matches(".*\\bno\\s+result\\b.*")
                || value.matches(".*\\b\\d+[/\\-]\\d+\\b.*");
    }

    private long sitemapPrioritySortValue(LiveMatchesService.LiveMatchEntry match) {
        String status = normalize(match == null ? null : match.getStatus());
        long scheduledStart = match == null || match.getScheduledStartTime() == null
                ? Long.MAX_VALUE / 8 : match.getScheduledStartTime();
        long updatedAt = match == null || match.getLastStateUpdatedAt() == null
                ? 0 : match.getLastStateUpdatedAt();
        if (status.contains("live") || status.contains("innings_break") || status.contains("rain_delay")) {
            return scheduledStart;
        }
        if (status.contains("upcoming") || status.contains("scheduled")) {
            return Long.MAX_VALUE / 4 + scheduledStart;
        }
        return Long.MAX_VALUE / 2 - Math.min(updatedAt, Long.MAX_VALUE / 8);
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

    private String extractSlugFromUrl(String url) {
        return CrexMatchUrlHelper.extractMatchKey(url);
    }

    private String deriveStaticChangeFreq(String path) {
        if ("/".equals(path) || "/matches".equals(path) || "/live-cricket-score".equals(path)
                || "/live-score".equals(path) || "/live-score/today".equals(path)) {
            return "hourly";
        }
        return "daily";
    }

    private double deriveStaticPriority(String path) {
        if ("/".equals(path)) {
            return 1.0;
        }
        if ("/matches".equals(path) || "/live-cricket-score".equals(path) || "/live-score".equals(path)
                || "/live-score/today".equals(path)) {
            return 0.9;
        }
        if ("/live-score/ipl".equals(path) || "/cricket-schedule/today".equals(path)) {
            return 0.85;
        }
        return 0.8;
    }

    private String formatPartitionName(int part) {
        return String.format("%0" + SeoConstants.SITEMAP_PARTITION_PAD + "d", part);
    }

    private boolean isCanonicalMatchSlug(String slug) {
        if (slug == null) {
            return false;
        }
        String clean = slug.trim();
        return !clean.isEmpty() && !clean.matches("\\d+") && !"match".equalsIgnoreCase(clean)
                && clean.toLowerCase().contains("-vs-");
    }

    private String normalize(String value) {
        if (value == null || "null".equalsIgnoreCase(value.trim())) {
            return "";
        }
        return value.trim().toLowerCase();
    }

    private static final class SitemapManifest {
        private final long generationId;
        private final long generatedAtEpochMs;
        private final String indexXml;
        private final Map<Integer, String> partitionXmlByNumber;
        private final int urlCount;

        private SitemapManifest(long generationId, long generatedAtEpochMs, String indexXml,
                                Map<Integer, String> partitionXmlByNumber, int urlCount) {
            this.generationId = generationId;
            this.generatedAtEpochMs = generatedAtEpochMs;
            this.indexXml = indexXml;
            this.partitionXmlByNumber = partitionXmlByNumber;
            this.urlCount = urlCount;
        }
    }
}
