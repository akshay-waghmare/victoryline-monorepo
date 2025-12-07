package com.devglan.service;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.devglan.model.LiveMatch;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.service.impl.LiveMatchServiceImpl;

/**
 * Unit tests for LiveMatchService - Completed Matches functionality
 * Feature: 008-completed-matches (US1 - T015, T016, T017)
 * Created: December 7, 2025
 */
@RunWith(MockitoJUnitRunner.class)
public class MatchServiceTest {

	@Mock
	private LiveMatchRepository liveMatchRepository;

	@InjectMocks
	private LiveMatchServiceImpl liveMatchService;

	private List<LiveMatch> sampleCompletedMatches;

	@Before
	public void setUp() {
		sampleCompletedMatches = new ArrayList<>();
		
		// Create 25 sample completed matches (more than the 20 limit)
		for (int i = 25; i >= 1; i--) {
			LiveMatch match = new LiveMatch("https://crex.com/match-" + i + "/live");
			match.setId((long) i);
			match.setDeleted(true);
			match.setLastKnownState("Team A won by " + i + " runs");
			sampleCompletedMatches.add(match);
		}
	}

	/**
	 * T015: Test getCompletedMatches() returns max 20 matches
	 */
	@Test
	public void testGetCompletedMatches_ReturnsMax20Matches() {
		// Given: Repository has 25 completed matches
		Pageable pageable = PageRequest.of(0, 20);
		List<LiveMatch> limitedMatches = sampleCompletedMatches.subList(0, 20);
		when(liveMatchRepository.findCompletedMatches(pageable)).thenReturn(limitedMatches);

		// When: Service method is called
		List<LiveMatch> result = liveMatchService.getCompletedMatches();

		// Then: Should return exactly 20 matches
		assertNotNull("Result should not be null", result);
		assertEquals("Should return exactly 20 matches", 20, result.size());
		verify(liveMatchRepository, times(1)).findCompletedMatches(pageable);
	}

	/**
	 * T016: Test completed matches are ordered by ID DESC (proxy for updatedAt)
	 */
	@Test
	public void testGetCompletedMatches_OrderedByIdDesc() {
		// Given: Repository returns matches ordered by ID descending
		Pageable pageable = PageRequest.of(0, 20);
		List<LiveMatch> orderedMatches = sampleCompletedMatches.subList(0, 20);
		when(liveMatchRepository.findCompletedMatches(pageable)).thenReturn(orderedMatches);

		// When: Service method is called
		List<LiveMatch> result = liveMatchService.getCompletedMatches();

		// Then: Matches should be in descending order by ID
		assertNotNull("Result should not be null", result);
		assertTrue("Should have at least 2 matches to verify order", result.size() >= 2);
		
		// First match ID should be greater than last match ID (descending order)
		Long firstId = result.get(0).getId();
		Long lastId = result.get(result.size() - 1).getId();
		assertTrue("Matches should be ordered by ID descending", firstId > lastId);
	}

	/**
	 * T017: Test only isDeleted=true matches are returned
	 */
	@Test
	public void testGetCompletedMatches_OnlyDeletedMatches() {
		// Given: Repository returns only deleted matches
		Pageable pageable = PageRequest.of(0, 20);
		List<LiveMatch> completedMatches = sampleCompletedMatches.subList(0, 10);
		when(liveMatchRepository.findCompletedMatches(pageable)).thenReturn(completedMatches);

		// When: Service method is called
		List<LiveMatch> result = liveMatchService.getCompletedMatches();

		// Then: All returned matches should have isDeleted=true
		assertNotNull("Result should not be null", result);
		for (LiveMatch match : result) {
			assertTrue("All matches should have isDeleted=true", match.isDeleted());
			assertTrue("isFinished() should return true for deleted matches", match.isFinished());
		}
	}

	/**
	 * Test getCompletedMatches() with empty result
	 */
	@Test
	public void testGetCompletedMatches_EmptyResult() {
		// Given: Repository returns empty list
		Pageable pageable = PageRequest.of(0, 20);
		when(liveMatchRepository.findCompletedMatches(pageable)).thenReturn(new ArrayList<>());

		// When: Service method is called
		List<LiveMatch> result = liveMatchService.getCompletedMatches();

		// Then: Should return empty list
		assertNotNull("Result should not be null", result);
		assertEquals("Should return empty list", 0, result.size());
	}

	/**
	 * Test getCompletedMatches() with fewer than 20 matches
	 */
	@Test
	public void testGetCompletedMatches_FewerThan20Matches() {
		// Given: Repository has only 5 completed matches
		Pageable pageable = PageRequest.of(0, 20);
		List<LiveMatch> fewMatches = sampleCompletedMatches.subList(0, 5);
		when(liveMatchRepository.findCompletedMatches(pageable)).thenReturn(fewMatches);

		// When: Service method is called
		List<LiveMatch> result = liveMatchService.getCompletedMatches();

		// Then: Should return all 5 matches
		assertNotNull("Result should not be null", result);
		assertEquals("Should return all 5 matches", 5, result.size());
	}
}
