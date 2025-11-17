package com.devglan.controller;

import com.devglan.dto.ApiResponse;
import com.devglan.dto.PagedResponseDTO;
import com.devglan.dto.UpcomingMatchDTO;
import com.devglan.service.UpcomingMatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * REST Controller for upcoming matches endpoints
 * Feature 005: Upcoming Matches Feed
 */
@RestController
@RequestMapping("/api/v1/matches")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UpcomingMatchController {

    private static final Logger logger = LoggerFactory.getLogger(UpcomingMatchController.class);

    @Autowired
    private UpcomingMatchService upcomingMatchService;

    /**
     * GET /api/v1/matches/upcoming
     * Get paginated list of upcoming matches with optional filters
     *
     * @param startDate Filter by start date (ISO 8601 format)
     * @param endDate Filter by end date (ISO 8601 format)
     * @param team Filter by team name (partial match)
     * @param series Filter by series name (partial match)
     * @param page Page number (default: 0)
     * @param size Page size (default: 20, max: 100)
     * @return Paged response with matches
     */
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<PagedResponseDTO<UpcomingMatchDTO>>> getUpcomingMatches(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String series,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            logger.info("GET /api/v1/matches/upcoming - startDate={}, endDate={}, team={}, series={}, page={}, size={}",
                    startDate, endDate, team, series, page, size);

            // Validate pagination parameters
            if (page < 0) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("page_invalid", "Page number must be >= 0"));
            }
            if (size < 1 || size > 100) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("size_invalid", "Page size must be between 1 and 100"));
            }

            // Validate date range
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("date_range_invalid", "Start date must be before or equal to end date"));
            }

            // Convert LocalDateTime to Instant (UTC)
            Instant startInstant = startDate != null ? startDate.toInstant(ZoneOffset.UTC) : null;
            Instant endInstant = endDate != null ? endDate.toInstant(ZoneOffset.UTC) : null;

            PagedResponseDTO<UpcomingMatchDTO> matches = upcomingMatchService.getUpcomingMatches(
                    startInstant,
                    endInstant,
                    team,
                    series,
                    page,
                    size
            );

            return ResponseEntity.ok(ApiResponse.success(matches));

        } catch (Exception e) {
            logger.error("Error fetching upcoming matches", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("server_error", "Failed to fetch upcoming matches: " + e.getMessage()));
        }
    }

    /**
     * GET /api/v1/matches/upcoming/{id}
     * Get single upcoming match by ID
     *
     * @param id Match ID
     * @return Match details
     */
    @GetMapping("/upcoming/{id}")
    public ResponseEntity<ApiResponse<UpcomingMatchDTO>> getUpcomingMatchById(@PathVariable Long id) {
        try {
            logger.info("GET /api/v1/matches/upcoming/{} - Fetching match details", id);

            if (id == null || id <= 0) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("id_invalid", "Match ID must be a positive number"));
            }

            return upcomingMatchService.getUpcomingMatchById(id)
                    .map(match -> ResponseEntity.ok(ApiResponse.success(match)))
                    .orElseGet(() -> {
                        logger.warn("Match not found: id={}", id);
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(ApiResponse.error("match_not_found", "Match with ID " + id + " not found"));
                    });

        } catch (Exception e) {
            logger.error("Error fetching match by id: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("server_error", "Failed to fetch match: " + e.getMessage()));
        }
    }

    /**
     * POST /api/v1/matches/upcoming
     * Upsert single upcoming match (used by scraper)
     * Internal endpoint - should be secured in production
     *
     * @param dto Match data
     * @return Upserted match
     */
    @PostMapping("/upcoming")
    public ResponseEntity<ApiResponse<UpcomingMatchDTO>> upsertUpcomingMatch(
            @Valid @RequestBody UpcomingMatchDTO dto
    ) {
        try {
            logger.info("POST /api/v1/matches/upcoming - Upserting match: source={}, sourceKey={}",
                    dto.getSource(), dto.getSourceKey());

            // Validate required fields
            if (dto.getSource() == null || dto.getSource().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("source_required", "Source is required"));
            }
            if (dto.getSourceKey() == null || dto.getSourceKey().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("source_key_required", "Source key is required"));
            }
            if (dto.getSeriesName() == null || dto.getSeriesName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("series_name_required", "Series name is required"));
            }
            if (dto.getMatchTitle() == null || dto.getMatchTitle().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("match_title_required", "Match title is required"));
            }
            if (dto.getTeamA() == null || dto.getTeamA().getName() == null || dto.getTeamA().getName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("team_a_required", "Team A name is required"));
            }
            if (dto.getTeamB() == null || dto.getTeamB().getName() == null || dto.getTeamB().getName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("team_b_required", "Team B name is required"));
            }
            if (dto.getStartTime() == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("start_time_required", "Start time is required"));
            }

            UpcomingMatchDTO saved = upcomingMatchService.upsertUpcomingMatch(dto);

            return ResponseEntity.ok(ApiResponse.success(saved));

        } catch (Exception e) {
            logger.error("Error upserting match", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("server_error", "Failed to upsert match: " + e.getMessage()));
        }
    }

    /**
     * POST /api/v1/matches/upcoming/batch
     * Bulk upsert upcoming matches (used by scraper)
     * Internal endpoint - should be secured in production
     *
     * @param dtos List of matches
     * @return List of upserted matches
     */
    @PostMapping("/upcoming/batch")
    public ResponseEntity<ApiResponse<List<UpcomingMatchDTO>>> upsertUpcomingMatchesBatch(
            @Valid @RequestBody List<UpcomingMatchDTO> dtos
    ) {
        try {
            logger.info("POST /api/v1/matches/upcoming/batch - Bulk upserting {} matches", dtos.size());

            if (dtos == null || dtos.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("empty_batch", "Batch cannot be empty"));
            }

            if (dtos.size() > 100) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("batch_too_large", "Batch size cannot exceed 100 matches"));
            }

            List<UpcomingMatchDTO> saved = upcomingMatchService.upsertUpcomingMatches(dtos);

            logger.info("Bulk upsert completed: {} matches processed", saved.size());
            return ResponseEntity.ok(ApiResponse.success(saved));

        } catch (Exception e) {
            logger.error("Error bulk upserting matches", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("server_error", "Failed to bulk upsert matches: " + e.getMessage()));
        }
    }
}
