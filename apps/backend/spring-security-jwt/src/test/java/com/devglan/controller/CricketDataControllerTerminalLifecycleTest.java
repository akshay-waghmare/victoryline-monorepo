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

    @Test
    @SuppressWarnings("unchecked")
    public void buildsLifecycleSafeMatchInfoWhenStoredInfoIsMissing() throws Exception {
        String slug = "ndt-vs-sds-39th-match-delhi-premier-t20-league-2026-match-updates-13C7";
        LiveMatch completed = new LiveMatch("https://crex.com/cricket-live-score/" + slug);
        completed.setStatus(MatchLifecycleStatus.COMPLETED);
        completed.setResultSummary("SDS won by 5 wickets");
        completed.setSeriesName("Delhi Premier T20 League 2026");

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new EmptyMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(completed));

        ResponseEntity<?> response = controller.getMatchInfo(slug);
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body.get("status")).isEqualTo("COMPLETED");
        assertThat(body.get("match_status")).isEqualTo("COMPLETED");
        assertThat(body.get("final_result_text")).isEqualTo("SDS won by 5 wickets");
    }

    @Test
    @SuppressWarnings("unchecked")
    public void canonicalSnapshotResolvesBareHumanReadableSlugFromCatalogue() throws Exception {
        String slug = "ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025";
        LiveMatch match = new LiveMatch("https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/" + slug + "/live");
        match.setId(42L);
        match.setStatus(MatchLifecycleStatus.UPCOMING);
        match.setSeriesName("Ireland Tour of Bangladesh 2025");
        match.setScheduledStartTime(System.currentTimeMillis() + 3600000L);

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new FixtureMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(match));

        ResponseEntity<?> response = controller.getCanonicalMatchSnapshot(slug);
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body.get("canonicalSlug")).isEqualTo(slug);
        assertThat(body.get("status")).isEqualTo("UPCOMING");
        assertThat(body.get("scheduledAt")).isEqualTo(match.getScheduledStartTime());
    }

    @Test
    public void canonicalSnapshotRejectsPlaceholderIdentityEvenWhenLegacyInfoExists() throws Exception {
        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new FixtureMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(null));

        ResponseEntity<?> response = controller.getCanonicalMatchSnapshot("null-vs-null-1st-match-test-cup-2026");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    public void canonicalSnapshotRejectsStoredOnlyUpcomingInfoWithoutSchedule() throws Exception {
        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new StaleUpcomingMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(null));

        ResponseEntity<?> response = controller.getCanonicalMatchSnapshot(
                "tus-vs-war-20th-match-csa-t20-challenge-2025");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    public void matchInfoRejectsCatalogueUpcomingRowWithoutFutureSchedule() throws Exception {
        String slug = "tus-vs-war-20th-match-csa-t20-challenge-2025";
        LiveMatch unscheduled = new LiveMatch("https://crex.com/cricket-live-score/" + slug);
        unscheduled.setStatus(MatchLifecycleStatus.UPCOMING);

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new StaleUpcomingMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(unscheduled));

        ResponseEntity<?> response = controller.getMatchInfo(slug);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    public void matchInfoFindsCanonicalCatalogueRowWhenDirectProviderLookupMisses() throws Exception {
        String slug = "tus-vs-war-20th-match-csa-t20-challenge-2025";
        LiveMatch unscheduled = new LiveMatch("https://crex.com/scoreboard/XDJ/1ZE/20th-Match/6C/JB/" + slug + "/live");
        unscheduled.setStatus(MatchLifecycleStatus.UPCOMING);

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new StaleUpcomingMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturningOnlyAllMatches(unscheduled));

        ResponseEntity<?> response = controller.getMatchInfo(slug);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    public void matchInfoRejectsStoredOnlyCanonicalInfoWithoutLifecycleEvidence() throws Exception {
        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new StaleUpcomingMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(null));

        ResponseEntity<?> response = controller.getMatchInfo("tus-vs-war-20th-match-csa-t20-challenge-2025");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void canonicalSnapshotDoesNotOverrideFutureCatalogueScheduleWithStoredLabel() throws Exception {
        String slug = "ban-vs-ire-1st-test-ireland-tour-of-bangladesh-2025";
        LiveMatch upcoming = new LiveMatch("https://crex.com/scoreboard/X1M/1YQ/1st-TEST/Z/W/" + slug + "/live");
        upcoming.setStatus(MatchLifecycleStatus.UPCOMING);
        upcoming.setSeriesName("Ireland Tour of Bangladesh 2025");
        upcoming.setScheduledStartTime(System.currentTimeMillis() + 3600000L);

        CricketDataController controller = new CricketDataController();
        setField(controller, "matchInfoService", new StaleUpcomingMatchInfoService());
        setField(controller, "liveMatchService", liveMatchServiceReturning(upcoming));

        ResponseEntity<?> response = controller.getCanonicalMatchSnapshot(slug);
        Map<String, Object> body = (Map<String, Object>) response.getBody();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body.get("scheduledAt")).isEqualTo(upcoming.getScheduledStartTime());
        assertThat(body.get("scheduledLabel")).isNull();
    }

    private LiveMatchService liveMatchServiceReturning(LiveMatch match) {
        return (LiveMatchService) Proxy.newProxyInstance(
                LiveMatchService.class.getClassLoader(),
                new Class<?>[] { LiveMatchService.class },
                (proxy, method, args) -> {
                    if ("findByUrl".equals(method.getName())) {
                        return match;
                    }
                    if ("findAllMatches".equals(method.getName())) {
                        return java.util.Collections.singletonList(match);
                    }
                    if ("findIndexableMatches".equals(method.getName())) {
                        return match == null ? java.util.Collections.emptyList() : java.util.Collections.singletonList(match);
                    }
                    return null;
                });
    }

    private LiveMatchService liveMatchServiceReturningOnlyAllMatches(LiveMatch match) {
        return (LiveMatchService) Proxy.newProxyInstance(
                LiveMatchService.class.getClassLoader(),
                new Class<?>[] { LiveMatchService.class },
                (proxy, method, args) -> {
                    if ("findAllMatches".equals(method.getName())) {
                        return java.util.Collections.singletonList(match);
                    }
                    if ("findIndexableMatches".equals(method.getName())) {
                        return java.util.Collections.emptyList();
                    }
                    return null;
                });
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

    private static final class EmptyMatchInfoService extends MatchInfoService {
        private EmptyMatchInfoService() {
            super(null, null, null);
        }

        @Override
        public String getMatchInfo(String url) {
            return null;
        }
    }

    private static final class StaleUpcomingMatchInfoService extends MatchInfoService {
        private StaleUpcomingMatchInfoService() {
            super(null, null, null);
        }

        @Override
        public String getMatchInfo(String url) {
            return "{\"match_name\":\"CSA T20 2025\",\"match_date\":\"Thursday, 15 November, 4:30 AM\",\"venue\":\"City Oval\",\"toss_info\":\"TUS won the toss\"}";
        }
    }
}
