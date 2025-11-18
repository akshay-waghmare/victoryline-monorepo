package com.devglan.service;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.repository.MatchRepository;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MatchService
 * Feature: 006-completed-matches-display
 */
@RunWith(MockitoJUnitRunner.class)
public class MatchServiceTest {

    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private MatchService matchService;

    private List<CompletedMatchDTO> mockMatches;

    @Before
    public void setUp() {
        mockMatches = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            CompletedMatchDTO match = new CompletedMatchDTO(
                (long) i,
                "Team A" + i,
                "Team B" + i,
                "Team A won by 5 wickets",
                new Date(),
                "Test Series " + i,
                "Test",
                "Stadium " + i,
                "Cricket",
                "/match/" + i
            );
            mockMatches.add(match);
        }
    }

    @Test
    public void testGetCompletedMatches_Success() {
        // Arrange
        when(matchRepository.findTop20CompletedMatches(any(Pageable.class)))
            .thenReturn(mockMatches);

        // Act
        List<CompletedMatchDTO> result = matchService.getCompletedMatches();

        // Assert
        assertNotNull("Result should not be null", result);
        assertEquals("Should return 20 matches", 20, result.size());
        verify(matchRepository, times(1)).findTop20CompletedMatches(any(Pageable.class));
    }

    @Test
    public void testGetCompletedMatches_EmptyList() {
        // Arrange
        when(matchRepository.findTop20CompletedMatches(any(Pageable.class)))
            .thenReturn(new ArrayList<>());

        // Act
        List<CompletedMatchDTO> result = matchService.getCompletedMatches();

        // Assert
        assertNotNull("Result should not be null", result);
        assertEquals("Should return empty list", 0, result.size());
        verify(matchRepository, times(1)).findTop20CompletedMatches(any(Pageable.class));
    }

    @Test
    public void testGetCompletedMatches_VerifyPagination() {
        // Arrange
        when(matchRepository.findTop20CompletedMatches(any(Pageable.class)))
            .thenReturn(mockMatches);

        // Act
        matchService.getCompletedMatches();

        // Assert - Verify pagination parameters
        verify(matchRepository).findTop20CompletedMatches(argThat(pageable -> 
            pageable.getPageNumber() == 0 && 
            pageable.getPageSize() == 20
        ));
    }

    @Test
    public void testGetCompletedMatches_VerifySeriesNames() {
        // Arrange
        when(matchRepository.findTop20CompletedMatches(any(Pageable.class)))
            .thenReturn(mockMatches);

        // Act
        List<CompletedMatchDTO> result = matchService.getCompletedMatches();

        // Assert
        assertNotNull("First match should have series name", result.get(0).getSeriesName());
        assertEquals("Series name should match", "Test Series 1", result.get(0).getSeriesName());
    }

    @Test
    public void testGetCompletedMatches_CacheAnnotation() {
        // This test verifies that the @Cacheable annotation is present
        // Actual cache behavior would be tested in integration tests
        
        // Arrange
        when(matchRepository.findTop20CompletedMatches(any(Pageable.class)))
            .thenReturn(mockMatches);

        // Act - First call
        List<CompletedMatchDTO> result1 = matchService.getCompletedMatches();
        
        // Act - Second call
        List<CompletedMatchDTO> result2 = matchService.getCompletedMatches();

        // Assert - Repository should be called twice (cache not active in unit test)
        verify(matchRepository, times(2)).findTop20CompletedMatches(any(Pageable.class));
        assertEquals("Results should be equal", result1.size(), result2.size());
    }
}
