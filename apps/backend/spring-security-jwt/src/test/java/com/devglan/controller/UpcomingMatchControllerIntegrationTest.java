package com.devglan.controller;

import com.devglan.dto.ApiResponse;
import com.devglan.dto.PagedResponseDTO;
import com.devglan.dto.TeamDTO;
import com.devglan.dto.UpcomingMatchDTO;
import com.devglan.model.UpcomingMatch;
import com.devglan.repository.UpcomingMatchRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Upcoming Match API endpoints
 * Feature 005: Upcoming Matches Feed
 */
@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class UpcomingMatchControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UpcomingMatchRepository repository;

    @Before
    public void setUp() {
        repository.deleteAll();
    }

    @Test
    public void testGetUpcomingMatches_Empty() throws Exception {
        mockMvc.perform(get("/api/v1/matches/upcoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content").isEmpty())
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    public void testGetUpcomingMatches_WithData() throws Exception {
        // Create test match
        UpcomingMatch match = new UpcomingMatch();
        match.setSource("crex");
        match.setSourceKey("test-match-1");
        match.setSeriesName("Test Series 2025");
        match.setMatchTitle("Team A vs Team B");
        match.setTeamAName("Team A");
        match.setTeamACode("TMA");
        match.setTeamBName("Team B");
        match.setTeamBCode("TMB");
        match.setStartTimeUtc(LocalDateTime.now().plusDays(1));
        match.setStatus(UpcomingMatch.MatchStatus.SCHEDULED);
        match.setLastScrapedAt(LocalDateTime.now());
        repository.save(match);

        mockMvc.perform(get("/api/v1/matches/upcoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].source").value("crex"))
                .andExpect(jsonPath("$.data.content[0].sourceKey").value("test-match-1"))
                .andExpect(jsonPath("$.data.content[0].matchTitle").value("Team A vs Team B"))
                .andExpect(jsonPath("$.data.content[0].teamA.name").value("Team A"))
                .andExpect(jsonPath("$.data.content[0].teamB.name").value("Team B"));
    }

    @Test
    public void testGetUpcomingMatchById_Found() throws Exception {
        // Create test match
        UpcomingMatch match = new UpcomingMatch();
        match.setSource("crex");
        match.setSourceKey("test-match-2");
        match.setSeriesName("Test Series 2025");
        match.setMatchTitle("India vs Australia");
        match.setTeamAName("India");
        match.setTeamACode("IND");
        match.setTeamBName("Australia");
        match.setTeamBCode("AUS");
        match.setStartTimeUtc(LocalDateTime.now().plusDays(2));
        match.setStatus(UpcomingMatch.MatchStatus.SCHEDULED);
        match.setLastScrapedAt(LocalDateTime.now());
        UpcomingMatch saved = repository.save(match);

        mockMvc.perform(get("/api/v1/matches/upcoming/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(saved.getId()))
                .andExpect(jsonPath("$.data.matchTitle").value("India vs Australia"))
                .andExpect(jsonPath("$.data.teamA.code").value("IND"))
                .andExpect(jsonPath("$.data.teamB.code").value("AUS"));
    }

    @Test
    public void testGetUpcomingMatchById_NotFound() throws Exception {
        mockMvc.perform(get("/api/v1/matches/upcoming/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("match_not_found"));
    }

    @Test
    public void testUpsertUpcomingMatch_Create() throws Exception {
        UpcomingMatchDTO dto = new UpcomingMatchDTO();
        dto.setSource("crex");
        dto.setSourceKey("new-match-1");
        dto.setSeriesName("New Series");
        dto.setMatchTitle("New Team A vs New Team B");
        dto.setTeamA(new TeamDTO("New Team A", "NTA"));
        dto.setTeamB(new TeamDTO("New Team B", "NTB"));
        dto.setStartTime(Instant.now().plusSeconds(86400)); // +1 day
        dto.setStatus("scheduled");

        mockMvc.perform(post("/api/v1/matches/upcoming")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.source").value("crex"))
                .andExpect(jsonPath("$.data.sourceKey").value("new-match-1"))
                .andExpect(jsonPath("$.data.id").exists());
    }

    @Test
    public void testUpsertUpcomingMatch_Update() throws Exception {
        // Create initial match
        UpcomingMatch match = new UpcomingMatch();
        match.setSource("crex");
        match.setSourceKey("update-match-1");
        match.setSeriesName("Old Series");
        match.setMatchTitle("Old Title");
        match.setTeamAName("Old Team A");
        match.setTeamBName("Old Team B");
        match.setStartTimeUtc(LocalDateTime.now().plusDays(1));
        match.setStatus(UpcomingMatch.MatchStatus.SCHEDULED);
        match.setLastScrapedAt(LocalDateTime.now());
        UpcomingMatch saved = repository.save(match);

        // Update via API
        UpcomingMatchDTO dto = new UpcomingMatchDTO();
        dto.setSource("crex");
        dto.setSourceKey("update-match-1");
        dto.setSeriesName("Updated Series");
        dto.setMatchTitle("Updated Title");
        dto.setTeamA(new TeamDTO("Updated Team A", "UTA"));
        dto.setTeamB(new TeamDTO("Updated Team B", "UTB"));
        dto.setStartTime(Instant.now().plusSeconds(86400));
        dto.setStatus("scheduled");

        mockMvc.perform(post("/api/v1/matches/upcoming")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(saved.getId()))
                .andExpect(jsonPath("$.data.seriesName").value("Updated Series"))
                .andExpect(jsonPath("$.data.matchTitle").value("Updated Title"))
                .andExpect(jsonPath("$.data.teamA.name").value("Updated Team A"));
    }

    @Test
    public void testUpsertUpcomingMatch_ValidationError() throws Exception {
        UpcomingMatchDTO dto = new UpcomingMatchDTO();
        // Missing required fields

        mockMvc.perform(post("/api/v1/matches/upcoming")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    public void testGetUpcomingMatches_Pagination() throws Exception {
        // Create 25 test matches
        for (int i = 1; i <= 25; i++) {
            UpcomingMatch match = new UpcomingMatch();
            match.setSource("crex");
            match.setSourceKey("match-" + i);
            match.setSeriesName("Test Series");
            match.setMatchTitle("Match " + i);
            match.setTeamAName("Team A");
            match.setTeamBName("Team B");
            match.setStartTimeUtc(LocalDateTime.now().plusDays(i));
            match.setStatus(UpcomingMatch.MatchStatus.SCHEDULED);
            match.setLastScrapedAt(LocalDateTime.now());
            repository.save(match);
        }

        // Test first page
        mockMvc.perform(get("/api/v1/matches/upcoming?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(10)))
                .andExpect(jsonPath("$.data.currentPage").value(0))
                .andExpect(jsonPath("$.data.pageSize").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(25))
                .andExpect(jsonPath("$.data.totalPages").value(3));

        // Test second page
        mockMvc.perform(get("/api/v1/matches/upcoming?page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(10)))
                .andExpect(jsonPath("$.data.currentPage").value(1));

        // Test last page
        mockMvc.perform(get("/api/v1/matches/upcoming?page=2&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(5)))
                .andExpect(jsonPath("$.data.currentPage").value(2));
    }
}
