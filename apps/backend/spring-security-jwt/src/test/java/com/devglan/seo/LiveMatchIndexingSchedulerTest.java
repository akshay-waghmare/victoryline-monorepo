package com.devglan.seo;

import com.devglan.scheduler.LiveMatchIndexingScheduler;
import com.devglan.service.seo.GoogleSearchConsoleService;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SeoCache;
import org.junit.Before;
import org.junit.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

public class LiveMatchIndexingSchedulerTest {

    private FakeGoogleSearchConsoleService gscService;
    private StubLiveMatchesService liveMatchesService;
    private SeoCache seoCache;
    private LiveMatchIndexingScheduler scheduler;

    @Before
    public void setUp() {
        gscService = new FakeGoogleSearchConsoleService();
        liveMatchesService = new StubLiveMatchesService();
        seoCache = new SeoCache();
        scheduler = new LiveMatchIndexingScheduler(gscService, liveMatchesService, seoCache);

        ReflectionTestUtils.setField(scheduler, "gscEnabled", true);
        ReflectionTestUtils.setField(scheduler, "liveMatchIndexingEnabled", true);
        ReflectionTestUtils.setField(scheduler, "maxIndexingPerRun", 10);
        ReflectionTestUtils.setField(scheduler, "dailyIndexingBudget", 180);
    }

    @Test
    public void indexes_only_live_feed_matches_not_all_sitemap_matches() {
        liveMatchesService.liveOnly = Arrays.asList(entry(
                "https://crex.com/cricket-live-score/live-a-vs-live-b-1st-match-test-cup-2026-match-updates-12AA",
                "LIVE",
                1780000000000L));
        liveMatchesService.allMatches = Arrays.asList(entry(
                "https://crex.com/cricket-live-score/old-a-vs-old-b-1st-match-test-cup-2026-match-updates-11AA",
                "COMPLETED",
                1770000000000L));

        scheduler.indexNewLiveMatches();

        assertThat(gscService.requestedSlugs)
                .contains("live-a-vs-live-b-1st-match-test-cup-2026-match-updates-12AA")
                .doesNotContain("old-a-vs-old-b-1st-match-test-cup-2026-match-updates-11AA");
    }

    private LiveMatchesService.LiveMatchEntry entry(String url, String status, Long scheduledStartTime) {
        LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
        entry.setUrl(url);
        entry.setStatus(status);
        entry.setScheduledStartTime(scheduledStartTime);
        return entry;
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        private List<LiveMatchEntry> liveOnly;
        private List<LiveMatchEntry> allMatches;

        @Override
        public List<LiveMatchEntry> getLiveMatchesOnly() {
            return liveOnly;
        }

        @Override
        public List<LiveMatchEntry> getLiveMatches() {
            return allMatches;
        }
    }

    private static class FakeGoogleSearchConsoleService extends GoogleSearchConsoleService {
        private final Set<String> requestedSlugs = new HashSet<>();

        FakeGoogleSearchConsoleService() {
            super(null);
        }

        @Override
        public boolean isIndexingInitialized() {
            return true;
        }

        @Override
        public boolean requestIndexingForMatch(String matchSlug) {
            requestedSlugs.add(matchSlug);
            return true;
        }
    }
}
