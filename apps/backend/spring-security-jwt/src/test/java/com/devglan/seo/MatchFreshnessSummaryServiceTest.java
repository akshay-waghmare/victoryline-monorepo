package com.devglan.seo;

import com.devglan.dao.CricketDataDTO;
import com.devglan.dao.FreshnessSummaryDTO;
import com.devglan.service.seo.MatchFreshnessSummaryService;
import com.devglan.websocket.service.CricketDataService;
import org.junit.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class MatchFreshnessSummaryServiceTest {

    @Test
    public void builds_live_update_summary_from_commentary_and_toss() {
        StubCricketDataService cricketDataService = new StubCricketDataService();
        CricketDataDTO dto = new CricketDataDTO();
        dto.setUrl("ind-vs-aus-2nd-test-2026-match-updates-222B");
        dto.setMatchName("India vs Australia");
        dto.setTossInfo("India won the toss and chose to bat.");
        dto.setScore("120/2");
        dto.setCurrentRunRate("8.00");
        dto.setOver(15.0);
        dto.setUpdatedTimeStamp(1760000000000L);
        dto.setCommentary(Arrays.asList(
                commentary("WICKET", "15.2", "Wicket falls as the batter edges behind.", 1760000005000L),
                commentary("BALL", "15.1", "Virat Kohli drives a boundary to bring India to 120/2.", 1760000003000L)
        ));
        cricketDataService.setDto(dto);

        MatchFreshnessSummaryService service = new MatchFreshnessSummaryService(cricketDataService);
        FreshnessSummaryDTO summary = service.buildSummary(dto.getUrl(), "live-updates");

        assertThat(summary.getHeroSummary()).contains("latest key moment");
        assertThat(summary.getLiveUpdates()).hasSize(2);
        assertThat(summary.getKeyEvents()).isNotEmpty();
        assertThat(summary.getMeaningfulUpdatedAt()).isEqualTo(1760000005000L);
        assertThat(summary.getMatchDevelopmentSummary()).contains("120/2");
    }

    @Test
    public void keeps_preview_timestamp_stable_without_meaningful_signal() {
        StubCricketDataService cricketDataService = new StubCricketDataService();
        CricketDataDTO dto = new CricketDataDTO();
        dto.setUrl("upcoming-match");
        dto.setMatchName("India vs Australia");
        dto.setMatchDate("1761000000000");
        dto.setUpdatedTimeStamp(1762000000000L);
        cricketDataService.setDto(dto);

        MatchFreshnessSummaryService service = new MatchFreshnessSummaryService(cricketDataService);
        FreshnessSummaryDTO summary = service.buildSummary(dto.getUrl(), "preview");

        assertThat(summary.getMeaningfulUpdatedAt()).isEqualTo(1761000000000L);
        assertThat(summary.getLiveUpdates()).isEmpty();
    }

    static Map<String, Object> commentary(String type, String overBall, String text, long timestamp) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("type", type);
        entry.put("overBall", overBall);
        entry.put("text", text);
        entry.put("timestamp", timestamp);
        return entry;
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
