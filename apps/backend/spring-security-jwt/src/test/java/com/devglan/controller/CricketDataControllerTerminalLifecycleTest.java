package com.devglan.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Proxy;
import java.util.Map;

import org.junit.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleStatus;
import com.devglan.service.LiveMatchService;
import com.devglan.service.MatchInfoService;

/**
 * Covers the terminal-state overlay without the legacy controller fixture's
 * Mockito mock of the concrete websocket service, which cannot initialize on
 * the repository's Java 17 test runtime.
 */
public class CricketDataControllerTerminalLifecycleTest {

    @Test
    @SuppressWarnings("unchecked")
    public void enrichesPreMatchInfoWithExactTerminalCatalogueState() throws Exception {
        String slug = "dbs-vs-ess-33rd-match-t20-blast-2026-match-updates-ZUV";
        LiveMatch completed = new LiveMatch("https://crex.com/cricket-live-score/" + slug);
        completed.setStatus(MatchLifecycleStatus.COMPLETED);
        completed.setResultSummary("ESS won by 6 runs");
        completed.setLastKnownState("ESS 179/5, DBS 173");

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new FixtureMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(completed));

        ResponseEntity<?> response = controller.getMatchInfo(slug);
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body.get("match_status")).isEqualTo("COMPLETED");
        assertThat(body.get("status")).isEqualTo("COMPLETED");
        assertThat(body.get("url")).isEqualTo(completed.getUrl());
        assertThat(body.get("final_result_text")).isEqualTo("ESS won by 6 runs");
        assertThat(body.get("lastKnownState")).isEqualTo("ESS 179/5, DBS 173");
    }

    private LiveMatchService liveMatchServiceReturning(LiveMatch match) {
        return (LiveMatchService) Proxy.newProxyInstance(
                LiveMatchService.class.getClassLoader(),
                new Class<?>[] { LiveMatchService.class },
                (proxy, method, args) -> "findByUrl".equals(method.getName()) ? match : null);
    }

    private void setField(CricketDataController controller, String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field = CricketDataController.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(controller, value);
    }

    private static final class FixtureMatchInfoService extends MatchInfoService {
        private FixtureMatchInfoService() {
            super(null, null, null);
        }

        @Override
        public String getMatchInfo(String url) {
            return "{\"match_name\":\"T20 Blast 2026\",\"toss_info\":\"DBS won the toss\"}";
        }
    }
}
