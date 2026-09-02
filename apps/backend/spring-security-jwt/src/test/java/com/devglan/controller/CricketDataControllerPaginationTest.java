package com.devglan.controller;

import java.lang.reflect.Proxy;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleCohort;
import com.devglan.service.LiveMatchService;

import static org.assertj.core.api.Assertions.assertThat;

public class CricketDataControllerPaginationTest {

    @Test
    @SuppressWarnings("unchecked")
    public void pagedCohortResponseReturnsPageAndTotalCount() {
        LiveMatch first = new LiveMatch();
        first.setUrl("https://crex.com/first");
        LiveMatch second = new LiveMatch();
        second.setUrl("https://crex.com/second");
        List<LiveMatch> liveMatches = Arrays.asList(first, second);

        LiveMatchService service = (LiveMatchService) Proxy.newProxyInstance(
                LiveMatchService.class.getClassLoader(),
                new Class<?>[] { LiveMatchService.class },
                (proxy, method, args) -> {
                    if ("findMatchesByCohort".equals(method.getName())) {
                        return args[0] == MatchLifecycleCohort.LIVE
                                ? liveMatches
                                : Collections.emptyList();
                    }
                    return null;
                });

        CricketDataController controller = new CricketDataController();
        ReflectionTestUtils.setField(controller, "liveMatchService", service);

        ResponseEntity<Map<String, Object>> response = controller.getMatchCohorts(
                false, "live", 1, 1);
        Map<String, Object> body = response.getBody();

        assertThat(body).isNotNull();
        assertThat((List<LiveMatch>) body.get("live"))
                .extracting(LiveMatch::getUrl)
                .containsExactly("https://crex.com/second");
        assertThat(body.get("liveCount")).isEqualTo(2);
        assertThat((List<LiveMatch>) body.get("upcoming")).isEmpty();
        assertThat(body.get("upcomingCount")).isEqualTo(0);
    }
}
