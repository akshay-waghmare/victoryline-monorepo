package com.devglan.seo;

import com.devglan.dao.MatchRepository;
import com.devglan.model.Matches;
import com.devglan.service.seo.RobotsScheduler;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class RobotsSchedulerTest {

    @Mock
    private MatchRepository matchRepository;

    private RobotsScheduler scheduler;

    @Before
    public void setUp() {
        scheduler = new RobotsScheduler();
        // Use reflection to inject mock (since @Autowired is constructor-based in tests)
        try {
            java.lang.reflect.Field field = RobotsScheduler.class.getDeclaredField("matchRepository");
            field.setAccessible(true);
            field.set(scheduler, matchRepository);
        } catch (Exception e) {
            fail("Failed to inject mock: " + e.getMessage());
        }
    }

    @Test
    public void should_flip_completed_match_after_grace_period() {
        // Arrange: Match completed 10 days ago
        Matches match = new Matches();
        match.setMatchLink("india-vs-australia-123");
        match.setMatchStatus("completed");
        match.setMatchDate(Date.from(Instant.now().minus(10, ChronoUnit.DAYS)));
        match.setVisibility(true);

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        ArgumentCaptor<Matches> captor = ArgumentCaptor.forClass(Matches.class);
        verify(matchRepository).save(captor.capture());
        assertFalse("Match should be set to noindex", captor.getValue().getVisibility());
    }

    @Test
    public void should_not_flip_recent_completed_match() {
        // Arrange: Match completed 3 days ago (within grace period)
        Matches match = new Matches();
        match.setMatchLink("india-vs-australia-123");
        match.setMatchStatus("completed");
        match.setMatchDate(Date.from(Instant.now().minus(3, ChronoUnit.DAYS)));
        match.setVisibility(true);

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, never()).save(any());
    }

    @Test
    public void should_not_flip_live_match() {
        // Arrange: Old match but status is "live"
        Matches match = new Matches();
        match.setMatchLink("india-vs-australia-123");
        match.setMatchStatus("live");
        match.setMatchDate(Date.from(Instant.now().minus(10, ChronoUnit.DAYS)));
        match.setVisibility(true);

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, never()).save(any());
    }

    @Test
    public void should_not_flip_scheduled_match() {
        // Arrange: Upcoming match
        Matches match = new Matches();
        match.setMatchLink("india-vs-australia-123");
        match.setMatchStatus("scheduled");
        match.setMatchDate(Date.from(Instant.now().plus(5, ChronoUnit.DAYS)));
        match.setVisibility(true);

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, never()).save(any());
    }

    @Test
    public void should_handle_match_without_date() {
        // Arrange: Match with null date
        Matches match = new Matches();
        match.setMatchLink("india-vs-australia-123");
        match.setMatchStatus("completed");
        match.setMatchDate(null);
        match.setVisibility(true);

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, never()).save(any());
    }

    @Test
    public void should_flip_multiple_expired_matches() {
        // Arrange: 3 expired matches
        Matches match1 = createExpiredMatch("match-1");
        Matches match2 = createExpiredMatch("match-2");
        Matches match3 = createExpiredMatch("match-3");

        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList(match1, match2, match3));

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, times(3)).save(any(Matches.class));
    }

    @Test
    public void should_handle_empty_match_list() {
        // Arrange
        when(matchRepository.findByVisibilityTrue()).thenReturn(Arrays.asList());

        // Act
        scheduler.processExpiredLivePages();

        // Assert
        verify(matchRepository, never()).save(any());
    }

    private Matches createExpiredMatch(String link) {
        Matches match = new Matches();
        match.setMatchLink(link);
        match.setMatchStatus("completed");
        match.setMatchDate(Date.from(Instant.now().minus(10, ChronoUnit.DAYS)));
        match.setVisibility(true);
        return match;
    }
}
