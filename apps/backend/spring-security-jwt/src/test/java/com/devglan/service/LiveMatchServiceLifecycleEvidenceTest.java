package com.devglan.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collections;
import java.util.Arrays;
import java.lang.reflect.Proxy;

import java.lang.reflect.Method;

import org.junit.Test;

import com.devglan.model.LiveMatch;
import com.devglan.model.MatchLifecycleStatus;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.service.impl.LiveMatchServiceImpl;

public class LiveMatchServiceLifecycleEvidenceTest {

    @Test
    public void treatsProviderWinnerBetweenTwoScoresAsTerminal() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("hasCompletedResultSignal", String.class);
        method.setAccessible(true);

        boolean terminal = (Boolean) method.invoke(service,
                "tt 83/68.2 tt won 7tht20, kcl t20 2026 kbt 172/6 20.0");

        assertThat(terminal).isTrue();
    }

    @Test
    public void doesNotTreatAWinTossMessageAsTerminal() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("hasCompletedResultSignal", String.class);
        method.setAccessible(true);

        boolean terminal = (Boolean) method.invoke(service, "ind won the toss and elected to bat");

        assertThat(terminal).isFalse();
    }

    @Test
    public void retainsEvidenceBackedMultiDayInningsBreakWhenAbsentFromLiveFeed() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        LiveMatch match = new LiveMatch("https://crex.com/cricket-live-score/team-a-vs-team-b-1st-test-match-updates-ABC");
        match.setMatchFormat("Test");
        match.setStatus(MatchLifecycleStatus.INNINGS_BREAK);
        match.setLastKnownState("Stumps - Day 1");

        Method method = LiveMatchServiceImpl.class.getDeclaredMethod(
                "shouldRetainAbsentLiveMatch", LiveMatch.class, MatchLifecycleStatus.class);
        method.setAccessible(true);

        assertThat((Boolean) method.invoke(service, match, MatchLifecycleStatus.INNINGS_BREAK)).isTrue();
    }

    @Test
    public void doesNotRetainAbsentLimitedOversLiveRowWithoutEvidence() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        LiveMatch match = new LiveMatch("https://crex.com/cricket-live-score/team-a-vs-team-b-39th-match-t20-match-updates-ABC");
        match.setMatchFormat("T20");
        match.setStatus(MatchLifecycleStatus.LIVE);

        Method method = LiveMatchServiceImpl.class.getDeclaredMethod(
                "shouldRetainAbsentLiveMatch", LiveMatch.class, MatchLifecycleStatus.class);
        method.setAccessible(true);

        assertThat((Boolean) method.invoke(service, match, MatchLifecycleStatus.LIVE)).isFalse();
    }

    @Test
    public void doesNotRetainAbsentLimitedOversInningsBreak() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        LiveMatch match = new LiveMatch("https://crex.com/cricket-live-score/team-a-vs-team-b-55th-match-one-day-cup-2026-match-updates-ABC");
        match.setMatchFormat("One Day");
        match.setStatus(MatchLifecycleStatus.INNINGS_BREAK);
        match.setLastKnownState("Innings Break");

        Method method = LiveMatchServiceImpl.class.getDeclaredMethod(
                "shouldRetainAbsentLiveMatch", LiveMatch.class, MatchLifecycleStatus.class);
        method.setAccessible(true);

        assertThat((Boolean) method.invoke(service, match, MatchLifecycleStatus.INNINGS_BREAK)).isFalse();
    }

    @Test
    public void doesNotRepublishSoftDeletedAbsentRowAsLive() {
        LiveMatch deleted = new LiveMatch(
                "https://crex.com/cricket-live-score/team-a-vs-team-b-55th-match-one-day-cup-2026-match-updates-ABC");
        deleted.setDeleted(true);
        deleted.setStatus(MatchLifecycleStatus.COMPLETED);
        deleted.setLastKnownState("Innings Break");
        deleted.setScheduledStartTime(System.currentTimeMillis() - 3600000L);

        LiveMatchRepository repository = (LiveMatchRepository) Proxy.newProxyInstance(
                LiveMatchRepository.class.getClassLoader(),
                new Class<?>[] {LiveMatchRepository.class},
                (proxy, method, args) -> {
                    if ("findAll".equals(method.getName())) {
                        return Collections.singletonList(deleted);
                    }
                    if (method.getReturnType() == boolean.class) return false;
                    if (method.getReturnType() == int.class) return 0;
                    if (method.getReturnType() == long.class) return 0L;
                    if (method.getReturnType() == double.class) return 0D;
                    if (java.util.List.class.isAssignableFrom(method.getReturnType())) return Collections.emptyList();
                    return null;
                });
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(repository, null, null, null);

        assertThat(service.findAllLiveMatches()).isEmpty();
    }

    @Test
    public void retainsLiveStateWhenNoTerminalResultEvidenceExists() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        LiveMatch match = new LiveMatch(
                "https://crex.com/cricket-live-score/team-a-vs-team-b-1st-match-t20-cup-2026-match-updates-ABC");
        match.setStatus(MatchLifecycleStatus.LIVE);

        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("retainNonTerminalStatus", LiveMatch.class);
        method.setAccessible(true);

        assertThat((MatchLifecycleStatus) method.invoke(service, match)).isEqualTo(MatchLifecycleStatus.LIVE);
    }

    @Test
    public void rejectsUpcomingRowsWithoutAFutureScheduleFromPublicDiscovery() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("isPubliclyIndexable", LiveMatch.class);
        method.setAccessible(true);

        LiveMatch stale = new LiveMatch("https://crex.com/cricket-live-score/old-a-vs-old-b-1st-match-cup-2025");
        stale.setStatus(MatchLifecycleStatus.UPCOMING);
        stale.setSeriesName("Old cup");

        assertThat((Boolean) method.invoke(service, stale)).isFalse();
    }

    @Test
    public void acceptsUpcomingRowsWithAFutureScheduleForPublicDiscovery() throws Exception {
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(null, null, null, null);
        Method method = LiveMatchServiceImpl.class.getDeclaredMethod("isPubliclyIndexable", LiveMatch.class);
        method.setAccessible(true);

        LiveMatch upcoming = new LiveMatch("https://crex.com/cricket-live-score/real-a-vs-real-b-1st-match-cup-2026-match-updates-13ZZ");
        upcoming.setStatus(MatchLifecycleStatus.UPCOMING);
        upcoming.setScheduledStartTime(System.currentTimeMillis() + 86400000L);

        assertThat((Boolean) method.invoke(service, upcoming)).isTrue();
    }

    @Test
    public void excludesUnmanagedLiveRowsFromPublicLiveDiscovery() {
        LiveMatch managed = new LiveMatch(
                "https://crex.com/cricket-live-score/managed-a-vs-managed-b-1st-match-t20-cup-2026-match-updates-MAN");
        managed.setStatus(MatchLifecycleStatus.LIVE);
        managed.setLiveFeedManaged(true);
        managed.setLastStateUpdatedAt(System.currentTimeMillis());
        managed.setTeam1Name("Managed A");
        managed.setTeam2Name("Managed B");
        managed.setVenue("Test venue");
        managed.setLastKnownState("Ball");

        LiveMatch unmanaged = new LiveMatch(
                "https://crex.com/cricket-live-score/mohali-kings-vs-bathinda-2nd-match-t20-cup-2026-match-updates-13O2");
        unmanaged.setStatus(MatchLifecycleStatus.LIVE);
        unmanaged.setLiveFeedManaged(false);
        unmanaged.setLastStateUpdatedAt(System.currentTimeMillis());

        LiveMatchRepository repository = (LiveMatchRepository) Proxy.newProxyInstance(
                LiveMatchRepository.class.getClassLoader(),
                new Class<?>[] {LiveMatchRepository.class},
                (proxy, method, args) -> {
                    if ("findAll".equals(method.getName())) {
                        return Arrays.asList(managed, unmanaged);
                    }
                    if (method.getReturnType() == boolean.class) return false;
                    if (method.getReturnType() == int.class) return 0;
                    if (method.getReturnType() == long.class) return 0L;
                    if (java.util.List.class.isAssignableFrom(method.getReturnType())) return Collections.emptyList();
                    return null;
                });
        LiveMatchServiceImpl service = new LiveMatchServiceImpl(repository, null, null, null);

        assertThat(service.findMatchesByCohort(com.devglan.model.MatchLifecycleCohort.LIVE))
                .extracting(LiveMatch::getUrl)
                .containsExactly(managed.getUrl());
    }
}
