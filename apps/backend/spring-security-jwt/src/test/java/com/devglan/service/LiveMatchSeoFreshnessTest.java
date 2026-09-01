package com.devglan.service;

import com.devglan.dao.CricketDataDTO;
import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.service.impl.LiveMatchServiceImpl;
import com.devglan.service.seo.events.SeoContentChangeEvent;
import com.devglan.websocket.service.CricketDataService;
import org.junit.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

public class LiveMatchSeoFreshnessTest {

    @Test
    public void meaningful_score_changes_advance_lastmod_once_per_throttle_window() {
        LiveMatch match = match("SEO1");
        RecordingRepository recordingRepository = new RecordingRepository(match);
        LiveMatchRepository repository = recordingRepository.proxy();
        RecordingPublisher publisher = new RecordingPublisher();
        match.setSeoContentModifiedAt(System.currentTimeMillis() - 900001L);

        LiveMatchServiceImpl service = new LiveMatchServiceImpl(
                repository, null, null, publisher);

        CricketDataDTO first = snapshot("10/0", 1.0, "Over");
        assertThat(service.recordSeoLiveSnapshot(match.getUrl(), first)).isTrue();
        assertThat(recordingRepository.saveCount.get()).isEqualTo(1);
        assertThat(publisher.eventCount.get()).isEqualTo(1);

        long firstModifiedAt = match.getSeoContentModifiedAt();
        CricketDataDTO second = snapshot("11/0", 1.1, "Over");
        assertThat(service.recordSeoLiveSnapshot(match.getUrl(), second)).isFalse();
        assertThat(recordingRepository.saveCount.get()).isEqualTo(1);
        assertThat(publisher.eventCount.get()).isEqualTo(1);
        assertThat(match.getSeoContentModifiedAt()).isEqualTo(firstModifiedAt);

        assertThat(service.recordSeoLiveSnapshot(match.getUrl(), second)).isFalse();
        assertThat(recordingRepository.saveCount.get()).isEqualTo(1);
    }

    @Test
    public void final_result_can_advance_lastmod_before_throttle_expires() {
        LiveMatch match = match("SEO2");
        RecordingRepository recordingRepository = new RecordingRepository(match);
        LiveMatchRepository repository = recordingRepository.proxy();
        RecordingPublisher publisher = new RecordingPublisher();
        match.setResultSummary("Team A 100/5");
        match.setSeoContentModifiedAt(System.currentTimeMillis());

        LiveMatchServiceImpl service = new LiveMatchServiceImpl(
                repository, null, null, publisher);
        CricketDataDTO result = snapshot("101/5", 19.4, "Team A won by 5 wickets");
        result.setFinalResultText("Team A won by 5 wickets");

        assertThat(service.recordSeoLiveSnapshot(match.getUrl(), result)).isTrue();
        assertThat(recordingRepository.saveCount.get()).isEqualTo(1);
        assertThat(publisher.eventCount.get()).isEqualTo(1);
    }

    private LiveMatch match(String key) {
        LiveMatch match = new LiveMatch("https://crex.com/cricket-live-score/team-a-vs-team-b-1st-match-t20-cup-2026-match-updates-" + key);
        match.setExternalMatchKey(key);
        return match;
    }

    private CricketDataDTO snapshot(String score, double over, String state) {
        CricketDataDTO snapshot = new CricketDataDTO();
        snapshot.setScore(score);
        snapshot.setOver(over);
        snapshot.setCurrentBall(state);
        return snapshot;
    }

    private static class RecordingPublisher implements ApplicationEventPublisher {
        private final AtomicInteger eventCount = new AtomicInteger();

        @Override
        public void publishEvent(org.springframework.context.ApplicationEvent event) {
            eventCount.incrementAndGet();
        }

        @Override
        public void publishEvent(Object event) {
            eventCount.incrementAndGet();
        }
    }

    private static class RecordingRepository implements InvocationHandler {
        private final LiveMatch match;
        private final AtomicInteger saveCount = new AtomicInteger();

        RecordingRepository(LiveMatch match) {
            this.match = match;
        }

        LiveMatchRepository proxy() {
            return (LiveMatchRepository) Proxy.newProxyInstance(
                    LiveMatchRepository.class.getClassLoader(),
                    new Class<?>[] { LiveMatchRepository.class }, this);
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            if ("findByExternalMatchKeyOrderByIdDesc".equals(method.getName())) {
                return Collections.singletonList(match);
            }
            if ("findFirstByUrlContainingOrderByIdDesc".equals(method.getName())) {
                return match;
            }
            if ("save".equals(method.getName())) {
                saveCount.incrementAndGet();
                return args[0];
            }
            if ("equals".equals(method.getName())) return proxy == args[0];
            if ("hashCode".equals(method.getName())) return System.identityHashCode(proxy);
            if (List.class.isAssignableFrom(method.getReturnType())) return Collections.emptyList();
            if (Optional.class.isAssignableFrom(method.getReturnType())) return Optional.empty();
            if (method.getReturnType() == boolean.class) return false;
            if (method.getReturnType() == long.class) return 0L;
            if (method.getReturnType() == int.class) return 0;
            return null;
        }
    }
}
