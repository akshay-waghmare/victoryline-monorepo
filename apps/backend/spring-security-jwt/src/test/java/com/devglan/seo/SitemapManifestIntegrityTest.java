package com.devglan.seo;

import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SitemapService;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import org.junit.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

public class SitemapManifestIntegrityTest {

    @Test
    public void concurrent_requests_share_one_non_empty_manifest_without_exceptions() throws Exception {
        StubLiveMatchesService source = new StubLiveMatchesService(entries(1200));
        final SitemapService service = new SitemapService(new SeoCache(), source);

        ExecutorService executor = Executors.newFixedThreadPool(12);
        List<Callable<String>> calls = new ArrayList<>();
        for (int i = 0; i < 48; i++) {
            final boolean index = i % 3 == 0;
            calls.add(new Callable<String>() {
                @Override
                public String call() {
                    return index ? service.getSitemapIndexXml() : service.getPartitionXml(1);
                }
            });
        }

        List<Future<String>> results = executor.invokeAll(calls);
        executor.shutdownNow();
        for (Future<String> result : results) {
            String xml = result.get();
            assertThat(xml).isNotNull();
            assertThat(xml).doesNotContain("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
        }

        Map<String, Object> metrics = service.getManifestMetrics();
        assertThat(metrics.get("generationId")).isEqualTo(1L);
        assertThat(metrics.get("urlCount")).isEqualTo(1210);
        assertThat(metrics.get("shardCount")).isEqualTo(2);
        assertThat(metrics.get("generationFailures")).isEqualTo(0L);
    }

    @Test
    public void failed_regeneration_preserves_the_last_known_good_manifest() {
        StubLiveMatchesService source = new StubLiveMatchesService(entries(2));
        SitemapService service = new SitemapService(new SeoCache(), source);
        String previousIndex = service.getSitemapIndexXml();
        String previousPartition = service.getPartitionXml(1);

        source.setFail(true);
        service.handleContentChange(SeoContentChangeEvent.bulkRefresh("test"));

        assertThat(service.getSitemapIndexXml()).isEqualTo(previousIndex);
        assertThat(service.getPartitionXml(1)).isEqualTo(previousPartition);
        assertThat(service.getManifestMetrics().get("generationFailures")).isEqualTo(1L);
        assertThat(service.getManifestMetrics().get("urlCount")).isEqualTo(12);
    }

    @Test
    public void first_generation_failure_does_not_publish_an_empty_manifest() {
        StubLiveMatchesService source = new StubLiveMatchesService(Collections.<LiveMatchesService.LiveMatchEntry>emptyList());
        source.setFail(true);
        SitemapService service = new SitemapService(new SeoCache(), source);

        assertThat(service.getSitemapIndexXml()).isNull();
        assertThat(service.getPartitionXml(1)).isNull();
        assertThat(service.hasPublishedManifest()).isFalse();
        assertThat(service.getManifestMetrics().get("generationFailures")).isEqualTo(2L);
    }

    private static List<LiveMatchesService.LiveMatchEntry> entries(int count) {
        List<LiveMatchesService.LiveMatchEntry> entries = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            LiveMatchesService.LiveMatchEntry entry = new LiveMatchesService.LiveMatchEntry();
            entry.setUrl("https://crex.com/cricket-live-score/team" + i + "-vs-side" + i
                    + "-1st-match-test-league-2026-match-updates-" + i);
            entry.setStatus("LIVE");
            entry.setLastKnownState("Team " + i + " 10/0");
            entry.setLastStateUpdatedAt(1760000000000L + i);
            entries.add(entry);
        }
        return entries;
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        private final List<LiveMatchEntry> matches;
        private boolean fail;

        StubLiveMatchesService(List<LiveMatchEntry> matches) {
            this.matches = matches;
        }

        void setFail(boolean fail) {
            this.fail = fail;
        }

        @Override
        public List<LiveMatchEntry> getSitemapMatches() {
            if (fail) {
                throw new IllegalStateException("forced sitemap source failure");
            }
            return matches;
        }
    }
}
