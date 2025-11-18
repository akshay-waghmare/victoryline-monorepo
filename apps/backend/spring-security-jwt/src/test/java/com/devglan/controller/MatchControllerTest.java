package com.devglan.controller;

import com.devglan.model.CompletedMatchDTO;
import com.devglan.service.MatchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

/**
 * Unit tests for MatchController
 * Feature: 006-completed-matches-display
 */
@RunWith(SpringRunner.class)
@WebMvcTest(MatchController.class)
public class MatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MatchService matchService;

    @Autowired
    private ObjectMapper objectMapper;

    private List<CompletedMatchDTO> mockMatches;

    @Before
    public void setUp() {
        mockMatches = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            CompletedMatchDTO match = new CompletedMatchDTO(
                (long) i,
                "India",
                "Australia",
                "India won by 5 wickets",
                new Date(),
                "Test Series 2025",
                "Test",
                "Mumbai",
                "Cricket",
                "/match/" + i
            );
            mockMatches.add(match);
        }
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_Success() throws Exception {
        // Arrange
        when(matchService.getCompletedMatches()).thenReturn(mockMatches);

        // Act & Assert
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches", hasSize(20)))
                .andExpect(jsonPath("$.totalCount", is(20)))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.matches[0].homeTeamName", is("India")))
                .andExpect(jsonPath("$.matches[0].awayTeamName", is("Australia")))
                .andExpect(jsonPath("$.matches[0].seriesName", is("Test Series 2025")));

        verify(matchService, times(1)).getCompletedMatches();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetCompletedMatches_AdminAccess() throws Exception {
        // Arrange
        when(matchService.getCompletedMatches()).thenReturn(mockMatches);

        // Act & Assert
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches", hasSize(20)));

        verify(matchService, times(1)).getCompletedMatches();
    }

    @Test
    public void testGetCompletedMatches_Unauthorized() throws Exception {
        // Act & Assert - No authentication
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verify(matchService, never()).getCompletedMatches();
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_EmptyList() throws Exception {
        // Arrange
        when(matchService.getCompletedMatches()).thenReturn(new ArrayList<>());

        // Act & Assert
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches", hasSize(0)))
                .andExpect(jsonPath("$.totalCount", is(0)));

        verify(matchService, times(1)).getCompletedMatches();
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_ServiceException() throws Exception {
        // Arrange
        when(matchService.getCompletedMatches())
            .thenThrow(new RuntimeException("Database connection failed"));

        // Act & Assert
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error", is("Failed to retrieve completed matches")))
                .andExpect(jsonPath("$.message", is("Database connection failed")));

        verify(matchService, times(1)).getCompletedMatches();
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_ResponseStructure() throws Exception {
        // Arrange
        when(matchService.getCompletedMatches()).thenReturn(mockMatches);

        // Act & Assert - Verify complete response structure
        mockMvc.perform(get("/api/v1/matches/completed")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches").isArray())
                .andExpect(jsonPath("$.matches[0].matchId").exists())
                .andExpect(jsonPath("$.matches[0].homeTeamName").exists())
                .andExpect(jsonPath("$.matches[0].awayTeamName").exists())
                .andExpect(jsonPath("$.matches[0].result").exists())
                .andExpect(jsonPath("$.matches[0].completionDate").exists())
                .andExpect(jsonPath("$.matches[0].seriesName").exists())
                .andExpect(jsonPath("$.matches[0].seriesFormat").exists())
                .andExpect(jsonPath("$.matches[0].location").exists());
    }
}
