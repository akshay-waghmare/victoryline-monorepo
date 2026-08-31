package com.devglan.seo;

import com.devglan.model.Matches;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SeoConstants;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SitemapService;
import org.junit.Before;
import org.junit.Test;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for sitemap partitioning logic to ensure proper URL distribution
 * across multiple partition files based on SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION.
 */
public class SitemapPartitionTest {

    private SitemapService service;
    private SeoCache cache;
    private StubLiveMatchesService liveMatchesService;

    @Before
    public void setUp() {
        cache = new SeoCache();
        liveMatchesService = new StubLiveMatchesService();
        service = new SitemapService(cache, liveMatchesService);
    }

    @Test
    public void index_lists_correct_number_of_partitions_for_large_dataset() {
        // Given: Mock repo exceeds two full sitemap partitions
        List<Matches> largeMatchSet = new ArrayList<>();
        int matchCount = (SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION * 2) + 50;
        for (int i = 1; i <= matchCount; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink(validMatchLink(i));
            m.setMatchDate(new Date());
            m.setMatchStatus("Completed");
            m.setVisibility(true);
            largeMatchSet.add(m);
        }
        liveMatchesService.setMatches(toLiveEntries(largeMatchSet));
        
        // When: Get sitemap index
        String indexXml = service.getSitemapIndexXml();
        
        // Then: large archive/recent cohorts are still partitioned at the
        // sitemap URL limit, and the public index advertises named cohorts.
        assertThat(indexXml).contains("<sitemapindex");
        assertThat(indexXml).contains("sitemap-static-0001.xml");
        assertThat(indexXml).contains("sitemap-recent-0001.xml");
        assertThat(indexXml).contains("sitemap-recent-0002.xml");
        assertThat(indexXml).contains("sitemap-recent-0003.xml");
    }

    @Test
    public void partition_one_contains_static_pages_and_first_matches() {
        // Given: Mock repo returns 150 matches
        List<Matches> matches = new ArrayList<>();
        for (int i = 1; i <= 150; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink(validMatchLink(i));
            m.setMatchDate(new Date());
            m.setMatchStatus("Completed");
            m.setVisibility(true);
            matches.add(m);
        }
        liveMatchesService.setMatches(toLiveEntries(matches));
        
        // When: Get partition 1
        String partition1Xml = service.getPartitionXml(1);
        
        // Then: Should contain the routed static pages only
        assertThat(partition1Xml).contains("<urlset");
        assertThat(partition1Xml).contains("https://www.crickzen.com/</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/matches</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/series</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/live-cricket-score</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/live-score</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/live-score/today</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/live-score/ipl</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/cricket-schedule/today</loc>");
        assertThat(partition1Xml).contains("https://www.crickzen.com/cricket-schedule/ipl-2026</loc>");
        assertThat(partition1Xml).doesNotContain("https://www.crickzen.com/blog</loc>");
    }

    @Test
    public void partition_urls_have_canonical_host() {
        // Given: Mock repo returns some matches
        List<Matches> matches = createMatchList(10);
        liveMatchesService.setMatches(toLiveEntries(matches));
        
        // When: Get any partition
        String partitionXml = service.getPartitionXml(1);
        
        // Then: All URLs should use canonical host
        assertThat(partitionXml).contains("https://www.crickzen.com/");
        assertThat(partitionXml).doesNotContain("http://localhost");
        assertThat(partitionXml).doesNotContain("http://example.com");
    }

    @Test
    public void partition_urls_have_iso_lastmod() {
        // Given: Mock repo returns matches
        List<Matches> matches = createMatchList(5);
        liveMatchesService.setMatches(toLiveEntries(matches));
        
        // When: Get partition
        String partitionXml = service.getPartitionXml(1);
        
        // Then: Should have ISO-formatted lastmod
        assertThat(partitionXml).containsPattern("<lastmod>\\d{4}-\\d{2}-\\d{2}T");
        assertThat(partitionXml).contains("Z</lastmod>"); // UTC indicator
    }

    @Test
    public void unlisted_partition_is_not_emitted_as_an_empty_xml_file() {
        // Given: Mock source returns only 50 matches (less than two partitions)
        List<Matches> matches = createMatchList(50);
        liveMatchesService.setMatches(toLiveEntries(matches));
        
        // When: Request partition 5 (beyond available data)
        String partition5Xml = service.getPartitionXml(5);
        
        // Then: The index must not advertise this shard and callers must not
        // receive a cacheable empty XML document.
        assertThat(partition5Xml).isNull();
        assertThat(service.getSitemapIndexXml()).doesNotContain("sitemap-recent-0005.xml");
    }

    @Test
    public void partition_respects_max_urls_per_partition_constant() {
        // Given: Mock repo returns one partition worth of matches
        List<Matches> matches = createMatchList(SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
        liveMatchesService.setMatches(toLiveEntries(matches));
        
        // When: Get partition 1 and count URLs
        String partition1Xml = service.getPartitionXml(1);
        
        // Then: Should have at most SITEMAP_MAX_URLS_PER_PARTITION entries
        int urlCount = countOccurrences(partition1Xml, "<url>");
        assertThat(urlCount).isLessThanOrEqualTo(SeoConstants.SITEMAP_MAX_URLS_PER_PARTITION);
    }

    @Test
    public void sitemap_excludes_numeric_and_non_canonical_match_paths() {
        List<Matches> matches = new ArrayList<>();

        Matches numeric = new Matches();
        numeric.setMatchId(445L);
        numeric.setMatchLink("https://example.com/cric-live/445");
        numeric.setMatchDate(new Date());
        numeric.setMatchStatus("Completed");
        numeric.setVisibility(true);
        matches.add(numeric);

        Matches generic = new Matches();
        generic.setMatchId(446L);
        generic.setMatchLink("https://example.com/matches/scorecard");
        generic.setMatchDate(new Date());
        generic.setMatchStatus("Completed");
        generic.setVisibility(true);
        matches.add(generic);

        Matches canonical = new Matches();
        canonical.setMatchId(447L);
        canonical.setMatchLink("https://crex.com/cricket-live-score/br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P");
        canonical.setMatchDate(new Date());
        canonical.setMatchStatus("Completed");
        canonical.setVisibility(true);
        matches.add(canonical);

        liveMatchesService.setMatches(toLiveEntries(matches));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).contains("/cric-live/br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P");
        assertThat(partitionXml).doesNotContain("/cric-live/445");
        assertThat(partitionXml).doesNotContain("/cric-live/scorecard");
    }

    @Test
    public void sitemap_excludes_completed_matches_without_score_or_result_signal() {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();

        LiveMatchesService.LiveMatchEntry delayed = new LiveMatchesService.LiveMatchEntry();
        delayed.setUrl("https://crex.com/cricket-live-score/gg-vs-lh-13th-match-uttar-pradesh-t10-league-2026-match-updates-1293");
        delayed.setExternalMatchKey("gg-vs-lh-13th-match-uttar-pradesh-t10-league-2026-match-updates-1293");
        delayed.setStatus("COMPLETED");
        delayed.setFinished(true);
        delayed.setLastKnownState("Toss delayed due to wet outfield");
        delayed.setResultSummary("null");
        entries.add(delayed);

        LiveMatchesService.LiveMatchEntry result = new LiveMatchesService.LiveMatchEntry();
        result.setUrl("https://crex.com/cricket-live-score/br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P");
        result.setExternalMatchKey("br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P");
        result.setStatus("COMPLETED");
        result.setFinished(true);
        result.setLastKnownState("Speen Ghar Region won by 6 wickets");
        entries.add(result);

        liveMatchesService.setMatches(entries);

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).doesNotContain("/cric-live/gg-vs-lh-13th-match-uttar-pradesh-t10-league-2026-match-updates-1293");
        assertThat(partitionXml).contains("/cric-live/br-vs-sgr-8th-match-afghanistan-one-day-cup-2026-match-updates-126P");
    }

    @Test
    public void sitemap_excludes_placeholder_match_identity() {
        LiveMatchesService.LiveMatchEntry placeholder = new LiveMatchesService.LiveMatchEntry();
        placeholder.setUrl("https://crex.com/cricket-live-score/null-vs-null-1st-match-test-cup-2026-match-updates-NULL");
        placeholder.setStatus("UPCOMING");

        LiveMatchesService.LiveMatchEntry real = new LiveMatchesService.LiveMatchEntry();
        real.setUrl("https://crex.com/cricket-live-score/real-a-vs-real-b-1st-match-test-cup-2026-match-updates-REAL");
        real.setStatus("UPCOMING");
        real.setScheduledStartTime(System.currentTimeMillis() + 86400000L);

        LiveMatchesService.LiveMatchEntry empty = new LiveMatchesService.LiveMatchEntry();
        empty.setUrl("https://crex.com/cricket-live-score/empty-a-vs-empty-b-2nd-match-test-cup-2026-match-updates-EMPTY");
        empty.setStatus("UPCOMING");

        liveMatchesService.setMatches(java.util.Arrays.asList(placeholder, real, empty));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).doesNotContain("null-vs-null");
        assertThat(partitionXml).contains("real-a-vs-real-b-1st-match-test-cup-2026-match-updates-REAL");
        assertThat(partitionXml).doesNotContain("empty-a-vs-empty-b");
    }

    @Test
    public void sitemap_excludes_upcoming_rows_without_a_future_schedule_even_with_metadata() {
        LiveMatchesService.LiveMatchEntry stale = new LiveMatchesService.LiveMatchEntry();
        stale.setUrl("https://crex.com/cricket-live-score/old-a-vs-old-b-1st-match-cup-2025");
        stale.setStatus("UPCOMING");
        stale.setResultSummary("Old cup fixture");

        LiveMatchesService.LiveMatchEntry real = new LiveMatchesService.LiveMatchEntry();
        real.setUrl("https://crex.com/cricket-live-score/real-a-vs-real-b-1st-match-cup-2026-match-updates-13ZZ");
        real.setStatus("UPCOMING");
        real.setScheduledStartTime(System.currentTimeMillis() + 86400000L);

        liveMatchesService.setMatches(java.util.Arrays.asList(stale, real));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).doesNotContain("old-a-vs-old-b-1st-match-cup-2025");
        assertThat(partitionXml).contains("real-a-vs-real-b-1st-match-cup-2026-match-updates-13ZZ");
    }

    @Test
    public void sitemap_uses_live_match_last_state_updated_at_for_lastmod() {
        LiveMatchesService.LiveMatchEntry live = new LiveMatchesService.LiveMatchEntry();
        live.setUrl("https://crex.com/cricket-live-score/ind-vs-aus-2nd-test-2026-match-updates-222B");
        live.setExternalMatchKey("ind-vs-aus-2nd-test-2026-match-updates-222B");
        live.setStatus("LIVE");
        live.setLastKnownState("India 118/2 after 32.4 overs");
        live.setLastStateUpdatedAt(1760000000000L);

        liveMatchesService.setMatches(java.util.Collections.singletonList(live));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).contains("/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B");
        assertThat(partitionXml).contains("<lastmod>2025-10-09T08:53:20Z</lastmod>");
    }

    @Test
    public void sitemap_does_not_emit_future_lastmod_for_upcoming_with_scheduledStartTime() {
        LiveMatchesService.LiveMatchEntry upcoming = new LiveMatchesService.LiveMatchEntry();
        upcoming.setUrl("https://crex.com/cricket-live-score/up-a-vs-up-b-1st-match-test-cup-2026-match-updates-12BB");
        upcoming.setExternalMatchKey("up-a-vs-up-b-1st-match-test-cup-2026-match-updates-12BB");
        upcoming.setStatus("UPCOMING");
        upcoming.setScheduledStartTime(System.currentTimeMillis() + 86400000L); // 1 day in the future

        liveMatchesService.setMatches(java.util.Collections.singletonList(upcoming));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).contains("/cric-live/up-a-vs-up-b-1st-match-test-cup-2026-match-updates-12BB");
        // lastmod must NOT be in the future — extract it and verify
        String lastmod = extractLastmod(partitionXml,
                "https://www.crickzen.com/cric-live/up-a-vs-up-b-1st-match-test-cup-2026-match-updates-12BB");
        assertThat(lastmod).isNotNull();
        long lastmodEpoch = java.time.OffsetDateTime.parse(lastmod).toInstant().toEpochMilli();
        assertThat(lastmodEpoch).isLessThanOrEqualTo(System.currentTimeMillis() + 5000L);
    }

    @Test
    public void sitemap_does_not_emit_future_lastmod_for_upcoming_with_startDate_string() {
        LiveMatchesService.LiveMatchEntry upcoming = new LiveMatchesService.LiveMatchEntry();
        upcoming.setUrl("https://crex.com/cricket-live-score/up-c-vs-up-d-1st-match-test-cup-2026-match-updates-12CC");
        upcoming.setExternalMatchKey("up-c-vs-up-d-1st-match-test-cup-2026-match-updates-12CC");
        upcoming.setStatus("UPCOMING");
        // No scheduledStartTime; only a future startDate string
        String futureIso = java.time.OffsetDateTime.now()
                .plusDays(2)
                .format(java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        upcoming.setStartDate(futureIso);

        liveMatchesService.setMatches(java.util.Collections.singletonList(upcoming));

        String partitionXml = service.getPartitionXml(1);

        assertThat(partitionXml).contains("/cric-live/up-c-vs-up-d-1st-match-test-cup-2026-match-updates-12CC");
        String lastmod = extractLastmod(partitionXml,
                "https://www.crickzen.com/cric-live/up-c-vs-up-d-1st-match-test-cup-2026-match-updates-12CC");
        assertThat(lastmod).isNotNull();
        long lastmodEpoch = java.time.OffsetDateTime.parse(lastmod).toInstant().toEpochMilli();
        assertThat(lastmodEpoch).isLessThanOrEqualTo(System.currentTimeMillis() + 5000L);
    }

    private String extractLastmod(String partitionXml, String loc) {
        int locIndex = partitionXml.indexOf(loc);
        if (locIndex < 0) {
            return null;
        }
        int lastmodStart = partitionXml.indexOf("<lastmod>", locIndex);
        if (lastmodStart < 0) {
            return null;
        }
        int lastmodEnd = partitionXml.indexOf("</lastmod>", lastmodStart);
        if (lastmodEnd < 0) {
            return null;
        }
        return partitionXml.substring(lastmodStart + "<lastmod>".length(), lastmodEnd);
    }

    @Test
    public void priority_sitemap_keeps_managed_live_then_fills_to_five_with_nearest_upcoming() {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();

        LiveMatchesService.LiveMatchEntry unmanaged = entry(
                "unmanaged-a-vs-unmanaged-b-live-cup-2026-match-updates-UNMAN", "LIVE", null);
        unmanaged.setLiveFeedManaged(false);
        entries.add(unmanaged);

        LiveMatchesService.LiveMatchEntry managed = entry(
                "managed-a-vs-managed-b-live-cup-2026-match-updates-MAN", "LIVE", null);
        managed.setLiveFeedManaged(true);
        entries.add(managed);

        long now = System.currentTimeMillis();
        for (int i = 1; i <= 5; i++) {
            entries.add(entry("next" + i + "-a-vs-next" + i + "-b-cup-2026-match-updates-UP" + i,
                    "UPCOMING", now + i * 3600000L));
        }
        liveMatchesService.setMatches(entries);

        String priorityXml = service.getPartitionXml("sitemap-priority-0001");
        assertThat(priorityXml).isNotNull();
        assertThat(countOccurrences(priorityXml, "<url>")).isEqualTo(5);
        assertThat(priorityXml).contains("managed-a-vs-managed-b-live-cup-2026-match-updates-MAN");
        assertThat(priorityXml).doesNotContain("unmanaged-a-vs-unmanaged-b-live-cup-2026-match-updates-UNMAN");
        assertThat(priorityXml).contains("next1-a-vs-next1-b-cup-2026-match-updates-UP1");
        assertThat(priorityXml).contains("next4-a-vs-next4-b-cup-2026-match-updates-UP4");
        assertThat(priorityXml).doesNotContain("next5-a-vs-next5-b-cup-2026-match-updates-UP5");
        assertThat(service.getPriorityMatchUrls()).hasSize(5);
        assertThat(service.getSitemapIndexXml()).contains("sitemap-priority-0001.xml");
    }

    private LiveMatchesService.LiveMatchEntry entry(String slug, String status, Long scheduledStart) {
        LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
        entry.setUrl("https://crex.com/cricket-live-score/" + slug);
        entry.setExternalMatchKey(slug);
        entry.setStatus(status);
        entry.setScheduledStartTime(scheduledStart);
        entry.setLastKnownState("LIVE".equals(status) ? "42/1" : null);
        return entry;
    }

    @Test
    public void sitemap_prioritizes_live_matches_into_first_partition() {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();
        for (int i = 1; i <= 1200; i++) {
            LiveMatchesService.LiveMatchEntry completed = new LiveMatchesService.LiveMatchEntry();
            completed.setUrl(validMatchLink(i));
            completed.setStatus("COMPLETED");
            completed.setLastKnownState("Team won by 5 wickets");
            completed.setLastStateUpdatedAt(1700000000000L + i);
            entries.add(completed);
        }

        LiveMatchesService.LiveMatchEntry live = new LiveMatchesService.LiveMatchEntry();
        live.setUrl("https://crex.com/cricket-live-score/priority-vs-live-current-match-2026-match-updates-LIVE1");
        live.setStatus("LIVE");
        live.setScheduledStartTime(1781000000000L);
        live.setLastKnownState("Priority 42/1");
        entries.add(live);
        liveMatchesService.setMatches(entries);

        String firstPartition = service.getPartitionXml(1);
        String secondPartition = service.getPartitionXml(2);

        assertThat(firstPartition).contains("/cric-live/priority-vs-live-current-match-2026-match-updates-LIVE1");
        assertThat(secondPartition).doesNotContain("/cric-live/priority-vs-live-current-match-2026-match-updates-LIVE1");
    }

    @Test
    public void sitemap_deduplicates_repeated_canonical_match_paths() {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();
        LiveMatchesService.LiveMatchEntry first = new LiveMatchesService.LiveMatchEntry();
        first.setUrl("https://crex.com/cricket-live-score/ind-vs-aus-2nd-test-2026-match-updates-222B");
        first.setStatus("LIVE");
        first.setLastKnownState("India 42/1");
        entries.add(first);

        LiveMatchesService.LiveMatchEntry duplicate = new LiveMatchesService.LiveMatchEntry();
        duplicate.setExternalMatchKey("ind-vs-aus-2nd-test-2026-match-updates-222B");
        duplicate.setStatus("LIVE");
        duplicate.setLastKnownState("India 42/1");
        entries.add(duplicate);

        liveMatchesService.setMatches(entries);

        String indexXml = service.getSitemapIndexXml();
        String partitionXml = service.getPartitionXml(1);

        assertThat(indexXml).contains("sitemap-static-0001.xml");
        assertThat(indexXml).doesNotContain("sitemap-recent-0002.xml");
        assertThat(countOccurrences(partitionXml,
                "https://www.crickzen.com/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B</loc>"))
                .isEqualTo(1);
    }

    @Test
    public void sitemap_escapes_special_characters_in_match_urls() {
        LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
        entry.setUrl("https://crex.com/cricket-live-score/j&k-vs-mah-8th-match-test-cup-2026-match-updates-1ABC");
        entry.setStatus("COMPLETED");
        entry.setLastKnownState("J&K won by 5 wickets");
        liveMatchesService.setMatches(java.util.Collections.singletonList(entry));

        assertThat(service.getPartitionXml(1)).contains("j&amp;k-vs-mah");
    }

    // Helper methods
    
    private List<Matches> createMatchList(int count) {
        List<Matches> matches = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            Matches m = new Matches();
            m.setMatchId((long) i);
            m.setMatchLink(validMatchLink(i));
            m.setMatchDate(new Date());
            m.setMatchStatus("Live");
            m.setVisibility(true);
            matches.add(m);
        }
        return matches;
    }

    private String validMatchLink(int index) {
        return "https://crex.com/cricket-live-score/team" + index + "-vs-side" + index
                + "-1st-match-test-league-2026-match-updates-" + index;
    }

    private List<LiveMatchesService.LiveMatchEntry> toLiveEntries(List<Matches> matches) {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();
        for (Matches match : matches) {
            LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
            entry.setUrl(match.getMatchLink());
            entry.setLastKnownState(match.getMatchStatus());
            entry.setLastStateUpdatedAt(match.getMatchDate() != null ? match.getMatchDate().getTime() : null);
            entries.add(entry);
        }
        return entries;
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        private List<LiveMatchEntry> matches = new ArrayList<>();

        void setMatches(List<LiveMatchEntry> matches) {
            this.matches = matches;
        }

        @Override
        public List<LiveMatchEntry> getLiveMatches() {
            return matches;
        }

        @Override
        public List<LiveMatchEntry> getSitemapMatches() {
            return matches;
        }
    }

    private int countOccurrences(String text, String pattern) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(pattern, index)) != -1) {
            count++;
            index += pattern.length();
        }
        return count;
    }
}
