package com.devglan.seo;

import com.devglan.dao.CricketDataDTO;
import com.devglan.service.seo.LiveMatchesService;
import com.devglan.service.seo.MatchFreshnessSummaryService;
import com.devglan.service.seo.SeoCache;
import com.devglan.service.seo.SitemapService;
import com.devglan.websocket.service.CricketDataService;
import org.junit.Test;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

public class SitemapFreshnessLastmodTest {

    @Test
    public void freshness_support_url_uses_backend_meaningful_updated_at_for_lastmod() {
        StubLiveMatchesService liveMatchesService = new StubLiveMatchesService();
        LiveMatchesService.LiveMatchEntry live = new LiveMatchesService.LiveMatchEntry();
        live.setUrl("https://crex.com/cricket-live-score/ind-vs-aus-2nd-test-2026-match-updates-222B");
        live.setExternalMatchKey("ind-vs-aus-2nd-test-2026-match-updates-222B");
        live.setStatus("LIVE");
        live.setLastStateUpdatedAt(1760000000000L);
        liveMatchesService.setMatches(Collections.singletonList(live));

        StubCricketDataService cricketDataService = new StubCricketDataService();
        CricketDataDTO dto = new CricketDataDTO();
        dto.setUrl(live.getUrl());
        dto.setUpdatedTimeStamp(1760000007000L);
        dto.setCommentary(Collections.singletonList(MatchFreshnessSummaryServiceTest.commentary(
                "WICKET", "15.2", "Wicket falls as the batter edges behind.", 1760000007000L
        )));
        cricketDataService.setDto(dto);

        MatchFreshnessSummaryService summaryService = new MatchFreshnessSummaryService(cricketDataService);
        SitemapService sitemapService = new SitemapService(new SeoCache(), liveMatchesService, summaryService);

        String partitionXml = sitemapService.getPartitionXml(1);

        assertThat(partitionXml).contains("https://www.crickzen.com/cricket-live-updates/ind-vs-aus-2nd-test-2026-match-updates-222B");
        assertThat(partitionXml).contains("<lastmod>2025-10-09T08:53:27Z</lastmod>");
    }

    private static class StubLiveMatchesService extends LiveMatchesService {
        private java.util.List<LiveMatchesService.LiveMatchEntry> matches = Collections.emptyList();

        void setMatches(java.util.List<LiveMatchesService.LiveMatchEntry> matches) {
            this.matches = matches;
        }

        @Override
        public java.util.List<LiveMatchesService.LiveMatchEntry> getLiveMatches() {
            return matches;
        }
    }

    private static class StubCricketDataService extends CricketDataService {
        private CricketDataDTO dto;

        StubCricketDataService() {
            super(null, null);
        }

        void setDto(CricketDataDTO dto) {
            this.dto = dto;
        }

        @Override
        public CricketDataDTO getLastUpdatedData(String url) {
            return dto;
        }
    }
}
