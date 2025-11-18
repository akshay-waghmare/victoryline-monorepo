package com.devglan.integration;

import com.devglan.Application;
import com.devglan.model.CompletedMatchDTO;
import com.devglan.model.Matches;
import com.devglan.model.Series;
import com.devglan.repository.MatchRepository;
import com.devglan.repository.SeriesRepository;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.*;

/**
 * Integration tests for Completed Matches API
 * Feature: 006-completed-matches-display (T020)
 */
@RunWith(SpringRunner.class)
@SpringBootTest(
    classes = Application.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
public class CompletedMatchesIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private SeriesRepository seriesRepository;

    private Series testSeries;

    @Before
    public void setUp() {
        // Clean up
        matchRepository.deleteAll();
        seriesRepository.deleteAll();

        // Create test series
        testSeries = new Series();
        testSeries.setName("Test Series 2025");
        testSeries.setFormat("Test");
        testSeries = seriesRepository.save(testSeries);

        // Create 25 completed matches (to test limit of 20)
        for (int i = 1; i <= 25; i++) {
            Matches match = new Matches();
            match.setHomeTeamName("Team A" + i);
            match.setAwayTeamName("Team B" + i);
            match.setMatchStatus("Completed");
            match.setResult("Team A won by 5 wickets");
            match.setCompletionDate(new Date(System.currentTimeMillis() - (i * 86400000L))); // i days ago
            match.setSeries(testSeries);
            match.setLocation("Stadium " + i);
            match.setSportType("Cricket");
            matchRepository.save(match);
        }
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_ReturnsMaximum20() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .withBasicAuth("user", "password")
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        List<Map> matches = (List<Map>) response.getBody().get("matches");
        assertNotNull(matches);
        assertEquals("Should return exactly 20 matches", 20, matches.size());
        assertEquals("Total count should be 20", 20, response.getBody().get("totalCount"));
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_IncludesSeriesName() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .withBasicAuth("user", "password")
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        
        List<Map> matches = (List<Map>) response.getBody().get("matches");
        Map<String, Object> firstMatch = matches.get(0);
        
        assertNotNull("Series name should be present", firstMatch.get("seriesName"));
        assertEquals("Series name should match", "Test Series 2025", firstMatch.get("seriesName"));
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_OrderedByCompletionDate() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .withBasicAuth("user", "password")
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        List<Map> matches = (List<Map>) response.getBody().get("matches");
        
        // Verify matches are ordered by completion date descending (most recent first)
        for (int i = 0; i < matches.size() - 1; i++) {
            Date currentDate = new Date((Long) matches.get(i).get("completionDate"));
            Date nextDate = new Date((Long) matches.get(i + 1).get("completionDate"));
            assertTrue("Matches should be ordered by completion date descending", 
                      currentDate.after(nextDate) || currentDate.equals(nextDate));
        }
    }

    @Test
    public void testGetCompletedMatches_Unauthorized() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_ResponseStructure() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .withBasicAuth("user", "password")
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        Map<String, Object> body = response.getBody();
        assertTrue("Response should contain 'matches' field", body.containsKey("matches"));
        assertTrue("Response should contain 'totalCount' field", body.containsKey("totalCount"));
        assertTrue("Response should contain 'timestamp' field", body.containsKey("timestamp"));
        
        List<Map> matches = (List<Map>) body.get("matches");
        Map<String, Object> firstMatch = matches.get(0);
        
        // Verify match structure
        assertTrue(firstMatch.containsKey("matchId"));
        assertTrue(firstMatch.containsKey("homeTeamName"));
        assertTrue(firstMatch.containsKey("awayTeamName"));
        assertTrue(firstMatch.containsKey("result"));
        assertTrue(firstMatch.containsKey("completionDate"));
        assertTrue(firstMatch.containsKey("seriesName"));
        assertTrue(firstMatch.containsKey("location"));
    }

    @Test
    @WithMockUser(roles = "USER")
    public void testGetCompletedMatches_CachingHeaders() {
        // Act
        ResponseEntity<Map> response = restTemplate
            .withBasicAuth("user", "password")
            .getForEntity("/api/v1/matches/completed", Map.class);

        // Assert
        assertNotNull("Cache-Control header should be present", 
                     response.getHeaders().getCacheControl());
        assertNotNull("ETag header should be present", 
                     response.getHeaders().getETag());
    }
}
