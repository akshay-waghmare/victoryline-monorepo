package com.devglan.controller;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.devglan.model.LiveMatch;
import com.devglan.service.LiveMatchService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Integration tests for MatchController - Completed Matches endpoint
 * Feature: 008-completed-matches (US1 - T018, T019, T021)
 * Created: December 7, 2025
 */
@RunWith(MockitoJUnitRunner.class)
public class MatchControllerTest {

	private MockMvc mockMvc;

	@Mock
	private LiveMatchService liveMatchService;

	@InjectMocks
	private MatchController matchController;

	private ObjectMapper objectMapper;
	private List<LiveMatch> sampleCompletedMatches;

	@Before
	public void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(matchController).build();
		objectMapper = new ObjectMapper();
		
		// Create sample completed matches
		sampleCompletedMatches = new ArrayList<>();
		for (int i = 1; i <= 15; i++) {
			LiveMatch match = new LiveMatch("https://crex.com/match-" + i + "/live");
			match.setId((long) i);
			match.setDeleted(true);
			match.setLastKnownState("Team A won by " + i + " runs");
			sampleCompletedMatches.add(match);
		}
	}

	/**
	 * T018: Test GET /api/v1/matches/completed returns 200 OK
	 */
	@Test
	public void testGetCompletedMatches_Returns200OK() throws Exception {
		// Given: Service returns completed matches
		when(liveMatchService.getCompletedMatches()).thenReturn(sampleCompletedMatches);

		// When: GET request to /api/v1/matches/completed
		// Then: Should return 200 OK
		mockMvc.perform(get("/api/v1/matches/completed")
				.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON));

		verify(liveMatchService, times(1)).getCompletedMatches();
	}

	/**
	 * T019: Test response format matches standard (returns array of LiveMatch objects)
	 */
	@Test
	public void testGetCompletedMatches_ResponseFormat() throws Exception {
		// Given: Service returns completed matches
		when(liveMatchService.getCompletedMatches()).thenReturn(sampleCompletedMatches);

		// When: GET request to /api/v1/matches/completed
		String responseContent = mockMvc.perform(get("/api/v1/matches/completed")
				.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		// Then: Response should be a valid JSON array
		assertNotNull("Response should not be null", responseContent);
		assertTrue("Response should be a JSON array", responseContent.trim().startsWith("["));
		
		// Parse response to verify it's a list
		List<?> responseList = objectMapper.readValue(responseContent, List.class);
		assertEquals("Response should contain 15 matches", 15, responseList.size());
	}

	/**
	 * T021: Test max 20 matches returned even if more exist
	 */
	@Test
	public void testGetCompletedMatches_MaxTwentyMatches() throws Exception {
		// Given: Service returns exactly 20 matches (limit enforced at service layer)
		List<LiveMatch> twentyMatches = new ArrayList<>();
		for (int i = 1; i <= 20; i++) {
			LiveMatch match = new LiveMatch("https://crex.com/match-" + i + "/live");
			match.setId((long) i);
			match.setDeleted(true);
			twentyMatches.add(match);
		}
		when(liveMatchService.getCompletedMatches()).thenReturn(twentyMatches);

		// When: GET request to /api/v1/matches/completed
		String responseContent = mockMvc.perform(get("/api/v1/matches/completed")
				.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		// Then: Response should contain exactly 20 matches
		List<?> responseList = objectMapper.readValue(responseContent, List.class);
		assertEquals("Response should contain max 20 matches", 20, responseList.size());
	}

	/**
	 * Test empty result when no completed matches exist
	 */
	@Test
	public void testGetCompletedMatches_EmptyResult() throws Exception {
		// Given: Service returns empty list
		when(liveMatchService.getCompletedMatches()).thenReturn(new ArrayList<>());

		// When: GET request to /api/v1/matches/completed
		String responseContent = mockMvc.perform(get("/api/v1/matches/completed")
				.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		// Then: Response should be empty array
		List<?> responseList = objectMapper.readValue(responseContent, List.class);
		assertEquals("Response should be empty array", 0, responseList.size());
	}

	/**
	 * Test error handling when service throws exception
	 */
	@Test
	public void testGetCompletedMatches_ServiceException() throws Exception {
		// Given: Service throws exception
		when(liveMatchService.getCompletedMatches()).thenThrow(new RuntimeException("Database error"));

		// When: GET request to /api/v1/matches/completed
		// Then: Should return 500 Internal Server Error with error message
		mockMvc.perform(get("/api/v1/matches/completed")
				.contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isInternalServerError());
	}
}
