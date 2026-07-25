package com.devglan.seo;

import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SitemapService;
import org.junit.Test;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class SitemapFreshnessLastmodTest {

    @Test
    public void canonical_match_manifest_excludes_freshness_support_routes() {
        StubLiveMatchesService source = new StubLiveMatchesService();
        LiveMatchesService.LiveMatchEntry completed = new LiveMatchesService.LiveMatchEntry();
        completed.setUrl("https://crex.com/cricket-live-score/ind-vs-aus-2nd-test-2026-match-updates-222B");
        completed.setExternalMatchKey("ind-vs-aus-2nd-test-2026-match-updates-222B");
        completed.setStatus("COMPLETED");
        completed.setFinished(true);
        completed.setLastKnownState("India won by 5 wickets");
        completed.setLastStateUpdatedAt(1760000000000L);
        source.setMatches(Collections.singletonList(completed));

        SitemapService sitemapService = new SitemapService(new SeoCache(), source);
        String partitionXml = sitemapService.getPartitionXml(1);

        assertThat(partitionXml).contains("https://www.crickzen.com/cric-live/ind-vs-aus-2nd-test-2026-match-updates-222B");
        assertThat(partitionXml).doesNotContain("/cricket-match-report/");
        assertThat(partitionXml).doesNotContain("/cricket-match-preview/");
        assertThat(partitionXml).doesNotContain("/cricket-live-updates/");
        assertThat(partitionXml).doesNotContain("/match-intelligence/");
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        private List<LiveMatchEntry> matches = Collections.emptyList();

        void setMatches(List<LiveMatchEntry> matches) {
            this.matches = matches;
        }

        @Override
        public List<LiveMatchEntry> getSitemapMatches() {
            return matches;
        }
    }
}
