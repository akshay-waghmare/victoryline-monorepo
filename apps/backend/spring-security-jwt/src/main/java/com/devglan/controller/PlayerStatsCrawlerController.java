package com.devglan.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import com.devglan.dao.PlayerStatsIngestionRequest;
import com.devglan.dao.PlayerStatsPlayerSummaryDTO;
import com.devglan.dao.PlayerStatsTeamSummaryDTO;
import com.devglan.dao.PlayerStatsSeriesSummaryDTO;
import com.devglan.dao.PlayerStatsIngestionResponseDTO;
import com.devglan.dao.PlayerStatsMatchViewDTO;
import com.devglan.dao.PlayerStatsPlayerDetailViewDTO;
import com.devglan.dao.PlayerStatsReferenceIngestionRequest;
import com.devglan.dao.PlayerStatsReferenceIngestionResponseDTO;
import com.devglan.dao.PlayerStatsSeriesDetailViewDTO;
import com.devglan.dao.PlayerStatsTeamDetailViewDTO;
import com.devglan.service.PlayerStatsCrawlerService;
import com.devglan.service.PlayerProfileHydrationService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/crawler/player-stats")
public class PlayerStatsCrawlerController {

    private final PlayerStatsCrawlerService playerStatsCrawlerService;
    private final PlayerProfileHydrationService playerProfileHydrationService;

    @Value("${crawler.player-stats.enabled:true}")
    private boolean crawlerPlayerStatsEnabled;

    public PlayerStatsCrawlerController(PlayerStatsCrawlerService playerStatsCrawlerService,
            PlayerProfileHydrationService playerProfileHydrationService) {
        this.playerStatsCrawlerService = playerStatsCrawlerService;
        this.playerProfileHydrationService = playerProfileHydrationService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<?> ingest(@RequestBody PlayerStatsIngestionRequest request) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsIngestionResponseDTO response = playerStatsCrawlerService.ingest(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error ingesting player stats data.");
        }
    }

    @GetMapping("/match")
    public ResponseEntity<?> getMatchView(@RequestParam(value = "url", required = false) String url,
            @RequestParam(value = "externalMatchKey", required = false) String externalMatchKey) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsMatchViewDTO response = playerStatsCrawlerService.getMatchView(url, externalMatchKey);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No player stats found for the given match.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving player stats data.");
        }
    }

    @PostMapping({ "/reference/ingest", "/resource/ingest" })
    public ResponseEntity<?> ingestReferenceData(@RequestBody PlayerStatsReferenceIngestionRequest request) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsReferenceIngestionResponseDTO response = playerStatsCrawlerService.ingestReferenceData(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error ingesting player stats reference data.");
        }
    }

    @GetMapping("/player")
    public ResponseEntity<?> getPlayerView(@RequestParam("externalId") String externalId,
            @RequestParam(value = "source", required = false) String source) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsPlayerDetailViewDTO response = playerStatsCrawlerService.getPlayerView(externalId, source);
            if (!hasPlayerProfile(response) && playerProfileHydrationService.hydrate(externalId)) {
                response = playerStatsCrawlerService.getPlayerView(externalId, source);
            }
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No player stats found for the given player.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving player stats data.");
        }
    }

    private boolean hasPlayerProfile(PlayerStatsPlayerDetailViewDTO response) {
        if (response == null || response.getStats() == null) {
            return false;
        }
        return response.getStats().stream().anyMatch(snapshot ->
                snapshot != null && "player_profile".equalsIgnoreCase(snapshot.getCategory()));
    }

    @GetMapping("/team")
    public ResponseEntity<?> getTeamView(@RequestParam("externalId") String externalId,
            @RequestParam(value = "source", required = false) String source) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsTeamDetailViewDTO response = playerStatsCrawlerService.getTeamView(externalId, source);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No player stats found for the given team.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving team stats data.");
        }
    }

    @GetMapping("/series")
    public ResponseEntity<?> getSeriesView(@RequestParam("externalId") String externalId,
            @RequestParam(value = "source", required = false) String source) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsSeriesDetailViewDTO response = playerStatsCrawlerService.getSeriesView(externalId, source);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No player stats found for the given series.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving series stats data.");
        }
    }

    @GetMapping("/series/standings")
    public ResponseEntity<?> getSeriesStandingsView(@RequestParam("externalId") String externalId,
            @RequestParam(value = "source", required = false) String source) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler ingestion is disabled.");
        }
        try {
            PlayerStatsSeriesDetailViewDTO response = playerStatsCrawlerService.getSeriesStandingsView(externalId, source);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No standings found for the given series.");
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving series standings data.");
        }
    }

    @GetMapping("/players")
    public ResponseEntity<?> listPlayers(
            @RequestParam(value = "source", required = false) String source,
            @RequestParam(value = "q", required = false) String query) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler is disabled.");
        }
        try {
            List<PlayerStatsPlayerSummaryDTO> response = playerStatsCrawlerService.listPlayers(source, query);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error listing players.");
        }
    }

    @GetMapping("/teams/list")
    public ResponseEntity<?> listTeams(
            @RequestParam(value = "source", required = false) String source,
            @RequestParam(value = "q", required = false) String query) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler is disabled.");
        }
        try {
            List<PlayerStatsTeamSummaryDTO> response = playerStatsCrawlerService.listTeams(source, query);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error listing teams.");
        }
    }

    @GetMapping("/series/list")
    public ResponseEntity<?> listSeries(
            @RequestParam(value = "source", required = false) String source,
            @RequestParam(value = "q", required = false) String query) {
        if (!crawlerPlayerStatsEnabled) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Player stats crawler is disabled.");
        }
        try {
            List<PlayerStatsSeriesSummaryDTO> response = playerStatsCrawlerService.listSeries(source, query);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error listing series.");
        }
    }
}
