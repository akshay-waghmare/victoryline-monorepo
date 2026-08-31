package com.devglan.service.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.CrexMatchUrlHelper;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${seo.priority-match-count:5}")
    private int priorityMatchCount = 5;

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

    public String getPartitionXml(String name) {
        SitemapManifest manifest = getOrRefreshManifest();
        return manifest == null ? null : manifest.partitionXmlByName.get(name);
    }

    public List<String> getPriorityMatchUrls() {
        SitemapManifest manifest = getOrRefreshManifest();
        return manifest == null ? Collections.emptyList() : manifest.priorityMatchUrls;
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
        Map<String, List<SitemapWriter.SitemapUrl>> cohortUrls = new LinkedHashMap<>();
        cohortUrls.put("sitemap-priority", new ArrayList<>());
        cohortUrls.put("sitemap-static", new ArrayList<>());
        cohortUrls.put("sitemap-live", new ArrayList<>());
        cohortUrls.put("sitemap-upcoming", new ArrayList<>());
        cohortUrls.put("sitemap-recent", new ArrayList<>());
        cohortUrls.put("sitemap-archive", new ArrayList<>());

        for (String staticPath : STATIC_SITEMAP_PATHS) {
            SitemapWriter.SitemapUrl url = writer.url(staticPath, deriveStaticChangeFreq(staticPath), deriveStaticPriority(staticPath));
            allUrls.add(url);
            cohortUrls.get("sitemap-static").add(url);
        }

        List<LiveMatchesService.LiveMatchEntry> liveMatches = loadSitemapMatches();
        // The human-readable CREX slug can change while the source match key
        // stays fixed.  A sitemap must publish the same one-owner identity rule
        // as SSR, never both aliases.
        List<LiveMatchesService.LiveMatchEntry> prioritizedMatches = canonicalizeMatchIdentities(liveMatches);
        Collections.sort(prioritizedMatches, Comparator.comparingLong(this::sitemapPrioritySortValue));
        List<LiveMatchesService.LiveMatchEntry> priorityMatches = selectPriorityMatches(prioritizedMatches);
        List<String> priorityMatchUrls = new ArrayList<>();
        for (LiveMatchesService.LiveMatchEntry match : priorityMatches) {
            String canonicalPath = deriveCanonicalMatchPath(match);
            if (canonicalPath == null) continue;
            SitemapWriter.SitemapUrl url = writer.urlWithLastMod(
                    canonicalPath, deriveLiveMatchLastMod(match, writer), "hourly", 0.95);
            cohortUrls.get("sitemap-priority").add(url);
            priorityMatchUrls.add(url.loc);
        }
        for (LiveMatchesService.LiveMatchEntry match : prioritizedMatches) {
            String canonicalPath = deriveCanonicalMatchPath(match);
            if (canonicalPath == null) {
                continue;
            }
            String cohort = sitemapCohort(match);
            String changefreq = "sitemap-live".equals(cohort) ? "hourly" : "daily";
            double priority = "sitemap-live".equals(cohort) ? 0.9 : "sitemap-upcoming".equals(cohort) ? 0.85 : 0.8;
            SitemapWriter.SitemapUrl url = writer.urlWithLastMod(canonicalPath, deriveLiveMatchLastMod(match, writer), changefreq, priority);
            allUrls.add(url);
            cohortUrls.get(cohort).add(url);
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

        // Named cohorts make crawl cadence auditable without removing the old
        // numbered shards that may still be cached by search engines.
        Map<String, String> partitionXmlByName = new LinkedHashMap<>();
        List<String> cohortPaths = new ArrayList<>();
        for (Map.Entry<String, List<SitemapWriter.SitemapUrl>> cohort : cohortUrls.entrySet()) {
            List<SitemapWriter.SitemapUrl> urls = deduplicateUrls(cohort.getValue());
            if (urls.isEmpty()) continue;
            for (int start = 0, part = 1; start < urls.size(); start += urlsPerPartition, part++) {
                int endExclusive = Math.min(urls.size(), start + urlsPerPartition);
                String name = cohort.getKey() + "-" + formatPartitionName(part);
                partitionXmlByName.put(name, writer.buildPartition(new ArrayList<>(urls.subList(start, endExclusive))));
                cohortPaths.add("/sitemaps/" + name + ".xml");
            }
        }

        if (partitionXmlByNumber.isEmpty()) {
            throw new IllegalStateException("Refusing to publish a sitemap index without child partitions");
        }

        return new SitemapManifest(generationId, startedAt, writer.buildIndex(cohortPaths),
                Collections.unmodifiableMap(partitionXmlByNumber), Collections.unmodifiableMap(partitionXmlByName),
                Collections.unmodifiableList(priorityMatchUrls), allUrls.size());
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
        if (match == null || !hasCanonicalMatchData(match) || isCompletedWithoutIndexableResult(match)
                || isUpcomingWithoutFutureSchedule(match)) {
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
        // This timestamp advances only when score, lifecycle, result, or
        // public match identity changes. Do not claim sitemap freshness for a
        // poll that merely refreshed an upstream heartbeat.
        if (match.getSeoContentModifiedAt() != null && match.getSeoContentModifiedAt() > 0) {
            return writer.isoFromEpochMillis(match.getSeoContentModifiedAt());
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

    private String sitemapCohort(LiveMatchesService.LiveMatchEntry match) {
        String resolved = String.valueOf(match.getLifecycleCohort()).trim().toLowerCase();
        if ("live".equals(resolved) || "upcoming".equals(resolved)
                || "recent".equals(resolved) || "archive".equals(resolved)) {
            return "sitemap-" + resolved;
        }
        if (match.isLive()) return "sitemap-live";
        String status = String.valueOf(match.getStatus()).trim().toUpperCase();
        if ("UPCOMING".equals(status)) return "sitemap-upcoming";
        Long meaningfulChange = match.getSeoContentModifiedAt() != null
                ? match.getSeoContentModifiedAt() : match.getLastStateUpdatedAt();
        if (meaningfulChange != null && meaningfulChange > 0L
                && System.currentTimeMillis() - meaningfulChange <= 30L * 24L * 60L * 60L * 1000L) {
            return "sitemap-recent";
        }
        return "sitemap-archive";
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

    private boolean hasCanonicalMatchData(LiveMatchesService.LiveMatchEntry match) {
        Long scheduledStartTime = match == null ? null : match.getScheduledStartTime();
        if (scheduledStartTime != null && scheduledStartTime <= 0L) {
            scheduledStartTime = null;
        }
        return match != null && CrexMatchUrlHelper.hasCanonicalMatchData(
                null, null, null, null, scheduledStartTime, match.getResultSummary(),
                match.getLastKnownState(), parseLiveMatchStartDate(match.getStartDate()));
    }

    private boolean isUpcomingWithoutFutureSchedule(LiveMatchesService.LiveMatchEntry match) {
        if (match == null) {
            return false;
        }
        String status = normalize(match.getStatus());
        String cohort = normalize(match.getLifecycleCohort());
        if (!"upcoming".equals(status) && !"upcoming".equals(cohort)) {
            return false;
        }

        if (match.getScheduledStartTime() != null && match.getScheduledStartTime() > System.currentTimeMillis()) {
            return false;
        }

        String parsedStartDate = parseLiveMatchStartDate(match.getStartDate());
        if (parsedStartDate != null) {
            try {
                return OffsetDateTime.parse(parsedStartDate).toInstant().toEpochMilli() <= System.currentTimeMillis();
            } catch (Exception ignored) {
                return true;
            }
        }

        return true;
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

    private List<LiveMatchesService.LiveMatchEntry> selectPriorityMatches(
            List<LiveMatchesService.LiveMatchEntry> matches) {
        int target = Math.max(1, priorityMatchCount);
        List<LiveMatchesService.LiveMatchEntry> selected = new ArrayList<>();

        for (LiveMatchesService.LiveMatchEntry match : matches) {
            if (selected.size() >= target) break;
            if (isManagedLive(match) && deriveCanonicalMatchPath(match) != null) {
                selected.add(match);
            }
        }
        for (LiveMatchesService.LiveMatchEntry match : matches) {
            if (selected.size() >= target) break;
            if (isUpcoming(match) && deriveCanonicalMatchPath(match) != null) {
                selected.add(match);
            }
        }
        return selected;
    }

    private boolean isManagedLive(LiveMatchesService.LiveMatchEntry match) {
        if (match == null || !match.isLiveFeedManaged()) return false;
        String status = normalize(match.getStatus());
        String cohort = normalize(match.getLifecycleCohort());
        return match.isLive() || "live".equals(cohort) || status.contains("innings_break")
                || status.contains("rain_delay");
    }

    private boolean isUpcoming(LiveMatchesService.LiveMatchEntry match) {
        if (match == null) return false;
        String status = normalize(match.getStatus());
        String cohort = normalize(match.getLifecycleCohort());
        return "upcoming".equals(cohort) || "upcoming".equals(status) || "scheduled".equals(status);
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
        return CrexMatchUrlHelper.isCanonicalMatchSlug(slug);
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
        private final Map<String, String> partitionXmlByName;
        private final List<String> priorityMatchUrls;
        private final int urlCount;

        private SitemapManifest(long generationId, long generatedAtEpochMs, String indexXml,
                                Map<Integer, String> partitionXmlByNumber, Map<String, String> partitionXmlByName,
                                List<String> priorityMatchUrls,
                                int urlCount) {
            this.generationId = generationId;
            this.generatedAtEpochMs = generatedAtEpochMs;
            this.indexXml = indexXml;
            this.partitionXmlByNumber = partitionXmlByNumber;
            this.partitionXmlByName = partitionXmlByName;
            this.priorityMatchUrls = priorityMatchUrls;
            this.urlCount = urlCount;
        }
    }
}
