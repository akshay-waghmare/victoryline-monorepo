package com.devglan.playerstats;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import com.devglan.dao.PlayerStatsIngestionRequest;
import com.devglan.dao.PlayerStatsMatchViewDTO;
import com.devglan.dao.PlayerStatsPayloadDTO;
import com.devglan.dao.PlayerStatsPlayerDetailViewDTO;
import com.devglan.dao.PlayerStatsPlayerDTO;
import com.devglan.dao.PlayerStatsReferenceIngestionRequest;
import com.devglan.dao.PlayerStatsSeriesDTO;
import com.devglan.dao.PlayerStatsSeriesDetailViewDTO;
import com.devglan.dao.PlayerStatsTeamDetailViewDTO;
import com.devglan.dao.PlayerStatsTeamDTO;
import com.devglan.model.LiveMatch;
import com.devglan.repository.CrawlerPlayerStatsReferenceSnapshotRepository;
import com.devglan.repository.CrawlerPlayerStatsSnapshotRepository;
import com.devglan.repository.LiveMatchRepository;
import com.devglan.repository.PlayerStatsPlayerRepository;
import com.devglan.repository.PlayerStatsSeriesRepository;
import com.devglan.repository.PlayerStatsSquadMembershipRepository;
import com.devglan.repository.PlayerStatsTeamRepository;
import com.devglan.service.PlayerStatsCrawlerService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RunWith(SpringRunner.class)
@DataJpaTest
@Import({ PlayerStatsCrawlerService.class, PlayerStatsCrawlerServiceDataJpaTest.TestConfig.class })
@TestPropertySource(properties = {
        "spring.datasource.initialization-mode=never",
        "spring.datasource.schema=",
        "spring.datasource.data=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.hbm2ddl.import_files=",
        "spring.flyway.enabled=false"
})
public class PlayerStatsCrawlerServiceDataJpaTest {

    @Autowired
    private PlayerStatsCrawlerService playerStatsCrawlerService;

    @Autowired
    private LiveMatchRepository liveMatchRepository;

    @Autowired
    private PlayerStatsSeriesRepository playerStatsSeriesRepository;

    @Autowired
    private PlayerStatsTeamRepository playerStatsTeamRepository;

    @Autowired
    private PlayerStatsPlayerRepository playerStatsPlayerRepository;

    @Autowired
    private PlayerStatsSquadMembershipRepository playerStatsSquadMembershipRepository;

    @Autowired
    private CrawlerPlayerStatsSnapshotRepository crawlerPlayerStatsSnapshotRepository;

    @Autowired
    private CrawlerPlayerStatsReferenceSnapshotRepository crawlerPlayerStatsReferenceSnapshotRepository;

    @Test
    public void ingestShouldUpsertCanonicalEntitiesAndExposeMatchView() {
        LiveMatch liveMatch = new LiveMatch("https://crex.com/series/example/match-1/live");
        liveMatch.setExternalMatchKey("match-1");
        liveMatchRepository.save(liveMatch);

        playerStatsCrawlerService.ingest(buildRequest(1730000000000L, "Virat Kohli", 11874));
        playerStatsCrawlerService.ingest(buildRequest(1730000005000L, "Virat Kohli", 11890));

        assertEquals(1L, playerStatsSeriesRepository.count());
        assertEquals(1L, playerStatsTeamRepository.count());
        assertEquals(1L, playerStatsPlayerRepository.count());
        assertEquals(1L, playerStatsSquadMembershipRepository.count());
        assertEquals(1L, crawlerPlayerStatsSnapshotRepository.count());

        PlayerStatsMatchViewDTO matchView = playerStatsCrawlerService.getMatchView(
                "https://crex.com/series/example/match-1/live", null);

        assertNotNull(matchView);
        assertEquals("match-1", matchView.getMatchExternalKey());
        assertEquals(liveMatch.getId(), matchView.getLiveMatchId());
        assertNotNull(matchView.getSeries());
        assertEquals(1, matchView.getTeams().size());
        assertEquals(1, matchView.getTeams().get(0).getSquad().size());
        assertEquals("Virat Kohli", matchView.getTeams().get(0).getSquad().get(0).getName());
        assertEquals(1, matchView.getTeams().get(0).getSquad().get(0).getStats().size());

        Object payloadObject = matchView.getTeams().get(0).getSquad().get(0).getStats().get(0).getPayload();
        assertTrue(payloadObject instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) payloadObject;
        assertEquals(11890, ((Number) payload.get("runs")).intValue());
    }

    @Test
    public void ingestReferenceDataShouldExposePlayerTeamAndSeriesViewsWithoutTouchingMatchSnapshots() {
        playerStatsCrawlerService.ingestReferenceData(buildPlayerReferenceRequest(1730000010000L, 12540));
        playerStatsCrawlerService.ingestReferenceData(buildTeamReferenceRequest(1730000020000L));
        playerStatsCrawlerService.ingestReferenceData(buildSeriesReferenceRequest(1730000030000L));

        assertEquals(4L, crawlerPlayerStatsReferenceSnapshotRepository.count());
        assertEquals(0L, playerStatsSquadMembershipRepository.count());
        assertEquals(0L, crawlerPlayerStatsSnapshotRepository.count());

        PlayerStatsPlayerDetailViewDTO playerView = playerStatsCrawlerService.getPlayerView("player-18", null);
        assertNotNull(playerView);
        assertEquals("crex", playerView.getSource());
        assertEquals("Virat Kohli", playerView.getName());
        assertEquals(2, playerView.getStats().size());
        Object battingPayloadObject = playerView.getStats().get(0).getPayload();
        assertTrue(battingPayloadObject instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> battingPayload = (Map<String, Object>) battingPayloadObject;
        assertEquals(12540, ((Number) battingPayload.get("runs")).intValue());

        PlayerStatsTeamDetailViewDTO teamView = playerStatsCrawlerService.getTeamView("team-ind", null);
        assertNotNull(teamView);
        assertEquals("India", teamView.getName());
        assertEquals(1, teamView.getStats().size());

        PlayerStatsSeriesDetailViewDTO seriesView = playerStatsCrawlerService.getSeriesView("series-1", null);
        assertNotNull(seriesView);
        assertEquals("Border-Gavaskar Trophy", seriesView.getSeries().getName());
        assertEquals(1, seriesView.getStats().size());
        assertEquals(1, seriesView.getStandings().size());
        Object pointsTablePayloadObject = seriesView.getStats().get(0).getPayload();
        assertTrue(pointsTablePayloadObject instanceof java.util.List);
    }

    @Test
    public void seriesStandingsViewShouldFilterNonStandingsSnapshots() {
        playerStatsCrawlerService.ingestReferenceData(buildSeriesReferenceRequest(1730000030000L));
        playerStatsCrawlerService.ingestReferenceData(buildSeriesSummaryReferenceRequest(1730000040000L));

        PlayerStatsSeriesDetailViewDTO seriesView = playerStatsCrawlerService.getSeriesView("series-1", null);
        assertNotNull(seriesView);
        assertEquals(2, seriesView.getStats().size());
        assertEquals(1, seriesView.getStandings().size());
        assertEquals("points_table", seriesView.getStandings().get(0).getCategory());

        PlayerStatsSeriesDetailViewDTO standingsView = playerStatsCrawlerService.getSeriesStandingsView("series-1", null);
        assertNotNull(standingsView);
        assertEquals(1, standingsView.getStandings().size());
        assertEquals("points_table", standingsView.getStandings().get(0).getCategory());
    }

    private PlayerStatsIngestionRequest buildRequest(Long capturedAt, String playerName, int runs) {
        PlayerStatsSeriesDTO series = new PlayerStatsSeriesDTO();
        series.setExternalId("series-1");
        series.setName("Border-Gavaskar Trophy");
        series.setShortName("BGT");
        series.setSeasonName("2025");

        PlayerStatsPayloadDTO statsPayload = new PlayerStatsPayloadDTO();
        statsPayload.setCategory("career_batting");
        statsPayload.setLabel("Career batting");
        statsPayload.setCapturedAt(capturedAt);
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("matches", 123);
        payload.put("runs", runs);
        payload.put("average", 48.2);
        statsPayload.setPayload(payload);

        PlayerStatsPlayerDTO player = new PlayerStatsPlayerDTO();
        player.setExternalId("player-18");
        player.setName(playerName);
        player.setShortName("V Kohli");
        player.setRole("BATTER");
        player.setBattingStyle("Right hand bat");
        player.setCountry("India");
        player.setCaptain(Boolean.FALSE);
        player.setWicketKeeper(Boolean.FALSE);
        player.setProbable(Boolean.TRUE);
        player.setAnnounced(Boolean.TRUE);
        player.setLineupOrder(Integer.valueOf(3));
        player.setStats(Collections.singletonList(statsPayload));

        PlayerStatsTeamDTO team = new PlayerStatsTeamDTO();
        team.setExternalId("team-ind");
        team.setName("India");
        team.setShortName("IND");
        team.setTeamCode("IND");
        team.setSquad(Arrays.asList(player));

        PlayerStatsIngestionRequest request = new PlayerStatsIngestionRequest();
        request.setUrl("https://crex.com/series/example/match-1/live");
        request.setMatchExternalKey("match-1");
        request.setSource("crex");
        request.setCapturedAt(capturedAt);
        request.setSeries(series);
        request.setTeams(Arrays.asList(team));
        return request;
    }

    private PlayerStatsReferenceIngestionRequest buildPlayerReferenceRequest(Long capturedAt, int runs) {
        PlayerStatsPayloadDTO careerBatting = new PlayerStatsPayloadDTO();
        careerBatting.setCategory("career_batting");
        careerBatting.setLabel("Career batting");
        careerBatting.setCapturedAt(capturedAt);
        Map<String, Object> battingPayload = new LinkedHashMap<String, Object>();
        battingPayload.put("matches", 302);
        battingPayload.put("runs", runs);
        battingPayload.put("average", 57.2);
        careerBatting.setPayload(battingPayload);

        PlayerStatsPayloadDTO recentForm = new PlayerStatsPayloadDTO();
        recentForm.setCategory("recent_form");
        recentForm.setLabel("Recent form");
        recentForm.setCapturedAt(capturedAt - 5000L);
        recentForm.setPayload(Arrays.asList(76, 122, 8, 54, 100));

        PlayerStatsPlayerDTO player = new PlayerStatsPlayerDTO();
        player.setExternalId("player-18");
        player.setName("Virat Kohli");
        player.setShortName("V Kohli");
        player.setRole("BATTER");
        player.setBattingStyle("Right hand bat");
        player.setBowlingStyle("Right arm medium");
        player.setCountry("India");
        player.setImageUrl("https://crex.com/player/18.png");

        PlayerStatsReferenceIngestionRequest request = new PlayerStatsReferenceIngestionRequest();
        request.setUrl("https://crex.com/player/virat-kohli/player-18");
        request.setSource("crex");
        request.setCapturedAt(capturedAt);
        request.setPlayer(player);
        request.setSnapshots(Arrays.asList(careerBatting, recentForm));
        return request;
    }

    private PlayerStatsReferenceIngestionRequest buildTeamReferenceRequest(Long capturedAt) {
        PlayerStatsPayloadDTO teamRanking = new PlayerStatsPayloadDTO();
        teamRanking.setCategory("team_rankings_test");
        teamRanking.setLabel("ICC Test rankings");
        teamRanking.setCapturedAt(capturedAt);
        Map<String, Object> rankingPayload = new LinkedHashMap<String, Object>();
        rankingPayload.put("rank", 1);
        rankingPayload.put("rating", 124);
        rankingPayload.put("points", 3712);
        teamRanking.setPayload(rankingPayload);

        PlayerStatsTeamDTO team = new PlayerStatsTeamDTO();
        team.setExternalId("team-ind");
        team.setName("India");
        team.setShortName("IND");
        team.setTeamCode("IND");

        PlayerStatsReferenceIngestionRequest request = new PlayerStatsReferenceIngestionRequest();
        request.setUrl("https://crex.com/rankings/cricket/team/india");
        request.setCapturedAt(capturedAt);
        request.setTeam(team);
        request.setSnapshots(Collections.singletonList(teamRanking));
        return request;
    }

    private PlayerStatsReferenceIngestionRequest buildSeriesReferenceRequest(Long capturedAt) {
        PlayerStatsPayloadDTO pointsTable = new PlayerStatsPayloadDTO();
        pointsTable.setCategory("points_table");
        pointsTable.setLabel("Points table");
        pointsTable.setCapturedAt(capturedAt);
        Map<String, Object> india = new LinkedHashMap<String, Object>();
        india.put("teamExternalId", "team-ind");
        india.put("teamName", "India");
        india.put("position", 1);
        india.put("matches", 4);
        india.put("wins", 3);
        india.put("points", 6);
        india.put("netRunRate", 1.214);
        Map<String, Object> australia = new LinkedHashMap<String, Object>();
        australia.put("teamExternalId", "team-aus");
        australia.put("teamName", "Australia");
        australia.put("position", 2);
        australia.put("matches", 4);
        australia.put("wins", 2);
        australia.put("points", 4);
        australia.put("netRunRate", 0.612);
        pointsTable.setPayload(Arrays.asList(india, australia));

        PlayerStatsSeriesDTO series = new PlayerStatsSeriesDTO();
        series.setExternalId("series-1");
        series.setName("Border-Gavaskar Trophy");
        series.setShortName("BGT");
        series.setSeasonName("2025");

        PlayerStatsReferenceIngestionRequest request = new PlayerStatsReferenceIngestionRequest();
        request.setUrl("https://crex.com/series/border-gavaskar-trophy/points-table");
        request.setCapturedAt(capturedAt);
        request.setSeries(series);
        request.setSnapshots(Collections.singletonList(pointsTable));
        return request;
    }

    private PlayerStatsReferenceIngestionRequest buildSeriesSummaryReferenceRequest(Long capturedAt) {
        PlayerStatsPayloadDTO seriesSummary = new PlayerStatsPayloadDTO();
        seriesSummary.setCategory("series_summary");
        seriesSummary.setLabel("Series summary");
        seriesSummary.setCapturedAt(capturedAt);
        Map<String, Object> summaryPayload = new LinkedHashMap<String, Object>();
        summaryPayload.put("matchesCompleted", 4);
        summaryPayload.put("hosts", "India");
        summaryPayload.put("format", "Test");
        seriesSummary.setPayload(summaryPayload);

        PlayerStatsSeriesDTO series = new PlayerStatsSeriesDTO();
        series.setExternalId("series-1");
        series.setName("Border-Gavaskar Trophy");
        series.setShortName("BGT");
        series.setSeasonName("2025");

        PlayerStatsReferenceIngestionRequest request = new PlayerStatsReferenceIngestionRequest();
        request.setUrl("https://crex.com/series/border-gavaskar-trophy/overview");
        request.setCapturedAt(capturedAt);
        request.setSeries(series);
        request.setSnapshots(Collections.singletonList(seriesSummary));
        return request;
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        public ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }
}
